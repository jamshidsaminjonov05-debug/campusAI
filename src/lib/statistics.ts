/**
 * Statistika sahifasi uchun sof hisob funksiyalari.
 *
 * React va i18n'ga BOG'LIQ EMAS — faqat sanoq va saralash. Yorliqlar
 * (tur nomi, holat nomi) komponentda lug'atdan qo'yiladi, shuning uchun
 * bu yerda faqat `id` qaytariladi.
 *
 * ⚠️ **MOCK YO'Q** (2026-09-05). Ilgari hudud/muassasa kesimi
 * `mockData` + `geoAggregate` + `eduInstitutions` dan kelardi — 645 ta
 * GENERATSIYA qilingan muassasa. Endi qatorlar `hooks/useLiveInstitutions`
 * dan (kuzatuvdagi haqiqiy obyektlar) TASHQARIDAN beriladi va yig'indi
 * shu yerda hisoblanadi.
 *
 * ⚠️ **Yig'indi ham `Metric`** (`number | null`): birorta qatorda manba
 * bo'lmasa natija `null` bo'ladi va UI qizil belgi chizadi — nol
 * KO'RSATILMAYDI, chunki "0 talaba" bilan "talabalar soni noma'lum"
 * boshqa-boshqa javob.
 */
import type { DetectionEvent } from "@/lib/detectionEvents";
import { DETECTION_TYPES, type DetectionId } from "@/lib/detectionTypes";
import type { AlertSeverity } from "@/lib/alertTypes";
import { sumMetric, weightedAvg, type InstitutionRow, type Metric, type RegionRow } from "@/lib/institutionRows";

/* ────────────────────────────── Hududlar ────────────────────────────── */

export interface RegionTotals {
  institutes: number;
  students: Metric;
  teachers: Metric;
  staff: Metric;
  activeCameras: Metric;
  totalCameras: Metric;
  alerts: Metric;
  /** Talabalar soniga vaznlangan o'rtacha — oddiy o'rtacha kichik hududni
   *  kattasi bilan teng qilib qo'yardi. */
  attendance: Metric;
}

export function sumRegions(rows: readonly RegionRow[]): RegionTotals {
  return {
    institutes: rows.reduce((n, r) => n + r.institutes, 0),
    students: sumMetric(rows.map((r) => r.students)).value,
    teachers: sumMetric(rows.map((r) => r.teachers)).value,
    staff: sumMetric(rows.map((r) => r.staff)).value,
    activeCameras: sumMetric(rows.map((r) => r.activeCameras)).value,
    totalCameras: sumMetric(rows.map((r) => r.cameras)).value,
    alerts: sumMetric(rows.map((r) => r.alerts)).value,
    attendance: weightedAvg(rows.map((r) => ({ value: r.attendance, weight: r.students }))),
  };
}

/* ──────────────────────────── Muassasalar ───────────────────────────── */

export interface InstitutionTotals {
  count: number;
  students: Metric;
  teachers: Metric;
  staff: Metric;
  cameras: Metric;
  activeCameras: Metric;
  alerts: Metric;
  attendance: Metric;
}

export function sumInstitutions(rows: readonly InstitutionRow[]): InstitutionTotals {
  return {
    count: rows.length,
    students: sumMetric(rows.map((r) => r.students)).value,
    teachers: sumMetric(rows.map((r) => r.teachers)).value,
    staff: sumMetric(rows.map((r) => r.staff)).value,
    cameras: sumMetric(rows.map((r) => r.cameras)).value,
    activeCameras: sumMetric(rows.map((r) => r.activeCameras)).value,
    alerts: sumMetric(rows.map((r) => r.alerts)).value,
    attendance: weightedAvg(rows.map((r) => ({ value: r.attendance, weight: r.students }))),
  };
}

/* ───────────────────────────── Saralash ─────────────────────────────── */

export type SortDir = "asc" | "desc";

/**
 * Jadval saralash — YAGONA nusxa (hudud va muassasa jadvallari bir xil
 * ishlasin). Matn `localeCompare` bilan, son oddiy ayirma bilan.
 */
export function sortRows<T>(rows: T[], key: keyof T, dir: SortDir, locale: string): T[] {
  const sign = dir === "asc" ? 1 : -1;
  /* Bo'sh katak (kelmagan o'quvchining kirish vaqti, kayfiyatsiz e'tibor)
     HAR DOIM oxirida turadi — yo'nalishdan qat'i nazar. Aks holda `null`
     matnga aylanib ("null") sonlar orasiga tushib qolardi. */
  const empty = (v: unknown) => v === null || v === undefined || v === "";
  return [...rows].sort((a, b) => {
    const x = a[key];
    const y = b[key];
    if (empty(x) || empty(y)) return empty(x) && empty(y) ? 0 : empty(x) ? 1 : -1;
    if (typeof x === "number" && typeof y === "number") return (x - y) * sign;
    return String(x).localeCompare(String(y), locale) * sign;
  });
}

/* ────────────────────────── Hodisalar kesimi ────────────────────────── */

export interface EventTypeStat {
  id: DetectionId;
  count: number;
  color: string;
  /** Umumiy sondagi ulush, foizda. */
  pct: number;
}

export interface EventStats {
  total: number;
  dangerous: number;
  byType: EventTypeStat[];
  bySeverity: { key: AlertSeverity; count: number }[];
  /** Eng ko'p hodisa bergan kameralar (kamida bitta hodisali). */
  byCamera: { camera: string; count: number }[];
  /** Oqimdagi so'nggi kunlar (eskidan yangiga) — kunlik va xavfli soni. */
  byDay: { key: string; date: Date; count: number; dangerous: number }[];
}

const DANGEROUS = new Set<AlertSeverity>(["critical", "high"]);
const SEVERITY_ORDER: AlertSeverity[] = ["critical", "high", "medium", "low", "info"];

/** Kun kaliti — `aiSummary.ts` dagi bilan bir xil qoida (mahalliy vaqt). */
const dayKey = (ts: number): string => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

/**
 * @param days Kunlik grafikda ko'rsatiladigan oxirgi kunlar soni.
 */
export function buildEventStats(events: DetectionEvent[], days = 7): EventStats {
  const perType = new Map<DetectionId, number>();
  const perSeverity = new Map<AlertSeverity, number>();
  const perCamera = new Map<string, number>();
  const perDay = new Map<string, { date: Date; count: number; dangerous: number }>();
  let dangerous = 0;

  for (const e of events) {
    perType.set(e.type, (perType.get(e.type) ?? 0) + 1);
    perSeverity.set(e.severity, (perSeverity.get(e.severity) ?? 0) + 1);
    if (e.camera) perCamera.set(e.camera, (perCamera.get(e.camera) ?? 0) + 1);
    if (DANGEROUS.has(e.severity)) dangerous++;

    const k = dayKey(e.ts);
    const slot = perDay.get(k) ?? { date: new Date(e.ts), count: 0, dangerous: 0 };
    slot.count++;
    if (DANGEROUS.has(e.severity)) slot.dangerous++;
    perDay.set(k, slot);
  }

  const total = events.length;

  return {
    total,
    dangerous,
    byType: DETECTION_TYPES.map((d) => {
      const count = perType.get(d.id) ?? 0;
      return { id: d.id, count, color: d.color, pct: total > 0 ? Math.round((count / total) * 100) : 0 };
    }).sort((a, b) => b.count - a.count),
    bySeverity: SEVERITY_ORDER.map((key) => ({ key, count: perSeverity.get(key) ?? 0 })).filter(
      (s) => s.count > 0
    ),
    byCamera: [...perCamera.entries()]
      .map(([camera, count]) => ({ camera, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    byDay: [...perDay.entries()]
      .map(([key, v]) => ({ key, ...v }))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(-days),
  };
}

/* ─────────────────────────── CSV eksport ────────────────────────────── */

/**
 * CSV matni. Ajratuvchi — nuqta-vergul: Excel o'zbek/rus lokalida vergulni
 * ustun ajratuvchi deb qabul QILMAYDI va butun qator bitta katakka tushadi.
 */
export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const cell = (v: string | number) => {
    const s = String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows].map((r) => r.map(cell).join(";")).join("\r\n");
}

/**
 * Faylni brauzerda saqlash — hammasi lokal (Blob), tashqi so'rov YO'Q.
 * `﻿` BOM: usiz Excel kirill/o'zbek harflarini buzib ochadi.
 */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Fayl nomiga sana qo'shish — `statistika-hududlar-2026-08-29.csv`. */
export function csvName(prefix: string): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${prefix}-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.csv`;
}
