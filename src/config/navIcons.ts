/**
 * Navigatsiya ikonkalari — animatsiyali GIF (`public/icons/gif/`).
 *
 * YAGONA JADVAL: ikonka almashtirish uchun komponentlar kovlanmaydi, shu
 * fayldagi bitta qator o'zgartiriladi. Kalit — `activePage` qiymati
 * (o'zgarmaydi, `Sidebar.tsx` / `App.tsx` shunga bog'langan).
 *
 * Ro'yxatda YO'Q sahifa `lucide-react` ikonkasi bilan qoladi (`Sidebar.tsx`
 * dagi zaxira) — ya'ni GIF yetishmasa hech narsa buzilmaydi.
 *
 * Fayl nomlari ATAYLAB o'zbekcha-lotin, bo'sh joysiz: yuklab olingan asl
 * nomlarda bo'shliq va qavs bor edi (`… (1).gif`), ular manzilda kodlanib
 * ketardi. Asl nomlar (lordicon) — quyidagi jadvalda.
 *
 * | Fayl | Asl nomi |
 * |---|---|
 * | `boshqaruv-paneli.gif` | `system-solid-63-home-hover-pinch` |
 * | `kameralar.gif`        | `wired-flat-61-camera-hover-flash` |
 * | `talabalar.gif`        | `wired-flat-268-avatar-man-hover-wave` |
 * | `oqituvchilar.gif`     | `doodle-color-268-avatar-man-hover-wave` |
 * | `geo-analitika.gif`    | `doodle-color-27-globe-hover-rotate` |
 * | `hodisalar.gif`        | `doodle-color-1140-warning-triangle-hover-pinch` |
 * | `hisobotlar.gif`       | `doodle-color-56-file-text-hover-pinch` |
 * | `sozlamalar.gif`       | `doodle-black-343-folder-settings-hover-pinch` |
 *
 * ⚠️ Ro'yxatda YO'Q sahifalar (`lucide` zaxirasida qoladi): "AI tahlil"
 * va "Muassasalar" — ikkalasi ham keyinroq qo'shilgan, hali GIF yo'q.
 */

const lottie = (name: string) => `/icons/gif/${name}.json`;

const gif = (name: string) => `/icons/gif/${name}.gif`;

export const NAV_GIF_ICONS: Record<string, string> = {
  "Boshqaruv paneli": gif("boshqaruv-paneli"),
  Kameralar: gif("kameralar"),
  Shaxslar: gif("talabalar"),
  "Geo Analitika": gif("geo-analitika"),
  Hodisalar: gif("hodisalar"),
  Hisobotlar: gif("hisobotlar"),
  Aniqlanganlar: gif("aniqlanganlar"),
  Statistika: lottie("statistika"),
  Sozlamalar: gif("sozlamalar"),
};
