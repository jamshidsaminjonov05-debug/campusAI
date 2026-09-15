"use client";

import { motion } from "framer-motion";
import { Clock, Eye, EyeOff } from "lucide-react";
import { useCopy } from "../copy";
import { Corners, EASE, Hud, SlideTitle, Stage, rise } from "@/components/deck/ui";
import type { SlideProps } from "@/components/deck/types";

/**
 * 1 — MUAMMO: "kamera bor, ko'z yo'q".
 *
 * O'ngda 12 ta kuzatuv oynachasi. Avval hammasi kulrang va faqat YOZADI
 * (`REC`), oxirgi bo'lakda esa har biriga AI ramkasi tushadi va devor
 * ko'k rangga kiradi — bitta kadrda "oldin/keyin" farqi ko'rinadi.
 */

const TILES = [
  /* Birinchi ikkitasi — maktabning O'Z kamerasidan olingan haqiqiy kadrlar */
  { img: "/imges/taqdimot/kirish-kadr.webp", pos: "50% 50%" },
  { img: "/video/taqdimot/hovli-1-poster.jpg", pos: "50% 50%" },
  { img: "/imges/incident-scene.webp", pos: "60% 40%" },
  { img: "/imges/ai-face.webp", pos: "50% 30%" },
  { img: "/imges/chekish.webp", pos: "50% 45%" },
  { img: "/imges/telefon.webp", pos: "45% 40%" },
  { img: "/imges/notanish.webp", pos: "55% 35%" },
  { img: "/imges/qurol.webp", pos: "50% 50%" },
  { img: "/imges/tutun.webp", pos: "50% 50%" },
  { img: "/video/taqdimot/hovli-2-poster.jpg", pos: "50% 50%" },
  { img: "/imges/control-room.webp", pos: "70% 45%" },
  { img: "/imges/incident-scene.webp", pos: "25% 55%" },
];

const ICONS = [Clock, EyeOff, Eye];

export default function S1Problem({ t, fresh, at }: SlideProps) {
  const c = useCopy().problem;
  const show = (time: number) => !fresh || t >= time;
  const awake = show(at[3]); // devor AI nazoratiga o'tgan lahza

  return (
    <Stage>
      <div className="grid items-center gap-[clamp(28px,4vw,72px)] lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        {/* ── chap: matn ── */}
        <div>
          <SlideTitle kicker={c.kicker} title={c.title} run={fresh} />

          <ul className="mt-9 flex flex-col gap-6">
            {c.points.map((p, i) => {
              const Icon = ICONS[i];
              return (
                <motion.li
                  key={p.lead}
                  initial={fresh ? { opacity: 0, x: -18 } : false}
                  animate={show(at[i + 1]) ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.65, ease: EASE }}
                  className="flex items-start gap-4"
                >
                  <span className="mt-0.5 grid h-9 w-9 flex-none place-items-center rounded-xl border border-ice/25 bg-ice/10 text-ice">
                    <Icon size={18} strokeWidth={1.7} />
                  </span>
                  <p className="text-[clamp(14.5px,1.15vw,18px)] leading-[1.55] text-slate-300">
                    <span className="font-medium text-white">{p.lead}</span> {p.text}
                  </p>
                </motion.li>
              );
            })}
          </ul>

          <motion.p
            variants={rise}
            custom={4}
            initial="hidden"
            animate="show"
            className="mt-9 border-l-2 border-ice/50 pl-5 text-[clamp(14px,1.1vw,17px)] italic leading-[1.6] text-slate-400"
          >
            {c.quote}
          </motion.p>
        </div>

        {/* ── o'ng: kuzatuv devori ── */}
        <div className="relative">
          <div className="mb-3 flex items-center justify-between">
            <Hud tone={awake ? "ice" : "alert"}>
              <span className={`h-1.5 w-1.5 rounded-full ${awake ? "bg-ice" : "animate-pulse bg-rose-400"}`} />
              {awake ? c.hudAi : c.hudRec}
            </Hud>
            <span className="font-mono text-[11px] tracking-[0.18em] text-slate-500">{c.channels}</span>
          </div>

          <div className="relative grid grid-cols-4 gap-2 rounded-2xl border border-white/10 bg-black/40 p-2 backdrop-blur-sm">
            {TILES.map((tile, i) => (
              <motion.div
                key={i}
                initial={fresh ? { opacity: 0, scale: 0.9 } : false}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: fresh ? 0.04 * i : 0, ease: EASE }}
                className="relative aspect-[4/3] overflow-hidden rounded-lg"
              >
                <img
                  src={tile.img}
                  alt=""
                  style={{ objectPosition: tile.pos }}
                  className={`h-full w-full object-cover transition-all duration-[1200ms] ${
                    awake ? "opacity-90 saturate-100" : "opacity-45 grayscale"
                  }`}
                />
                {/* skanerlash chizig'i — faqat AI yonganda */}
                {awake && (
                  <motion.div
                    initial={{ y: "-120%" }}
                    animate={{ y: "120%" }}
                    transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.12, ease: "linear" }}
                    className="absolute inset-x-0 h-1/3 bg-gradient-to-b from-transparent via-ice/25 to-transparent"
                  />
                )}
                {awake ? (
                  <>
                    <Corners className="p-1" />
                    <span className="absolute bottom-1 left-1 rounded bg-ice/85 px-1 py-px font-mono text-[8px] font-semibold tracking-wider text-[#07101f]">
                      AI
                    </span>
                  </>
                ) : (
                  <span className="absolute left-1.5 top-1.5 flex items-center gap-1 font-mono text-[8px] tracking-wider text-rose-300/80">
                    <span className="h-1 w-1 animate-pulse rounded-full bg-rose-400" /> REC
                  </span>
                )}
                <span className="absolute bottom-1 right-1 font-mono text-[8px] text-white/45">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </motion.div>
            ))}
          </div>

          <motion.p
            initial={fresh ? { opacity: 0 } : false}
            animate={show(at[3] + 0.8) ? { opacity: 1 } : {}}
            transition={{ duration: 0.8 }}
            className="mt-3 text-center font-mono text-[11px] uppercase tracking-[0.26em] text-ice/75"
          >
            {c.footer}
          </motion.p>
        </div>
      </div>
    </Stage>
  );
}
