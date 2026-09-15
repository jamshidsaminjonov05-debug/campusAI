"use client";

import { motion } from "framer-motion";
import { Clock, HelpCircle, Quote, ShieldQuestion } from "lucide-react";
import { useCopy } from "../copy";
import { EASE, Glass, ORB_CLEAR, SlideTitle, Stage } from "@/components/deck/ui";
import type { SlideProps } from "@/components/deck/types";

/**
 * 5 — OTA-ONA MUAMMOSI. Muammo bo'limining yakuni.
 *
 * Bu slayd ataylab HISSIY: oldingi ikkitasi xavfsizlik va sifat haqida
 * quruq gapirdi, bu yerda esa oila turibdi. Investor uchun bu muhim —
 * ota-ona aloqasi mahsulotning eng kuchli ushlab turuvchi qismi bo'ladi
 * (9-slaydda ilova ko'rsatiladi).
 *
 * Markazdagi iqtibos — slaydning og'irlik nuqtasi.
 *
 * `cue` — ovoz bo'lagi indeksi (`copy.narration`).
 */
const ICONS = [Clock, HelpCircle, ShieldQuestion];

export default function I5ParentsPain({ t, fresh, at }: SlideProps) {
  const c = useCopy().parentsPain;
  const show = (cue: number) => !fresh || t >= (at[cue] ?? 0);

  return (
    <Stage>
      <SlideTitle kicker={c.kicker} title={c.title} run={fresh} />

      <div className="mt-[clamp(16px,2.8vh,38px)] grid gap-[clamp(16px,2.2vw,36px)] lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        {/* ── chap: uchta bo'shliq ── */}
        <div className="flex flex-col gap-3">
          {c.gaps.map((g, i) => {
            const Icon = ICONS[i];
            const on = show(1);
            return (
              <motion.div
                key={g.title}
                initial={fresh ? { opacity: 0, x: -20 } : false}
                animate={on ? { opacity: 1, x: 0 } : { opacity: 0.14, x: 0 }}
                transition={{ duration: 0.55, delay: fresh && on ? i * 0.12 : 0, ease: EASE }}
              >
                <Glass className="flex items-center gap-4 p-4">
                  <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-ice/12 text-ice">
                    <Icon size={18} strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-medium leading-tight text-white">{g.title}</span>
                    <span className="mt-1 block text-[11.5px] leading-snug text-slate-400">{g.text}</span>
                  </span>
                </Glass>
              </motion.div>
            );
          })}
        </div>

        {/* ── o'ng: iqtibos ── */}
        <motion.div
          initial={fresh ? { opacity: 0, y: 18 } : false}
          animate={show(2) ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.75, ease: EASE }}
          className="flex"
        >
          <Glass active className="flex w-full flex-col justify-center p-6">
            <Quote size={22} className="text-ice/50" strokeWidth={1.6} />
            <p className="mt-4 text-[clamp(15px,1.45vw,23px)] font-light leading-[1.45] text-white">{c.quote}</p>
            <p className="mt-6 border-t border-white/[0.08] pt-4 text-[12px] leading-snug text-ice/85">{c.verdict}</p>
          </Glass>
        </motion.div>
      </div>

      <div className={ORB_CLEAR} />
    </Stage>
  );
}
