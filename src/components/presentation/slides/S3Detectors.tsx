"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { ArrowLeftRight, Cigarette, Crosshair, ScanFace, Smartphone, Swords, UserX, type LucideIcon } from "lucide-react";
import { useCopy } from "../copy";
import { phaseAt } from "@/components/deck/narration";
import { voiceBus } from "@/components/deck/voiceBus";
import { Corners, EASE, Hud, SlideTitle, Stage } from "@/components/deck/ui";
import type { SlideProps } from "@/components/deck/types";

/**
 * 3 — AI DETEKTORLARI. Shouning markazi.
 *
 * Har detektor butun ekranni egallagan "monitor" ichida ko'rsatiladi:
 * kadr → skaner chizig'i → nishon ramkasi → ishonch darajasi → ovozli
 * signal. Chapdagi ro'yxat qaysi model ishlayotganini ko'rsatib turadi.
 *
 * ⚠️ Signal — FAQAT OHANG (`alert-warn` / `alert-info`), nutq EMAS.
 * Ilovada «Qurol aniqlandi» kabi GAPIRUVCHI fayllar bor va ilgari shular
 * ijro etilardi — natijada taqdimotchining ovozi bilan ustma-ust tushib,
 * ikki ovoz bir vaqtda gapirardi. Zalda bu eng yomon xato, shuning uchun
 * bu yerda faqat qisqa ohang qoldirilgan.
 *
 * Matn `copy/<til>.ts` da; bu yerda faqat KADRGA bog'liq narsalar:
 * rasm, nishon ramkasining koordinatasi, rang va tovush.
 */

type Shot = {
  icon: LucideIcon;
  img?: string;
  video?: string;
  poster?: string;
  /** Maktabning O'Z kamerasidan olingan yozuv (maket emas) */
  real?: boolean;
  /**
   * Kadrda ramkani MODELNING O'ZI chizgan. Bunda biz o'z ramkamizni
   * chizmaymiz — aks holda bitta odamda ikkita ramka bo'lib, isbot
   * bezakka aylanardi.
   */
  ownBox?: boolean;
  /** nishon ramkasi, kadrga nisbatan foizda */
  box: { x: number; y: number; w: number; h: number };
  conf: number;
  tone: "alert" | "warn" | "ok";
  sound?: string;
};

/** Qisqa ohang — nutqsiz (nutq narration bilan urishib ketadi) */
const TONE_ALERT = "/audio/alert-warn.mp3";
const TONE_SOFT = "/audio/alert-info.mp3";

/**
 * ⚠️ To'rtta kadr — maktabning HAQIQIY kamerasidan (`real: true`): qurol,
 * hovlidagi ikki sahna va kirish turniketi. Qurol kadrida ramka va `Qurol: 0.86`
 * yozuvi MODELNING O'Z chiqishi (`ownBox`) — biz unga tegmaymiz.
 * Qolganlari ko'rgazmali rasm; bu farq ekranda ham belgilanadi.
 */
const SHOTS: Shot[] = [
  { icon: ScanFace, img: "/imges/ai-face.webp", box: { x: 34, y: 16, w: 33, h: 46 }, conf: 0.96, tone: "ok", sound: TONE_SOFT },
  {
    icon: Crosshair,
    img: "/imges/taqdimot/qurol-kadr.webp",
    real: true,
    ownBox: true,
    box: { x: 40, y: 42, w: 30, h: 26 },
    conf: 0.86,
    tone: "alert",
    sound: TONE_ALERT,
  },
  { icon: Swords, video: "/video/fight.mp4", poster: "/video/fight-poster.jpg", box: { x: 26, y: 22, w: 48, h: 60 }, conf: 0.88, tone: "alert", sound: TONE_ALERT },
  {
    icon: Cigarette,
    video: "/video/taqdimot/hovli-2.mp4",
    poster: "/video/taqdimot/hovli-2-poster.jpg",
    real: true,
    box: { x: 55, y: 46, w: 17, h: 36 },
    conf: 0.84,
    tone: "warn",
    sound: TONE_SOFT,
  },
  {
    icon: Smartphone,
    video: "/video/taqdimot/hovli-1.mp4",
    poster: "/video/taqdimot/hovli-1-poster.jpg",
    real: true,
    box: { x: 1.5, y: 61, w: 11.5, h: 38 },
    conf: 0.79,
    tone: "warn",
    sound: TONE_SOFT,
  },
  { icon: UserX, img: "/imges/notanish.webp", box: { x: 33, y: 14, w: 34, h: 52 }, conf: 0.93, tone: "alert", sound: TONE_ALERT },
  {
    icon: ArrowLeftRight,
    video: "/video/taqdimot/kirish.mp4",
    poster: "/video/taqdimot/kirish-poster.jpg",
    real: true,
    box: { x: 36, y: 36, w: 42, h: 48 },
    conf: 0.97,
    tone: "ok",
  },
];

const TONE = {
  alert: { line: "#FF6B7A", soft: "rgba(255,107,122,0.14)", chip: "alert" as const },
  warn: { line: "#FFC46B", soft: "rgba(255,196,107,0.14)", chip: "ice" as const },
  ok: { line: "#7CE7B0", soft: "rgba(124,231,176,0.14)", chip: "ok" as const },
};

export default function S3Detectors({ active, t, fresh, at }: SlideProps) {
  const c = useCopy().detectors;

  /* `at[0]` — "men nimalarni ko'ra olaman?" savoli, monitor hali bo'sh.
     Detektorlar `at[1]` dan boshlanadi, shuning uchun indeks bittaga siljiydi. */
  const i = fresh ? phaseAt(at, t) - 1 : SHOTS.length - 1;
  const shot = i >= 0 ? SHOTS[i] : null;
  const det = i >= 0 ? c.dets[i] : null;

  /* Signal — har bosqichga BIR marta. Slaydga qaytilganda takrorlanmaydi
     (`fresh`). Taqdimotchi ovozni o'chirgan bo'lsa (`M`) signal ham
     chiqmaydi: "ovoz o'chiq" degani butun sahna jim degani. */
  const played = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (!active || !fresh || !shot?.sound || played.current.has(i)) return;
    if (voiceBus.isMuted) return;
    played.current.add(i);
    const a = new Audio(shot.sound);
    a.volume = 0.3;
    void a.play().catch(() => {});
    return () => {
      a.pause();
    };
  }, [active, fresh, shot, i]);

  useEffect(() => {
    if (!active) played.current.clear();
  }, [active]);

  const tone = shot ? TONE[shot.tone] : TONE.ok;

  return (
    <Stage>
      <SlideTitle kicker={c.kicker} title={c.title} run={fresh} />

      <div className="mt-[clamp(20px,3.5vh,42px)] grid gap-[clamp(20px,2.5vw,44px)] lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]">
        {/* ── chap: modellar ro'yxati ── */}
        <ul className="flex flex-col gap-2">
          {c.dets.map((d, k) => {
            const Icon = SHOTS[k].icon;
            const on = k === i;
            const past = k < i;
            return (
              <motion.li
                key={d.name}
                initial={fresh ? { opacity: 0, x: -14 } : false}
                animate={{ opacity: on ? 1 : past ? 0.62 : 0.3, x: 0 }}
                transition={{ duration: 0.45, ease: EASE }}
                className={`relative flex items-center gap-3 overflow-hidden rounded-xl border px-4 py-3 transition-colors duration-500 ${
                  on ? "border-ice/45 bg-ice/[0.09]" : "border-white/[0.07] bg-white/[0.02]"
                }`}
              >
                {on && <span className="absolute inset-y-0 left-0 w-[3px] bg-ice shadow-[0_0_14px_2px_rgba(143,184,255,0.6)]" />}
                <span className={`grid h-9 w-9 flex-none place-items-center rounded-lg ${on ? "bg-ice/[0.18] text-ice" : "bg-white/5 text-slate-400"}`}>
                  <Icon size={17} strokeWidth={1.7} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[14.5px] font-medium text-white">{d.name}</span>
                  <span className="block truncate text-[12px] text-slate-400">{d.note}</span>
                </span>
                {(on || past) && (
                  <span className="ml-auto font-mono text-[10.5px] tracking-wider text-ice/70">
                    {(SHOTS[k].conf * 100).toFixed(0)}%
                  </span>
                )}
              </motion.li>
            );
          })}
        </ul>

        {/* ── o'ng: monitor ── */}
        <div className="relative">
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.12] bg-black shadow-[0_40px_90px_-40px_rgba(0,0,0,0.9)]">
            <div className="relative aspect-[16/10]">
              <AnimatePresence mode="wait">
                {shot && det ? (
                  <motion.div
                    key={det.name}
                    initial={fresh ? { opacity: 0, scale: 1.04 } : false}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.55, ease: EASE }}
                    className="absolute inset-0"
                  >
                    {shot.video ? (
                      <video src={shot.video} poster={shot.poster} autoPlay muted loop playsInline className="h-full w-full object-cover" />
                    ) : (
                      <img src={shot.img} alt="" className="h-full w-full object-cover" />
                    )}

                    {/* kuzatuv kamerasi belgisi — kontrast va skanerlash */}
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,7,16,0.42),transparent_28%,transparent_66%,rgba(3,7,16,0.65))]" />
                    <motion.div
                      initial={{ y: "-100%" }}
                      animate={{ y: "100%" }}
                      transition={{ duration: 2.6, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-x-0 h-1/4 bg-gradient-to-b from-transparent via-ice/[0.18] to-transparent"
                    />

                    {/* nishon ramkasi — modelning o'z ramkasi bo'lsa chizilmaydi */}
                    {!shot.ownBox && (
                    <motion.div
                      initial={fresh ? { opacity: 0, scale: 1.18 } : false}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5, delay: 0.45, ease: EASE }}
                      className="absolute"
                      style={{
                        left: `${shot.box.x}%`,
                        top: `${shot.box.y}%`,
                        width: `${shot.box.w}%`,
                        height: `${shot.box.h}%`,
                        border: `2px solid ${tone.line}`,
                        background: tone.soft,
                        boxShadow: `0 0 28px -6px ${tone.line}`,
                      }}
                    >
                      <span
                        className="absolute -top-[26px] left-[-2px] whitespace-nowrap rounded-t px-2 py-[3px] font-mono text-[11px] font-semibold tracking-wide text-[#06101f]"
                        style={{ background: tone.line }}
                      >
                        {det.label} {shot.conf.toFixed(2)}
                      </span>
                    </motion.div>
                    )}

                    {/* kadr HUD */}
                    <div className="absolute left-4 top-4 flex items-center gap-2">
                      <Hud tone={tone.chip}>
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" /> {c.live}
                      </Hud>
                      <span className="rounded bg-black/55 px-2 py-1 font-mono text-[11px] tracking-wide text-white/80">{det.cam}</span>
                    </div>
                    {shot.real && (
                      <span className="absolute right-4 top-4 rounded border border-emerald-400/40 bg-emerald-500/15 px-2 py-1 font-mono text-[10.5px] uppercase tracking-[0.12em] text-emerald-200">
                        {shot.ownBox ? c.own : c.real}
                      </span>
                    )}
                    <span className="absolute bottom-4 right-4 rounded bg-black/55 px-2 py-1 font-mono text-[11px] tracking-wide text-white/70">
                      {c.stamp}
                    </span>
                    <Corners className="m-3" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 grid place-items-center bg-[#05080f]"
                  >
                    <p className="font-mono text-[12px] uppercase tracking-[0.4em] text-ice/50">{c.idle}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[13px] text-slate-400">{c.footer}</p>
            <span className="font-mono text-[11px] tracking-[0.18em] text-slate-500">
              {Math.max(0, i + 1)} / {SHOTS.length}
            </span>
          </div>
        </div>
      </div>
    </Stage>
  );
}
