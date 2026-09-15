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
  /* 🔴 2026-09-15 — PROXY TO'LIQ OLIB TASHLANDI (foydalanuvchi so'rovi,
     ogohlantirishdan keyin ongli tanlov). ⚠️ O'lchandi: `/api/v1/*` CORS
     beradi (GET/POST/DELETE), lekin `/api/login`, `/api/auth/refresh`,
     `/api/me`, `/api/users`, `/api/channels`, `/api/status` va har qanday
     `PUT` CORS BERMAYDI (preflight 405/401) — server CORS qo'shmaguncha
     ular brauzerda ishlamaydi. Proxyga qaytish: `NEXT_PUBLIC_API_ORIGIN`ni
     bo'shatib, `build`. */
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

/** To'g'ridan-to'g'ri rejim kaliti — KLIENT bundle'ga yoziladi (proxysiz boshqa yo'l yo'q:
 *  `<img>`/`<video>`/`EventSource` sarlavha qo'sha olmaydi, server `?api_key=` ni qabul qiladi). */
const NVR_PUBLIC_KEY = process.env.NEXT_PUBLIC_NVR_API_KEY ?? "";

/**
 * kuzatuv posti manzili — `path` `/v1` yo'li (`/faces?limit=1`) yoki panel yo'li
 * (`/panel/channels`).
 *   proxy rejimi       → `/nvr/faces?limit=1`, `/nvr/panel/channels`
 *   to'g'ridan-to'g'ri → `http://<ip>:7007/api/v1/faces?limit=1&api_key=…`,
 *                        `http://<ip>:7007/api/channels?api_key=…`
 * Kalit QUERY'da — GET so'rovi "oddiy" bo'lib qoladi, preflight ketmaydi.
 */
export function nvrUrl(path: string): string {
  const origin = serviceOrigin("nvr");
  if (!origin) return `${NVR_BASE}${path}`;
  const url = path.startsWith("/panel") ? `${origin}/api${path.slice("/panel".length)}` : `${NVR_BASE}${path}`;
  return NVR_PUBLIC_KEY ? `${url}${url.includes("?") ? "&" : "?"}api_key=${encodeURIComponent(NVR_PUBLIC_KEY)}` : url;
}

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
