import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Building2, ChevronRight, DoorOpen, Layers3, RotateCcw, Ruler, Square, Video, X } from "lucide-react";
import { DetectionThumb } from "@/components/detections/DetectionThumb";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EmptyState, LoadingState, Pill } from "@/components/common/Panel";
import { useDetections } from "@/hooks/useDetections";
import { detectSubject, isAlarm, shortTime, type NvrEvent } from "@/lib/nvrApi";
import { isOutdoor, parseCameraName } from "@/lib/cameraNaming";
import { useT } from "@/i18n";
import { useScheme } from "@/theme";
import { useModalHistory } from "@/hooks/useModalHistory";

/**
 * Bino ICHKI ko'rinishi — kampus binosining tomiga bosilganda ochiladi.
 *
 * Chizish Campus3D bilan BIR XIL izometrik proyeksiyada: qavat plitasi +
 * ko'tarilgan devorlar (kesib ko'rsatilgan — shift yo'q, tepadan qaraladi),
 * yo'lakka qaragan eshik tirqishlari, xona yorliqlari. Toza SVG, 3D
 * kutubxona yo'q.
 *
 * DIQQAT: OSM'da ham, aniqlash API'sida ham indoor (xona/qavat) geometriyasi
 * YO'Q — reja binoning HAQIQIY konturidan generatsiya qilinadi
 * (`orient()` konturni asosiy o'qi bo'yicha to'g'rilaydi → markazda yo'lak →
 * ikki yonda xonalar). Real reja (DWG/SVG yoki OSM `indoor=*`) paydo bo'lsa
 * faqat `buildFloor()` almashtiriladi, qolgan UI tegmaydi.
 *
 * KAMERALAR esa haqiqiy: aniqlash API kanallari nomidan qavat va joy turi
 * o'qiladi (`src/lib/cameraNaming.ts`) va shu qavatga qo'yiladi.
 */

type Pt = [number, number];

const FLOOR_H = 3.3; // bir qavat balandligi, metr
const WALL_H = 2.9; // ichki devor balandligi (kesim — shift chizilmaydi)
const CORRIDOR_W = 3.2;
const ROOM_D = 7.0;
const ROOM_W = 6.5;
const DOOR_W = 1.2; // eshik tirqishi kengligi, metr

/* ---------- Kamera (izometrik proyeksiya — Campus3D bilan bir xil formula) ---------- */
const DEFAULT_ROT = 30;
const DEFAULT_TILT = 0.56;
const MIN_TILT = 0.16;
const MAX_TILT = 0.95;
const H_SCALE = 1.15;
const ROT_STEP = 2;
const TILT_STEP = 0.02;

/** Kamera shu vaqt ichida hodisa yuborgan bo'lsa "onlayn" hisoblanadi.
 *  Server holat maydonini bermaydi — oxirgi hodisa vaqtidan xulosa qilamiz. */
const ONLINE_WINDOW_MS = 30 * 60_000;

interface Cam {
  cos: number;
  sin: number;
  tilt: number;
}

const project = (x: number, y: number, z: number, c: Cam): Pt => [
  x * c.cos - y * c.sin,
  (x * c.sin + y * c.cos) * c.tilt - z * H_SCALE,
];

const path = (pts: Pt[]) => `M${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join("L")}Z`;

interface Room {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  kind: RoomKind;
  /** Shu xona qaysi yo'lakka qaraydi (eshik shu tomonga qo'yiladi). */
  corridorY?: number;
}

type RoomKind = "auditoriya" | "laboratoriya" | "kafedra" | "yo'lak";

interface Seg {
  a: Pt;
  b: Pt;
}

interface PlacedCam {
  channel: string;
  name: string;
  place: ReturnType<typeof parseCameraName>;
  at: Pt; // reja koordinatasi (metr)
  count: number;
  floor: number;
  online: boolean;
}

/* ---------- Geometriya ---------- */

/** Poligon yuzasi (shoelace), m². */
function polyArea(p: Pt[]): number {
  let s = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i];
    const b = p[(i + 1) % p.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(s / 2);
}

function inside(pt: Pt, poly: Pt[]): boolean {
  const [x, y] = pt;
  let ok = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-9) + xi) ok = !ok;
  }
  return ok;
}

/** Konturni asosiy o'qi bo'yicha to'g'rilaydi (eng uzun qirra yo'nalishi). */
function orient(p: Pt[]): { poly: Pt[]; w: number; h: number } {
  let best = 0;
  let ang = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i];
    const b = p[(i + 1) % p.length];
    const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (d > best) {
      best = d;
      ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    }
  }
  const c = Math.cos(-ang);
  const s = Math.sin(-ang);
  const r: Pt[] = p.map(([x, y]) => [x * c - y * s, x * s + y * c]);
  const xs = r.map((q) => q[0]);
  const ys = r.map((q) => q[1]);
  const x0 = Math.min(...xs);
  const y0 = Math.min(...ys);
  return {
    poly: r.map(([x, y]) => [x - x0, y - y0] as Pt),
    w: Math.max(...xs) - x0,
    h: Math.max(...ys) - y0,
  };
}

const KINDS: RoomKind[] = ["auditoriya", "laboratoriya", "kafedra"];

/**
 * `RoomKind` — reja generatorining ICHKI kaliti (rang tanlash uchun), ekranga
 * chiqmaydi: xona yorlig'i raqam ("101"), yo'lak esa lug'atdan olinadi.
 */

/**
 * Qavat rejasi — konturdan generatsiya.
 *
 * Bino konturi to'g'ri to'rtburchak EMAS (E/H/L shakllari odatiy), shuning
 * uchun bitta markaziy yo'lak yaramaydi: u faqat o'rtadagi qanotni kesib
 * o'tadi va qolgan qanotlar bo'sh qoladi. Buning o'rniga kontur gorizontal
 * TASMALARGA bo'linadi; har tasmada konturga tushgan uzluksiz kesmalar
 * topilib, har biriga alohida yo'lak va ikki yon xonalar qo'yiladi.
 */
function buildFloor(poly: Pt[], w: number, h: number, floor: number) {
  const rooms: Room[] = [];
  const corridors: { y: number; x0: number; x1: number }[] = [];

  const bandH = 2 * ROOM_D + CORRIDOR_W;
  const bands = Math.max(1, Math.round(h / bandH));
  const step = h / bands;
  let n = 1;

  for (let b = 0; b < bands; b++) {
    const yc = (b + 0.5) * step;

    // Tasma o'rtasidagi chiziq kontur bilan qayerda kesishadi
    const runs: [number, number][] = [];
    let start: number | null = null;
    const dx = 0.5;
    for (let x = 0; x <= w + dx; x += dx) {
      const on = x <= w && inside([x, yc], poly);
      if (on && start === null) start = x;
      if (!on && start !== null) {
        if (x - start >= 2 * ROOM_W) runs.push([start, x - dx]);
        start = null;
      }
    }

    for (const [x0, x1] of runs) {
      corridors.push({ y: yc, x0, x1 });
      rooms.push({
        id: `cor-${floor}-${b}-${x0.toFixed(0)}`,
        x: x0,
        y: yc - CORRIDOR_W / 2,
        w: x1 - x0,
        h: CORRIDOR_W,
        label: "Yo'lak",
        kind: "yo'lak",
      });

      const runW = x1 - x0;
      const cols = Math.max(1, Math.round(runW / ROOM_W));
      const stepX = runW / cols;
      for (let i = 0; i < cols; i++) {
        for (const side of [-1, 1] as const) {
          const rx = x0 + i * stepX + 0.4;
          const rw = stepX - 0.8;
          const ry = side < 0 ? yc - CORRIDOR_W / 2 - ROOM_D : yc + CORRIDOR_W / 2;
          if (ry < 0 || ry + ROOM_D > h) continue;
          // Xonaning TO'RT burchagi ham kontur ichida bo'lsin — aks holda
          // xona tashqi devordan chiqib ketadi va kesim yolg'on ko'rinadi
          const corners: Pt[] = [
            [rx, ry],
            [rx + rw, ry],
            [rx + rw, ry + ROOM_D],
            [rx, ry + ROOM_D],
          ];
          if (!corners.every((c) => inside(c, poly))) continue;
          rooms.push({
            id: `r-${floor}-${b}-${i}-${side}`,
            x: rx,
            y: ry,
            w: rw,
            h: ROOM_D,
            label: `${floor}${String(n).padStart(2, "0")}`,
            kind: KINDS[(i + (side > 0 ? 1 : 0) + floor + b) % KINDS.length],
            corridorY: yc,
          });
          n++;
        }
      }
    }
  }

  return { rooms, corridors };
}

/**
 * Devor segmentlari: tashqi kontur + xona qirralari.
 *
 * Yo'lakka qaragan qirrada ESHIK tirqishi qoldiriladi — aks holda reja
 * berk qutilar to'plamiga o'xshaydi va kesim o'qilmaydi.
 */
function buildWalls(poly: Pt[], rooms: Room[]): Seg[] {
  const segs: Seg[] = [];
  const seen = new Set<string>();

  const key = (a: Pt, b: Pt) => {
    const k1 = `${a[0].toFixed(1)},${a[1].toFixed(1)}`;
    const k2 = `${b[0].toFixed(1)},${b[1].toFixed(1)}`;
    return k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`;
  };
  const push = (a: Pt, b: Pt) => {
    const k = key(a, b);
    if (seen.has(k)) return;
    seen.add(k);
    segs.push({ a, b });
  };

  // Tashqi kontur
  for (let i = 0; i < poly.length; i++) push(poly[i], poly[(i + 1) % poly.length]);

  for (const r of rooms) {
    if (r.kind === "yo'lak") continue;
    const x0 = r.x;
    const x1 = r.x + r.w;
    const y0 = r.y;
    const y1 = r.y + r.h;
    // Yo'lakka qaragan qirra: xona o'z yo'lagining qaysi tomonida
    // (`corridorY` — shu xona uchun eng yaqin yo'lak markazi)
    const doorY = r.corridorY !== undefined && r.y < r.corridorY ? y1 : y0;

    push([x0, y0], [x1, y0]);
    push([x0, y1], [x1, y1]);
    push([x0, y0], [x0, y1]);
    push([x1, y0], [x1, y1]);

    // Eshik: yo'lak tomonidagi qirrani markazdan kesamiz (segment almashtiriladi)
    const midX = (x0 + x1) / 2;
    const k = key([x0, doorY], [x1, doorY]);
    const idx = segs.findIndex((s) => key(s.a, s.b) === k);
    if (idx >= 0) {
      segs.splice(idx, 1, { a: [x0, doorY], b: [midX - DOOR_W / 2, doorY] }, { a: [midX + DOOR_W / 2, doorY], b: [x1, doorY] });
    }
  }
  return segs;
}

/* ---------- Ranglar — MAVZUGA qarab ikki palitra ---------------------------
   Reja o'zi SVG bo'lgani uchun yorug' rejimda ham qorong'i qolib ketardi:
   oq panel ichida qora chizma. Endi mavzu palitrasi tanlanadi.

   Xona ranglari IKKALA rejimda ham bir xil MA'NOni bildiradi (auditoriya —
   ko'k, laboratoriya — yashil, kafedra — sariq), faqat to'yinganligi
   fon yorqinligiga moslanadi. */
interface PlanPalette {
  roomFill: Record<RoomKind, string>;
  roomEdge: Record<RoomKind, string>;
  /** Qavat plitasi. */
  slab: string;
  /** Tanlangan xona (kamera bosilganda). */
  slabOn: string;
  wallTop: string;
  wallA: string;
  wallB: string;
  /** Kamera nuqtasi: faol/oflayn va halqa rangi. */
  camOn: string;
  camOff: string;
  camRing: string;
}

const PLAN_PALETTE: Record<"dark" | "light", PlanPalette> = {
  dark: {
    roomFill: {
      auditoriya: "rgba(34,211,238,0.16)",
      laboratoriya: "rgba(52,211,153,0.16)",
      kafedra: "rgba(250,204,21,0.14)",
      "yo'lak": "rgba(255,255,255,0.06)",
    },
    roomEdge: {
      auditoriya: "#22d3ee",
      laboratoriya: "#34d399",
      kafedra: "#facc15",
      "yo'lak": "#94a3b8",
    },
    slab: "#1B2941", // fondan (#0B1220) ajralib tursin
    slabOn: "rgba(34,211,238,0.22)",
    wallTop: "#5A7796",
    wallA: "#26374C",
    wallB: "#33485F",
    camOn: "#22d3ee",
    camOff: "#64748b",
    camRing: "#04121E",
  },
  light: {
    roomFill: {
      auditoriya: "rgba(8,145,178,0.14)",
      laboratoriya: "rgba(5,150,105,0.14)",
      kafedra: "rgba(202,138,4,0.16)",
      "yo'lak": "rgba(15,27,46,0.05)",
    },
    roomEdge: {
      auditoriya: "#0891b2",
      laboratoriya: "#059669",
      kafedra: "#ca8a04",
      "yo'lak": "#64748b",
    },
    slab: "#DCE5F1",
    slabOn: "rgba(8,145,178,0.20)",
    wallTop: "#93A8C2",
    wallA: "#B9C6D8",
    wallB: "#CBD7E6",
    camOn: "#0891b2",
    camOff: "#94a3b8",
    camRing: "#ffffff",
  },
};

export function BuildingInterior({
  building,
  campusName,
  onClose,
}: {
  building: { p: Pt[]; h: number; n?: string; ml?: 1 };
  campusName?: string;
  onClose: () => void;
}) {
  const t = useT();
  /* ◀ "orqaga" avval bino ichki ko'rinishini yopadi — 3D kampus ochiq
     qoladi (`lib/modalHistory.ts`). */
  useModalHistory(onClose);
  /* Reja palitrasi — yorug rejimda chizma ham oqaradi. */
  const theme = useScheme();
  const light = theme === "light";
  const pal = PLAN_PALETTE[theme];
  const floors = Math.max(1, Math.round(building.h / FLOOR_H));
  /** `overview` — binoning yaxlit 3D modeli, aks holda tanlangan qavat kesimi. */
  const [view, setView] = useState<"overview" | number>("overview");
  const floor = typeof view === "number" ? view : 1;
  const [camChannel, setCamChannel] = useState<string | null>(null);

  // Kamera (ko'rish burchagi) — sichqoncha bilan
  const [rotDeg, setRotDeg] = useState(DEFAULT_ROT);
  const [tilt, setTilt] = useState(DEFAULT_TILT);
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const drag = useRef({ x: 0, y: 0, rot: 0, tilt: 0 });
  const wrapRef = useRef<HTMLDivElement>(null);

  const cam: Cam = useMemo(
    () => ({ cos: Math.cos((rotDeg * Math.PI) / 180), sin: Math.sin((rotDeg * Math.PI) / 180), tilt }),
    [rotDeg, tilt]
  );

  const shape = useMemo(() => orient(building.p), [building]);
  const plan = useMemo(() => buildFloor(shape.poly, shape.w, shape.h, floor), [shape, floor]);
  const walls = useMemo(() => buildWalls(shape.poly, plan.rooms), [shape, plan]);
  const footprint = useMemo(() => Math.round(polyArea(building.p)), [building]);

  /* ---------- Haqiqiy kameralar va hodisalar ---------- */
  const { events, isLoading } = useDetections({ category: "all", limit: 100 });

  /**
   * DIQQAT: aniqlash API kamerani BINOGA bog'lamaydi — faqat kanal nomini
   * beradi. Nomdan qavat va joy turi o'qiladi (`cameraNaming.ts`), lekin
   * "qaysi bino" ma'lumoti manbada yo'q. Shuning uchun bu yerda kuzatuv posti ning
   * barcha ichki kanallari ko'rsatiladi.
   */
  const allCams = useMemo(() => {
    const byChannel = new Map<string, { name: string; count: number; last: string }>();
    for (const e of events) {
      const prev = byChannel.get(e.channel);
      if (prev) {
        prev.count++;
        if (e.time > prev.last) prev.last = e.time;
      } else byChannel.set(e.channel, { name: e.camera, count: 1, last: e.time });
    }
    return [...byChannel.entries()]
      .map(([channel, v]) => {
        const place = parseCameraName(v.name);
        return {
          channel,
          name: v.name,
          count: v.count,
          last: v.last,
          place,
          floor: place.floor ?? 1, // qavat ko'rsatilmagan ichki kamera → 1-qavat
          // Server holat maydonini bermaydi — oxirgi hodisa vaqtidan xulosa
          online: Date.now() - new Date(v.last).getTime() < ONLINE_WINDOW_MS,
        };
      })
      .filter((c) => !isOutdoor(c.place));
  }, [events]);

  const stats = useMemo(
    () => ({
      total: allCams.length,
      online: allCams.filter((c) => c.online).length,
      offline: allCams.filter((c) => !c.online).length,
    }),
    [allCams]
  );

  /** Joriy qavatdagi kameralar — eng uzun yo'lak bo'ylab teng oraliqda. */
  const cameras = useMemo<PlacedCam[]>(() => {
    const onFloor = allCams.filter((c) => c.floor === floor);
    const spine = [...plan.corridors].sort((a, b) => b.x1 - b.x0 - (a.x1 - a.x0))[0];
    return onFloor.map((c, i) => {
      const t = onFloor.length === 1 ? 0.5 : (i + 0.5) / onFloor.length;
      const x = spine ? spine.x0 + t * (spine.x1 - spine.x0) : t * shape.w;
      const y = spine ? spine.y : shape.h / 2;
      return { ...c, at: [x, y] as Pt };
    });
  }, [allCams, floor, shape.w, shape.h, plan.corridors]);

  const activeCam = allCams.find((c) => c.channel === camChannel) ?? cameras[0] ?? allCams[0] ?? null;
  const camEvents = useMemo(
    () => (activeCam ? events.filter((e) => e.channel === activeCam.channel).slice(0, 8) : []),
    [events, activeCam]
  );
  const alarmEvents = useMemo(() => events.filter(isAlarm).slice(0, 12), [events]);

  /** Soatlik taqsimot (24 soat) — chapdagi grafik uchun. */
  const hourly = useMemo(() => {
    const now = Date.now();
    const buckets = Array.from({ length: 12 }, (_, i) => {
      const from = now - (12 - i) * 2 * 3600_000;
      return { label: new Date(from).getHours().toString().padStart(2, "0"), from, to: from + 2 * 3600_000, n: 0 };
    });
    for (const e of events) {
      const t = new Date(e.time).getTime();
      const b = buckets.find((x) => t >= x.from && t < x.to);
      if (b) b.n++;
    }
    // Grafik `dataKey` ekranga chiqadi (tooltip) — shuning uchun tarjima qilinadi
    return buckets.map((b) => ({ [t.chart.hour]: b.label, [t.chart.count]: b.n }));
  }, [events, t]);

  /* ---------- Ko'rinish o'lchamlari ---------- */
  const VB = 620;
  const VBH = VB * 0.7;

  const geom = useMemo(() => {
    const cx = shape.w / 2;
    const cy = shape.h / 2;
    const topZ = view === "overview" ? floors * FLOOR_H : WALL_H;
    const pr = (x: number, y: number, z: number) => project(x - cx, y - cy, z, cam);

    // PROYEKSIYA qilingan bbox bo'yicha markazlashtiramiz — reja markazi
    // yetarli emas, burilishda proyeksiya bboxi siljiydi.
    const corners: Pt[] = [];
    for (const [x, y] of shape.poly) corners.push(pr(x, y, 0), pr(x, y, topZ));
    const xs = corners.map((q) => q[0]);
    const ys = corners.map((q) => q[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const pad = 18;
    const scale = (Math.min(VB / (maxX - minX + pad), VBH / (maxY - minY + pad)) || 1) * zoom;
    const ox = VB / 2 - ((minX + maxX) / 2) * scale;
    const oy = VBH / 2 - ((minY + maxY) / 2) * scale;
    const S = (x: number, y: number, z: number): Pt => {
      const [px, py] = pr(x, y, z);
      return [ox + px * scale, oy + py * scale];
    };
    return { S };
  }, [shape, cam, zoom, view, floors, VBH]);

  /** Qavat kesimi: devorlar orqadan oldinga (painter). */
  const wallQuads = useMemo(() => {
    if (view === "overview") return [];
    const { S } = geom;
    return walls
      .map((sg) => {
        const a0 = S(sg.a[0], sg.a[1], 0);
        const b0 = S(sg.b[0], sg.b[1], 0);
        const a1 = S(sg.a[0], sg.a[1], WALL_H);
        const b1 = S(sg.b[0], sg.b[1], WALL_H);
        const dx = Math.abs(b0[0] - a0[0]);
        const dy = Math.abs(b0[1] - a0[1]);
        return {
          face: path([a0, b0, b1, a1]),
          top: path([a1, b1, [b1[0], b1[1] - 1.6], [a1[0], a1[1] - 1.6]]),
          fill: dx > dy ? pal.wallB : pal.wallA,
          depth: Math.max(a0[1], b0[1]),
        };
      })
      .sort((q1, q2) => q1.depth - q2.depth);
  }, [walls, geom, view, pal.wallA, pal.wallB]);

  /** Umumiy ko'rinish: qavatlar ustuni, pastdan yuqoriga (yuqori quyini yopadi). */
  const stack = useMemo(() => {
    if (view !== "overview") return [];
    const { S } = geom;
    const gap = 0.18;
    return Array.from({ length: floors }, (_, i) => {
      const f = i + 1;
      const z0 = i * FLOOR_H;
      const z1 = z0 + FLOOR_H - gap;
      const faces = shape.poly
        .map((_, k) => {
          const a = shape.poly[k];
          const b = shape.poly[(k + 1) % shape.poly.length];
          const a0 = S(a[0], a[1], z0);
          const b0 = S(b[0], b[1], z0);
          const a1 = S(a[0], a[1], z1);
          const b1 = S(b[0], b[1], z1);
          const dx = Math.abs(b0[0] - a0[0]);
          const dy = Math.abs(b0[1] - a0[1]);
          return { d: path([a0, b0, b1, a1]), bright: dx > dy, depth: Math.max(a0[1], b0[1]) };
        })
        .sort((q1, q2) => q1.depth - q2.depth);
      return {
        floor: f,
        faces,
        top: path(shape.poly.map(([x, y]) => S(x, y, z1))),
        camCount: allCams.filter((c) => c.floor === f).length,
        labelAt: S(shape.poly[0][0], shape.poly[0][1], z1),
      };
    });
  }, [view, geom, floors, shape.poly, allCams]);

  /* ---------- Sichqoncha ---------- */
  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    setDragging(true);
    drag.current = { x: e.clientX, y: e.clientY, rot: rotDeg, tilt };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    setRotDeg(Math.round((drag.current.rot + dx * 0.35) / ROT_STEP) * ROT_STEP);
    const t = drag.current.tilt + dy * 0.0035;
    setTilt(Math.round(Math.min(MAX_TILT, Math.max(MIN_TILT, t)) / TILT_STEP) * TILT_STEP);
  };
  const endDrag = (e: React.PointerEvent) => {
    if (!dragging) return;
    setDragging(false);
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
  };
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      setZoom((z) => Math.min(3, Math.max(0.6, z * (ev.deltaY > 0 ? 0.9 : 1.111))));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const rooms = plan.rooms.filter((r) => r.kind !== "yo'lak");

  /* DIQQAT — `fixed`, `absolute` EMAS. Ilgari ichki ko'rinish Campus3D
     konteyneri ichida qolib, xarita va qo'shni panellar ortiga tushib ketardi.
     Endi butun ekran ustidan chiqadigan haqiqiy modal. z-80: xarita/HUD'dan
     yuqori, `DetectionsPage` lightbox'i (z-70) ustida. */
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[80] grid place-items-center bg-[#050A13]/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
        /* 🔵 NEON QAYTA DIZAYN (2026-09-10) — ilgari qattiq `bg-[#080E1A]` edi. */
        className="neon-modal neon-modal--cyan flex h-[94vh] w-[97vw] max-w-[1500px] flex-col overflow-hidden"
      >
        {/* ── Yuqori qator: yo'l (breadcrumb) + kamera sanoqlari ── */}
        <header className="flex flex-none items-center gap-2 border-b border-white/10 px-4 py-2.5">
          <Building2 size={15} className="flex-none text-cyan-300" />
          <nav className="flex min-w-0 items-center gap-1.5 text-[12px]">
            {campusName && (
              <>
                <span className="truncate text-slate-400">{campusName}</span>
                <ChevronRight size={12} className="flex-none text-slate-600" />
              </>
            )}
            <button
              onClick={() => setView("overview")}
              className={`truncate transition-colors ${
                view === "overview" ? "font-semibold text-slate-100" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {building.n ?? t.campus3d.building}
            </button>
            {view !== "overview" && (
              <>
                <ChevronRight size={12} className="flex-none text-slate-600" />
                <span className="flex-none font-semibold text-cyan-300">{floor}F</span>
              </>
            )}
          </nav>

          <div className="ml-auto flex flex-none items-center gap-3 text-[11px]">
            <Counter label={t.common.cameras} value={stats.total} tone="#94a3b8" />
            <Counter label={t.common.online} value={stats.online} tone="#34d399" />
            <Counter label={t.common.offline} value={stats.offline} tone="#f87171" />
            <span className="h-4 w-px bg-white/10" />
            <button
              onClick={() => {
                setRotDeg(DEFAULT_ROT);
                setTilt(DEFAULT_TILT);
                setZoom(1);
              }}
              title={t.common.resetView}
              className="neon-icon-btn"
            >
              <RotateCcw size={13} />
            </button>
            <button onClick={onClose} title={t.common.close} className="neon-icon-btn">
              <X size={14} />
            </button>
          </div>
        </header>

        {/* ── Asosiy: chap panellar │ 3D │ o'ng panellar ── */}
        <div className="grid min-h-0 flex-1 grid-cols-[262px_minmax(0,1fr)_286px] gap-2 p-2">
          {/* Chap ustun */}
          <div className="flex min-h-0 flex-col gap-2 overflow-y-auto">
            <Card title={t.interior.building}>
              <div className="space-y-1 px-2.5 py-2 text-[10.5px]">
                <Stat Icon={Layers3} label={t.interior.floors} value={String(floors)} />
                <Stat Icon={Ruler} label={t.interior.height} value={`${Math.round(building.h)} m`} />
                <Stat
                  Icon={Square}
                  label={t.interior.footprint}
                  value={`${footprint.toLocaleString(t.locale)} m²`}
                />
                <Stat Icon={DoorOpen} label={t.interior.roomsThisFloor} value={String(rooms.length)} />
                <Stat Icon={Video} label={t.common.cameras} value={String(stats.total)} />
              </div>
              {building.ml === 1 && (
                <p className="border-t border-white/10 px-2.5 py-1.5 text-[9.5px] leading-relaxed text-amber-400/70">
                  {t.interior.mlNote}
                </p>
              )}
            </Card>

            <Card title={t.interior.detections} subtitle={t.interior.detectionsSub}>
              {isLoading ? (
                <LoadingState />
              ) : events.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="h-[120px] p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hourly} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                      <XAxis
                        dataKey={t.chart.hour}
                        tick={{ fontSize: 8.5, fill: "#64748b" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis tick={{ fontSize: 8.5, fill: "#64748b" }} axisLine={false} tickLine={false} width={28} />
                      <Tooltip
                        /* Inline uslub CSS mavzu qoidalariga tushmaydi —
                           shuning uchun bu yerda ham palitra ishlatiladi */
                        cursor={{ fill: light ? "rgba(15,27,46,0.05)" : "rgba(255,255,255,0.04)" }}
                        contentStyle={{
                          background: light ? "#ffffff" : "#0B1220",
                          border: `1px solid ${light ? "#d5dded" : "rgba(255,255,255,0.12)"}`,
                          borderRadius: 4,
                          fontSize: 11,
                          color: light ? "#0f1b2e" : undefined,
                        }}
                      />
                      <Bar dataKey={t.chart.count} fill="#22d3ee" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            <Card title={t.interior.recentEvents} className="min-h-0 flex-1" bodyClassName="overflow-y-auto">
              {isLoading ? (
                <LoadingState />
              ) : events.length === 0 ? (
                <EmptyState title={t.interior.noEvents} />
              ) : (
                <ul className="divide-y divide-white/[0.05]">
                  {events.slice(0, 20).map((e) => (
                    <li key={e.id} className="px-2.5 py-1.5">
                      <p className="flex items-center gap-1 truncate text-[10.5px] text-slate-200">
                        <span className="truncate">{e.label}</span>
                        {isAlarm(e) && <Pill tone="red">!</Pill>}
                      </p>
                      <p className="flex items-center gap-1.5 truncate text-[9.5px] text-slate-500">
                        <span className="truncate">{e.camera}</span>
                        <span className="ml-auto flex-none font-mono">{shortTime(e.time)}</span>
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {/* Markaz — 3D */}
          <div
            ref={wrapRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            className={`relative min-h-0 rounded border border-white/10 bg-[#0B1220] ${
              dragging ? "cursor-grabbing" : "cursor-grab"
            }`}
          >
            <svg viewBox={`0 0 ${VB} ${VBH}`} className="h-full w-full touch-none select-none" preserveAspectRatio="xMidYMid meet">
              {view === "overview"
                ? stack.map((fl) => {
                    const on = fl.camCount > 0;
                    return (
                      <g key={fl.floor} onClick={() => setView(fl.floor)} style={{ cursor: "pointer" }}>
                        {fl.faces.map((f, i) => (
                          <path
                            key={i}
                            d={f.d}
                            fill={f.bright ? pal.wallB : pal.wallA}
                            stroke="rgba(148,163,184,0.3)"
                            strokeWidth={0.5}
                          />
                        ))}
                        <path
                          d={fl.top}
                          fill={on ? pal.slabOn : pal.slab}
                          stroke={on ? "rgba(34,211,238,0.75)" : "rgba(148,163,184,0.4)"}
                          strokeWidth={0.9}
                          strokeLinejoin="round"
                        />
                        <text
                          x={fl.labelAt[0]}
                          y={fl.labelAt[1]}
                          textAnchor="end"
                          fill="rgba(226,246,255,0.75)"
                          style={{ fontSize: 9, fontFamily: "monospace", pointerEvents: "none" }}
                        >
                          {fl.floor}F{fl.camCount > 0 ? ` \u00b7 ${fl.camCount} ${t.interior.camShort}` : ""}
                        </text>
                      </g>
                    );
                  })
                : (
                  <>
                    <path
                      d={path(shape.poly.map(([x, y]) => geom.S(x, y, 0)))}
                      fill={pal.slab}
                      stroke="rgba(148,163,184,0.35)"
                      strokeWidth={1}
                      strokeLinejoin="round"
                    />
                    {plan.rooms.map((r) => (
                      <path
                        key={`f-${r.id}`}
                        d={path([
                          geom.S(r.x, r.y, 0),
                          geom.S(r.x + r.w, r.y, 0),
                          geom.S(r.x + r.w, r.y + r.h, 0),
                          geom.S(r.x, r.y + r.h, 0),
                        ])}
                        fill={pal.roomFill[r.kind]}
                        stroke={r.kind === "yo'lak" ? "none" : `${pal.roomEdge[r.kind]}55`}
                        strokeWidth={0.6}
                      />
                    ))}
                    {wallQuads.map((w, i) => (
                      <g key={`w${i}`}>
                        <path d={w.face} fill={w.fill} stroke="rgba(148,163,184,0.28)" strokeWidth={0.5} />
                        <path d={w.top} fill={pal.wallTop} stroke="none" />
                      </g>
                    ))}
                    {rooms.map((r) => {
                      const [px, py] = geom.S(r.x + r.w / 2, r.y + r.h / 2, 0);
                      return (
                        <text
                          key={`t-${r.id}`}
                          x={px}
                          y={py + 3}
                          textAnchor="middle"
                          fill="rgba(226,246,255,0.8)"
                          style={{ fontSize: 8, fontFamily: "monospace", pointerEvents: "none" }}
                        >
                          {r.label}
                        </text>
                      );
                    })}
                    {cameras.map((c) => {
                      const [px, py] = geom.S(c.at[0], c.at[1], WALL_H + 0.4);
                      const active = activeCam?.channel === c.channel;
                      const tone = c.online ? pal.camOn : pal.camOff;
                      return (
                        <g key={c.channel} onClick={() => setCamChannel(c.channel)} style={{ cursor: "pointer" }}>
                          <circle cx={px} cy={py} r={active ? 7 : 5} fill={tone} stroke={pal.camRing} strokeWidth={1.5} />
                          <circle cx={px} cy={py} r={12} fill="none" stroke={`${tone}55`} strokeWidth={1} />
                          <text
                            x={px}
                            y={py - 15}
                            textAnchor="middle"
                            fill="rgba(226,246,255,0.9)"
                            style={{ fontSize: 8, fontFamily: "monospace" }}
                          >
                            {t.interior.place[c.place.kind]}
                          </text>
                        </g>
                      );
                    })}
                  </>
                )}
            </svg>

            <p className="pointer-events-none absolute left-2 top-2 rounded bg-black/40 px-2 py-1 text-[10px] font-semibold text-slate-300">
              {view === "overview" ? t.interior.overviewView : t.interior.floorCut(floor)}
            </p>
            <p className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded border border-white/10 bg-[#0B1220]/85 px-2 py-1 text-[9px] text-slate-500">
              {view === "overview" ? t.interior.hintOverview : t.interior.hintFloor}
              <span className="ml-2 font-mono text-slate-400">
                {((rotDeg % 360) + 360) % 360}\u00b0 \u00b7 {Math.round(zoom * 100)}%
              </span>
            </p>
          </div>

          {/* O'ng ustun */}
          <div className="flex min-h-0 flex-col gap-2 overflow-y-auto">
            <Card title={t.common.cameras} subtitle={t.interior.channelsSub}>
              {allCams.length === 0 ? (
                <EmptyState title={t.interior.noChannels} />
              ) : (
                <ul className="divide-y divide-white/[0.05]">
                  {allCams.map((c) => (
                    <li key={c.channel}>
                      <button
                        onClick={() => {
                          setCamChannel(c.channel);
                          setView(c.floor);
                        }}
                        className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-left transition-colors ${
                          activeCam?.channel === c.channel ? "bg-cyan-400/[0.08]" : "hover:bg-white/[0.04]"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 flex-none rounded-full ${
                            c.online ? "bg-emerald-400" : "bg-slate-600"
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[11px] text-slate-200">{c.name}</p>
                          <p className="truncate text-[9.5px] text-slate-500">
                            {c.floor}F \u00b7 {t.interior.place[c.place.kind]} \u00b7 {shortTime(c.last)}
                          </p>
                        </div>
                        <Pill>{c.count}</Pill>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card
              title={activeCam?.name ?? t.common.camera}
              subtitle={activeCam ? (activeCam.online ? t.common.online : t.common.offline) : undefined}
            >
              {camEvents.length > 0 ? (
                <DetectionThumb
                  id={camEvents[0].id}
                  boxes={camEvents[0].boxes}
                  pictureLost={camEvents[0].picture_lost}
                  eager
                  className="aspect-video w-full bg-black/40"
                  alt={camEvents[0].label}
                />
              ) : (
                <div className="grid aspect-video w-full place-items-center bg-black/30 text-[10.5px] text-slate-600">
                  {activeCam ? t.cameras.noDetections : t.cameras.notSelected}
                </div>
              )}
              {camEvents[0] && (
                <p className="truncate px-2.5 py-1.5 text-[10px] text-slate-400">
                  {camEvents[0].label}
                  {detectSubject(camEvents[0]) ? ` \u00b7 ${detectSubject(camEvents[0])}` : ""}
                  <span className="ml-1 font-mono text-slate-600">{shortTime(camEvents[0].time)}</span>
                </p>
              )}
            </Card>

            <Card
              title={t.interior.alarms}
              subtitle={t.interior.alarmsSub}
              className="min-h-0 flex-1"
              bodyClassName="overflow-y-auto"
            >
              {alarmEvents.length === 0 ? (
                <EmptyState title={t.interior.noAlarms} hint={t.interior.noAlarmsHint} />
              ) : (
                <ul className="divide-y divide-white/[0.05]">
                  {alarmEvents.map((e: NvrEvent) => (
                    <li key={e.id} className="flex items-center gap-2 px-2.5 py-1.5">
                      <AlertTriangle size={12} className="flex-none text-red-400" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[10.5px] text-slate-200">{e.label}</p>
                        <p className="truncate text-[9.5px] text-slate-500">{e.camera}</p>
                      </div>
                      <span className="flex-none font-mono text-[9.5px] text-slate-500">{shortTime(e.time)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>

        {/* ── Pastki qavat qatori (Envision uslubi: Umumiy | F1 | F2 | ...) ── */}
        <div className="flex flex-none items-center gap-1.5 overflow-x-auto border-t border-white/10 px-3 py-2">
          <FloorTab active={view === "overview"} onClick={() => setView("overview")}>
            {t.interior.overview}
          </FloorTab>
          {Array.from({ length: floors }, (_, i) => i + 1).map((f) => {
            const n = allCams.filter((c) => c.floor === f).length;
            return (
              <FloorTab
                key={f}
                active={view === f}
                onClick={() => {
                  setView(f);
                  setCamChannel(null);
                }}
              >
                F{f}
                {n > 0 && <span className="ml-1 text-[9px] text-cyan-300/80">{n}</span>}
              </FloorTab>
            );
          })}
          <span className="ml-auto flex-none pl-3 text-[9.5px] text-slate-600">
            {t.interior.planNote}
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}

/** Panel qobig'i — modal ichidagi barcha bloklar uchun. */
function Card({
  title,
  subtitle,
  children,
  className = "",
  bodyClassName = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`flex flex-none flex-col overflow-hidden rounded border border-white/10 bg-[#0B1220] ${className}`}>
      <header className="flex flex-none items-baseline gap-2 border-b border-white/10 px-2.5 py-1.5">
        <h3 className="min-w-0 truncate text-[10.5px] font-semibold uppercase tracking-[0.1em] text-slate-300">
          {title}
        </h3>
        {subtitle && <span className="flex-none truncate text-[9.5px] text-slate-600">{subtitle}</span>}
      </header>
      <div className={`min-h-0 flex-1 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

/** Qavat tanlagich tugmasi (Umumiy / F1 / F2 ...). */
function FloorTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-none items-center rounded border px-3 py-1 text-[11.5px] font-semibold transition-colors ${
        active
          ? "border-cyan-400/50 bg-cyan-400/15 text-white"
          : "border-white/10 text-slate-400 hover:text-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

/** Sarlavhadagi kamera sanoqlari (jami / onlayn / oflayn). */
function Counter({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-slate-500">{label}</span>
      <b
        className="font-mono text-[13px] font-extrabold"
        style={{
          backgroundImage: `linear-gradient(90deg, ${tone}, color-mix(in srgb, ${tone} 40%, white))`,
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          color: "transparent",
          WebkitTextFillColor: "transparent",
        }}
      >
        {value}
      </b>
    </span>
  );
}

function Stat({ Icon, label, value }: { Icon: typeof Layers3; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={11} className="flex-none text-slate-500" />
      <span className="flex-none text-slate-500">{label}</span>
      <span className="ml-auto truncate font-mono text-slate-200">{value}</span>
    </div>
  );
}
