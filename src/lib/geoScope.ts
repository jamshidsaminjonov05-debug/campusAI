/**
 * Geo Analitika — TANLANGAN MIQYOS (respublika / viloyat / kampus).
 *
 * Qaysi daraja tanlansa ham o'ng paneldagi bo'limlar bir xil to'ldirilsin:
 * respublika → viloyat → kampus.
 *
 * ── 2026-09-05: MOCK OLIB TASHLANDI ───────────────────────────────────
 * Ilgari bu fayl `mockData.buildRegionAnalytics()` va
 * `geoAggregate.REGION_STATS` dan o'qirdi — ikkalasi ham 645 ta
 * GENERATSIYA qilingan muassasadan yig'ilgan sonlar edi. Endi manba —
 * `lib/institutionRows.ts` (kuzatuvdagi HAQIQIY obyektlar) va
 * `hooks/useLiveInstitutions.ts` (o'lchangan sonlar). Ko'rsatkich
 * bo'lmasa `null` qaytadi va UI uni QIZIL belgi bilan chizadi.
 *
 * ⚠️ **"Kayfiyat" ko'rsatkichi OLIB TASHLANDI** (`MetricKey` dan ham).
 * Serverda kayfiyat moduli umuman o'rnatilmagan (`ultralytics` yo'q,
 * o'lchandi 2026-09-02: 30 kun uchun 0 ta qayd), ya'ni u DOIM "ma'lumot
 * yo'q" bo'lardi — xaritani shunday ko'rsatkich bo'yicha bo'yash yoki
 * saralash ma'nosiz. Manba paydo bo'lsa qaytariladi.
 */
import type { InstitutionRow, Metric, RegionRow } from "@/lib/institutionRows";

export type ScopeLevel = "republic" | "region" | "campus";

export interface GeoScope {
  level: ScopeLevel;
  /** Panellar chizadigan qator (kampus darajasida ham shu shakl). */
  data: RegionRow;
  /** Miqyosni odam o'qiydigan ko'rinishi ("Toshkent shahri · TATU"). */
  breadcrumb: string[];
}

/** Muassasa qatorini hudud shakliga keltirish (panellar bitta shaklni kutadi). */
export function scopeOfInstitution(inst: InstitutionRow): RegionRow {
  return {
    region: inst.short,
    regionFull: inst.name,
    institutes: 1,
    students: inst.students,
    teachers: inst.teachers,
    staff: inst.staff,
    cameras: inst.cameras,
    activeCameras: inst.activeCameras,
    attendance: inst.attendance,
    alerts: inst.alerts,
    status: inst.status,
  };
}

/**
 * Joriy tanlovga mos miqyos. Kampus > viloyat > respublika.
 *
 * Qatorlar TASHQARIDAN beriladi (`useLiveInstitutions()`), chunki ular
 * jonli so'rovlardan quriladi — modul darajasida statik ro'yxat YO'Q.
 */
export function resolveScope(
  selectedRegion: string | null,
  selectedCampusId: string | null,
  rows: { institutions: InstitutionRow[]; regions: RegionRow[]; national: RegionRow }
): GeoScope {
  if (selectedCampusId) {
    const inst = rows.institutions.find((i) => i.id === selectedCampusId);
    if (inst) {
      return {
        level: "campus",
        data: scopeOfInstitution(inst),
        breadcrumb: ["O'zbekiston", inst.region, inst.name],
      };
    }
  }
  if (selectedRegion) {
    const region = rows.regions.find((r) => r.regionFull === selectedRegion || r.region === selectedRegion);
    if (region) {
      return { level: "region", data: region, breadcrumb: ["O'zbekiston", region.regionFull] };
    }
  }
  return { level: "republic", data: rows.national, breadcrumb: ["O'zbekiston"] };
}

/* ───────────────────── Xarita ranglari (ko'rsatkich bo'yicha) ───────────────────── */

export type MetricKey = "attendance" | "alerts" | "cameras";

/**
 * Holat palitrasi — butun ilovada AYNAN shu uchtasi.
 *
 * Qiymatlar ATAYLAB OCHROQ (Tailwind 400-daraja): qorong'i navy fonda
 * to'q ranglar (500-daraja) yutilib ketardi va yozuv o'qilmasdi.
 */
export const SCALE_BAD = "#F87171"; // Trevoga
export const SCALE_MID = "#FBBF24"; // Diqqat
export const SCALE_GOOD = "#4ADE80"; // Norma

/** Ko'rsatkichning xom qiymati. Manba yo'q bo'lsa `null`. */
export function metricValue(r: RegionRow, key: MetricKey): Metric {
  if (key === "attendance") return r.attendance;
  if (key === "cameras") {
    if (r.cameras === null || r.activeCameras === null || r.cameras === 0) return null;
    return r.activeCameras / r.cameras;
  }
  return r.alerts;
}

/** Ko'rsatkichni odam o'qiydigan ko'rinishda. `null` — manba yo'q. */
export function formatMetric(r: RegionRow, key: MetricKey): string | null {
  const v = metricValue(r, key);
  if (v === null) return null;
  if (key === "attendance") return `${v}%`;
  if (key === "cameras") return `${Math.round(v * 100)}%`;
  return String(v);
}
