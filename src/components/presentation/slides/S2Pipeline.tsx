"use client";

import { motion } from "framer-motion";
import { BellRing, Filter, Radio, ScanSearch, Scissors, Waypoints } from "lucide-react";
import { useCopy } from "../copy";
import { Corners, EASE, Glass, Hud, SlideTitle, Stage } from "@/components/deck/ui";
import type { SlideProps } from "@/components/deck/types";

/**
 * 2 — ICHKARIDA NIMA BO'LADI.
 *
 * Shouning eng texnik slaydi: "sun'iy intellekt" degan so'z shu yerda
 * ANIQ MEXANIZMGA aylanadi — oqim, kadr, model, kuzatuv, filtr, hodisa.
 *
 * Chapda haqiqiy kirish kamerasining yozuvi: ustiga bosqichma-bosqich
 * qatlamlar tushadi (setka → ramka → ID → hodisa yorlig'i), ya'ni zal
 * bosqichlarni o'qimaydi, KO'RADI. O'ngda o'sha bosqichlarning izohi.
 *
 * Kadr — maktabning O'Z kamerasidan (`public/video/taqdimot/kirish.mp4`).
 */

const ICONS = [Radio, Scissors, ScanSearch, Waypoints, Filter, BellRing];

export default function S2Pipeline({ t, fresh, at }: SlideProps) {
  const c = useCopy().pipeline;
  const show = (time: number) => !fresh || t >= time;

  /* Kadr ustidagi qatlamlar — har biri o'z bosqichida yonadi */
  const grid = show(at[2]);       // kadrga bo'linish
  const box = show(at[3]);        // model ramkasi
  const track = show(at[4]);      // ID va kuzatuv
  const event = show(at[6]);      // hodisa

  return (
    <Stage>
      <SlideTitle kicker={c.kicker} title={c.title} run={fresh} />

      <div className="mt-[clamp(16px,3vh,34px)] grid gap-[clamp(20px,2.6vw,46px)] lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        {/* ── chap: haqiqiy kadr va uning ustidagi qatlamlar ── */}
        <div>
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.12] bg-black shadow-[0_36px_80px_-40px_rgba(0,0,0,0.9)]">
            <div className="relative aspect-video">
              {/* ⚠️ VIDEO emas, STOP-KADR. Videoda odam harakatlanadi va
                  qo'lda qo'yilgan ramka undan orqada qolib, yolg'on
                  ko'rinardi — shuning uchun bir kadr muzlatilgan. Kadr
                  maktabning O'Z kamerasidan; ramka esa taqdimot uchun
                  chizilgan HUD (modelning o'z chiqishi 4-slaydda). */}
              <img src="/imges/taqdimot/kirish-kadr.webp" alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,7,16,0.45),transparent_30%,transparent_62%,rgba(3,7,16,0.7))]" />

              {/* 2-bosqich: kadrga bo'linish — tahlil setkasi */}
              <motion.div
                initial={fresh ? { opacity: 0 } : false}
                animate={grid ? { opacity: 1 } : {}}
                transition={{ duration: 0.6 }}
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(143,184,255,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(143,184,255,0.16) 1px, transparent 1px)",
                  backgroundSize: "44px 44px",
                }}
              />

              {/* 3–4-bosqich: HUD kadrdagi HAQIQIY ramkaga ilinadi
                  (koordinatalar o'sha ramkadan o'lchangan) */}
              <motion.div
                initial={fresh ? { opacity: 0, scale: 1.14 } : false}
                animate={box ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.5, ease: EASE }}
                className="absolute rounded-sm"
                style={{
                  left: "25%",
                  top: "37.5%",
                  width: "13%",
                  height: "50%",
                  outline: "1px dashed rgba(133,224,255,0.85)",
                  outlineOffset: "6px",
                  boxShadow: "0 0 34px -8px rgba(133,224,255,0.9)",
                }}
              >
                <span className="absolute -top-[26px] left-[-6px] whitespace-nowrap rounded bg-[#85E0FF] px-2 py-[3px] font-mono text-[11px] font-semibold text-[#06101f]">
                  Odam 0.94
                </span>
                {/* 4-bosqich: kuzatuv identifikatori */}
                <motion.span
                  initial={fresh ? { opacity: 0 } : false}
                  animate={track ? { opacity: 1 } : {}}
                  transition={{ duration: 0.4 }}
                  className="absolute -bottom-[24px] left-[-6px] whitespace-nowrap rounded bg-black/75 px-2 py-[3px] font-mono text-[10.5px] text-ice"
                >
                  ID 4172 · yuz mos keldi
                </motion.span>
              </motion.div>

              {/* 6-bosqich: hodisa yaratildi */}
              <motion.div
                initial={fresh ? { opacity: 0, y: 8 } : false}
                animate={event ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, ease: EASE }}
                /* o'ngda: chapda kuzatuv identifikatori turadi */
                className="absolute bottom-4 right-4"
              >
                <Hud tone="ok">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                  Hodisa yaratildi
                </Hud>
              </motion.div>

              <div className="absolute left-4 top-4">
                <Hud>KAM-01 · Asosiy kirish</Hud>
              </div>
              <span className="absolute right-4 top-4 rounded bg-black/55 px-2 py-1 font-mono text-[10.5px] tracking-wide text-white/70">
                HAQIQIY YOZUV
              </span>
              <Corners className="m-3" />
            </div>
          </div>

          <motion.p
            initial={fresh ? { opacity: 0 } : false}
            animate={show(at[7] ?? at[6]) ? { opacity: 1 } : {}}
            transition={{ duration: 0.8 }}
            className="mt-3 flex items-center gap-2.5 rounded-xl border border-emerald-400/25 bg-emerald-500/[0.07] px-5 py-3 text-[12.5px] leading-snug text-slate-300"
          >
            {c.note}
          </motion.p>
        </div>

        {/* ── o'ng: bosqichlar ── */}
        <ol className="flex flex-col gap-2">
          {c.steps.map((s, i) => {
            const Icon = ICONS[i];
            const on = show(at[i + 1]);
            return (
              <motion.li
                key={s.title}
                initial={fresh ? { opacity: 0, x: 18 } : false}
                animate={on ? { opacity: 1, x: 0 } : { opacity: 0.2, x: 0 }}
                transition={{ duration: 0.5, ease: EASE }}
              >
                <Glass active={on} className="flex items-start gap-3.5 px-4 py-2.5">
                  <span
                    className={`grid h-10 w-10 flex-none place-items-center rounded-xl border transition-colors duration-500 ${
                      on ? "border-ice/40 bg-ice/[0.14] text-ice" : "border-white/10 bg-white/5 text-slate-500"
                    }`}
                  >
                    <Icon size={18} strokeWidth={1.7} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="font-mono text-[11px] text-ice/70">{String(i + 1).padStart(2, "0")}</span>
                      <span className="text-[14.5px] font-medium text-white">{s.title}</span>
                    </span>
                    <span className="mt-0.5 block text-[12px] leading-[1.45] text-slate-400">{s.text}</span>
                  </span>
                  <span className="hidden flex-none self-center whitespace-nowrap rounded-md border border-white/[0.08] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-slate-500 xl:block">
                    {s.meta}
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
