"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowCounterClockwise, Check, Moon, Palette, Sun, X } from "@phosphor-icons/react";
import {
  THEMES,
  getAccent,
  getTheme,
  hydrateTheme,
  setAccent,
  schemeOf,
  setTheme,
  subscribeTheme,
  type Scheme,
  type Theme,
} from "./store";

export * from "./store";

/** Joriy mavzu — React komponentlari uchun. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribeTheme, getTheme, () => "dark" as Theme);
}

/**
 * Mavzu OILASI — `"dark"` yoki `"light"`.
 *
 * Ranglar jadvali (`C3D_PALETTE`, `PLAN_PALETTE`, xarita uslubi…) faqat
 * ikki holatni biladi, shuning uchun ular aniq mavzu emas, SHU qiymatni
 * ishlatadi: "Qum" mavzusi ham yorug' sxemada chiziladi.
 */
export function useScheme(): Scheme {
  return schemeOf(useTheme());
}

/** Tanlangan urg'u rangi (`null` — mavzu o'z rangi). */
export function useAccent(): string | null {
  return useSyncExternalStore(subscribeTheme, getAccent, () => null);
}

/**
 * Tayyor urg'u ranglari — tanlagichdagi doiralar.
 *
 * Har biri oq fonda ham, qorong'ida ham o'qiladigan darajada TO'Q: och
 * ranglar matn urg'usi sifatida yuvilib ketardi.
 */
const ACCENTS = [
  "#1d4ed8",
  "#0f766e",
  "#047857",
  "#9a3412",
  "#b91c1c",
  "#6d28d9",
  "#be185d",
  "#0369a1",
];

/**
 * Mavzu tugmasi + O'NG PANEL.
 *
 * ⚠️ Ilgari bu oddiy almashtirgich edi (dark ↔ light). Endi oltita mavzu
 * bor, shuning uchun bosilganda o'ng tomondan panel ochiladi: mavzu
 * kartochkalari va urg'u rangi tanlovi. Tanlov `localStorage` + cookie'da
 * saqlanadi (`theme/store.ts`).
 */
export function ThemeSwitcher({ className = "" }: { className?: string }) {
  const theme = useTheme();
  const accent = useAccent();
  const [open, setOpen] = useState(false);

  /* SSR faqat `data-theme` ni qo'yadi; tokenlar (`--lm-*`) klientda
     qo'llanadi — usiz yangi mavzular kunduzgi ranglar bilan chiqardi. */
  useEffect(() => {
    hydrateTheme();
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const dark = theme === "dark";

  const panel = (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[95] bg-[#03060E]/55 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: 340, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 340, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            role="dialog"
            aria-label="Mavzu sozlamalari"
            className="theme-panel fixed right-0 top-0 z-[96] flex h-full w-[330px] max-w-[92vw] flex-col gap-4 p-4"
          >
            <header className="flex flex-none items-center gap-2">
              <Palette size={18} weight="duotone" className="text-ice-soft" />
              <p className="text-[13px] font-bold">Ko&apos;rinish</p>
              <button
                onClick={() => setOpen(false)}
                className="ml-auto text-slate-400 hover:text-white"
                title="Yopish"
              >
                <X size={16} />
              </button>
            </header>

            {/* ── Mavzular ── */}
            <section className="flex-none">
              <p className="mb-2 text-[10px] uppercase tracking-wider text-ice-cyan/70">Mavzu</p>
              <div className="grid grid-cols-2 gap-2">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTheme(t.id)}
                    className={`flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-colors ${
                      theme === t.id
                        ? "border-ice/70 bg-ice/[0.12]"
                        : "border-white/[0.1] bg-white/[0.03] hover:border-white/25"
                    }`}
                  >
                    <span
                      className="grid h-7 w-7 flex-none place-items-center rounded-lg border border-white/20"
                      style={{ background: t.swatch }}
                    >
                      {theme === t.id && <Check size={13} weight="bold" className="text-[#0b1524]" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[11.5px] font-semibold">{t.label}</span>
                      <span className="block text-[9px] uppercase tracking-wide text-slate-500">
                        {t.scheme === "dark" ? "qorong'i" : "yorug'"}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {/* ── Urg'u rangi ── */}
            <section className="flex-none">
              <p className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-wider text-ice-cyan/70">
                Urg&apos;u rangi
                {accent && (
                  <button
                    type="button"
                    onClick={() => setAccent(null)}
                    title="Mavzu rangiga qaytarish"
                    className="ml-auto flex items-center gap-1 normal-case tracking-normal text-slate-400 hover:text-white"
                  >
                    <ArrowCounterClockwise size={11} />
                    Asliga
                  </button>
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                {ACCENTS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setAccent(c)}
                    title={c}
                    className={`grid h-8 w-8 place-items-center rounded-lg border-2 transition-transform hover:scale-110 ${
                      accent === c ? "border-white" : "border-white/20"
                    }`}
                    style={{ background: c }}
                  >
                    {accent === c && <Check size={13} weight="bold" className="text-white" />}
                  </button>
                ))}
                {/* O'z rangi — brauzer tanlagichi */}
                <label
                  title="O'z rangingiz"
                  className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg border-2 border-dashed border-white/30 text-[10px] text-slate-400 hover:border-ice/60 hover:text-white"
                >
                  +
                  <input
                    type="color"
                    value={accent ?? "#1d4ed8"}
                    onChange={(e) => setAccent(e.target.value)}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="mt-2 text-[9.5px] leading-snug text-slate-500">
                Urg&apos;u rangi mavzu rangidan ustun turadi va brauzeringizda saqlanadi.
              </p>
            </section>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Ko'rinish sozlamalari"
        aria-label="Ko'rinish sozlamalari"
        className={`grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.05] text-slate-300 transition-colors hover:border-ice/45 hover:text-white ${className}`}
      >
        {dark ? <Moon size={15} weight="duotone" /> : <Sun size={15} weight="duotone" />}
      </button>
      {typeof document !== "undefined" && createPortal(panel, document.body)}
    </>
  );
}
