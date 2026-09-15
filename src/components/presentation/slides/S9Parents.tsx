"use client";

import { motion } from "framer-motion";
import { BellRing, CalendarClock, DoorOpen, PieChart, Smile, Users, type LucideIcon } from "lucide-react";
import { useCopy } from "../copy";
import { EASE, Glass, Hud, SlideTitle, Stage } from "@/components/deck/ui";
import type { SlideProps } from "@/components/deck/types";

/**
 * 9 — OTA-ONALAR ILOVASI.
 *
 * Panel — maktab uchun. Bu slayd esa ikkinchi tomonni ko'rsatadi: bir xil
 * hodisa va bir xil davomat ota-onaning telefoniga ham boradi.
 *
 * Ekran rasmlari — ilovaning O'ZIDAN olingan (`public/imges/taqdimot/`),
 * maket emas: zaldagi odam aynan shu ekranni ko'radi.
 *
 * `cue` — qaysi ovoz bo'lagida yonishi (`copy.narration` dagi indeks).
 */

const SHOTS = [
  { img: "/imges/taqdimot/ota-ona-bosh.webp", cue: 1, tilt: -6 },
  { img: "/imges/taqdimot/ota-ona-signal.webp", cue: 4, tilt: 0 },
  { img: "/imges/taqdimot/ota-ona-hodisa.webp", cue: 4, tilt: 6 },
];

const ITEM_VIEW: { cue: number; icon: LucideIcon }[] = [
  { cue: 1, icon: DoorOpen },
  { cue: 2, icon: PieChart },
  { cue: 3, icon: Smile },
  { cue: 2, icon: CalendarClock },
  { cue: 4, icon: BellRing },
  { cue: 5, icon: Users },
];

/** Telefon korpusi — ekran rasmini "qurilma"ga soladi */
function Phone({ src, on, fresh, tilt, delay }: { src: string; on: boolean; fresh: boolean; tilt: number; delay: number }) {
  return (
    <motion.div
      initial={fresh ? { opacity: 0, y: 28, rotate: tilt * 1.6 } : false}
      animate={on ? { opacity: 1, y: 0, rotate: tilt } : { opacity: 0.12, y: 0, rotate: tilt }}
      transition={{ duration: 0.75, delay: fresh && on ? delay : 0, ease: EASE }}
      whileHover={{ y: -10, rotate: 0 }}
      className="relative w-[clamp(150px,15vw,215px)] flex-none"
    >
      <div className="relative overflow-hidden rounded-[26px] border border-white/15 bg-[#0b1020] p-[5px] shadow-[0_34px_70px_-30px_rgba(0,0,0,0.95)]">
        {/* dinamik orolcha */}
        <span className="absolute left-1/2 top-[10px] z-10 h-[5px] w-[34px] -translate-x-1/2 rounded-full bg-black/70" />
        <img src={src} alt="" className="w-full rounded-[22px]" />
      </div>
      {/* yumshoq yorug'lik */}
      <div className="absolute inset-x-4 -bottom-3 h-8 rounded-full bg-ice/25 blur-2xl" />
    </motion.div>
  );
}

export default function S9Parents({ t, fresh, at }: SlideProps) {
  const c = useCopy().parents;
  const show = (time: number) => !fresh || t >= time;

  return (
    <Stage>
      <SlideTitle kicker={c.kicker} title={c.title} run={fresh} />

      <div className="mt-[clamp(18px,3vh,40px)] grid items-center gap-[clamp(22px,3vw,56px)] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        {/* ── chap: telefonlar ── */}
        <div>
          <div className="flex items-end justify-center gap-[clamp(8px,1.2vw,20px)]">
            {SHOTS.map((s, i) => (
              <Phone key={s.img} src={s.img} on={show(at[s.cue])} fresh={fresh} tilt={s.tilt} delay={i * 0.14} />
            ))}
          </div>

          <div className="mt-6 flex justify-center gap-[clamp(8px,1.2vw,20px)]">
            {c.shots.map((label, i) => (
              <motion.span
                key={label}
                initial={fresh ? { opacity: 0 } : false}
                animate={show(at[SHOTS[i].cue]) ? { opacity: 1 } : {}}
                transition={{ duration: 0.6 }}
                className="w-[clamp(150px,15vw,215px)] text-center font-mono text-[10.5px] uppercase tracking-[0.2em] text-slate-500"
              >
                {label}
              </motion.span>
            ))}
          </div>
        </div>

        {/* ── o'ng: imkoniyatlar ── */}
        <div>
          <ul className="flex flex-col gap-2.5">
            {c.items.map((it, i) => {
              const Icon = ITEM_VIEW[i].icon;
              const on = show(at[ITEM_VIEW[i].cue]);
              return (
                <motion.li
                  key={it.title}
                  initial={fresh ? { opacity: 0, x: 18 } : false}
                  animate={on ? { opacity: 1, x: 0 } : { opacity: 0.18, x: 0 }}
                  transition={{ duration: 0.55, ease: EASE }}
                >
                  <Glass active={on} className="flex items-start gap-4 px-5 py-3.5">
                    <span
                      className={`grid h-10 w-10 flex-none place-items-center rounded-xl transition-colors duration-500 ${
                        on ? "bg-ice/[0.14] text-ice" : "bg-white/5 text-slate-500"
                      }`}
                    >
                      <Icon size={18} strokeWidth={1.7} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[14.5px] font-medium text-white">{it.title}</span>
                      <span className="mt-1 block text-[12.5px] leading-[1.5] text-slate-400">{it.text}</span>
                    </span>
                  </Glass>
                </motion.li>
              );
            })}
          </ul>

          <motion.div
            initial={fresh ? { opacity: 0, y: 14 } : false}
            animate={show(at[5]) ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, ease: EASE }}
            className="mt-5 flex flex-wrap gap-2"
          >
            {c.chips.map((chip) => (
              <Hud key={chip}>{chip}</Hud>
            ))}
          </motion.div>
        </div>
      </div>
    </Stage>
  );
}
