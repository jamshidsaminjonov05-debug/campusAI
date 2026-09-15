"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { FX, money, moneyLine, num, type Currency } from "./model";
import { useCopy } from "./copy";

/**
 * VALYUTA — so'm ⇄ dollar.
 *
 * Nega kerak: mahalliy investor "145 milliard so'm" ni o'qiydi, chet el
 * investoriga esa bu raqam hech narsa demaydi. Bitta tugma butun
 * taqdimotdagi har bir summani almashtiradi.
 *
 * Model ICHKARIDA doim so'mda hisoblanadi (`model.ts`), dollar faqat
 * ko'rsatishda hosil qilinadi — shunda kurs o'zgarsa bitta konstanta
 * yetadi va hech bir slaydga tegilmaydi.
 */

type Ctx = {
  cur: Currency;
  setCur: (c: Currency) => void;
  /** Summani ikki bo'lakka ajratib qaytaradi: qiymat va birlik */
  m: (soms: number) => { value: string; unit: string };
  /** Bitta qatorda: "145 mlrd so'm" */
  ml: (soms: number) => string;
};

const CurrencyContext = createContext<Ctx>({
  cur: "uzs",
  setCur: () => {},
  m: (s) => money(s, "uzs"),
  ml: (s) => moneyLine(s, "uzs"),
});

const KEY = "campus-ai:investor-valyuta";

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [cur, setCurState] = useState<Currency>("uzs");

  /* Tanlov saqlanadi: taqdimotchi repetitsiyada dollarni tanlagan bo'lsa,
     sahifa qayta ochilganda yana so'mga qaytib qolmasin. */
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(KEY);
      if (saved === "usd" || saved === "uzs") setCurState(saved);
    } catch {
      /* localStorage yopiq bo'lishi mumkin */
    }
  }, []);

  const setCur = useCallback((c: Currency) => {
    setCurState(c);
    try {
      window.localStorage.setItem(KEY, c);
    } catch {
      /* saqlanmasa ham taqdimot ishlayveradi */
    }
  }, []);

  /* `C` tugmasi — taqdimotchi savol-javob paytida tez almashtira olsin */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      /* Boshqaruv elementi fokusda bo'lsa tugma o'shaniki (`Deck` da ham
         xuddi shu qoida) */
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (e.key === "c" || e.key === "C" || e.key === "с" || e.key === "С") {
        setCur(cur === "uzs" ? "usd" : "uzs");
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [cur, setCur]);

  const value: Ctx = {
    cur,
    setCur,
    m: (soms) => money(soms, cur),
    ml: (soms) => moneyLine(soms, cur),
  };

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export const useCurrency = (): Ctx => useContext(CurrencyContext);

/**
 * Boshqaruv panelidagi almashtirgich. `Deck` uni pastki qatorga qo'yadi,
 * shuning uchun u har bir slaydda qo'l ostida turadi.
 */
export function CurrencySwitch() {
  const { cur, setCur } = useCurrency();
  const c = useCopy();

  return (
    <span
      title={`${c.currencyHint} (C) · ${c.fxNote.replace("{rate}", num(FX))}`}
      className="inline-flex items-center rounded-full border border-white/[0.12] p-[3px] font-mono text-[10.5px] uppercase tracking-[0.16em]"
    >
      {(["uzs", "usd"] as Currency[]).map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => setCur(k)}
          className={`rounded-full px-2.5 py-[5px] transition-colors duration-300 ${
            k === cur ? "bg-ice text-[#06101f]" : "text-slate-400 hover:text-ice"
          }`}
        >
          {k === "uzs" ? "so'm" : "$"}
        </button>
      ))}
    </span>
  );
}
