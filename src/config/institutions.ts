/**
 * Kuzatuvdagi o'quv muassasalari — 3D kampusi BOR obyektlar (Toshkent sh.).
 *
 * Bu MOCK EMAS, konfiguratsiya: koordinatalar OpenStreetMap chegarasining
 * markazi va `public/geojson/campus/<campus>.json` dagi `center` bilan bir xil.
 *
 * DIQQAT — `id` va `campus` ATAYLAB alohida maydon. `src/lib/mockData.ts`
 * dagi respublika bo'ylab 645 texnikum ro'yxati ham `tk-001…tk-010` id'larini
 * ishlatadi (butunlay boshqa obyektlar). Ikkalasi bitta `selectedTeknikum`
 * kanalidan o'tgani uchun bu yerdagi id'lar `edu-` bilan boshlanadi, geojson
 * fayl nomi esa `campus` maydonida turadi — fayllar qayta nomlanmagan.
 *
 * Yangi muassasa qo'shish:
 *   1. `public/geojson/campus/<campus>.json` faylini qo'shing
 *      (V3 dagi `tools/campus3d/build.mjs` yasaydi — OSM way id bo'yicha),
 *   2. shu ro'yxatga bitta qator.
 *
 * Statistika (hodisalar, kameralar) BU YERDA saqlanmaydi — u kuzatuv posti aniqlash
 * API'sidan real vaqtda olinadi (`src/hooks/useDetections.ts`).
 */

/**
 * Muassasa TURI — o'quvchilarni nima deb atashni shu belgilaydi.
 *
 * ⚠️ Maktabda **"O'quvchilar"**, oliy ta'limda **"Talabalar"** deyiladi;
 * bu o'zbek tilida uslub emas, MA'NO farqi. Ilgari butun panel bo'ylab
 * qat'iy "Talabalar" yozilardi va 179-MAKTAB uchun ham shunday chiqardi.
 *
 * Backend muassasa turini hali bermaydi (`BACKEND.md` 3-band) — shu sabab
 * u hozircha SHU konfiguratsiyada turadi. Backend `kind` maydonini
 * qaytara boshlasa `institutionKind()` o'sha qiymatga o'tadi va UI
 * O'ZGARMAYDI.
 */
export type InstitutionKind = "school" | "college" | "university";

export interface Institution {
  id: string;
  /** Maktab / kollej / oliy ta'lim — `studentLabelKey()` shunga qaraydi. */
  kind: InstitutionKind;
  name: string;
  /** Qisqa nom — tor joylarda (select, marker hint). */
  short: string;
  /** `public/geojson/campus/<campus>.json` — 3D kampus fayli. */
  campus: string;
  /** OSM way id — kampus chegarasi shu obyektdan olingan. */
  osmWay: number;
  lat: number;
  lng: number;
  region: string;
}

export const INSTITUTIONS: Institution[] = [
  // Kameralar birinchi shu maktabga o'rnatilmoqda — 3D kampus shundan boshlanadi.
  { id: "edu-mk-179", kind: "school", campus: "mk-179", name: "Chilonzor tumani 179-maktab", short: "179-maktab", osmWay: 441554713, lat: 41.29568, lng: 69.20784, region: "Toshkent sh." },
  { id: "edu-tatu", kind: "university", campus: "tk-001", name: "Muhammad al-Xorazmiy nomidagi TATU", short: "TATU", osmWay: 98817542, lat: 41.34061, lng: 69.28874, region: "Toshkent sh." },
  { id: "edu-avia", kind: "college", campus: "tk-002", name: "Toshkent aviasozlik kasb-hunar kolleji", short: "Aviasozlik kolleji", osmWay: 179410473, lat: 41.29796, lng: 69.35183, region: "Toshkent sh." },
  { id: "edu-temir", kind: "college", campus: "tk-003", name: "Yashnobod temir yo'l kasb-hunar kolleji", short: "Temir yo'l kolleji", osmWay: 114994530, lat: 41.27903, lng: 69.33728, region: "Toshkent sh." },
  { id: "edu-aloqa", kind: "college", campus: "tk-004", name: "Toshkent aloqa kolleji", short: "Aloqa kolleji", osmWay: 222700903, lat: 41.33252, lng: 69.26504, region: "Toshkent sh." },
  { id: "edu-kompyuter", kind: "college", campus: "tk-005", name: "Yashnobod kompyuter texnologiyalari kolleji", short: "Kompyuter texnologiyalari", osmWay: 528375303, lat: 41.26668, lng: 69.32709, region: "Toshkent sh." },
  { id: "edu-ozmu", kind: "university", campus: "tk-006", name: "Mirzo Ulug'bek nomidagi O'zbekiston Milliy universiteti", short: "O'zMU", osmWay: 1501491817, lat: 41.35042, lng: 69.20254, region: "Toshkent sh." },
];

/**
 * Muassasa turi — noma'lum bo'lsa NOMIDAN taxmin qilinadi.
 *
 * ⚠️ Nomdan taxmin — ZAXIRA yo'l, asosiysi emas: ro'yxatdagi obyektda
 * `kind` yozilgan bo'ladi. Backend boshqa muassasalarni qaytara
 * boshlaganda (hozir bermaydi) ular uchun shu zaxira ishlaydi.
 */
export function institutionKind(inst: { kind?: InstitutionKind; name?: string } | null | undefined): InstitutionKind {
  if (inst?.kind) return inst.kind;
  const n = (inst?.name ?? "").toLowerCase();
  if (n.includes("maktab") || n.includes("школа") || n.includes("school")) return "school";
  if (n.includes("kollej") || n.includes("texnikum") || n.includes("college")) return "college";
  return "university";
}

/**
 * "O'quvchilar" (maktab) yoki "Talabalar" (kollej/oliy ta'lim) — lug'at
 * KALITI. Matnning o'zi `i18n` da (`t.board.type.studentSchool` /
 * `.studentHigher`), chunki bu ko'rinadigan matn.
 */
export const studentLabelKey = (kind: InstitutionKind): "studentSchool" | "studentHigher" =>
  kind === "school" ? "studentSchool" : "studentHigher";

export const institutionById = (id: string | null | undefined): Institution | null =>
  INSTITUTIONS.find((t) => t.id === id) ?? null;

/** Header'da hech narsa tanlanmaganda ko'rsatiladigan 3D kampus. */
export const DEFAULT_INSTITUTION_ID = "edu-mk-179";

/** Xarita markazi — Toshkent shahri ([lat, lng]). */
export const TASHKENT_CENTER: [number, number] = [41.3, 69.3];
export const TASHKENT_ZOOM = 11.4;

/** Toshkent shahri to'rtburchagi ([[janub,g'arb],[shimol,sharq]]). */
export const TASHKENT_BOUNDS: [[number, number], [number, number]] = [
  [41.18, 69.10],
  [41.42, 69.45],
];
