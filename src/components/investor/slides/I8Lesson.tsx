"use client";

import { motion } from "framer-motion";
import { Camera, Check, Mic, Trophy, X } from "lucide-react";
import { useCopy } from "../copy";
import {
  EASE,
  Corners,
  Glass,
  ORB_CLEAR,
  SlideTitle,
  Stage,
} from "@/components/deck/ui";
import type { SlideProps } from "@/components/deck/types";

/**
 * 8 — DARS TAHLILI: KAMERA + OVOZ.
 *
 * Chapda real sinf kadri (kamera tahlili: o'qituvchi faol, sinf e'tibori,
 * telefon). O'ngda OVOZ TAHLILI: to'lqin animatsiyasi, o'qituvchi va sinf
 * gaplari ketma-ket chiqadi va har biri "darsga oid / oid emas" deb
 * belgilanadi; keyin dars o'tishi bahosi.
 *
 * ⚠️ Ovoz gaplari va baho foizlari — NAMUNA (`copy.lesson.note` buni ochiq
 * aytadi). E'tibor va baho hisoblangan qiymat, sensor o'lchovi emas.
 *
 * `cue`: 0 sarlavha · 1 kamera · 2 ovoz · 3 baho · 4 o'qituvchilar reytingi.
 */

const BARS = 28;

/** Umumiy ball — uchta ko'rsatkichning o'rtachasi */
const overall = (xs: { value: number }[]) =>
  Math.round(xs.reduce((a, x) => a + x.value, 0) / xs.length);

function Wave({ run }: { run: boolean }) {
  return (
    <div className="flex h-9 items-center gap-[3px]">
      {Array.from({ length: BARS }, (_, i) => {
        const base = 0.25 + 0.75 * Math.abs(Math.sin(i * 1.7));
        return (
          <motion.span
            key={i}
            className="w-[3px] rounded-full bg-ice"
            animate={
              run
                ? {
                    scaleY: [
                      base * 0.3,
                      base,
                      base * 0.4,
                      base * 0.9,
                      base * 0.3,
                    ],
                  }
                : { scaleY: 0.15 }
            }
            transition={
              run
                ? {
                    duration: 1.1 + (i % 5) * 0.15,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.03,
                  }
                : { duration: 0.4 }
            }
            style={{ height: "100%", originY: 0.5 }}
          />
        );
      })}
    </div>
  );
}

export default function I8Lesson({ active, t, fresh, at }: SlideProps) {
  const c = useCopy().lesson;
  const v = c.voice;
  const show = (cue: number) => !fresh || t >= (at[cue] ?? 0);
  const sinceVoice = t - (at[2] ?? 0);
  const total = overall(v.scores);
  /* Baholangan o'qituvchi kartasi: baho bo'lagidan 2.5 s keyin, oxirigacha turadi */
  const cardOn = !fresh || t >= (at[3] ?? 0) + 2.5;

  return (
    <Stage>
      <div className="relative">
        <SlideTitle kicker={c.kicker} title={c.title} run={fresh} />

        <div className="mt-[clamp(12px,2.2vh,28px)] grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          {/* ── chap: kamera tahlili ── */}
          <motion.div
            initial={fresh ? { opacity: 0, x: -20 } : false}
            animate={show(1) ? { opacity: 1, x: 0 } : { opacity: 0.14, x: 0 }}
            transition={{ duration: 0.65, ease: EASE }}
          >
            <Glass className="flex h-full flex-col overflow-hidden p-0">
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-black/40">
                <img
                  src="/imges/investor/kadr-telefon-sinf.webp"
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                <Corners />
                <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1.5 rounded bg-black/55 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-rose-300 backdrop-blur-sm">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" />
                  rec
                </span>
                <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1.5 rounded bg-black/60 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-slate-200 backdrop-blur-sm">
                  <Camera size={11} />
                  {c.frameNote}
                </span>
              </div>
              <div className="p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#8FB8FF]">
                  {c.camTitle}
                </p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {c.camChips.map((chip, i) => (
                    <motion.span
                      key={chip}
                      initial={fresh ? { opacity: 0, y: 6 } : false}
                      animate={show(1) ? { opacity: 1, y: 0 } : {}}
                      transition={{
                        duration: 0.45,
                        delay: fresh ? 0.4 + i * 0.35 : 0,
                        ease: EASE,
                      }}
                      className="inline-flex items-center gap-1.5 rounded-md border border-[#8FB8FF]/35 bg-[#8FB8FF]/10 px-2 py-1 font-mono text-[10px] text-slate-200"
                    >
                      <Check size={11} className="text-[#8FB8FF]" />
                      {chip}
                    </motion.span>
                  ))}
                </div>
              </div>
            </Glass>
          </motion.div>

          {/* ── o'ng: ovoz tahlili + baho ── */}
          <div className="flex flex-col gap-3">
            <motion.div
              initial={fresh ? { opacity: 0, x: 18 } : false}
              animate={show(2) ? { opacity: 1, x: 0 } : { opacity: 0.14, x: 0 }}
              transition={{ duration: 0.6, ease: EASE }}
              className="flex-[1.4]"
            >
              <Glass
                active={show(2) && !show(3)}
                className="flex h-full flex-col p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#C08BFF]">
                    <Mic size={13} />
                    {v.title}
                  </p>
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-slate-500">
                    {v.status}
                  </span>
                </div>
                <div className="mt-2">
                  <Wave run={active && show(2)} />
                </div>
                <ul className="mt-3 flex flex-1 flex-col justify-center gap-2">
                  {v.lines.map((ln, i) => {
                    const on = !fresh || sinceVoice >= 1.2 + i * 2.2;
                    const tone = ln.onTopic ? "#5DD6A5" : "#FF8A8A";
                    return (
                      <motion.li
                        key={ln.text}
                        initial={fresh ? { opacity: 0, x: 10 } : false}
                        animate={
                          on ? { opacity: 1, x: 0 } : { opacity: 0, x: 10 }
                        }
                        transition={{ duration: 0.45, ease: EASE }}
                        className="flex items-start justify-between gap-3 rounded-lg border border-white/[0.07] bg-white/[0.03] px-3 py-2"
                      >
                        <span className="min-w-0 text-[11.5px] leading-snug text-slate-300">
                          <span className="mr-1.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-slate-500">
                            {ln.who}
                          </span>
                          «{ln.text}»
                        </span>
                        <span
                          className="inline-flex flex-none items-center gap-1 rounded px-1.5 py-[3px] font-mono text-[9px] uppercase tracking-[0.08em]"
                          style={{ background: `${tone}22`, color: tone }}
                        >
                          {ln.onTopic ? <Check size={10} /> : <X size={10} />}
                          {ln.onTopic ? v.onLabel : v.offLabel}
                        </span>
                      </motion.li>
                    );
                  })}
                </ul>
              </Glass>
            </motion.div>

            <motion.div
              initial={fresh ? { opacity: 0, x: 18 } : false}
              animate={show(3) ? { opacity: 1, x: 0 } : { opacity: 0.14, x: 0 }}
              transition={{ duration: 0.6, ease: EASE }}
              className="flex-1"
            >
              <Glass active={show(3)} className="flex h-full flex-col p-4">
                <div className="flex items-baseline justify-between">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#FFC46B]">
                    {v.scoreTitle}
                  </p>
                  <p
                    className="font-light tabular-nums text-[#FFC46B]"
                    style={{ fontSize: "clamp(20px,2vw,30px)" }}
                  >
                    {total}
                    <span className="ml-1 text-[0.45em] text-slate-500">
                      / 100
                    </span>
                  </p>
                </div>
                <div className="mt-3 flex flex-col gap-2.5">
                  {v.scores.map((s, i) => (
                    <div key={s.label}>
                      <div className="flex items-baseline justify-between text-[11px] text-slate-300">
                        <span>{s.label}</span>
                        <span className="font-mono tabular-nums text-[#FFC46B]">
                          {s.value}%
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                        <motion.div
                          className="h-full rounded-full bg-[#FFC46B]"
                          initial={fresh ? { width: 0 } : false}
                          animate={{ width: show(3) ? `${s.value}%` : 0 }}
                          transition={{
                            duration: 0.9,
                            delay: fresh ? 0.3 + i * 0.25 : 0,
                            ease: EASE,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[11.5px] text-slate-400">{v.verdict}</p>
              </Glass>
            </motion.div>
          </div>
        </div>

        {/* ── o'qituvchilar reytingi ── */}
        <motion.div
          initial={fresh ? { opacity: 0, y: 10 } : false}
          animate={show(4) ? { opacity: 1, y: 0 } : { opacity: 0.14, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          className={`mt-3 ${ORB_CLEAR}`}
        >
          <Glass
            active={show(4)}
            className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3"
          >
            <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#8FB8FF]">
              <Trophy size={13} />
              {c.rank.title}
            </p>
            {c.rank.rows.map((r, i) => (
              <div
                key={r.name}
                className="flex min-w-[150px] flex-1 items-center gap-2.5"
              >
                <span className="font-mono text-[11px] tabular-nums text-slate-500">
                  #{i + 1}
                </span>
                <span className="text-[11.5px] text-slate-300">{r.name}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
                  <motion.div
                    className="h-full rounded-full bg-[#8FB8FF]"
                    initial={fresh ? { width: 0 } : false}
                    animate={{ width: show(4) ? `${r.value}%` : 0 }}
                    transition={{
                      duration: 0.9,
                      delay: fresh ? 0.3 + i * 0.25 : 0,
                      ease: EASE,
                    }}
                  />
                </div>
                <span className="font-mono text-[11px] tabular-nums text-[#8FB8FF]">
                  {r.value}
                </span>
              </div>
            ))}
          </Glass>
        </motion.div>
        <p
          className={`mt-2 text-[10.5px] leading-snug text-slate-500 ${ORB_CLEAR}`}
        >
          {c.note}
        </p>

        {/* ── markazda baholangan o'qituvchi kartasi (pop-up) ── */}
        <motion.div
          initial={false}
          animate={
            cardOn
              ? { opacity: 1, scale: 1, y: 0 }
              : { opacity: 0, scale: 0.85, y: 16 }
          }
          transition={{ duration: 0.6, ease: EASE }}
          className="pointer-events-none absolute inset-0 z-20 grid place-items-center"
        >
          <div className="w-[min(420px,86%)] rounded-3xl border border-[#FFC46B]/50 bg-[#0b1220]/95 p-6 text-center shadow-[0_0_60px_rgba(255,196,107,0.22)] backdrop-blur-md">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-slate-400">
              {c.card.role}
            </p>
            <p className="mt-2 text-[clamp(20px,2vw,28px)] font-light leading-tight text-white">
              {c.card.name}
            </p>
            <p className="mt-1 text-[11.5px] text-slate-400">
              {c.card.subject}
            </p>
            <p
              className="mt-4 font-extralight leading-none tabular-nums text-[#FFC46B]"
              style={{ fontSize: "clamp(64px,7vw,104px)" }}
            >
              {total}
              <span className="ml-1 text-[0.32em] text-slate-500">/ 100</span>
            </p>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-[#FFC46B]">
              {c.card.scoreLabel}
            </p>
          </div>
        </motion.div>
      </div>
    </Stage>
  );
}
