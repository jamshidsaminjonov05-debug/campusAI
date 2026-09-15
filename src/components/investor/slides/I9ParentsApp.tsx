"use client";

import { motion } from "framer-motion";
import { BellRing, CalendarDays, LogIn, Percent } from "lucide-react";
import { useCopy } from "../copy";
import { EASE, Glass, ORB_CLEAR, SlideTitle, Stage } from "@/components/deck/ui";
import type { SlideProps } from "@/components/deck/types";

/**
 * 9 — OTA-ONALAR ILOVASI. REAL EKRAN RASMLARI.
 *
 * 5-slayddagi muammoning javobi. Ekran rasmlari HAQIQIY ilovadan
 * olingan (179-maktab) — maketlar emas. Shuning uchun ular biroz
 * burchak ostida, bir-birining ustiga qo'yib ko'rsatiladi: telefon
 * ekrani sifatida o'qiladi va sahnaga hajm beradi.
 *
 * O'rtadagi rasm ATAYLAB ogohlantirish ekrani — ilovaning butun ma'nosi
 * shu bitta qizil bannerda: ota-ona hodisani REAL VAQTDA biladi.
 *
 * `cue` — ovoz bo'lagi indeksi (`copy.narration`).
 */
const SHOTS = [
  { src: "/imges/investor/ilova-bosh.webp", rotate: -5, z: 10 },
  { src: "/imges/investor/ilova-ogohlantirish.webp", rotate: 0, z: 30 },
  { src: "/imges/investor/ilova-chekish.webp", rotate: 5, z: 20 },
];

const ICONS = [LogIn, Percent, BellRing, CalendarDays];

export default function I9ParentsApp({ t, fresh, at }: SlideProps) {
  const c = useCopy().parentsApp;
  const show = (cue: number) => !fresh || t >= (at[cue] ?? 0);

  return (
    <Stage>
      <SlideTitle kicker={c.kicker} title={c.title} run={fresh} />

      <div className="mt-[clamp(12px,2.2vh,28px)] grid gap-[clamp(16px,2.4vw,44px)] lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        {/* ── chap: telefon ekranlari ── */}
        <div className="flex items-center justify-center gap-[clamp(6px,1vw,18px)]">
          {SHOTS.map((s, i) => {
            const on = show(1);
            const mid = i === 1;
            return (
              <motion.div
                key={s.src}
                initial={fresh ? { opacity: 0, y: 28, rotate: 0 } : false}
                animate={on ? { opacity: 1, y: 0, rotate: s.rotate } : { opacity: 0.12, y: 0, rotate: s.rotate }}
                transition={{ duration: 0.7, delay: fresh && on ? i * 0.14 : 0, ease: EASE }}
                style={{ zIndex: s.z }}
                className={`relative ${mid ? "w-[34%]" : "w-[30%]"}`}
              >
                <span
                  className={`block overflow-hidden rounded-[18px] border bg-black/30 ${
                    mid ? "border-ice/45 shadow-[0_0_60px_-18px_rgba(133,224,255,0.75)]" : "border-white/[0.12]"
                  }`}
                >
                  <img src={s.src} alt="" className="block h-auto w-full" loading="lazy" />
                </span>
                <span className="mt-2.5 block text-center text-[10px] leading-snug text-slate-500">{c.shots[i]}</span>
              </motion.div>
            );
          })}
        </div>

        {/* ── o'ng: nimalarni ko'radi ── */}
        <div className="flex flex-col justify-center gap-2.5">
          {c.items.map((it, i) => {
            const Icon = ICONS[i];
            const on = show(1);
            return (
              <motion.div
                key={it.title}
                initial={fresh ? { opacity: 0, x: 18 } : false}
                animate={on ? { opacity: 1, x: 0 } : { opacity: 0.14, x: 0 }}
                transition={{ duration: 0.5, delay: fresh && on ? i * 0.09 : 0, ease: EASE }}
              >
                <Glass active={i === 2} className="flex items-start gap-3.5 p-4">
                  <span
                    className={`grid h-9 w-9 flex-none place-items-center rounded-xl ${
                      i === 2 ? "bg-rose-500/15 text-rose-300" : "bg-ice/12 text-ice"
                    }`}
                  >
                    <Icon size={17} strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-medium leading-tight text-white">{it.title}</span>
                    <span className="mt-1 block text-[11.5px] leading-snug text-slate-400">{it.text}</span>
                  </span>
                </Glass>
              </motion.div>
            );
          })}

          <motion.p
            initial={fresh ? { opacity: 0 } : false}
            animate={show(2) ? { opacity: 1 } : {}}
            transition={{ duration: 0.7 }}
            className="mt-1 text-[10.5px] leading-snug text-slate-500"
          >
            {c.note}
          </motion.p>
        </div>
      </div>

      <div className={ORB_CLEAR} />
    </Stage>
  );
}
