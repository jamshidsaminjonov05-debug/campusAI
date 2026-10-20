"use client";

import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { Camera, Clock, Cpu, ShieldAlert, Siren, Zap } from "lucide-react";
import {
  EASE,
  Corners,
  Glass,
  ORB_CLEAR,
  SlideTitle,
  Stage,
} from "@/components/deck/ui";
import type { SlideProps } from "@/components/deck/types";
import type { ThreatCaseCopy } from "../copy/types";

/**
 * Qurolni aniqlash: chapda real kadr (video, trevoga bilan), o'ngda
 * "qanday ishlaydi / natija / ustuvorlik" kartalari.
 *
 * `cue` — ovoz bo'lagi: 0 sarlavha · 1 video va "qanday ishlaydi" ·
 * 2 natija va ustuvorlik.
 */
/** Rangli gradientlar: qizil bir tusda emas, har blok o'z rangida */
const SECTION_GRADS = [
  ["#3FD0FF", "#6B8CFF"], // qanday ishlaydi
  ["#35E0A1", "#9BE564"], // natija
  ["#FFB36B", "#FF6BB0"], // ustuvorlik
] as const;
const SECTION_ICONS = [Cpu, Zap, Siren] as const;
const ALERT_GRAD = ["#FF6B6B", "#FFB36B"] as const;
const grad = (g: readonly [string, string]) =>
  `linear-gradient(135deg, ${g[0]}, ${g[1]})`;

export default function ThreatCase({
  c,
  video,
  active,
  t,
  fresh,
  at,
}: SlideProps & {
  c: ThreatCaseCopy;
  video: { src: string; poster: string };
  tone?: string;
}) {
  const show = (cue: number) => !fresh || t >= (at[cue] ?? 0);

  return (
    <Stage>
      <SlideTitle kicker={c.kicker} title={c.title} run={fresh} />
      <p
        className="mt-1 bg-clip-text font-mono text-[10.5px] uppercase tracking-[0.16em] text-transparent"
        style={{
          backgroundImage:
            "linear-gradient(90deg,#FF6B6B,#FFB36B,#8F7CFF,#3FD0FF)",
        }}
      >
        {c.sub}
      </p>

      <div className="mt-[clamp(10px,2vh,24px)] grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        {/* ── chap: real kadr (video) ── */}
        <motion.div
          initial={fresh ? { opacity: 0, x: -20 } : false}
          animate={show(1) ? { opacity: 1, x: 0 } : { opacity: 0.14, x: 0 }}
          transition={{ duration: 0.65, ease: EASE }}
        >
          <Glass className="flex h-full flex-col overflow-hidden p-0 shadow-[0_20px_60px_-12px_rgba(63,208,255,0.28),0_8px_28px_rgba(0,0,0,0.5)]">
            <div className="relative aspect-[16/10] w-full overflow-hidden bg-black/40">
              <Clip
                src={video.src}
                poster={video.poster}
                play={active && show(1)}
              />
              <Corners />
              <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded bg-black/60 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-rose-300 backdrop-blur-sm">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" />
                {c.live}
              </span>
              <span className="absolute bottom-2.5 left-2.5 inline-flex flex-wrap items-center gap-x-3 gap-y-1 rounded bg-black/60 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-slate-200 backdrop-blur-sm">
                <span className="inline-flex items-center gap-1.5">
                  <Camera size={11} />
                  {c.cam}
                </span>
                <span className="inline-flex items-center gap-1.5 tabular-nums">
                  <Clock size={11} />
                  {c.when}
                </span>
              </span>
            </div>
            <div className="flex items-start gap-3 p-4">
              <span
                className="grid h-10 w-10 flex-none place-items-center rounded-xl text-white"
                style={{
                  background: grad(ALERT_GRAD),
                  boxShadow: `0 6px 20px ${ALERT_GRAD[0]}66`,
                }}
              >
                <ShieldAlert size={19} strokeWidth={2} />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-medium leading-tight text-white">
                  {c.alertTitle}
                </span>
                <span className="mt-1 block text-[11.5px] leading-snug text-slate-400">
                  {c.alertText}
                </span>
              </span>
            </div>
          </Glass>
        </motion.div>

        {/* ── o'ng: qanday ishlaydi / natija / ustuvorlik ── */}
        <div className="flex flex-col gap-3">
          {c.sections.map((s, i) => {
            const on = show(i === 0 ? 1 : 2);
            return (
              <motion.div
                key={s.title}
                initial={fresh ? { opacity: 0, x: 18 } : false}
                animate={on ? { opacity: 1, x: 0 } : { opacity: 0.14, x: 0 }}
                transition={{
                  duration: 0.55,
                  delay: fresh && on ? (i === 0 ? 0 : (i - 1) * 0.15) : 0,
                  ease: EASE,
                }}
                className={i === 0 ? "flex-[1.5]" : "flex-1"}
              >
                <div
                  className="h-full rounded-2xl"
                  style={{
                    boxShadow: `0 14px 40px -10px ${SECTION_GRADS[i % 3][0]}44, 0 6px 20px rgba(0,0,0,0.45)`,
                  }}
                >
                  <Glass
                    active={i === 1}
                    className="flex h-full flex-col justify-center p-4"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="grid h-9 w-9 flex-none place-items-center rounded-xl text-white"
                        style={{
                          background: grad(SECTION_GRADS[i % 3]),
                          boxShadow: `0 5px 18px ${SECTION_GRADS[i % 3][0]}66`,
                        }}
                      >
                        {(() => {
                          const Icon = SECTION_ICONS[i % 3];
                          return <Icon size={17} strokeWidth={2} />;
                        })()}
                      </span>
                      <p
                        className="bg-clip-text font-mono text-[10.5px] uppercase tracking-[0.2em] text-transparent"
                        style={{ backgroundImage: grad(SECTION_GRADS[i % 3]) }}
                      >
                        {s.title}
                      </p>
                    </div>
                    <p className="mt-2.5 text-[11.5px] leading-[1.55] text-slate-300">
                      {s.text}
                    </p>
                  </Glass>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <motion.p
        initial={fresh ? { opacity: 0 } : false}
        animate={show(2) ? { opacity: 1 } : {}}
        transition={{ duration: 0.8, delay: 0.3 }}
        className={`mt-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500 ${ORB_CLEAR}`}
      >
        {c.footer}
      </motion.p>
    </Stage>
  );
}

/** Hodisa videosi — ovozsiz, halqa bilan; slayd ketganda to'xtaydi. */
function Clip({
  src,
  poster,
  play,
}: {
  src: string;
  poster: string;
  play: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (play) void el.play().catch(() => {});
    else el.pause();
  }, [play]);
  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="metadata"
      className="h-full w-full object-cover"
    />
  );
}
