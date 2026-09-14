"use client";

import { Globe } from "lucide-react";
import { LANGS, useI18n, type Lang } from "@/i18n";

/**
 * Til tanlagich — UZ / RU / EN.
 *
 * Ikki ko'rinish: `panel` (monitoring header'i, ixcham) va `landing`
 * (ommaviy sahifa va login, kattaroq). Tanlov cookie + localStorage'da
 * saqlanadi (`src/i18n/store.ts`), shuning uchun sahifa yangilansa qoladi.
 */
export function LanguageSwitcher({ variant = "panel" }: { variant?: "panel" | "landing" }) {
  const { lang, t, setLang } = useI18n();

  const wrap =
    variant === "landing"
      ? "flex items-center gap-0.5 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-1 backdrop-blur-xl"
      : "flex items-center gap-0.5 rounded border border-white/10 p-0.5";

  const item = (active: boolean) =>
    variant === "landing"
      ? `rounded-xl px-2.5 py-1.5 text-[11.5px] font-bold transition-colors ${
          active ? "bg-gradient-to-b from-[#B7CFFF] to-[#7FA6F2] text-[#0A0F1E]" : "text-slate-400 hover:text-slate-100"
        }`
      : `rounded px-1.5 py-1 text-[10.5px] font-bold transition-colors ${
          active ? "bg-cyan-400/20 text-cyan-200" : "text-slate-500 hover:text-slate-200"
        }`;

  return (
    <div className={wrap} title={t.lang.switch} role="group" aria-label={t.lang.switch}>
      {variant === "panel" && <Globe size={13} className="ml-1 flex-none text-slate-500" />}
      {LANGS.map((code: Lang) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
          title={t.lang[code]}
          className={item(lang === code)}
        >
          {t.lang.short[code]}
        </button>
      ))}
    </div>
  );
}
