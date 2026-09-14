/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  KAMERA → MUASSASA BOG'LANISHI — YAGONA QATLAM                       ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * NEGA ALOHIDA QATLAM: kuzatuv posti hodisasida muassasa belgisi YO'Q — faqat kamera
 * nomi va kanal raqami keladi. Hozir bog'lanish `config/nvrCameras.ts` dagi
 * QO'LDA yozilgan jadvaldan olinadi.
 *
 * ── MASSHTAB MUAMMOSI ────────────────────────────────────────────────
 * 645 maktab × ~10 kamera = ~6 450 ta qo'lda yozuv, va har biri uchun
 * qayta build + qayta yoyish kerak bo'lardi. Bu yo'l yopiq.
 *
 * ── BACKEND TAYYOR BO'LGANDA ─────────────────────────────────────────
 * ⚠️ ALMASHTIRISH NUQTASI — pastdagi `resolveCampus()`:
 *   1. `CameraOut` ga `institution_id` qo'shiladi,
 *   2. kuzatuv posti hodisasi `camera_id` orqali o'sha yozuvga ulanadi,
 *   3. shu funksiya jadval o'rniga kamera yozuvidan o'qiydi,
 *   4. `config/nvrCameras.ts` BUTUNLAY o'chiriladi.
 *
 * Chaqiruvchilar (`DetectionCard`, `DetectionsPage`) shu faylning
 * interfeysini ko'radi — ular tegilmaydi.
 */
import { campusForCamera as campusFromTable } from "@/config/nvrCameras";
import type { CampusPoint } from "@/config/campusPoints";

/**
 * Hodisa qaysi kampusda sodir bo'lgan.
 *
 * @param camera  kuzatuv posti bergan kamera nomi
 * @param channel kuzatuv posti kanali — nom o'zgarsa ham barqaror qoladigan zaxira kalit
 * @returns kampus yozuvi, topilmasa `null` (xaritada ko'rsatilmaydi)
 */
export function resolveCampus(
  camera: string | null | undefined,
  channel?: string | null
): CampusPoint | null {
  // ⚠️ MOCK: qo'lda yozilgan jadval. Backend `institution_id` bergach shu
  //    chaqiruv `camera.institution_id` ni o'qishga almashadi.
  return campusFromTable(camera, channel);
}

/** Hodisa shu muassasaga tegishlimi (`"all"` — hammasi). */
export function belongsToInstitution(
  camera: string | null | undefined,
  channel: string | null | undefined,
  institutionId: string | null
): boolean {
  if (!institutionId) return true;
  return resolveCampus(camera, channel)?.id === institutionId;
}
