/**
 * DAVOMAT QOIDALARI — maktabning o'z tartibi, server BILMAYDI.
 *
 * 🔴 **1–4-SINFLAR SHANBA KUNI O'QIMAYDI** (2026-10-24, foydalanuvchi:
 * "1-4 sinfgacha shanba kuni kelishmaydi, ularni yashirish va umumiyga ham
 * hisobga olmaslik kerak"). Kuzatuv posti buni bilmaydi — shanba kuni 1–4-sinf
 * o'quvchilarining hammasini "kelmadi" deb beradi (o'lchandi 2026-10-24,
 * `/attendance/classes`: `1-A` 38/38 absent, `1-B` 34/34 absent), natijada
 * maktab davomati sun'iy pasayib (30%), "Kelmadi 449" kabi yolg'on son
 * chiqardi.
 *
 * Qoida BITTA joyda — shu faylda; `useNvrAttendance`/`useNvrAttendanceRange`
 * uni o'zi qo'llaydi, ya'ni davomat taxtasi, KPI, halqa, jadval, ro'yxat —
 * HAMMASI bir xil sonni ko'rsatadi. Sinf raqami `note` maydonidan
 * (`"1-A"`, `"10-V"`); raqamsiz guruh (`Uqituvchilar`) qoidaga tushmaydi.
 */
import type { NvrAttendanceRow, NvrAttendanceSummary } from "@/lib/nvr/nvrApi";

/** Shanba kuni o'qimaydigan ENG KATTA sinf raqami (1…4). */
export const PRIMARY_MAX_GRADE = 4;

/** `"3-B"` → 3; raqamsiz → `null`. */
export function classGrade(note: string | null | undefined): number | null {
  const m = (note ?? "").match(/^(\d{1,2})\b/);
  return m ? Number(m[1]) : null;
}

/** `YYYY-MM-DD` shanbami (mahalliy sana, vaqt zonasi siljishisiz). */
export function isSaturday(date: string): boolean {
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return false;
  return new Date(y, m - 1, d).getDay() === 6;
}

/** Shu kun shu sinf dars qilmaydimi (1–4-sinf + shanba). */
export function isPrimaryOffDay(date: string, note: string | null | undefined): boolean {
  if (!isSaturday(date)) return false;
  const g = classGrade(note);
  return g != null && g >= 1 && g <= PRIMARY_MAX_GRADE;
}

/** Davomat qatori shu kun HISOBGA OLINMAYDIMI (faqat o'quvchilar). */
export function excludedFromAttendance(row: NvrAttendanceRow, date: string): boolean {
  return row.role === "student" && isPrimaryOffDay(date, row.note);
}

/** `a − b` (har maydon, manfiy bo'lmaydi). */
export function subtractSummary(a: NvrAttendanceSummary, b: NvrAttendanceSummary): NvrAttendanceSummary {
  const z = (v: number) => Math.max(0, v);
  return {
    early: z(a.early - b.early),
    late: z(a.late - b.late),
    absent: z(a.absent - b.absent),
    waiting: z(a.waiting - b.waiting),
    total: z(a.total - b.total),
    present: z(a.present - b.present),
  };
}

export function addSummary(a: NvrAttendanceSummary, b: NvrAttendanceSummary): NvrAttendanceSummary {
  return {
    early: a.early + b.early,
    late: a.late + b.late,
    absent: a.absent + b.absent,
    waiting: a.waiting + b.waiting,
    total: a.total + b.total,
    present: a.present + b.present,
  };
}
