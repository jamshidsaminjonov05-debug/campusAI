"use client";

import { motion } from "framer-motion";
import { useCopy } from "../copy";
import { EASE, Typed } from "@/components/deck/ui";
import type { SlideProps } from "@/components/deck/types";

/**
 * 0 — UYG'ONISH.
 *
 * Qorong'ilikdan AI tug'iladi: markazda orb yig'iladi (`.orb-slot` —
 * `AiOrb` aynan shu katakka ko'chadi), so'ng nomi va vazifasi yoziladi.
 * Sarlavha va raqamlar KEYIN chiqadi — birinchi soniyalarda ekranda
 * faqat AI turadi.
 */

const NUMS = ["645", "14", "24/7", "6"];

export default function S0Intro({ active, t, fresh, at }: SlideProps) {
  const c = useCopy().intro;
  const show = (time: number) => !fresh || t >= time;

  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      {/* AI orbi shu katakka tushadi (o'lchami ham shundan olinadi) */}
      <motion.div
        initial={fresh ? { opacity: 0, scale: 0.6 } : false}
        animate={active ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 1.6, ease: EASE }}
        className="orb-slot h-[clamp(190px,22vh,260px)] w-[clamp(190px,22vh,260px)] flex-none"
      />

      <motion.div
        initial={fresh ? { opacity: 0, y: 18 } : false}
        animate={show(at[1] - 0.2) ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 1, ease: EASE }}
        className="mt-[clamp(18px,3vh,40px)]"
      >
        <h1 className="text-[clamp(44px,7.2vw,120px)] font-extralight leading-[0.95] tracking-[-0.055em] text-white">
          Campus
          <span className="ml-[0.18em] bg-gradient-to-r from-ice-bright via-ice to-ice-cyan bg-clip-text text-transparent">
            AI
          </span>
        </h1>
      </motion.div>

      <div className="mt-6 min-h-[3.2em] max-w-[880px] text-[clamp(15px,1.45vw,23px)] font-light leading-[1.5] text-slate-300">
        {show(at[1]) && <Typed run={fresh} speed={26} text={c.sub} />}
      </div>

      <motion.div
        initial={fresh ? { opacity: 0 } : false}
        animate={show(at[2]) ? { opacity: 1 } : {}}
        transition={{ duration: 1.1 }}
        className="mt-[clamp(30px,5vh,64px)] w-full max-w-[980px] border-t border-white/10 pt-8"
      >
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {c.stats.map((label, i) => (
            <motion.div
              key={label}
              initial={fresh ? { opacity: 0, y: 14 } : false}
              animate={show(at[2] + i * 0.18) ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, ease: EASE }}
            >
              <p className="text-[clamp(24px,2.4vw,40px)] font-light tracking-[-0.04em] text-ice">{NUMS[i]}</p>
              <p className="mt-1 text-[12.5px] leading-snug text-slate-400">{label}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
