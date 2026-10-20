/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  JANJAL ANIQLASH — 2-VERSIYA (lokal) proxy                          ║
 * ║  `/janjal2/...` → `${JANJAL2_ORIGIN}/...`                           ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * 2026-09-17, foydalanuvchi so'rovi: "aniqlanganlar qismida 2chi versiyada
 * JANJALni bosganimizda berilgan backend swageridan olib kelsin"
 * (`Jangni Aniqlash Tizimi API`, `JANJAL2_ORIGIN`).
 *
 * Bu — `weapon2` (qurol) API bilan AYNI shakldagi ALOHIDA server: login/parol
 * → JWT, `AlertModel` (`id`/`camera_id`/`image_path`/`video_path`/`confidence`/
 * `detected_at`), `GET /api/alert/alert-list/?page=&page_size=`. Shu sabab
 * proxy mantiqi umumiy `makeTokenProxy()` da (`src/lib/tokenProxy.ts`) — bu
 * yerda faqat xizmat `id`si beriladi. Login/parol FAQAT `.env.local`
 * (`JANJAL2_USERNAME`/`JANJAL2_PASSWORD`), brauzerga chiqmaydi.
 *
 * Nima o'tadi (barchasi upstream ILDIZIDA, `upstreamPath` bo'sh):
 *   /janjal2/api/alert/alert-list/?page=1&page_size=24 → hodisalar (JSON)
 *   /janjal2/alert_images/<yo'l>.jpg                   → rasm (statik)
 *   /janjal2/alert_videos/<yo'l>.mp4                   → video (`Range` bilan)
 *   /janjal2/api/cams/camera/list/                     → kameralar (nom uchun)
 */
import { makeTokenProxy } from "@/lib/nvr/tokenProxy";

export const dynamic = "force-dynamic";

export const { GET, HEAD } = makeTokenProxy("janjal2");
