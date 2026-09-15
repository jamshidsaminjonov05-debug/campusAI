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
import { useDashboard, useEmotionsDaily, useRecentAttendance } from "@/hooks/useApi";
import type { Metric } from "@/lib/institutionRows";
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
  recent: {
    id: string;
    name: string;
    group: string;
    time: string;
    emotion: string | null;
    role: "student" | "teacher";
  }[];
  /** Kamida bitta ko'rsatkich haqiqiy manbadan keldimi. */
  live: boolean;
  /** Tanlangan muassasa (bo'lsa). `null` = umumiy (ulangan muassasalar yig'indisi). */
  scope: { id: string; name: string } | null;
}

const pct = (part: Metric, whole: Metric): Metric =>
  part === null || whole === null || whole <= 0 ? null : Math.round((part / whole) * 100);

const diff = (a: Metric, b: Metric): Metric => (a === null || b === null ? null : a - b);

/** Backend qiymati faqat HAQIQATAN to'lgan bo'lsa ishlatiladi. */
const nz = (v: number | null | undefined): Metric => (typeof v === "number" && v > 0 ? v : null);

export function useDashboardData(): DashboardView {
  const { data: dash } = useDashboard();
  const { data: daily } = useEmotionsDaily(7);
  const { data: recent } = useRecentAttendance(8);
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

    /* Backend `/statistics/dashboard` — respublika miqyosida ustun manba,
       lekin u amalda deyarli bo'sh (o'lchandi 2026-09-02: 2 talaba,
       1 o'qituvchi, 0 kamera). Bo'sh bo'lsa kuzatuv posti yig'indisiga o'tamiz. */
    const backendStudents = inst ? null : nz(dash?.students?.total);
    const backendTeachers = inst ? null : nz(dash?.teachers?.total);

    const studentsTotal = backendStudents ?? scopeRow.students;
    const studentsPresent =
      backendStudents !== null
        ? dash?.students?.present ?? null
        : scopeRow.students !== null && scopeRow.attendance !== null
          ? Math.round((scopeRow.students * scopeRow.attendance) / 100)
          : null;

    const teachersTotal = backendTeachers ?? scopeRow.teachers;
    const teachersPresent =
      backendTeachers !== null
        ? dash?.teachers?.present ?? null
        : scopeRow.teachers !== null && scopeRow.attendance !== null
          ? Math.round((scopeRow.teachers * scopeRow.attendance) / 100)
          : null;

    const camTotal = (inst ? null : nz(dash?.total_cameras)) ?? scopeRow.cameras;
    const camActive = (inst ? null : nz(dash?.active_cameras)) ?? scopeRow.activeCameras;

    /* ⚠️ **KAYFIYAT — serverda modul YO'Q** (`ultralytics` o'rnatilmagan;
       o'lchandi: 30 kun uchun 0 ta qayd). `total: 0` bo'lsa UI halqani
       CHIZMAYDI va sababini yozadi. Soxta foiz hech qachon ko'rsatilmaydi. */
    const emo =
      dash?.emotions_today && dash.emotions_today.total > 0
        ? dash.emotions_today
        : { positive: 0, neutral: 0, negative: 0, total: 0 };

    /* ⚠️ `daily.length > 0` YETMAYDI: server 7 kunni qaytaradi-yu,
       hammasida `total: 0`. Kamida bitta kunda haqiqiy qayd bo'lsin. */
    /* ⚠️ 2026-09-15: kuzatuv posti serveri `/statistics/dashboard` ga BOSHQA shakl
       (`{events:{…}}`, `students`/`emotions_today` YO'Q), `/emotions/daily` ga
       `{days,by_day,note}` OBYEKT, `/attendance/recent` ga `{date,rows}` qaytaradi
       (o'lchandi). Ilgari `dash?.students.total` shu yerda Statistikani
       "Cannot read properties of undefined (reading 'total')" bilan yiqitardi. */
    const dailyRows = Array.isArray(daily) ? daily : [];
    const dailyHasData = dailyRows.some((d) => d.total > 0);
    const trend =
      dailyHasData
        ? dailyRows.map((d) => ({
            /* ⚠️ Yorliq bu yerda faqat ZAXIRA — chizuvchi panel uni
               `dayIndex` bo'yicha LUG'ATDAN oladi (`t.chart.weekdays`).
               `toLocaleDateString` brauzerda uz ICU ma'lumoti bo'lmasa
               "Mon"/"M09" qaytaradi (`lib/dateLabel.ts`). */
            label: d.date.slice(5),
            value: Math.round(d.positive_pct),
            // 0 = dushanba: `getDay()` yakshanbadan boshlaydi
            dayIndex: (new Date(d.date).getDay() + 6) % 7,
          }))
        : [];

    /* Oxirgi kirishlar — FAQAT backend yozuvlari. Mock to'ldiruvchi
       OLIB TASHLANDI: ro'yxatda haqiqiy bo'lmagan ismlar turardi. */
    const recentList = (Array.isArray(recent) ? recent : []).map((r, i) => ({
      id: `${r.person_id}-${i}`,
      name: r.full_name,
      group: r.group_name ?? r.person_type,
      time: new Date(r.timestamp).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }),
      emotion: r.emotion_group,
      role: (r.person_type === "teacher" ? "teacher" : "student") as "student" | "teacher",
    }));

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
      cameras: { active: camActive, total: camTotal, rate: pct(camActive, camTotal) },
      alarms: (inst ? null : nz(dash?.unresolved_alarms)) ?? scopeRow.alerts,
      institutes: inst ? 1 : rows.institutions.length,
      emotions: emo,
      trend,
      recent: recentList,
      live: rows.live || recentList.length > 0 || !!dash,
      scope: inst ? { id: inst.id, name: inst.name } : null,
    };
  }, [dash, daily, recent, rows, selectedTeknikum]);
}
