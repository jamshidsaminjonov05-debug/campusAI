"use client";

import { motion } from "framer-motion";
import { ArrowRight, Boxes, Check, Layers, MonitorPlay, ScanEye, ShieldAlert } from "lucide-react";
import { useCopy } from "../copy";
import { EASE, Glass, ORB_CLEAR, SlideTitle, Stage } from "@/components/deck/ui";
import type { SlideProps } from "@/components/deck/types";

/**
 * 6 — YECHIM: QANDAY ISHLAYDI.
 *
 * Yechim bo'limining kirish slaydi. Asosiy g'oya bitta va u pastdagi
 * uchta "qaror" da yotadi: biz uskuna sotmaymiz, mavjud uskuna ustiga
 * dasturiy qatlam qo'yamiz.
 *
 * Besh bosqich chapdan o'ngga zanjir bo'lib ochiladi — bu ro'yxat emas,
 * kadrdan hodisagacha bo'lgan YO'L.
 *
 * `cue` — ovoz bo'lagi indeksi (`copy.narration`).
 */
const STEP_ICONS = [Boxes, ScanEye, Layers, ShieldAlert, MonitorPlay];

export default function I6HowItWorks({ t, fresh, at }: SlideProps) {
  const c = useCopy().howItWorks;
  const show = (cue: number) => !fresh || t >= (at[cue] ?? 0);

  return (
    <Stage>
      <SlideTitle kicker={c.kicker} title={c.title} run={fresh} />

      {/* ── besh bosqichli zanjir ── */}
      <div className="mt-[clamp(16px,2.8vh,38px)] grid grid-cols-2 gap-3 lg:grid-cols-5">
        {c.steps.map((s, i) => {
          const Icon = STEP_ICONS[i];
          const on = show(1);
          return (
            <motion.div
              key={s.title}
              initial={fresh ? { opacity: 0, y: 18 } : false}
              animate={on ? { opacity: 1, y: 0 } : { opacity: 0.14, y: 0 }}
              transition={{ duration: 0.5, delay: fresh && on ? i * 0.12 : 0, ease: EASE }}
              className="relative"
            >
              <Glass active={on} className="flex h-full flex-col p-4">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-ice/12 text-ice">
                  <Icon size={18} strokeWidth={1.7} />
                </span>
                <span className="mt-3 block font-mono text-[9px] uppercase tracking-[0.2em] text-ice/55">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="mt-1 block text-[13px] font-medium leading-tight text-white">{s.title}</span>
                <span className="mt-1.5 block text-[11px] leading-[1.5] text-slate-400">{s.text}</span>
              </Glass>

              {/* bosqichlar orasidagi strelka — bu zanjir, ro'yxat emas */}
              {i < c.steps.length - 1 && (
                <motion.span
                  initial={fresh ? { opacity: 0 } : false}
                  animate={on ? { opacity: 1 } : {}}
                  transition={{ duration: 0.4, delay: fresh ? 0.12 * i + 0.3 : 0 }}
                  className="absolute right-[-13px] top-1/2 z-10 hidden -translate-y-1/2 text-ice/40 lg:block"
                >
                  <ArrowRight size={14} />
                </motion.span>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* ── uchta qaror ── */}
      <motion.div
        initial={fresh ? { opacity: 0, y: 16 } : false}
        animate={show(2) ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, ease: EASE }}
        className="mt-3"
      >
        <Glass className="p-4">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ice/70">{c.keysTitle}</p>
          <div className="mt-3 grid gap-2.5 md:grid-cols-3">
            {c.keys.map((k, i) => (
              <motion.span
                key={k}
                initial={fresh ? { opacity: 0, y: 8 } : false}
                animate={show(2) ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.45, delay: fresh ? 0.1 * i : 0, ease: EASE }}
                className="flex items-start gap-2.5 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3.5 py-3 text-[12px] leading-snug text-slate-200"
              >
                <Check size={14} className="mt-[2px] flex-none text-emerald-400" strokeWidth={2.5} />
                {k}
              </motion.span>
            ))}
          </div>
        </Glass>
        <p className={`mt-2.5 text-[10.5px] leading-snug text-slate-500 ${ORB_CLEAR}`}>{c.note}</p>
      </motion.div>
    </Stage>
  );
}
