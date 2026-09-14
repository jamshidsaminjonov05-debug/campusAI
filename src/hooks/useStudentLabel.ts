/**
 * **"O'quvchi" yoki "Talaba"** — tanlangan muassasa TURIGA qarab.
 *
 * O'zbek tilida maktabda **o'quvchi**, kollej/oliy ta'limda **talaba**
 * deyiladi — bu uslub emas, MA'NO farqi. Ilgari butun panel bo'ylab
 * qat'iy "Talabalar" yozilardi va 179-MAKTAB uchun ham shunday chiqardi.
 *
 * ── Ishlatish ─────────────────────────────────────────────────────────
 * ```tsx
 * const student = useStudentLabel();
 * <KpiTile label={student.plural} …/>      // "O'quvchilar"
 * <th>{student.one}</th>                    // "O'quvchi"
 * ```
 *
 * ⚠️ **Yangi joyda "Talaba" so'zini QO'LDA yozmang** — shu hookdan
 * oling. Aks holda bitta ekranda ikki xil so'z paydo bo'ladi.
 *
 * ⚠️ Muassasa TANLANMAGAN bo'lsa (umumiy ko'rinish) — kuzatuvdagi
 * standart obyekt turiga qaraladi (`DEFAULT_INSTITUTION_ID`), ya'ni
 * hozircha maktab. Backend muassasa turini bera boshlasa
 * (`BACKEND.md` 3-band) `institutionKind()` o'sha qiymatni oladi va bu
 * hook O'ZGARMAYDI.
 */
"use client";

import { useT } from "@/i18n";
import { useAppStore } from "@/store/useAppStore";
import { institutionById, institutionKind, studentLabelKey } from "@/config/institutions";

export interface StudentLabel {
  /** Ko'plik — "O'quvchilar" / "Talabalar". */
  plural: string;
  /** Birlik — "O'quvchi" / "Talaba" (jadval ustuni, bitta qator). */
  one: string;
}

export function useStudentLabel(): StudentLabel {
  const t = useT();
  const selected = useAppStore((s) => s.selectedTeknikum);
  const key = studentLabelKey(institutionKind(institutionById(selected)));
  return {
    plural: t.board.type[key],
    one: t.board.type[key === "studentSchool" ? "studentSchoolOne" : "studentHigherOne"],
  };
}
