"use client";

import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { EyeOff } from "lucide-react";
import { useCopy } from "../copy";
import { EASE, Glass, ORB_CLEAR, SlideTitle, Stage } from "@/components/deck/ui";
import type { SlideProps } from "@/components/deck/types";

/**
 * 3 — XAVFSIZLIK MUAMMOSI. REAL, LEKIN RAMKASIZ KADRLAR.
 *
 * ⚠️ SLAYDNING BUTUN MA'NOSI SHU: bu yerdagi yozuvlar HAQIQIY maktab
 * kameralaridan olingan, lekin ularda hech qanday detektor ramkasi YO'Q.
 * Kamera hodisani yozdi — va hech kim ko'rmadi.
 *
 * 8-slaydda (Detektorlar) aynan shunday kadrlar RAMKA va ishonch darajasi
 * bilan qaytadi. Ikkala slaydning qarama-qarshiligi — taqdimotning asosiy
 * g'oyasi: "kameralar bor, idrok yo'q" → "endi idrok bor".
 *
 * Shuning uchun bu yerga ramka chizilmaydi va ishonch darajasi
 * ko'rsatilmaydi. Har kadrning ustida faqat bitta belgi: "hech kim
 * ko'rmadi".
 *
 * `cue` — ovoz bo'lagi indeksi (`copy.narration`).
 */

/**
 * Kartalar — `copy.threats.items` tartibida: jang, qurol, chekish, yong'in.
 *
 * Ikkitasi video (harakat ko'rinadi), ikkitasi statik kadr. Har biri
 * HAQIQIY yozuv, lekin hech birida detektor ramkasi yo'q — bu slaydning
 * butun ma'nosi.
 */
type Media = { video: string; poster: string } | { image: string };

const MEDIA: Media[] = [
  { video: "/video/investor/janjal.mp4", poster: "/video/investor/janjal-poster.jpg" },
  { image: "/imges/investor/kadr-qurol.webp" },
  { video: "/video/investor/chekish.mp4", poster: "/video/investor/chekish-poster.jpg" },
  { image: "/imges/investor/kadr-yongin.webp" },
];

const COLORS = ["#FF8A8A", "#FF5C5C", "#FFC46B", "#FF9F45"];

export default function I3Threats({ active, t, fresh, at }: SlideProps) {
  const c = useCopy().threats;
  const show = (cue: number) => !fresh || t >= (at[cue] ?? 0);
  const on = show(1);

  return (
    <Stage>
      <SlideTitle kicker={c.kicker} title={c.title} run={fresh} />

      <div className="mt-[clamp(14px,2.4vh,32px)] grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {c.items.map((it, i) => {
          const media = MEDIA[i];
          const color = COLORS[i];
          return (
            <motion.div
              key={it.name}
              initial={fresh ? { opacity: 0, y: 20 } : false}
              animate={on ? { opacity: 1, y: 0 } : { opacity: 0.14, y: 0 }}
              transition={{ duration: 0.55, delay: fresh && on ? i * 0.12 : 0, ease: EASE }}
            >
              <Glass className="relative flex h-full flex-col overflow-hidden p-0">
                <span className="absolute inset-x-0 top-0 z-10 h-[3px]" style={{ background: on ? color : "transparent" }} />

                {/* ── real kadr, ramkasiz ── */}
                <div className="relative aspect-video w-full overflow-hidden bg-black/45">
                  {"video" in media ? (
                    <RawClip src={media.video} poster={media.poster} play={active && on} />
                  ) : (
                    <img src={media.image} alt="" className="h-full w-full object-cover opacity-80" loading="lazy" />
                  )}
                  {/* "hech kim ko'rmadi" belgisi — detektor ramkasi O'RNIGA turadi */}
                  <span className="absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded bg-black/65 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-slate-400 backdrop-blur-sm">
                    <EyeOff size={10} />
                    {c.unwatched}
                  </span>
                </div>

                {/* ── matn ── */}
                <div className="flex flex-1 flex-col p-4">
                  <span className="block text-[14px] font-medium leading-tight text-white">{it.name}</span>
                  <span className="mt-2 block flex-1 text-[11.5px] leading-[1.5] text-slate-400">{it.text}</span>

                  <span className="mt-3.5 flex items-center gap-2 border-t border-white/[0.07] pt-3">
                    <span className="h-1 w-1 flex-none rounded-full" style={{ background: color }} />
                    <span className="font-mono text-[9.5px] uppercase tracking-[0.12em]" style={{ color }}>
                      {it.cost}
                    </span>
                  </span>
                </div>
              </Glass>
            </motion.div>
          );
        })}
      </div>

      <motion.p
        initial={fresh ? { opacity: 0, y: 10 } : false}
        animate={show(2) ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.75, ease: EASE }}
        className={`mt-[clamp(12px,2.2vh,26px)] flex items-start gap-2.5 text-[clamp(13px,1.2vw,18px)] font-light leading-snug text-white ${ORB_CLEAR}`}
      >
        <span className="mt-[9px] h-1.5 w-1.5 flex-none rounded-full bg-rose-400" />
        {c.verdict}
      </motion.p>
    </Stage>
  );
}

/**
 * Xom kamera yozuvi — ovozsiz, halqa bilan.
 *
 * Slayd ekrandan ketganda ijro to'xtatiladi: `Deck` qo'shni slaydlarni ham
 * render qiladi va bir vaqtda bir nechta og'ir kadr ochiq turmasin.
 */
function RawClip({ src, poster, play }: { src: string; poster: string; play: boolean }) {
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
      /* Biroz xiralashtirilgan: bu MUAMMO slaydi, kadr dalil emas — fon */
      className="h-full w-full object-cover opacity-80"
    />
  );
}
