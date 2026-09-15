"use client";

import { motion } from "framer-motion";
import { CloudOff, Fingerprint, KeyRound, Lock, Server, UserCog, type LucideIcon } from "lucide-react";
import { useCopy } from "../copy";
import { EASE, Glass, Hud, SlideTitle, Stage } from "@/components/deck/ui";
import type { SlideProps, } from "@/components/deck/types";
import type { TitleText } from "../copy/types";

/**
 * 12 — XAVFSIZLIK VA MAXFIYLIK.
 *
 * Markazda qalqon, atrofida oltita fakt. Bu slayd savdo emas — e'tiroz
 * javobi: "yuz bazasi qayerda saqlanadi?" degan savol taqdimotdan keyin
 * emas, taqdimot ICHIDA yopiladi.
 *
 * `cue` — qaysi ovoz bo'lagida yonishi (ovoz bo'laklari indeksi).
 */
const LEFT_VIEW: { cue: number; icon: LucideIcon }[] = [
  { cue: 1, icon: Server },
  { cue: 2, icon: CloudOff },
  { cue: 2, icon: Fingerprint },
];

const RIGHT_VIEW: { cue: number; icon: LucideIcon }[] = [
  { cue: 3, icon: Lock },
  { cue: 3, icon: KeyRound },
  { cue: 4, icon: UserCog },
];

function Shield({ on }: { on: boolean }) {
  return (
    <div className="relative grid aspect-square w-full max-w-[300px] place-items-center">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="absolute rounded-full border border-ice/25"
          style={{ inset: `${i * 13}%` }}
          animate={on ? { scale: [1, 1.05, 1], opacity: [0.35, 0.75, 0.35] } : {}}
          transition={{ duration: 3.2, repeat: Infinity, delay: i * 0.5, ease: "easeInOut" }}
        />
      ))}
      <motion.svg
        viewBox="0 0 100 118"
        className="relative w-[46%]"
        initial={{ opacity: 0, scale: 0.7 }}
        animate={on ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.9, ease: EASE }}
      >
        <defs>
          <linearGradient id="sh" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C9DAFF" />
            <stop offset="100%" stopColor="#5C8BD6" />
          </linearGradient>
        </defs>
        <path d="M50 2 L96 20 V62 C96 90 74 108 50 116 C26 108 4 90 4 62 V20 Z" fill="rgba(143,184,255,0.1)" stroke="url(#sh)" strokeWidth="2.4" />
        <motion.path
          d="M30 60 L44 75 L72 42"
          fill="none"
          stroke="#85E0FF"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={on ? { pathLength: 1 } : {}}
          transition={{ duration: 0.9, delay: 0.5, ease: EASE }}
        />
      </motion.svg>
    </div>
  );
}

function Card({ item, icon: Icon, on, fresh, dir }: { item: TitleText; icon: LucideIcon; on: boolean; fresh: boolean; dir: 1 | -1 }) {
  return (
    <motion.div
      initial={fresh ? { opacity: 0, x: 24 * dir } : false}
      animate={on ? { opacity: 1, x: 0 } : { opacity: 0.18, x: 0 }}
      transition={{ duration: 0.6, ease: EASE }}
    >
      <Glass active={on} className="flex items-start gap-4 p-5">
        <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-ice/[0.12] text-ice">
          <Icon size={18} strokeWidth={1.7} />
        </span>
        <span>
          <span className="block text-[14.5px] font-medium text-white">{item.title}</span>
          <span className="mt-1 block text-[12.5px] leading-[1.5] text-slate-400">{item.text}</span>
        </span>
      </Glass>
    </motion.div>
  );
}

export default function S12Security({ t, fresh, at }: SlideProps) {
  const c = useCopy().security;
  const show = (time: number) => !fresh || t >= time;

  return (
    <Stage>
      <SlideTitle kicker={c.kicker} title={c.title} run={fresh} align="center" />

      <div className="mt-[clamp(20px,4vh,52px)] grid items-center gap-[clamp(18px,2.4vw,40px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,0.72fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
          {c.left.map((it, i) => (
            <Card key={it.title} item={it} icon={LEFT_VIEW[i].icon} on={show(at[LEFT_VIEW[i].cue])} fresh={fresh} dir={-1} />
          ))}
        </div>

        <div className="order-first flex justify-center lg:order-none">
          <Shield on={show(at[0] + 0.6)} />
        </div>

        <div className="flex flex-col gap-3">
          {c.right.map((it, i) => (
            <Card key={it.title} item={it} icon={RIGHT_VIEW[i].icon} on={show(at[RIGHT_VIEW[i].cue])} fresh={fresh} dir={1} />
          ))}
        </div>
      </div>

      <motion.div
        initial={fresh ? { opacity: 0 } : false}
        animate={show(at[4]) ? { opacity: 1 } : {}}
        transition={{ duration: 0.8 }}
        className="mt-[clamp(20px,3.5vh,44px)] flex flex-wrap items-center justify-center gap-3"
      >
        {c.chips.map((chip) => (
          <Hud key={chip} tone="ok">
            {chip}
          </Hud>
        ))}
      </motion.div>
    </Stage>
  );
}
