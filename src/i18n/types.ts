import { uz } from "./uz";

/**
 * Lug'at shakli o'zbekcha faylga bog'langan — `uz.ts` ETALON.
 * `ru.ts`/`en.ts` shu tipga moslashadi, ya'ni kalit unutilsa `tsc` yiqiladi.
 */
export type Messages = typeof uz;

export const LANGS = ["uz", "ru", "en"] as const;
export type Lang = (typeof LANGS)[number];

export const DEFAULT_LANG: Lang = "uz";

/** Brauzer/cookie qiymatini tekshirish — noma'lum kod `uz` ga tushadi. */
export function isLang(v: unknown): v is Lang {
  return typeof v === "string" && (LANGS as readonly string[]).includes(v);
}

/** Cookie va localStorage kaliti — server (layout) ham shu nomni o'qiydi. */
export const LANG_STORAGE_KEY = "campus-lang";
