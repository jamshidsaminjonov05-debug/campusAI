import type { Metadata } from "next";
import { cookies } from "next/headers";
import { DEFAULT_LANG, DICTIONARIES, isLang, LANG_STORAGE_KEY, type Lang } from "@/i18n";

/**
 * Server tomonda tilni cookie'dan o'qish (`app/layout.tsx` dagi bilan AYNI
 * qoida). Faqat server komponentlar / `generateMetadata` uchun.
 */
export function readLangCookie(): Lang {
  const v = cookies().get(LANG_STORAGE_KEY)?.value;
  return isLang(v) ? v : DEFAULT_LANG;
}

/** Ommaviy sayt ichki sahifasi sarlavhasi: "Narxlar · Campus AI" */
export function sitePageMetadata(key: "product" | "campus" | "docs" | "about" | "pricing"): Metadata {
  const m = DICTIONARIES[readLangCookie()];
  return { title: `${m.landing.nav[key]} · Campus AI`, description: m.meta.description };
}
