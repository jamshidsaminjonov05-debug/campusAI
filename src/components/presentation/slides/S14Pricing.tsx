"use client";

import { motion } from "framer-motion";
import { Building2, GraduationCap, School, TrendingUp } from "lucide-react";
import { useCopy } from "../copy";
import { EASE, Glass, SlideTitle, Stage } from "@/components/deck/ui";
import type { SlideProps } from "@/components/deck/types";

/**
 * 14 — BOZOR VA DAROMAD (investor uchun).
 *
 * Uchta segment — UCHTA ALOHIDA QATOR, har biri o'z rangi bilan: ko'z
 * darhol "maktab / kollej / oliy ta'lim" ni ajratadi va narx bilan
 * potensialni bir qatorda o'qiydi.
 *
 * O'ngda qamrov diagrammasi: 1% dan 25% gacha yillik daromad. Investor
 * uchun asosiy savol "bozor qancha?" emas, "qancha qamrasak, qancha
 * bo'ladi?" — diagramma aynan shunga javob beradi.
 *
 * ⚠️ Ikki xil raqam aralashmasligi kerak: BOZOR ko'rsatkichlari
 * Statistika qo'mitasiniki (manba ekranda), DAROMAD esa model bo'yicha
 * hisob — buni `chartNote` ochiq aytadi.
 *
 * `cue` — ovoz bo'lagi indeksi (`copy.narration`).
 */

/** Har segmentning rangi — qator chetidagi chiziq va raqam shu rangda */
const TIER_VIEW = [
  { icon: School, color: "#8FB8FF", glow: "rgba(143,184,255,0.55)" },
  { icon: Building2, color: "#FFC46B", glow: "rgba(255,196,107,0.5)" },
  { icon: GraduationCap, color: "#C08BFF", glow: "rgba(192,139,255,0.5)" },
];

export default function S14Pricing({ t, fresh, at }: SlideProps) {
  const c = useCopy().pricing;
  const show = (cue: number) => !fresh || t >= (at[cue] ?? 0);
  /** Diagramma eng katta ustunga nisbatan o'lchanadi */
  const maxPct = Math.max(...c.chart.map((r) => r.pct));

  return (
    <Stage>
      <SlideTitle kicker={c.kicker} title={c.title} run={fresh} />

      <div className="mt-[clamp(14px,2.5vh,30px)] grid gap-[clamp(18px,2.4vw,40px)] lg:grid-cols-[minmax(0,1.18fr)_minmax(0,0.82fr)]">
        {/* ── chap: uchta tarif qatori ── */}
        <div>
          <motion.p
            initial={fresh ? { opacity: 0 } : false}
            animate={show(3) ? { opacity: 1 } : {}}
            transition={{ duration: 0.6 }}
            className="font-mono text-[11px] uppercase tracking-[0.22em] text-ice/70"
          >
            {c.tiersTitle}
          </motion.p>

          <div className="mt-3 flex flex-col gap-3">
            {c.tiers.map((tier, i) => {
              const v = TIER_VIEW[i];
              const Icon = v.icon;
              const on = show(3 + Math.min(i, 1));
              return (
                <motion.div
                  key={tier.name}
                  initial={fresh ? { opacity: 0, x: -22 } : false}
                  animate={on ? { opacity: 1, x: 0 } : { opacity: 0.16, x: 0 }}
                  transition={{ duration: 0.55, delay: fresh && on ? i * 0.14 : 0, ease: EASE }}
                  className="relative overflow-hidden rounded-2xl border backdrop-blur-xl"
                  style={{
                    borderColor: on ? `${v.color}59` : "rgba(255,255,255,0.07)",
                    background: on ? `linear-gradient(90deg, ${v.color}1f, rgba(255,255,255,0.02) 55%)` : "rgba(255,255,255,0.02)",
                    boxShadow: on ? `0 0 46px -24px ${v.glow}` : "none",
                  }}
                >
                  {/* rangli chekka chiziq — segmentni bir qarashda ajratadi */}
                  <span className="absolute inset-y-0 left-0 w-[4px]" style={{ background: on ? v.color : "transparent" }} />

                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-4 pl-6">
                    <span
                      className="grid h-11 w-11 flex-none place-items-center rounded-xl"
                      style={{ background: `${v.color}22`, color: v.color }}
                    >
                      <Icon size={20} strokeWidth={1.8} />
                    </span>

                    <span className="min-w-[150px] flex-1">
                      <span className="block text-[15px] font-semibold leading-tight text-white">{tier.name}</span>
                      <span className="block text-[11.5px] text-slate-500">{tier.who}</span>
                    </span>

                    <span className="min-w-[120px]">
                      <span
                        className="block text-[clamp(20px,2vw,30px)] font-light leading-none tracking-[-0.03em] tabular-nums"
                        style={{ color: on ? v.color : "#64748b" }}
                      >
                        {tier.price}
                      </span>
                      <span className="mt-1 block text-[10.5px] leading-snug text-slate-500">{tier.unit}</span>
                    </span>

                    <span className="min-w-[130px] border-l border-white/[0.07] pl-5">
                      <span className="block text-[12px] text-slate-300">{tier.inst}</span>
                      <span className="block text-[12px] text-slate-400">{tier.students}</span>
                    </span>

                    <span className="ml-auto text-right">
                      <span className="block whitespace-nowrap font-mono text-[13.5px] tabular-nums text-white">{tier.monthly}</span>
                      <span className="block text-[10.5px] text-slate-500">to'liq qamrovda</span>
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <motion.p
            initial={fresh ? { opacity: 0 } : false}
            animate={show(4) ? { opacity: 1 } : {}}
            transition={{ duration: 0.7 }}
            className="mt-3 text-[10.5px] leading-snug text-slate-500"
          >
            {c.note} · {c.source}
          </motion.p>
        </div>

        {/* ── o'ng: jami va qamrov diagrammasi ── */}
        <div className="flex flex-col gap-3">
          <motion.div
            initial={fresh ? { opacity: 0, y: 16 } : false}
            animate={show(4) ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.65, ease: EASE }}
          >
            <Glass active className="p-5">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ice/70">{c.totalTitle}</p>
              <div className="mt-3 flex flex-wrap items-end gap-x-7 gap-y-2">
                <span>
                  <span className="block text-[clamp(24px,2.5vw,38px)] font-light leading-none tracking-[-0.04em] text-white tabular-nums">
                    {c.totalMonthly}
                  </span>
                  <span className="mt-1 block text-[11px] text-slate-400">{c.totalUnit.month}</span>
                </span>
                <span className="h-9 w-px bg-white/10" />
                <span>
                  <span className="block text-[clamp(24px,2.5vw,38px)] font-light leading-none tracking-[-0.04em] text-ice tabular-nums">
                    {c.totalYearly}
                  </span>
                  <span className="mt-1 block text-[11px] text-slate-400">{c.totalUnit.year}</span>
                </span>
              </div>
            </Glass>
          </motion.div>

          <motion.div
            initial={fresh ? { opacity: 0, y: 16 } : false}
            animate={show(5) ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.65, ease: EASE }}
            className="flex-1"
          >
            <Glass className="flex h-full flex-col p-5">
              <p className="flex items-center gap-2 text-[13.5px] font-medium text-white">
                <TrendingUp size={16} className="text-ice" />
                {c.chartTitle}
              </p>

              <div className="mt-4 flex flex-1 flex-col justify-center gap-3">
                {c.chart.map((row, i) => (
                  <div key={row.label}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-mono text-[11px] tracking-[0.1em] text-slate-400">{row.label}</span>
                      <span className="whitespace-nowrap font-mono text-[13px] tabular-nums text-white">{row.yearly}</span>
                    </div>
                    <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                      <motion.div
                        initial={fresh ? { width: 0 } : false}
                        animate={show(5) ? { width: `${(row.pct / maxPct) * 100}%` } : {}}
                        transition={{ duration: 0.9, delay: fresh ? 0.12 * i : 0, ease: EASE }}
                        className="h-full rounded-full"
                        style={{
                          width: fresh ? undefined : `${(row.pct / maxPct) * 100}%`,
                          background: "linear-gradient(90deg, #8FB8FF, #85E0FF)",
                          boxShadow: "0 0 18px -4px rgba(133,224,255,0.8)",
                        }}
                      />
                    </div>
                    <p className="mt-1 text-right text-[10.5px] text-slate-500">{row.monthly}</p>
                  </div>
                ))}
              </div>

              <p className="mt-3 border-t border-white/[0.07] pt-2.5 text-[10.5px] leading-snug text-slate-500">{c.chartNote}</p>
            </Glass>
          </motion.div>
        </div>
      </div>
    </Stage>
  );
}
