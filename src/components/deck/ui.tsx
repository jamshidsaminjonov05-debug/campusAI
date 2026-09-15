"use client";

import { motion, type Variants } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Taqdimotning umumiy qurilish bloklari.
 *
 * Barcha slaydlar shu yerdagi tipografiya va HUD elementlaridan quriladi —
 * uslubni faqat shu faylda o'zgartiring, butun shou ergashadi.
 */

export const EASE = [0.16, 1, 0.3, 1] as const;

/** Slayd ochilishidagi umumiy kirish animatsiyasi */
export const rise: Variants = {
  hidden: { opacity: 0, y: 26 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.75, delay: 0.08 * (i as number), ease: EASE },
  }),
};

/* ────────────────────────────── sarlavha ─────────────────────────────── */

/**
 * Harf-harf yoziladigan sarlavha — terminalda terilayotgandek.
 * `run` false bo'lsa matn darhol to'liq chiqadi (slaydga qaytilgan holat).
 */
export function Typed({
  text,
  run,
  speed = 34,
  className = "",
}: {
  text: string;
  run: boolean;
  speed?: number;
  className?: string;
}) {
  const [n, setN] = useState(0);
  const done = n >= text.length;

  useEffect(() => {
    if (!run) {
      setN(text.length);
      return;
    }
    setN(0);
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setN(i);
      if (i >= text.length) window.clearInterval(id);
    }, speed);
    return () => window.clearInterval(id);
  }, [text, run, speed]);

  return (
    <span className={className}>
      {text.slice(0, n)}
      <span
        className={`ml-[2px] inline-block h-[0.85em] w-[3px] translate-y-[0.08em] bg-ice ${
          done ? "opacity-0" : "animate-pulse"
        }`}
      />
    </span>
  );
}

/** Slayd sarlavhasi — kicker + katta sarlavha + ostidagi chiziq */
export function SlideTitle({
  kicker,
  title,
  run,
  align = "left",
}: {
  kicker?: string;
  title: string;
  run: boolean;
  align?: "left" | "center";
}) {
  const center = align === "center";
  return (
    <div className={center ? "text-center" : ""}>
      {kicker && (
        <motion.p
          variants={rise}
          initial="hidden"
          animate="show"
          className="font-mono text-[12px] uppercase tracking-[0.42em] text-ice/70"
        >
          {kicker}
        </motion.p>
      )}
      <h2 className="mt-3 text-[clamp(26px,3.1vw,50px)] font-light leading-[1.12] tracking-[-0.035em] text-white">
        <Typed text={title} run={run} />
      </h2>
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.9, delay: 0.2, ease: EASE }}
        className={`mt-5 h-px w-full bg-gradient-to-r from-ice/70 via-ice/15 to-transparent ${
          center ? "origin-center" : "origin-left"
        }`}
      />
    </div>
  );
}

/* ──────────────────────────────── HUD ────────────────────────────────── */

/** Monospace yorliq — kamera nomi, vaqt tamg'asi, holat */
export function Hud({ children, tone = "ice" }: { children: ReactNode; tone?: "ice" | "alert" | "ok" }) {
  const map = {
    ice: "border-ice/30 bg-ice/10 text-ice",
    alert: "border-rose-400/40 bg-rose-500/15 text-rose-200",
    ok: "border-emerald-400/35 bg-emerald-500/12 text-emerald-200",
  } as const;
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-md border px-2.5 py-1 font-mono text-[11px] uppercase tracking-[0.16em] ${map[tone]}`}
    >
      {children}
    </span>
  );
}

/** Burchak qavslari — kadrni "nishonga olingan" qilib ko'rsatadi */
export function Corners({ className = "" }: { className?: string }) {
  const c = "absolute h-5 w-5 border-ice/55";
  return (
    <div className={`pointer-events-none absolute inset-0 ${className}`}>
      <span className={`${c} left-0 top-0 border-l border-t`} />
      <span className={`${c} right-0 top-0 border-r border-t`} />
      <span className={`${c} bottom-0 left-0 border-b border-l`} />
      <span className={`${c} bottom-0 right-0 border-b border-r`} />
    </div>
  );
}

/**
 * Sanoq — 0 dan berilgan songacha yumshoq chiqadi.
 * `run` false bo'lsa darhol oxirgi qiymat (qaytilgan slayd).
 */
export function Count({ to, run, dur = 1.4, suffix = "" }: { to: number; run: boolean; dur?: number; suffix?: string }) {
  const [v, setV] = useState(run ? 0 : to);
  const raf = useRef(0);

  useEffect(() => {
    if (!run) {
      setV(to);
      return;
    }
    const t0 = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / (dur * 1000));
      // easeOutExpo — oxiriga borib sekinlashadi
      const e = k === 1 ? 1 : 1 - Math.pow(2, -10 * k);
      setV(Math.round(to * e));
      if (k < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [to, run, dur]);

  return (
    <>
      {v.toLocaleString("ru-RU").replace(/ /g, " ")}
      {suffix}
    </>
  );
}

/** Katta raqam + izoh */
export function Stat({ num, label, i = 0 }: { num: ReactNode; label: string; i?: number }) {
  return (
    <motion.div variants={rise} custom={i} initial="hidden" animate="show">
      <p className="text-[clamp(28px,3.2vw,52px)] font-light leading-none tracking-[-0.04em] text-white">{num}</p>
      <p className="mt-2 text-[13px] leading-snug text-slate-400">{label}</p>
    </motion.div>
  );
}

/** Shisha karta — ilovadagi `nexa-card` bilan bir uslubda */
export function Glass({
  children,
  className = "",
  active = false,
}: {
  children: ReactNode;
  className?: string;
  active?: boolean;
}) {
  return (
    <div
      className={`relative rounded-2xl border backdrop-blur-xl transition-all duration-500 ${
        active
          ? "border-ice/45 bg-ice/[0.08] shadow-[0_0_48px_-18px_rgba(143,184,255,0.75)]"
          : "border-white/[0.08] bg-white/[0.035]"
      } ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Pastki CHAP burchakda AI orbi turadi (~238 px).
 *
 * Orb kontent ORTIDA (`z-0`), ya'ni matnni to'smaydi — lekin uning
 * yorug'ligi ustidagi past kontrastli kulrang yozuvni yuvib yuboradi.
 * Shuning uchun burchakka tushadigan izoh va manba qatorlari shu klass
 * bilan chapdan siljitiladi.
 *
 * Faqat keng ekranlarda: taqdimot proyektor va noutbuk uchun, tor
 * ekranda esa bunday chekinish matnni siqib qo'yardi.
 */
export const ORB_CLEAR = "lg:pl-[228px]";

/** Slayd maydoni — barcha slaydlar uchun bir xil chekinish va kenglik */
export function Stage({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`mx-auto flex h-full w-full max-w-[1500px] flex-col justify-center px-[clamp(28px,5vw,86px)] py-[clamp(48px,7vh,96px)] ${className}`}>
      {children}
    </div>
  );
}
