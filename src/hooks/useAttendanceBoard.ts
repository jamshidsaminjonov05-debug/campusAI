/**
 * Bugungi davomat — UCH TOIFA bo'yicha (talaba · pedagog · ishchi xodim).
 *
 * Vazirlik darajasidagi savol: "bugun kim keldi, kim kelmadi va nega".
 * Shuning uchun bu yerda uchala toifa bitta shaklga keltiriladi:
 *   · kelgan / kelmagan / kechikkan / hozir ichkarida — HAQIQIY qaydlardan
 *     (`useStudentDay` + `buildStudentStats`),
 *   · sababli / sababsiz / aniqlanmagan — operator kiritgan reyestrdan
 *     (`lib/absenceReasons.ts`). Sabab O'YLAB TOPILMAYDI: backend uni
 *     bermaydi, belgilanmagani "aniqlanmagan" bo'lib turadi.
 *
 * Uchta `useStudentDay` chaqiriladi — hooklar soni QAT'IY (shart ichida emas).
 * `/attendance` so'rovi uchalasida bir xil kalitga tushadi, shuning uchun
 * React Query uni bir marta so'raydi; farq faqat `/persons?person_type=…` da.
 */
import { useMemo, useSyncExternalStore } from "react";
import { isoDate } from "@/hooks/useStudentDay";
import { useNvrAttendance } from "@/hooks/useNvrAttendance";
import type { PersonType } from "@/lib/api";
import type { PersonBrief } from "@/lib/studentStats";
import { absenceSnapshot, subscribeAbsence, summarizeAbsence, type AbsenceSummary } from "@/lib/absenceReasons";

export const BOARD_TYPES: PersonType[] = ["teacher", "staff", "student"];

export interface CategoryAttendance {
  type: PersonType;
  /** Ro'yxatdagi (aktiv) shaxslar. */
  total: number;
  /** Bugun kamida bir marta qayd etilgan. */
  present: number;
  absent: number;
  late: number;
  /** Oxirgi qaydi `exit` emas — hozir ichkarida. */
  inside: number;
  /** Davomat foizi. */
  rate: number;
  /** Kelmaganlar ro'yxati — sabab belgilash oynasi shundan chiqadi. */
  absentees: PersonBrief[];
  absence: AbsenceSummary;
  /** Ma'lumot real backend'danmi. */
  live: boolean;
  /**
   * Bu toifani MANBA umuman qo'llab-quvvatlaydimi.
   *
   * ⚠️ **`staff` uchun `false`** — kuzatuv posti `role` da faqat `student`/`teacher`
   * bor, kuzatuv posti "xodim" tushunchasini BILMAYDI. Nol bu yerda
   * "hech kim kelmadi" degani EMAS, "manba yo'q" degani — shuning uchun
   * UI uni **qizil "ma'lumot yo'q"** bilan ko'rsatadi, `0` bilan emas
   * (`components/common/Missing.tsx`). Backend/kuzatuv posti xodim toifasini
   * qaytara boshlasa shu bayroq `true` bo'ladi va UI O'ZGARMAYDI.
   */
  supported: boolean;
}

export interface AttendanceBoard {
  date: string;
  categories: CategoryAttendance[];
  /** Uch toifa yig'indisi. */
  totals: Omit<CategoryAttendance, "type" | "absentees" | "live" | "supported">;
  /** Kamida bitta toifa real ma'lumotdanmi. */
  live: boolean;
  /** Davomat qaydi umuman bormi. */
  hasData: boolean;
  /**
   * SERVER belgilagan dam olish kunimi (`/attendance` → `is_weekend`,
   * manbasi `/attendance/settings` dagi `weekend`).
   *
   * ⚠️ Shu kuni davomat UMUMAN baholanmaydi — hamma `waiting` bo'lib
   * turadi, ya'ni `present/absent/rate` nolga tushadi. Ularni oddiy kun
   * kabi ko'rsatish "butun maktab kelmadi" degan YOLG'ON manzara
   * berardi, shuning uchun UI bu bayroq bilan sonlarni umuman
   * chizmaydi (2026-09-13, foydalanuvchi so'rovi).
   */
  isWeekend: boolean;
}

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

/**
 * 🔴 **MANBA ALMASHTIRILDI — ENDI kuzatuv posti** (2026-09-04).
 *
 * Ilgari uchala toifa ham backend `/persons` + `/attendance` dan
 * (`useStudentDay`) o'qirdi. O'sha jadvalda amalda YOZUV YO'Q edi
 * (o'lchandi: jami 2 ta davomat qatori, ikkalasi 2026-07-15), shuning
 * uchun taxta ham, uning ustiga qurilgan HAMMA Statistika diagrammasi
 * ham nol yoki namoyish soniga tushib ketardi.
 *
 * Endi kuzatuv postining O'Z davomati (`/nvr/attendance`) — kamera
 * odamni TANIGAN vaqtga qarab, holatni SERVER hisoblaydi. O'lchandi
 * 2026-09-04: **397** odam (361 o'quvchi + 36 o'qituvchi), 146 erta,
 * 60 kech, 191 kelmagan.
 *
 * ⚠️ **`staff` (xodim) NOL bo'lib qoladi** — kuzatuv posti bu toifani UMUMAN
 * bilmaydi (`role` faqat `student`/`teacher`). Nol — halol javob;
 * xodimlar soni o'ylab topilmaydi.
 *
 * ⚠️ Chiqish SHAKLI o'zgarmadi (`AttendanceBoard`) — shu sababli
 * `AttendanceBoard.tsx`, `StatOverview` KPI'lari va qolgan chaqiruvchilar
 * TEGILMASDAN yangi manbaga o'tdi.
 */
export function useAttendanceBoard(date = isoDate()): AttendanceBoard {
  const att = useNvrAttendance(date);

  /* Sabab reyestri React'dan tashqarida (localStorage) — oynada belgilangan
     sabab taxtada DARHOL ko'rinishi uchun unga obuna bo'lamiz. */
  const registry = useSyncExternalStore(subscribeAbsence, absenceSnapshot, absenceSnapshot);

  return useMemo(() => {
    const categories: CategoryAttendance[] = BOARD_TYPES.map((type) => {
      /* kuzatuv posti toifalari: `student` / `teacher`. `staff` bo'sh (yuqoriga qarang). */
      const rows = type === "staff" ? [] : att.rows.filter((r) => r.role === type);
      const s = type === "staff" ? null : type === "teacher" ? att.byRole.teacher : att.byRole.student;
      const absentees: PersonBrief[] = rows
        .filter((r) => r.status === "absent")
        .map((r) => ({
          id: String(r.person_id),
          name: r.full_name,
          group: r.note ?? r.role_label,
        }));
      return {
        type,
        total: s?.total ?? 0,
        present: s?.present ?? 0,
        absent: s?.absent ?? 0,
        late: s?.late ?? 0,
        /* ⚠️ "hozir ichkarida" — kuzatuv posti davomati bu ma'lumotni BERMAYDI
           (u kirish/chiqish emas, KUNLIK holat), shuning uchun `0`.
           Chiqish vaqti kerak bo'lsa hodisa oqimidan olinadi. */
        inside: 0,
        rate: pct(s?.present ?? 0, s?.total ?? 0),
        absentees,
        absence: summarizeAbsence(
          date,
          absentees.map((p) => p.id)
        ),
        live: (s?.total ?? 0) > 0,
        /* `staff` — kuzatuv posti bilmaydigan toifa (yuqoridagi izoh). */
        supported: type !== "staff",
      };
    });

    const sum = (pick: (c: CategoryAttendance) => number) => categories.reduce((s, c) => s + pick(c), 0);
    const total = sum((c) => c.total);
    const present = sum((c) => c.present);

    return {
      date,
      categories,
      totals: {
        total,
        present,
        absent: sum((c) => c.absent),
        late: sum((c) => c.late),
        inside: sum((c) => c.inside),
        rate: pct(present, total),
        absence: {
          total: sum((c) => c.absence.total),
          excused: sum((c) => c.absence.excused),
          unexcused: sum((c) => c.absence.unexcused),
          unknown: sum((c) => c.absence.unknown),
          byCode: {
            sick: sum((c) => c.absence.byCode.sick),
            family: sum((c) => c.absence.byCode.family),
            trip: sum((c) => c.absence.byCode.trip),
            study: sum((c) => c.absence.byCode.study),
            other: sum((c) => c.absence.byCode.other),
            unexcused: sum((c) => c.absence.byCode.unexcused),
          },
        },
      },
      live: categories.some((c) => c.live),
      hasData: categories.some((c) => c.present > 0),
      isWeekend: att.isWeekend,
    };
    // `registry` — sabab reyestri o'zgarganda qayta hisoblanadi
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [att.rows, att.byRole, att.isWeekend, date, registry]);
}
