"use client";

import { motion } from "framer-motion";
import { ArrowRight, Check, X } from "lucide-react";
import { useCopy } from "../copy";
import { EASE, Glass, SlideTitle, Stage } from "@/components/deck/ui";
import type { SlideProps } from "@/components/deck/types";

/**
 * 13 — AFZALLIKLAR: oddiy videokuzatuv ↔ Campus AI.
 *
 * Qator IKKI BOSQICHDA ochiladi — bu slaydning butun ma'nosi shunda:
 *   1) avval CHAP karta yonadi — bugungi holat, muammo. U qizg'ish rangda
 *      va aynan shu payt diqqat markazida turadi;
 *   2) `FLIP_S` soniyadan keyin o'q yuguradi va yonish O'NGGA ko'chadi:
 *      chap karta so'nadi, Campus AI kartasi yorishadi.
 *
 * Shuning uchun zal farqni o'qimaydi — almashuvni KO'RADI.
 *
 * `ROW_CUE` — qaysi ovoz bo'lagida boshlanishi (oltita qator, beshta bo'lak).
 */
const ROW_CUE = [0, 1, 2, 3, 3, 4];

/** Chap kartadan o'ngga o'tish kechikishi, sekund */
const FLIP_S = 1.5;

export default function S13Advantages({ t, fresh, at }: SlideProps) {
  const c = useCopy().advantages;
  const show = (time: number) => !fresh || t >= time;
  const last = at[at.length - 1] ?? 0;

  return (
    <Stage>
      <SlideTitle kicker={c.kicker} title={c.title} run={fresh} />

      <div className="mt-[clamp(18px,3vh,38px)]">
        <div className="mb-3 grid grid-cols-[minmax(0,1fr)_38px_minmax(0,1fr)] items-center gap-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-slate-500">{c.colWas}</p>
          <span />
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-ice/75">{c.colNow}</p>
        </div>

        <div className="flex flex-col gap-2.5">
          {c.rows.map((r, i) => {
            const start = at[ROW_CUE[i]] ?? 0;
            const on = show(start);
            /* Ikkinchi bosqich: yonish o'ngga ko'chadi */
            const flipped = show(start + FLIP_S);
            return (
              <motion.div
                key={r.was}
                initial={fresh ? { opacity: 0, y: 14 } : false}
                animate={on ? { opacity: 1, y: 0 } : { opacity: 0.16, y: 0 }}
                transition={{ duration: 0.5, delay: fresh && on ? (i % 2) * 0.12 : 0, ease: EASE }}
                className="grid grid-cols-[minmax(0,1fr)_38px_minmax(0,1fr)] items-stretch gap-3"
              >
                {/* ── chap: bugungi holat. Birinchi bosqichda FAOL ── */}
                <motion.div
                  animate={{ scale: on && !flipped ? 1 : 0.985, opacity: flipped ? 0.5 : 1 }}
                  transition={{ duration: 0.5, ease: EASE }}
                  className={`flex items-center gap-3 rounded-xl border px-5 py-3.5 transition-colors duration-500 ${
                    on && !flipped
                      ? "border-rose-400/45 bg-rose-500/[0.1] shadow-[0_0_38px_-16px_rgba(255,107,122,0.85)]"
                      : "border-white/[0.06] bg-white/[0.015]"
                  }`}
                >
                  <X size={15} className={`flex-none transition-colors duration-500 ${on && !flipped ? "text-rose-300" : "text-slate-600"}`} />
                  <p className={`text-[13.5px] leading-snug transition-colors duration-500 ${on && !flipped ? "text-rose-100" : "text-slate-500"}`}>
                    {r.was}
                  </p>
                </motion.div>

                {/* ── o'q: almashuv lahzasida yuguradi ── */}
                <div className="grid place-items-center">
                  <motion.span
                    animate={on && !flipped ? { x: [-3, 5, -3], opacity: [0.6, 1, 0.6] } : { x: 0, opacity: 1 }}
                    transition={on && !flipped ? { duration: 1.1, repeat: Infinity, ease: "easeInOut" } : { duration: 0.4 }}
                  >
                    <ArrowRight
                      size={16}
                      className={`transition-colors duration-500 ${flipped ? "text-ice" : on ? "text-rose-300" : "text-slate-700"}`}
                    />
                  </motion.span>
                </div>

                {/* ── o'ng: Campus AI. Ikkinchi bosqichda FAOL ── */}
                <motion.div
                  animate={{ scale: flipped ? 1 : 0.985 }}
                  transition={{ duration: 0.5, ease: EASE }}
                >
                  <Glass active={flipped} className="flex h-full items-center gap-3 px-5 py-3.5">
                    <Check
                      size={15}
                      className={`flex-none transition-colors duration-500 ${flipped ? "text-emerald-300" : "text-slate-600"}`}
                    />
                    <p className={`text-[13.5px] font-medium leading-snug transition-colors duration-500 ${flipped ? "text-white" : "text-slate-500"}`}>
                      {r.now}
                    </p>
                  </Glass>
                </motion.div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <motion.div
        initial={fresh ? { opacity: 0, y: 18 } : false}
        animate={show(last) ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, ease: EASE }}
        className="mt-[clamp(20px,3.5vh,44px)] grid grid-cols-2 gap-3 border-t border-white/10 pt-7 sm:grid-cols-4"
      >
        {c.gains.map((g) => (
          <div key={g.label}>
            <p className="text-[clamp(24px,2.4vw,40px)] font-light leading-none tracking-[-0.04em] text-ice">{g.num}</p>
            <p className="mt-2 text-[12.5px] leading-snug text-slate-400">{g.label}</p>
          </div>
        ))}
      </motion.div>
    </Stage>
  );
}
