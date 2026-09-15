"use client";

import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { Camera, Clock } from "lucide-react";
import { useCopy } from "../copy";
import { EASE, Corners, Glass, ORB_CLEAR, SlideTitle, Stage } from "@/components/deck/ui";
import type { SlideProps } from "@/components/deck/types";

/**
 * 7 — DETEKTORLAR. REAL KADRLAR.
 *
 * ⚠️ TAQDIMOTNING ISBOT SLAYDI. Bu yerdagi hech narsa chizilgan yoki
 * qayta tiklangan emas: qurol videosi, chekish va janjal kadrlari —
 * ishlab turgan tizimning haqiqiy qaydlari, ishonch darajasi va kamera
 * nomi bilan.
 *
 * Shu sababli har bir kartada METAMA'LUMOT ko'rsatiladi: qaysi kamera,
 * qachon, qanday ishonch bilan. Investor uchun aynan shu uchlik demoni
 * haqiqatdan ajratadi.
 *
 * Qurol kadri VIDEO: statik rasm "montaj qilingan" degan shubha
 * uyg'otadi, harakatlanuvchi kadr esa uni yo'qotadi. Video faqat slayd
 * ekranda bo'lganda ijro etiladi — ovozsiz, halqa bilan.
 *
 * `cue` — ovoz bo'lagi indeksi (`copy.narration`).
 */

/** Kartalar — `copy.detectors.cases` tartibida */
const MEDIA = [
  { video: "/video/investor/qurol-1.mp4", poster: "/video/investor/qurol-1-poster.jpg", tone: "#FF5C5C" },
  { image: "/imges/investor/kadr-chekish.webp", tone: "#FFC46B" },
  /* ⚠️ RAMKALI kadr. 11-slayddagi `kadr-janjal-hovli.webp` — SHU SAHNANING
     xom yozuvi (ramkasiz) va bu yerga to'g'ri kelmaydi: slaydning butun
     da'vosi "tizim aniqladi" degani, uni esa faqat ramka isbotlaydi. */
  { image: "/imges/investor/kadr-janjal-ramka.webp", tone: "#FF8A8A" },
] as const;

export default function I7Detectors({ active, t, fresh, at }: SlideProps) {
  const c = useCopy().detectors;
  const show = (cue: number) => !fresh || t >= (at[cue] ?? 0);

  return (
    <Stage>
      <SlideTitle kicker={c.kicker} title={c.title} run={fresh} />

      <div className="mt-[clamp(14px,2.4vh,32px)] grid gap-3 lg:grid-cols-3">
        {c.cases.map((k, i) => {
          const media = MEDIA[i];
          const on = show(1);
          return (
            <motion.div
              key={k.name}
              initial={fresh ? { opacity: 0, y: 22 } : false}
              animate={on ? { opacity: 1, y: 0 } : { opacity: 0.14, y: 0 }}
              transition={{ duration: 0.6, delay: fresh && on ? i * 0.15 : 0, ease: EASE }}
            >
              <Glass className="flex h-full flex-col overflow-hidden p-0">
                {/* ── kadr ── */}
                <div className="relative aspect-video w-full overflow-hidden bg-black/40">
                  {"video" in media ? (
                    <Evidence src={media.video} poster={media.poster} play={active && on} />
                  ) : (
                    <img src={media.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                  )}

                  <Corners />

                  {/* yozib olish belgisi — bu arxiv kadri ekanini bildiradi */}
                  <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1.5 rounded bg-black/55 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-rose-300 backdrop-blur-sm">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" />
                    rec
                  </span>

                  {/* aniqlangan hodisa yorlig'i */}
                  <span
                    className="absolute bottom-2.5 left-2.5 rounded px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[#0b0f18]"
                    style={{ background: media.tone }}
                  >
                    {k.name}
                  </span>
                </div>

                {/* ── metama'lumot: aynan shu uchlik demoni haqiqatdan ajratadi ── */}
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-slate-500">
                      <Camera size={11} />
                      {k.cam}
                    </span>
                    <span
                      className="rounded-md border px-2 py-[3px] font-mono text-[11px] tabular-nums"
                      style={{ borderColor: `${media.tone}55`, color: media.tone }}
                    >
                      {k.conf}
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 font-mono text-[10.5px] tabular-nums text-slate-400">
                    <Clock size={11} />
                    {k.when}
                  </span>
                </div>
              </Glass>
            </motion.div>
          );
        })}
      </div>

      {/* ── qolgan detektorlar ── */}
      <motion.div
        initial={fresh ? { opacity: 0, y: 12 } : false}
        animate={show(2) ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, ease: EASE }}
        className={`mt-3 ${ORB_CLEAR}`}
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ice/70">{c.moreTitle}</span>
          {c.more.map((d) => (
            <span
              key={d}
              className="rounded-md border border-white/[0.1] px-2 py-1 font-mono text-[10px] tracking-[0.04em] text-slate-400"
            >
              {d}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[10.5px] leading-snug text-slate-500">{c.note}</p>
      </motion.div>
    </Stage>
  );
}

/**
 * Hodisa videosi — ovozsiz, halqa bilan.
 *
 * Slayd ekrandan ketganda ijro TO'XTATILADI: taqdimotda bir vaqtda
 * bir nechta og'ir kadr ochiq turmasin (`Deck` qo'shni slaydlarni ham
 * render qiladi).
 */
function Evidence({ src, poster, play }: { src: string; poster: string; play: boolean }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (play) void el.play().catch(() => {});
    else el.pause();
  }, [play]);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="metadata"
      className="h-full w-full object-cover"
    />
  );
}
