import type { RoomKind } from "@/lib/floorPlan";

/**
 * 179-MAKTAB — EVAKUATSIYA REJASIDAN olingan qavat dasturi (2026-09-23).
 *
 * Manba: maktabning o'z, direktor tasdiqlagan rejalari —
 * "Chilonzor tumanida joylashgan 179-sonli umumta'lim maktab binosining
 *  {1,2,3,4}-qavatida yong'in yoki favqulodda vaziyatlar yuz berganda
 *  insonlar va tovar-moddiy boyliklarni evakuatsiya qilish REJASI" (2021).
 *
 * ⚠️ **Rejada xona NOMLARI yozilmagan** — chizmada faqat kontur, eshiklar,
 * zinapoya va shartli belgilar bor. Shuning uchun bu yerda faqat xona
 * TURLARI ketma-ketligi saqlanadi (yo'lak bo'ylab, chapdan o'ngga), nom esa
 * turdan (lug'atdan) olinadi. Hech qanday nom/raqam o'ylab topilmaydi.
 *
 * ⚠️ **1-qavat boshqacha:** rejada u eng katta va ARALASH (kirish dahlizi,
 * ma'muriyat xonalari, sanuzel, zinapoya, sinflar), 2–4 qavatlar esa bir xil
 * naqsh — sinflar qatori, o'rtada sanuzel va zinapoya.
 */

/** Rejada ko'rsatilgan qavatlar soni. */
export const SCHOOL_179_FLOORS = 4;

/** Reja tasdiqlangan yil va direktor — chizma sarlavhasidan. */
export const SCHOOL_179_PLAN = { year: 2021, director: "G.A.Ubaydullayeva" } as const;

/** Shu bino uchun rejadagi dastur ishlatiladimi (nom bo'yicha — fasad qoidasi bilan bir xil). */
export const SCHOOL_179_NAME = "179-maktab";

/**
 * Qavat dasturi — xona turlari yo'lak bo'ylab shu tartibda quriladi.
 * Ro'yxat tugasa oxirgi turi takrorlanadi (`buildRooms`).
 */
const FLOOR_PROGRAM: Record<number, RoomKind[]> = {
  // 1-qavat: kirish dahlizi → ma'muriyat → sinflar, o'rtada sanuzel va zina
  1: ["hall", "office", "office", "class", "class", "wc", "stairs", "class", "class", "office", "class", "hall", "class"],
  // 2–4: sinflar qatori, o'rtada sanuzel + zinapoya, bitta laboratoriya
  2: ["class", "class", "class", "lab", "class", "wc", "stairs", "class", "class", "lab", "class"],
  3: ["class", "lab", "class", "class", "class", "wc", "stairs", "class", "class", "class", "lab"],
  4: ["class", "class", "lab", "class", "class", "wc", "stairs", "class", "lab", "class", "class"],
};

/** Reja dasturi yo'q bino uchun — neytral, takrorlanuvchi naqsh. */
const GENERIC_PROGRAM: RoomKind[] = ["class", "class", "office", "wc", "stairs", "class", "lab", "class"];

export function isSchool179(name?: string): boolean {
  return (name ?? "").trim() === SCHOOL_179_NAME;
}

/**
 * Shu bino va qavat uchun xona turlari ketma-ketligi.
 * 179-maktabda — rejadan; boshqa binoda — neytral naqsh (nom o'ylab
 * topilmasin uchun sinf/kabinet kabi eng umumiy turlar).
 */
export function floorProgram(buildingName: string | undefined, floor: number): RoomKind[] {
  if (!isSchool179(buildingName)) return GENERIC_PROGRAM;
  return FLOOR_PROGRAM[floor] ?? FLOOR_PROGRAM[SCHOOL_179_FLOORS] ?? GENERIC_PROGRAM;
}
