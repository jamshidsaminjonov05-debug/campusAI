"use client";

import { motion } from "framer-motion";
import { AudioLines, CalendarCheck2, GaugeCircle, Lightbulb, Rows3, type LucideIcon } from "lucide-react";
import { useCopy } from "../copy";
import { EASE, Glass, Hud, SlideTitle, Stage } from "@/components/deck/ui";
import type { SlideProps } from "@/components/deck/types";

/**
 * 8 — O'QITUVCHI VA DARS SIFATI (rahbariyat uchun).
 *
 * ⚠️ To'rtinchi band — NUTQ TAHLILI — hali joriy etilmagan. U ekranda
 * «Keyingi bosqich» belgisi bilan turadi va bu ataylab: investorga
 * yo'l xaritasini ko'rsatish mumkin, lekin uni ishlayotgan funksiya deb
 * ko'rsatish mumkin emas. Qolgan uchtasi bugun ishlaydi (xodimlar
 * davomati, dars kesimidagi kayfiyat va e'tibor).
 *
 * `cue` — ovoz bo'lagi indeksi (`copy.narration`).
 */

const ITEM_VIEW: { cue: number; icon: LucideIcon; roadmap?: boolean }[] = [
  { cue: 1, icon: CalendarCheck2 },
  { cue: 2, icon: GaugeCircle },
  { cue: 2, icon: Rows3 },
  { cue: 3, icon: AudioLines, roadmap: true },
];

export default function S8Teachers({ t, fresh, at }: SlideProps) {
  const copy = useCopy();
  const c = copy.teachers;
  const show = (cue: number) => !fresh || t >= (at[cue] ?? 0);

  return (
    <Stage>
      <SlideTitle kicker={c.kicker} title={c.title} run={fresh} />

      <div className="mt-[clamp(16px,3vh,36px)] grid gap-[clamp(20px,2.6vw,44px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* ── chap: imkoniyatlar ── */}
        <ul className="flex flex-col gap-2.5">
          {c.items.map((it, i) => {
            const v = ITEM_VIEW[i];
            const Icon = v.icon;
            const on = show(v.cue);
            return (
              <motion.li
                key={it.title}
                initial={fresh ? { opacity: 0, x: -18 } : false}
                animate={on ? { opacity: 1, x: 0 } : { opacity: 0.18, x: 0 }}
                transition={{ duration: 0.5, ease: EASE }}
              >
                <Glass active={on} className="flex items-start gap-3.5 px-5 py-3.5">
                  <span
                    className={`grid h-10 w-10 flex-none place-items-center rounded-xl ${
                      v.roadmap ? "bg-amber-500/[0.14] text-amber-300" : "bg-ice/[0.12] text-ice"
                    }`}
                  >
                    <Icon size={18} strokeWidth={1.7} />
                  </span>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[14.5px] font-medium text-white">{it.title}</span>
                      {v.roadmap && (
                        <span className="rounded border border-amber-400/35 bg-amber-500/[0.12] px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-amber-200">
                          {copy.roadmap}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-[12.5px] leading-[1.5] text-slate-400">{it.text}</span>
                  </span>
                </Glass>
              </motion.li>
            );
          })}
        </ul>

        {/* ── o'ng: dars kartasi va tavsiya ── */}
        <div className="flex flex-col gap-3">
          <motion.div
            initial={fresh ? { opacity: 0, y: 16 } : false}
            animate={show(2) ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <Glass active className="p-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ice/70">{c.metricsTitle}</p>
              <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3.5">
                {c.metrics.map((m, i) => (
                  <motion.div
                    key={m.label}
                    initial={fresh ? { opacity: 0 } : false}
                    animate={show(2) ? { opacity: 1 } : {}}
                    transition={{ duration: 0.5, delay: fresh ? 0.08 * i : 0 }}
                  >
                    <p className="text-[clamp(20px,1.9vw,30px)] font-light leading-none tracking-[-0.03em] text-white tabular-nums">
                      {m.value}
                    </p>
                    <p className="mt-1 text-[12px] leading-snug text-slate-400">{m.label}</p>
                  </motion.div>
                ))}
              </div>
            </Glass>
          </motion.div>

          <motion.div
            initial={fresh ? { opacity: 0, y: 16 } : false}
            animate={show(4) ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <Glass className="p-5">
              <p className="flex items-center gap-2 text-[13.5px] font-medium text-white">
                <Lightbulb size={16} className="text-amber-300" />
                {c.adviceTitle}
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                {c.advice.map((a, i) => (
                  <motion.li
                    key={a}
                    initial={fresh ? { opacity: 0, x: 12 } : false}
                    animate={show(4) ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.45, delay: fresh ? 0.1 * i : 0, ease: EASE }}
                    className="flex gap-2.5 text-[12.5px] leading-[1.5] text-slate-300"
                  >
                    <span className="mt-[7px] h-1 w-1 flex-none rounded-full bg-ice" />
                    {a}
                  </motion.li>
                ))}
              </ul>
            </Glass>
          </motion.div>

          <motion.div
            initial={fresh ? { opacity: 0 } : false}
            animate={show(5) ? { opacity: 1 } : {}}
            transition={{ duration: 0.8 }}
            className="flex justify-center"
          >
            <Hud tone="ok">{c.note}</Hud>
          </motion.div>
        </div>
      </div>
    </Stage>
  );
}
