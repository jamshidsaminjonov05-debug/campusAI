"use client";

import { motion } from "framer-motion";
import { BarChart3, Bell, Brain, Building2, Mic, Moon, Sparkles, type LucideIcon } from "lucide-react";
import { useCopy } from "../copy";
import { EASE, Glass, Hud, SlideTitle, Stage } from "@/components/deck/ui";
import type { SlideProps } from "@/components/deck/types";

/**
 * 10 — NAZORAT: panelning barcha bo'limlari bitta kadrda.
 *
 * Ikonkalar ilovaning O'ZIDA ishlatiladigan animatsiyali GIF'lar
 * (`config/navIcons.ts`) — zaldagi odam keyin panelni ochganda aynan
 * shu ko'rinishni ko'radi. GIF yo'q bo'lgan bo'limlar lucide ikonkasi
 * bilan qoladi (ilovadagi zaxira bilan bir xil qoida).
 *
 * `cue` — qaysi ovoz bo'lagida yonishi (`copy.narration[7]` indeksi).
 */
const VIEW: { cue: number; gif?: string; icon?: LucideIcon }[] = [
  { cue: 1, gif: "/icons/gif/boshqaruv-paneli.gif" },
  { cue: 2, icon: Bell },
  { cue: 3, gif: "/icons/gif/aniqlanganlar.gif" },
  { cue: 3, gif: "/icons/gif/hodisalar.gif" },
  { cue: 4, gif: "/icons/gif/kameralar.gif" },
  { cue: 4, gif: "/icons/gif/talabalar.gif" },
  { cue: 4, icon: BarChart3 },
  { cue: 4, icon: Brain },
  { cue: 4, gif: "/icons/gif/geo-analitika.gif" },
  { cue: 4, icon: Building2 },
  { cue: 4, gif: "/icons/gif/hisobotlar.gif" },
  { cue: 4, gif: "/icons/gif/sozlamalar.gif" },
];

const CHIP_ICONS = [Sparkles, Moon, Mic];

export default function S10Control({ t, fresh, at }: SlideProps) {
  const c = useCopy().control;
  const show = (time: number) => !fresh || t >= time;

  return (
    <Stage>
      <SlideTitle kicker={c.kicker} title={c.title} run={fresh} />

      <div className="mt-[clamp(20px,3.5vh,44px)] grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {c.items.map((it, i) => {
          const v = VIEW[i];
          const Icon = v.icon;
          const on = show(at[v.cue]);
          return (
            <motion.div
              key={it.title}
              initial={fresh ? { opacity: 0, y: 18 } : false}
              animate={on ? { opacity: 1, y: 0 } : { opacity: 0.15, y: 0 }}
              transition={{ duration: 0.5, delay: fresh && on ? (i % 8) * 0.06 : 0, ease: EASE }}
            >
              <Glass active={on} className="flex h-full items-start gap-3.5 p-4">
                <span className="grid h-11 w-11 flex-none place-items-center overflow-hidden rounded-xl bg-white/[0.06]">
                  {v.gif ? (
                    <img src={v.gif} alt="" className="h-8 w-8 object-contain" />
                  ) : (
                    Icon && <Icon size={19} strokeWidth={1.7} className="text-ice" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-[14px] font-medium leading-tight text-white">{it.title}</span>
                  <span className="mt-1 block text-[12px] leading-snug text-slate-400">{it.text}</span>
                </span>
              </Glass>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        initial={fresh ? { opacity: 0, y: 16 } : false}
        animate={show(at[5]) ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, ease: EASE }}
        className="mt-[clamp(20px,3.5vh,42px)] flex flex-wrap items-center justify-center gap-3"
      >
        {c.chips.map((chip, i) => {
          const Icon = CHIP_ICONS[i];
          return (
            <Hud key={chip}>
              {Icon && <Icon size={12} />}
              {chip}
            </Hud>
          );
        })}
      </motion.div>
    </Stage>
  );
}
