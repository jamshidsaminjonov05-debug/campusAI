/**
 * Sana yorliqlari — **LUG'ATDAN**, `toLocaleDateString` dan EMAS.
 *
 * 🔴 **NEGA.** Brauzerda o'zbek tili ma'lumoti (ICU) bo'lmasa
 * `toLocaleDateString("uz-UZ", { month: "short" })` **root** lokalga
 * tushadi va oy nomi o'rniga **`M09`** qaytaradi — ekranda
 * "M09 2" bo'lib chiqadi (foydalanuvchi xabar qildi, 2026-09-05).
 * Node'da to'liq ICU bor, shuning uchun dasturchi mashinasida bu
 * KO'RINMAYDI — xato faqat foydalanuvchi brauzerida chiqadi.
 *
 * Xuddi shu tuzoq hafta kunlarida ham bor edi ("Mon" chiqardi) va u
 * `t.chart.weekdays` bilan hal qilingan. Oylar uchun ham AYNI yo'l:
 * `t.chart.monthsShort`.
 *
 * ⚠️ Yangi joyda sana yorlig'i kerak bo'lsa SHU funksiyalarni
 * ishlating — `toLocaleDateString` ni oy/hafta nomi uchun qayta
 * kiritmang. Raqamli format (`toLocaleString` bilan son) esa
 * xavfsiz: u lokaldan qat'i nazar to'g'ri ishlaydi.
 */
import type { Messages } from "@/i18n";

/** `2026-09-02` → "2-sen" (o'zbekcha), "2 сен" (ruscha), "Sep 2" (inglizcha). */
export function dayMonthLabel(d: Date, t: Messages): string {
  const day = d.getDate();
  const month = t.chart.monthsShort[d.getMonth()] ?? "";
  /* So'z tartibi tilga qarab boshqa: o'zbekchada "2-sen", inglizchada
     "Sep 2". Shuning uchun shakl ham lug'atdan olinadi. */
  return t.chart.dayMonth(day, month);
}

/** `2026-09-02` → "2-sentabr" (to'liq oy nomi bilan). */
export function dayMonthLongLabel(d: Date, t: Messages): string {
  const day = d.getDate();
  const month = t.chart.months[d.getMonth()] ?? "";
  return t.chart.dayMonth(day, month);
}

/** Hafta kuni — 0 = dushanba (`getDay()` yakshanbadan boshlaydi). */
export function weekdayLabel(d: Date, t: Messages): string {
  return t.chart.weekdays[(d.getDay() + 6) % 7];
}
