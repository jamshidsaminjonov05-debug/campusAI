"use client";

import { motion } from "framer-motion";
import { Building2, GraduationCap, School } from "lucide-react";
import { useCopy } from "../copy";
import { useCurrency } from "../currency";
import { SEGMENTS, TAM_YEAR, num, segMonthly, totalInst, totalStudents } from "../model";
import { EASE, Glass, ORB_CLEAR, SlideTitle, Stage } from "@/components/deck/ui";
import type { SlideProps } from "@/components/deck/types";

/**
 * 12 — BOZOR HAJMI.
 *
 * Investor "bozor katta" degan gapga ishonmaydi, u hisobni ko'rmoqchi.
 * Shuning uchun raqam PASTDAN YUQORIGA quriladi: muassasa × o'quvchi ×
 * tarif. O'ngdagi jadval aynan shu ko'paytirishni ochib beradi, chapdagi
 * katta raqam esa uning yig'indisi.
 *
 * ⚠️ Ikki xil raqam aralashmaydi: muassasa va o'quvchi soni — Statistika
 * qo'mitasiniki (manba ekranda), daromad esa model bo'yicha hisob.
 *
 * `cue` — ovoz bo'lagi indeksi (`copy.narration`).
 */
const SEG_ICONS = [School, Building2, GraduationCap];
const SEG_COLORS = ["#8FB8FF", "#FFC46B", "#C08BFF"];

export default function I12Market({ t, fresh, at }: SlideProps) {
  const c = useCopy().market;
  const { m } = useCurrency();
  const show = (cue: number) => !fresh || t >= (at[cue] ?? 0);

  const tam = m(TAM_YEAR);
  const maxMonthly = Math.max(...SEGMENTS.map(segMonthly));

  return (
    <Stage>
      <SlideTitle kicker={c.kicker} title={c.title} run={fresh} />

      <div className="mt-[clamp(16px,2.6vh,36px)] grid gap-[clamp(16px,2.4vw,40px)] lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]">
        {/* ── chap: yig'indi ── */}
        <motion.div
          initial={fresh ? { opacity: 0, x: -20 } : false}
          animate={show(1) ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.65, ease: EASE }}
          className="flex"
        >
          <Glass active className="flex w-full flex-col justify-center p-6">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-ice/70">{c.tamLabel}</p>

            <p className="mt-4 flex items-baseline gap-2">
              <span className="text-[clamp(38px,4.6vw,76px)] font-light leading-none tracking-[-0.05em] text-white tabular-nums">
                {tam.value}
              </span>
              <span className="text-[14px] text-slate-400">{tam.unit}</span>
            </p>
            <p className="mt-2 text-[11.5px] text-slate-500">{c.tamNote}</p>

            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-white/[0.08] pt-5">
              <span>
                <span className="block text-[clamp(17px,1.7vw,26px)] font-light leading-none tracking-[-0.03em] text-ice tabular-nums">
                  {num(totalInst())}
                </span>
                <span className="mt-1.5 block text-[11px] text-slate-400">{c.segCols.inst}</span>
              </span>
              <span>
                <span className="block text-[clamp(17px,1.7vw,26px)] font-light leading-none tracking-[-0.03em] text-ice tabular-nums">
                  {(totalStudents() / 1_000_000).toFixed(2).replace(".", ",")}
                  <span className="ml-1 text-[0.5em] text-ice/70">mln</span>
                </span>
                <span className="mt-1.5 block text-[11px] text-slate-400">{c.segCols.students}</span>
              </span>
            </div>
          </Glass>
        </motion.div>

        {/* ── o'ng: segmentlar bo'yicha hisob ── */}
        <motion.div
          initial={fresh ? { opacity: 0, x: 20 } : false}
          animate={show(1) ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.65, delay: fresh ? 0.12 : 0, ease: EASE }}
        >
          <Glass className="flex h-full flex-col p-5">
            <div className="grid grid-cols-[minmax(0,1.35fr)_repeat(3,minmax(0,1fr))] gap-3 border-b border-white/[0.08] pb-2.5 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">
              <span />
              <span className="text-right">{c.segCols.inst}</span>
              <span className="text-right">{c.segCols.students}</span>
              <span className="text-right">{c.segCols.price}</span>
            </div>

            <div className="flex flex-1 flex-col justify-center divide-y divide-white/[0.06]">
              {SEGMENTS.map((s, i) => {
                const Icon = SEG_ICONS[i];
                const color = SEG_COLORS[i];
                const on = show(1);
                const mv = m(segMonthly(s));
                return (
                  <motion.div
                    key={s.key}
                    initial={fresh ? { opacity: 0, x: 14 } : false}
                    animate={on ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.5, delay: fresh ? 0.13 * i : 0, ease: EASE }}
                    className="py-3"
                  >
                    {/* ⚠️ Raqamlar ATAYLAB katta: bu jadval zalda proyektordan
                        o'qiladi va investor aynan shu uchta ustunni (muassasa,
                        o'quvchi, tarif) ko'z bilan ko'paytiradi. */}
                    <div className="grid grid-cols-[minmax(0,1.35fr)_repeat(3,minmax(0,1fr))] items-center gap-3">
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span
                          className="grid h-9 w-9 flex-none place-items-center rounded-lg"
                          style={{ background: `${color}22`, color }}
                        >
                          <Icon size={17} strokeWidth={1.8} />
                        </span>
                        <span className="truncate text-[13.5px] leading-tight text-white">{c.segNames[i]}</span>
                      </span>
                      <span className="text-right font-mono text-[clamp(15px,1.5vw,22px)] leading-none tabular-nums text-white">
                        {num(s.inst)}
                      </span>
                      <span className="text-right font-mono text-[clamp(15px,1.5vw,22px)] leading-none tabular-nums text-white">
                        {(s.students / 1_000_000).toFixed(2).replace(".", ",")}
                        <span className="ml-1 text-[0.55em] text-slate-500">mln</span>
                        {s.est && <span className="text-slate-600">*</span>}
                      </span>
                      <span
                        className="text-right font-mono text-[clamp(15px,1.5vw,22px)] leading-none tabular-nums"
                        style={{ color }}
                      >
                        {num(s.price)}
                      </span>
                    </div>

                    {/* segmentning bozordagi ulushi — ko'z bilan taqqoslash uchun */}
                    <div className="mt-2 flex items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                        <motion.div
                          initial={fresh ? { width: 0 } : false}
                          animate={on ? { width: `${(segMonthly(s) / maxMonthly) * 100}%` } : {}}
                          transition={{ duration: 0.85, delay: fresh ? 0.13 * i + 0.2 : 0, ease: EASE }}
                          className="h-full rounded-full"
                          style={{ width: fresh ? undefined : `${(segMonthly(s) / maxMonthly) * 100}%`, background: color }}
                        />
                      </div>
                      <span className="whitespace-nowrap font-mono text-[11.5px] tabular-nums text-white">
                        {mv.value} <span className="text-[9.5px] text-slate-500">{mv.unit}</span>
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <p className="mt-3 border-t border-white/[0.08] pt-2.5 text-[10px] leading-snug text-slate-500">
              <span className="text-slate-600">*</span> {c.source}
            </p>
          </Glass>
        </motion.div>
      </div>

      <div className={ORB_CLEAR} />
    </Stage>
  );
}
