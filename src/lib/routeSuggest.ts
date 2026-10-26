/**
 * NOTO'G'RI YOZILGAN MANZIL → ENG YAQIN SAHIFA (2026-10-26).
 *
 * Foydalanuvchi: "`/panelcha` kabi xato yozilsa ham to'g'rilab qo'yish kerak,
 * eng qulay usul bilan". `app/not-found.tsx` shu funksiya bilan manzilni
 * taxmin qiladi va o'sha sahifaga DARHOL o'tkazadi (404 ekrani ko'rinmaydi).
 *
 * Qoida (sof funksiya, test — `routeSuggest.test.ts`):
 *   · birinchi bo'lak sayt sahifasiga (`mahsulot`, `narxlar`…) yoki panel
 *     bo'limiga (`kameralar` → `/panel#kameralar`) yaqin bo'lsa — o'sha;
 *   · `/panel…` bilan boshlansa (`/panelcha`, `/panell`) — panel; ikkinchi
 *     bo'lak bo'lim bo'lsa (`/panel/kamerlar`) — `/panel#kameralar`;
 *   · "yaqin" = to'liq mos / boshi mos (kamida 3 harf) / tahrir masofasi
 *     kichik (har 4 harfga 1 xato; qo'shni harflar almashuvi — 1 xato);
 *   · hech narsaga o'xshamasa — `null` (sahifa bosh sahifaga yo'naltiradi).
 */
import { PAGE_SLUGS } from "@/lib/pageRoute";

/** Saytning o'z sahifalari (`app/<papka>`). Yangi sahifa qo'shilsa — shu ro'yxatga. */
const SITE_ROUTES = ["panel", "mahsulot", "campus-qoriqlash", "investor", "biz-haqimizda", "narxlar", "tizim-test"];

const PANEL_SLUGS = Object.values(PAGE_SLUGS);

/** Tahrir masofasi (Damerau–Levenshtein, OSA) — qo'shni ikki harf o'rni
 *  almashgani ("pnael") BITTA xato hisoblanadi. Kichik so'zlar uchun yetarli tez. */
export function editDistance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

/** Eng yaqin nomzod (yoki `null`). */
function closest(word: string, candidates: string[]): string | null {
  if (!word) return null;
  let best: string | null = null;
  let bestScore = Infinity;
  for (const c of candidates) {
    if (word === c) return c;
    /* Boshi mos — "panelcha" → "panel", "kamera" → "kameralar" */
    const prefix = (word.length >= 3 && c.startsWith(word)) || (c.length >= 3 && word.startsWith(c));
    const d = editDistance(word, c);
    const ok = prefix || d <= Math.max(1, Math.floor(c.length / 4));
    const score = prefix ? Math.abs(word.length - c.length) * 0.1 : d;
    if (ok && score < bestScore) {
      best = c;
      bestScore = score;
    }
  }
  return best;
}

/** Noto'g'ri yo'l uchun to'g'ri manzil (`/panel`, `/panel#kameralar`, `/narxlar`…) yoki `null`. */
export function suggestRoute(pathname: string): string | null {
  const parts = decodeURIComponent(pathname)
    .toLowerCase()
    .split("/")
    .map((p) => p.trim())
    .filter(Boolean);
  const [first, second] = parts;
  if (!first) return null;

  const site = closest(first, SITE_ROUTES);
  const slug = closest(first, PANEL_SLUGS);

  if (site === "panel") {
    const sub = second ? closest(second, PANEL_SLUGS) : null;
    return sub ? `/panel#${sub}` : "/panel";
  }
  /* Ikkalasi ham mos kelsa — aniqrog'i (masofasi kichigi) */
  if (site && slug) return editDistance(first, site) <= editDistance(first, slug) ? `/${site}` : `/panel#${slug}`;
  if (site) return `/${site}`;
  if (slug) return `/panel#${slug}`;
  return null;
}
