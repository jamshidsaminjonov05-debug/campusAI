"use client";

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { DICTIONARIES, getLang, setLang, subscribeLang } from "./store";
import { DEFAULT_LANG, type Lang, type Messages } from "./types";

interface I18nValue {
  lang: Lang;
  t: Messages;
  setLang: (l: Lang) => void;
}

const I18nContext = createContext<I18nValue>({
  lang: DEFAULT_LANG,
  t: DICTIONARIES[DEFAULT_LANG],
  setLang,
});

/**
 * Tilni React daraxtiga ulaydi.
 *
 * `initial` — server (`app/layout.tsx`) cookie'dan o'qigan til. U
 * `getServerSnapshot` sifatida ishlatiladi, shuning uchun SSR va birinchi
 * klient render bir xil chiqadi (hydration mismatch yo'q).
 */
export function I18nProvider({ initial, children }: { initial: Lang; children: ReactNode }) {
  const lang = useSyncExternalStore(subscribeLang, getLang, () => initial);

  // Cookie yo'q, lekin localStorage'da tanlov bor bo'lsa (masalan cookie
  // tozalangan) — mount'dan keyin cookie'ni tiklaymiz.
  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<I18nValue>(() => ({ lang, t: DICTIONARIES[lang], setLang }), [lang]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Joriy lug'at — komponentlar shundan matn oladi. */
export function useT(): Messages {
  return useContext(I18nContext).t;
}

/** Til kodi + almashtirish (til tanlagich uchun). */
export function useI18n(): I18nValue {
  return useContext(I18nContext);
}
