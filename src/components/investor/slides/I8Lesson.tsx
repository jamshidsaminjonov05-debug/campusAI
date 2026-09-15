"use client";

import { motion } from "framer-motion";
import { Camera, ScanFace, UserCheck, Users } from "lucide-react";
import { useCopy } from "../copy";
import { EASE, Corners, Glass, ORB_CLEAR, SlideTitle, Stage } from "@/components/deck/ui";
import type { SlideProps } from "@/components/deck/types";

/**
 * 8 — DARS TAHLILI. REAL SINF KADRI.
 *
 * Bu slayd mahsulotni "xavfsizlik kamerasi" toifasidan chiqarib, ta'lim
 * platformasiga aylantiradi — investor uchun bozorni kengaytiradigan
 * argument.
 *
 * ⚠️ Chapdagi kadr slaydning butun kuchi: bitta kadrda HAM o'qituvchi
 * ishlayotgani (doskada, mavzu yozilgan), HAM sinf tinglayotgani, HAM
 * bitta o'quvchi telefonda ekani ko'rinadi — va tizim uni ramka bilan
 * aniqlagan. Bu 5-slayddagi "direktorda obyektiv ko'rsatkich yo'q"
 * muammosining to'g'ridan-to'g'ri javobi.
 *
 * ⚠️ Pastdagi izoh ATAYLAB turibdi: e'tibor ko'rsatkichi HISOBLANGAN
 * qiymat, sensor o'lchovi emas. O'zimiz aytmasak, investor keyin topadi.
 *
 * `cue` — ovoz bo'lagi indeksi (`copy.narration`).
 */
export default function I8Lesson({ t, fresh, at }: SlideProps) {
  const c = useCopy().lesson;
  const show = (cue: number) => !fresh || t >= (at[cue] ?? 0);

  const cols = [
    { title: c.teacherTitle, items: c.teacher, Icon: UserCheck, color: "#8FB8FF" },
    { title: c.studentTitle, items: c.student, Icon: Users, color: "#C08BFF" },
  ];

  return (
    <Stage>
      <SlideTitle kicker={c.kicker} title={c.title} run={fresh} />

      {/* ⚠️ Chap ustun ATAYLAB torroq: kadr 4:3 va keng ustunda balandligi
          sahnadan toshib, pastdagi "yuz bo'yicha tanish" bloki subtitr
          ostida qolib ketardi. */}
      <div className="mt-[clamp(12px,2.2vh,28px)] grid gap-3 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
        {/* ── chap: real sinf kadri ── */}
        <motion.div
          initial={fresh ? { opacity: 0, x: -20 } : false}
          animate={show(1) ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.65, ease: EASE }}
        >
          <Glass className="flex h-full flex-col overflow-hidden p-0">
            {/* ⚠️ 4:3, 16:9 emas: kadr vertikal olingan va keng nisbatda
                doskadagi o'qituvchi yoki past o'ngdagi telefon ramkasi
                kesilib qolardi. Slaydning ma'nosi aynan ikkalasi BIR
                kadrda ko'rinishida. */}
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-black/40">
              <img
                src="/imges/investor/kadr-telefon-sinf.webp"
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
              />
              <Corners />
              <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1.5 rounded bg-black/55 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-rose-300 backdrop-blur-sm">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" />
                rec
              </span>
              <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1.5 rounded bg-black/60 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.1em] text-slate-200 backdrop-blur-sm">
                <Camera size={11} />
                {c.frameNote}
              </span>
            </div>

            {/* yuz bo'yicha davomat — kadr ostida, bir qatorda */}
            <div className="flex items-start gap-3 p-4">
              <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-ice/12 text-ice">
                <ScanFace size={17} strokeWidth={1.75} />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-medium leading-tight text-white">{c.faceTitle}</span>
                <span className="mt-1 block text-[11.5px] leading-snug text-slate-400">{c.faceText}</span>
              </span>
            </div>
          </Glass>
        </motion.div>

        {/* ── o'ng: o'qituvchi va o'quvchi kesimi ── */}
        <div className="flex flex-col gap-3">
          {cols.map((col, ci) => {
            const on = show(1);
            return (
              <motion.div
                key={col.title}
                initial={fresh ? { opacity: 0, x: 18 } : false}
                animate={on ? { opacity: 1, x: 0 } : { opacity: 0.14, x: 0 }}
                transition={{ duration: 0.55, delay: fresh && on ? ci * 0.12 : 0, ease: EASE }}
                className="flex-1"
              >
                <Glass active={ci === 1} className="flex h-full flex-col p-4">
                  <p
                    className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em]"
                    style={{ color: col.color }}
                  >
                    <col.Icon size={13} />
                    {col.title}
                  </p>
                  <ul className="mt-3 flex flex-1 flex-col justify-center gap-2">
                    {col.items.map((x, i) => (
                      <motion.li
                        key={x}
                        initial={fresh ? { opacity: 0, x: 10 } : false}
                        animate={on ? { opacity: 1, x: 0 } : {}}
                        transition={{ duration: 0.45, delay: fresh ? 0.07 * i + ci * 0.1 : 0, ease: EASE }}
                        className="flex items-start gap-2.5 text-[11.5px] leading-[1.5] text-slate-300"
                      >
                        <span className="mt-[6px] h-1 w-1 flex-none rounded-full" style={{ background: col.color }} />
                        {x}
                      </motion.li>
                    ))}
                  </ul>
                </Glass>
              </motion.div>
            );
          })}
        </div>
      </div>

      <motion.p
        initial={fresh ? { opacity: 0 } : false}
        animate={show(2) ? { opacity: 1 } : {}}
        transition={{ duration: 0.8, delay: 0.3 }}
        className={`mt-2.5 text-[10.5px] leading-snug text-slate-500 ${ORB_CLEAR}`}
      >
        {c.note}
      </motion.p>
    </Stage>
  );
}
