"use client";

import { motion } from "framer-motion";
import { Clock, Radio } from "lucide-react";
import { useCopy } from "../copy";
import { LIVE_SCHOOL } from "../model";
import { EASE, Corners, Glass, ORB_CLEAR, SlideTitle, Stage } from "@/components/deck/ui";
import type { SlideProps } from "@/components/deck/types";

/**
 * 10 — 179-MAKTAB: TIZIM HOZIR ISHLAB TURIBDI.
 *
 * ⚠️ TAQDIMOTNING BURILISH NUQTASI. Shu paytgacha hammasi "biz qila
 * olamiz" edi; bu slayddan keyin "biz qilyapmiz" bo'ladi. Investor uchun
 * ikkisining orasidagi farq — butun taqdimotning qiymati.
 *
 * ⚠️ UCHALA KADR HAM BIR KUNDA olingan (14-sentabr) va uchtasi ham TURLI
 * detektor: chekish, janjal, kirish nazorati. Bu tasodifiy topilma emas —
 * aynan shu narsa "tizim uzluksiz ishlayapti" degan da'voni isbotlaydi.
 * Kadrlarni yangilasangiz shu qoidani saqlang: bitta kun, turli detektor.
 *
 * Yuqoridagi "Jonli" belgisi pulsatsiya qiladi — bu arxiv emas, ishlab
 * turgan tizim degan signalni beradi.
 *
 * `cue` — ovoz bo'lagi indeksi (`copy.narration`).
 */

/** Kadrlar — `copy.live.frames` tartibida */
const FRAMES = [
  { src: "/imges/investor/live-chekish.webp", tone: "#FFC46B" },
  { src: "/imges/investor/live-janjal.webp", tone: "#FF8A8A" },
  { src: "/imges/investor/live-kirish.webp", tone: "#8FB8FF" },
];

const TONES: Record<string, string> = {
  Qurol: "#FF5C5C",
  Weapon: "#FF5C5C",
  Chekish: "#FFC46B",
  Smoking: "#FFC46B",
  Janjal: "#FF8A8A",
  Fight: "#FF8A8A",
  Kechikish: "#8FB8FF",
  Lateness: "#8FB8FF",
};

export default function I10Live({ t, fresh, at }: SlideProps) {
  const c = useCopy().live;
  const show = (cue: number) => !fresh || t >= (at[cue] ?? 0);

  return (
    <Stage>
      <SlideTitle kicker={c.kicker} title={c.title} run={fresh} />

      {/* jonli belgisi — sarlavha ostida, alohida qatorda */}
      <motion.div
        initial={fresh ? { opacity: 0 } : false}
        animate={show(0) ? { opacity: 1 } : {}}
        transition={{ duration: 0.6, delay: fresh ? 0.3 : 0 }}
        className="mt-2.5 flex flex-wrap items-center gap-3"
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/50 bg-emerald-500/12 px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.2em] text-emerald-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          {c.badge}
        </span>
        <span className="font-mono text-[11.5px] tracking-[0.08em] text-white">
          {LIVE_SCHOOL.name} · {LIVE_SCHOOL.city}
        </span>
        {/* bitta kun — kadrlarning eng kuchli tomoni */}
        <span className="inline-flex items-center gap-1.5 font-mono text-[10.5px] tracking-[0.06em] text-ice/80">
          <Clock size={11} />
          {c.sameDay}
        </span>
      </motion.div>

      {/* ── uchta real kadr ── */}
      <div className="mt-[clamp(10px,1.8vh,22px)] grid gap-2.5 lg:grid-cols-3">
        {c.frames.map((f, i) => {
          const frame = FRAMES[i];
          const on = show(1);
          return (
            <motion.div
              key={f.label}
              initial={fresh ? { opacity: 0, y: 18 } : false}
              animate={on ? { opacity: 1, y: 0 } : { opacity: 0.14, y: 0 }}
              transition={{ duration: 0.55, delay: fresh && on ? i * 0.13 : 0, ease: EASE }}
            >
              <Glass className="flex h-full flex-col overflow-hidden p-0">
                <div className="relative aspect-video w-full overflow-hidden bg-black/40">
                  <img src={frame.src} alt="" className="h-full w-full object-cover" loading="lazy" />
                  <Corners />
                  <span className="absolute right-2 top-2 inline-flex items-center gap-1.5 rounded bg-black/55 px-1.5 py-[3px] font-mono text-[8.5px] uppercase tracking-[0.14em] text-rose-300 backdrop-blur-sm">
                    <span className="h-1 w-1 animate-pulse rounded-full bg-rose-400" />
                    rec
                  </span>
                  <span
                    className="absolute bottom-2 left-2 rounded px-2 py-[3px] font-mono text-[9.5px] font-semibold uppercase tracking-[0.08em] text-[#0b0f18]"
                    style={{ background: frame.tone }}
                  >
                    {f.label}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 px-3 py-2.5">
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-slate-500">{f.cam}</span>
                  <span className="font-mono text-[10px] tabular-nums text-slate-400">{f.when}</span>
                </div>
              </Glass>
            </motion.div>
          );
        })}
      </div>

      {/* ── pastki qator: faol detektorlar + hodisa qaydlari ── */}
      <div className="mt-2.5 grid gap-2.5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <motion.div
          initial={fresh ? { opacity: 0, x: -16 } : false}
          animate={show(1) ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.6, delay: fresh ? 0.3 : 0, ease: EASE }}
        >
          <Glass className="flex h-full flex-col p-4">
            <p className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-ice/70">{c.factsTitle}</p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {LIVE_SCHOOL.detectors.map((d, i) => (
                <motion.span
                  key={d}
                  initial={fresh ? { opacity: 0, scale: 0.9 } : false}
                  animate={show(1) ? { opacity: 1, scale: 1 } : {}}
                  transition={{ duration: 0.4, delay: fresh ? 0.06 * i + 0.35 : 0, ease: EASE }}
                  className="rounded-md border border-emerald-400/30 bg-emerald-500/[0.08] px-2 py-1 font-mono text-[10px] tracking-[0.04em] text-emerald-200"
                >
                  {d}
                </motion.span>
              ))}
            </div>

            <div className="mt-auto grid grid-cols-2 gap-2 border-t border-white/[0.08] pt-3">
              {c.facts.map((f) => (
                <span key={f.label}>
                  <span className="block font-mono text-[8.5px] uppercase tracking-[0.12em] text-slate-600">
                    {f.label}
                  </span>
                  <span className="mt-0.5 block text-[10.5px] leading-snug text-slate-300">{f.value}</span>
                </span>
              ))}
            </div>
          </Glass>
        </motion.div>

        <motion.div
          initial={fresh ? { opacity: 0, x: 16 } : false}
          animate={show(1) ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.6, delay: fresh ? 0.4 : 0, ease: EASE }}
        >
          <Glass active className="flex h-full flex-col p-4">
            <p className="flex items-center gap-2 font-mono text-[9.5px] uppercase tracking-[0.18em] text-ice/70">
              <Radio size={11} />
              {c.kicker}
            </p>

            <div className="mt-1 flex flex-1 flex-col justify-center divide-y divide-white/[0.06]">
              {c.events.map((e, i) => {
                const tone = TONES[e.type] ?? "#8FB8FF";
                return (
                  <motion.div
                    key={e.type + e.when}
                    initial={fresh ? { opacity: 0, x: 10 } : false}
                    animate={show(1) ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.4, delay: fresh ? 0.08 * i + 0.45 : 0, ease: EASE }}
                    className="flex items-center gap-2.5 py-1.5"
                  >
                    <span className="h-1.5 w-1.5 flex-none rounded-full" style={{ background: tone }} />
                    <span className="min-w-0 flex-1 text-[11.5px] leading-tight" style={{ color: tone }}>
                      {e.type}
                    </span>
                    <span className="font-mono text-[9.5px] text-slate-500">{e.cam}</span>
                    <span className="w-[112px] text-right font-mono text-[10px] tabular-nums text-slate-300">
                      {e.when}
                    </span>
                    <span className="w-[42px] text-right font-mono text-[9.5px] tabular-nums text-slate-500">
                      {e.conf}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </Glass>
        </motion.div>
      </div>

      <motion.p
        initial={fresh ? { opacity: 0 } : false}
        animate={show(2) ? { opacity: 1 } : {}}
        transition={{ duration: 0.7 }}
        className={`mt-2 text-[10.5px] leading-snug text-ice/80 ${ORB_CLEAR}`}
      >
        {c.note}
      </motion.p>
    </Stage>
  );
}
