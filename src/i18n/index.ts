/**
 * i18n yagona kirish nuqtasi.
 *
 *  - React ichida:  `const t = useT();`  → `t.common.loading`
 *  - React'dan tashqarida: `tr().api.noConnection` (lib/, services/)
 *  - Tilni almashtirish: `useI18n().setLang("ru")`
 */
export { I18nProvider, useI18n, useT } from "./I18nProvider";
export { DICTIONARIES, getLang, setLang, subscribeLang, tr } from "./store";
export { DEFAULT_LANG, isLang, LANG_STORAGE_KEY, LANGS, type Lang, type Messages } from "./types";
