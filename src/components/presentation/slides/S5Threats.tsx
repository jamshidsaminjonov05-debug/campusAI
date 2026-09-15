"use client";

import { motion } from "framer-motion";
import { Crosshair, Swords } from "lucide-react";
import { useCopy } from "../copy";
import { EASE, Glass, Hud, SlideTitle, Stage } from "@/components/deck/ui";
import type { Step } from "../copy/types";
import type { SlideProps } from "@/components/deck/types";

/**
 * 5 — TAHDID ZANJIRI.
 *
 * 4-slayd "qancha tez" degan savolga javob beradi, bu slayd esa "keyin
 * NIMA bo'ladi" degan savolga. Ikki ustun ataylab yonma-yon: janjal va
 * qurol bir xil emas — biri tasdiq kutadi, ikkinchisi kutmaydi. Shu farq
 * zalda bitta qarashda ko'rinishi kerak.
 *
 * `cue` — qaysi ovoz bo'lagida yonishi (`copy.narration` dagi indeks):
 * janjal 1–4, qurol 6–8.
 */

const FIGHT_CUE = [1, 2, 2, 3, 4, 4];
const WEAPON_CUE = [6, 6, 6, 7, 7, 8];

function Column({
  icon: Icon,
  name,
  level,
  conf,
  steps,
  cues,
  tone,
  show,
  fresh,
  dir,
}: {
  icon: typeof Swords;
  name: string;
  level: string;
  conf: string;
  steps: Step[];
  cues: number[];
  tone: "warn" | "crit";
  show: (cue: number) => boolean;
  fresh: boolean;
  dir: 1 | -1;
}) {
  const head = tone === "crit"
    ? "border-rose-400/45 bg-rose-500/[0.1] text-rose-200"
    : "border-amber-400/40 bg-amber-500/[0.09] text-amber-200";
  const dot = tone === "crit" ? "bg-rose-400" : "bg-amber-400";
  const rail = tone === "crit" ? "from-rose-400/70" : "from-amber-400/70";

  return (
    <div>
      {/* ── ustun sarlavhasi ── */}
      <motion.div
        initial={fresh ? { opacity: 0, x: 20 * dir } : false}
        animate={show(cues[0]) ? { opacity: 1, x: 0 } : { opacity: 0.25, x: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className={`flex items-center gap-3 rounded-2xl border px-5 py-3.5 ${head}`}
      >
        <Icon size={20} strokeWidth={1.8} className="flex-none" />
        <span className="min-w-0 flex-1">
          <span className="block text-[15.5px] font-semibold text-white">{name}</span>
          <span className="block font-mono text-[11px] uppercase tracking-[0.14em]">{level} · {conf}</span>
        </span>
      </motion.div>

      {/* ── bosqichlar ── */}
      <ol className="relative mt-3 flex flex-col gap-2 pl-7">
        <span className={`absolute left-[9px] top-3 h-[calc(100%-24px)] w-px bg-gradient-to-b ${rail} to-transparent`} />
        {steps.map((s, i) => {
          const on = show(cues[i]);
          return (
            <motion.li
              key={s.title}
              initial={fresh ? { opacity: 0, y: 10 } : false}
              animate={on ? { opacity: 1, y: 0 } : { opacity: 0.2, y: 0 }}
              transition={{ duration: 0.45, delay: fresh && on ? i * 0.05 : 0, ease: EASE }}
              className="relative"
            >
              <span
                className={`absolute -left-7 top-[15px] h-[9px] w-[9px] rounded-full transition-colors duration-500 ${
                  on ? dot : "bg-white/15"
                }`}
              />
              <Glass active={on} className="px-4 py-2.5">
                <span className="flex items-baseline gap-2">
                  <span className="font-mono text-[10.5px] text-slate-500">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-[14px] font-medium text-white">{s.title}</span>
                </span>
                <span className="mt-0.5 block text-[12px] leading-[1.45] text-slate-400">{s.text}</span>
              </Glass>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}

export default function S5Threats({ t, fresh, at }: SlideProps) {
  const c = useCopy().threats;
  const show = (cue: number) => !fresh || t >= (at[cue] ?? 0);

  return (
    <Stage>
      <SlideTitle kicker={c.kicker} title={c.title} run={fresh} />

      <div className="mt-[clamp(16px,3vh,36px)] grid gap-[clamp(20px,2.6vw,48px)] lg:grid-cols-2">
        <Column
          icon={Swords}
          name={c.fight.name}
          level={c.fight.level}
          conf={c.fight.conf}
          steps={c.fight.steps}
          cues={FIGHT_CUE}
          tone="warn"
          show={show}
          fresh={fresh}
          dir={-1}
        />
        <Column
          icon={Crosshair}
          name={c.weapon.name}
          level={c.weapon.level}
          conf={c.weapon.conf}
          steps={c.weapon.steps}
          cues={WEAPON_CUE}
          tone="crit"
          show={show}
          fresh={fresh}
          dir={1}
        />
      </div>

      <motion.div
        initial={fresh ? { opacity: 0 } : false}
        animate={show(8) ? { opacity: 1 } : {}}
        transition={{ duration: 0.8 }}
        className="mt-[clamp(16px,3vh,34px)] flex justify-center"
      >
        <Hud>{c.note}</Hud>
      </motion.div>
    </Stage>
  );
}
