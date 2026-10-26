/**
 * KAMPUS YER REJASI — 3D modeli bor kampuslar uchun (2026-10-23).
 *
 * Foydalanuvchi Google sun'iy yo'ldosh suratini berdi ("huddi shunga qarab
 * qayerini yo'l, qayerini o'tlar va daraxtlar") — shu surat bo'yicha
 * QO'LDA chizilgan reja: asfalt hovli, plitka yo'lkalar, maysa, bog'
 * pushtalari va daraxt nuqtalari. Model (`mk-179.glb`) o'zida hovli/
 * maysa/daraxt SAQLAMAYDI — ular shu yerdan xaritaga chiziladi.
 *
 * KOORDINATALAR — kampus json'i bilan AYNI: metr, (0,0) = json `center`,
 * X — SHARQ, **Y — JANUB** (`mk-179.json` `buildings[].p` bilan bir fazoda).
 * Blender/`three` fazosiga o'tishda `glbModelLayer.ts` o'zi aylantiradi.
 *
 * Google Earth suratidan o'lchangan mo'ljallar (179-maktab, `mk179()` izohi):
 *   · maktabning ikki uzun qanoti — shimoliy (y −9…11) va janubiy (y 35…46),
 *     oraliqda hovli (y 11…35) — zich, katta daraxtli;
 *   · g'arb: panjara bo'ylab to'q asfalt (mashinalar), so'ng ochiq betonli
 *     hovli (x −48…−35) va "40" bloki;
 *   · shimoliy chet (y −38…−9) — panjara bo'ylab katta daraxt qatori, qanot
 *     bilan panjara orasida zich daraxtzor; shimoli-sharqda bir qavatli bino;
 *   · sharq (x 42…84) — daraxtzor, janubi-sharqda tartibli BOG' pushtalari,
 *     panjara bo'ylab ochiq yo'l, burchakda "Kirish posti" va darvoza;
 *   · janubiy chet (y 46…60) — yo'lka + ko'cha bo'yidagi daraxt qatori.
 *
 * ⚠️ Maysa — ALOHIDA poligon EMAS, butun hudud halqasi: asfalt/plitka/bog'
 * uning USTIDAN chiziladi, bino o'rnidagi maysa esa model devori ostida
 * qoladi (3D chuqurlik). Shu sabab reja sodda va kontur o'zgarsa buzilmaydi.
 *
 * ⚠️ Daraxt MODELI — `public/models/tree_low_poly_lowpoly.glb` (173 KB).
 * Foydalanuvchi tashlagan og'ir fayllar (`realistic_fir_trees_pack…` 51 MB,
 * `grass*.glb` 12–29 MB) ULANMADI va 2026-10-23 da O'CHIRILDI (foydalanuvchi
 * so'rovi) — brauzerga shuncha yuk offline tarmoqda ochilishni daqiqalarga
 * cho'zardi; maysa rangli sirt bilan yetarli.
 */

export type GroundKind = "asphalt" | "paved" | "garden";

export interface GroundZone {
  kind: GroundKind;
  /** Kontur, metr (x sharq, y janub). */
  p: [number, number][];
}

export interface GroundTree {
  x: number;
  y: number;
  /** Balandlik, metr. */
  h: number;
  /** Model ichidagi daraxt turi (0/1 — `tree_low_poly_lowpoly.glb` da ikkita). */
  k: 0 | 1;
}

export interface CampusGroundPlan {
  campusId: string;
  /** Maysa rangi (butun hudud). */
  grass: string;
  zones: GroundZone[];
  trees: GroundTree[];
  /** Daraxt modeli manzili. */
  treeModel: string;
  /**
   * Model tugunlari (Blender obyekt nomi) → rang. Sun'iy yo'ldosh suratida
   * maktab tomi TO'Q kulrang, bir qavatli binolarniki ochiq. Material
   * glb ichida umumiy bo'lgani uchun `glbModelLayer` uni tugun bo'yicha
   * KLONLAB bo'yaydi. Prefiks bo'yicha mos keladi (`Yordamchi_bino_tom.001`).
   */
  recolor: Record<string, string>;
}

/** Barqaror tasodif — har yuklanishda daraxtlar bir joyda tursin. */
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

function rect(x0: number, y0: number, x1: number, y1: number): [number, number][] {
  return [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ];
}

/** Qator bo'ylab daraxtlar — ozgina siljish bilan (tekis "soldat" qatori emas). */
function row(
  rnd: () => number,
  from: [number, number],
  to: [number, number],
  step: number,
  h: [number, number]
): GroundTree[] {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const len = Math.hypot(dx, dy);
  const n = Math.max(1, Math.floor(len / step));
  const out: GroundTree[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    out.push({
      x: from[0] + dx * t + (rnd() - 0.5) * 1.6,
      y: from[1] + dy * t + (rnd() - 0.5) * 1.6,
      h: h[0] + rnd() * (h[1] - h[0]),
      k: rnd() < 0.5 ? 0 : 1,
    });
  }
  return out;
}

/** Hudud ichida sochilgan daraxtlar — `count` ta, bir-biridan kamida `gap` m. */
function scatter(
  rnd: () => number,
  box: [number, number, number, number],
  count: number,
  gap: number,
  h: [number, number]
): GroundTree[] {
  const out: GroundTree[] = [];
  for (let tries = 0; out.length < count && tries < count * 40; tries++) {
    const x = box[0] + rnd() * (box[2] - box[0]);
    const y = box[1] + rnd() * (box[3] - box[1]);
    if (out.some((t) => Math.hypot(t.x - x, t.y - y) < gap)) continue;
    out.push({ x, y, h: h[0] + rnd() * (h[1] - h[0]), k: rnd() < 0.5 ? 0 : 1 });
  }
  return out;
}

function mk179(): CampusGroundPlan {
  const rnd = lcg(179);
  /* Google Earth surati (2026-10-23, foydalanuvchi bergan, 656×460 px) AYNAN
     to'rt burchak koordinatasiga kadrlangan:
       NW 41.295983,69.207169 · NE 41.296021,69.208854
       SE 41.295139,69.208833 · SW 41.295199,69.207108
     → metrda x −61.6…84.5, y −37.9…60.3 (kampus `campus` halqasi ham shu).
     Suratdagi piksel → metr: x = −61.6 + px/656·146.1, y = −37.9 + py/460·98.2.
     Quyidagi barcha koordinatalar shu surat ustidan O'LCHANGAN. */
  return {
    campusId: "edu-mk-179",
    grass: "#3d6a2f",
    zones: [
      // G'arbiy chet — mashinalar turgan to'q asfalt (panjara bilan hovli orasi)
      { kind: "asphalt", p: [[-61.6, 53.6], [-56.5, -33.6], [-48, -34], [-48, 53]] },
      // G'arbiy hovli — ochiq betonli maydon (maktab va panjara orasi, "40" bloki)
      { kind: "paved", p: rect(-48, -19, -35, 52) },
      // Shimoliy qanot oldi va shimoliy qanot bilan bir qavatli bino orasidagi maydon
      { kind: "paved", p: rect(-38, -13, 18, -9) },
      { kind: "paved", p: rect(15, -9, 27, 14) },
      // Ikki qanot orasidagi hovli — chetlari bo'ylab yo'lka (o'rtasi daraxtzor)
      { kind: "paved", p: rect(-5, 11, 42, 14) },
      { kind: "paved", p: rect(-5, 32, 42, 35) },
      { kind: "paved", p: rect(39, 11, 42, 35) },
      // Janubiy qanot oldi — ko'cha tomonidagi yo'lka
      { kind: "paved", p: rect(-40, 46, 46, 49) },
      // Sharqiy panjara bo'ylab ochiq yo'l (daraxtzor va bog'ning sharqi)
      { kind: "paved", p: rect(74, -30, 82, 52) },
      // Bog' bilan daraxtzor orasidagi ko'ndalang yo'lka
      { kind: "paved", p: rect(42, 18, 74, 21) },
      // Janubi-sharq — Kirish posti va darvoza oldi maydoni
      { kind: "paved", p: rect(56, 44, 74, 56) },
      // Janubi-sharqdagi bog' — suratdagi tartibli ochiq pushtalar
      { kind: "garden", p: rect(44, 22, 72, 50) },
    ],
    trees: [
      // Shimoliy panjara bo'ylab katta daraxt qatori (suratda eng to'q chiziq)
      ...row(rnd, [-50, -34], [80, -35], 6, [11, 14]),
      // Shimoliy qanot bilan panjara orasidagi zich daraxtzor (g'arbiy yarmi)
      ...scatter(rnd, [-48, -29, 12, -11], 10, 6, [8, 12]),
      // Shimoli-sharqiy burchak — bir qavatli bino atrofi
      ...scatter(rnd, [64, -31, 73, -8], 4, 6, [8, 11]),
      // Ikki qanot orasidagi hovli — katta soyali daraxtlar
      ...scatter(rnd, [-2, 15, 38, 31], 9, 5.5, [9, 13]),
      // Sharqdagi daraxtzor (janubiy qanot va bog' orasi)
      ...scatter(rnd, [44, -6, 72, 17], 7, 6.5, [8, 12]),
      // Ko'cha bo'yidagi qator (janub, yo'lka ortida)
      ...row(rnd, [-45, 54], [50, 55], 6.5, [8, 11]),
      // G'arbiy hovlidagi yakka daraxtlar
      { x: -42, y: -8, h: 8, k: 0 },
      { x: -41, y: 30, h: 7.5, k: 1 },
    ],
    treeModel: "/models/tree_low_poly_lowpoly.glb",
    /* Ranglar 2026-10-23 dan `mk-179.glb` ning O'ZIGA bitirilgan (Google Earth
       bo'yicha: maktab tomi #a9abab, bir qavatli tom #8b8e90, yordamchi/
       qorovulxona #b9b9b7, devor #cac9c4) — runtime bo'yash bo'sh. Vaqtincha
       sinab ko'rish uchun shu yerga `Maktab_tom: "#…"` yozish kifoya. */
    recolor: {},
  };
}

export const CAMPUS_GROUND_PLANS: readonly CampusGroundPlan[] = [mk179()];

export function campusGroundFor(campusId: string): CampusGroundPlan | undefined {
  return CAMPUS_GROUND_PLANS.find((g) => g.campusId === campusId);
}

/** Yer turi → rang (yorug'/qorong'i mavzuda bir xil — xarita sahnasi). */
export const GROUND_COLORS: Record<GroundKind, string> = {
  asphalt: "#4e5257",
  paved: "#8f8b83",
  garden: "#6b7a3a",
};
