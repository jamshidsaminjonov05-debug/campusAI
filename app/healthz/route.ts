/**
 * Sog'liq tekshiruvi — `GET /healthz`.
 *
 * ⚠️ **`/api/health` EMAS, `/healthz`** — `/api/*` butunlay backendga
 * proksilanadi (`config/services.mjs` `buildRewrites()`), "YAGONA
 * REYESTR" qoidasiga ko'ra bu prefiks FAQAT o'sha ro'yxatdan boshqariladi.
 * Next Route Handler'lar filesystem bo'yicha rewrite'dan USTUN tursa ham
 * (`/session` da xuddi shu sabab), `/api` ostida yangi ma'no qo'shish
 * chalkashtiradi — shuning uchun butunlay boshqa, keng tarqalgan yo'l
 * (`/healthz`) tanlandi.
 *
 * ⚠️ **Auth TALAB QILINMAYDI** — deploy skripti/load balancer/Docker
 * `HEALTHCHECK` login qila olmaydi, va bu manzil hech qanday maxfiy
 * ma'lumot bermaydi (faqat "jarayon tirik" degan javob).
 *
 * ⚠️ Backend/kuzatuv posti/tiles ULANGANLIGINI TEKSHIRMAYDI — bu FAQAT Next
 * jarayonining o'zi javob berayotganini bildiradi (process-level
 * healthcheck). Xizmatlar holati uchun `/tizim-test` bor (brauzerda,
 * login talab qilmaydi — u WebGL va real MapLibre ham sinaydi, shuning
 * uchun avtomatlashtirilgan tekshiruv uchun mos emas).
 */
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ ok: true, time: new Date().toISOString(), uptime: process.uptime() });
}
