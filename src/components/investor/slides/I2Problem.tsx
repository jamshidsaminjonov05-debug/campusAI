"use client";

import { motion } from "framer-motion";
import { Building2, CameraOff, FileWarning, GraduationCap, School, ScanSearch } from "lucide-react";
import { useCopy } from "../copy";
import { SEGMENTS, num } from "../model";
import { EASE, Glass, ORB_CLEAR, SlideTitle, Stage } from "@/components/deck/ui";
import type { SlideProps } from "@/components/deck/types";

/**
 * 2 — TA'LIMDAGI MANZARA.
 *
 * Muammo bo'limining kirish slaydi: avval MIQYOS ko'rsatiladi (uchta
 * segment, real raqamlar bilan), keyin uchta umumiy og'riq.
 *
 * Nega shu tartibda: investor avval "bu qanchalik katta?" deb so'raydi,
 * keyingina "nima noto'g'ri?" deb. Miqyos raqamlari Statistika qo'mitasidan.
 *
 * `cue` — ovoz bo'lagi indeksi (`copy.narration`).
 */
const SEG_ICONS = [School, Building2, GraduationCap];
const SEG_COLORS = ["#8FB8FF", "#FFC46B", "#C08BFF"];
const PAIN_ICONS = [CameraOff, FileWarning, ScanSearch];

export default function I2Problem({ t, fresh, at }: SlideProps) {
  const c = useCopy().problem;
  const show = (cue: number) => !fresh || t >= (at[cue] ?? 0);

  return (
    <Stage>
      <SlideTitle kicker={c.kicker} title={c.title} run={fresh} />

      {/* ── miqyos: uchta segment ── */}
      <div className="mt-[clamp(14px,2.4vh,32px)] grid gap-3 md:grid-cols-3">
        {SEGMENTS.map((s, i) => {
          const Icon = SEG_ICONS[i];
          const color = SEG_COLORS[i];
          const on = show(0);
          return (
            <motion.div
              key={s.key}
              initial={fresh ? { opacity: 0, y: 18 } : false}
              animate={on ? { opacity: 1, y: 0 } : { opacity: 0.16, y: 0 }}
              transition={{ duration: 0.55, delay: fresh && on ? i * 0.12 : 0, ease: EASE }}
            >
              <Glass active={on} className="flex h-full items-center gap-4 p-4">
                <span
                  className="grid h-12 w-12 flex-none place-items-center rounded-xl"
                  style={{ background: `${color}22`, color }}
                >
                  <Icon size={21} strokeWidth={1.75} />
                </span>
                <span className="min-w-0">
                  <span
                    className="block text-[clamp(20px,2.1vw,32px)] font-light leading-none tracking-[-0.04em] tabular-nums"
                    style={{ color }}
                  >
                    {num(s.inst)}
                  </span>
                  <span className="mt-1 block truncate text-[12px] leading-tight text-white">{c.segNames[i]}</span>
                  <span className="mt-0.5 block text-[10.5px] leading-snug text-slate-500">{c.segNotes[i]}</span>
                </span>
              </Glass>
            </motion.div>
          );
        })}
      </div>

      {/* ── uchta og'riq ── */}
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        {c.pains.map((p, i) => {
          const Icon = PAIN_ICONS[i];
          const on = show(i === 0 ? 1 : 2);
          return (
            <motion.div
              key={p.title}
              initial={fresh ? { opacity: 0, y: 16 } : false}
              animate={on ? { opacity: 1, y: 0 } : { opacity: 0.14, y: 0 }}
              transition={{ duration: 0.55, delay: fresh && on ? i * 0.09 : 0, ease: EASE }}
            >
              <Glass className="flex h-full items-start gap-3 p-4">
                <span
                  className={`grid h-9 w-9 flex-none place-items-center rounded-xl transition-colors duration-500 ${
                    on ? "bg-rose-500/15 text-rose-300" : "bg-white/[0.04] text-slate-600"
                  }`}
                >
                  <Icon size={17} strokeWidth={1.75} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-medium leading-tight text-white">{p.title}</span>
                  <span className="mt-1.5 block text-[11.5px] leading-[1.55] text-slate-400">{p.text}</span>
                </span>
              </Glass>
            </motion.div>
          );
        })}
      </div>

      {/* ── xulosa ── */}
      <motion.p
        initial={fresh ? { opacity: 0, y: 10 } : false}
        animate={show(2) ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.75, delay: fresh ? 0.3 : 0, ease: EASE }}
        className={`mt-[clamp(12px,2vh,26px)] flex items-start gap-2.5 text-[clamp(14px,1.3vw,20px)] font-light leading-snug text-white ${ORB_CLEAR}`}
      >
        <span className="mt-[9px] h-1.5 w-1.5 flex-none rounded-full bg-ice" />
        {c.verdict}
      </motion.p>
    </Stage>
  );
}
