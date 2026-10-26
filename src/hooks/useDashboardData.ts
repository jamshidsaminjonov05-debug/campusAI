/**
 * Dashboard uchun yagona ma'lumot manbai.
 *
 * ── 2026-09-05: MOCK BUTUNLAY OLIB TASHLANDI ──────────────────────────
 * Ilgari bu hook backend bo'sh bo'lsa **respublika mock'iga** tushardi
 * (`geoAggregate.NATIONAL_STATS` — 645 generatsiya qilingan muassasadan
 * yig'ilgan 703 052 talaba, 8 164 kamera) va muassasa tanlanganda ham
 * `regionInstitutes.ts` bergan TO'QILGAN qatordan o'qirdi. Ekrandagi
 * raqamlarning ko'pi shu sabab haqiqiy emas edi.
 *
 * Endi manba faqat uchtasi:
 *   1. backend `/statistics/dashboard` · `/attendance/recent` · emotions,
 *   2. kuzatuv posti (`hooks/useLiveInstitutions` — kanallar + davomat + hodisalar),
 *   3. hech qaysi bermasa — **`null`** (UI qizil "ma'lumot yo'q" chizadi).
 *
 * ⚠️ **`Metric = number | null`.** `0` HAQIQIY nol degani; `null` esa
 * "manba yo'q". Ikkalasini aralashtirmaslik shu hookning asosiy vazifasi:
 * "0 kamera" bilan "kameralar soni noma'lum" — boshqa-boshqa javob.
 */
"use client";

import { useMemo } from "react";
import type { Metric } from "@/lib/nvr/institutionRows";
import { useLiveInstitutions } from "@/hooks/useLiveInstitutions";
import { useAppStore } from "@/store/useAppStore";

export interface DashboardCount {
  total: Metric;
  present: Metric;
  absent: Metric;
  rate: Metric;
}

export interface DashboardView {
  students: DashboardCount;
  teachers: DashboardCount;
  cameras: { active: Metric; total: Metric; rate: Metric };
  alarms: Metric;
  /** Tizimga ULANGAN muassasalar soni — bu HAQIQIY sanoq. */
  institutes: number;
  /** `total === 0` — serverda kayfiyat moduli yo'q, halqa CHIZILMAYDI. */
  emotions: { positive: number; neutral: number; negative: number; total: number };
  /**
   * Haftalik dinamika. **Bo'sh massiv — ma'lumot yo'q** (nol chiziq
   * chizilmaydi, panel sababini yozadi).
   */
  trend: { label: string; value: number; dayIndex: number | null }[];
  /** Kamida bitta ko'rsatkich haqiqiy manbadan keldimi. */
  live: boolean;
  /** Tanlangan muassasa (bo'lsa). `null` = umumiy (ulangan muassasalar yig'indisi). */
  scope: { id: string; name: string } | null;
}

const pct = (part: Metric, whole: Metric): Metric =>
  part === null || whole === null || whole <= 0 ? null : Math.round((part / whole) * 100);

const diff = (a: Metric, b: Metric): Metric => (a === null || b === null ? null : a - b);

/* 🔴 `useDashboard()` (`/statistics/dashboard`, 5.9 s har 60 s) va
   `useEmotionsDaily()` OLIB TASHLANDI (2026-10-26, `SEKINLIK-TUZATISH.md`
   13-B/14): kuzatuv posti serveri bu yo'llarga BOSHQA shakl qaytaradi
   (`{events:…}` / `{by_day:[]}`), bu hookdagi `students`/`teachers`/
   `total_cameras`/`emotions_today` maydonlari doim `undefined` edi — ya'ni
   har daqiqadagi og'ir so'rov hech narsa bermasdi. Manba endi FAQAT
   `useLiveInstitutions` (kuzatuv posti kanallari + davomat). Kayfiyat
   moduli serverda yo'q — `emotions.total = 0`, `trend` bo'sh. */
export function useDashboardData(): DashboardView {
  const selectedTeknikum = useAppStore((s) => s.selectedTeknikum);
  const rows = useLiveInstitutions();

  return useMemo(() => {
    const inst = selectedTeknikum ? rows.institutions.find((r) => r.id === selectedTeknikum) ?? null : null;
    /* Miqyos: muassasa tanlangan bo'lsa o'sha, aks holda ulanganlar yig'indisi. */
    const scopeRow = inst
      ? {
          students: inst.students,
          teachers: inst.teachers,
          cameras: inst.cameras,
          activeCameras: inst.activeCameras,
          attendance: inst.attendance,
          alerts: inst.alerts,
        }
      : {
          students: rows.national.students,
          teachers: rows.national.teachers,
          cameras: rows.national.cameras,
          activeCameras: rows.national.activeCameras,
          attendance: rows.national.attendance,
          alerts: rows.national.alerts,
        };

    const studentsTotal = scopeRow.students;
    const studentsPresent =
      scopeRow.students !== null && scopeRow.attendance !== null
        ? Math.round((scopeRow.students * scopeRow.attendance) / 100)
        : null;
    const teachersTotal = scopeRow.teachers;
    const teachersPresent =
      scopeRow.teachers !== null && scopeRow.attendance !== null
        ? Math.round((scopeRow.teachers * scopeRow.attendance) / 100)
        : null;

    return {
      students: {
        total: studentsTotal,
        present: studentsPresent,
        absent: diff(studentsTotal, studentsPresent),
        rate: pct(studentsPresent, studentsTotal),
      },
      teachers: {
        total: teachersTotal,
        present: teachersPresent,
        absent: diff(teachersTotal, teachersPresent),
        rate: pct(teachersPresent, teachersTotal),
      },
      cameras: { active: scopeRow.activeCameras, total: scopeRow.cameras, rate: pct(scopeRow.activeCameras, scopeRow.cameras) },
      alarms: scopeRow.alerts,
      institutes: inst ? 1 : rows.institutions.length,
      emotions: { positive: 0, neutral: 0, negative: 0, total: 0 },
      trend: [],
      live: rows.live,
      scope: inst ? { id: inst.id, name: inst.name } : null,
    };
  }, [rows, selectedTeknikum]);
}
