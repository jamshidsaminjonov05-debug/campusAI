/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  "ANIQLANGANLAR" YUQORI KPI — QOLGAN IKKITASI ("Xavf signali",        ║
 * ║  "Faol kameralar") uchun oyna                                        ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * 2026-09-08, foydalanuvchi so'rovi: "aniqlanganlardagi yuqori tablardagi
 * hamma cardlar bosilishi kerak". Birinchi ikki kartochka ("Tanlangan
 * davrda", "Tanilgan yuzlar") ALLAQACHON bor `TodayArrivalsModal`ni
 * ochadi (`DetectionsPage.tsx`ga qarang). Qolgan ikkitasi uchun bu fayl:
 *
 * | Kartochka | Oyna | Manba |
 * |---|---|---|
 * | Xavf signali | `AlertKpiModal` | O'ZI so'raydi: `janjal` + `gun` ro'yxati, SAHIFALAB ko'rsatiladi |
 * | Faol kameralar | `CameraKpiModal` | `GET /events/stats` `by_channel` — qo'shimcha so'rov YO'Q |
 *
 * 🔴 **2026-09-15 dan manba o'zgardi.** Ilgari ikkalasi ham `useArrivals()`
 * ning XOM ro'yxatidan oziqlanardi: sahifa tanlangan davrni 100 tadan
 * 30+3 so'rov qilib o'qirdi va baribir 3 000 yozuvda to'xtab, eski
 * janjal/qurolni ko'rmay qolardi. Endi sonlar server hisobidan
 * (`useEventStats`), ro'yxat esa FAQAT oyna ochilganda va faqat kerakli
 * ikki kategoriyadan olinadi.
 */
"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { CaretLeft, CaretRight, Play, SecurityCamera, X } from "@phosphor-icons/react";
import { useModalHistory } from "@/hooks/useModalHistory";
import { CameraQuickView } from "@/components/cameras/CameraQuickView";
import { CamThumb } from "@/components/cameras/CamThumb";
import { ViewToggle, useViewMode } from "@/components/common/ViewToggle";
import { useNvrChannels } from "@/hooks/useNvrChannels";
import { useT } from "@/i18n";
import { cameraPlaceLabel } from "@/config/cameraPlacements";
import type { NvrEvent } from "@/lib/nvr/nvrApi";
import { EmptyState } from "@/components/common/EmptyState";

/* ─────────────────────────── Umumiy qobiq ─────────────────────────── */

function Shell({
  title,
  subtitle,
  onClose,
  children,
  footer,
  wide = false,
  toolbar,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  /** Pastki qator — sahifalagich uchun. */
  footer?: ReactNode;
  /** Katta oyna — kamera kartochkalari to'ri uchun. */
  wide?: boolean;
  /** Sarlavha ostidagi qator (ko'rinish tanlovi). */
  toolbar?: ReactNode;
}) {
  /* ◀ "orqaga" avval shu oynani yopadi (`lib/modalHistory.ts`). */
  useModalHistory(onClose);
  if (typeof document === "undefined") return null;

  return createPortal(
    /* ⚠️ PORTAL SHART — "Aniqlanganlar" filtr panelida `backdrop-blur` bor,
       u `position: fixed` uchun yangi containing block yaratadi. */
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className={`flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0B1220] shadow-2xl ${
          wide ? "h-[min(860px,92vh)] w-[min(1320px,96vw)]" : "max-h-[86vh] w-[min(640px,96vw)]"
        }`}
      >
        <header className="flex flex-none items-start gap-3 border-b border-white/[0.08] px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-slate-500">Aniqlanganlar</p>
            <h3 className="truncate text-[16px] font-bold text-white">{title}</h3>
            {subtitle && <p className="mt-0.5 text-[10.5px] text-slate-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Yopish"
            className="grid h-7 w-7 flex-none place-items-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={14} />
          </button>
        </header>
        {toolbar && <div className="flex flex-none items-center gap-2 border-b border-white/[0.06] px-4 py-2">{toolbar}</div>}
        <div className={`min-h-0 flex-1 overflow-y-auto ${wide ? "px-4 py-3" : "px-2 py-2"}`}>{children}</div>
        {footer && <footer className="flex-none border-t border-white/[0.08] px-3 py-2">{footer}</footer>}
      </motion.div>
    </div>,
    document.body
  );
}

/** Ixcham sahifalagich — "◀ 2 / 5 ▶". Bitta sahifa bo'lsa chizilmaydi. */
function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null;
  const btn =
    "grid h-7 w-7 place-items-center rounded-lg border border-white/10 text-slate-300 transition-colors hover:border-ice/30 hover:text-white disabled:opacity-30";
  return (
    <div className="flex items-center justify-center gap-2 font-mono text-[11px] text-slate-400">
      <button type="button" className={btn} disabled={page <= 1} onClick={() => onPage(page - 1)} title="Oldingi">
        <CaretLeft size={12} weight="bold" />
      </button>
      <span>
        {page} / {pages}
      </span>
      <button type="button" className={btn} disabled={page >= pages} onClick={() => onPage(page + 1)} title="Keyingi">
        <CaretRight size={12} weight="bold" />
      </button>
    </div>
  );
}

/* ─────────────────────────── Xavf signali ────────────────────────────
   "Xavf signali" ta'rifi (janjal + qurol) — `DetectionsPage` sonni shundan
   hisoblaydi. Oynasi (`AlertKpiModal`) 2026-10-26 da OLIB TASHLANDI: KPI
   qatorida faqat "Faol kameralar" bosiladi. */

const DANGER_CATEGORIES = new Set(["gun", "janjal"]);

/** "Xavf signali" ta'rifi — boshqa joylar ham shu funksiyadan foydalansin. */
export function isDangerEvent(ev: NvrEvent): boolean {
  return DANGER_CATEGORIES.has(ev.category);
}

/* ─────────────────────────── Faol kameralar ───────────────────────────
   Manba — `GET /events/stats` `by_channel` (server hisobi): "shu davrda
   qaysi kameradan nechta qayd kelgan". Qator bosilsa kamerani JONLI
   ko'rish (`CameraQuickView`) ochiladi. */

/** Sahifadagi kamera soni — kartochkada 4×3, ro'yxatda 20 qator. */
const CAM_PAGE_CARD = 12;
const CAM_PAGE_LIST = 20;

/**
 * "Faol kameralar" — shu davrda hodisa kelgan kanallar.
 *
 * 🔵 2026-10-26 — KATTA OYNA + KAMERA KARTOCHKALARI (foydalanuvchi: "faqat faol
 * kameralar bosilsa bo'ladi va kameralar card holatda chiqishi kerak").
 * Boshqaruv panelidagi `CamerasListModal` bilan AYNI naqsh: Kameralar
 * sahifasidagi `.cam-card` + `CamThumb` stop-kadr, har kartochkada shu davrdagi
 * QAYD SONI; Ro'yxat/Kartochka tanlovi (standart — kartochka), sahifalash.
 * Ko'p qayd bergan kamera oldinda. Kartochka bosilsa — JONLI OQIM.
 */
export function CameraKpiModal({
  byChannel,
  onClose,
}: {
  byChannel: { channel: string; camera: string; total: number }[];
  onClose: () => void;
}) {
  const t = useT();
  const nvr = useNvrChannels();
  const [camChannel, setCamChannel] = useState<string | null>(null);
  const [view, setView] = useViewMode("detections-active-cameras");
  const [page, setPage] = useState(1);
  const per = view === "card" ? CAM_PAGE_CARD : CAM_PAGE_LIST;

  const online = useMemo(() => new Map(nvr.channels.map((c) => [String(c.id), c.online])), [nvr.channels]);
  const sorted = useMemo(() => [...byChannel].sort((a, b) => b.total - a.total), [byChannel]);
  const pages = Math.max(1, Math.ceil(sorted.length / per));
  const safePage = Math.min(page, pages);
  const rows = sorted.slice((safePage - 1) * per, safePage * per);
  useEffect(() => setPage(1), [view]);

  return (
    <Shell
      wide
      title={`${byChannel.length} ta faol kamera`}
      subtitle="Tanlangan davrda hodisa kelgan kameralar. Kartochkani bosing — jonli oqim ochiladi"
      onClose={onClose}
      toolbar={<ViewToggle mode={view} onChange={setView} className="ml-auto" />}
      footer={pages > 1 ? <Pager page={safePage} pages={pages} onPage={setPage} /> : undefined}
    >
      {byChannel.length === 0 ? (
        <EmptyState fill title="Bu davrda hech qaysi kameradan hodisa kelmadi." />
      ) : view === "card" ? (
        <div className="cam-grid" style={{ ["--cam-cols" as string]: 4 }}>
          {rows.map((c) => {
            const on = online.get(c.channel) ?? true;
            return (
              <button
                key={c.channel}
                type="button"
                onClick={() => setCamChannel(c.channel)}
                title={on ? t.cameras.openStream : t.cameras.liveOfflineHint}
                className={`cam-card${on ? "" : " is-off"}`}
              >
                {on && <CamThumb channel={Number(c.channel)} />}
                <span className="cam-vf-c cam-vf-c1" />
                <span className="cam-vf-c cam-vf-c2" />
                <span className="cam-vf-c cam-vf-c3" />
                <span className="cam-vf-c cam-vf-c4" />
                <span className="cam-card-top">
                  <span className="cam-tag">
                    <i className={`cam-dot${on ? " is-on" : ""}`} />
                    <span className="cam-name">{cameraPlaceLabel(c.channel, c.camera)}</span>
                  </span>
                  <span className="cam-ch ml-auto flex-none">#{c.channel}</span>
                </span>
                <span className="cam-play">
                  <Play size={16} weight="fill" />
                </span>
                <span className="cam-card-bottom">
                  <span className="cam-tag min-w-0">
                    <SecurityCamera size={12} weight="duotone" className="flex-none text-slate-400" />
                    <span className="cam-meta">{c.total.toLocaleString(t.locale)} ta qayd</span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <ul className="space-y-1">
          {rows.map((c) => (
            <li key={c.channel}>
              <button
                type="button"
                onClick={() => setCamChannel(c.channel)}
                className="flex w-full items-center gap-2.5 rounded-lg border border-white/[0.05] bg-white/[0.02]
                           px-2.5 py-1.5 text-left transition-colors hover:border-ice/30 hover:bg-ice/[0.06]"
              >
                <SecurityCamera size={14} weight="fill" className="flex-none text-amber-300" />
                <span className="min-w-0 flex-1 truncate text-[12px] text-slate-100">
                  {cameraPlaceLabel(c.channel, c.camera)}
                </span>
                <span className="flex-none font-mono text-[10.5px] text-slate-500">#{c.channel}</span>
                <span
                  title={`${c.total} qayd`}
                  className="flex-none rounded-md bg-emerald-400/15 px-1.5 py-0.5 font-mono text-[10.5px] font-bold text-emerald-300"
                >
                  {c.total}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div onClick={(e) => e.stopPropagation()}>
        <CameraQuickView channel={camChannel} onClose={() => setCamChannel(null)} />
      </div>
    </Shell>
  );
}
