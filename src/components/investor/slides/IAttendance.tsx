"use client";

import { motion } from "framer-motion";
import { BellRing, Camera, Check } from "lucide-react";
import { useCopy } from "../copy";
import { Count, Corners, EASE, Glass, ORB_CLEAR, SlideTitle, Stage } from "@/components/deck/ui";
import type { SlideProps } from "@/components/deck/types";

/**
 * 10 — DAVOMAT. KETMA-KET: KIRISH → BIRINCHI DARS → OXIRGI DARS → XULOSA.
 *
 * Har kadr o'z ovoz bo'lagida kattalashadi va sanog'i chiqadi, qolganlari
 * xiralashadi. Oxirida ikkala dars yonma-yon va "11" xulosasi.
 *
 * ⚠️ Sonlar kadrlardagi belgilardan: 25/28 va 17/28. "11" = 28 − 17 —
 * shundan 3 tasi birinchi darsdayoq yo'q edi (`copy.note` buni aytadi).
 * Sonni o'zgartirsangiz matn va ovozni ham yangilang.
 *
 * `cue`: 0 sarlavha · 1 kirish · 2 birinchi dars · 3 oxirgi dars · 4 xulosa.
 */

const TOTAL = 28;
const FIRST = 25;
const LAST = 17;
const GONE = TOTAL - LAST;

/** Kartalar — `copy.attendance.flow` tartibida */
const SHOTS = [
  { src: "/imges/investor/davomat/faceid.webp", tone: "#8FB8FF", cue: 1, count: FIRST },
  { src: "/imges/investor/davomat/firstlesson.webp", tone: "#5DD6A5", cue: 2, count: FIRST },
  { src: "/imges/investor/davomat/lastlesson.webp", tone: "#FFC46B", cue: 3, count: LAST },
] as const;

export default function IAttendance({ t, fresh, at }: SlideProps) {
  const c = useCopy().attendance;
  const time = (cue: number) => at[cue] ?? 0;
  const reached = (cue: number) => !fresh || t >= time(cue);
  /* Hozir "gapirilayotgan" kadr: oxirgi yetilgan bo'lak. Xulosada (4) hammasi teng. */
  const phase = !fresh ? 4 : Math.max(0, ...[1, 2, 3, 4].filter((k) => t >= time(k)));
  const done = phase >= 4;

  return (
    <Stage>
      <SlideTitle kicker={c.kicker} title={c.title} run={fresh} />
      <p className="mt-1 text-[12.5px] leading-snug text-slate-400">{c.sub}</p>

      {/* ── kadrlar: faol kadr kattalashadi ── */}
      <div className="mt-[clamp(10px,2vh,22px)] flex gap-3">
        {c.flow.map((f, i) => {
          const s = SHOTS[i];
          const shown = reached(s.cue);
          const active = phase === s.cue;
          const grow = done ? 1 : active ? 2.4 : 1;
          return (
            <motion.div
              key={f.title}
              initial={fresh ? { opacity: 0, y: 18 } : false}
              animate={{
                opacity: shown ? (done || active ? 1 : 0.55) : 0.12,
                y: 0,
                flexGrow: grow,
              }}
              transition={{ duration: 0.7, ease: EASE }}
              style={{ flexBasis: 0, minWidth: 0 }}
            >
              <Glass active={active} className="flex h-full flex-col overflow-hidden p-0">
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-black/40">
                  <img src={s.src} alt="" className="h-full w-full object-cover" loading="lazy" />
                  <Corners />
                  <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded bg-black/60 px-2 py-1 font-mono text-[9.5px] uppercase tracking-[0.1em] text-slate-200 backdrop-blur-sm">
                    <Camera size={11} />
                    {f.tag}
                  </span>
                  {s.count != null && (
                    <motion.span
                      initial={fresh ? { opacity: 0, scale: 0.6 } : false}
                      animate={shown ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.6 }}
                      transition={{ duration: 0.6, delay: fresh ? 0.35 : 0, ease: EASE }}
                      className="absolute bottom-2.5 right-2.5 rounded-lg bg-black/70 px-3 py-1.5 font-light tabular-nums backdrop-blur-sm"
                      style={{ color: s.tone, fontSize: "clamp(22px,2.6vw,40px)", lineHeight: 1 }}
                    >
                      <Count to={s.count} run={fresh && shown} dur={1.1} />
                      <span className="text-[0.55em] text-slate-400"> / {TOTAL}</span>
                    </motion.span>
                  )}
                </div>
                <div className="p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: s.tone }}>
                    {f.title}
                  </p>
                  <p className="mt-2 text-[11.5px] leading-[1.5] text-slate-300">{f.text}</p>
                </div>
              </Glass>
            </motion.div>
          );
        })}
      </div>

      {/* ── xulosa: 28 → 25 → 17 = 11 ── */}
      <motion.div
        initial={fresh ? { opacity: 0, y: 14 } : false}
        animate={reached(4) ? { opacity: 1, y: 0 } : { opacity: 0.12, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3 rounded-xl border border-amber-300/40 bg-amber-300/[0.08] px-4 py-3"
      >
        <div className="flex items-baseline gap-2 font-light tabular-nums text-slate-300">
          <span className="text-[clamp(18px,1.8vw,26px)]">{TOTAL}</span>
          <span className="text-slate-500">→</span>
          <span className="text-[clamp(18px,1.8vw,26px)] text-emerald-300">{FIRST}</span>
          <span className="text-slate-500">→</span>
          <span className="text-[clamp(18px,1.8vw,26px)] text-amber-300">{LAST}</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-[clamp(30px,3.2vw,48px)] font-light leading-none tabular-nums text-amber-300">
            <Count to={GONE} run={fresh && reached(4)} dur={1.2} />
          </span>
          <span className="text-[11px] uppercase tracking-[0.14em] text-amber-100/80">{c.resultLabel}</span>
        </div>
        <div className="flex min-w-[260px] flex-1 items-start gap-3">
          <span className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-amber-300/20 text-amber-300">
            <BellRing size={17} />
          </span>
          <span className="min-w-0">
            <span className="block text-[13px] font-medium leading-tight text-white">{c.alertTitle}</span>
            <span className="mt-1 block text-[11.5px] leading-snug text-amber-100/80">{c.alertText}</span>
          </span>
        </div>
      </motion.div>

      {/* ── imkoniyatlar ── */}
      <motion.ul
        initial={fresh ? { opacity: 0, y: 12 } : false}
        animate={reached(4) ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, delay: fresh ? 0.3 : 0, ease: EASE }}
        className={`mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2 ${ORB_CLEAR}`}
      >
        {c.points.map((p) => (
          <li key={p} className="flex items-start gap-2 text-[11.5px] leading-snug text-slate-300">
            <Check size={13} className="mt-[2px] flex-none text-emerald-300" />
            {p}
          </li>
        ))}
      </motion.ul>
      <p className={`mt-2 text-[10.5px] leading-snug text-slate-500 ${ORB_CLEAR}`}>{c.note}</p>
    </Stage>
  );
}
