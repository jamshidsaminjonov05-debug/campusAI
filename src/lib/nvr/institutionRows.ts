/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  MUASSASA VA HUDUD QATORLARI — YAGONA, MOCK'SIZ MANBA                ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * Bu fayl `lib/mockData.ts` + `lib/regionInstitutes.ts` +
 * `lib/geoAggregate.ts` + `lib/eduInstitutions.ts` ning O'RNINI egalladi.
 * O'sha to'rttasi **645 muassasa va 14 viloyat uchun SON GENERATSIYA
 * qilardi** (deterministik psevdo-tasodif) — ekrandagi deyarli har bir
 * raqam to'qilgan edi va backend bilan ZID kelardi (o'lchandi: Geo
 * Analitikada "14 kamera", Kameralar sahifasida esa 32 ta).
 *
 * ── QOIDA ─────────────────────────────────────────────────────────────
 * **Son O'YLAB TOPILMAYDI.** Manbasi bo'lmagan ko'rsatkich `null` bo'ladi
 * va UI uni **qizil "ma'lumot yo'q"** belgisi bilan chizadi
 * (`components/common/Missing.tsx`). `0` esa HAQIQIY nol degani.
 *
 * ── AVTOMAT TO'G'RILANISH ─────────────────────────────────────────────
 * Ro'yxatning O'ZI — `config/institutions.ts` (kuzatuvdagi 7 obyekt,
 * koordinatalari OSM'dan; bu mock emas, konfiguratsiya). Ko'rsatkichlar
 * esa `hooks/useLiveInstitutions.ts` da JONLI manbadan qo'yiladi. Backend
 * muassasalar reyestrini bera boshlasa (`BACKEND.md` 1-band) faqat
 * `useLiveInstitutions` o'zgaradi — bu fayl ham, UI ham TEGILMAYDI.
 */
import { INSTITUTIONS, type InstitutionKind } from "@/config/institutions";

/** Muassasa/hudud holati. Manba bo'lmasa `null` (rang berilmaydi). */
export type RegionHealth = "normal" | "warning" | "critical";

export const STATUS_COLOR: Record<RegionHealth, string> = {
  normal: "#22C55E",
  warning: "#EAB308",
  critical: "#EF4444",
};

/**
 * O'lchanadigan ko'rsatkich.
 *
 * · `number` — HAQIQIY qiymat (`0` ham haqiqiy);
 * · `null`   — manba yo'q, backend bu maydonni bermayapti.
 */
export type Metric = number | null;

export interface InstitutionRow {
  /** `selectedTeknikum` kanalidagi id (`edu-…`). */
  id: string;
  name: string;
  short: string;
  /** Qisqa hudud nomi ("Toshkent sh.") — ko'rsatish uchun. */
  region: string;
  /** GeoJSON'dagi to'liq nomi ("Toshkent shahri") — xarita bog'lash uchun. */
  regionFull: string;
  kind: InstitutionKind;
  lat: number;
  lng: number;
  /** 3D kampusi va kuzatuvi bor — jonli son SHU obyektlarga qo'yiladi. */
  monitored: boolean;
  students: Metric;
  teachers: Metric;
  staff: Metric;
  cameras: Metric;
  activeCameras: Metric;
  /** Davomat foizi. */
  attendance: Metric;
  alerts: Metric;
  status: RegionHealth | null;
}

export interface RegionRow {
  region: string;
  regionFull: string;
  /**
   * Muassasalar soni — **HAQIQIY**: ro'yxatdagi obyektlar sanog'i.
   *
   * ⚠️ Bu "viloyatdagi jami maktablar" EMAS. Viloyatda yuzlab muassasa
   * bor, lekin ularning birortasi ham backendga kiritilmagan
   * (`BACKEND.md` 1-band). Shuning uchun bu ustun "tizimga ulangan
   * muassasalar" degani va shundayligicha yoziladi.
   */
  institutes: number;
  students: Metric;
  teachers: Metric;
  staff: Metric;
  cameras: Metric;
  activeCameras: Metric;
  attendance: Metric;
  alerts: Metric;
  status: RegionHealth | null;
}

/** `INSTITUTIONS.region` qisqa yozuv → GeoJSON'dagi to'liq nom. */
const SHORT_TO_FULL: Record<string, string> = {
  "Toshkent sh.": "Toshkent shahri",
  "Toshkent vil.": "Toshkent viloyati",
};

export const fullRegionName = (short: string): string => SHORT_TO_FULL[short] ?? short;

/**
 * Kuzatuvdagi muassasalar — ko'rsatkichlari BO'SH skelet.
 *
 * Jonli sonlar `useLiveInstitutions()` da qo'yiladi; bu yerda hammasi
 * `null`, chunki modul darajasida hech qanday o'lchov mavjud emas.
 */
export const INSTITUTION_ROWS: InstitutionRow[] = INSTITUTIONS.map((i) => ({
  id: i.id,
  name: i.name,
  short: i.short,
  region: i.region,
  regionFull: fullRegionName(i.region),
  kind: i.kind,
  lat: i.lat,
  lng: i.lng,
  monitored: true,
  students: null,
  teachers: null,
  staff: null,
  cameras: null,
  activeCameras: null,
  attendance: null,
  alerts: null,
  status: null,
}));

export const institutionRowById = (id: string | null | undefined): InstitutionRow | null =>
  INSTITUTION_ROWS.find((r) => r.id === id) ?? null;

/** Hududdagi muassasalar — qisqa yoki to'liq nom bo'yicha. */
export function institutionsOfRegion(region: string | null | undefined): InstitutionRow[] {
  if (!region) return [];
  return INSTITUTION_ROWS.filter((r) => r.region === region || r.regionFull === region);
}

/** Qidiruv — nom, qisqa nom yoki hudud bo'yicha. */
export function searchInstitutionRows(query: string, rows: InstitutionRow[] = INSTITUTION_ROWS): InstitutionRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter(
    (r) =>
      r.name.toLowerCase().includes(q) ||
      r.short.toLowerCase().includes(q) ||
      r.region.toLowerCase().includes(q)
  );
}

/* ────────────────────────────── Yig'ish ────────────────────────────── */

/**
 * Ko'rsatkichlar yig'indisi.
 *
 * ⚠️ **Bittasi ham `null` bo'lmasa — son; hammasi `null` bo'lsa — `null`.**
 * Ya'ni "bittasi ma'lum, qolgani noma'lum" holatda BOR bo'lganlar
 * qo'shiladi, lekin natija to'liq emasligi chaqiruvchiga `partial`
 * bilan bildiriladi — jim ravishda kam son ko'rsatilmasin.
 */
export function sumMetric(values: readonly Metric[]): { value: Metric; partial: boolean } {
  const known = values.filter((v): v is number => v !== null);
  if (known.length === 0) return { value: null, partial: false };
  return { value: known.reduce((s, v) => s + v, 0), partial: known.length !== values.length };
}

/** O'rtacha — TALABALAR SONIGA vaznlangan (kichik obyekt kattasini tenglashtirmasin). */
export function weightedAvg(rows: readonly { value: Metric; weight: Metric }[]): Metric {
  let num = 0;
  let den = 0;
  for (const r of rows) {
    if (r.value === null) continue;
    const w = r.weight ?? 0;
    if (w <= 0) continue;
    num += r.value * w;
    den += w;
  }
  return den > 0 ? Math.round(num / den) : null;
}

/** Muassasa qatorlaridan hudud qatorlarini yig'ish. */
export function buildRegionRows(rows: readonly InstitutionRow[]): RegionRow[] {
  const byRegion = new Map<string, InstitutionRow[]>();
  for (const r of rows) {
    const list = byRegion.get(r.regionFull);
    if (list) list.push(r);
    else byRegion.set(r.regionFull, [r]);
  }

  return [...byRegion.entries()]
    .map(([regionFull, list]) => ({
      region: list[0].region,
      regionFull,
      institutes: list.length,
      students: sumMetric(list.map((r) => r.students)).value,
      teachers: sumMetric(list.map((r) => r.teachers)).value,
      staff: sumMetric(list.map((r) => r.staff)).value,
      cameras: sumMetric(list.map((r) => r.cameras)).value,
      activeCameras: sumMetric(list.map((r) => r.activeCameras)).value,
      attendance: weightedAvg(list.map((r) => ({ value: r.attendance, weight: r.students }))),
      alerts: sumMetric(list.map((r) => r.alerts)).value,
      status: worstStatus(list.map((r) => r.status)),
    }))
    .sort((a, b) => a.regionFull.localeCompare(b.regionFull));
}

/** Eng yomon holat — hudud qatori uchun. Hammasi noma'lum bo'lsa `null`. */
export function worstStatus(list: readonly (RegionHealth | null)[]): RegionHealth | null {
  if (list.some((s) => s === "critical")) return "critical";
  if (list.some((s) => s === "warning")) return "warning";
  if (list.some((s) => s === "normal")) return "normal";
  return null;
}

/**
 * Holat — HAQIQIY sonlardan.
 *
 * Ikkala kirish ham noma'lum bo'lsa `null` qaytadi: "normal" deb
 * ko'rsatish ma'lumot yo'qligini YASHIRARDI.
 */
export function statusOf(alerts: Metric, attendance: Metric): RegionHealth | null {
  if (alerts === null && attendance === null) return null;
  const a = alerts ?? 0;
  const att = attendance ?? 100;
  if (a >= 5 || att < 89) return "critical";
  if (a >= 2 || att < 92) return "warning";
  return "normal";
}
