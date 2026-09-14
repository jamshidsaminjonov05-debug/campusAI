/**
 * Brauzer qaysi manzilga so'rov yuborishini hisoblaydigan YAGONA joy.
 *
 * Manzillarning o'zi bu yerda EMAS — ular `config/services.mjs` reyestrida
 * (server va klient uchun bitta manba). Bu fayl faqat ikkita ishni qiladi:
 *   1. `NEXT_PUBLIC_*` qiymatlarini o'qiydi (pastdagi izohga qarang — LITERAL
 *      bo'lishi SHART),
 *   2. shu asosda har bir xizmat uchun tayyor ildiz beradi.
 *
 * Ildizlardan foydalanuvchilar: `lib/api.ts`, `services/voice/VoiceService.ts`,
 * `config/mapConfig.ts`, `lib/nvrApi.ts`.
 */
import { SERVICES, trimSlash } from "../../config/services.mjs";

export type ServiceId = keyof typeof SERVICES;

/**
 * DIQQAT — Next `process.env.X` ni FAQAT literal yozilganda almashtiradi.
 * `process.env[nom]` (dinamik kalit) klient bundle'da ISHLAMAYDI, shuning uchun
 * har bir o'zgaruvchi shu yerda qo'lda sanab o'tilgan. Reyestrga yangi xizmat
 * qo'shsangiz — uning `publicEnv` ini shu jadvalga ham qo'shing.
 */
const PUBLIC_ORIGIN: Record<string, string> = {
  api: process.env.NEXT_PUBLIC_API_ORIGIN ?? "",
  media: process.env.NEXT_PUBLIC_API_ORIGIN ?? "",
  static: process.env.NEXT_PUBLIC_API_ORIGIN ?? "",
  speech: process.env.NEXT_PUBLIC_API_ORIGIN ?? "",
  tiles: process.env.NEXT_PUBLIC_TILES_ORIGIN ?? "",
  nvr: process.env.NEXT_PUBLIC_NVR_ORIGIN ?? "",
  // Login/parol bilan ishlaydigan xizmat — to'g'ridan-to'g'ri rejimi
  // ATAYLAB yo'q (`services.mjs` `publicEnv: null`), shuning uchun bu
  // qator har doim bo'sh qoladi va `isDirect("weapon2")` doim `false`
  // bo'ladi — kuzatuv posti qatori bilan AYNI himoya naqshi.
  weapon2: process.env.NEXT_PUBLIC_WEAPON2_ORIGIN ?? "",
};

/** Shu xizmat to'g'ridan-to'g'ri chaqiriladimi (aks holda — proxy). */
export function isDirect(id: ServiceId): boolean {
  return trimSlash(PUBLIC_ORIGIN[id]) !== "";
}

/**
 * Xizmat ildizi — yo'l oldiga qo'yiladi.
 *   proxy rejimi      → "/api"                         (same-origin)
 *   to'g'ridan-to'g'ri → "http://<backend-server-ip>:7005/api"
 */
export function serviceBase(id: ServiceId): string {
  const s = SERVICES[id];
  const direct = trimSlash(PUBLIC_ORIGIN[id]);
  return direct ? `${direct}${s.upstreamPath}` : s.proxyPath;
}

/**
 * Faqat origin prefiksi — URL allaqachon to'liq yo'l bo'lganda
 * (masalan backend `/media/foto.jpg` qaytaradi).
 *   proxy rejimi      → ""      (yo'l o'zgarmaydi, rewrites ushlaydi)
 *   to'g'ridan-to'g'ri → "http://<backend-server-ip>:7005"
 */
export function serviceOrigin(id: ServiceId): string {
  return trimSlash(PUBLIC_ORIGIN[id]);
}

/* ─────────────────── Tayyor ildizlar (kod shulardan foydalanadi) ─────────────────── */

/** REST API: `${API_BASE}/persons` → `/api/v1/persons`. */
export const API_BASE = `${serviceBase("api")}/v1`;

/** STT/TTS: `${SPEECH_BASE}/stt`. */
export const SPEECH_BASE = serviceBase("speech");

/** Rasm/media prefiksi (`photoUrl`). */
export const MEDIA_BASE = serviceOrigin("media");

/** Xarita: `${TILES_BASE}/data/...`. */
export const TILES_BASE = serviceBase("tiles");

/** kuzatuv posti hodisalari: `${NVR_BASE}/gun/events`. */
export const NVR_BASE = serviceBase("nvr");

/** Qurol/janjal — 2-versiya (lokal): `${WEAPON2_BASE}/api/alert/alert-list/`. */
export const WEAPON2_BASE = serviceBase("weapon2");

/* ─────────────────────────── Mock rejimi ─────────────────────────── */

/**
 * Backend bo'sh bo'lganda dekorativ mock ko'rsatilsinmi.
 *
 *   bo'sh / "true"  → mock ruxsat (default — demo va ishlab chiqish uchun)
 *   "false"         → mock UMUMAN ishlatilmaydi: bo'sh ma'lumot va aniq
 *                     xato ko'rsatiladi
 *
 * ISHLAB CHIQARISHDA `false` qo'yilsin — shunda hech kim to'qilgan raqamni
 * haqiqiy hisobot deb o'ylab qolmaydi (`DemoDataBanner` izohiga qarang).
 *
 * DIQQAT: `NEXT_PUBLIC_*` klient bundle'ga yoziladi — o'zgartirsangiz
 * `npm run build` QAYTA kerak (`config/services.mjs` dagi qoida bilan bir xil).
 */
export const ALLOW_MOCK: boolean = process.env.NEXT_PUBLIC_ALLOW_MOCK !== "false";
