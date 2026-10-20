/**
 * Bino ICHKI rejasi — xonalar, devorlar, eshik/deraza, MEBEL va evakuatsiya
 * belgilari. Toza geometriya, React YO'Q: `BuildingInterior.tsx` faqat chizadi.
 *
 * 🔴 **MANBA (2026-09-23) — maktabning O'Z EVAKUATSIYA REJASI.** Ilgari reja
 * butunlay taxminiy edi (kontur → markaziy yo'lak → ikki yon xona, bo'sh
 * to'rtburchaklar). Endi TOPOLOGIYA 179-maktabning 1–4 qavati uchun
 * tasdiqlangan evakuatsiya rejasidan (2021, direktor G.A.Ubaydullayeva)
 * olingan: yo'lak binoning uzun o'qi bo'ylab, xonalar yo'lakning ikki
 * tomonida, zinapoya va sanuzel rejada ko'rsatilgan tartibda, chiqish
 * yo'llari va yong'in inventari (o'chirgich, ichki kran, xabar tugmasi,
 * elektrshit) rejadagi shartli belgilar bo'yicha.
 *
 * ⚠️ **Nima rejadan, nima konturdan — ARALASHTIRILMAYDI:**
 * · TOPOLOGIYA (yo'lak, xona ketma-ketligi, zina/sanuzel, chiqish) — REJADAN;
 * · MASSHTAB va tashqi kontur — binoning HAQIQIY geometriyasidan
 *   (`public/geojson/campus/mk-179.json`, OSM + ML);
 * · Xona NOMLARI rejada YOZILMAGAN (chizmada faqat kontur va belgilar) —
 *   shuning uchun xona TURI bo'yicha ataladi (lug'atdan) va raqamlanadi;
 * · Mebel — turga mos TIPIK jihoz (sinfda parta qatorlari, doska); u
 *   o'lchov EMAS, faqat ko'rinish uchun. Undan hech qanday SON hisoblanmaydi.
 */

export type Pt = [number, number];

export type RoomKind = "class" | "lab" | "office" | "wc" | "stairs" | "hall" | "corridor";

export interface PlanRoom {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Xona raqami ("204") — maxsus xonalarda bo'sh (turi bilan ataladi). */
  no: string;
  kind: RoomKind;
  /** Shu xona qaysi yo'lakka qaraydi (eshik shu tomonga qo'yiladi). */
  corridorY?: number;
}

/** Chizmadagi material — rangi palitradan (`BuildingInterior` PLAN_PALETTE). */
export type Tone =
  | "wallOut"
  | "wallIn"
  | "door"
  | "glass"
  | "desk"
  | "chair"
  | "board"
  | "cabinet"
  | "bench"
  | "step"
  | "fixture"
  | "plant";

/**
 * Chizishga tayyor HAJM — ixtiyoriy burchakli tag + balandlik.
 * Devor ham, parta ham, zina qadami ham SHU BITTA primitiv: renderer tagini
 * proyeksiya qilib, tepa yuzani va KAMERAGA QARAGAN yon yuzalarni chizadi
 * (orqa yuzalar tashlanadi — back-face culling).
 */
export interface Solid {
  base: Pt[];
  z0: number;
  z1: number;
  tone: Tone;
  /**
   * TASHQI devor normali. Normal kameraga qaragan bo'lsa devor `CUT_H` gacha
   * KESILADI — "qo'g'irchoq uy" (dollhouse) kesimi: aks holda oldindagi tashqi
   * devor butun qavatni to'sib, ichkarini umuman ko'rsatmasdi.
   */
  cut?: Pt;
}

export type MarkerKind = "exit" | "extinguisher" | "hydrant" | "alarm" | "shield";

/** Evakuatsiya rejasidagi shartli belgi (chiqish yo'li / yong'in inventari). */
export interface PlanMarker {
  id: string;
  x: number;
  y: number;
  kind: MarkerKind;
}

export interface FloorPlan {
  rooms: PlanRoom[];
  corridors: { y: number; x0: number; x1: number }[];
  solids: Solid[];
  markers: PlanMarker[];
}

/* ---------- O'lchamlar (metr) — tipik maktab binosi ---------- */
export const FLOOR_H = 3.3;
/** Ichki devor balandligi.
 *  ⚠️ 2.6 EMAS: qat'iy izometrik burchakda baland ichki devor xona ichini
 *  to'sib qo'yadi (matn-rastr bilan o'lchandi). `BuildingInterior` dagi
 *  `ISO_TILT`/`H_SCALE` bilan BIRGA sozlanadi. */
export const WALL_H = 2.3;
/** Tashqi devor. */
export const EXT_WALL_H = 3.0;
/** Kesim: kameraga qaragan tashqi devordan shuncha qoladi. */
export const CUT_H = 0.5;
export const DOOR_H = 2.05;

const CORRIDOR_W = 3.2;
/** Xona chuqurligi — tasmaga MOSLANADI, shu oraliqda (qat'iy son EMAS). */
const MIN_ROOM_D = 3.0;
const MAX_ROOM_D = 8.0;
const ROOM_D = 7.0;
const ROOM_W = 6.5;
const DOOR_W = 1.1;
const WALL_T_IN = 0.2;
const WALL_T_OUT = 0.45;

/* ---------- Umumiy geometriya ---------- */

/** Poligon yuzasi (shoelace), m². */
export function polyArea(p: Pt[]): number {
  let s = 0;
  for (let i = 0; i < p.length; i++) {
    const a = p[i];
    const b = p[(i + 1) % p.length];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(s / 2);
}

export function inside(pt: Pt, poly: Pt[]): boolean {
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
export function orient(p: Pt[]): { poly: Pt[]; w: number; h: number } {
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

/** O'qqa parallel quti — eng ko'p ishlatiladigan shakl. */
function box(x: number, y: number, w: number, d: number, z0: number, z1: number, tone: Tone): Solid {
  return {
    base: [
      [x, y],
      [x + w, y],
      [x + w, y + d],
      [x, y + d],
    ],
    z0,
    z1,
    tone,
  };
}

/** Kesma (a→b) + qalinlik → devor hajmi. Kontur qiya bo'lsa ham ishlaydi. */
function segSolid(a: Pt, b: Pt, t: number, z0: number, z1: number, tone: Tone, cut?: boolean): Solid | null {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  if (len < 0.05) return null;
  const nx = -dy / len;
  const ny = dx / len;
  const h = t / 2;
  return {
    base: [
      [a[0] + nx * h, a[1] + ny * h],
      [b[0] + nx * h, b[1] + ny * h],
      [b[0] - nx * h, b[1] - ny * h],
      [a[0] - nx * h, a[1] - ny * h],
    ],
    z0,
    z1,
    tone,
    cut: cut ? [nx, ny] : undefined,
  };
}

/* ---------- Qavat rejasi ---------- */

/**
 * Qavat rejasi — kontur GORIZONTAL tasmalarga bo'linadi, har tasmada
 * konturga tushgan uzluksiz kesma topilib, o'rtasiga yo'lak, ikki yoniga
 * xonalar qo'yiladi (E/H/L shaklidagi binoda bitta markaziy yo'lak yetmaydi).
 *
 * `program` — xona TURLARI ketma-ketligi (evakuatsiya rejasidan,
 * `config/schoolPlan.ts`); ro'yxat tugasa oxirgi turi takrorlanadi.
 */
export function buildRooms(poly: Pt[], w: number, h: number, floor: number, program: RoomKind[]) {
  const rooms: PlanRoom[] = [];
  const corridors: { y: number; x0: number; x1: number }[] = [];

  const bandH = 2 * ROOM_D + CORRIDOR_W;
  const bands = Math.max(1, Math.round(h / bandH));
  const step = h / bands;
  let n = 1;
  let k = 0;
  /* Ro'yxat tugagach NIMA bo'ladi.
     ⚠️ Ilgari OXIRGI tur takrorlanardi va bu bema'ni natija berardi:
     3-qavat dasturi "…, lab" bilan tugagani uchun qolgan 17 xona ham
     laboratoriya bo'lib chiqardi (o'lchandi: 19 lab / 7 sinf). Endi
     bir martalik xonalar (sanuzel, zinapoya, dahliz) TAKRORLANMAYDI,
     qolgan turlar esa aylanma tartibda beriladi — maktabda asosiy
     xona sinf bo'lgani uchun natija ham shunga yaqin chiqadi. */
  const ONE_OFF: RoomKind[] = ["wc", "stairs", "hall"];
  const repeatable = program.filter((r) => !ONE_OFF.includes(r));
  const cycle: RoomKind[] = repeatable.length ? repeatable : ["class"];
  const nextKind = (): RoomKind => {
    if (k < program.length) return program[k++] ?? "class";
    return cycle[(k++ - program.length) % cycle.length];
  };

  for (let b = 0; b < bands; b++) {
    const bandTop = b * step;
    const scanY = bandTop + step / 2;

    /* 🔴 XONA CHUQURLIGI TASMAGA MOSLANADI (2026-09-23 da tuzatildi).
       Ilgari u QAT'IY 7 m edi va tasma balandligi 17.2 m dan (2·7 + 3.2)
       sal past bo'lsa — masalan 17 m li qanot — ikkala tomondagi xona ham
       chegaradan chiqib, `continue` bilan tashlanardi: qavat BUTUNLAY
       BO'SH chiqardi (faqat yo'lak). Test bilan aniqlandi: 60x17 m
       to'rtburchakda birorta xona yaratilmasdi.
       Endi: tasmaga ikki qator sig'sa — ikkala tomonda, sig'masa BIR
       TOMONLAMA yo'lak (yo'lak tasma chetiga suriladi). */
    const half = (step - CORRIDOR_W) / 2;
    const twoSided = half >= MIN_ROOM_D;
    const yc = twoSided ? scanY : bandTop + CORRIDOR_W / 2;
    const roomD = Math.min(MAX_ROOM_D, twoSided ? half : step - CORRIDOR_W);
    const sides: (-1 | 1)[] = twoSided ? [-1, 1] : [1];
    if (roomD < MIN_ROOM_D) continue; // tasma umuman tor — xona qo'yilmaydi

    const runs: [number, number][] = [];
    let start: number | null = null;
    const dx = 0.5;
    for (let x = 0; x <= w + dx; x += dx) {
      const on = x <= w && inside([x, scanY], poly);
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
        no: "",
        kind: "corridor",
      });

      const runW = x1 - x0;
      const cols = Math.max(1, Math.round(runW / ROOM_W));
      const stepX = runW / cols;
      for (let i = 0; i < cols; i++) {
        for (const side of sides) {
          const rx = x0 + i * stepX + 0.4;
          const rw = stepX - 0.8;
          const ry = side < 0 ? yc - CORRIDOR_W / 2 - roomD : yc + CORRIDOR_W / 2;
          if (ry < -0.05 || ry + roomD > h + 0.05) continue;
          /* Xonaning TO'RT burchagi ham kontur ichida bo'lsin — aks holda
             xona tashqi devordan chiqib ketadi va kesim yolg'on ko'rinadi.
             ⚠️ Burchaklar ICHKARIGA suriladi: xona qirrasi tashqi devorga
             aynan tushganda (ry = 0) nuqta konturning O'ZIDA bo'ladi va
             nur-uzatish sinovi `false` qaytaradi — xona bekorga tashlanardi. */
          const eps = 0.15;
          const corners: Pt[] = [
            [rx + eps, ry + eps],
            [rx + rw - eps, ry + eps],
            [rx + rw - eps, ry + roomD - eps],
            [rx + eps, ry + roomD - eps],
          ];
          if (!corners.every((c) => inside(c, poly))) continue;
          const kind = nextKind();
          const numbered = kind === "class" || kind === "lab" || kind === "office";
          rooms.push({
            id: `r-${floor}-${b}-${i}-${side}`,
            x: rx,
            y: ry,
            w: rw,
            h: roomD,
            no: numbered ? `${floor}${String(n).padStart(2, "0")}` : "",
            kind,
            corridorY: yc,
          });
          if (numbered) n++;
        }
      }
    }
  }

  return { rooms, corridors };
}

/* ---------- Devorlar, eshik, deraza ---------- */

interface Seg {
  a: Pt;
  b: Pt;
}

/** Kesmani markazdan `gap` kenglikda kesadi (eshik tirqishi). */
function splitForDoor(a: Pt, b: Pt, gap: number): Seg[] {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (len <= gap + 0.4) return [{ a, b }];
  const t0 = (len - gap) / 2 / len;
  const t1 = (len + gap) / 2 / len;
  const at = (t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  return [
    { a, b: at(t0) },
    { a: at(t1), b },
  ];
}

/** Nuqta konturning istalgan qirrasiga shu masofada yaqinmi (tashqi devormi)? */
function nearContour(pt: Pt, poly: Pt[], tol = 0.7): boolean {
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l2 = dx * dx + dy * dy || 1e-9;
    let t = ((pt[0] - a[0]) * dx + (pt[1] - a[1]) * dy) / l2;
    t = Math.max(0, Math.min(1, t));
    const px = a[0] + dx * t;
    const py = a[1] + dy * t;
    if (Math.hypot(pt[0] - px, pt[1] - py) <= tol) return true;
  }
  return false;
}

/**
 * Devor hajmlari: tashqi kontur (qalin, derazali, kesiladigan) + xona
 * qirralari (ingichka); yo'lakka qaragan qirrada ESHIK tirqishi va qanoti.
 */
function buildWalls(poly: Pt[], rooms: PlanRoom[]): Solid[] {
  const out: Solid[] = [];
  const seen = new Set<string>();
  const key = (a: Pt, b: Pt) => {
    const k1 = `${a[0].toFixed(1)},${a[1].toFixed(1)}`;
    const k2 = `${b[0].toFixed(1)},${b[1].toFixed(1)}`;
    return k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`;
  };

  // 1) Tashqi kontur — qalin devor + deraza lentasi
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const s = segSolid(a, b, WALL_T_OUT, 0, EXT_WALL_H, "wallOut", true);
    if (!s) continue;
    out.push(s);
    seen.add(key(a, b));

    // Deraza — devor yuzasidan sal chiqib turadi, shuning uchun qaysi yuza
    // ko'rinsa o'sha tomondan ko'rinadi (ichkaridan ham, tashqaridan ham).
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const count = Math.max(1, Math.floor(len / 4.2));
    for (let j = 0; j < count; j++) {
      const t0 = (j + 0.25) / count;
      const t1 = (j + 0.75) / count;
      const p0: Pt = [a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0];
      const p1: Pt = [a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1];
      const g = segSolid(p0, p1, WALL_T_OUT + 0.08, 1.0, 2.35, "glass", true);
      if (g) out.push(g);
    }
  }

  // 2) Xona devorlari
  for (const r of rooms) {
    if (r.kind === "corridor") continue;
    const x0 = r.x;
    const x1 = r.x + r.w;
    const y0 = r.y;
    const y1 = r.y + r.h;
    const doorY = r.corridorY !== undefined && r.y < r.corridorY ? y1 : y0;

    const edges: [Pt, Pt][] = [
      [
        [x0, y0],
        [x1, y0],
      ],
      [
        [x0, y1],
        [x1, y1],
      ],
      [
        [x0, y0],
        [x0, y1],
      ],
      [
        [x1, y0],
        [x1, y1],
      ],
    ];

    for (const [a, b] of edges) {
      const k = key(a, b);
      if (seen.has(k)) continue;
      seen.add(k);
      // Tashqi konturga tushgan qirra allaqachon qalin devor — takrorlamaymiz
      const mid: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      if (nearContour(mid, poly)) continue;

      const isDoorEdge = Math.abs(a[1] - doorY) < 0.01 && Math.abs(b[1] - doorY) < 0.01;
      if (isDoorEdge) {
        for (const s of splitForDoor(a, b, DOOR_W)) {
          const wl = segSolid(s.a, s.b, WALL_T_IN, 0, WALL_H, "wallIn");
          if (wl) out.push(wl);
        }
        // Eshik qanoti — tirqishda, yopiq holatda
        const mx = (a[0] + b[0]) / 2;
        const d = segSolid(
          [mx - DOOR_W / 2, doorY],
          [mx + DOOR_W / 2, doorY],
          WALL_T_IN * 0.7,
          0,
          DOOR_H,
          "door"
        );
        if (d) out.push(d);
      } else {
        const wl = segSolid(a, b, WALL_T_IN, 0, WALL_H, "wallIn");
        if (wl) out.push(wl);
      }
    }
  }

  return out;
}

/* ---------- Mebel (xona turiga qarab) ---------- */

/**
 * Xona ichidagi jihoz. Joylashuv `t` bilan beriladi: `0` — doska/deraza
 * tomoni, `1` — eshik (yo'lak) tomoni. Shu bilan xona yo'lakning qaysi
 * tomonida bo'lishidan qat'i nazar mebel TO'G'RI yo'naladi.
 */
function addFurniture(r: PlanRoom, out: Solid[]): void {
  const south = r.corridorY === undefined ? true : r.corridorY > r.y;
  const y0 = south ? r.y : r.y + r.h;
  const dir = south ? 1 : -1;
  const Y = (t: number) => y0 + dir * t * r.h;
  /** `t` dan boshlanib `d` metr chuqurlikdagi buyumning y boshlanishi. */
  const Yd = (t: number, d: number) => (dir > 0 ? Y(t) : Y(t) - d);
  const cx = r.x + r.w / 2;

  switch (r.kind) {
    case "class":
    case "lab": {
      // Doska — to'r devorda
      out.push(
        box(cx - Math.min(2.0, r.w * 0.3), Yd(0.04, 0.09), Math.min(4.0, r.w * 0.6), 0.09, 1.0, 1.95, "board")
      );
      // O'qituvchi stoli
      out.push(box(cx - 0.75, Yd(0.17, 0.65), 1.5, 0.65, 0, 0.76, "desk"));

      const rows = 3;
      const cols = Math.max(2, Math.min(3, Math.round((r.w - 1.0) / 2.4)));
      const gap = 0.5;
      const cw = (r.w - 1.2 - gap * (cols - 1)) / cols;
      for (let i = 0; i < rows; i++) {
        const t = 0.36 + i * 0.19;
        for (let c = 0; c < cols; c++) {
          const x = r.x + 0.6 + c * (cw + gap);
          if (r.kind === "lab") {
            out.push(box(x, Yd(t, 0.62), cw, 0.62, 0, 0.78, "desk"));
          } else {
            // Juft parta — o'rtasida ingichka tirqish
            out.push(box(x, Yd(t, 0.5), cw / 2 - 0.05, 0.5, 0, 0.74, "desk"));
            out.push(box(x + cw / 2 + 0.05, Yd(t, 0.5), cw / 2 - 0.05, 0.5, 0, 0.74, "desk"));
          }
          const ct = t + 0.075;
          out.push(box(x + cw * 0.14, Yd(ct, 0.4), 0.4, 0.4, 0, 0.46, "chair"));
          out.push(box(x + cw * 0.56, Yd(ct, 0.4), 0.4, 0.4, 0, 0.46, "chair"));
        }
      }
      // Shkaf — yon devor bo'ylab
      out.push(box(r.x + r.w - 1.0, Yd(0.3, 1.6), 0.55, 1.6, 0, 1.9, "cabinet"));
      break;
    }
    case "office": {
      out.push(box(cx - 0.85, Yd(0.22, 0.8), 1.7, 0.8, 0, 0.76, "desk"));
      out.push(box(cx - 0.22, Yd(0.42, 0.45), 0.45, 0.45, 0, 0.5, "chair"));
      out.push(box(r.x + 0.5, Yd(0.12, 1.4), 0.5, 1.4, 0, 1.95, "cabinet"));
      out.push(box(r.x + r.w - 1.2, Yd(0.12, 1.4), 0.5, 1.4, 0, 1.95, "cabinet"));
      // Mehmon stoli
      out.push(box(cx - 0.6, Yd(0.62, 1.1), 1.2, 1.1, 0, 0.72, "desk"));
      out.push(box(r.x + 0.7, Yd(0.85, 0.42), 0.42, 0.42, 0, 0.46, "chair"));
      out.push(box(r.x + r.w - 1.2, Yd(0.85, 0.42), 0.42, 0.42, 0, 0.46, "chair"));
      break;
    }
    case "wc": {
      // Kabina to'siqlari + rakovinalar (rejada sanuzel zinapoya yonida)
      const stalls = Math.max(2, Math.floor(r.w / 1.15));
      for (let i = 0; i < stalls; i++) {
        const x = r.x + 0.35 + i * 1.1;
        out.push(box(x, Yd(0.1, 1.3), 0.06, 1.3, 0, 1.9, "wallIn"));
        out.push(box(x + 0.25, Yd(0.16, 0.55), 0.42, 0.55, 0, 0.42, "fixture"));
      }
      for (let i = 0; i < 3; i++) {
        out.push(box(r.x + 0.5 + i * 0.8, Yd(0.85, 0.42), 0.55, 0.42, 0.55, 0.95, "fixture"));
      }
      break;
    }
    case "stairs": {
      // Ikki marshli zina — rejadagi zinapoya
      const steps = 9;
      const runW = Math.min(1.45, r.w / 2 - 0.4);
      for (let i = 0; i < steps; i++) {
        const z = (i + 1) * (FLOOR_H / 2 / steps);
        out.push(box(r.x + 0.4, Yd(0.12 + i * 0.062, 0.3), runW, 0.3, 0, z, "step"));
        out.push(box(r.x + r.w - 0.4 - runW, Yd(0.86 - i * 0.062, 0.3), runW, 0.3, 0, z, "step"));
      }
      // Oraliq maydoncha
      out.push(box(r.x + 0.4, Yd(0.7, 1.2), r.w - 0.8, 1.2, 0, FLOOR_H / 2, "step"));
      break;
    }
    case "hall": {
      // Dahliz: skameykalar va tuvakdagi o'simliklar
      for (let i = 0; i < 2; i++) {
        out.push(box(r.x + 0.8 + i * (r.w - 2.6), Yd(0.4, 0.5), 1.6, 0.5, 0, 0.45, "bench"));
      }
      for (let i = 0; i < 3; i++) {
        out.push(box(r.x + 0.6 + (i * (r.w - 1.6)) / 2, Yd(0.12, 0.45), 0.45, 0.45, 0, 1.15, "plant"));
      }
      break;
    }
    default:
      break;
  }
}

/** Yo'lakdagi o'simlik va skameykalar — bo'sh yo'lak jonli ko'rinsin. */
function corridorProps(corridors: { y: number; x0: number; x1: number }[], out: Solid[]): void {
  for (const c of corridors) {
    const len = c.x1 - c.x0;
    const count = Math.max(1, Math.floor(len / 11));
    for (let i = 0; i < count; i++) {
      const x = c.x0 + ((i + 0.5) / count) * len;
      out.push(box(x - 0.22, c.y - CORRIDOR_W / 2 + 0.12, 0.44, 0.44, 0, 1.1, "plant"));
      out.push(box(x + 0.6, c.y + CORRIDOR_W / 2 - 0.62, 1.4, 0.45, 0, 0.45, "bench"));
    }
  }
}

/* ---------- Evakuatsiya belgilari (rejadagi shartli belgilar) ---------- */

/**
 * PDF "Shartli belgilar": asosiy evakuatsiya yo'li, ichki yong'in o'chirish
 * krani, yong'indan zudlik bilan xabar beruvchi tugma, birlamchi yong'in
 * o'chirish vositasi, elektrshit.
 *
 * ⚠️ Rejadagi belgilar SONI fotodan aniq sanalmaydi (masshtabsiz surat),
 * shuning uchun belgilar rejadagi QOIDA bo'yicha qo'yiladi: chiqish — yo'lak
 * uchlari va zinapoya; o'chirgich — yo'lak bo'ylab; kran/tugma/elektrshit —
 * zinapoya yonida. Ekrandagi sanoq SHU joylashuvdan kelib chiqadi —
 * mustaqil "o'ylab topilgan" son emas.
 */
function buildMarkers(rooms: PlanRoom[], corridors: { y: number; x0: number; x1: number }[]): PlanMarker[] {
  const out: PlanMarker[] = [];
  let i = 0;
  const add = (x: number, y: number, kind: MarkerKind) => out.push({ id: `m${i++}`, x, y, kind });

  for (const c of corridors) {
    add(c.x0 + 0.6, c.y, "exit");
    add(c.x1 - 0.6, c.y, "exit");
    add(c.x0 + 1.8, c.y - 0.9, "alarm");

    const len = c.x1 - c.x0;
    const n = Math.max(1, Math.round(len / 18));
    for (let k = 0; k < n; k++) add(c.x0 + ((k + 0.5) / n) * len, c.y - 1.1, "extinguisher");
  }

  for (const r of rooms) {
    if (r.kind !== "stairs") continue;
    const cy = r.y + r.h / 2;
    add(r.x + r.w / 2, r.corridorY ?? cy, "exit");
    add(r.x + 0.5, cy, "hydrant");
    add(r.x + r.w - 0.5, cy, "shield");
  }

  return out;
}

/* ---------- Yig'uvchi ---------- */

export function buildFloorPlan(
  poly: Pt[],
  w: number,
  h: number,
  floor: number,
  program: RoomKind[]
): FloorPlan {
  const { rooms, corridors } = buildRooms(poly, w, h, floor, program);
  const solids = buildWalls(poly, rooms);
  for (const r of rooms) addFurniture(r, solids);
  corridorProps(corridors, solids);
  return { rooms, corridors, solids, markers: buildMarkers(rooms, corridors) };
}
