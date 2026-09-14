import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { ChunkReloadGuard } from "@/components/common/ChunkReloadGuard";
import { I18nProvider } from "@/i18n/I18nProvider";
import { DEFAULT_LANG, DICTIONARIES, isLang, LANG_STORAGE_KEY } from "@/i18n";
import { DEFAULT_THEME, THEME_STORAGE_KEY, isTheme, schemeOf } from "@/theme/store";
import "@/index.css";

/**
 * Tilni SERVER tomonda cookie'dan o'qiymiz: `<html lang>`, metama'lumot va
 * `I18nProvider initial` shundan keladi. Aks holda sahifa hydration paytida
 * tilni almashtirib "sakraydi". Cookie o'qilgani uchun route dinamik render
 * bo'ladi — bu ataylab.
 */
function readLang() {
  const v = cookies().get(LANG_STORAGE_KEY)?.value;
  return isLang(v) ? v : DEFAULT_LANG;
}

/** Mavzu ham cookie'dan — sahifa qorong'i chizilib keyin oqarib ketmasin. */
function readTheme() {
  const v = cookies().get(THEME_STORAGE_KEY)?.value;
  return isTheme(v) ? v : DEFAULT_THEME;
}

export function generateMetadata(): Metadata {
  const m = DICTIONARIES[readLang()].meta;
  return { title: m.title, description: m.description };
}

export const viewport: Viewport = {
  themeColor: "#090B14",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const lang = readLang();
  const theme = readTheme();
  const scheme = schemeOf(theme);
  return (
    /* `data-scheme` — mavzu OILASI (`dark`/`light`). Butun CSS shunga
       bog'langan, `data-theme` esa aniq mavzu nomini saqlaydi
       (`theme/store.ts` tokenlarni shunga qarab yozadi). */
    <html
      lang={lang}
      data-theme={theme}
      data-scheme={scheme}
      className={scheme === "dark" ? "dark" : undefined}
    >
      {/* Shriftlar LOKAL (public/fonts) — Google Fonts CDN ataylab yo'q,
          loyiha ichki tarmoqda internetsiz ishlaydi. @font-face: src/index.css */}
      <head>
        <link rel="preload" href="/fonts/Inter-100_900-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body>
        {/* Eskirgan chunk → sahifani bir marta o'zi yangilaydi
            ("MIME type text/html" xatosi endi chiqmaydi) */}
        <ChunkReloadGuard />
        <I18nProvider initial={lang}>{children}</I18nProvider>
      </body>
    </html>
  );
}
