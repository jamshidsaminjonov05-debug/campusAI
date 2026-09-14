import { uz } from "./uz";
import { ru } from "./ru";
import { en } from "./en";
import { DEFAULT_LANG, isLang, LANG_STORAGE_KEY, type Lang, type Messages } from "./types";

/**
 * Til holati — React'dan TASHQARIDA yashaydigan kichik store.
 *
 * Nega zustand emas: lug'at React'ga bog'liq bo'lmagan joylarda ham kerak
 * (`lib/api.ts` xato matnlari, `VoiceExecutor` javoblari, `global-error`).
 * Shuning uchun manba shu modulda, React esa `useSyncExternalStore` bilan
 * unga obuna bo'ladi (`I18nProvider`).
 *
 * DIQQAT — tanlov cookie'ga ham yoziladi: `app/layout.tsx` (server komponent)
 * uni o'qib `<html lang>` va SSR lug'atini to'g'ri beradi, aks holda landing
 * sahifasi hydration'da tilni almashtirib "sakraydi".
 */
export const DICTIONARIES: Record<Lang, Messages> = { uz, ru, en };

function readInitialLang(): Lang {
  if (typeof document === "undefined") return DEFAULT_LANG;
  const fromCookie = document.cookie.match(/(?:^|;\s*)campus-lang=([^;]+)/)?.[1];
  if (isLang(fromCookie)) return fromCookie;
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    if (isLang(stored)) return stored;
  } catch {
    /* localStorage yopiq — default qoladi */
  }
  return DEFAULT_LANG;
}

let currentLang: Lang = readInitialLang();
const listeners = new Set<() => void>();

export function getLang(): Lang {
  return currentLang;
}

/** React'siz kod uchun joriy lug'at (`tr().api.noConnection` kabi). */
export function tr(): Messages {
  return DICTIONARIES[currentLang];
}

export function setLang(next: Lang): void {
  if (next === currentLang) return;
  currentLang = next;
  if (typeof document !== "undefined") {
    document.documentElement.lang = next;
    // 1 yil — brauzer yopilsa ham tanlov qoladi
    document.cookie = `${LANG_STORAGE_KEY}=${next}; path=/; max-age=31536000; samesite=lax`;
    try {
      localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      /* saqlanmasa ham sessiya davomida ishlaydi */
    }
  }
  for (const fn of listeners) fn();
}

export function subscribeLang(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
