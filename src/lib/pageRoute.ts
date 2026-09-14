/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  BRAUZER TARIXI — qaysi bo'limda turganini eslab qolish              ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * Panel — bitta Next route (`/panel`), bo'limlar esa zustand'dagi
 * `activePage` bilan almashadi. Ya'ni brauzer uchun sahifa umuman
 * o'zgarmasdi: **"orqaga" tugmasi butun paneldan chiqib ketardi**, sahifa
 * yangilansa esa har safar "Boshqaruv paneli" ochilardi.
 *
 * Endi har bo'lim almashuvi tarixga BITTA yozuv qo'shadi:
 *   · **◀ orqaga** — bitta amal orqaga (oldingi bo'lim),
 *   · **▶ oldinga** — bitta amal oldinga,
 *   · **F5 / qayta ochish** — o'sha bo'lim qayta ochiladi.
 *
 * ── NEGA HASH (`/panel#kameralar`), query yoki route EMAS ─────────────
 * · **Route (`/panel/kameralar`)** — butun SPA'ni Next router'ga ko'chirish
 *   kerak bo'lardi; `activePage` esa ID sifatida butun kodga bog'langan
 *   (ovozli buyruqlar, global qidiruv, `App.tsx`) va CLAUDE.md bo'yicha
 *   O'ZGARTIRILMAYDI.
 * · **Query (`?p=…`)** — `history.pushState` bilan qo'yilsa App Router
 *   uni O'ZINIKI deb bilib route'ni qayta hisoblashi mumkin.
 * · **Hash** — Next router uni umuman e'tiborga olmaydi, serverga
 *   yuborilmaydi va `popstate` bilan mukammal ishlaydi.
 *
 * ⚠️ **`activePage` — o'zbekcha MATN** ("Geo Analitika") va u ID vazifasini
 * bajaradi. URL'ga shundoq yozilsa `%20` va apostroflar bilan o'qib
 * bo'lmas manzil chiqardi, shuning uchun pastdagi SLUG jadvali bor.
 * Jadvalda yo'q bo'lim URL'ga tushmaydi (lekin baribir ochiladi).
 */
import { MODAL_DEPTH_KEY } from "@/lib/modalHistory";

/** `activePage` → URL bo'lagi. Kalitlar `Sidebar.NAV_ITEMS` bilan bir xil. */
export const PAGE_SLUGS: Record<string, string> = {
  "Boshqaruv paneli": "boshqaruv",
  Ogohlantirishlar: "ogohlantirishlar",
  "AI tahlil": "ai-tahlil",
  Statistika: "statistika",
  Aniqlanganlar: "aniqlanganlar",
  Shaxslar: "shaxslar",
  Muassasalar: "muassasalar",
  Hodisalar: "hodisalar",
  "Geo Analitika": "geo",
  Kameralar: "kameralar",
  Hisobotlar: "hisobotlar",
  Sozlamalar: "sozlamalar",
};

/** Teskari jadval — URL bo'lagi → `activePage`. */
const SLUG_TO_PAGE: Record<string, string> = Object.fromEntries(
  Object.entries(PAGE_SLUGS).map(([page, slug]) => [slug, page])
);

/** Hech narsa ma'lum bo'lmaganda ochiladigan bo'lim. */
export const DEFAULT_PAGE = "Boshqaruv paneli";

/** Oxirgi bo'lim shu yerda saqlanadi (til/mavzu bilan ayni naqsh). */
const LS_KEY = "campus-page";

/** URL'dagi bo'lim (`/panel#kameralar`). Noma'lum bo'lsa `null`. */
export function pageFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  const slug = window.location.hash.replace(/^#/, "").trim();
  return slug ? (SLUG_TO_PAGE[slug] ?? null) : null;
}

/** `localStorage` dagi oxirgi bo'lim. */
export function savedPage(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(LS_KEY);
    return v && PAGE_SLUGS[v] ? v : null;
  } catch {
    /* private rejim / kvota — eslab qolish shunchaki ishlamaydi */
    return null;
  }
}

export function savePage(page: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_KEY, page);
  } catch {
    /* jim: eslab qolish ixtiyoriy imkoniyat */
  }
}

/**
 * OCHILISHDAGI bo'lim.
 *
 * Tartib MUHIM: **URL → `localStorage` → default**. URL ustun, chunki
 * havola bo'yicha kelingan bo'lishi mumkin (yoki "orqaga" bosilgan), va u
 * doim eng aniq niyat.
 */
export function initialPage(): string {
  return pageFromUrl() ?? savedPage() ?? DEFAULT_PAGE;
}

/**
 * URL'ni bo'limga moslash.
 *
 * @param replace `true` — tarixga YANGI yozuv qo'shmaydi (ochilishda
 *   manzilni to'g'rilash uchun; aks holda "orqaga" bosilganda birinchi
 *   bosish hech narsa qilmagandek tuyulardi).
 */
export function writePageToUrl(page: string, replace = false): void {
  if (typeof window === "undefined") return;
  const slug = PAGE_SLUGS[page];
  if (!slug) return;
  const url = `${window.location.pathname}${window.location.search}#${slug}`;
  /* ⚠️ Mavjud `history.state` KO'CHIRIB O'TKAZILADI (`null` emas).
     Next App Router o'zining ichki route ma'lumotini aynan shu yerda
     saqlaydi; biz uni `null` bilan almashtirsak, "orqaga" bosilganda
     router bo'sh holatni ko'rib route'ni qaytadan qurishi (yoki to'liq
     qayta yuklash) mumkin edi. Bizga esa faqat hash kerak. */
  /* Modal chuqurligi NOLGA tushadi: bo'lim yozuvi ochiq oynalar yozuvi
     USTIDAN qo'shiladi, ya'ni yangi bo'limda ochiq oyna yo'q
     (`lib/modalHistory.ts`). */
  const state = { ...(window.history.state ?? {}), [MODAL_DEPTH_KEY]: 0 };
  if (replace) window.history.replaceState(state, "", url);
  else window.history.pushState(state, "", url);
}
