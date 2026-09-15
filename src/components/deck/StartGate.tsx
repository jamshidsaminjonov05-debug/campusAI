"use client";

import { motion } from "framer-motion";
import { Play } from "lucide-react";
import { DECK_LANGS, type DeckCopyBase, type DeckLang } from "./types";
import { EASE } from "./ui";

/**
 * Boshlash ekrani.
 *
 * Nega kerak: taqdimot OVOZLI, brauzer esa foydalanuvchi biror narsani
 * bosmaguncha ovozni ijro etmaydi. Agar shou o'z-o'zidan boshlansa,
 * birinchi slaydning nutqi yo'qolib ketardi. Bitta bosish — va butun
 * sahna, ovoz bilan birga, boshidan oqadi.
 *
 * Shu yerda til ham tanlanadi: matn, ovoz va animatsiya vaqtlari
 * o'sha tilnikiga o'tadi.
 *
 * `?slayd=N` bilan kirilganda bu ekran CHIQMAYDI — deep-link repetitsiya
 * va savol-javob uchun, u yerda ovoz emas, kadr kerak bo'ladi.
 */
export default function StartGate({
  lang,
  copies,
  onLang,
  onStart,
}: {
  lang: DeckLang;
  copies: Record<DeckLang, DeckCopyBase>;
  onLang: (l: DeckLang) => void;
  onStart: () => void;
}) {
  const gate = copies[lang].gate;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      className="absolute inset-0 z-50 grid place-items-center bg-[#05080f]/88 backdrop-blur-sm"
    >
      <div className="flex flex-col items-center px-8 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: EASE }}
          className="text-[clamp(34px,5vw,74px)] font-extralight leading-none tracking-[-0.055em] text-white"
        >
          Campus
          <span className="ml-[0.18em] bg-gradient-to-r from-ice-bright via-ice to-ice-cyan bg-clip-text text-transparent">AI</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.2 }}
          className="mt-4 max-w-[640px] text-[15px] leading-[1.55] text-slate-400"
        >
          {gate.sub}
        </motion.p>

        {/* til tanlash */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35, ease: EASE }}
          className="mt-9 flex items-center gap-2 rounded-full border border-white/[0.12] p-1"
        >
          {DECK_LANGS.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => onLang(l)}
              className={`rounded-full px-5 py-2 text-[13.5px] font-medium transition-colors duration-300 ${
                l === lang ? "bg-ice text-[#06101f]" : "text-slate-400 hover:text-ice"
              }`}
            >
              {copies[l].langLabel}
            </button>
          ))}
        </motion.div>

        <motion.button
          type="button"
          onClick={onStart}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5, ease: EASE }}
          className="group mt-6 inline-flex items-center gap-3 rounded-full border border-ice/45 bg-ice/[0.08] px-9 py-4 text-[16px] font-medium text-white transition-all duration-300 hover:scale-[1.03] hover:border-ice hover:bg-ice/[0.16]"
        >
          <span className="grid h-8 w-8 place-items-center rounded-full bg-ice text-[#06101f]">
            <Play size={15} fill="currentColor" className="ml-0.5" />
          </span>
          {gate.start}
        </motion.button>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mt-7 font-mono text-[10.5px] uppercase tracking-[0.28em] text-slate-600"
        >
          {gate.note}
        </motion.p>
      </div>
    </motion.div>
  );
}
