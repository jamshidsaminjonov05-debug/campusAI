"use client";

import { motion } from "framer-motion";
import { Check, Minus, X, Zap } from "lucide-react";
import { useCopy } from "../copy";
import { EASE, ORB_CLEAR, SlideTitle, Stage } from "@/components/deck/ui";
import type { SlideProps } from "@/components/deck/types";

/**
 * 13 — RAQOBAT.
 *
 * Investor bu slaydga eng uzoq tikiladi, shuning uchun u HALOL bo'lishi
 * shart. Raqobatchilarga "yo'q" qo'yish oson, lekin bitta bo'rttirilgan
 * katak topilsa butun taqdimotga ishonch yo'qoladi.
 *
 * Shu sababli "qisman" darajasi ham bor va ko'p ishlatilgan:
 *   • global platformalarning bir qismi on-prem ishlaydi (Avigilon Unity);
 *   • uskuna vendorlarida yuz bo'yicha davomat moduli mavjud;
 *   • mahalliy integratorlar kamerani mavjud tizimga ulay oladi.
 *
 * Pastda uchta HAL QILUVCHI ustunlik — matritsani xulosaga aylantiradi.
 *
 * `cue` — ovoz bo'lagi indeksi (`copy.narration`).
 */

type Cell = "yes" | "partial" | "no";

/** Qatorlar `copy.rivals.rows` tartibida; ustunlar: [biz, global, uskuna, mahalliy] */
const GRID: Cell[][] = [
  ["yes", "partial", "yes", "yes"],       // muassasa serverida
  ["yes", "partial", "yes", "yes"],       // internetsiz
  ["yes", "no", "partial", "partial"],    // o'zbek tili
  ["yes", "partial", "no", "no"],         // ta'limga ixtisoslashgan detektorlar
  ["yes", "no", "no", "no"],              // dars va e'tibor tahlili
  ["yes", "no", "no", "no"],              // ota-onalar ilovasi
  ["yes", "no", "partial", "partial"],    // 2026 qaroriga moslik
  ["yes", "partial", "no", "yes"],        // mavjud kameraga ulanadi
  ["yes", "no", "no", "no"],              // o'quvchiga hisoblangan tarif
];

/**
 * ⚠️ RANG — SLAYDNING ASOSIY QUROLI.
 *
 * "Yo'q" ataylab QIZIL: kulrang belgi ko'zga tashlanmasdi va investor
 * matritsani qatorma-qator o'qishga majbur bo'lardi. Qizil bilan esa
 * bir qarashda ko'rinadi — bizning ustun to'liq yashil, raqobatchilarniki
 * qizilga to'la.
 *
 * ⚠️ Rang FAQAT javobga bog'liq, ustunga emas: raqobatchida "bor" bo'lsa
 * u ham yashil bo'ladi (masalan uskuna vendorlari on-prem ishlaydi).
 * Aks holda matritsa soxta bo'lib qolardi va birinchi savoldayoq
 * ishonchni yo'qotardik.
 */
const MARK = {
  yes: { Icon: Check, cls: "text-emerald-300", bg: "bg-emerald-500/[0.18]", ring: "ring-emerald-400/40" },
  partial: { Icon: Minus, cls: "text-amber-300", bg: "bg-amber-500/[0.14]", ring: "ring-amber-400/30" },
  no: { Icon: X, cls: "text-rose-300", bg: "bg-rose-500/[0.16]", ring: "ring-rose-400/35" },
} as const;

export default function I13Rivals({ t, fresh, at }: SlideProps) {
  const c = useCopy().rivals;
  const show = (cue: number) => !fresh || t >= (at[cue] ?? 0);

  const cols = "grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,0.68fr))]";

  return (
    <Stage>
      <SlideTitle kicker={c.kicker} title={c.title} run={fresh} />

      <div className="mt-[clamp(12px,2.2vh,26px)] overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl">
        {/* ── ustun sarlavhalari ── */}
        <div className={`grid ${cols} gap-2 border-b border-white/[0.08] px-4 py-2.5`}>
          <span />
          <motion.span
            initial={fresh ? { opacity: 0, y: -8 } : false}
            animate={show(1) ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, ease: EASE }}
            /* Bizning ustun sarlavhasi YASHIL — ustun bo'ylab davom etadigan
               yashil fonning boshlanishi */
            className="rounded-lg border border-emerald-400/45 bg-emerald-500/[0.14] px-2 py-1.5 text-center"
          >
            <span className="block text-[11.5px] font-semibold leading-tight text-emerald-200">{c.us}</span>
          </motion.span>
          {c.list.map((r, i) => (
            <motion.span
              key={r.name}
              initial={fresh ? { opacity: 0, y: -8 } : false}
              animate={show(1) ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: fresh ? 0.08 * (i + 1) : 0, ease: EASE }}
              className="px-1 text-center"
            >
              <span className="block text-[11.5px] leading-tight text-slate-300">{r.name}</span>
              <span className="mt-0.5 block text-[9.5px] leading-tight text-slate-600">{r.note}</span>
            </motion.span>
          ))}
        </div>

        {/* ── qatorlar ── */}
        <div className="divide-y divide-white/[0.05]">
          {c.rows.map((row, ri) => (
            <motion.div
              key={row}
              initial={fresh ? { opacity: 0, x: -14 } : false}
              animate={show(1) ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.4, delay: fresh ? 0.06 * ri : 0, ease: EASE }}
              className={`grid ${cols} items-center gap-2 px-4 py-[7px]`}
            >
              <span className="truncate text-[12px] leading-snug text-slate-300">{row}</span>
              {GRID[ri].map((cell, ci) => {
                const { Icon, cls, bg, ring } = MARK[cell];
                const mine = ci === 0;
                return (
                  <span key={ci} className={`flex justify-center ${mine ? "bg-emerald-500/[0.06]" : ""}`}>
                    <span
                      className={`grid place-items-center rounded-lg ring-1 ring-inset ${bg} ${ring} ${
                        /* Bizning kataklar kattaroq — ustun bir qarashda ajraladi */
                        mine ? "h-7 w-7" : "h-6 w-6"
                      }`}
                    >
                      <Icon size={mine ? 15 : 13} className={cls} strokeWidth={2.6} />
                    </span>
                  </span>
                );
              })}
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── uchta hal qiluvchi ustunlik ── */}
      <motion.div
        initial={fresh ? { opacity: 0, y: 12 } : false}
        animate={show(2) ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, ease: EASE }}
        className={`mt-3 ${ORB_CLEAR}`}
      >
        <div className="grid gap-2 md:grid-cols-3">
          {c.edges.map((e, i) => (
            <motion.span
              key={e}
              initial={fresh ? { opacity: 0, y: 8 } : false}
              animate={show(2) ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.45, delay: fresh ? 0.1 * i : 0, ease: EASE }}
              className="flex items-start gap-2.5 rounded-lg border border-ice/25 bg-ice/[0.06] px-3.5 py-2.5 text-[11px] leading-snug text-slate-200"
            >
              <Zap size={13} className="mt-[2px] flex-none text-ice" strokeWidth={2} />
              {e}
            </motion.span>
          ))}
        </div>

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <span className="flex items-center gap-4">
            {(["yes", "partial", "no"] as Cell[]).map((k) => {
              const { Icon, cls, bg } = MARK[k];
              return (
                <span key={k} className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">
                  <span className={`grid h-4 w-4 place-items-center rounded ${bg}`}>
                    <Icon size={10} className={cls} strokeWidth={2.8} />
                  </span>
                  {c.legend[k]}
                </span>
              );
            })}
          </span>
          <span className="text-[10px] leading-snug text-slate-500">{c.note}</span>
        </div>
      </motion.div>
    </Stage>
  );
}
