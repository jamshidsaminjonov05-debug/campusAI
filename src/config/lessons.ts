/**
 * Dars jadvali (qo'ng'iroq vaqtlari) — KONFIGURATSIYA.
 *
 * NEGA bu yerda: backend'da dars jadvali endpoint'i YO'Q, davomat yozuvida esa
 * faqat vaqt bor. Kayfiyat/e'tibor ko'rsatkichini "qaysi darsda" deb ko'rsatish
 * uchun vaqtni darsga bog'lash kerak — shu jadval o'sha vazifani bajaradi.
 *
 * Muassasa tartibi boshqacha bo'lsa FAQAT shu fayl tuzatiladi.
 *
 * `subject` ATAYLAB ixtiyoriy: fan nomi guruhga qarab o'zgaradi va backend uni
 * bermaydi. Berilmasa UI "1-dars" deb ko'rsatadi — o'ylab topilgan fan nomi
 * yozilmaydi.
 */

export interface LessonSlot {
  /** Dars tartib raqami. */
  n: number;
  /** Boshlanish — kun boshidan daqiqa (08:30 → 510). */
  from: number;
  /** Tugash — kun boshidan daqiqa. */
  to: number;
  /** Fan nomi — ma'lum bo'lsa. */
  subject?: string;
}

const hm = (h: number, m: number) => h * 60 + m;

/** Standart 6 darslik kun (45 daqiqa + 10 daqiqa tanaffus, tushlik 12:00–12:40). */
export const LESSON_SLOTS: LessonSlot[] = [
  { n: 1, from: hm(8, 30), to: hm(9, 15) },
  { n: 2, from: hm(9, 25), to: hm(10, 10) },
  { n: 3, from: hm(10, 20), to: hm(11, 5) },
  { n: 4, from: hm(11, 15), to: hm(12, 0) },
  { n: 5, from: hm(12, 40), to: hm(13, 25) },
  { n: 6, from: hm(13, 35), to: hm(14, 20) },
];

/** Vaqt (Date) → dars; darsdan tashqarida bo'lsa `null` (tanaffus/tushlik). */
export function lessonAt(d: Date): LessonSlot | null {
  const min = d.getHours() * 60 + d.getMinutes();
  return LESSON_SLOTS.find((l) => min >= l.from && min < l.to) ?? null;
}

/** `08:30` ko'rinishi. */
export const slotTime = (min: number) =>
  `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
