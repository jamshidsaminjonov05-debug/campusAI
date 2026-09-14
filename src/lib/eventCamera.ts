/**
 * Hodisa QAYSI kamerada sodir bo'lgan — BARQAROR bog'lanish.
 *
 * ⚠️ NEGA hisoblanadi: aniqlash oqimidagi hodisada (`DetectionEvent`) kanal
 * raqami YO'Q — faqat kamera NOMI bor, kuzatuv postida esa 30 ta kanal bir xil
 * "Camera 01" deb ataladi (o'lchandi). Nom bo'yicha bog'lash mumkin emas.
 *
 * Shuning uchun hodisa id'sidan barqaror indeks olinadi: bitta hodisa DOIM
 * bitta kanalga tushadi — xaritada marker sakramaydi, tafsilot oynasida ham
 * ayni kamera ko'rsatiladi. Tasodifiy son ISHLATILMAYDI: har renderda
 * boshqa kamera chiqib qolardi.
 *
 * ⚠️ ALMASHTIRISH NUQTASI: backend hodisaga `camera_id`/`channel` qo'shganda
 * shu funksiya o'sha maydonni qaytarishga o'zgartiriladi — chaqiruvchilar
 * (`EventsHudScreen`) tegilmaydi.
 */

/** Matndan barqaror 32-bitli hash (FNV-1a). */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Hodisa uchun kanal raqami.
 *
 * @param ev       hodisa (`id` va ixtiyoriy `channel`)
 * @param channels mavjud kanallar ro'yxati (`["1", "2", …]`)
 * @returns        kanal yoki `null` (ro'yxat bo'sh bo'lsa)
 */
export function eventChannel(
  ev: { id: string; channel?: string | null },
  channels: readonly string[]
): string | null {
  if (channels.length === 0) return null;
  // Backend kanal bergan bo'lsa — o'sha (kelajakdagi holat)
  if (ev.channel && channels.includes(ev.channel)) return ev.channel;
  return channels[hash(ev.id) % channels.length];
}
