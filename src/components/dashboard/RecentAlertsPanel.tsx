import { nvrEventLabel } from "@/lib/eventLabels";
import { useT } from "@/i18n";
import { useState } from "react";
import { ArrowRight } from "@phosphor-icons/react";
import { useDetections } from "@/hooks/useDetections";
import { useAppStore } from "@/store/useAppStore";
import { nvrTime, type NvrEvent } from "@/lib/nvrApi";
import { cameraPlaceLabel } from "@/config/cameraPlacements";
import { DetectionThumb } from "@/components/detections/DetectionThumb";
import { EventDossier } from "@/components/detections/EventDossier";
import { DashPanel } from "./DashPanel";

/** Panelga sig'adigan qatorlar — kompakt overlay, ro'yxat uzun bo'lmasin. */
const SHOWN = 4;

/**
 * **Signallar** — Boshqaruv panelining tafsilot qatlamidagi oxirgi
 * OGOHLANTIRISHLAR ro'yxati (2026-09-07, foydalanuvchi so'rovi: "o'ng
 * tomondagi signallar bo'limida oxirgi ogohlantirishlar chiqib turishi
 * kerak").
 *
 * ⚠️ **`RecentEntriesPanel` ("Oxirgi kirishlar") dan FARQI**: u yerda
 * yuz oqimi (`category:"face"`) — kim keldi, bu yerda esa FAQAT
 * trevoga (`alarmOnly:true`, barcha kategoriya) — nima xavfli bo'ldi.
 * Manba — `useDetections()`, "Ogohlantirishlar" bo'limi
 * (`AlertsPage.tsx`) bilan BIR XIL filtr mantig'i, faqat bu yerda
 * so'ralgan yozuvlar soni kichik (kompakt panel uchun).
 *
 * Qator bosilsa — hodisa dossiyesi (`EventDossier`, "Aniqlanganlar"
 * dagi bilan AYNI oyna). Pastda "Barchasi" — "Ogohlantirishlar"
 * bo'limiga o'tadi (to'liq navbat, tasdiqlash tugmasi bilan).
 */
export function RecentAlertsPanel() {
  const setActivePage = useAppStore((s) => s.setActivePage);
  const q = useDetections({ category: "all", alarmOnly: true, limit: 12 });
  const u = useT().dashboard.ui;
  const [openId, setOpenId] = useState<number | null>(null);

  const rows = q.events.slice(0, SHOWN);

  return (
    <DashPanel
      title={u.signals.title}
      subtitle={u.alerts.sub(q.total || q.events.length)}
      delay={0.18}
      className="flex-none"
      surface="map-glass-card"
    >
      <div className="flex flex-col gap-1">
        {q.isLoading && rows.length === 0 && (
          <div className="grid h-16 place-items-center">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-ice/40 border-t-ice" />
          </div>
        )}
        {!q.isLoading && rows.length === 0 && (
          /* Sabab OCHIQ yoziladi — bo'sh panel nosozlik deb o'qilmasin */
          <p className="py-4 text-center text-[10.5px] leading-snug text-slate-500">
            {u.alerts.none}
          </p>
        )}
        {rows.map((ev) => (
          <Row key={ev.id} ev={ev} onOpen={() => setOpenId(ev.id)} />
        ))}
      </div>

      {/* Barchasi — to'liq "Ogohlantirishlar" navbatiga o'tadi */}
      <button
        type="button"
        onClick={() => setActivePage("Ogohlantirishlar")}
        className="mt-2 flex flex-none items-center justify-center gap-1.5 rounded-lg border border-white/10
                   bg-white/[0.04] py-1.5 text-[11px] font-semibold text-slate-300 transition-colors
                   hover:border-ice/30 hover:text-ice-bright"
      >
        {u.signals.all}
        <ArrowRight size={12} weight="bold" />
      </button>

      {/* Hodisa dossiyesi — Boshqaruv panelidan CHIQMASDAN */}
      {openId != null && <EventDossier eventId={openId} onClose={() => setOpenId(null)} />}
    </DashPanel>
  );
}

function Row({ ev, onOpen }: { ev: NvrEvent; onOpen: () => void }) {
  const u = useT().dashboard.ui;
  return (
    <button
      type="button"
      onClick={onOpen}
      title={u.signals.details(nvrEventLabel(ev))}
      className="flex w-full items-center gap-2 rounded border border-rose-400/15 bg-rose-500/[0.05] px-2 py-1.5
                 text-left transition-colors hover:border-rose-400/40 hover:bg-rose-500/[0.1]"
    >
      <DetectionThumb id={ev.id} className="h-8 w-8 flex-none rounded" alt="" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[11.5px] font-medium text-slate-100">{nvrEventLabel(ev)}</span>
        <span className="block truncate text-[9.5px] text-slate-500">{cameraPlaceLabel(ev.channel, ev.camera)}</span>
      </span>
      <span className="flex-none font-mono text-[10px] text-rose-300/80">{nvrTime(ev.time)}</span>
    </button>
  );
}
