/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  SESSIYA BELGISI — `/nvr` proxysini himoyalash uchun                 ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * ── MUAMMO (2026-09-06 da o'lchandi, jiddiy) ────────────────────────────
 * `app/nvr/[...path]/route.ts` login TALAB QILMASDAN ishlardi:
 *
 *     curl http://<host>:3080/nvr/faces?limit=1   → 200, total=3089
 *
 * Backend (`/api/v1/...`) to'g'ri himoyalangan (tokensiz `401`), lekin kuzatuv posti
 * proxy ochiq edi — tarmoqdagi ISTALGAN odam login qilmasdan 3000+ kishining
 * yuz surati va videosini ko'ra olardi (kuzatuvdagilar orasida bolalar bor).
 *
 * ── NEGA ODDIY "TOKENNI TEKSHIRISH" YETMAYDI ──────────────────────────
 * Autentifikatsiya tokenlari `localStorage` da (`lib/api.ts`), server
 * komponent/route handler esa `localStorage`ni KO'RMAYDI — faqat `cookie`
 * sarlavhasini ko'radi. `<img src="/nvr/.../image">` va `<video src>` ham
 * o'z-o'zidan `Authorization` sarlavhasi qo'sha olmaydi (brauzer bunday
 * imkoniyat bermaydi), ya'ni bearer-token tekshiruvi rasm/video yo'llarini
 * himoyalay olmasdi.
 *
 * ── YECHIM ─────────────────────────────────────────────────────────────
 * Muvaffaqiyatli LOGIN'dan keyin (`lib/api.ts` `saveTokens()`) brauzerga
 * shu manzil orqali **httpOnly sessiya cookie**si qo'yiladi. Cookie
 * `httpOnly` bo'lgani uchun JS uni na o'qiy oladi (XSS orqali o'g'irlanmaydi
 * — hozirgi `localStorage` tokenidan farqli), na SOXTALASHTIRA oladi
 * (tashqi `curl` uni qo'yolmaydi). `<img>`/`<video>` so'rovlari esa
 * COOKIE'ni BROWSER O'ZI, avtomatik yuboradi — shu sabab aynan cookie
 * tanlandi, `Authorization` sarlavhasi emas.
 *
 * `app/nvr/[...path]/route.ts` endi har so'rovda shu cookie bor-yo'qligini
 * tekshiradi; yo'q bo'lsa kuzatuv posti serveriga umuman so'rov yubormasdan `401`
 * qaytaradi.
 *
 * ⚠️ **Bu — ORTIQCHA HIMOYA QATLAMI, backend token tekshiruvining O'RNI
 * EMAS.** Cookie qiymati backend tokenining haqiqiyligini QAYTA
 * tekshirmaydi (bu har `/nvr` so'roviga qo'shimcha tarmoq safari qo'shib,
 * SSE/video oqimini sekinlashtirar edi) — u faqat "shu brauzer muvaffaqiyatli
 * login qilgan" faktini tasdiqlaydi. Muddat YO'Q qilib qo'yilgan
 * (sessiya cookie — brauzer yopilsa o'chadi): `lib/api.ts` da access-token
 * muddati kuzatilmaydi (faqat `refresh` bilan yangilanadi), shuning uchun
 * aniq muddat berish yolg'on aniqlik bo'lardi. `logout()` cookie'ni
 * DARHOL o'chiradi (`DELETE`).
 *
 * 🔴 **`secure: NODE_ENV === "production"` — SERVERGA QO'YILGANDA
 * BUTUN COOKIE'NI O'LDIRARDI** (2026-09-18, foydalanuvchi xabar qildi:
 * "2chi versiyani bosgan vaqtimda ... login xatosi 401 qaytaryabdi" —
 * FAQAT `npm run build && npm start` bilan qo'yilgan serverda, lokal
 * `npm run dev`da esa muammo yo'q edi).
 *
 * Sabab: `secure: true` bo'lgan cookie'ni brauzer FAQAT HTTPS (yoki
 * `localhost`) ustida saqlaydi/yuboradi — oddiy HTTP ustidan esa
 * JIM tashlab yuboradi (xato ko'rinmaydi, cookie shunchaki "yo'q"
 * bo'lib qoladi). Bu loyiha esa (`CLAUDE.md`: "LOYIHA TO'LIQ OFFLINE",
 * hamma xizmat `http://<ichki-ip>:port`) ICHKI TARMOQDA, ODATDA oddiy
 * HTTP orqali ishga tushiriladi — TLS sertifikat HECH QAYERDA
 * o'rnatilmagan. `next build`da esa `NODE_ENV` AVTOMATIK
 * `"production"` bo'ladi — ya'ni `secure: true` DOIM yoqilardi, login
 * "muvaffaqiyatli" bo'lardi-yu (cookie javobda BOR), brauzer uni
 * jim qabul qilmasdi. Keyingi HAR BIR `/nvr/...`/`/weapon2/...`/
 * `/janjal2/...` so'rovida cookie yo'q → proxy `401 "Kirish talab
 * qilinadi"` qaytaraverardi — go'yo login ishlamayotgandek.
 *
 * ⚠️ **`NODE_ENV` EMAS, SO'ROVNING O'ZI HTTPS'danmi — shu tekshiriladi.**
 * `req.nextUrl.protocol` (to'g'ridan-to'g'ri `next start`) YOKI
 * `X-Forwarded-Proto: https` (TLS teskari-proksi — nginx va h.k. —
 * orqasida, u Next'ga ICHKARIDA oddiy HTTP bilan murojaat qiladi).
 * Natija: oddiy HTTP LAN'da cookie ISHLAYDI (`secure:false`), TLS
 * qo'shilsa esa (kelajakda, teskari-proksi bilan) O'ZI `secure:true`ga
 * o'tadi — qo'lda hech narsa o'zgartirish shart emas.
 */
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/nvr/nvrSession";

/** So'rov HAQIQATAN HTTPS ustidanmi — `NODE_ENV`ga emas, shu bilan tekshiriladi. */
function isHttps(req: NextRequest): boolean {
  return req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
}

export async function POST(req: NextRequest) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: SESSION_COOKIE,
    // Qiymatning o'zi tekshirilmaydi — faqat BOR-YO'QLIGI muhim
    // (yuqoridagi izohga qarang), shuning uchun opaque marker yetarli.
    value: "1",
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps(req),
    path: "/",
    // Muddat YO'Q = sessiya cookie (brauzer yopilsa o'chadi).
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({ name: SESSION_COOKIE, value: "", maxAge: 0, path: "/" });
  return res;
}
