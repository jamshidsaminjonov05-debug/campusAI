/**
 * Qaysi XARITA — host bo'yicha (2026-09-14, foydalanuvchi so'rovi).
 *
 *   · `campusai.uz` (va uning subdomenlari) — Yandex Maps JS API
 *     (`map/yandex/YandexMap.tsx`): global serverdan ichki tayl serverga
 *     yetib bo'lmaydi (o'lchandi — `/tiles/...` javobsiz qoldi).
 *   · qolgan HAMMASI (localhost, ichki IP `10.181…`) — OFFLINE MapLibre,
 *     tashqi skript UMUMAN yuklanmaydi (loyihaning offline qoidasi).
 *
 * ⚠️ KALIT — `NEXT_PUBLIC_YANDEX_MAPS_API_KEY` (`.env.local`; prod'da
 * `~/campus-ai-secrets/.env.local`, `deploy.yml`). `NEXT_PUBLIC_*` klient
 * bundle'ga BUILD paytida yoziladi — kalit o'zgarsa qayta build kerak.
 * Brauzer kaliti baribir sahifada ko'rinadi; himoyasi — Yandex kabinetida
 * "HTTP Referer" cheklovi (`campusai.uz`). Repoga YOZILMAYDI.
 *
 * Sinash uchun majburlash: `NEXT_PUBLIC_MAP_PROVIDER=yandex` / `local`.
 */
export const YANDEX_MAPS_API_KEY = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY ?? "";

/** Yandex xaritasi ishlatiladigan domenlar. */
export const YANDEX_HOSTS = ["campusai.uz"];

export function isYandexHost(): boolean {
  const forced = process.env.NEXT_PUBLIC_MAP_PROVIDER;
  if (forced === "yandex") return true;
  if (forced === "local") return false;
  if (typeof window === "undefined") return false;
  const host = window.location.hostname.toLowerCase();
  return YANDEX_HOSTS.some((d) => host === d || host.endsWith(`.${d}`));
}
