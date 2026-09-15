"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, LayoutDashboard, Send } from "lucide-react";
import { TELEGRAM_ORDER_URL } from "@/components/site/ui";
import { useCopy } from "../copy";
import { EASE, Typed } from "@/components/deck/ui";
import type { SlideProps } from "@/components/deck/types";

/**
 * 15 — YAKUN.
 *
 * Orb yana markazga qaytadi: shou u bilan boshlanib, u bilan tugaydi.
 * Ostida ikkita yo'l — panelni ochish yoki bog'lanish.
 */
export default function S15Finale({ t, fresh, at }: SlideProps) {
  const c = useCopy().finale;
  const show = (time: number) => !fresh || t >= time;

  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <motion.div
        initial={fresh ? { opacity: 0, scale: 0.7 } : false}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.3, ease: EASE }}
        className="orb-slot h-[clamp(170px,20vh,232px)] w-[clamp(170px,20vh,232px)] flex-none"
      />

      <h2 className="mt-[clamp(16px,3vh,36px)] text-[clamp(30px,4.4vw,72px)] font-extralight leading-[1.06] tracking-[-0.05em] text-white">
        {c.titleA}
        <br />
        <span className="bg-gradient-to-r from-ice-bright via-ice to-ice-cyan bg-clip-text text-transparent">{c.titleB}</span>
      </h2>

      <div className="mt-6 min-h-[1.8em] text-[clamp(14px,1.3vw,20px)] font-light text-slate-400">
        {show(at[1]) && <Typed run={fresh} speed={28} text={c.sub} />}
      </div>

      <motion.div
        initial={fresh ? { opacity: 0, y: 18 } : false}
        animate={show(at[2]) ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, ease: EASE }}
        className="mt-[clamp(26px,4.5vh,54px)] flex flex-wrap items-center justify-center gap-4"
      >
        <a
          href="/panel"
          className="group inline-flex items-center gap-2.5 rounded-full bg-ice px-8 py-3.5 text-[15px] font-semibold text-[#06101f] transition-transform duration-300 hover:scale-[1.04]"
        >
          <LayoutDashboard size={17} />
          {c.ctaPanel}
          <ArrowUpRight size={16} className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </a>
        <a
          href={TELEGRAM_ORDER_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2.5 rounded-full border border-white/20 px-8 py-3.5 text-[15px] font-medium text-white transition-colors duration-300 hover:border-ice/60 hover:text-ice"
        >
          <Send size={16} />
          {c.ctaOrder}
        </a>
        <a href="/mahsulot" className="inline-flex items-center gap-2 text-[14px] text-slate-400 underline-offset-4 transition-colors hover:text-ice hover:underline">
          {c.ctaProduct}
        </a>
      </motion.div>

      <motion.p
        initial={fresh ? { opacity: 0 } : false}
        animate={show(at[2] + 1) ? { opacity: 1 } : {}}
        transition={{ duration: 1 }}
        className="mt-10 font-mono text-[11px] uppercase tracking-[0.32em] text-slate-600"
      >
        {c.foot}
      </motion.p>
    </div>
  );
}
