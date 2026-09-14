/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  DAVOMAT — KUZATUV POSTIDAN (`/nvr/attendance`)                      ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * NEGA kuzatuv posti, backend EMAS: backend `/api/v1/attendance` (7005) da amalda
 * yozuv yo'q (o'lchandi: jami 2 ta, ikkalasi 2026-07-15), kuzatuv posti esa kamera
 * odamni TANIGAN vaqtdan har kuni to'liq ro'yxat quradi — o'lchandi
 * 2026-09-04: **397** odam (361 o'quvchi + 36 o'qituvchi), 146 erta,
 * 60 kech, 191 kelmagan.
 *
 * Holatni SERVER hisoblaydi (`arrival_deadline` / `absent_after`),
 * klientda qayta hisoblanmaydi — bir xil son ikki joyda boshqacha
 * chiqmaydi.
 */
import { useEffect, useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  getAttendance,
  getAttendancePeriod,
  getNvrStatus,
  type NvrAttendanceDay,
  type NvrAttendanceRow,
  type NvrAttendanceStatus,
  type NvrAttendanceSummary,
  type NvrPersonRole,
} from "@/lib/nvrApi";
import { nowAdjusted, setServerClockFromIso } from "@/lib/serverClock";

/** `YYYY-MM-DD` — SERVER zonasidan (`lib/serverClock.ts`), brauzer emas. */
export function attDay(d = nowAdjusted()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Ilova ochilganda BIR MARTA server soatini so'raydi va brauzer bilan
 * farqni saqlaydi (`GUIDE.md`, "Vaqt zonasi bitta joydan — kodingizga
 * tegadi"). `App.tsx`da bir marta chaqiriladi. Server bu manzilni hali
 * bermasa (eski versiya) yoki so'rov muvaffaqiyatsiz bo'lsa — jim
 * o'tkazib yuboriladi, "bugun" avvalgidek brauzer soatidan hisoblanadi.
 */
export function useSyncServerClock() {
  const q = useQuery({
    queryKey: ["nvr-status"],
    queryFn: getNvrStatus,
    staleTime: 6 * 60 * 60 * 1000,
    retry: false,
  });
  useEffect(() => {
    if (q.data?.timezone?.now) setServerClockFromIso(q.data.timezone.now);
  }, [q.data]);
}

/** Oraliqdagi kunlar ro'yxati (ikkala chekka ham kiradi). */
export function daysBetween(from: string, to: string, max = 62): string[] {
  const out: string[] = [];
  const a = new Date(`${from}T00:00:00`);
  const b = new Date(`${to}T00:00:00`);
  for (let d = new Date(a); d <= b && out.length < max; d.setDate(d.getDate() + 1)) {
    out.push(attDay(d));
  }
  return out;
}

const EMPTY: NvrAttendanceSummary = { early: 0, late: 0, absent: 0, waiting: 0, total: 0, present: 0 };

/** Toifa kesimi — `role` filtri `summary` ni O'ZGARTIRMAGANI uchun
 *  (server GLOBAL son qaytaradi) qatorlardan sanaladi. */
export function summarizeRows(rows: NvrAttendanceRow[]): NvrAttendanceSummary {
  const s: NvrAttendanceSummary = { ...EMPTY };
  for (const r of rows) {
    s.total++;
    if (r.status === "early") s.early++;
    else if (r.status === "late") s.late++;
    else if (r.status === "absent") s.absent++;
    else s.waiting++;
  }
  s.present = s.early + s.late;
  return s;
}

export interface NvrAttendanceByRole {
  student: NvrAttendanceSummary;
  teacher: NvrAttendanceSummary;
  /** ⚠️ kuzatuv posti "xodim" toifasini BILMAYDI — doim nol, o'ylab topilmaydi. */
  staff: NvrAttendanceSummary;
}

/** BIR KUN — to'liq ro'yxat + toifa kesimi (jadval va KPI uchun). */
export function useNvrAttendance(
  date: string = attDay(),
  opts: { role?: NvrPersonRole; status?: NvrAttendanceStatus; search?: string } = {}
) {
  const q = useQuery({
    queryKey: ["nvr-attendance", date, opts.role ?? "", opts.status ?? "", opts.search ?? ""],
    queryFn: () => getAttendance(date, opts),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });

  const data = q.data;
  const byRole = useMemo<NvrAttendanceByRole>(() => {
    const rows = data?.rows ?? [];
    return {
      student: summarizeRows(rows.filter((r) => r.role === "student")),
      teacher: summarizeRows(rows.filter((r) => r.role === "teacher")),
      staff: { ...EMPTY },
    };
  }, [data]);

  return {
    day: data ?? null,
    rows: data?.rows ?? [],
    summary: data?.summary ?? EMPTY,
    settings: data?.settings ?? null,
    isWeekend: data?.is_weekend ?? false,
    deadlinePassed: data?.deadline_passed ?? false,
    byRole,
    isLoading: q.isLoading,
    error: q.error,
    refetch: q.refetch,
  };
}

export interface AttendanceDayPoint extends NvrAttendanceSummary {
  date: string;
  teacher: NvrAttendanceSummary;
  student: NvrAttendanceSummary;
  /** Server bergan `is_weekend` (`NvrPeriodDay`) — dam olish kuni statistikaga QO'SHILMAYDI (pastga qarang). */
  isWeekend: boolean;
}

/**
 * DAVR — kunma-kun jamlanma (grafiklar uchun). **BITTA so'rov.**
 *
 * ⚠️ Ilgari bu yerda har kunga IKKITA so'rov ketardi
 * (`/attendance/classes` + `/attendance?role=teacher`) — 30 kunlik
 * davr uchun **60 ta HTTP so'rov**, ~495 KB. Sabab: bunday endpoint
 * yo'q deb hisoblangan edi va u `BACKEND-SOROVLAR.md` 1-bandi bo'lib
 * so'ralgandi. **2026-09-05 da kuzatuv posti hujjati to'liq ko'rib chiqilganda
 * `GET /attendance/period` ALLAQACHON mavjudligi topildi.**
 *
 * O'lchandi (2026-09-05, `<nvr-server-ip>:7007`): 7 kunlik davr →
 * **1 so'rov, 7.9 KB**. Javobda `by_day[]` bor va har kunda
 * `total`/`students`/`teachers` kesimi tayyor — o'quvchi kesimini
 * ayirma bilan hisoblash ham kerak emas.
 */
export function useNvrAttendanceRange(from: string, to: string) {
  /**
   * 🔵 **BITTA SO'ROV** (`GET /attendance/period`) — 2026-09-05 da
   * ulandi.
   *
   * ⚠️ Ilgari bu hook har kun uchun IKKITA so'rov yuborardi
   * (`/attendance/classes` + `/attendance?role=teacher`), ya'ni 30
   * kunlik grafik uchun **60 ta HTTP so'rov** (~495 KB). O'sha paytda
   * bunday endpoint yo'q deb hisoblangan va u `BACKEND-SOROVLAR.md`
   * 1-bandi bo'lib so'ralgan edi — amalda esa kuzatuv posti hujjatida
   * ALLAQACHON bor ekan. O'lchandi: 7 kunlik davr → **1 so'rov,
   * 7.9 KB**.
   *
   * ⚠️ O'quvchi kesimi endi AYIRMA bilan hisoblanMAYDI — server
   * `by_day[].students` ni o'zi beradi.
   */
  const days = useMemo(() => daysBetween(from, to), [from, to]);

  const q = useQuery({
    queryKey: ["nvr-att-period", from, to],
    queryFn: () => getAttendancePeriod(from, to),
    staleTime: 5 * 60_000,
    retry: false,
  });

  const isLoading = q.isLoading;

  const points = useMemo<AttendanceDayPoint[]>(() => {
    const byDate = new Map((q.data?.by_day ?? []).map((d) => [d.date, d]));
    return days.map((date) => {
      const d = byDate.get(date);
      return {
        date,
        ...(d?.total ?? EMPTY),
        teacher: d?.teachers ?? { ...EMPTY },
        student: d?.students ?? { ...EMPTY },
        isWeekend: d?.is_weekend ?? false,
      };
    });
  }, [days, q.data]);

  /**
   * ⚠️ **DAM OLISH KUNLARI STATISTIKAGA QO'SHILMAYDI** (2026-09-09,
   * foydalanuvchi so'rovi: "yakshanba kunlaridagi statistikani
   * qo'shmasliging kerak, u kuni hechkim kelmaydi ... hamma joyda
   * shunday qil"). Shu kun hamma "waiting" holatida turadi (davomat
   * SERVER tomonda umuman baholanmaydi), ya'ni uni oddiy kun bilan
   * birga qo'shsak/o'rtachalasak "0% davomat" bo'lib chiqib, haqiqiy
   * tendensiyani buzardi. `NvrPeriodDay.is_weekend` — `/attendance/
   * settings`dagi `weekend` sozlamasidan (`useNvrAttendance.ts` boshida
   * izohlangan), ya'ni bu OPERATOR belgilagan qoida, taxmin emas.
   */
  const workPoints = useMemo(() => points.filter((p) => !p.isWeekend), [points]);

  /** Butun davr yig'indisi (KPI uchun) — DAM OLISH KUNLARISIZ. */
  const totals = useMemo(() => {
    const acc: NvrAttendanceSummary = { ...EMPTY };
    const tAcc: NvrAttendanceSummary = { ...EMPTY };
    const sAcc: NvrAttendanceSummary = { ...EMPTY };
    const add = (dst: NvrAttendanceSummary, src: NvrAttendanceSummary) => {
      dst.early += src.early;
      dst.late += src.late;
      dst.absent += src.absent;
      dst.waiting += src.waiting;
      dst.total += src.total;
      dst.present += src.present;
    };
    for (const p of workPoints) {
      add(acc, p);
      add(tAcc, p.teacher);
      add(sAcc, p.student);
    }
    return { all: acc, teacher: tAcc, student: sAcc, staff: { ...EMPTY } };
  }, [workPoints]);

  /** Davr o'rtacha davomat foizi — kunlik foizlarning o'rtachasi
   *  (jami/jami emas: kunlar soni bo'yicha taqqoslash to'g'ri bo'lsin),
   *  DAM OLISH KUNLARISIZ. */
  const rate = useMemo(() => {
    const withData = workPoints.filter((p) => p.total > 0);
    if (withData.length === 0) return 0;
    const sum = withData.reduce((s, p) => s + (p.present / p.total) * 100, 0);
    return Math.round(sum / withData.length);
  }, [workPoints]);

  return {
    days,
    points,
    /** Dam olish kuni CHIQARILGAN ro'yxat — grafik/statistikada shundan foydalaning. */
    workPoints,
    totals,
    rate,
    isLoading,
    hasData: workPoints.some((p) => p.total > 0),
  };
}

/** Bir shaxsning DAVR bo'yicha jamlanmasi. */
export interface PersonPeriodRow {
  person_id: number;
  full_name: string;
  role: NvrPersonRole;
  role_label: string;
  /** Sinf/guruh (`note`). */
  klass: string;
  /** Nechta kun hisobga olingan. */
  days: number;
  early: number;
  late: number;
  absent: number;
  /** `early + late`. */
  present: number;
  /** Davomat foizi (`present / days`). */
  rate: number;
  /** O'rtacha kelish vaqti (`HH:MM`) — kelmagan kunlar sanalmaydi. */
  avgTime: string | null;
  /** Eng oxirgi kelgan kunidagi vaqti. */
  lastTime: string | null;
  /** Oxirgi kundagi holati — jadvaldagi nishoncha shundan. */
  lastStatus: NvrAttendanceStatus | null;
  /** Oxirgi kadr (`event_id`) — dossiye shundan ochiladi. */
  lastEventId: number | null;
  /** Kun → holat (kun kesimi paneli uchun). */
  byDay: { date: string; status: NvrAttendanceStatus; time: string }[];
}

/** `HH:MM` → daqiqa; bo'sh bo'lsa `null`. */
function toMin(hhmm: string): number | null {
  if (!hhmm || !hhmm.includes(":")) return null;
  const [h, m] = hhmm.split(":").map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
}

const pad2 = (v: number) => String(v).padStart(2, "0");

/**
 * DAVR + TOIFA bo'yicha TO'LIQ QATORLAR — soatlik taqsimot va "har bir
 * shaxs" jadvali uchun.
 *
 * ⚠️ **NEGA ALOHIDA HOOK:** `useNvrAttendanceRange` faqat SONLARNI
 * (jamlanmani) yig'adi va shu sababli yengil. Bu yerda esa har bir
 * odamning O'Z qatori kerak (ism, sinf, kelish vaqti) — ya'ni har kun
 * uchun to'liq javob so'raladi.
 *
 * ⚠️ **OG'IRLIK — TOIFAGA BOG'LIQ.** O'lchandi 2026-09-04: bir kunlik
 * javob `role=teacher` da **15 KB**, `role=student` da **146 KB**.
 * Shuning uchun kunlar soni `MAX_ROW_DAYS` bilan cheklangan: oy tanlansa
 * ham oxirgi shuncha kun o'qiladi va UI buni OCHIQ yozadi (jim
 * qirqilmaydi).
 */
const MAX_ROW_DAYS = 14;

export function useNvrAttendanceRows(from: string, to: string, role?: NvrPersonRole, enabled = true) {
  const allDays = useMemo(() => daysBetween(from, to), [from, to]);
  /** Chegaradan oshsa OXIRGI kunlar olinadi — eng yangi ma'lumot muhimroq. */
  const days = useMemo(() => allDays.slice(-MAX_ROW_DAYS), [allDays]);
  const trimmed = allDays.length - days.length;

  const queries = useQueries({
    queries: days.map((d) => ({
      queryKey: ["nvr-attendance", d, role ?? "", "", ""],
      queryFn: () => getAttendance(d, role ? { role } : {}),
      staleTime: 5 * 60_000,
      retry: false,
      /* ⚠️ `enabled` — bitta shaxsning davomat foizi kerak bo'lganda
         (`FaceHistoryModal` "Davomat foizi"), `role` hali aniqlanmagan
         paytda (asosiy so'rov hali kelmagan) bekorga 7-14 ta og'ir
         so'rov ketmasin (`role=student` da har biri ~146 KB). */
      enabled,
    })),
  });

  const isLoading = queries.some((q) => q.isLoading);

  /** Kun → qatorlar. */
  const byDay = useMemo(() => {
    const m = new Map<string, NvrAttendanceRow[]>();
    days.forEach((d, i) => m.set(d, (queries[i]?.data as NvrAttendanceDay | undefined)?.rows ?? []));
    return m;
  }, [days, queries]);

  /**
   * KELISH SOATLARI — har soatda nechta odam kelgani.
   *
   * ⚠️ **FAQAT KIRISH.** Chiqish vaqti hech qayerdan kelmaydi: o'lchandi
   * 2026-09-04 — bugungi 2 825 hodisaning deyarli hammasi BITTA kanaldan
   * (`31 Camera 01` — 499/500, 32-kanalda atigi 1 ta), ya'ni kirish va
   * chiqishni ajratadigan kamera YO'Q. Bir odam kun davomida o'sha
   * kameradan bir necha marta o'tadi, shuning uchun "oxirgi ko'rinish =
   * chiqish" deb hisoblash YOLG'ON son berardi. Panel shu sababli
   * "Kelish soatlari" deb ataladi va faqat BIRINCHI ko'rinishni sanaydi
   * (`row.time` — serverning o'zi shuni beradi).
   */
  const byHour = useMemo(() => {
    const buckets = Array.from({ length: 24 }, (_, hour) => ({ hour, early: 0, late: 0, total: 0 }));
    for (const rows of byDay.values()) {
      for (const r of rows) {
        const min = toMin(r.time);
        if (min == null) continue; // kelmagan — soati yo'q
        const b = buckets[Math.floor(min / 60)];
        if (!b) continue;
        b.total++;
        if (r.status === "early") b.early++;
        else if (r.status === "late") b.late++;
      }
    }
    return buckets;
  }, [byDay]);

  /** Har bir shaxs — davr bo'yicha jamlanma. */
  const people = useMemo<PersonPeriodRow[]>(() => {
    const m = new Map<number, PersonPeriodRow>();
    for (const date of days) {
      for (const r of byDay.get(date) ?? []) {
        let p = m.get(r.person_id);
        if (!p) {
          p = {
            person_id: r.person_id,
            full_name: r.full_name,
            role: r.role,
            role_label: r.role_label,
            klass: r.note ?? "",
            days: 0,
            early: 0,
            late: 0,
            absent: 0,
            present: 0,
            rate: 0,
            avgTime: null,
            lastTime: null,
            lastStatus: null,
            lastEventId: null,
            byDay: [],
          };
          m.set(r.person_id, p);
        }
        p.days++;
        if (r.status === "early") p.early++;
        else if (r.status === "late") p.late++;
        else if (r.status === "absent") p.absent++;
        p.byDay.push({ date, status: r.status, time: r.time });
        /* Kunlar tartibi o'sish bo'yicha — oxirgisi eng yangi. */
        p.lastStatus = r.status;
        if (r.time) {
          p.lastTime = r.time;
          p.lastEventId = r.event_id;
        }
      }
    }
    for (const p of m.values()) {
      p.present = p.early + p.late;
      p.rate = p.days > 0 ? Math.round((p.present / p.days) * 100) : 0;
      const mins = p.byDay.map((d) => toMin(d.time)).filter((v): v is number => v != null);
      if (mins.length > 0) {
        const avg = Math.round(mins.reduce((s, v) => s + v, 0) / mins.length);
        p.avgTime = `${pad2(Math.floor(avg / 60))}:${pad2(avg % 60)}`;
      }
    }
    return Array.from(m.values());
  }, [days, byDay]);

  return {
    days,
    byDay,
    byHour,
    people,
    isLoading,
    /** Davr chegaradan uzun bo'lsa — nechta kun O'QILMAGANI (UI yozadi). */
    trimmedDays: trimmed,
    maxDays: MAX_ROW_DAYS,
  };
}

/**
 * BITTA SHAXSNING so'nggi 7 kunlik davomat foizi (`FaceHistoryModal`
 * "Davomat foizi" kartochkasi, 2026-09-10, foydalanuvchi so'rovi).
 *
 * ⚠️ **NEGA HAFTA, KO'PROQ EMAS.** Yagona mavjud yo'l —
 * `useNvrAttendanceRows()` (kun × rol bo'yicha to'liq ro'yxat, keyin
 * ISM bo'yicha filtrlanadi): to'g'ridan-to'g'ri "bitta shaxs" so'rovi
 * kuzatuv posti API'da YO'Q. Bir kunlik `role=student` javobi ~146 KB — 7 kun
 * ilova standarti (`StatPeopleNvr.tsx` davr tanlovi standart "Hafta"),
 * 14 kun (`MAX_ROW_DAYS`) esa allaqachon loyihaning o'z chegarasi.
 *
 * ⚠️ **`role` ANIQLANGUNCHA O'CHIRILGAN** (`enabled`): `FaceHistoryModal`
 * ochilishning O'ZIDA `personId`/`faceId`dan shaxsning rolini bilmaydi —
 * asosiy so'rov (`getFace`/`getPersonHistory`) javob bergach
 * `data.person.role` orqali aniqlanadi. Shu payt kelmaguncha 7 ta og'ir
 * so'rov BEKORGA ketmasin.
 */
export function usePersonAttendanceRate(personId: number | null, role: NvrPersonRole | null) {
  const to = attDay();
  const from = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return attDay(d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const enabled = personId != null && role != null;
  const rows = useNvrAttendanceRows(from, to, role ?? undefined, enabled);
  const person = useMemo(
    () => (personId != null ? rows.people.find((p) => p.person_id === personId) ?? null : null),
    [rows.people, personId]
  );
  return {
    /** `null` — hali yuklanmoqda yoki shaxs bu 7 kunlik ro'yxatda yo'q. */
    rate: person?.rate ?? null,
    days: person?.days ?? 0,
    isLoading: enabled && rows.isLoading,
  };
}
