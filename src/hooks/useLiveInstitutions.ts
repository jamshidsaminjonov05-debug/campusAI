/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  MUASSASA QATORLARI — JONLI SONLAR BILAN                             ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * `lib/institutionRows.ts` bo'sh skeletni beradi (hamma ko'rsatkich
 * `null`), bu hook esa uning ustiga **o'lchangan** qiymatlarni qo'yadi:
 *
 * | Ko'rsatkich | Manba |
 * |---|---|
 * | Kameralar / faol | `useNvrChannels()` — kuzatuv posti kanallari |
 * | O'qituvchi / o'quvchi / davomat | `useAttendanceBoard()` — kuzatuv posti davomati |
 * | Signallar | `useDetections()` — XAVFLI hodisalar, kampus bo'yicha |
 * | Xodimlar | **YO'Q** (`null`) — kuzatuv posti `role` da `staff` yo'q |
 *
 * ⚠️ **kuzatuv posti TARMOQDA BITTA** (`config/nvrCameras.ts`
 * `NVR_DEFAULT_CAMPUS_ID` = `edu-mk-179`), shuning uchun kanallar va
 * davomat SHU maktabga tegishli. Qolgan olti muassasada kamera hali
 * o'rnatilmagan — ular uchun HAMMA ko'rsatkich `null` bo'lib qoladi va
 * ekranda **qizil "ma'lumot yo'q"** ko'rinadi. Bu xato emas, HAQIQAT:
 * son o'ylab topilmaydi.
 *
 * ⚠️ **Mock zaxira YO'Q.** Ilgari `regionInstitutes.ts` 645 muassasa
 * uchun deterministik son generatsiya qilardi va shu sabab har bir
 * ekranda haqiqiy va to'qilgan sonlar aralashib turardi.
 */
"use client";

import { useMemo } from "react";
import { useNvrChannels } from "@/hooks/useNvrChannels";
import { useDetections } from "@/hooks/useDetections";
import { useAttendanceBoard } from "@/hooks/useAttendanceBoard";
import { useEventStats } from "@/hooks/useEventStats";
import { useNvrAttendanceRange } from "@/hooks/useNvrAttendance";
import { localDay } from "@/hooks/useTodayArrivals";
import { resolveCampus } from "@/lib/nvr/cameraBinding";
import { isAlarm } from "@/lib/nvr/nvrApi";
import { NVR_DEFAULT_CAMPUS_ID } from "@/config/nvrCameras";
import {
  INSTITUTION_ROWS,
  buildRegionRows,
  statusOf,
  sumMetric,
  weightedAvg,
  type InstitutionRow,
  type RegionRow,
} from "@/lib/nvr/institutionRows";

export interface LiveInstitutions {
  institutions: InstitutionRow[];
  regions: RegionRow[];
  /** Respublika yig'indisi — FAQAT ulangan muassasalardan. */
  national: RegionRow;
  /** Kamida bitta ko'rsatkich jonli manbadan keldimi. */
  live: boolean;
  /** Manbalardan biri hali birinchi javobni kutyapti — UI slayder chizadi
   *  (2026-10-26, Muassasalar: "ma'lumot kelgunicha slider loading"). */
  loading: boolean;
}

/**
 * `range` berilsa (Muassasalar sahifasining DAVR tanlovi, 2026-10-26) —
 * DAVRGA BOG'LIQ ikki ko'rsatkich shu oraliqdan olinadi:
 *   · **davomat** — `useNvrAttendanceRange(from,to).rate` (ish kunlari
 *     o'rtachasi, dam olish va shanba 1–4-sinf qoidasi bilan);
 *   · **signallar** — `/events/stats` `alerts` (server hisobi, bitta so'rov).
 * Ilgari sahifada davr tanlanardi-yu, jadvallarga UZATILMASDI — sonlar doim
 * "bugungi davomat + oxirgi 100 hodisadagi signal" edi (foydalanuvchi:
 * "muassasalarda vaqt ishlamayabdi"). Kamera, o'qituvchi/o'quvchi SONI esa
 * zaxira ko'rsatkich — davrga bog'liq emas.
 * `range` berilmasa (Boshqaruv paneli va h.k.) — avvalgi xatti-harakat,
 * qo'shimcha so'rov YO'Q.
 */
export function useLiveInstitutions(range?: { from: string; to: string }): LiveInstitutions {
  const nvr = useNvrChannels();
  const today = localDay();
  const rangeStats = useEventStats({ from: range?.from, to: range?.to, enabled: Boolean(range) });
  const rangeAtt = useNvrAttendanceRange(range?.from ?? today, range?.to ?? today, Boolean(range));
  /* So'nggi sutkadagi hodisalar — "Aniqlanganlar" bilan AYNI so'rov kaliti,
     ya'ni qo'shimcha tarmoq yuki yo'q (React Query bitta keshdan beradi). */
  const det = useDetections({ category: "all", limit: 100, last24h: true });
  const board = useAttendanceBoard();

  return useMemo(() => {
    /* Kampus bo'yicha xavfli hodisalar. Hodisa oqimi umuman bo'sh bo'lsa
       xarita `null` qoladi — "0 ta signal" deb yozish YOLG'ON bo'lardi
       (bu "signal yo'q" emas, "hali o'qilmadi" degani). */
    const alertsByCampus = new Map<string, number>();
    let alertsKnown: boolean;
    if (range) {
      /* Davr rejimi: server hisobi. Kuzatuv posti tarmoqda BITTA, uning
         hamma hodisasi `NVR_DEFAULT_CAMPUS_ID`ga tegishli (`resolveCampus`). */
      alertsKnown = !rangeStats.isLoading && !rangeStats.error;
      if (alertsKnown && NVR_DEFAULT_CAMPUS_ID) alertsByCampus.set(NVR_DEFAULT_CAMPUS_ID, rangeStats.alerts);
    } else {
      for (const e of det.events) {
        if (!isAlarm(e)) continue;
        const id = resolveCampus(e.camera, e.channel)?.id;
        if (!id) continue;
        alertsByCampus.set(id, (alertsByCampus.get(id) ?? 0) + 1);
      }
      alertsKnown = det.events.length > 0;
    }

    const teacher = board.categories.find((c) => c.type === "teacher");
    const student = board.categories.find((c) => c.type === "student");
    const boardLive = board.totals.total > 0;

    const institutions: InstitutionRow[] = INSTITUTION_ROWS.map((base) => {
      /* Kuzatuv POSTI shu muassasadami — hozircha kuzatuv posti bitta. */
      const covered = base.id === NVR_DEFAULT_CAMPUS_ID;
      if (!covered) {
        /* Manba yo'q: hamma ko'rsatkich `null` (skeletdagidek) qoladi.
           Signallar esa oqimdan kelishi MUMKIN — kanal boshqa kampusga
           bog'langan bo'lsa. */
        const a = alertsByCampus.get(base.id);
        return { ...base, alerts: a ?? (alertsKnown ? 0 : null) };
      }

      const cameras = nvr.total > 0 ? nvr.total : null;
      const activeCameras = nvr.total > 0 ? nvr.online : null;
      const teachers = boardLive && teacher ? teacher.total : null;
      const students = boardLive && student ? student.total : null;
      const attendance = range
        ? rangeAtt.hasData
          ? rangeAtt.rate
          : null
        : boardLive
          ? board.totals.rate
          : null;
      const alerts = alertsByCampus.get(base.id) ?? (alertsKnown ? 0 : null);

      return {
        ...base,
        cameras,
        activeCameras,
        teachers,
        students,
        /* ⚠️ XODIM — kuzatuv posti bu toifani BILMAYDI (`role` faqat student/teacher).
           Nol emas, `null`: "xodim yo'q" bilan "manba yo'q" boshqa narsa. */
        staff: null,
        attendance,
        alerts,
        status: statusOf(alerts, attendance),
      };
    });

    const regions = buildRegionRows(institutions);

    const national: RegionRow = {
      region: "O'zbekiston",
      regionFull: "O'zbekiston (umumiy)",
      institutes: institutions.length,
      students: sumMetric(institutions.map((r) => r.students)).value,
      teachers: sumMetric(institutions.map((r) => r.teachers)).value,
      staff: sumMetric(institutions.map((r) => r.staff)).value,
      cameras: sumMetric(institutions.map((r) => r.cameras)).value,
      activeCameras: sumMetric(institutions.map((r) => r.activeCameras)).value,
      attendance: weightedAvg(institutions.map((r) => ({ value: r.attendance, weight: r.students }))),
      alerts: sumMetric(institutions.map((r) => r.alerts)).value,
      status: null,
    };

    return {
      institutions,
      regions,
      national,
      live: nvr.total > 0 || boardLive || alertsKnown,
      loading:
        nvr.isLoading ||
        board.isLoading ||
        (range ? rangeStats.isLoading || rangeAtt.isLoading : det.isLoading),
    };
  }, [
    nvr.total,
    nvr.online,
    nvr.isLoading,
    board.isLoading,
    det.isLoading,
    det.events,
    board.categories,
    board.totals,
    range,
    rangeStats.isLoading,
    rangeStats.error,
    rangeStats.alerts,
    rangeAtt.hasData,
    rangeAtt.isLoading,
    rangeAtt.rate,
  ]);
}

/** Bitta muassasa qatori — jonli sonlari bilan. */
export function useLiveInstitution(id: string | null | undefined): InstitutionRow | null {
  const { institutions } = useLiveInstitutions();
  return useMemo(() => institutions.find((r) => r.id === id) ?? null, [institutions, id]);
}
