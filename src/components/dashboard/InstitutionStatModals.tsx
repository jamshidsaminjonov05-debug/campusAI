/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  MUASSASA KO'RSATKICHLARI — har biri O'Z oynasini ochadi              ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * Boshqaruv panelining o'ng ustunidagi "Muassasa ma'lumoti" kartochkasi
 * beshta ko'rsatkich beradi (o'quvchi/talaba · o'qituvchi · davomat ·
 * kamera · signal). 2026-09-05 dan (foydalanuvchi so'rovi) ularning
 * HAR BIRI bosiladi va javobni SHU YERDA, oyna bo'lib beradi:
 *
 * | Ko'rsatkich | Oyna |
 * |---|---|
 * | O'quvchilar / O'qituvchilar / Davomat | `AttendanceListModal` (`type`) |
 * | Kameralar | **`CamerasListModal`** — kanal ro'yxati, bosilsa OQIM |
 * | Signallar | **`AlertsListModal`** — xavfli hodisalar, bosilsa DOSSIYE |
 *
 * ⚠️ Ilgari kartochkadagi sonlar oddiy matn edi — "32/32 kamera" deb
 * turardi-yu, QAYSI kamera ekanini ko'rishning yo'li yo'q edi.
 *
 * ⚠️ **`z-[80]`** — `CameraStreamModal`/`EventDossier` dan PAST:
 * ikkalasi ham `createPortal` bilan `document.body` ga chiqadi va
 * o'z z-qatlamida turadi, ya'ni bu oyna ICHIDAGI o'ram ularni ko'tara
 * olmaydi (`AttendanceListModal` dagi bilan AYNI tuzoq).
 */
"use client";

import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { X } from "@phosphor-icons/react";
import { useT } from "@/i18n";
import { useModalHistory } from "@/hooks/useModalHistory";
import { useNvrChannels } from "@/hooks/useNvrChannels";
import { useDetectionFeed } from "@/hooks/useDetectionFeed";
import { cameraPlaceLabel } from "@/config/cameraPlacements";
import { CameraQuickView } from "@/components/cameras/CameraQuickView";
import { EventDossier } from "@/components/detections/EventDossier";
import { DETECTION_BY_ID } from "@/lib/detectionTypes";

/* ─────────────────────────── Umumiy qobiq ─────────────────────────── */

function Shell({
  title,
  subtitle,
  tone = "cyan",
  onClose,
  children,
}: {
  /** `ReactNode` — sonlar gradient bo'lishi uchun sarlavha JSX bilan quriladi. */
  title: ReactNode;
  subtitle?: string;
  /** Kamera — sian, signal — pushti (`.neon-modal--*` modifikatori). */
  tone?: "cyan" | "rose";
  onClose: () => void;
  children: ReactNode;
}) {
  const t = useT();
  /* ◀ "orqaga" avval shu oynani yopadi (`lib/modalHistory.ts`). */
  useModalHistory(onClose);
  if (typeof document === "undefined") return null;

  return createPortal(
    /* ⚠️ PORTAL SHART — Boshqaruv panelida `backdrop-blur` li o'ramlar
       bor, ular `position: fixed` uchun yangi containing block yaratadi. */
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className={`neon-modal neon-modal--${tone} flex max-h-[86vh] w-[min(640px,96vw)] flex-col overflow-hidden`}
      >
        <header className="flex flex-none items-start gap-3 border-b border-white/[0.08] px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-slate-500">
              {t.institutions.detailTitle}
            </p>
            <h3 className="truncate text-[17px] font-extrabold text-white">{title}</h3>
            {subtitle && <p className="mt-0.5 text-[10.5px] text-slate-500">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} title={t.common.close} className="neon-icon-btn">
            <X size={14} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">{children}</div>
      </motion.div>
    </div>,
    document.body
  );
}

/* ──────────────────────────── Kameralar ───────────────────────────── */

/**
 * kuzatuv posti kanallari — qaysi biri onlayn, qaysi biri emas.
 *
 * Qator bosilsa JONLI OQIM ochiladi (`CameraQuickView`) — bo'lim
 * almashmaydi.
 */
export function CamerasListModal({ onClose }: { onClose: () => void }) {
  const t = useT();
  const u = t.dashboard.ui.inst;
  const nvr = useNvrChannels();
  const [camChannel, setCamChannel] = useState<string | null>(null);

  return (
    <Shell
      title={
        <>
          <span className="neon-num">{nvr.online}</span>
          <span className="text-slate-500">/{nvr.total}</span> {u.camsOnline}
        </>
      }
      subtitle={u.camsHint}
      tone="cyan"
      onClose={onClose}
    >
      {nvr.isLoading ? (
        <div className="grid h-32 place-items-center">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-ice/40 border-t-ice" />
        </div>
      ) : nvr.channels.length === 0 ? (
        <p className="py-10 text-center text-[11.5px] text-slate-500">{u.noChannels}</p>
      ) : (
        <ul className="space-y-1">
          {nvr.channels.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => setCamChannel(String(c.id))} className="neon-row is-link w-full">
                <span
                  className={`h-2 w-2 flex-none rounded-full ${c.online ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-slate-600"}`}
                  title={c.online ? t.common.online : t.common.offline}
                />
                <span className="min-w-0 flex-1 truncate text-left text-[12px] text-slate-100">
                  {cameraPlaceLabel(c.id, c.name)}
                </span>
                <span className="neon-num flex-none font-mono text-[10.5px] font-bold">#{c.id}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Oqim — `createPortal` bilan chiqadi, o'ramda `stopPropagation`
          SHART (React hodisasi daraxt bo'yicha ko'tariladi). */}
      <div onClick={(e) => e.stopPropagation()}>
        <CameraQuickView channel={camChannel} onClose={() => setCamChannel(null)} />
      </div>
    </Shell>
  );
}

/* ───────────────────────────── Signallar ──────────────────────────── */

/**
 * Xavfli hodisalar — qator bosilsa DOSSIYE ochiladi.
 *
 * Manba `useDetectionFeed()`: "Aniqlangan hodisalar" paneli va
 * "Aniqlanganlar" bo'limi bilan AYNI oqim.
 */
export function AlertsListModal({ onClose }: { onClose: () => void }) {
  const u = useT().dashboard.ui.inst;
  const { events } = useDetectionFeed();
  const [openId, setOpenId] = useState<number | null>(null);
  const alarms = events.filter((e) => e.severity === "critical" || e.severity === "high");

  return (
    <Shell
      title={
        <>
          <span className="neon-num">{alarms.length}</span> {u.signalsN}
        </>
      }
      subtitle={u.alertsHint}
      tone="rose"
      onClose={onClose}
    >
      {alarms.length === 0 ? (
        /* Nol o'rniga SABAB — bo'sh oyna nosozlik deb o'qilmasin */
        <p className="py-10 text-center text-[11.5px] leading-snug text-slate-500">
          {u.noAlerts}
        </p>
      ) : (
        <ul className="space-y-1">
          {alarms.map((ev) => {
            const det = DETECTION_BY_ID.get(ev.type);
            const num = Number(ev.id);
            return (
              <li key={ev.id}>
                <button
                  type="button"
                  disabled={!Number.isFinite(num)}
                  onClick={() => setOpenId(num)}
                  className="neon-row is-link w-full"
                >
                  {det && <det.icon size={13} style={{ color: det.color }} className="flex-none" />}
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-[12px] font-semibold text-slate-100">{ev.title}</span>
                    <span className="block truncate text-[9.5px] text-slate-500">{ev.camera}</span>
                  </span>
                  <span className="neon-num flex-none font-mono text-[10.5px] font-bold">{ev.time}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div onClick={(e) => e.stopPropagation()}>
        <EventDossier eventId={openId} onClose={() => setOpenId(null)} />
      </div>
    </Shell>
  );
}
