"use client";

import { motion } from "framer-motion";
import { CalendarCheck, Clock3, FileSpreadsheet, UserCheck, UserMinus, UserX } from "lucide-react";
import { useCopy } from "../copy";
import { Corners, Count, EASE, Glass, Hud, SlideTitle, Stage } from "@/components/deck/ui";
import type { SlideProps } from "@/components/deck/types";

/**
 * 6 — AVTOMATIK DAVOMAT.
 *
 * Chapda yuz tanish oynasi: kadr → skaner → "davomat yozildi". O'ngda
 * o'sha yozuvlardan quriladigan kunlik jadval. G'oya: xavfsizlik bilan
 * bir xil kamera va bir xil model kundalik ishni ham bajaradi.
 */

const TILES = [
  { icon: UserCheck, value: 412, tone: "ok" as const },
  { icon: Clock3, value: 37, tone: "warn" as const },
  { icon: UserX, value: 21, tone: "alert" as const },
  { icon: UserMinus, value: 9, tone: "ice" as const },
];

const WEEK = [94, 91, 96, 89, 93, 72];

const TONE = { ok: "text-emerald-300", warn: "text-amber-300", alert: "text-rose-300", ice: "text-ice" };

export default function S6Attendance({ t, fresh, at }: SlideProps) {
  const c = useCopy().attendance;
  const show = (time: number) => !fresh || t >= time;
  const recognised = show(at[1] + 2.2);

  return (
    <Stage>
      <SlideTitle kicker={c.kicker} title={c.title} run={fresh} />

      <div className="mt-[clamp(22px,4vh,48px)] grid gap-[clamp(22px,3vw,52px)] lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
        {/* ── yuz tanish oynasi ── */}
        <div>
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.12] bg-black shadow-[0_36px_80px_-40px_rgba(0,0,0,0.9)]">
            <div className="relative aspect-[4/3]">
              <img src="/imges/ai-face.webp" alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,7,16,0.35),transparent_35%,rgba(3,7,16,0.7))]" />

              {!recognised && (
                <motion.div
                  initial={{ y: "-100%" }}
                  animate={{ y: "100%" }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-x-0 h-1/3 bg-gradient-to-b from-transparent via-ice/30 to-transparent"
                />
              )}

              <motion.div
                initial={fresh ? { opacity: 0, scale: 1.15 } : false}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, ease: EASE }}
                className={`absolute rounded-sm border-2 transition-colors duration-500 ${
                  recognised ? "border-emerald-300 shadow-[0_0_30px_-6px_rgba(124,231,176,0.9)]" : "border-ice/80"
                }`}
                style={{ left: "34%", top: "15%", width: "33%", height: "46%" }}
              >
                <span
                  className={`absolute -top-[25px] left-[-2px] whitespace-nowrap rounded-t px-2 py-[3px] font-mono text-[11px] font-semibold text-[#06101f] transition-colors duration-500 ${
                    recognised ? "bg-emerald-300" : "bg-ice"
                  }`}
                >
                  {recognised ? c.person : c.searching}
                </span>
              </motion.div>

              <div className="absolute left-4 top-4">
                <Hud tone={recognised ? "ok" : "ice"}>
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                  {c.cam}
                </Hud>
              </div>
              <Corners className="m-3" />
            </div>
          </div>

          <motion.div
            initial={fresh ? { opacity: 0, y: 14 } : false}
            animate={show(at[1] + 3.0) ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, ease: EASE }}
            className="mt-3 flex items-center gap-3 rounded-xl border border-emerald-400/25 bg-emerald-500/[0.08] px-5 py-4"
          >
            <CalendarCheck size={20} className="flex-none text-emerald-300" />
            <p className="text-[13.5px] leading-snug text-slate-200">
              <span className="font-medium text-white">{c.recorded}</span>
              {c.recordedMeta}
              <span className="block text-[12.5px] text-slate-400">{c.recordedNote}</span>
            </p>
          </motion.div>
        </div>

        {/* ── kunlik jadval ── */}
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {c.tiles.map((label, i) => {
              const tile = TILES[i];
              const when = at[2] + i * 0.55;
              return (
                <motion.div
                  key={label}
                  initial={fresh ? { opacity: 0, y: 16 } : false}
                  animate={show(when) ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, ease: EASE }}
                >
                  <Glass className="p-5">
                    <tile.icon size={17} className={TONE[tile.tone]} strokeWidth={1.8} />
                    <p className="mt-3 text-[clamp(24px,2.3vw,38px)] font-light leading-none tracking-[-0.04em] text-white tabular-nums">
                      <Count to={tile.value} run={fresh && show(when)} dur={1.1} />
                    </p>
                    <p className="mt-1.5 text-[12.5px] text-slate-400">{label}</p>
                  </Glass>
                </motion.div>
              );
            })}
          </div>

          <motion.div
            initial={fresh ? { opacity: 0, y: 16 } : false}
            animate={show(at[2] + 2.4) ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <Glass className="p-6">
              <div className="flex items-baseline justify-between">
                <p className="text-[14px] font-medium text-white">{c.weekTitle}</p>
                <span className="font-mono text-[11px] tracking-[0.16em] text-slate-500">%</span>
              </div>
              {/* ⚠️ Ustun balandligi PIKSELDA: foiz ota elementning balandligiga
                  nisbatan hisoblanadi, ustun esa auto-balandlikdagi flex
                  kataqda turibdi — foiz 0 ga aylanib, diagramma yo'q bo'lardi. */}
              <div className="mt-5 flex h-[124px] items-end gap-3">
                {c.weekDays.map((d, i) => {
                  /* Qiymatlar 72…96 oralig'ida — to'liq shkalada ustunlar bir
                     xil ko'rinardi. Shuning uchun shkala 60 dan boshlanadi,
                     ADASHTIRMASLIK uchun esa har ustun ustida foiz yoziladi. */
                  const px = Math.round(16 + ((WEEK[i] - 60) / 40) * 70);
                  return (
                    <div key={d} className="flex flex-1 flex-col items-center gap-1.5">
                      <span className="font-mono text-[10.5px] text-ice/70">{WEEK[i]}</span>
                      <motion.div
                        initial={fresh ? { height: 0 } : false}
                        animate={show(at[2] + 2.6 + i * 0.09) ? { height: px } : {}}
                        transition={{ duration: 0.8, ease: EASE }}
                        className="w-full rounded-t-md bg-gradient-to-t from-ice/25 to-ice/80"
                        style={fresh ? undefined : { height: px }}
                      />
                      <span className="font-mono text-[10.5px] text-slate-500">{d}</span>
                    </div>
                  );
                })}
              </div>
            </Glass>
          </motion.div>

          <motion.div
            initial={fresh ? { opacity: 0 } : false}
            animate={show(at[3]) ? { opacity: 1 } : {}}
            transition={{ duration: 0.7 }}
            className="flex flex-wrap gap-2"
          >
            {c.chips.map((chip, i) => (
              <Hud key={chip}>
                {i === c.chips.length - 1 && <FileSpreadsheet size={12} />}
                {chip}
              </Hud>
            ))}
          </motion.div>
        </div>
      </div>
    </Stage>
  );
}
