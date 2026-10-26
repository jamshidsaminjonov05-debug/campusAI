import { useT } from "@/i18n";
import { useState } from "react";
import { ArrowRight } from "@phosphor-icons/react";
import { useDetections } from "@/hooks/useDetections";
import { useAppStore } from "@/store/useAppStore";
import { detectSubject, nvrTime, type NvrEvent } from "@/lib/nvr/nvrApi";
import { cameraPlaceLabel } from "@/config/cameraPlacements";
import { FaceHistoryModal } from "@/components/people/FaceHistoryModal";
import { DetectionThumb } from "@/components/detections/DetectionThumb";
import { DashPanel } from "./DashPanel";
import { ListSkeleton } from "@/components/common/panels";
import { EmptyState } from "@/components/common/EmptyState";

/** Panelga sig'adigan qatorlar — Dashboard ustuni tor, ro'yxat uzun bo'lmasin. */
const SHOWN = 4;

/**
 * **Oxirgi kirishlar** — kamerada eng oxirgi ko'ringan odamlar.
 *
 * 🔴 **MANBA ALMASHTIRILDI — kuzatuv posti YUZ OQIMI** (2026-09-05, foydalanuvchi
 * so'rovi). Ilgari panel `useDashboardData().recent` dan o'qirdi, u esa
 * backend `/attendance/recent` ga qarardi — o'sha jadval amalda BO'SH
 * (o'lchandi 2026-09-02: butun tarixda 2 qator, ikkalasi 2026-07-15).
 * Ya'ni panel deyarli doim "Kirish yozuvi yo'q" deb turardi, holbuki
 * kameralar kuniga mingdan ortiq yuz qayd qiladi.
 *
 * Endi manba — `useDetections({ category: "face" })`, ya'ni
 * "Aniqlanganlar" bo'limi bilan AYNI oqim (yig'ilgan: bir o'tish =
 * bitta qator). Tanilgan odamda ISM, tanilmaganda "Notanish shaxs"
 * chiqadi — hech narsa o'ylab topilmaydi.
 *
 * · Qator bosilsa — **shaxs oynasi SHU YERDA** (`FaceHistoryModal`,
 *   `face_id` bo'yicha): qachon, qaysi kameralarda ko'ringani.
 * · Pastda **"Ko'proq ko'rish"** — Aniqlanganlar bo'limiga o'tadi.
 */
export function RecentEntriesPanel() {
  const setActivePage = useAppStore((s) => s.setActivePage);
  /* Yig'ilgan yuz o'tishlari, eng yangisi birinchi (`useDetections`
     o'zi vaqt bo'yicha saralaydi). `limit` kichik — panelga 4 tasi
     kerak, lekin rasmi yo'q yozuvlar chiqib qolishi mumkin. */
  const q = useDetections({ category: "face", limit: 12 });
  const u = useT().dashboard.ui;
  /** Ochilgan shaxs (`face_id`) — bo'lim ALMASHMAYDI. */
  const [openFaceId, setOpenFaceId] = useState<number | null>(null);

  const rows = q.events.slice(0, SHOWN);

  return (
    <DashPanel
      title={u.entries.title}
      subtitle={u.entries.sub(q.total || q.events.length)}
      delay={0.15}
      className="min-h-[200px] flex-1"
      surface="map-glass-card"
    >
      <div className="flex h-full flex-col">
        <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {q.isLoading && rows.length === 0 && (
            <li>
              <ListSkeleton rows={4} />
            </li>
          )}
          {!q.isLoading && rows.length === 0 && (
            /* Sabab OCHIQ yoziladi — bo'sh panel nosozlik deb o'qilmasin */
            <li className="py-6 text-center text-[10.5px] leading-snug text-slate-500"><EmptyState compact title={u.entries.empty} /></li>
          )}
          {rows.map((ev) => (
            <li key={ev.id}>
              <Row ev={ev} onOpen={() => ev.face_id != null && setOpenFaceId(ev.face_id)} />
            </li>
          ))}
        </ul>

        {/* Ko'proq ko'rish — butun ro'yxat "Aniqlanganlar" da */}
        <button
          type="button"
          onClick={() => setActivePage("Aniqlanganlar")}
          className="mt-2 flex flex-none items-center justify-center gap-1.5 rounded-lg border border-white/10
                     bg-white/[0.04] py-1.5 text-[11px] font-semibold text-slate-300 transition-colors
                     hover:border-ice/30 hover:text-ice-bright"
        >
          {u.entries.more}
          <ArrowRight size={12} weight="bold" />
        </button>
      </div>

      {/* Shaxs tarixi — Boshqaruv panelidan CHIQMASDAN */}
      {openFaceId != null && (
        <FaceHistoryModal faceId={openFaceId} onClose={() => setOpenFaceId(null)} />
      )}
    </DashPanel>
  );
}

function Row({ ev, onOpen }: { ev: NvrEvent; onOpen: () => void }) {
  const u = useT().dashboard.ui;
  const known = ev.recognized === true;
  /* ⚠️ `face_id` bo'lmasa shaxs oynasini ochib bo'lmaydi (qaysi odam
     ekani noma'lum) — qator bosilmaydigan bo'ladi. */
  const clickable = ev.face_id != null;

  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!clickable}
      title={clickable ? u.entries.history(detectSubject(ev) ?? "") : u.entries.noFaceId}
      className="flex w-full items-center gap-2 rounded border border-ice-cyan/10 bg-ice-cyan/[0.04] px-2 py-1.5
                 text-left transition-colors hover:border-ice-cyan/35 hover:bg-ice-cyan/[0.1]
                 disabled:cursor-default disabled:hover:border-ice-cyan/10 disabled:hover:bg-ice-cyan/[0.04]"
    >
      {/* Kadr — kim kirgani KO'RINSIN (rasm yo'q bo'lsa chizilmaydi) */}
      <DetectionThumb id={ev.id} className="h-8 w-8 flex-none rounded" alt="" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[11.5px] font-medium text-slate-100">
          {detectSubject(ev) ?? "—"}
        </span>
        <span className="block truncate text-[9.5px] text-slate-500">
          {cameraPlaceLabel(ev.channel, ev.camera)}
        </span>
      </span>
      <span className="flex-none text-right">
        <span className="block font-mono text-[10px] text-ice-cyan/70">{nvrTime(ev.time)}</span>
        {/* Tanilgan/notanish — rang bilan, matnsiz (joy tor) */}
        <span
          className={`mt-0.5 block h-1.5 w-1.5 rounded-full ${known ? "bg-emerald-400" : "bg-amber-400"} ml-auto`}
        />
      </span>
    </button>
  );
}
