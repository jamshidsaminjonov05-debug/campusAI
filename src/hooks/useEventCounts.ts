/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  KUZATUV POSTI KATEGORIYALARI                                        ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * 🔵 2026-10-26: bu faylda ilgari `useEventDailyCounts()` (oraliqning HAR
 * KUNI uchun `limit=1` so'rov — 30 kun = 30 so'rov) va
 * `useEventCategoryTotals()` (4 ta `limit=1` so'rov) turardi. Ikkalasi
 * 2026-09-15 da `GET /events/stats` (`hooks/useEventStats.ts` —
 * `by_day`/`by_category` bitta so'rovda) bilan ALMASHTIRILGAN edi, lekin
 * fayl o'chirilmay qolgan — chaqiruvchisi yo'q edi (grep bilan
 * tasdiqlangan). Ishlatilmaydigan fayl qoidasi (CLAUDE.md, 2026-09-18)
 * bo'yicha o'chirildi; faqat kategoriya ro'yxati qoldi — uni 6 fayl
 * import qiladi.
 *
 * ⚠️ Bu yerda ATAYLAB SERVER kategoriyalari (`face`/`gun`/`janjal`/
 * `smoking`), `DETECTION_TYPES` emas: "Begona odam" faqat TANILMAGAN yuz,
 * "Telefon" esa `smoking` ichidan MATN bo'yicha ajratiladi — ikkalasi ham
 * hodisaning O'ZINI ko'rmasdan aniqlanmaydi. Server kategoriyasi esa ANIQ
 * va oraliq uzunligidan mustaqil. `all` — shu to'rttasining birlashmasi.
 */
export const NVR_CATEGORIES = ["face", "gun", "janjal", "smoking"] as const;
export type NvrRealCategory = (typeof NVR_CATEGORIES)[number];
