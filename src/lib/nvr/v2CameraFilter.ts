/**
 * "2-VERSIYA" KAMERALARI — YASHIRILADIGANLAR (2026-10-26, foydalanuvchi:
 * "2chi versiya bosilganda chiqadigan tungi klublar kameralarini olib tashla").
 *
 * Qurol/janjal serverlari (`weapon2`/`janjal2`) SHAHAR bo'ylab 200+ kamera
 * beradi (o'lchandi: 208 / 206 — ko'cha, metro, kafe, mehmonxona, tungi
 * klub). Maktab paneliga tungi klub kameralari ALOQASIZ — ular kamera
 * tanlagichidan, KPI'dan va hodisa ro'yxatidan chiqariladi. Server tomonida
 * bunday filtr yo'q (`/openapi.json`: faqat `page`/`page_size`), shuning
 * uchun KLIENTDA, NOM bo'yicha (id'lar ikki serverda boshqa-boshqa va
 * o'zgarishi mumkin — ro'yxat qotirilmaydi).
 *
 * Qoida BITTA joyda: yashiriladigan toifa qo'shish = shu regex'ga bitta
 * muqobil. Kirill/lotin ikkala yozuv ham (server nomlari aralash).
 */
const HIDDEN_V2_CAMERA = /тунги\s*клуб|tungi\s*klub|ночн\w*\s*клуб|night\s*club/i;

/**
 * QUROL (`weapon2`) — FAQAT RUXSAT RO'YXATI (2026-10-26, foydalanuvchi:
 * "qurol id'sida NVR <qurilma-ip-1> kanal 5, #44 — huddi shuni qo'yishing
 * kerak xolos", keyin "#52 NVR <qurilma-ip-2> kanal 29 ham qo'shib ber").
 * Qurol serverining 208 kamerasidan maktabga tegishlisi IKKITA:
 * `#44 · NVR <qurilma-ip-1> kanal 5` (o'lchandi: `accepted: 185`) va
 * `#52 · NVR <qurilma-ip-2> kanal 29` (`accepted: 3`). Qolgan hammasi
 * (shahar ko'chalari, tungi klublar)
 * yashiriladi — tanlagich, KPI va hodisa ro'yxati faqat shu kamera(lar)
 * bilan ishlaydi. Yana kamera qo'shish = shu ro'yxatga bitta `id`.
 * ⚠️ Janjal serverida (`janjal2`) ruxsat ro'yxati YO'Q — u yerda faqat
 * tungi klub regex'i (id fazosi boshqa: o'sha kamera u yerda `#47`).
 */
export const WEAPON2_ALLOWED_CAMERA_IDS: readonly number[] = [44, 52];

/**
 * QUROL — FAQAT SHU IKKI HODISA (o'sha kuni, foydalanuvchi: "qurol uchun
 * faqat 2 tagina hodisa chiqsin"): `Alert 3246` (#44) va `Alert 2918` (#52).
 * Server `is_read`/`accepted` bilan boshqa 186 ta hodisani ham beradi —
 * ular ro'yxatga TUSHMAYDI, KPI ham shu ro'yxat uzunligi. Bo'sh massiv =
 * cheklov yo'q (kamera ro'yxati bo'yicha hammasi). Hodisa qo'shish = bitta id.
 */
export const WEAPON2_ALLOWED_ALERT_IDS: readonly number[] = [3246, 2918];
const ALLOWED_ALERT = new Set(WEAPON2_ALLOWED_ALERT_IDS);
export function isAllowedWeapon2Alert(id: number): boolean {
  return ALLOWED_ALERT.size === 0 || ALLOWED_ALERT.has(id);
}

/** Kamera nomi/joylashuvi yashiriladigan toifaga tushadimi. */
export function isHiddenV2Camera(c: { name?: string | null; location?: string | null }): boolean {
  return HIDDEN_V2_CAMERA.test(`${c.name ?? ""} ${c.location ?? ""}`);
}

/** Ro'yxatdagi har kameraga `hidden` bayrog'i — ro'yxat QISQARTIRILMAYDI:
 *  `useNvrEvents` yashirin kameraning HODISALARINI ham chiqarib tashlashi
 *  uchun id'lar kerak (hodisada nom yo'q, faqat `camera_id`). */
export function markHiddenV2Cameras<T extends { id: number; name: string; location: string }>(
  rows: T[],
  /** Berilsa — FAQAT shu id'lar ko'rinadi (regex e'tiborga olinmaydi). */
  allowed?: readonly number[]
): (T & { hidden: boolean })[] {
  const allow = allowed ? new Set(allowed) : null;
  return rows.map((c) => ({ ...c, hidden: allow ? !allow.has(c.id) : isHiddenV2Camera(c) }));
}

/**
 * Foydalanuvchi tanlovi (`useV2Cameras`, localStorage) ustiga QOIDA:
 * qurolda tanlov ruxsat ro'yxati bilan KESISHADI, bo'sh qolsa — ruxsat
 * ro'yxatining o'zi. Shunda `useNvrEvents` DOIM kamera bo'yicha
 * (`get-camera-alerts/44`) so'raydi — `alert-list` sahifasida boshqa
 * 207 kameraning hodisalari aralashib, sahifa "bo'sh" chiqmaydi; KPI ham
 * shu kameraning `accepted`idan. Janjal tanlovi o'zgarmaydi.
 */
export function applyV2CameraRules<T extends { weapon2: number[]; janjal2: number[] }>(sel: T): T {
  const allow = new Set(WEAPON2_ALLOWED_CAMERA_IDS);
  const picked = sel.weapon2.filter((id) => allow.has(id));
  return { ...sel, weapon2: picked.length ? picked : [...WEAPON2_ALLOWED_CAMERA_IDS] };
}
