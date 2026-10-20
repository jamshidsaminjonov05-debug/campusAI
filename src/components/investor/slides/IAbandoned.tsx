"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Camera, Check, Clock, ScanSearch, ShieldAlert } from "lucide-react";
import { useCopy } from "../copy";
import {
  EASE,
  Corners,
  Glass,
  ORB_CLEAR,
  SlideTitle,
  Stage,
} from "@/components/deck/ui";
import type { SlideProps } from "@/components/deck/types";

/**
 * 9 — QOLDIRILGAN BUYUM → EGASINI QIDIRISH.
 *
 * Chapda trevoga kadri (sinfda sumka). O'ngda qidiruv: sumka bilan oxirgi
 * ko'ringan shaxsning kadri (qidiruv kadri) skanerlanadi, so'ng shu shaxs
 * boshqa kameralardan ketma-ket topiladi: xona → yo'lak → chiqish → hovli.
 *
 * ⚠️ Kadrlar — real kamera yozuvlari. Moslik foizi ko'rsatilmaydi: u
 * o'lchangan qiymat emas.
 *
 * `cue`: 0 sarlavha · 1 qoldirilgan buyum (katta modal) · 2 arxiv kadri,
 * egasi topildi (modal) · 3 egasining kadrlari (birin-ketin) · 4 xulosa.
 */

const ALERT_IMG = "/imges/investor/qoldirilgan/buyum-aniqlandi.webp";
/** Arxiv kadri: shu xonadagi sumka egasi */
const ARCHIVE_IMG = "/imges/investor/qoldirilgan/xona-buyum.webp";
/** Egasining qizil ramkasi — arxiv kadriga nisbatan foizda (kadr 1024×765) */
const OWNER_BOX = { left: 63, top: 35.5, width: 16, height: 22 };
const QUERY_IMG = "/imges/investor/qoldirilgan/ega-xona.webp";
/** Topilgan kadrlar — `copy.abandoned.search.steps` tartibida */
const MATCHES = [
  "/imges/investor/qoldirilgan/ega-xona.webp",
  "/imges/investor/qoldirilgan/ega-yolak.webp",
  "/imges/investor/qoldirilgan/ega-chiqish.webp",
  "/imges/investor/qoldirilgan/ega-hovli.webp",
];
const TONE = "#FFC46B";

export default function IAbandoned({ t, fresh, at }: SlideProps) {
  const c = useCopy().abandoned;
  const s = c.search!;
  const show = (cue: number) => !fresh || t >= (at[cue] ?? 0);
  const since = t - (at[3] ?? 0);
  /* 1: qoldirilgan buyum (katta) · 2: arxiv kadri, egasi topildi · 3+: egasi va uning kadrlari */
  const phase = !fresh
    ? 3
    : t >= (at[3] ?? Infinity)
      ? 3
      : t >= (at[2] ?? Infinity)
        ? 2
        : t >= (at[1] ?? Infinity)
          ? 1
          : 0;
  const sinceArchive = t - (at[2] ?? 0);

  return (
    <Stage>
      <div className="relative">
        <SlideTitle kicker={c.kicker} title={c.title} run={fresh} />
        <p
          className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.16em]"
          style={{ color: TONE }}
        >
          {c.sub}
        </p>

        <div className="mt-[clamp(10px,2vh,24px)] grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          {/* ── chap: trevoga kadri ── */}
          <motion.div
            initial={fresh ? { opacity: 0, x: -20 } : false}
            animate={phase >= 3 ? { opacity: 1, x: 0 } : { opacity: 0.1, x: 0 }}
            transition={{ duration: 0.65, ease: EASE }}
          >
            <Glass className="flex h-full flex-col overflow-hidden p-0">
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-black/40">
                <img
                  src={ALERT_IMG}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                <Corners />
                <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1.5 rounded bg-black/60 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.18em] text-rose-300 backdrop-blur-sm">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" />
                  {c.live}
                </span>
                <span className="absolute bottom-2.5 left-2.5 inline-flex flex-wrap items-center gap-x-3 gap-y-1 rounded bg-black/60 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-slate-200 backdrop-blur-sm">
                  <span className="inline-flex items-center gap-1.5">
                    <Camera size={11} />
                    {c.cam}
                  </span>
                  <span className="inline-flex items-center gap-1.5 tabular-nums">
                    <Clock size={11} />
                    {c.when}
                  </span>
                </span>
              </div>
              <div className="flex items-start gap-3 p-4">
                <span
                  className="grid h-9 w-9 flex-none place-items-center rounded-xl"
                  style={{ background: `${TONE}22`, color: TONE }}
                >
                  <ShieldAlert size={17} strokeWidth={1.75} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium leading-tight text-white">
                    {c.alertTitle}
                  </span>
                  <span className="mt-1 block text-[11.5px] leading-snug text-slate-400">
                    {c.alertText}
                  </span>
                </span>
              </div>
            </Glass>
          </motion.div>

          {/* ── o'ng: egasini qidirish ── */}
          <motion.div
            initial={fresh ? { opacity: 0, x: 18 } : false}
            animate={phase >= 3 ? { opacity: 1, x: 0 } : { opacity: 0.1, x: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <Glass active={phase >= 3} className="flex h-full flex-col p-4">
              <div className="flex items-center justify-between gap-3">
                <p
                  className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em]"
                  style={{ color: TONE }}
                >
                  <ScanSearch size={13} />
                  {s.title}
                </p>
                <span className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-slate-500">
                  {show(3) ? s.found : s.scanning}
                </span>
              </div>

              <div className="mt-3 grid flex-1 grid-cols-[minmax(0,0.55fr)_minmax(0,1.45fr)] gap-3">
                {/* qidiruv kadri + skaner chizig'i */}
                <div>
                  <div className="relative aspect-[3/5] overflow-hidden rounded-lg border border-white/10 bg-black/40">
                    <img
                      src={QUERY_IMG}
                      alt=""
                      className="h-full w-full object-cover object-top"
                      loading="lazy"
                    />
                    {!show(3) && (
                      <motion.span
                        className="absolute inset-x-0 h-[2px] bg-ice shadow-[0_0_12px_rgba(120,200,255,0.9)]"
                        animate={{ top: ["4%", "96%", "4%"] }}
                        transition={{
                          duration: 2.2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />
                    )}
                    <Corners />
                  </div>
                  <p className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-slate-500">
                    {s.queryLabel}
                  </p>
                </div>

                {/* topilgan kadrlar */}
                <div className="grid grid-cols-4 gap-2">
                  {s.steps.map((st, i) => {
                    const on = !fresh ? true : show(3) && since >= i * 1.8;
                    return (
                      <motion.div
                        key={st.place}
                        initial={
                          fresh ? { opacity: 0, y: 12, scale: 0.94 } : false
                        }
                        animate={
                          on
                            ? { opacity: 1, y: 0, scale: 1 }
                            : { opacity: 0.1, y: 0, scale: 0.94 }
                        }
                        transition={{ duration: 0.55, ease: EASE }}
                        className="flex flex-col"
                      >
                        <div
                          className="relative aspect-[3/5] overflow-hidden rounded-lg border bg-black/40"
                          style={{
                            borderColor: on
                              ? `${TONE}88`
                              : "rgba(255,255,255,0.1)",
                          }}
                        >
                          <img
                            src={MATCHES[i]}
                            alt=""
                            className="h-full w-full object-cover object-top"
                            loading="lazy"
                          />
                          <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-emerald-400/90 text-[#0b0f18]">
                            <Check size={12} strokeWidth={3} />
                          </span>
                        </div>
                        <p
                          className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[0.1em]"
                          style={{ color: TONE }}
                        >
                          {i + 1}. {st.place}
                        </p>
                        <p className="text-[10.5px] leading-snug text-slate-400">
                          {st.text}
                        </p>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              <p className="mt-3 text-[11.5px] leading-snug text-slate-300">
                {s.result}
              </p>
            </Glass>
          </motion.div>
        </div>

        <motion.p
          initial={fresh ? { opacity: 0 } : false}
          animate={show(4) ? { opacity: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.3 }}
          className={`mt-2.5 font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500 ${ORB_CLEAR}`}
        >
          {c.footer}
        </motion.p>

        {/* ── markazdagi katta modal: 1) qoldirilgan buyum  2) arxiv kadri, egasi topildi ── */}
        <AnimatePresence mode="wait">
          {(phase === 1 || phase === 2) && (
            <motion.div
              key={phase}
              initial={{ opacity: 0, scale: 0.9, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="pointer-events-none absolute inset-0 z-30 grid place-items-center bg-[#050912]/60"
            >
              <div
                className={`${phase === 1 ? "w-[min(760px,94%)]" : "w-[min(600px,92%)]"} overflow-hidden rounded-2xl border bg-[#0b1220] shadow-[0_0_70px_rgba(255,196,107,0.22)]`}
                style={{ borderColor: `${TONE}88` }}
              >
                <div className={`relative w-full overflow-hidden bg-black/50 ${phase === 1 ? "aspect-video" : "aspect-[1024/765]"}`}>
                  <img
                    src={phase === 1 ? ALERT_IMG : ARCHIVE_IMG}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <Corners />
                  {phase === 2 && sinceArchive >= 1.6 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 1.3 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, ease: EASE }}
                      className="absolute border-2 border-red-500 shadow-[0_0_14px_rgba(239,68,68,0.7)]"
                      style={{
                        left: `${OWNER_BOX.left}%`,
                        top: `${OWNER_BOX.top}%`,
                        width: `${OWNER_BOX.width}%`,
                        height: `${OWNER_BOX.height}%`,
                      }}
                    >
                      <span className="absolute -top-5 left-[-2px] bg-red-500 px-1.5 py-[1px] font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-white">
                        {s.ownerFound}
                      </span>
                    </motion.div>
                  )}
                  {phase === 2 && sinceArchive < 1.6 && (
                    <motion.span
                      className="absolute inset-x-0 h-[2px] bg-ice shadow-[0_0_12px_rgba(120,200,255,0.9)]"
                      animate={{ top: ["4%", "96%", "4%"] }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                  )}
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded bg-black/60 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-200">
                    {phase === 1 ? (
                      <>
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" />
                        {c.live}
                      </>
                    ) : (
                      s.archiveLabel
                    )}
                  </span>
                  {phase === 2 && sinceArchive >= 2.2 && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded bg-emerald-400/90 px-2.5 py-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[#0b0f18]"
                    >
                      <Check size={13} strokeWidth={3} />
                      {s.ownerFound}
                    </motion.span>
                  )}
                  <span className="absolute bottom-3 left-3 inline-flex flex-wrap items-center gap-x-3 gap-y-1 rounded bg-black/60 px-2 py-1 font-mono text-[10.5px] uppercase tracking-[0.08em] text-slate-200">
                    <span className="inline-flex items-center gap-1.5">
                      <Camera size={12} />
                      {c.cam}
                    </span>
                  </span>
                </div>
                {phase === 1 && (
                  <div className="flex items-start gap-3 p-4">
                    <span
                      className="grid h-10 w-10 flex-none place-items-center rounded-xl"
                      style={{ background: `${TONE}22`, color: TONE }}
                    >
                      <ShieldAlert size={19} strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[15px] font-medium leading-tight text-white">
                        {c.alertTitle}
                      </span>
                      <span className="mt-1 block text-[12px] leading-snug text-slate-400">
                        {c.alertText}
                      </span>
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Stage>
  );
}
