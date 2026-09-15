"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Check, Flame, Scale, Target } from "lucide-react";
import { useCopy } from "../copy";
import { EASE, Glass, ORB_CLEAR, SlideTitle, Stage } from "@/components/deck/ui";
import type { SlideProps } from "@/components/deck/types";

/**
 * 1 — LOYIHANING MAQSADI. TAQDIMOTNING ENG KUCHLI SLAYDI.
 *
 * Har qanday investor "nega hozir?" deb so'raydi. Javob bizning fikrimiz
 * emas — hujjat: 2026-yil 31-iyul Vazirlar Mahkamasi qarori barcha ta'lim
 * muassasalari uchun texnik talablarni MAJBURIY qildi.
 *
 * Markaziy g'oya — BIRINCHI SIGNAL. Qaror "qurolli hujum, shubhali shaxs
 * yoki shubhali buyum" ni aniqlashni talab qiladi, bu esa aynan kompyuter
 * ko'rish masalasi. Shuning uchun u alohida ranglanadi: qolgan hamma narsa
 * shu satr uchun fon.
 *
 * `cue` — ovoz bo'lagi indeksi (`copy.narration`).
 */
export default function I1Purpose({ t, fresh, at }: SlideProps) {
  const c = useCopy().purpose;
  const show = (cue: number) => !fresh || t >= (at[cue] ?? 0);

  return (
    <Stage>
      <SlideTitle kicker={c.kicker} title={c.title} run={fresh} />

      <div className="mt-[clamp(12px,2.2vh,26px)] grid gap-[clamp(14px,1.8vw,28px)] lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        {/* ── chap: bizning maqsadimiz + qaror talablari ── */}
        <div className="flex flex-col gap-[clamp(10px,1.4vh,18px)]">
          <motion.div
            initial={fresh ? { opacity: 0, x: -20 } : false}
            animate={show(0) ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <Glass active className="p-4">
              <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-ice/70">
                <Target size={13} />
                {c.kicker}
              </p>
              <ul className="mt-3 flex flex-col gap-2">
                {c.goals.map((g, i) => (
                  <motion.li
                    key={g}
                    initial={fresh ? { opacity: 0, x: -10 } : false}
                    animate={show(0) ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.45, delay: fresh ? 0.1 * i : 0, ease: EASE }}
                    className="flex items-start gap-2.5 text-[12.5px] leading-snug text-slate-200"
                  >
                    <span className="mt-[7px] h-1 w-1 flex-none rounded-full bg-ice" />
                    {g}
                  </motion.li>
                ))}
              </ul>
            </Glass>
          </motion.div>

          <motion.div
            initial={fresh ? { opacity: 0, x: -20 } : false}
            animate={show(1) ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, ease: EASE }}
            className="flex-1"
          >
            <Glass className="flex h-full flex-col p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-ice/15 text-ice">
                  <Scale size={17} strokeWidth={1.7} />
                </span>
                <span className="min-w-0">
                  <span className="block font-mono text-[9.5px] uppercase tracking-[0.2em] text-ice/70">{c.decreeLabel}</span>
                  <span className="mt-0.5 block text-[clamp(15px,1.5vw,22px)] font-light leading-none tracking-[-0.02em] text-white">
                    {c.decreeDate}
                  </span>
                </span>
              </div>

              <ul className="mt-3 flex flex-col gap-1.5 border-t border-white/[0.08] pt-3">
                {c.requires.map((r, i) => (
                  <motion.li
                    key={r}
                    initial={fresh ? { opacity: 0, x: -8 } : false}
                    animate={show(1) ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.4, delay: fresh ? 0.08 * i : 0, ease: EASE }}
                    className="flex items-start gap-2 text-[11.5px] leading-snug text-slate-300"
                  >
                    <Check size={13} className="mt-[3px] flex-none text-emerald-400" strokeWidth={2.4} />
                    {r}
                  </motion.li>
                ))}
              </ul>
            </Glass>
          </motion.div>
        </div>

        {/* ── o'ng: ikki signal va jadval ── */}
        <div className="flex flex-col gap-[clamp(10px,1.4vh,18px)]">
          <motion.div
            initial={fresh ? { opacity: 0, y: 16 } : false}
            animate={show(2) ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <Glass className="p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ice/70">{c.signalTitle}</p>

              {/* BIRINCHI SIGNAL — bizning detektorlarimiz. Ataylab ajratilgan. */}
              <motion.div
                initial={fresh ? { opacity: 0, scale: 0.97 } : false}
                animate={show(2) ? { opacity: 1, scale: 1 } : { opacity: 0.5, scale: 1 }}
                transition={{ duration: 0.55, delay: fresh ? 0.2 : 0, ease: EASE }}
                className="relative mt-2.5 overflow-hidden rounded-xl border p-3.5"
                style={{
                  borderColor: show(2) ? "rgba(251,113,133,0.5)" : "rgba(255,255,255,0.08)",
                  background: show(2) ? "linear-gradient(100deg, rgba(251,113,133,0.16), rgba(255,255,255,0.02) 70%)" : "transparent",
                  boxShadow: show(2) ? "0 0 46px -20px rgba(251,113,133,0.8)" : "none",
                }}
              >
                <span className="absolute inset-y-0 left-0 w-[3px] bg-rose-400" />
                <div className="flex items-center gap-3 pl-1">
                  <AlertTriangle size={16} className="flex-none text-rose-300" strokeWidth={1.9} />
                  <span className="text-[12.5px] font-medium leading-snug text-white">{c.signalOne}</span>
                </div>
              </motion.div>

              <div className="mt-2 rounded-xl border border-white/[0.08] p-3.5">
                <div className="flex items-center gap-3">
                  <Flame size={16} className="flex-none text-amber-300/80" strokeWidth={1.9} />
                  <span className="text-[12.5px] leading-snug text-slate-400">{c.signalTwo}</span>
                </div>
              </div>

              <motion.p
                initial={fresh ? { opacity: 0 } : false}
                animate={show(2) ? { opacity: 1 } : {}}
                transition={{ duration: 0.7, delay: 0.35 }}
                className="mt-3 flex items-start gap-2 text-[11.5px] leading-snug text-rose-200/90"
              >
                <span className="mt-[6px] h-1 w-1 flex-none rounded-full bg-rose-300" />
                {c.signalNote}
              </motion.p>
            </Glass>
          </motion.div>

          {/* joriy etish jadvali */}
          <motion.div
            initial={fresh ? { opacity: 0, y: 16 } : false}
            animate={show(2) ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: fresh ? 0.25 : 0, ease: EASE }}
            className="flex-1"
          >
            <Glass className="flex h-full flex-col p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ice/70">{c.timelineTitle}</p>
              <div className="mt-3 flex flex-1 items-center gap-3">
                {c.timeline.map((row, i) => (
                  <div key={row.year} className="relative flex-1 rounded-xl border border-ice/25 bg-ice/[0.06] p-3">
                    <span className="block font-mono text-[clamp(16px,1.6vw,23px)] font-light leading-none tracking-[-0.02em] text-ice">
                      {row.year}
                    </span>
                    <span className="mt-1.5 block text-[11px] leading-snug text-slate-300">{row.text}</span>
                    {i === 0 && <span className="absolute -right-3 top-1/2 h-px w-3 bg-ice/40" />}
                  </div>
                ))}
              </div>
            </Glass>
          </motion.div>
        </div>
      </div>

      {/* ── pastdagi xulosa ── */}
      <motion.div
        initial={fresh ? { opacity: 0, y: 12 } : false}
        animate={show(2) ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, delay: fresh ? 0.4 : 0, ease: EASE }}
        className={`mt-[clamp(10px,1.8vh,20px)] ${ORB_CLEAR}`}
      >
        <p className="text-[clamp(13px,1.2vw,18px)] font-light leading-snug text-white">
          <span className="mr-2 inline-block h-2 w-2 translate-y-[-2px] rounded-full bg-ice" />
          {c.punch}
        </p>
        <p className="mt-1.5 text-[10px] leading-snug text-slate-500">{c.source}</p>
      </motion.div>
    </Stage>
  );
}
