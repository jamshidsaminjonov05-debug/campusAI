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
 * | Hodisalar | `statistics/ViolationListModal` (`kind="all"`) — bugungi janjal/qurol/chekish/telefon, rasmli kartochkalar (2026-10-26; eski `AlertsListModal` o'chirildi) |
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

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { MagnifyingGlass, Play, SecurityCamera, X } from "@phosphor-icons/react";
import { useT } from "@/i18n";
import { useModalHistory } from "@/hooks/useModalHistory";
import { useNvrChannels } from "@/hooks/useNvrChannels";
import { cameraPlaceLabel } from "@/config/cameraPlacements";
import { CameraQuickView } from "@/components/cameras/CameraQuickView";
import { CamThumb } from "@/components/cameras/CamThumb";
import { Pagination } from "@/components/common/Pagination";
import { ViewToggle, useViewMode } from "@/components/common/ViewToggle";
import { CardGridSkeleton } from "@/components/common/panels";
import { EmptyState } from "@/components/common/EmptyState";

/* ─────────────────────────── Umumiy qobiq ─────────────────────────── */

function Shell({
  title,
  subtitle,
  tone = "cyan",
  onClose,
  children,
  wide = false,
  toolbar,
  footer,
}: {
  /** `ReactNode` — sonlar gradient bo'lishi uchun sarlavha JSX bilan quriladi. */
  title: ReactNode;
  subtitle?: string;
  /** Kamera — sian, signal — pushti (`.neon-modal--*` modifikatori). */
  tone?: "cyan" | "rose";
  onClose: () => void;
  children: ReactNode;
  /** Katta oyna — kartochkalar to'ri uchun (kameralar). */
  wide?: boolean;
  /** Sarlavha ostidagi qator (qidiruv, ko'rinish tanlovi). */
  toolbar?: ReactNode;
  /** Pastki qator — sahifalagich. */
  footer?: ReactNode;
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
        className={`neon-modal neon-modal--${tone} flex flex-col overflow-hidden ${
          wide ? "h-[min(860px,92vh)] w-[min(1320px,96vw)]" : "max-h-[86vh] w-[min(640px,96vw)]"
        }`}
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
        {toolbar && <div className="flex flex-none items-center gap-2 border-b border-white/[0.06] px-4 py-2">{toolbar}</div>}
        <div className={`min-h-0 flex-1 overflow-y-auto ${wide ? "px-4 py-3" : "px-2 py-2"}`}>{children}</div>
        {footer && <footer className="flex-none border-t border-white/[0.08] px-4 py-2">{footer}</footer>}
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
  /* 🔵 2026-10-26 — Kameralar sahifasidagi kabi KARTOCHKALAR (stop-kadr bilan),
     katta oyna, Ro'yxat/Kartochka tanlovi (standart — kartochka) va sahifalash.
     Foydalanuvchi: "kamera cardlariga o'xshatib chiqar, modalni kattalashtir,
     default card, pagination". Ilgari tor ustunda matnli ro'yxat edi. */
  const [view, setView] = useViewMode("dashboard-cameras");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const per = view === "card" ? CAM_PAGE_CARD : CAM_PAGE_LIST;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? nvr.channels.filter((c) => `${cameraPlaceLabel(c.id, c.name)} ${c.name} #${c.id}`.toLowerCase().includes(q))
      : nvr.channels;
    /* Onlayn kameralar oldinda, keyin kanal raqami bo'yicha */
    return [...list].sort((a, b) => Number(b.online) - Number(a.online) || Number(a.id) - Number(b.id));
  }, [nvr.channels, query]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / per));
  const safePage = Math.min(page, totalPages);
  const rows = filtered.slice((safePage - 1) * per, safePage * per);
  /* Qidiruv yoki ko'rinish almashsa — 1-sahifa */
  useEffect(() => setPage(1), [query, view]);

  return (
    <Shell
      wide
      title={
        <>
          <span className="neon-num">{nvr.online}</span>
          <span className="text-slate-500">/{nvr.total}</span> {u.camsOnline}
        </>
      }
      subtitle={u.camsHint}
      tone="cyan"
      onClose={onClose}
      toolbar={
        <>
          <div className="hik-input flex w-full max-w-[320px] items-center gap-2 px-2.5 py-1.5">
            <MagnifyingGlass size={13} className="flex-none text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.nvr.v2Cams.search}
              className="w-full bg-transparent text-[11.5px] text-slate-100 outline-none placeholder:text-slate-600"
            />
          </div>
          <span className="font-mono text-[10.5px] text-slate-500">{filtered.length}</span>
          <ViewToggle mode={view} onChange={setView} className="ml-auto" />
        </>
      }
      footer={
        totalPages > 1 ? (
          <Pagination
            page={safePage}
            totalPages={totalPages}
            onChange={setPage}
            prevLabel={t.detections.prev}
            nextLabel={t.detections.next}
          />
        ) : undefined
      }
    >
      {nvr.isLoading ? (
        <CardGridSkeleton count={8} />
      ) : filtered.length === 0 ? (
        <EmptyState fill title={u.noChannels} />
      ) : view === "card" ? (
        /* Kameralar sahifasidagi AYNI kartochka (`.cam-card`, `CamThumb`) */
        <div className="cam-grid" style={{ ["--cam-cols" as string]: 4 }}>
          {rows.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCamChannel(String(c.id))}
              title={c.online ? t.cameras.openStream : t.cameras.liveOfflineHint}
              className={`cam-card${c.online ? "" : " is-off"}`}
            >
              {c.online && <CamThumb channel={Number(c.id)} />}
              <span className="cam-vf-c cam-vf-c1" />
              <span className="cam-vf-c cam-vf-c2" />
              <span className="cam-vf-c cam-vf-c3" />
              <span className="cam-vf-c cam-vf-c4" />
              <span className="cam-card-top">
                <span className="cam-tag">
                  <i className={`cam-dot${c.online ? " is-on" : ""}`} />
                  <span className="cam-name">{cameraPlaceLabel(c.id, c.name)}</span>
                </span>
                <span className="cam-ch ml-auto flex-none">#{c.id}</span>
              </span>
              <span className="cam-play">
                <Play size={16} weight="fill" />
              </span>
              <span className="cam-card-bottom">
                <span className="cam-tag min-w-0">
                  <SecurityCamera size={12} weight="duotone" className="flex-none text-slate-400" />
                  <span className="cam-meta">{c.online ? t.common.online : t.common.offline}</span>
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <ul className="space-y-1">
          {rows.map((c) => (
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

/** Sahifadagi kamera soni — kartochkada 4×3, ro'yxatda 20 qator. */
const CAM_PAGE_CARD = 12;
const CAM_PAGE_LIST = 20;

