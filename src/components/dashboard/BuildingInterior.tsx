import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Layers3,
  RotateCcw,
  Ruler,
  ShieldAlert,
  Sofa,
  Square,
  Video,
  X,
} from "lucide-react";
import { DetectionThumb } from "@/components/detections/DetectionThumb";
import { useDetections } from "@/hooks/useDetections";
import { detectSubject, shortTime } from "@/lib/nvr/nvrApi";
import { isOutdoor, parseCameraName } from "@/lib/nvr/cameraNaming";
import { floorProgram, isSchool179, SCHOOL_179_PLAN } from "@/config/schoolPlan";
import {
  buildFloorPlan,
  CUT_H,
  FLOOR_H,
  orient,
  polyArea,
  WALL_H,
  type MarkerKind,
  type PlanRoom,
  type Pt,
  type Tone,
} from "@/lib/floorPlan";
import { useT } from "@/i18n";
import { useScheme } from "@/theme";
import { useModalHistory } from "@/hooks/useModalHistory";

/**
 * Bino ICHKI ko'rinishi — kampus binosiga bosilganda ochiladi.
 *
 * 🔴 **2026-09-23 da QAYTA QURILDI** (foydalanuvchi so'rovi, namuna render
 * bilan): ilgari qavat kesimi bo'sh to'rtburchaklar va ingichka chiziqlar edi
 * — xonalar ichi ko'rinmasdi. Endi to'liq HAJMLI kesim: qalin tashqi devor
 * (kameraga qaragani "qo'g'irchoq uy" usulida KESILADI), derazalar, eshik
 * qanotlari, ichki devorlar va xona turiga mos JIHOZ (parta qatorlari, doska,
 * shkaf, zina marshlari, sanuzel kabinalari). Geometriya — `lib/floorPlan.ts`,
 * bu fayl FAQAT chizadi.
 *
 * 🔴 **Yon ustunlar OLIB TASHLANDI** (o'sha kuni, foydalanuvchi so'rovi —
 * ikkala ustun skrinshoti bilan): chapda "Bino / Aniqlanishlar / So'nggi
 * hodisalar", o'ngda "Kameralar / Camera 01 / Trevogalar" panellari bor edi
 * va 3D ko'rinishga ekranning atigi yarmi qolardi. Endi 3D BUTUN enni
 * oladi; bino ma'lumoti ixcham suzuvchi kartada, kamera kadri esa FAQAT
 * kamera nuqtasi bosilganda chiqadigan kichik oynada.
 *
 * DIQQAT: OSM'da ham, aniqlash API'sida ham indoor geometriya YO'Q. Reja
 * TOPOLOGIYASI maktabning o'z evakuatsiya chizmasidan (`config/schoolPlan.ts`),
 * MASSHTAB esa binoning haqiqiy konturidan olinadi. KAMERALAR haqiqiy:
 * kanal nomidan qavat va joy o'qiladi (`lib/nvr/cameraNaming.ts`).
 */

/* ---------- Kamera — QAT'IY IZOMETRIK BURCHAK -------------------------------
   🔴 **2026-09-23: aylantirish OLIB TASHLANDI** (foydalanuvchi so'rovi,
   izometrik maktab illyustratsiyalari namunasi bilan): "to'liq 3d holatda
   qilishimiz kerak emas, shunchaki BIR TOMONDAN tasviri chiqib berishi
   kerak". Ilgari sichqoncha bilan burchak ham, qiyalik ham o'zgarardi —
   foydalanuvchi binoni tasodifan "yotqizib" yuborishi va hech narsa
   ko'rinmay qolishi mumkin edi.

   Burchak SHU YERDA qotirilgan va hech qayerdan o'zgarmaydi.

   ⚠️ **Qiyalik (`0.78`) va `H_SCALE` (1.0) TASODIFIY TANLANMAGAN** —
   ular devor xona ichini qanchalik to'sishini belgilaydi. Nisbat:
   `devor·H_SCALE / (xona chuqurligi·tilt)`. Dastlab 0.62 va 1.15 edi —
   matn-rastrga chizib tekshirilganda ichki devorlar xona yuzasining
   ~64% ini yopib, jihoz ko'rinmay qolgani aniqlandi. Hozirgi qiymatda
   2.3 m devor 7.5 m chuqur xonaning ~39% ini yopadi, ya'ni partalar
   va doska ko'rinadi (namunadagi izometrik chizmalardagi kabi).
   Surish endi SILJITADI (pan), aylantirmaydi. */
const ISO_ROT = 30;
const ISO_TILT = 0.78;
const H_SCALE = 1.0;

/** Kamera shu vaqt ichida hodisa yuborgan bo'lsa "onlayn" hisoblanadi. */
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

interface PlacedCam {
  channel: string;
  name: string;
  place: ReturnType<typeof parseCameraName>;
  at: Pt;
  count: number;
  floor: number;
  online: boolean;
  last: string;
}

/* ---------- Ranglar ----------------------------------------------------------
   Reja — SVG "sahna", shuning uchun mavzuga qarab IKKI palitra: yorug'da
   me'moriy maket ranglari (kulrang plitka, krem devor, yog'och mebel),
   qorong'ida o'sha materiallarning to'q varianti. Material NOMI bir xil
   qoladi — `lib/floorPlan.ts` faqat `Tone` beradi, rangni shu yer tanlaydi. */
interface PlanPalette {
  bg: string;
  slab: string;
  slabEdge: string;
  room: Record<PlanRoom["kind"], string>;
  tone: Record<Tone, string>;
  label: string;
  camOn: string;
  camOff: string;
  camRing: string;
}

const MARK_COLOR: Record<MarkerKind, string> = {
  exit: "#16a34a",
  extinguisher: "#dc2626",
  hydrant: "#b91c1c",
  alarm: "#ef4444",
  shield: "#eab308",
};

const PLAN_PALETTE: Record<"dark" | "light", PlanPalette> = {
  dark: {
    bg: "#0B1220",
    slab: "#18243A",
    slabEdge: "rgba(148,163,184,0.35)",
    room: {
      class: "#1E3050",
      lab: "#183A34",
      office: "#332C1B",
      wc: "#16323A",
      stairs: "#26303F",
      hall: "#2A2438",
      corridor: "#1B2740",
    },
    tone: {
      wallOut: "#3A4B64",
      wallIn: "#2C3B52",
      door: "#8A5F3A",
      glass: "#4C7E9C",
      desk: "#9A6B3F",
      chair: "#49556A",
      board: "#1F5E44",
      cabinet: "#7E5A34",
      bench: "#77563A",
      step: "#3C4C63",
      fixture: "#4A5E77",
      plant: "#2F7D4F",
    },
    label: "rgba(226,246,255,0.82)",
    camOn: "#22d3ee",
    camOff: "#64748b",
    camRing: "#04121E",
  },
  light: {
    bg: "#EDEFF2",
    slab: "#DCE0E6",
    slabEdge: "rgba(71,85,105,0.35)",
    room: {
      class: "#E9EDF3",
      lab: "#E4F0E8",
      office: "#F3ECDF",
      wc: "#E3EFF2",
      stairs: "#E2E6EC",
      hall: "#EFEAF2",
      corridor: "#E6E9EE",
    },
    tone: {
      wallOut: "#DCD2BC",
      wallIn: "#F1EEE8",
      door: "#B07B4A",
      glass: "#AFCFE4",
      desk: "#D9A566",
      chair: "#69737F",
      board: "#2F6F52",
      cabinet: "#C2935F",
      bench: "#BE9264",
      step: "#CCD1D8",
      fixture: "#DCE6EE",
      plant: "#4E9A5B",
    },
    label: "rgba(15,27,46,0.78)",
    camOn: "#0891b2",
    camOff: "#94a3b8",
    camRing: "#ffffff",
  },
};

/** Hex rangni qoraytiradi/yoritadi (`k < 1` — to'qroq). Yon yuzalar uchun. */
function shade(hex: string, k: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const v = parseInt(m[1], 16);
  const ch = [(v >> 16) & 255, (v >> 8) & 255, v & 255].map((c) =>
    Math.max(0, Math.min(255, Math.round(k <= 1 ? c * k : c + (255 - c) * (k - 1))))
  );
  return `#${ch.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

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
  /* ◀ "orqaga" avval bino ichki ko'rinishini yopadi — xarita ochiq qoladi. */
  useModalHistory(onClose);
  const theme = useScheme();
  const pal = PLAN_PALETTE[theme];
  const floors = Math.max(1, Math.round(building.h / FLOOR_H));
  /** `overview` — binoning yaxlit modeli, aks holda tanlangan qavat kesimi. */
  const [view, setView] = useState<"overview" | number>("overview");
  const floor = typeof view === "number" ? view : 1;
  const [camChannel, setCamChannel] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(true);
  const [showMarks, setShowMarks] = useState(true);
  const [showFurniture, setShowFurniture] = useState(true);

  /* Ko'rish burchagi QOTIRILGAN — faqat masshtab va siljish o'zgaradi. */
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const drag = useRef({ x: 0, y: 0, px: 0, py: 0 });
  const wrapRef = useRef<HTMLDivElement>(null);

  const cam: Cam = useMemo(
    () => ({ cos: Math.cos((ISO_ROT * Math.PI) / 180), sin: Math.sin((ISO_ROT * Math.PI) / 180), tilt: ISO_TILT }),
    []
  );

  const shape = useMemo(() => orient(building.p), [building]);
  const school = isSchool179(building.n);
  const plan = useMemo(
    () => buildFloorPlan(shape.poly, shape.w, shape.h, floor, floorProgram(building.n, floor)),
    [shape, floor, building.n]
  );
  const footprint = useMemo(() => Math.round(polyArea(building.p)), [building]);

  /* ---------- Haqiqiy kameralar ---------- */
  const { events } = useDetections({ category: "all", limit: 100 });

  /**
   * DIQQAT: aniqlash API kamerani BINOGA bog'lamaydi — faqat kanal nomini
   * beradi. Nomdan qavat va joy turi o'qiladi, "qaysi bino" manbada yo'q.
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
          floor: place.floor ?? 1,
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
      const k = onFloor.length === 1 ? 0.5 : (i + 0.5) / onFloor.length;
      const x = spine ? spine.x0 + k * (spine.x1 - spine.x0) : k * shape.w;
      const y = spine ? spine.y : shape.h / 2;
      return { ...c, at: [x, y] as Pt };
    });
  }, [allCams, floor, shape.w, shape.h, plan.corridors]);

  const activeCam = allCams.find((c) => c.channel === camChannel) ?? null;
  const camEvent = useMemo(
    () => (activeCam ? events.find((e) => e.channel === activeCam.channel) ?? null : null),
    [events, activeCam]
  );

  /* ---------- Ko'rinish o'lchamlari ---------- */
  const VB = 1180;
  const VBH = VB * 0.56;

  const geom = useMemo(() => {
    const cx = shape.w / 2;
    const cy = shape.h / 2;
    const topZ = view === "overview" ? floors * FLOOR_H : WALL_H;
    const pr = (x: number, y: number, z: number) => project(x - cx, y - cy, z, cam);

    // Markazlashtirish PROYEKSIYA qilingan bbox bo'yicha — reja markazi
    // yetarli emas, burilishda proyeksiya bboxi siljiydi.
    const corners: Pt[] = [];
    for (const [x, y] of shape.poly) corners.push(pr(x, y, 0), pr(x, y, topZ));
    const xs = corners.map((q) => q[0]);
    const ys = corners.map((q) => q[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const pad = 22;
    const scale = Math.min(VB / (maxX - minX + pad), VBH / (maxY - minY + pad)) || 1;
    const ox = VB / 2 - ((minX + maxX) / 2) * scale;
    const oy = VBH / 2 - ((minY + maxY) / 2) * scale;
    const S = (x: number, y: number, z: number): Pt => {
      const [px, py] = pr(x, y, z);
      return [ox + px * scale, oy + py * scale];
    };
    return { S, scale };
  }, [shape, cam, view, floors, VBH]);

  /**
   * HAJMLAR → chizish tartibi (painter): orqadagi hajm AVVAL chiziladi.
   *
   * ⚠️ Chuqurlik kaliti — `x·sin + y·cos`: proyeksiyada aynan shu ifoda
   * ekran `y` ini beradi, ya'ni kattasi kameraga YAQIN. Tepa yuza doim
   * ko'rinadi, yon yuza esa FAQAT normali kameraga qaragan bo'lsa
   * (back-face culling) — aks holda har hajm uchun 4 ta ortiqcha
   * `<path>` chizilardi.
   *
   * ⚠️ Surish (drag) paytida jihoz va belgilar CHIZILMAYDI: to'liq sahna
   * ~3000 `<path>`, har kadrda qayta chizilsa aylantirish sakraydi.
   */
  const solidPaths = useMemo(() => {
    if (view === "overview") return [];
    const { S } = geom;
    const { sin, cos } = { sin: cam.sin, cos: cam.cos };
    const FURNITURE: Tone[] = ["desk", "chair", "board", "cabinet", "bench", "step", "fixture", "plant"];
    const src = showFurniture ? plan.solids : plan.solids.filter((s) => !FURNITURE.includes(s.tone));

    const items: { d: string; fill: string; depth: number; z: number }[] = [];
    for (const s of src) {
      // Kesim: kameraga qaragan tashqi devor pastga qirqiladi
      const z1 = s.cut && s.cut[0] * sin + s.cut[1] * cos > 0 ? Math.min(s.z1, CUT_H) : s.z1;
      if (z1 <= s.z0 + 0.02) continue;

      const n = s.base.length;
      let cx = 0;
      let cy = 0;
      for (const [x, y] of s.base) {
        cx += x / n;
        cy += y / n;
      }
      const depth = cx * sin + cy * cos;
      const base = pal.tone[s.tone];

      for (let i = 0; i < n; i++) {
        const p0 = s.base[i];
        const p1 = s.base[(i + 1) % n];
        let nx = p1[1] - p0[1];
        let ny = -(p1[0] - p0[0]);
        const mx = (p0[0] + p1[0]) / 2;
        const my = (p0[1] + p1[1]) / 2;
        if ((mx - cx) * nx + (my - cy) * ny < 0) {
          nx = -nx;
          ny = -ny;
        }
        if (nx * sin + ny * cos <= 0) continue; // orqa yuza
        const horiz = Math.abs(p1[0] - p0[0]) > Math.abs(p1[1] - p0[1]);
        items.push({
          d: path([S(p0[0], p0[1], s.z0), S(p1[0], p1[1], s.z0), S(p1[0], p1[1], z1), S(p0[0], p0[1], z1)]),
          fill: shade(base, horiz ? 0.82 : 0.68),
          depth,
          z: s.z0,
        });
      }
      items.push({
        d: path(s.base.map(([x, y]) => S(x, y, z1))),
        fill: shade(base, 1.06),
        depth: depth + 0.001,
        z: z1,
      });
    }
    return items.sort((a, b) => a.depth - b.depth || a.z - b.z);
  }, [plan.solids, geom, cam.sin, cam.cos, pal.tone, view, showFurniture]);

  /** Umumiy ko'rinish: qavatlar ustuni, pastdan yuqoriga. */
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

  /** Rejadagi belgilar sanog'i — "Shartli belgilar" ro'yxati uchun. */
  const markCounts = useMemo(() => {
    const c: Record<MarkerKind, number> = { exit: 0, extinguisher: 0, hydrant: 0, alarm: 0, shield: 0 };
    for (const m of plan.markers) c[m.kind]++;
    return c;
  }, [plan.markers]);

  const rooms = plan.rooms.filter((r) => r.kind !== "corridor");

  /* ---------- Sichqoncha ---------- */
  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    setDragging(true);
    drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    setPan({ x: drag.current.px + dx, y: drag.current.py + dy });
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

  const roomName = (r: PlanRoom) => (r.no ? r.no : t.interior.kind[r.kind]);

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
        className="neon-modal neon-modal--cyan flex h-[94vh] w-[97vw] max-w-[1500px] flex-col overflow-hidden"
      >
        {/* ── Sarlavha: yo'l (breadcrumb) + kamera sanoqlari ── */}
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
            {view !== "overview" && (
              <>
                <button
                  onClick={() => setShowFurniture((v) => !v)}
                  title={t.interior.furniture}
                  className={`neon-icon-btn ${showFurniture ? "text-cyan-300" : "text-slate-500"}`}
                >
                  <Sofa size={13} />
                </button>
                <button
                  onClick={() => setShowMarks((v) => !v)}
                  title={t.interior.evac.marks}
                  className={`neon-icon-btn ${showMarks ? "text-cyan-300" : "text-slate-500"}`}
                >
                  <ShieldAlert size={13} />
                </button>
              </>
            )}
            <button
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
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

        {/* ── 3D — BUTUN en (yon ustunlar olib tashlangan) ── */}
        <div
          ref={wrapRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          className={`relative min-h-0 flex-1 overflow-hidden rounded border border-white/10 ${
            dragging ? "cursor-grabbing" : "cursor-grab"
          }`}
          style={{ background: pal.bg }}
        >
          <svg
            viewBox={`0 0 ${VB} ${VBH}`}
            className="h-full w-full touch-none select-none"
            preserveAspectRatio="xMidYMid meet"
          >
            {/* Masshtab va siljish — FAQAT transform: geometriya qayta
                hisoblanmaydi, ya'ni 2500+ `<path>` qayta qurilmaydi. */}
            <g
              transform={`translate(${VB / 2 + pan.x} ${VBH / 2 + pan.y}) scale(${zoom}) translate(${-VB / 2} ${-VBH / 2})`}
            >
              {view === "overview" ? (
                stack.map((fl) => (
                  <g key={fl.floor} onClick={() => setView(fl.floor)} style={{ cursor: "pointer" }}>
                    {fl.faces.map((f, i) => (
                      <path
                        key={i}
                        d={f.d}
                        fill={shade(pal.tone.wallOut, f.bright ? 0.9 : 0.72)}
                        stroke="rgba(148,163,184,0.3)"
                        strokeWidth={0.5}
                      />
                    ))}
                    <path
                      d={fl.top}
                      fill={fl.camCount > 0 ? shade(pal.slab, 1.12) : pal.slab}
                      stroke={fl.camCount > 0 ? "rgba(34,211,238,0.75)" : pal.slabEdge}
                      strokeWidth={0.9}
                      strokeLinejoin="round"
                    />
                    <text
                      x={fl.labelAt[0]}
                      y={fl.labelAt[1]}
                      textAnchor="end"
                      fill={pal.label}
                      style={{ fontSize: 10, fontFamily: "monospace", pointerEvents: "none" }}
                    >
                      {fl.floor}F{fl.camCount > 0 ? ` · ${fl.camCount} ${t.interior.camShort}` : ""}
                    </text>
                  </g>
                ))
              ) : (
                <>
                  {/* Qavat plitasi */}
                  <path
                    d={path(shape.poly.map(([x, y]) => geom.S(x, y, 0)))}
                    fill={pal.slab}
                    stroke={pal.slabEdge}
                    strokeWidth={1}
                    strokeLinejoin="round"
                  />
                  {/* Xona pollari — turi bo'yicha ohang */}
                  {plan.rooms.map((r) => (
                    <path
                      key={`f-${r.id}`}
                      d={path([
                        geom.S(r.x, r.y, 0.01),
                        geom.S(r.x + r.w, r.y, 0.01),
                        geom.S(r.x + r.w, r.y + r.h, 0.01),
                        geom.S(r.x, r.y + r.h, 0.01),
                      ])}
                      fill={pal.room[r.kind]}
                      stroke={pal.slabEdge}
                      strokeWidth={0.35}
                    />
                  ))}
                  {/* Hajmlar — devor, eshik, deraza, jihoz */}
                  {solidPaths.map((s, i) => (
                    <path key={`s${i}`} d={s.d} fill={s.fill} />
                  ))}
                  {/* Xona nomlari */}
                  {rooms.map((r) => {
                      const [px, py] = geom.S(r.x + r.w / 2, r.y + r.h / 2, 0);
                      return (
                        <text
                          key={`t-${r.id}`}
                          x={px}
                          y={py + 3}
                          textAnchor="middle"
                          fill={pal.label}
                          style={{ fontSize: 9, fontFamily: "monospace", pointerEvents: "none" }}
                        >
                          {roomName(r)}
                        </text>
                      );
                    })}
                  {/* Evakuatsiya belgilari — chizmadagi shartli belgilar */}
                  {showMarks &&
                    plan.markers.map((m) => {
                      const [px, py] = geom.S(m.x, m.y, 1.6);
                      const c = MARK_COLOR[m.kind];
                      return (
                        <g key={m.id} style={{ pointerEvents: "none" }}>
                          <rect x={px - 4.5} y={py - 4.5} width={9} height={9} rx={1.6} fill={c} opacity={0.92} />
                          <rect
                            x={px - 4.5}
                            y={py - 4.5}
                            width={9}
                            height={9}
                            rx={1.6}
                            fill="none"
                            stroke="rgba(255,255,255,0.6)"
                            strokeWidth={0.7}
                          />
                        </g>
                      );
                    })}
                  {/* Kameralar — haqiqiy kanallar */}
                  {cameras.map((c) => {
                    const [px, py] = geom.S(c.at[0], c.at[1], WALL_H + 0.4);
                    const active = activeCam?.channel === c.channel;
                    const tone = c.online ? pal.camOn : pal.camOff;
                    return (
                      <g
                        key={c.channel}
                        onClick={() => setCamChannel(active ? null : c.channel)}
                        style={{ cursor: "pointer" }}
                      >
                        <circle cx={px} cy={py} r={active ? 7 : 5} fill={tone} stroke={pal.camRing} strokeWidth={1.5} />
                        <circle cx={px} cy={py} r={12} fill="none" stroke={`${tone}55`} strokeWidth={1} />
                        <text
                          x={px}
                          y={py - 15}
                          textAnchor="middle"
                          fill={pal.label}
                          style={{ fontSize: 8.5, fontFamily: "monospace" }}
                        >
                          {t.interior.place[c.place.kind]}
                        </text>
                      </g>
                    );
                  })}
                </>
              )}
            </g>
          </svg>

          {/* Bino + evakuatsiya kartasi — ilgari chap ustun edi */}
          <InfoCard
            open={showInfo}
            onToggle={() => setShowInfo((v) => !v)}
            title={building.n ?? t.campus3d.building}
          >
            <div className="space-y-1 px-2.5 py-2 text-[10.5px]">
              <Stat Icon={Layers3} label={t.interior.floors} value={String(floors)} />
              <Stat Icon={Ruler} label={t.interior.height} value={`${Math.round(building.h)} m`} />
              <Stat Icon={Square} label={t.interior.footprint} value={`${footprint.toLocaleString(t.locale)} m²`} />
              <Stat Icon={Video} label={t.common.cameras} value={String(stats.total)} />
            </div>

            {view !== "overview" && (
              <div className="border-t border-white/10 px-2.5 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-300">
                  {t.interior.evac.title}
                </p>
                {school && (
                  <p className="mt-0.5 text-[9px] leading-relaxed text-slate-500">
                    {t.interior.evac.sub(SCHOOL_179_PLAN.year)} · {t.interior.evac.approved(SCHOOL_179_PLAN.director)}
                  </p>
                )}
                <ul className="mt-1.5 space-y-1">
                  {(Object.keys(MARK_COLOR) as MarkerKind[]).map((k) => (
                    <li key={k} className="flex items-center gap-1.5 text-[10px]">
                      <span
                        className="h-2.5 w-2.5 flex-none rounded-[2px]"
                        style={{ background: MARK_COLOR[k] }}
                      />
                      <span className="min-w-0 flex-1 truncate text-slate-400">{t.interior.evac.legend[k]}</span>
                      <span className="flex-none font-mono text-slate-300">{markCounts[k]}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-300">
                  {t.interior.evac.stepsTitle}
                </p>
                <ol className="mt-1 list-decimal space-y-0.5 pl-3.5 text-[9.5px] leading-relaxed text-slate-400">
                  {t.interior.evac.steps.map((s: string, i: number) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              </div>
            )}

            <p className="border-t border-white/10 px-2.5 py-1.5 text-[9px] leading-relaxed text-slate-500">
              {building.ml === 1 ? `${t.interior.mlNote} ` : ""}
              {t.interior.planSource}
            </p>
          </InfoCard>

          {/* Kamera kadri — FAQAT nuqta bosilganda (ilgari doimiy o'ng ustun edi) */}
          <AnimatePresence>
            {activeCam && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="absolute bottom-3 right-3 w-[260px] overflow-hidden rounded border border-white/12 bg-[#0B1220]/95 shadow-xl"
              >
                <header className="flex items-center gap-1.5 border-b border-white/10 px-2.5 py-1.5">
                  <span
                    className={`h-1.5 w-1.5 flex-none rounded-full ${
                      activeCam.online ? "bg-emerald-400" : "bg-slate-600"
                    }`}
                  />
                  <p className="min-w-0 flex-1 truncate text-[11px] text-slate-200">{activeCam.name}</p>
                  <button onClick={() => setCamChannel(null)} className="neon-icon-btn flex-none">
                    <X size={12} />
                  </button>
                </header>
                {camEvent ? (
                  <>
                    <DetectionThumb
                      id={camEvent.id}
                      boxes={camEvent.boxes}
                      pictureLost={camEvent.picture_lost}
                      eager
                      className="aspect-video w-full bg-black/40"
                      alt={camEvent.label}
                    />
                    <p className="truncate px-2.5 py-1.5 text-[10px] text-slate-400">
                      {camEvent.label}
                      {detectSubject(camEvent) ? ` · ${detectSubject(camEvent)}` : ""}
                      <span className="ml-1 font-mono text-slate-600">{shortTime(camEvent.time)}</span>
                    </p>
                  </>
                ) : (
                  <div className="grid aspect-video w-full place-items-center bg-black/30 text-[10.5px] text-slate-600">
                    {t.cameras.noDetections}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <p className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded bg-black/40 px-2 py-1 text-[10px] font-semibold text-slate-300">
            {view === "overview" ? t.interior.overviewView : t.interior.floorCut(floor)}
          </p>
          <p className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded border border-white/10 bg-[#0B1220]/85 px-2 py-1 text-[9px] text-slate-500">
            {view === "overview" ? t.interior.hintOverview : t.interior.hintFloor}
            <span className="ml-2 font-mono text-slate-400">{Math.round(zoom * 100)}%</span>
          </p>
        </div>

        {/* ── Pastki qavat qatori (Umumiy | F1 | F2 | ...) ── */}
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
            {rooms.length} · {t.interior.roomsThisFloor}
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}

/** Suzuvchi ma'lumot kartasi — yig'iladi (3D ni to'smasin). */
function InfoCard({
  open,
  onToggle,
  title,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="absolute left-3 top-3 w-[238px] overflow-hidden rounded border border-white/12 bg-[#0B1220]/92 shadow-xl">
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-1.5 border-b border-white/10 px-2.5 py-1.5 text-left"
      >
        <h3 className="min-w-0 flex-1 truncate text-[10.5px] font-semibold uppercase tracking-[0.1em] text-slate-300">
          {title}
        </h3>
        <ChevronDown
          size={13}
          className={`flex-none text-slate-500 transition-transform ${open ? "" : "-rotate-90"}`}
        />
      </button>
      {open && <div className="max-h-[62vh] overflow-y-auto">{children}</div>}
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
        active ? "border-cyan-400/50 bg-cyan-400/15 text-white" : "border-white/10 text-slate-400 hover:text-slate-100"
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
