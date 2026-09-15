"use client";

import { motion } from "framer-motion";
import { BellRing, CameraOff, FileCheck2, Timer } from "lucide-react";
import { useCopy } from "../copy";
import { EASE, Glass, ORB_CLEAR, SlideTitle, Stage } from "@/components/deck/ui";
import type { SlideProps } from "@/components/deck/types";

/**
 * 11 — NATIJALAR.
 *
 * "Real natija" bo'limining yakuni. Bu yerda raqam emas, O'ZGARISH
 * ko'rsatiladi: nima edi va nima bo'ldi. Sabab — pilot hali qisqa,
 * shuning uchun "hodisalar soni 40% kamaydi" degan da'vo qilib bo'lmaydi
 * va qilinmaydi ham.
 *
 * Har bir kartada pastda "ilgari qanday edi" turibdi — o'zgarishni
 * ko'rsatishning eng halol usuli.
 *
 * ⚠️ Pastdagi sariq ogohlantirish asoschiga eslatma: pilot statistikasi
 * yig'ilgach bu slayd haqiqiy raqamlar bilan to'ldirilishi kerak.
 *
 * `cue` — ovoz bo'lagi indeksi (`copy.narration`).
 */
const ICONS = [Timer, FileCheck2, BellRing, CameraOff];
const COLORS = ["#7FE3B0", "#8FB8FF", "#C08BFF", "#FFC46B"];

export default function I11Results({ t, fresh, at }: SlideProps) {
  const c = useCopy().results;
  const show = (cue: number) => !fresh || t >= (at[cue] ?? 0);

  return (
    <Stage>
      <SlideTitle kicker={c.kicker} title={c.title} run={fresh} />

      <div className="mt-[clamp(16px,2.8vh,38px)] grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {c.gains.map((g, i) => {
          const Icon = ICONS[i];
          const color = COLORS[i];
          const on = show(1);
          return (
            <motion.div
              key={g.label}
              initial={fresh ? { opacity: 0, y: 22 } : false}
              animate={on ? { opacity: 1, y: 0 } : { opacity: 0.14, y: 0 }}
              transition={{ duration: 0.55, delay: fresh && on ? i * 0.12 : 0, ease: EASE }}
            >
              <Glass active={on} className="flex h-full flex-col p-5">
                <span
                  className="grid h-11 w-11 place-items-center rounded-xl"
                  style={{ background: `${color}1f`, color }}
                >
                  <Icon size={19} strokeWidth={1.75} />
                </span>

                <span
                  className="mt-4 block text-[clamp(18px,1.9vw,30px)] font-light leading-none tracking-[-0.035em]"
                  style={{ color }}
                >
                  {g.num}
                </span>
                <span className="mt-2 block text-[12.5px] leading-tight text-white">{g.label}</span>

                <span className="mt-auto block border-t border-white/[0.07] pt-3 text-[10.5px] leading-snug text-slate-500">
                  {g.note}
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
        className={`mt-[clamp(12px,2.2vh,28px)] flex items-start gap-2.5 text-[clamp(13.5px,1.25vw,19px)] font-light leading-snug text-white ${ORB_CLEAR}`}
      >
        <span className="mt-[9px] h-1.5 w-1.5 flex-none rounded-full bg-emerald-400" />
        {c.verdict}
      </motion.p>

      {/* asoschiga eslatma — pilot statistikasi bilan to'ldirilsin */}
      <motion.p
        initial={fresh ? { opacity: 0 } : false}
        animate={show(2) ? { opacity: 1 } : {}}
        transition={{ duration: 0.7, delay: 0.3 }}
        className={`mt-2.5 rounded-lg border border-amber-400/25 bg-amber-500/[0.07] px-3.5 py-2 text-[10.5px] leading-snug text-amber-200/80 ${ORB_CLEAR}`}
      >
        {c.note}
      </motion.p>
    </Stage>
  );
}
