/**
 * kuzatuv posti kamerasi → kampus bog'lanishi.
 *
 * NEGA kerak: kuzatuv posti hodisasida koordinata YO'Q — faqat `camera` nomi va `channel`
 * raqami keladi. Xaritada hodisani ko'rsatish uchun qaysi kamera qaysi
 * kampusda turishini shu jadval aytadi.
 *
 * TO'LDIRISH: kamera nomini AYNAN kuzatuv posti bergandek yozing (katta-kichik harf
 * muhim emas), kampus id'sini `campusPoints.ts` dan oling.
 * Jadvalda yo'q kamera — `null` (xaritada ko'rsatilmaydi, ro'yxatda ko'rinadi).
 */
import { CAMPUS_BY_ID, type CampusPoint } from "./campusPoints";

/** Kamera nomi (kichik harflarda) → kampus id. */
export const CAMERA_TO_CAMPUS: Record<string, string> = {
  // Hozircha hammasi 179-maktabga tegishli (institutions.ts: "Kameralar
  // birinchi shu maktabga o'rnatilmoqda" — DEFAULT_INSTITUTION_ID).
  //
  // ── Jonli serverda AYNAN shu nom keladi (2026-08-28 da tekshirilgan) ──
  "camera 01": "edu-mk-179",

  // ── Eski nomlar (server almashgan, hozir kelmaydi — zarar qilmaydi) ──
  "moon darvoza": "edu-mk-179",
  "1-etaj 1-lift": "edu-mk-179",
  "toshkent face": "edu-mk-179",
};

/**
 * Kanal raqami bo'yicha zaxira jadval.
 *
 * NEGA kerak: kuzatuv postida kamera NOMI o'zgarib turadi ("MOON DARVOZA" → "Camera 01"),
 * kanal raqami esa barqaror. Nom topilmasa kanal bo'yicha qidiriladi —
 * shunda nom almashgani bilan kampus bog'lanishi buzilmaydi.
 */
export const CHANNEL_TO_CAMPUS: Record<string, string> = {
  "32": "edu-mk-179",
};

/**
 * Jadvalda topilmagan kanal QAYSI muassasaga tegishli.
 *
 * ⚠️ HOZIRGI HOLAT: tarmoqda BITTA kuzatuv posti bor va u 179-maktabga o'rnatilgan
 * (`institutions.ts` — "Kameralar birinchi shu maktabga o'rnatilmoqda").
 * 32 kanalning 30 tasi `Camera 01`, 2 tasi `IP PTZ Camera` deb ataladi —
 * ya'ni nomdan muassasani ajratib bo'lmaydi va jadvalga 32 qator yozishning
 * ma'nosi yo'q: hammasi bir joyda.
 *
 * IKKINCHI kuzatuv posti qo'shilganda bu `null` ga qaytariladi va kanal→muassasa
 * bog'lanishi yuqoridagi jadvallar orqali (yoki backend `institution_id`
 * bilan) aniq beriladi.
 */
export const NVR_DEFAULT_CAMPUS_ID: string | null = "edu-mk-179";

/** Kamera bo'yicha kampus (topilmasa `null`). */
export function campusForCamera(
  camera: string | null | undefined,
  channel?: string | null
): CampusPoint | null {
  const byName = camera ? CAMERA_TO_CAMPUS[camera.trim().toLowerCase()] : undefined;
  // Nom topilmasa kanal bo'yicha — kamera qayta nomlansa ham bog'lanish qoladi
  const id =
    byName ?? (channel ? CHANNEL_TO_CAMPUS[String(channel).trim()] : undefined) ?? NVR_DEFAULT_CAMPUS_ID ?? undefined;
  return id ? CAMPUS_BY_ID.get(id) ?? null : null;
}
