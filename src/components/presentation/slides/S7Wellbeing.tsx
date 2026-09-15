"use client";

import { motion } from "framer-motion";
import { AlertTriangle, CalendarX2, UserMinus, Users2, Repeat2, type LucideIcon } from "lucide-react";
import { useCopy } from "../copy";
import { EASE, Glass, SlideTitle, Stage } from "@/components/deck/ui";
import type { SlideProps } from "@/components/deck/types";

/**
 * 7 — O'QUVCHI HOLATI.
 *
 * Kayfiyat yozuvlari HAQIQIY: yuz tanishning har bir qaydida
 * `emotion_group` keladi (`lib/moodTimeline.ts`). "E'tibor" esa HOSILA —
 * kayfiyat aralashmasidan hisoblanadi va ilovaning o'zida ham shunday
 * yozilgan. Taqdimot shu farqni YASHIRMAYDI: ko'rsatkich yonida
 * «hisoblangan» belgisi turadi.
 *
 * Agressiya belgisi — model emas, QOIDA: yorliqda g'azab so'zi yoki qisqa
 * oraliqda ketma-ket salbiy qayd. Sabab har doim yoziladi.
 *
 * `cue` — ovoz bo'lagi indeksi (`copy.narration`).
 */

/** Kun davomidagi kayfiyat — soatlar bo'yicha (namuna profil) */
const DAY = [
  { h: "08", g: "p" }, { h: "09", g: "p" }, { h: "10", g: "n" }, { h: "11", g: "x" },
  { h: "11", g: "x" }, { h: "12", g: "x" }, { h: "13", g: "n" }, { h: "14", g: "p" },
] as const;

/** Dars kesimida e'tibor (hosila ko'rsatkich). Shkala 50 dan boshlanadi —
 *  farq ko'rinsin; har ustun ustida aniq foiz yozilgani uchun adashtirmaydi. */
const LESSONS = [84, 79, 61, 58, 72, 80];

const SIGNAL_ICONS: LucideIcon[] = [Repeat2, Users2, CalendarX2, UserMinus];

const MOOD_COLOR = { p: "#7CE7B0", n: "#8FB8FF", x: "#FF6B7A" } as const;

export default function S7Wellbeing({ t, fresh, at }: SlideProps) {
  const c = useCopy().wellbeing;
  const derived = useCopy().derived;
  const show = (cue: number) => !fresh || t >= (at[cue] ?? 0);

  return (
    <Stage>
      <SlideTitle kicker={c.kicker} title={c.title} run={fresh} />

      <div className="mt-[clamp(16px,3vh,36px)] grid gap-[clamp(20px,2.6vw,44px)] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        {/* ── chap: kayfiyat va e'tibor ── */}
        <div className="flex flex-col gap-3">
          {/* kun davomidagi kayfiyat */}
          <motion.div
            initial={fresh ? { opacity: 0, y: 16 } : false}
            animate={show(1) ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <Glass className="p-5">
              <div className="flex items-baseline justify-between">
                <p className="text-[14px] font-medium text-white">{c.dayTitle}</p>
                <span className="flex gap-3">
                  {c.moods.map((m, i) => (
                    <span key={m} className="flex items-center gap-1.5 font-mono text-[10.5px] text-slate-500">
                      <span className="h-2 w-2 rounded-full" style={{ background: Object.values(MOOD_COLOR)[i] }} />
                      {m}
                    </span>
                  ))}
                </span>
              </div>
              <div className="mt-4 flex items-end gap-2">
                {DAY.map((d, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                    <motion.span
                      initial={fresh ? { height: 0 } : false}
                      animate={show(1) ? { height: d.g === "p" ? 52 : d.g === "n" ? 34 : 20 } : {}}
                      transition={{ duration: 0.5, delay: fresh ? 0.05 * i : 0, ease: EASE }}
                      className="w-full rounded-t-md"
                      style={{
                        background: MOOD_COLOR[d.g],
                        opacity: 0.8,
                        height: fresh ? undefined : d.g === "p" ? 52 : d.g === "n" ? 34 : 20,
                      }}
                    />
                    <span className="font-mono text-[10px] text-slate-600">{d.h}</span>
                  </div>
                ))}
              </div>
            </Glass>
          </motion.div>

          {/* dars kesimida e'tibor */}
          <motion.div
            initial={fresh ? { opacity: 0, y: 16 } : false}
            animate={show(2) ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <Glass className="p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[14px] font-medium text-white">{c.lessonsTitle}</p>
                {/* ⚠️ Halollik belgisi: bu o'lchov emas, hisob */}
                <span className="rounded border border-ice/25 bg-ice/[0.08] px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.12em] text-ice/80">
                  {derived}
                </span>
              </div>
              <div className="mt-4 flex items-end gap-2.5">
                {LESSONS.map((v, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                    <span className="font-mono text-[10.5px] text-ice/70">{v}</span>
                    <motion.span
                      initial={fresh ? { height: 0 } : false}
                      animate={show(2) ? { height: Math.round(12 + ((v - 50) / 50) * 62) } : {}}
                      transition={{ duration: 0.6, delay: fresh ? 0.06 * i : 0, ease: EASE }}
                      className="w-full rounded-t-md bg-gradient-to-t from-ice/20 to-ice/75"
                      style={{ height: fresh ? undefined : Math.round(12 + ((v - 50) / 50) * 62) }}
                    />
                    <span className="font-mono text-[10px] text-slate-600">{i + 1}</span>
                  </div>
                ))}
              </div>
            </Glass>
          </motion.div>

          {/* agressiya belgisi */}
          <motion.div
            initial={fresh ? { opacity: 0, y: 14 } : false}
            animate={show(3) ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, ease: EASE }}
            className="flex items-start gap-3.5 rounded-xl border border-rose-400/30 bg-rose-500/[0.08] px-5 py-4"
          >
            <AlertTriangle size={19} className="mt-0.5 flex-none text-rose-300" />
            <span>
              <span className="block font-mono text-[12px] uppercase tracking-[0.12em] text-rose-200">{c.flagTitle}</span>
              <span className="mt-1 block text-[13px] leading-snug text-slate-300">{c.flagText}</span>
              <span className="mt-1 block text-[12px] leading-snug text-slate-500">{c.flagReason}</span>
            </span>
          </motion.div>
        </div>

        {/* ── o'ng: bosim belgilari ── */}
        <div>
          <motion.p
            initial={fresh ? { opacity: 0 } : false}
            animate={show(4) ? { opacity: 1 } : {}}
            transition={{ duration: 0.6 }}
            className="mb-3 font-mono text-[11px] uppercase tracking-[0.26em] text-ice/70"
          >
            {c.signalsTitle}
          </motion.p>

          <ul className="flex flex-col gap-2.5">
            {c.signals.map((s, i) => {
              const Icon = SIGNAL_ICONS[i];
              const on = show(4);
              return (
                <motion.li
                  key={s.title}
                  initial={fresh ? { opacity: 0, x: 18 } : false}
                  animate={on ? { opacity: 1, x: 0 } : { opacity: 0.18, x: 0 }}
                  transition={{ duration: 0.5, delay: fresh && on ? i * 0.09 : 0, ease: EASE }}
                >
                  <Glass active={on} className="flex items-start gap-3.5 px-5 py-3.5">
                    <span className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-ice/[0.12] text-ice">
                      <Icon size={17} strokeWidth={1.7} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[14px] font-medium text-white">{s.title}</span>
                      <span className="mt-0.5 block text-[12.5px] leading-[1.5] text-slate-400">{s.text}</span>
                    </span>
                  </Glass>
                </motion.li>
              );
            })}
          </ul>

          <motion.p
            initial={fresh ? { opacity: 0 } : false}
            animate={show(5) ? { opacity: 1 } : {}}
            transition={{ duration: 0.8 }}
            className="mt-4 rounded-xl border border-emerald-400/25 bg-emerald-500/[0.07] px-5 py-3.5 text-[12.5px] leading-snug text-slate-300"
          >
            {c.note}
          </motion.p>
        </div>
      </div>
    </Stage>
  );
}
