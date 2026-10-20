"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Check, Crown, ScanFace, ShieldCheck, Trophy } from "lucide-react";
import { useCopy } from "../copy";
import { Count, EASE, Glass, ORB_CLEAR, SlideTitle, Stage } from "@/components/deck/ui";
import type { SlideProps } from "@/components/deck/types";

/**
 * 15 — BIZ NIMA BERAMIZ. Uchta qiymat, tartib bilan:
 * 1 davomat (kirishda VA xonada) · 2 reyting · 3 xavfsizlik.
 *
 * Dizayn boshqa slaydlar bilan bir xil: `Glass` kartalar, `ice` ikonka
 * plitkasi, mono yorliqlar. Hamma karta boshidan ko'rinadi (bo'sh quti
 * yo'q), o'z bo'lagi aytilganda esa yorqinlashadi va mazmuni ochiladi.
 *
 * Reyting qatorlari pastdan yuqoriga chiqadi (4 → 1), 1-o'rin toj bilan.
 * Rasm — `public/imges/investor/oqituvchi-N.webp` (N = o'rin); bo'lmasa
 * bosh harflar. ⚠️ Ismlar va ballar — NAMUNA (`copy.offer.note`).
 *
 * `cue`: 0 sarlavha · 1 davomat · 2 reyting · 3 xavfsizlik.
 */
const ICONS = [ScanFace, Trophy, ShieldCheck] as const;
const RANK_STEP = 1.2;
const RANK_TONES = ["#FFD166", "#C9D3E6", "#E0A070", "#8FB8FF"];

/* Davomat misoli — 10-slayddagi real kadrlar belgilari bilan bir xil (25/28 → 17/28) */
const TOTAL = 28;
const START = 25; // dars boshida xonada (face ID yo'qlamasi)
const END = 17; // dars oxirida xonada
const GONE = START - END; // maktabga kelgan, lekin darsda yo'q

function Avatar({ n, name, tone }: { n: number; name: string; tone: string }) {
  const [broken, setBroken] = useState(false);
  const initials = name
    .replace(/\./g, "")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);
  return (
    <span
      className="relative grid h-9 w-9 flex-none place-items-center overflow-hidden rounded-full border text-[11px] font-medium text-white"
      style={{ borderColor: tone, background: `linear-gradient(135deg, ${tone}66, #1b2540)` }}
    >
      {!broken && (
        <img
          src={`/imges/investor/oqituvchi-${n}.webp`}
          alt=""
          onError={() => setBroken(true)}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {broken && initials}
    </span>
  );
}

export default function IOffer({ t, fresh, at }: SlideProps) {
  const c = useCopy().offer;
  const show = (cue: number) => !fresh || t >= (at[cue] ?? 0);
  /* Faol karta — oxirgi aytilgani; oxirida hammasi teng yorqin */
  const lastCue = !fresh ? 3 : [1, 2, 3].filter((k) => t >= (at[k] ?? Infinity)).pop() ?? 0;
  const done = !fresh || t >= (at[3] ?? Infinity) + 4;

  const rows = c.rank.rows;
  const sinceRank = t - (at[2] ?? 0);
  const rowOn = (i: number) => !fresh || (show(2) && sinceRank >= (rows.length - 1 - i) * RANK_STEP);

  const sinceAtt = t - (at[1] ?? 0);
  const stats = [
    { label: c.stats.start, n: START, tone: "#8FB8FF", on: show(1) && sinceAtt >= 0.4 },
    { label: c.stats.end, n: END, tone: "#5DD6A5", on: show(1) && sinceAtt >= 2.8 },
    { label: c.stats.gone, n: GONE, tone: "#FFC46B", on: show(1) && sinceAtt >= 5.2 },
  ];

  return (
    <Stage>
      <SlideTitle kicker={c.kicker} title={c.title} run={fresh} />

      <div className="mt-[clamp(14px,3vh,34px)] grid items-stretch gap-3 md:grid-cols-[1.35fr_1fr_1fr]">
        {c.items.map((it, i) => {
          const Icon = ICONS[i];
          const reached = show(i + 1);
          const active = lastCue === i + 1 && !done;
          return (
            <motion.div
              key={it.title}
              initial={fresh ? { opacity: 0, y: 18 } : false}
              animate={{ opacity: reached ? (active || done ? 1 : 0.6) : 0.35, y: 0 }}
              transition={{ duration: 0.6, delay: fresh ? i * 0.12 : 0, ease: EASE }}
            >
              <Glass active={active || (done && i === 0)} className="flex h-full flex-col p-5">
                <div className="flex items-center justify-between">
                  <span className="relative grid h-11 w-11 place-items-center rounded-xl bg-ice/12 text-ice">
                    {active && (
                      <motion.span
                        className="absolute inset-0 rounded-xl border border-ice/60"
                        animate={{ scale: [1, 1.5], opacity: [0.7, 0] }}
                        transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                      />
                    )}
                    <Icon size={20} strokeWidth={1.7} />
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ice/55">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>

                <p className="mt-3 text-[clamp(17px,1.5vw,22px)] font-medium leading-tight text-white">{it.title}</p>

                <div className="mt-3 flex flex-1 flex-col justify-between gap-3">
                  {i === 1 ? (
                    <ul className="flex flex-col gap-2">
                      {rows.map((r, k) => {
                        const shown = rowOn(k);
                        const tone = RANK_TONES[k % RANK_TONES.length];
                        return (
                          <motion.li
                            key={r.name}
                            initial={fresh ? { opacity: 0, x: 20 } : false}
                            animate={shown ? { opacity: 1, x: 0 } : { opacity: 0, x: 20 }}
                            transition={{ duration: 0.5, ease: EASE }}
                            className="flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5"
                            style={k === 0 && shown ? { borderColor: `${tone}77`, boxShadow: `0 0 22px -8px ${tone}` } : undefined}
                          >
                            <span className="grid w-4 place-items-center font-mono text-[11px] tabular-nums" style={{ color: tone }}>
                              {k === 0 ? <Crown size={13} /> : k + 1}
                            </span>
                            <Avatar n={k + 1} name={r.name} tone={tone} />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[11.5px] font-medium text-white">{r.name}</span>
                              <span className="block truncate text-[9.5px] text-slate-400">{r.subject}</span>
                            </span>
                            <span className="text-[17px] font-light tabular-nums" style={{ color: tone }}>
                              <Count to={r.value} run={fresh && shown} dur={1} />
                            </span>
                          </motion.li>
                        );
                      })}
                    </ul>
                  ) : (
                    <>
                      {i === 0 && (
                        <div className="grid grid-cols-3 gap-2">
                          {stats.map((x) => (
                            <motion.div
                              key={x.label}
                              animate={{ opacity: x.on ? 1 : 0.3 }}
                              transition={{ duration: 0.5 }}
                              className="rounded-xl border bg-white/[0.03] px-2 py-2 text-center"
                              style={{ borderColor: x.on ? `${x.tone}66` : "rgba(255,255,255,0.08)" }}
                            >
                              <p className="text-[clamp(20px,2vw,30px)] font-light leading-none tabular-nums" style={{ color: x.tone }}>
                                <Count to={x.n} run={fresh && x.on} dur={1} />
                                <span className="text-[0.4em] text-slate-500">{x.n === GONE ? "" : ` / ${TOTAL}`}</span>
                              </p>
                              <p className="mt-1.5 font-mono text-[8.5px] uppercase leading-tight tracking-[0.08em] text-slate-400">
                                {x.label}
                              </p>
                            </motion.div>
                          ))}
                        </div>
                      )}
                      <ul className="flex flex-col gap-2">
                        {it.points.map((p, k) => (
                          <motion.li
                            key={p}
                            initial={fresh ? { opacity: 0, x: 8 } : false}
                            animate={reached ? { opacity: 1, x: 0 } : { opacity: 0.4, x: 0 }}
                            transition={{ duration: 0.4, delay: fresh && reached ? 0.2 + k * 0.15 : 0, ease: EASE }}
                            className="flex items-start gap-2 text-[11.5px] leading-snug text-slate-300"
                          >
                            <Check size={13} className="mt-[1px] flex-none text-ice" />
                            {p}
                          </motion.li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </Glass>
            </motion.div>
          );
        })}
      </div>

      <motion.p
        initial={fresh ? { opacity: 0 } : false}
        animate={show(3) ? { opacity: 1 } : {}}
        transition={{ duration: 0.8, delay: 0.6 }}
        className={`mt-3 text-[10.5px] leading-snug text-slate-500 ${ORB_CLEAR}`}
      >
        {c.note}
      </motion.p>
    </Stage>
  );
}
