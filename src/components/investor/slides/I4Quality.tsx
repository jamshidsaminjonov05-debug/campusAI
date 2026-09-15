"use client";

import { motion } from "framer-motion";
import { HelpCircle, MessageSquareOff, Presentation, Smartphone } from "lucide-react";
import { useCopy } from "../copy";
import { EASE, Glass, ORB_CLEAR, SlideTitle, Stage } from "@/components/deck/ui";
import type { SlideProps } from "@/components/deck/types";

/**
 * 4 — DARS SIFATI MUAMMOSI.
 *
 * Xavfsizlikdan keyingi ikkinchi muammo bloki. Bu yerda asosiy g'oya —
 * O'LCHOV YO'QLIGI: direktor ham, vazirlik ham dars sifati haqida
 * taxmin bilan qaror qabul qiladi.
 *
 * Har bir karta savol shaklida o'qiladi ("Dars qanday o'tyapti"), javob
 * esa yo'qligi aytiladi. Shu tuzilma investorga bo'shliqni ko'rsatadi.
 *
 * `cue` — ovoz bo'lagi indeksi (`copy.narration`).
 */
const ICONS = [Presentation, HelpCircle, Smartphone, MessageSquareOff];

export default function I4Quality({ t, fresh, at }: SlideProps) {
  const c = useCopy().quality;
  const show = (cue: number) => !fresh || t >= (at[cue] ?? 0);

  return (
    <Stage>
      <SlideTitle kicker={c.kicker} title={c.title} run={fresh} />

      <div className="mt-[clamp(16px,2.8vh,38px)] grid gap-3 sm:grid-cols-2">
        {c.items.map((it, i) => {
          const Icon = ICONS[i];
          const on = show(i < 2 ? 1 : 1);
          return (
            <motion.div
              key={it.title}
              initial={fresh ? { opacity: 0, x: i % 2 === 0 ? -18 : 18 } : false}
              animate={on ? { opacity: 1, x: 0 } : { opacity: 0.14, x: 0 }}
              transition={{ duration: 0.55, delay: fresh && on ? i * 0.1 : 0, ease: EASE }}
            >
              <Glass active={on} className="flex h-full items-start gap-4 p-5">
                <span className="grid h-11 w-11 flex-none place-items-center rounded-xl bg-amber-500/12 text-amber-300">
                  <Icon size={19} strokeWidth={1.75} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[14.5px] font-medium leading-tight text-white">{it.title}</span>
                  <span className="mt-2 block text-[12px] leading-[1.55] text-slate-400">{it.text}</span>
                </span>
              </Glass>
            </motion.div>
          );
        })}
      </div>

      <motion.p
        initial={fresh ? { opacity: 0, y: 10 } : false}
        animate={show(2) ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.75, ease: EASE }}
        className={`mt-[clamp(14px,2.4vh,30px)] flex items-start gap-2.5 text-[clamp(13.5px,1.25vw,19px)] font-light leading-snug text-white ${ORB_CLEAR}`}
      >
        <span className="mt-[9px] h-1.5 w-1.5 flex-none rounded-full bg-amber-400" />
        {c.verdict}
      </motion.p>
    </Stage>
  );
}
