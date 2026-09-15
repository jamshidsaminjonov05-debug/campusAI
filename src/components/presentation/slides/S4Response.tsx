"use client";

import { motion } from "framer-motion";
import { BellRing, CheckCircle2, Cpu, FileVideo, MonitorPlay, Siren } from "lucide-react";
import { useCopy } from "../copy";
import { EASE, Glass, Hud, SlideTitle, Stage } from "@/components/deck/ui";
import type { SlideProps } from "@/components/deck/types";

/**
 * 4 — REAL VAQTDAGI JAVOB.
 *
 * Chapda sekundomer: hodisadan boshlab necha soniya o'tgani. O'ngda —
 * o'sha soniyalarda tizim nima qilgani. Maqsad: "tez" degan so'zni
 * raqamga aylantirish.
 *
 * Sekundomer ovoz bilan bog'langan: raqam nutqdagi bo'lakka qarab
 * o'sadi, shuning uchun "o'n ikkinchi soniya" deyilgan lahzada ekranda
 * ham 12.0 turadi.
 */

const STEPS = [
  { mark: "00.0", icon: Siren, tone: "alert" as const, sec: 0 },
  { mark: "00.8", icon: Cpu, tone: "alert" as const, sec: 0.8 },
  { mark: "02.0", icon: MonitorPlay, tone: "ice" as const, sec: 2 },
  { mark: "12.0", icon: BellRing, tone: "ice" as const, sec: 12 },
  { mark: "— —", icon: CheckCircle2, tone: "ok" as const, sec: 12 },
];

/** Bo'lak vaqtlari orasida sekundomer chiziqli o'sadi */
function clockValue(at: number[], t: number): number {
  if (at.length < 2 || t <= at[0]) return 0;
  for (let i = 1; i < at.length; i++) {
    if (t < at[i]) {
      const span = at[i] - at[i - 1] || 1;
      return STEPS[i - 1].sec + ((t - at[i - 1]) / span) * (STEPS[i].sec - STEPS[i - 1].sec);
    }
  }
  return 12;
}

export default function S4Response({ t, fresh, at }: SlideProps) {
  const c = useCopy().response;
  const show = (time: number) => !fresh || t >= time;
  const sec = fresh ? clockValue(at, t) : 12;
  const last = at[at.length - 1] ?? 0;

  return (
    <Stage>
      <SlideTitle kicker={c.kicker} title={c.title} run={fresh} />

      <div className="mt-[clamp(24px,4vh,52px)] grid items-center gap-[clamp(24px,3.5vw,64px)] lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        {/* ── sekundomer ── */}
        <div className="relative">
          <Glass active className="px-8 py-10 text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.34em] text-ice/70">{c.since}</p>
            <p className="mt-4 font-mono text-[clamp(52px,7.5vw,110px)] font-light leading-none tracking-[-0.04em] text-white tabular-nums">
              {sec.toFixed(1)}
              <span className="ml-4 text-[0.28em] tracking-[0.2em] text-ice/70">{c.seconds}</span>
            </p>

            <div className="mt-7 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-rose-400 via-ice to-emerald-300"
                animate={{ width: `${Math.min(100, (sec / 12) * 100)}%` }}
                transition={{ duration: 0.25, ease: "linear" }}
              />
            </div>

            <div className="mt-6 flex justify-center">
              {show(last) ? (
                <Hud tone="ok">
                  <CheckCircle2 size={13} /> {c.confirmed}
                </Hud>
              ) : (
                <Hud tone="alert">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" /> {c.active}
                </Hud>
              )}
            </div>
          </Glass>

          {/* Hodisa kartasi — video bilan. Klip maktabning O'Z kamerasidan:
              "karta" degan so'z shu yerda ko'rinadigan narsaga aylanadi. */}
          <motion.div
            initial={fresh ? { opacity: 0, y: 14 } : false}
            animate={show(last) ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, ease: EASE }}
            className="mt-4 flex items-stretch gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3"
          >
            <div className="relative w-[130px] flex-none overflow-hidden rounded-lg border border-white/10 bg-black">
              <video
                src="/video/taqdimot/hovli-2.mp4"
                poster="/video/taqdimot/hovli-2-poster.jpg"
                autoPlay
                muted
                loop
                playsInline
                className="h-full w-full object-cover"
              />
              <span className="absolute bottom-1 left-1 rounded bg-black/65 px-1.5 py-px font-mono text-[8.5px] tracking-wide text-white/80">
                {c.clip}
              </span>
            </div>
            <p className="flex items-center gap-2.5 text-[12.5px] leading-snug text-slate-400">
              <FileVideo size={17} className="flex-none text-ice" />
              {c.dossier}
            </p>
          </motion.div>
        </div>

        {/* ── bosqichlar ── */}
        <ol className="relative flex flex-col gap-4 pl-8">
          <span className="absolute left-[11px] top-2 h-[calc(100%-16px)] w-px bg-white/10" />
          <motion.span
            className="absolute left-[11px] top-2 w-px bg-gradient-to-b from-rose-400 via-ice to-emerald-300"
            animate={{ height: fresh ? `${Math.min(100, (Math.max(0, t) / (last + 1)) * 100)}%` : "100%" }}
            transition={{ duration: 0.3, ease: "linear" }}
          />

          {c.steps.map((s, i) => {
            const Icon = STEPS[i].icon;
            const tone = STEPS[i].tone;
            const on = show(at[i]);
            const dot =
              tone === "alert" ? "border-rose-400 bg-rose-500/25" : tone === "ok" ? "border-emerald-400 bg-emerald-500/25" : "border-ice bg-ice/25";
            return (
              <motion.li
                key={s.title}
                initial={fresh ? { opacity: 0, x: 18 } : false}
                animate={on ? { opacity: 1, x: 0 } : { opacity: 0.22, x: 0 }}
                transition={{ duration: 0.55, ease: EASE }}
                className="relative"
              >
                <span
                  className={`absolute -left-8 top-[18px] grid h-[23px] w-[23px] -translate-x-px place-items-center rounded-full border-2 transition-colors duration-500 ${
                    on ? dot : "border-white/15 bg-[#0b1020]"
                  }`}
                >
                  <Icon size={11} className="text-white" />
                </span>
                <Glass active={on} className="flex items-center gap-4 px-5 py-4">
                  <span className="w-[58px] flex-none font-mono text-[15px] tracking-wide text-ice tabular-nums">{STEPS[i].mark}</span>
                  <span>
                    <span className="block text-[15px] font-medium text-white">{s.title}</span>
                    <span className="block text-[13px] leading-snug text-slate-400">{s.text}</span>
                  </span>
                </Glass>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </Stage>
  );
}
