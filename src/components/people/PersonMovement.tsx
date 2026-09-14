import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { DoorOpen, SignIn, SignOut, MapPin } from "@phosphor-icons/react";
import { useT } from "@/i18n";
import { isoDate, useStudentDay } from "@/hooks/useStudentDay";
import type { PersonOut } from "@/lib/api";
import { parseCameraName, placeLabel } from "@/lib/cameraNaming";
import { buildMovement, type MovementPoint } from "@/lib/studentStats";

const KIND_STYLE: Record<MovementPoint["kind"], { color: string; Icon: typeof SignIn }> = {
  entry: { color: "#34D399", Icon: SignIn },
  exit: { color: "#F59E0B", Icon: SignOut },
  seen: { color: "#85E0FF", Icon: MapPin },
};

/**
 * Bir shaxsning kunlik harakati: **qachon kirgan → qayerlarda ko'ringan →
 * qachon chiqqan**.
 *
 * Manba HAQIQIY — `/attendance?person_id=…&date_from=…&date_to=…`. Joy nomi
 * kamera nomidan olinadi (`lib/cameraNaming.ts`: `1-etaj 1-LIFT` → "1-qavat ·
 * lift"), chunki davomat yozuvida koordinata yo'q, faqat `camera_id` bor.
 */
export function PersonMovement({ person, date: initialDate }: { person: PersonOut; date?: string }) {
  const t = useT();
  /* Sana ichkarida boshqariladi (panelning o'z tanlagichi bor), lekin
     chaqiruvchi boshlang'ich kunni berishi mumkin — Statistika bo'limi
     jadval bilan bir kunni ko'rsatishi uchun shuni uzatadi. */
  const [date, setDate] = useState(() => initialDate ?? isoDate());

  /* Kun kesimi YAGONA hookdan — statistika bilan bir xil so'rov kalitini
     ishlatadi, ya'ni qo'shimcha tarmoq so'rovi paydo bo'lmaydi. */
  const src = useStudentDay(person.person_type, date);
  const records = useMemo(
    () => src.records.filter((r) => r.person_id === person.id),
    [src.records, person.id]
  );
  const day = useMemo(() => buildMovement(records, src.cameraName), [records, src.cameraName]);
  const isLoading = src.isLoading;

  const dur = (min: number) => t.people.movement.duration(Math.floor(min / 60), min % 60);

  return (
    <section className="hik-glass-blue flex min-h-0 flex-col rounded-2xl px-3.5 py-3">
      <header className="mb-2 flex flex-none items-center gap-2">
        <p className="text-[10px] uppercase tracking-wider text-ice-cyan/70">{t.people.movement.title}</p>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          title={t.people.movement.dateLabel}
          className="ml-auto rounded-lg border border-blue-500/20 bg-slate-900/60 px-2 py-1 text-[11px] text-slate-300 outline-none [color-scheme:dark]"
        />
      </header>

      {/* Yakuniy xulosa — bir qatorda "kirdi · nechta kamera · qancha vaqt" */}
      {day.points.length > 0 && (
        <p className="mb-2 flex flex-none flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-300">
          <DoorOpen size={12} className="text-emerald-400" />
          {t.people.movement.summary(day.entryAt ?? "—", day.cameras, dur(day.insideMin ?? 0))}
          {day.stillInside ? (
            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[9.5px] font-bold text-emerald-300">
              {t.people.movement.stillInside}
            </span>
          ) : (
            <span className="font-mono text-[11px] text-amber-300/90">
              {t.people.movement.exit}: {day.exitAt}
            </span>
          )}
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
        {isLoading && <p className="py-6 text-center text-[11.5px] text-slate-500">{t.common.loading}</p>}

        {!isLoading && day.points.length === 0 && (
          <div className="py-6 text-center">
            <p className="text-[11.5px] text-slate-400">{t.people.movement.empty}</p>
            <p className="mt-1 text-[10.5px] text-slate-500">{t.people.movement.emptyHint}</p>
          </div>
        )}

        <ol className="relative space-y-2">
          {day.points.map((p, i) => {
            const st = KIND_STYLE[p.kind];
            const place = p.camera ? parseCameraName(p.camera) : null;
            return (
              <motion.li
                key={p.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.22, delay: Math.min(i * 0.03, 0.3) }}
                className="relative flex gap-2.5 pl-1"
              >
                {/* Nuqtalarni bog'lovchi chiziq — oxirgisida chizilmaydi */}
                {i < day.points.length - 1 && (
                  <span className="absolute left-[13px] top-6 h-[calc(100%-6px)] w-px bg-white/10" />
                )}
                <span
                  className="z-10 grid h-6 w-6 flex-none place-items-center rounded-full"
                  style={{ background: `${st.color}22`, color: st.color }}
                >
                  <st.Icon size={12} />
                </span>
                <div className="min-w-0 flex-1 pb-0.5">
                  <div className="flex items-baseline gap-2">
                    <b className="font-mono text-[12px] text-white">{p.time}</b>
                    <span className="text-[11px] font-semibold" style={{ color: st.color }}>
                      {p.kind === "entry"
                        ? t.people.movement.entry
                        : p.kind === "exit"
                          ? t.people.movement.exit
                          : t.people.movement.seen}
                    </span>
                    {p.gapMin != null && p.gapMin > 0 && (
                      <span className="ml-auto font-mono text-[9.5px] text-slate-500">
                        {t.people.movement.gap(p.gapMin)}
                      </span>
                    )}
                  </div>
                  <p className="truncate text-[10.5px] text-slate-400">
                    {p.camera ?? t.people.movement.unknownCamera}
                    {place && (
                      <span className="text-slate-500">
                        {" · "}
                        {place.floor ? `${place.floor}-qavat · ` : ""}
                        {placeLabel(place.kind)}
                        {place.block ? ` · ${place.block}` : ""}
                      </span>
                    )}
                  </p>
                  {p.emotion && <p className="text-[10px] text-slate-500">{p.emotion}</p>}
                </div>
              </motion.li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
