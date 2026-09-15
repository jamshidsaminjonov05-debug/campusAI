/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  TASHQI XIZMATLAR — YAGONA REYESTR. Boshqa hech qayerda manzil YO'Q. ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * Shu bitta fayl uchta joyni boshqaradi:
 *   1. `next.config.mjs`  → rewrites (proxy) AVTOMATIK quriladi
 *   2. `src/config/endpoints.ts` → brauzer ishlatadigan ildizlar
 *   3. `app/tizim-test`   → diagnostika har bir xizmatni O'ZI tekshiradi
 *
 * YANGI XIZMAT QO'SHISH = quyidagi ro'yxatga BITTA yozuv. Boshqa hech narsa
 * o'zgartirilmaydi: proxy yo'li, klient ildizi va diagnostika o'zi paydo bo'ladi.
 *
 * ── Ikki rejim ────────────────────────────────────────────────────────
 *   PROXY (default)  — brauzer faqat Next serverga boradi (`/api`, `/tiles`…),
 *                      Next ichkaridan `origin`ga uzatadi. CORS YO'Q, HTTPS
 *                      qo'shilsa ham buzilmaydi. Klient faqat 5173 ni ko'rsa yetadi.
 *   TO'G'RIDAN       — `publicEnv` to'ldirilsa brauzer origin'ga bevosita boradi.
 *                      CORS kerak; har bir klient shu IP'ni ko'rishi shart.
 *
 * DIQQAT: `origin` SERVER tomonda o'qiladi (maxfiy qolishi mumkin),
 * `publicEnv` esa KLIENT bundle'ga yoziladi — o'zgartirsangiz qayta `build` kerak.
 */

/** @typedef {Object} Service
 * @property {string} label        Odam o'qiydigan nom (log va diagnostikada)
 * @property {string} envOrigin    Server env o'zgaruvchisi nomi — MAJBURIY, default YO'Q
 * @property {string} proxyPath    Brauzer ko'radigan same-origin yo'l (`/api`)
 * @property {string} upstreamPath Origin ichidagi prefiks (`/api/v1/speech`)
 * @property {string|null} publicEnv To'g'ridan-to'g'ri rejim uchun NEXT_PUBLIC nomi
 * @property {boolean} [originOnly] URL allaqachon `proxyPath` bilan boshlanadi
 *                                  (masalan `/media/x.jpg`) — faqat origin qo'shiladi
 * @property {string} [probe]      Diagnostika so'raydigan yo'l (`upstreamPath`dan keyin)
 * @property {number[]} [expect]   Sog'lom deb hisoblanadigan status kodlar
 * @property {string} [envKey]     API-kalit env o'zgaruvchisi nomi (`X-API-Key` bilan ishlaydigan xizmatlar)
 * @property {string} [envUser]    Login/parol env o'zgaruvchisi (foydalanuvchi nomi) — token bilan ishlaydigan xizmatlar
 * @property {string} [envPass]    Login/parol env o'zgaruvchisi (parol)
 */

/** @type {Record<string, Service>} */
export const SERVICES = {
  api: {
    label: "Backend API (FastAPI)",
    envOrigin: "BACKEND_ORIGIN",
    proxyPath: "/api",
    upstreamPath: "/api",
    publicEnv: "NEXT_PUBLIC_API_ORIGIN", // 2026-09-15 dan proxysiz — `src/config/endpoints.ts` izohiga qarang
    probe: "/v1/cameras",
    expect: [200, 401], // 401 ham "tirik" — auth talab qilyapti
  },
  media: {
    label: "Rasm/media fayllar",
    envOrigin: "BACKEND_ORIGIN",
    proxyPath: "/media",
    upstreamPath: "/media",
    publicEnv: "NEXT_PUBLIC_API_ORIGIN", // 2026-09-15 dan proxysiz — `src/config/endpoints.ts` izohiga qarang
    originOnly: true, // backend `/media/...` to'liq yo'l qaytaradi
  },
  static: {
    label: "Statik fayllar",
    envOrigin: "BACKEND_ORIGIN",
    proxyPath: "/static",
    upstreamPath: "/static",
    publicEnv: "NEXT_PUBLIC_API_ORIGIN", // 2026-09-15 dan proxysiz — `src/config/endpoints.ts` izohiga qarang
    originOnly: true,
  },
  speech: {
    label: "Ovoz — STT/TTS",
    envOrigin: "BACKEND_ORIGIN",
    proxyPath: "/speech",
    upstreamPath: "/api/v1/speech",
    publicEnv: "NEXT_PUBLIC_API_ORIGIN", // 2026-09-15 dan proxysiz — `src/config/endpoints.ts` izohiga qarang
    probe: "/health",
    expect: [200, 401],
  },
  tiles: {
    label: "Xarita (TileServer GL)",
    envOrigin: "TILES_ORIGIN",
    proxyPath: "/tiles",
    upstreamPath: "",
    publicEnv: "NEXT_PUBLIC_TILES_ORIGIN",
    probe: "/data/uzbekistan.json",
    expect: [200],
  },
  nvr: {
    // 🔴 2026-09-15 dan PROXYSIZ: `NEXT_PUBLIC_NVR_ORIGIN` to'ldirilsa brauzer
    // serverga to'g'ridan-to'g'ri boradi, kalit `?api_key=` bilan
    // (`NEXT_PUBLIC_NVR_API_KEY` — KLIENT bundle'ga yoziladi, ataylab).
    // Bo'sh bo'lsa — eskicha `/nvr` proxy (`app/nvr/[...path]/route.ts`).
    label: "kuzatuv posti — hodisalar, yuz bazasi, davomat, kameralar",
    envOrigin: "NVR_ORIGIN",
    proxyPath: "/nvr",
    upstreamPath: "/api/v1",
    publicEnv: "NEXT_PUBLIC_NVR_ORIGIN",
    probe: "/faces?limit=1",
    expect: [200, 401], // tizim-test kalitsiz so'raydi — 401 ham "tirik"
    // DIQQAT: bu xizmat oddiy rewrite EMAS — `app/nvr/[...path]/route.ts`
    // Route Handler orqali o'tadi, chunki har so'rovga `X-API-Key` sarlavhasi
    // qo'shilishi kerak. Rewrites sarlavha qo'sha olmaydi, kalit esa brauzerga
    // chiqmasligi kerak. Shu sabab `buildRewrites()` uni o'tkazib yuboradi.
    handler: true,
    /** Kalit — FAQAT server tomonda o'qiladi, klient bundle'ga tushmaydi. Default YO'Q — majburiy .env. */
    envKey: "NVR_API_KEY",
  },
  weapon2: {
    label: "Qurol/janjal aniqlash — 2-versiya (lokal)",
    envOrigin: "WEAPON2_ORIGIN",
    proxyPath: "/weapon2",
    // Prefiks YO'Q — upstream'da JSON API ham (`/api/...`), rasm/video
    // fayllari ham (`/alert_images/...`) origin ILDIZIDA, yo'l shundoq
    // o'tkaziladi (`tiles` xizmatidagi bo'sh `upstreamPath` bilan AYNI naqsh).
    upstreamPath: "",
    // DIQQAT: to'g'ridan-to'g'ri rejim YO'Q — login/parol brauzerga
    // chiqmasligi uchun bu xizmat DOIM proxy orqali ishlaydi (NVR bilan AYNI qoida).
    publicEnv: null,
    probe: "/api/alert/alert-list/?page=1&size=1",
    expect: [200, 401], // 401 ham "tirik" — sessiya cookie'siz shu qaytadi (tizim-test login qilmagan)
    // Oddiy rewrite EMAS — `app/weapon2/[...path]/route.ts` Route Handler:
    // har so'rovga `Authorization: Bearer <token>` qo'shiladi, token esa
    // server ICHIDA login/parol bilan olib turiladi (rewrites buni qila olmaydi).
    handler: true,
    /** Login/parol — FAQAT serverda o'qiladi. Default YO'Q — majburiy .env. */
    envUser: "WEAPON2_USERNAME",
    envPass: "WEAPON2_PASSWORD",
  },
};

/** Oxiridagi `/` larni olib tashlaydi. */
export const trimSlash = (v) => String(v ?? "").replace(/\/+$/, "");

/** Server tomondagi haqiqiy manzil — FAQAT `.env`dan. Kodda default YO'Q (xavfsizlik: ichki
 *  tarmoq manzillari repo'ga qattiq yozilmasin). Yo'q bo'lsa aniq xato bilan darhol to'xtaydi. */
export function originOf(id) {
  const s = SERVICES[id];
  if (!s) throw new Error(`Noma'lum xizmat: ${id}`);
  const v = process.env[s.envOrigin];
  if (!v) {
    throw new Error(
      `${s.envOrigin} .env.local faylida ko'rsatilmagan (${s.label}). Qo'shing:\n  ${s.envOrigin}=http://<server-ip>:<port>`
    );
  }
  return trimSlash(v);
}

/** Next rewrites — HAMMASI shu ro'yxatdan avtomatik quriladi.
 *  `handler: true` bo'lganlari o'tkazib yuboriladi — ular Route Handler
 *  orqali ishlaydi (sarlavha qo'shish kerak bo'lgan xizmatlar). */
export function buildRewrites() {
  return Object.entries(SERVICES)
    // To'g'ridan-to'g'ri rejimdagi xizmatga proxy yo'li QURILMAYDI (2026-09-15)
    .filter(([, s]) => !s.handler && !process.env[s.publicEnv ?? ""])
    .map(([id, s]) => ({
      source: `${s.proxyPath}/:path*`,
      destination: `${originOf(id)}${s.upstreamPath}/:path*`,
    }));
}

/** Xizmat kaliti — FAQAT `.env`dan, kodda default YO'Q. */
export function keyOf(id) {
  const s = SERVICES[id];
  if (!s?.envKey) return null;
  return process.env[s.envKey] || null;
}

/** Login/parol — FAQAT `.env`dan (token bilan ishlaydigan xizmatlar uchun). */
export function credsOf(id) {
  const s = SERVICES[id];
  if (!s?.envUser || !s?.envPass) return null;
  const username = process.env[s.envUser];
  const password = process.env[s.envPass];
  if (!username || !password) return null;
  return { username, password };
}

/** Sozlama to'g'riligini tekshiradi — noto'g'ri yoki yo'q bo'lsa DARHOL yiqiladi
 *  (server ishga tushib, keyin tushunarsiz 502 berishidan ko'ra shu yaxshi). */
export function validateServices() {
  const xato = [];
  for (const [id, s] of Object.entries(SERVICES)) {
    let o;
    try {
      o = originOf(id);
    } catch (e) {
      xato.push(e.message);
      continue;
    }
    try {
      const u = new URL(o);
      if (!/^https?:$/.test(u.protocol)) xato.push(`${id}: protokol noto'g'ri (${o})`);
    } catch {
      xato.push(`${id}: manzil noto'g'ri — ${s.envOrigin}="${o}"`);
    }
    if (!s.proxyPath.startsWith("/")) xato.push(`${id}: proxyPath "/" bilan boshlanishi kerak`);
    if (s.envKey && !keyOf(id)) xato.push(`${s.envKey} .env.local faylida ko'rsatilmagan (${s.label}).`);
    if ((s.envUser || s.envPass) && !credsOf(id)) {
      xato.push(`${s.envUser}/${s.envPass} .env.local faylida ko'rsatilmagan (${s.label}).`);
    }
  }
  if (xato.length) {
    throw new Error(`Xizmat sozlamalarida xato:\n  - ${xato.join("\n  - ")}`);
  }
}

/** Ishga tushganda konsolga chiqadigan jadval — nima qayerga ulanganini ko'rsatadi. */
export function describeServices() {
  return Object.entries(SERVICES).map(([id, s]) => ({
    xizmat: id,
    yo_l: s.proxyPath,
    manzil: `${originOf(id)}${s.upstreamPath}`,
    rejim: process.env[s.publicEnv ?? ""] ? "TO'G'RIDAN" : "proxy",
  }));
}