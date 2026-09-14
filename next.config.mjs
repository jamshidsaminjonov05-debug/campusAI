/**
 * Next.js konfiguratsiyasi — TO'LIQ OFFLINE (ichki tarmoq).
 *
 * DIQQAT: bu yerda MANZIL YOZILMAYDI. Barcha tashqi xizmatlar yagona
 * reyestrda: `config/services.mjs`. Rewrites (proxy) o'sha ro'yxatdan
 * AVTOMATIK quriladi — yangi xizmat qo'shish uchun bu faylga tegilmaydi.
 */
import { buildRewrites, describeServices, validateServices } from "./config/services.mjs";

// Sozlama noto'g'ri bo'lsa darhol yiqilamiz (keyin tushunarsiz 502 bo'lmasin)
validateServices();

// Ishga tushganda nima qayerga ulanganini bir marta chop etamiz
if (process.env.NODE_ENV !== "test") {
  console.log("\n  Tashqi xizmatlar:");
  for (const r of describeServices()) {
    console.log(`   ${r.yo_l.padEnd(9)} → ${r.manzil.padEnd(46)} [${r.rejim}]`);
  }
  console.log("");
}

/**
 * Xavfsizlik sarlavhalari — barcha yo'llarga qo'llanadi.
 * CSP ataylab qo'shilmagan: ovoz blob'lari, MapLibre worker'lari (`blob:`) va
 * inline uslublar qattiq CSP bilan buziladi. Quyidagilar esa hech narsani
 * buzmaydigan, yuqori foydali himoya: clickjacking, MIME-sniffing, referrer.
 */
const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Offline tarmoqda DNS prefetch keraksiz — tashqi domen yo'q
  { key: "X-DNS-Prefetch-Control", value: "off" },
  // Mikrofon (ovozli buyruq) va kamera (Face ID) faqat shu originga ruxsat etiladi
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Dev server ishlab turganda build `.next` ni tozalab, ochiq sahifani
  // jimgina buzadi (CLAUDE.md, 6-tuzoq). `NEXT_DIST_DIR` bilan build'ni
  // boshqa papkaga yo'naltirib, dev'ni to'xtatmasdan tekshirish mumkin:
  //   NEXT_DIST_DIR=.next-verify npm run build
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Xarita plitalari va lokal uslub o'zgarmaydi — uzoq keshlansin
      {
        source: "/tiles/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, immutable" }],
      },
    ];
  },
  async rewrites() {
    return buildRewrites();
  },
};

export default nextConfig;
