"use client";

import { nvrEventLabel } from "@/lib/eventLabels";
import { useT } from "@/i18n";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowsOutSimple, X } from "@phosphor-icons/react";
import { getEvent, isAlarm, nvrDateTime } from "@/lib/nvrApi";
import { detectionLevel, LEVEL_TONE } from "@/lib/detectionLevel";
import { resolveCampus } from "@/lib/cameraBinding";
import { cameraPlaceLabel } from "@/config/cameraPlacements";
import { DetectionThumb } from "@/components/detections/DetectionThumb";
import { EventDossier } from "@/components/detections/EventDossier";
import { DashPanel } from "./DashPanel";

/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  HODISA TAHLILI — o'ng panel                                          ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * 2026-09-09, foydalanuvchi so'rovi: "hodisalar ustiga bosilsa o'ngda
 * chiqib beradi hodisa tahlili". `AlertsOverviewPanel` (CHAP) dagi qator
 * bosilganda shu panel O'NGDA (`MapDetailOverlay` slotida) ochiladi.
 *
 * ⚠️ **Qisqa tahlil, TO'LIQ dossiye EMAS** — 330px tor ustunda video
 * pleer/ramka/tasdiqlash kabi butun `DetectionModal`ni qayta qurish
 * amaliy emas (u markazda katta oyna bo'lish uchun mo'ljallangan). Shu
 * sabab bu yerda: rasm, tur/jiddiylik, kamera, vaqt, ishonch — asosiy
 * javob DARHOL ko'rinadi; video/ramka/tasdiqlash kerak bo'lsa "To'liq
 * dossye" tugmasi MAVJUD `EventDossier`ni ochadi (boshqa joylardagi bilan
 * AYNI oyna, qayta yozilmagan).
 */
export function EventAnalysisPanel({ eventId, onClose }: { eventId: number; onClose: () => void }) {
  const t = useT();
  const u = t.dashboard.ui.event;
  const q = useQuery({
    queryKey: ["nvr-event", eventId],
    queryFn: () => getEvent(eventId),
    staleTime: 60_000,
  });
  const [fullOpen, setFullOpen] = useState(false);

  const ev = q.data ?? null;
  const level = ev ? detectionLevel(ev) : "info";
  const tone = LEVEL_TONE[level];
  const campus = ev ? resolveCampus(ev.camera, ev.channel) : null;

  return (
    <DashPanel title={u.title} subtitle={u.sub} className="min-h-0 flex-1" surface="map-glass-card">
      <div className="flex h-full min-h-0 flex-col gap-2.5 overflow-y-auto">
        <header className="flex flex-none items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            title={t.common.close}
            className="grid h-6 w-6 flex-none place-items-center rounded text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={14} />
          </button>
        </header>

        {q.isLoading && !ev ? (
          <div className="grid h-40 flex-none place-items-center">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-ice/40 border-t-ice" />
          </div>
        ) : !ev ? (
          <p className="py-10 text-center text-[11.5px] text-slate-500">{u.failed}</p>
        ) : (
          <>
            <div className="flex-none overflow-hidden rounded-xl border border-white/10">
              <DetectionThumb
                id={ev.id}
                index={ev.image_count > 1 ? 1 : 0}
                boxes={ev.image_count <= 1 ? ev.boxes : null}
                pictureLost={ev.picture_lost}
                eager
                className="aspect-[4/3] w-full bg-black/40"
                alt={nvrEventLabel(ev)}
              />
            </div>

            <div className="flex-none">
              <p className="text-[13.5px] font-bold" style={{ color: tone }}>
                {nvrEventLabel(ev)}
              </p>
              <p className="mt-0.5 truncate text-[10.5px] text-slate-500">
                {cameraPlaceLabel(ev.channel, ev.camera)}
                {campus && ` · ${campus.name}`}
              </p>
            </div>

            <div className="grid flex-none grid-cols-2 gap-1.5">
              <Cell label={u.time} value={nvrDateTime(ev.time)} />
              <Cell label={u.state} value={isAlarm(ev) ? u.alarm : u.normal} tone={isAlarm(ev) ? "#F43F5E" : undefined} />
              {ev.confidence != null && <Cell label={u.confidence} value={`${ev.confidence}%`} />}
              {ev.category === "face" && (
                <Cell label={u.person} value={ev.recognized ? ev.name || u.recognized : u.stranger} />
              )}
              {ev.targets && <Cell label={u.target} value={ev.targets} />}
            </div>

            <button
              type="button"
              onClick={() => setFullOpen(true)}
              className="mt-1 flex flex-none items-center justify-center gap-1.5 rounded-lg border border-white/10
                         bg-white/[0.04] py-1.5 text-[11px] font-semibold text-slate-300 transition-colors
                         hover:border-ice/30 hover:text-ice-bright"
            >
              <ArrowsOutSimple size={12} weight="bold" />
              {u.full}
            </button>
          </>
        )}
      </div>

      {fullOpen && ev && <EventDossier eventId={ev.id} onClose={() => setFullOpen(false)} />}
    </DashPanel>
  );
}

function Cell({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-2 py-1.5">
      <p className="truncate text-[8.5px] uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="truncate font-mono text-[12px] font-bold" style={{ color: tone ?? "#fff" }}>
        {value}
      </p>
    </div>
  );
}
