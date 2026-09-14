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
import { resolveCampus } from "@/lib/cameraBinding";
import { isAlarm } from "@/lib/nvrApi";
import { NVR_DEFAULT_CAMPUS_ID } from "@/config/nvrCameras";
import {
  INSTITUTION_ROWS,
  buildRegionRows,
  statusOf,
  sumMetric,
  weightedAvg,
  type InstitutionRow,
  type RegionRow,
} from "@/lib/institutionRows";

export interface LiveInstitutions {
  institutions: InstitutionRow[];
  regions: RegionRow[];
  /** Respublika yig'indisi — FAQAT ulangan muassasalardan. */
  national: RegionRow;
  /** Kamida bitta ko'rsatkich jonli manbadan keldimi. */
  live: boolean;
}

export function useLiveInstitutions(): LiveInstitutions {
  const nvr = useNvrChannels();
  /* So'nggi sutkadagi hodisalar — "Aniqlanganlar" bilan AYNI so'rov kaliti,
     ya'ni qo'shimcha tarmoq yuki yo'q (React Query bitta keshdan beradi). */
  const det = useDetections({ category: "all", limit: 100, last24h: true });
  const board = useAttendanceBoard();

  return useMemo(() => {
    /* Kampus bo'yicha xavfli hodisalar. Hodisa oqimi umuman bo'sh bo'lsa
       xarita `null` qoladi — "0 ta signal" deb yozish YOLG'ON bo'lardi
       (bu "signal yo'q" emas, "hali o'qilmadi" degani). */
    const alertsByCampus = new Map<string, number>();
    for (const e of det.events) {
      if (!isAlarm(e)) continue;
      const id = resolveCampus(e.camera, e.channel)?.id;
      if (!id) continue;
      alertsByCampus.set(id, (alertsByCampus.get(id) ?? 0) + 1);
    }
    const alertsKnown = det.events.length > 0;

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
      const attendance = boardLive ? board.totals.rate : null;
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
    };
  }, [nvr.total, nvr.online, det.events, board.categories, board.totals]);
}

/** Bitta muassasa qatori — jonli sonlari bilan. */
export function useLiveInstitution(id: string | null | undefined): InstitutionRow | null {
  const { institutions } = useLiveInstitutions();
  return useMemo(() => institutions.find((r) => r.id === id) ?? null, [institutions, id]);
}
