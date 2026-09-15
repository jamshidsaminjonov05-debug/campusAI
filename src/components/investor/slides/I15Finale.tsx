"use client";

import { motion } from "framer-motion";
import { ArrowRight, Check, Globe, MonitorPlay } from "lucide-react";
import { useCopy } from "../copy";
import { EASE } from "@/components/deck/ui";
import type { SlideProps } from "@/components/deck/types";

/**
 * 15 — YAKUN.
 *
 * Orb yana markazga qaytadi (`.orb-slot`) — taqdimot qayerdan boshlangan
 * bo'lsa, o'sha yerda tugaydi.
 *
 * Uchta xulosa nuqtasi — taqdimotning uchta ustuni: qonun majburiyati,
 * ishlab turgan mahsulot, bo'sh bozor. Investor zaldan aynan shu uchtasini
 * olib chiqishi kerak.
 *
 * ⚠️ Bu yerda ham pul so'ralmaydi — faqat bog'lanish taklifi.
 *
 * `cue` — ovoz bo'lagi indeksi (`copy.narration`).
 */
export default function I15Finale({ active, t, fresh, at }: SlideProps) {
  const c = useCopy().finale;
  const show = (cue: number) => !fresh || t >= (at[cue] ?? 0);

  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <motion.div
        initial={fresh ? { opacity: 0, scale: 0.7 } : false}
        animate={active ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 1.3, ease: EASE }}
        className="orb-slot h-[clamp(110px,14vh,170px)] w-[clamp(110px,14vh,170px)] flex-none"
      />

      <motion.h2
        initial={fresh ? { opacity: 0, y: 16 } : false}
        animate={show(1) ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.9, ease: EASE }}
        className="mt-[clamp(14px,2.6vh,32px)] text-[clamp(25px,3.8vw,60px)] font-extralight leading-[1.08] tracking-[-0.05em] text-white"
      >
        {c.titleA}
        <br />
        <span className="bg-gradient-to-r from-ice-bright via-ice to-ice-cyan bg-clip-text text-transparent">
          {c.titleB}
        </span>
      </motion.h2>

      <motion.p
        initial={fresh ? { opacity: 0 } : false}
        animate={show(1) ? { opacity: 1 } : {}}
        transition={{ duration: 0.9, delay: 0.25 }}
        className="mt-4 max-w-[740px] text-[clamp(12.5px,1.15vw,17px)] font-light leading-[1.5] text-slate-400"
      >
        {c.sub}
      </motion.p>

      {/* ── uchta xulosa ── */}
      <motion.div
        initial={fresh ? { opacity: 0, y: 14 } : false}
        animate={show(1) ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, delay: 0.35, ease: EASE }}
        className="mt-[clamp(18px,3.2vh,40px)] flex w-full max-w-[920px] flex-wrap items-stretch justify-center gap-2.5"
      >
        {c.points.map((p, i) => (
          <motion.span
            key={p}
            initial={fresh ? { opacity: 0, y: 10 } : false}
            animate={show(1) ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: fresh ? 0.12 * i + 0.4 : 0, ease: EASE }}
            className="flex flex-1 basis-[240px] items-start gap-2.5 rounded-xl border border-ice/25 bg-ice/[0.06] px-4 py-3 text-left text-[12px] leading-snug text-slate-200"
          >
            <Check size={14} className="mt-[2px] flex-none text-ice" strokeWidth={2.4} />
            {p}
          </motion.span>
        ))}
      </motion.div>

      {/* ── harakat tugmalari ── */}
      <motion.div
        initial={fresh ? { opacity: 0, y: 14 } : false}
        animate={show(2) ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, ease: EASE }}
        className="mt-[clamp(18px,3.2vh,40px)] flex flex-wrap items-center justify-center gap-3"
      >
        <a
          href="https://t.me/campusai"
          target="_blank"
          rel="noreferrer"
          className="group inline-flex items-center gap-2.5 rounded-full border border-ice/45 bg-ice/[0.1] px-7 py-3.5 text-[14.5px] font-medium text-white transition-all duration-300 hover:scale-[1.03] hover:border-ice hover:bg-ice/[0.18]"
        >
          {c.ctaTalk}
          <ArrowRight size={15} className="transition-transform duration-300 group-hover:translate-x-1" />
        </a>
        <a
          href="/taqdimot"
          className="inline-flex items-center gap-2 rounded-full border border-white/[0.14] px-6 py-3.5 text-[13.5px] text-slate-300 transition-colors duration-300 hover:border-ice/50 hover:text-ice"
        >
          <MonitorPlay size={14} />
          {c.ctaDeck}
        </a>
        <a
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-white/[0.14] px-6 py-3.5 text-[13.5px] text-slate-300 transition-colors duration-300 hover:border-ice/50 hover:text-ice"
        >
          <Globe size={14} />
          {c.ctaSite}
        </a>
      </motion.div>

      <motion.p
        initial={fresh ? { opacity: 0 } : false}
        animate={show(2) ? { opacity: 1 } : {}}
        transition={{ duration: 0.9, delay: 0.4 }}
        className="mt-5 font-mono text-[10px] uppercase tracking-[0.24em] text-slate-600"
      >
        {c.foot}
      </motion.p>
    </div>
  );
}
