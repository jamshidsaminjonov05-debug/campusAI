/**
 * pm2 konfiguratsiyasi — `npm install` bilan birga o'rnatilmagan, alohida:
 *   npm install -g pm2
 *   pm2 start ecosystem.config.cjs
 *   pm2 save && pm2 startup   # server qayta yuklansa avtomatik ko'tarilishi uchun
 *
 * ⚠️ **BU FAYL ISHGA TUSHIRIB SINALMAGAN** (2026-09-06 da yozilgan,
 * shu muhitda pm2 yo'q). Ishlatishdan oldin `pm2 status` bilan bir marta
 * tekshiring.
 *
 * ⚠️ `.env.local` O'ZI O'QILMAYDI — Next uni faqat `next dev`/`next build`
 * paytida avtomatik o'qiydi, `next start` esa YO'Q (bu Next'ning o'z
 * xatti-harakati). Production ENV shu faylning `env` maydonida yoki
 * pm2 ishga tushirilgan SHELL'ning o'z muhitida bo'lishi kerak.
 */
module.exports = {
  apps: [
    {
      name: "campus-ai",
      script: "npm",
      args: "start",
      // Deploy (`.github/workflows/deploy.yml`) ilovani `~/campus-ai/current`
      // symlinkidan ishga tushiradi va shu yo'lni `CAMPUS_AI_APP_DIR` bilan
      // beradi. `__dirname` bu yerda YETMAYDI: Node symlinkni haqiqiy reliz
      // papkasiga aylantiradi va keyingi deploy'larda ham ESKI relizda qolardi.
      cwd: process.env.CAMPUS_AI_APP_DIR || __dirname,
      instances: 1,
      // Klasterlash YO'Q — SSE va jonli oqim (video/MJPEG) ulanishlari
      // bitta jarayonda tutilib turishi kerak (CLAUDE.md #13: bitta Next
      // jarayoni allaqachon tor bo'g'in, klasterlash buni HAL QILMAYDI —
      // Nginx/media-relay bilan alohida yechish kerak, bu yerda faqat
      // jarayonni tirik saqlash vazifasi bor).
      exec_mode: "fork",
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: "3080",
        // Quyidagilarni HAQIQIY qiymat bilan to'ldiring (yoki shell ENV'da bering):
        // BACKEND_ORIGIN: "http://<backend-ip>:7005",
        // TILES_ORIGIN: "http://<tiles-ip>:8080",
        // NVR_ORIGIN: "http://<nvr-ip>:7007",
        // NVR_API_KEY: "<haqiqiy-kalit>",
      },
    },
  ],
};
