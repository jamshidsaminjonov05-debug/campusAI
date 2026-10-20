/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  QUROL ANIQLASH — 2-VERSIYA (lokal) proxy                           ║
 * ║  `/weapon2/...` → `${WEAPON2_ORIGIN}/...`                            ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * 2026-09-09, foydalanuvchi so'rovi: "biz o'zimizni lokal versiyamizni ham
 * o'qitamiz... aniqlanganlar qismida 2chi versiya button qo'yiladi...
 * ikkinchisiga ham login parol bilan kiriladi... bu faqat .env fileda
 * bo'lishi kerak".
 *
 * Login/parol → JWT, token keshi va sessiya himoyasi — HAMMASI umumiy
 * `makeTokenProxy()` da (`src/lib/tokenProxy.ts`), chunki `janjal2` xizmati
 * AYNI naqshda ishlaydi. Bu yerda faqat xizmat `id`si beriladi.
 *
 * Nima o'tadi (barchasi upstream ILDIZIDA — `image_path`/`video_path`
 * serverning o'zi shu ko'rinishda qaytaradi, `upstreamPath` bo'sh):
 *   /weapon2/api/alert/alert-list/?page=1&page_size=24 → hodisalar (JSON)
 *   /weapon2/alert_images/<yo'l>.jpg                   → rasm (statik)
 *   /weapon2/alert_videos/<yo'l>.mp4                   → video (`Range` bilan)
 *   /weapon2/api/cams/camera/list/                     → kameralar (nom uchun)
 */
import { makeTokenProxy } from "@/lib/nvr/tokenProxy";

export const dynamic = "force-dynamic";

export const { GET, HEAD } = makeTokenProxy("weapon2");
