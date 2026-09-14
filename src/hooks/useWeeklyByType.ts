/**
 * DAVOMAT DINAMIKASI — TOIFA KESIMIDA, HAQIQIY ma'lumotdan.
 *
 * ⚠️ NEGA KERAK: "Statistika → Umumiy" dagi diagramma uchta chiziq
 * chizadi (o'quvchi / o'qituvchi / xodim), lekin `dash.trend` faqat UMUMIY
 * foizni beradi. Ilgari toifalar o'sha umumiy qiymat atrofida
 * `Math.sin(...)` bilan SUN'IY ajratilardi — namoyish uchun mayli, ammo
 * **"Aniq statistika" rejimida bu yolg'on**: rejimning butun ma'nosi —
 * ko'rsatilgan raqam to'qilgan bo'lmasligi.
 *
 * 🔴 **MANBA ALMASHTIRILDI — ENDI kuzatuv posti** (2026-09-04). Ilgari bu yerda
 * backend `/persons` + `/attendance` o'qilardi; o'sha jadvalda amalda
 * yozuv yo'q edi (o'lchandi: jami 2 qator, ikkalasi 2026-07-15), ya'ni
 * diagramma HAR DOIM nolda yotardi. Endi kuzatuv postining O'Z davomati
 * (`useNvrAttendanceRange`) — kunma-kun, toifaga bo'lingan holda.
 *
 * ⚠️ **`staff` (xodim) chizig'i NOLDA qoladi** — kuzatuv posti bu toifani UMUMAN
 * bilmaydi (faqat `student`/`teacher`). Nol — halol javob, chiziq
 * o'ylab topilmaydi.
 */
import { useMemo } from "react";
import { isoDate } from "@/hooks/useStudentDay";
import { useNvrAttendanceRange } from "@/hooks/useNvrAttendance";
import type { PersonType } from "@/lib/api";

/** Diagramma o'qilishi uchun eng ko'p shuncha ustun chiziladi. */
const MAX_DAYS = 60;

export interface WeeklyByType {
  /** Kun kaliti (`YYYY-MM-DD`), hafta kuni indeksi (0 = dushanba) va foizlar. */
  days: { key: string; dayIndex: number; student: number; teacher: number; staff: number }[];
  /** Toifalar bo'yicha jami shaxslar — nol bo'lsa foiz ham nol. */
  totals: Record<PersonType, number>;
  /** Umuman qayd bormi — bo'lmasa UI "ma'lumot yo'q" deb yozadi. */
  hasData: boolean;
  isLoading: boolean;
}

/**
 * @param from `YYYY-MM-DD` — oraliq boshi (berilmasa oxirgi 7 kun)
 * @param to   `YYYY-MM-DD` — oraliq oxiri
 *
 * ⚠️ Oraliq Statistika sahifasining YAGONA davr tanlovidan keladi —
 * panel ham o'sha davrni ko'rsatadi.
 */
export function useWeeklyByType(from?: string, to?: string): WeeklyByType {
  const range = useMemo(() => {
    if (from && to) return { from, to };
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return { from: isoDate(d), to: isoDate() };
  }, [from, to]);

  const att = useNvrAttendanceRange(range.from, range.to);

  return useMemo(() => {
    /* ⚠️ Dam olish kunlari CHIQARILGAN (`workPoints`, foydalanuvchi
       so'rovi: "yakshanba kunlaridagi statistikani qo'shmaslik kerak").
       Ilgari `att.points` (xom, dam olish kuni ham bor) ishlatilardi va
       har yakshanba diagrammada "0%" bo'lib tushib qolardi — hech kim
       kelmagani uchun EMAS, kun umuman baholanmagani uchun. */
    const points = att.workPoints.slice(-MAX_DAYS);

    /* Toifadagi JAMI shaxs — oxirgi ma'lumotli kundan (ro'yxat kundan
       kunga deyarli o'zgarmaydi, nol kunlar esa yig'indini buzardi). */
    const last = [...points].reverse().find((p) => p.total > 0);
    const totals: Record<PersonType, number> = {
      student: last?.student.total ?? 0,
      teacher: last?.teacher.total ?? 0,
      staff: 0,
    };

    const pct = (present: number, total: number) => (total > 0 ? Math.round((present / total) * 100) : 0);

    const days = points.map((p) => {
      const d = new Date(`${p.date}T00:00:00`);
      return {
        key: p.date,
        // 0 = dushanba: `getDay()` yakshanbadan boshlaydi
        dayIndex: (d.getDay() + 6) % 7,
        student: pct(p.student.present, p.student.total),
        teacher: pct(p.teacher.present, p.teacher.total),
        staff: 0,
      };
    });

    return {
      days,
      totals,
      hasData: days.some((d) => d.student > 0 || d.teacher > 0),
      isLoading: att.isLoading,
    };
  }, [att.workPoints, att.isLoading]);
}
