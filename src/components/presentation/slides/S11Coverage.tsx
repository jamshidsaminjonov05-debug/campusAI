"use client";

import { motion } from "framer-motion";
import { Baby, Building2, GraduationCap, Layers, MapPin, School } from "lucide-react";
import { useCopy } from "../copy";
import { EASE, Glass, Hud, SlideTitle, Stage } from "@/components/deck/ui";
import { MAP_H, MAP_W, REGIONS } from "../uzMap";
import type { SlideProps } from "@/components/deck/types";

/**
 * 11 — RESPUBLIKA XARITASI VA 3D KAMPUS.
 *
 * Xarita HAQIQIY: chegaralar `public/geojson/viloyat_simplified.geojson`
 * dan olingan va `tools/build-uz-map.py` orqali SVG yo'llariga aylantirilgan
 * (rasm emas). Chiziqlar nutq bilan birga chiziladi, so'ng har hududda
 * nuqta yonadi.
 */

/** Ta'lim bosqichlari — platforma qamrab oladigan segmentlar */
const SEGMENT_ICONS = [Baby, School, Building2, GraduationCap];

/** Isometrik kampus — 3 qavat, tomida va burchaklarida kameralar */
function Campus3D({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 300 210" className="h-full w-full">
      <defs>
        <linearGradient id="wallA" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2b3f6e" />
          <stop offset="100%" stopColor="#1a2749" />
        </linearGradient>
        <linearGradient id="wallB" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22345e" />
          <stop offset="100%" stopColor="#141f3c" />
        </linearGradient>
      </defs>

      {/* yer maydoni */}
      <motion.path
        d="M150 178 L282 122 L150 66 L18 122 Z"
        fill="rgba(143,184,255,0.05)"
        stroke="rgba(143,184,255,0.3)"
        strokeWidth="1"
        initial={{ opacity: 0 }}
        animate={{ opacity: on ? 1 : 0 }}
        transition={{ duration: 0.6 }}
      />

      {[0, 1, 2].map((f) => {
        const lift = 26 * (f + 1);
        return (
          <motion.g
            key={f}
            initial={{ opacity: 0, y: 18 }}
            animate={on ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.25 + f * 0.18, ease: EASE }}
          >
            <path d={`M80 ${174 - lift} L150 ${208 - lift} L150 ${182 - lift} L80 ${148 - lift} Z`} fill="url(#wallB)" stroke="rgba(160,200,255,0.35)" strokeWidth="0.8" />
            <path d={`M150 ${208 - lift} L220 ${174 - lift} L220 ${148 - lift} L150 ${182 - lift} Z`} fill="url(#wallA)" stroke="rgba(160,200,255,0.35)" strokeWidth="0.8" />
            <path d={`M80 ${148 - lift} L150 ${182 - lift} L220 ${148 - lift} L150 ${114 - lift} Z`} fill="rgba(143,184,255,0.14)" stroke="rgba(180,214,255,0.55)" strokeWidth="0.9" />
            {[0, 1, 2, 3].map((k) => (
              <circle key={k} cx={96 + k * 17} cy={168 - lift + k * 8.3} r="1.6" fill="#9EC4FF" opacity="0.75" />
            ))}
          </motion.g>
        );
      })}

      {/* kameralar va ko'rish konuslari */}
      {[
        { x: 80, y: 62, d: 1, alert: false },
        { x: 220, y: 62, d: -1, alert: true },
        { x: 150, y: 182, d: 1, alert: false },
      ].map((cam, i) => (
        <motion.g key={i} initial={{ opacity: 0 }} animate={on ? { opacity: 1 } : {}} transition={{ duration: 0.5, delay: 0.9 + i * 0.15 }}>
          <path
            d={`M${cam.x} ${cam.y} L${cam.x + 42 * cam.d} ${cam.y + 34} L${cam.x + 8 * cam.d} ${cam.y + 48} Z`}
            fill={cam.alert ? "rgba(255,107,122,0.2)" : "rgba(133,224,255,0.16)"}
          />
          <circle cx={cam.x} cy={cam.y} r="3.6" fill={cam.alert ? "#FF6B7A" : "#85E0FF"} />
          {cam.alert && (
            <motion.circle
              cx={cam.x}
              cy={cam.y}
              r="3.6"
              fill="none"
              stroke="#FF6B7A"
              strokeWidth="1.2"
              animate={{ r: [3.6, 14], opacity: [0.9, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
        </motion.g>
      ))}
    </svg>
  );
}

export default function S11Coverage({ t, fresh, at }: SlideProps) {
  const c = useCopy().coverage;
  const show = (time: number) => !fresh || t >= time;
  const drawn = show(at[0] + 0.4);
  const pinned = show(at[1]);
  const alert = show(at[3]);

  return (
    <Stage>
      <SlideTitle kicker={c.kicker} title={c.title} run={fresh} />

      <div className="mt-[clamp(18px,3vh,38px)] grid gap-[clamp(20px,2.6vw,48px)] lg:grid-cols-[minmax(0,1.42fr)_minmax(0,0.58fr)]">
        {/* ── xarita ── */}
        <div className="relative">
          <Glass className="overflow-hidden p-4">
            {/* Balandlik cheklangan: aks holda xarita kartasi ekrandan oshib ketardi */}
            <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} className="mx-auto h-auto max-h-[46vh] w-full">
              <defs>
                <radialGradient id="mapGlow" cx="50%" cy="50%" r="60%">
                  <stop offset="0%" stopColor="rgba(143,184,255,0.16)" />
                  <stop offset="100%" stopColor="rgba(143,184,255,0)" />
                </radialGradient>
              </defs>
              <rect width={MAP_W} height={MAP_H} fill="url(#mapGlow)" />

              {REGIONS.map((r, i) => {
                const hot = r.name === "Toshkent shahri" && alert;
                return (
                  <motion.path
                    key={r.name}
                    d={r.d}
                    fill={hot ? "rgba(255,107,122,0.16)" : "rgba(143,184,255,0.05)"}
                    stroke={hot ? "rgba(255,140,150,0.85)" : "rgba(160,200,255,0.5)"}
                    strokeWidth="1.1"
                    strokeLinejoin="round"
                    initial={fresh ? { pathLength: 0, opacity: 0 } : false}
                    animate={drawn ? { pathLength: 1, opacity: 1 } : {}}
                    transition={{ duration: 1.6, delay: fresh ? i * 0.07 : 0, ease: "easeInOut" }}
                  />
                );
              })}

              {/* hudud nuqtalari */}
              {REGIONS.map((r, i) => (
                <motion.g
                  key={`p-${r.name}`}
                  initial={fresh ? { opacity: 0, scale: 0 } : false}
                  animate={pinned ? { opacity: 1, scale: 1 } : {}}
                  transition={{ duration: 0.45, delay: fresh ? 0.05 * i : 0, ease: EASE }}
                  style={{ transformOrigin: `${r.cx}px ${r.cy}px` }}
                >
                  <circle cx={r.cx} cy={r.cy} r="5" fill="#85E0FF" opacity="0.95" />
                  <motion.circle
                    cx={r.cx}
                    cy={r.cy}
                    r="5"
                    fill="none"
                    stroke="#85E0FF"
                    strokeWidth="1.4"
                    animate={{ r: [5, 20], opacity: [0.7, 0] }}
                    transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.17 }}
                  />
                  {c.regions[r.name] && (
                    <text
                      x={r.cx + 10}
                      y={r.cy + 4}
                      fill="rgba(214,230,255,0.85)"
                      fontSize="15"
                      fontFamily="'IBM Plex Mono', monospace"
                      letterSpacing="0.06em"
                    >
                      {c.regions[r.name]}
                    </text>
                  )}
                </motion.g>
              ))}
            </svg>

            <motion.div
              initial={fresh ? { opacity: 0, y: 8 } : false}
              animate={alert ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, ease: EASE }}
              className="absolute left-6 top-6"
            >
              <Hud tone="alert">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" />
                {c.alert}
              </Hud>
            </motion.div>
          </Glass>
        </div>

        {/* ── o'ng ustun ── */}
        <div className="flex flex-col gap-3">
          {/* Ta'lim bosqichlari: platforma faqat maktab uchun emas */}
          <div className="grid grid-cols-2 gap-2.5">
            {c.segments.map((sg, i) => {
              const Icon = SEGMENT_ICONS[i];
              const when = at[1] + i * 0.35;
              return (
                <motion.div
                  key={sg.label}
                  initial={fresh ? { opacity: 0, y: 14 } : false}
                  animate={show(when) ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, ease: EASE }}
                >
                  <Glass className="px-4 py-3">
                    <span className="flex items-center gap-2 text-ice">
                      <Icon size={15} strokeWidth={1.8} />
                      <span className="text-[clamp(16px,1.5vw,23px)] font-light leading-none tracking-[-0.03em] text-white tabular-nums">
                        {sg.num}
                      </span>
                    </span>
                    <span className="mt-1.5 block text-[11.5px] leading-snug text-slate-400">{sg.label}</span>
                  </Glass>
                </motion.div>
              );
            })}
          </div>

          <motion.p
            initial={fresh ? { opacity: 0 } : false}
            animate={show(at[1] + 1.6) ? { opacity: 1 } : {}}
            transition={{ duration: 0.7 }}
            className="text-[10.5px] leading-snug text-slate-500"
          >
            {c.segmentsNote}
          </motion.p>

          <motion.div
            initial={fresh ? { opacity: 0, x: 18 } : false}
            animate={show(at[2]) ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.55, ease: EASE }}
            className="flex flex-wrap gap-2"
          >
            <Hud>
              <MapPin size={12} />
              {c.meta}
            </Hud>
          </motion.div>

          <motion.div
            initial={fresh ? { opacity: 0, y: 18 } : false}
            animate={alert ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, ease: EASE }}
            className="flex-1"
          >
            <Glass active={alert} className="flex h-full flex-col p-5">
              <div className="flex items-center gap-2">
                <Layers size={15} className="text-ice" />
                <p className="text-[13.5px] font-medium text-white">{c.campusTitle}</p>
              </div>
              {/* Balandlik qat'iy: SVG `w-full` bilan o'z nisbatiga cho'zilib,
                  o'ng ustunni ekrandan chiqarib yuborardi. */}
              <div className="my-1 h-[150px] w-full">
                <Campus3D on={alert} />
              </div>
              <p className="text-[12.5px] leading-snug text-slate-400">{c.campusNote}</p>
            </Glass>
          </motion.div>
        </div>
      </div>
    </Stage>
  );
}
