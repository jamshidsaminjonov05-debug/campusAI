"use client";

import { motion } from "framer-motion";
import { Flag, TrendingUp } from "lucide-react";
import { useCopy } from "../copy";
import { useCurrency } from "../currency";
import {
  ARPU_MONTH,
  COVERAGE_STEPS,
  GROSS_MARGIN,
  LTV_CAC,
  PAYBACK_MONTHS,
  breakEvenShare,
  coverage,
  moneyAt,
  num,
  pct,
} from "../model";
import { EASE, Glass, ORB_CLEAR, SlideTitle, Stage } from "@/components/deck/ui";
import type { SlideProps } from "@/components/deck/types";

/**
 * 14 — DAROMAD VA FOYDA.
 *
 * Taqdimotda investitsiya SO'RALMAYDI, shuning uchun bu slayd "bizga
 * shuncha pul bering" demaydi. U bitta savolga javob beradi: qancha
 * qamrasak, qancha SOF FOYDA bo'ladi.
 *
 * Birinchi qator — bir foiz — ATAYLAB ajratilgan. Investor uchun asosiy
 * xulosa shu: bozorning bir foizi ham foydali, ya'ni model ulkan ulush
 * egallashga bog'liq emas. Nolga chiqish nuqtasi esa undan ham past.
 *
 * ⚠️ Daromad va foyda ustunlari BITTA birlikda ko'rsatiladi (`moneyAt`) —
 * aks holda "927 mln" bilan "18,6 mlrd" yonma-yon tushib, ustunlarni
 * ko'z bilan taqqoslab bo'lmasdi.
 *
 * `cue` — ovoz bo'lagi indeksi (`copy.narration`).
 */
export default function I14Profit({ t, fresh, at }: SlideProps) {
  const c = useCopy().profit;
  const { m, cur } = useCurrency();
  const show = (cue: number) => !fresh || t >= (at[cue] ?? 0);

  const rows = COVERAGE_STEPS.map(coverage);
  const be = breakEvenShare();
  const beRow = coverage(be);

  /* Butun jadval uchun bitta birlik — eng katta daromad bo'yicha tanlanadi */
  const ref = Math.max(...rows.map((r) => r.revenue));
  const unit = moneyAt(ref, cur, ref).unit;

  const arpu = m(ARPU_MONTH);
  const units = [
    { label: c.unitLabels.arpu, value: arpu.value, unit: arpu.unit },
    { label: c.unitLabels.margin, value: pct(GROSS_MARGIN) },
    { label: c.unitLabels.payback, value: PAYBACK_MONTHS.toFixed(1).replace(".", ","), unit: "oy" },
    { label: c.unitLabels.ltv, value: `${LTV_CAC.toFixed(1).replace(".", ",")}×` },
  ];

  const cols = "grid-cols-[minmax(0,0.7fr)_minmax(0,0.85fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.6fr)]";

  return (
    <Stage>
      <SlideTitle kicker={c.kicker} title={c.title} run={fresh} />

      <div className="mt-[clamp(14px,2.4vh,32px)] grid gap-3 lg:grid-cols-[minmax(0,1.42fr)_minmax(0,0.58fr)]">
        {/* ── chap: qamrov jadvali ── */}
        <motion.div
          initial={fresh ? { opacity: 0, y: 16 } : false}
          animate={show(1) ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.65, ease: EASE }}
        >
          <Glass className="flex h-full flex-col p-5">
            {/* sarlavhalar */}
            <div className={`grid ${cols} gap-3 border-b border-white/[0.08] pb-2.5 font-mono text-[9px] uppercase tracking-[0.12em] text-slate-500`}>
              <span>{c.cols.share}</span>
              <span className="text-right">{c.cols.inst}</span>
              <span className="text-right">{c.cols.revenue}, {unit}</span>
              <span className="text-right">{c.cols.profit}, {unit}</span>
              <span className="text-right">{c.cols.margin}</span>
            </div>

            <div className="flex flex-1 flex-col justify-center divide-y divide-white/[0.06]">
              {rows.map((r, i) => {
                const first = i === 0;
                const on = show(first ? 1 : 2);
                const rev = moneyAt(r.revenue, cur, ref);
                const pr = moneyAt(r.profit, cur, ref);
                return (
                  <motion.div
                    key={r.share}
                    initial={fresh ? { opacity: 0, x: -14 } : false}
                    animate={on ? { opacity: 1, x: 0 } : { opacity: 0.18, x: 0 }}
                    transition={{ duration: 0.45, delay: fresh && on ? i * 0.08 : 0, ease: EASE }}
                    className={`grid ${cols} items-center gap-3 py-2.5 ${
                      first ? "rounded-lg bg-ice/[0.09] px-2" : ""
                    }`}
                  >
                    <span
                      className={`font-mono text-[clamp(13px,1.3vw,19px)] leading-none tabular-nums ${
                        first ? "text-ice" : "text-slate-300"
                      }`}
                    >
                      {pct(r.share)}
                    </span>
                    <span className="text-right font-mono text-[12px] tabular-nums text-slate-400">{num(r.inst)}</span>
                    <span className="text-right font-mono text-[13px] tabular-nums text-white">{rev.value}</span>
                    <span
                      className={`text-right font-mono text-[clamp(13px,1.3vw,18px)] tabular-nums ${
                        r.profit > 0 ? "text-emerald-300" : "text-rose-300"
                      }`}
                    >
                      {r.profit > 0 ? "+" : ""}
                      {pr.value}
                    </span>
                    <span className="text-right font-mono text-[11.5px] tabular-nums text-slate-400">
                      {pct(r.margin)}
                    </span>
                  </motion.div>
                );
              })}
            </div>

            {/* nolga chiqish nuqtasi */}
            <motion.p
              initial={fresh ? { opacity: 0 } : false}
              animate={show(1) ? { opacity: 1 } : {}}
              transition={{ duration: 0.7, delay: fresh ? 0.35 : 0 }}
              className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-white/[0.08] pt-3"
            >
              <span className="inline-flex items-center gap-2 text-[12px] text-ice">
                <Flag size={13} strokeWidth={2} />
                {c.breakevenLabel}: {pct(be, 1)}
              </span>
              <span className="font-mono text-[11px] text-slate-500">≈ {num(beRow.inst)} {c.cols.inst.toLowerCase()}</span>
              <span className="ml-auto text-[10.5px] text-slate-500">{c.highlight}</span>
            </motion.p>
          </Glass>
        </motion.div>

        {/* ── o'ng: bitta mijoz iqtisodiyoti ── */}
        <motion.div
          initial={fresh ? { opacity: 0, x: 18 } : false}
          animate={show(2) ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.7, ease: EASE }}
        >
          <Glass active className="flex h-full flex-col p-5">
            <p className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.2em] text-ice/70">
              <TrendingUp size={13} />
              {c.unitTitle}
            </p>

            <div className="mt-4 grid flex-1 grid-cols-2 gap-2.5">
              {units.map((u, i) => (
                <motion.div
                  key={u.label}
                  initial={fresh ? { opacity: 0, y: 12 } : false}
                  animate={show(2) ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.45, delay: fresh ? 0.08 * i : 0, ease: EASE }}
                  className="flex flex-col justify-center rounded-xl border border-white/[0.08] bg-white/[0.025] px-3.5 py-3"
                >
                  <span className="font-mono text-[9px] uppercase leading-tight tracking-[0.12em] text-slate-500">
                    {u.label}
                  </span>
                  <span className="mt-2 flex items-baseline gap-1">
                    <span className="text-[clamp(16px,1.7vw,25px)] font-light leading-none tracking-[-0.035em] text-white tabular-nums">
                      {u.value}
                    </span>
                    {u.unit && <span className="text-[10px] text-slate-500">{u.unit}</span>}
                  </span>
                </motion.div>
              ))}
            </div>

            <p className="mt-4 border-t border-white/[0.08] pt-3 text-[10px] leading-snug text-slate-500">{c.note}</p>
          </Glass>
        </motion.div>
      </div>

      <div className={ORB_CLEAR} />
    </Stage>
  );
}
