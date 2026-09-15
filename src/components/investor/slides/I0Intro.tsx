"use client";

import { motion } from "framer-motion";
import { useCopy } from "../copy";
import { useCurrency } from "../currency";
import { TAM_YEAR, num, totalInst, totalStudents } from "../model";
import { EASE, Typed } from "@/components/deck/ui";
import type { SlideProps } from "@/components/deck/types";

/**
 * 0 — KIRISH.
 *
 * Investor birinchi o'n soniyada ikki narsani bilishi kerak: bu nima
 * haqida va kattaligi qanday. Shuning uchun sarlavha qisqa, ostida esa
 * darhol to'rtta raqam — bozor, auditoriya, hajm va so'rov.
 *
 * Raqamlar `model.ts` dan keladi, matnda qotib yozilmagan.
 */
export default function I0Intro({ active, t, fresh, at }: SlideProps) {
  const c = useCopy().intro;
  const { m } = useCurrency();
  const show = (time: number) => !fresh || t >= time;

  const tam = m(TAM_YEAR);
  /* Oxirgi raqam ATAYLAB "1": taqdimotning butun og'irligi shu yerda —
     tizim hozir HAQIQATAN bitta maktabda ishlab turibdi. */
  const stats = [
    { value: num(totalInst()), unit: "" },
    { value: (totalStudents() / 1_000_000).toFixed(2).replace(".", ","), unit: "mln" },
    { value: tam.value, unit: tam.unit },
    { value: "1", unit: "" },
  ];

  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      {/* AI orbi shu katakka tushadi (o'lchami ham shundan olinadi) */}
      <motion.div
        initial={fresh ? { opacity: 0, scale: 0.6 } : false}
        animate={active ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 1.5, ease: EASE }}
        className="orb-slot h-[clamp(150px,18vh,210px)] w-[clamp(150px,18vh,210px)] flex-none"
      />

      {/* ⚠️ Kicker ("Investorlar uchun") ATAYLAB yo'q: taqdimot havola
          orqali tarqatiladi va kimga mo'ljallangani baribir ma'lum, ekranda
          esa u birinchi jumlaning kuchini susaytirardi. */}
      <motion.h1
        initial={fresh ? { opacity: 0, y: 18 } : false}
        animate={show(at[1] - 0.2) ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 1, ease: EASE }}
        className="mt-[clamp(16px,2.8vh,34px)] text-[clamp(32px,5.4vw,84px)] font-extralight leading-[1.02] tracking-[-0.05em] text-white"
      >
        {c.titleA}
        <span className="ml-[0.3em] bg-gradient-to-r from-ice-bright via-ice to-ice-cyan bg-clip-text text-transparent">
          {c.titleB}
        </span>
      </motion.h1>

      <div className="mt-5 min-h-[3em] max-w-[900px] text-[clamp(14px,1.3vw,20px)] font-light leading-[1.5] text-slate-300">
        {show(at[1]) && <Typed run={fresh} speed={24} text={c.sub} />}
      </div>

      <motion.div
        initial={fresh ? { opacity: 0 } : false}
        animate={show(at[2]) ? { opacity: 1 } : {}}
        transition={{ duration: 1.1 }}
        className="mt-[clamp(26px,4.5vh,58px)] w-full max-w-[1020px] border-t border-white/10 pt-7"
      >
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {c.stats.map((label, i) => (
            <motion.div
              key={label}
              initial={fresh ? { opacity: 0, y: 14 } : false}
              animate={show(at[2] + i * 0.18) ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, ease: EASE }}
            >
              <p className="text-[clamp(21px,2.2vw,36px)] font-light leading-none tracking-[-0.04em] text-ice">
                {stats[i].value}
                {stats[i].unit && <span className="ml-1 text-[0.5em] text-ice/70">{stats[i].unit}</span>}
              </p>
              <p className="mt-2 text-[12px] leading-snug text-slate-400">{label}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
