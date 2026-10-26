"use client";

import { useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Clock, SecurityCamera, SquaresFour, X } from "@phosphor-icons/react";
import { DetectionCard, NVR_COLOR } from "@/components/detections/DetectionCard";
import { DetectionModal } from "@/components/detections/DetectionsPage";
import { DetectionThumb } from "@/components/detections/DetectionThumb";
import { CardColumnsSlider } from "@/components/common/CardColumnsSlider";
import { Pagination } from "@/components/common/Pagination";
import { StatPanel, CardGridSkeleton, Skeleton } from "@/components/common/panels";
import { useCardColumns } from "@/hooks/useCardColumns";
import { useModalHistory } from "@/hooks/useModalHistory";
import { useNvrEvents, type NvrTab } from "@/hooks/useNvrEvents";
import { useV2Cameras } from "@/hooks/useV2Cameras";
import { applyV2CameraRules } from "@/lib/nvr/v2CameraFilter";
import { cameraPlaceLabel } from "@/config/cameraPlacements";
import { isLocalModelEvent, nvrImageUrl, nvrTime, type NvrEvent } from "@/lib/nvr/nvrApi";
import { useT } from "@/i18n";
import { EmptyState } from "@/components/common/EmptyState";

/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  "AI TAHLIL" — TUR PANELLARI: "Hammasi" oynasi + 2-versiya panellari   ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * 2026-10-26, foydalanuvchi: "kartochkalarda faqat max 3 tasini ko'rish
 * mumkin — Hammasi tugmasini qo'sh, modal ochilsin, card holatda pagination,
 * slider bilan 3–8; o'zimizning 2-versiyamizni (ko'cha kameralarida janjal va
 * qurol) ham shu joyga qo'sh, tugmasini chetiga".
 *
 * Yangi narsa YOZILMADI — "Aniqlanganlar"dagi AYNI qismlar:
 *   · ma'lumot — `useNvrEvents` (sahifalash, 2-versiya serverlari, yashirin
 *     kamera/ruxsat ro'yxati qoidalari — hammasi o'sha joyda);
 *   · kartochka — `DetectionCard`, to'r — `.nvr-grid`, ustunlar — umumiy
 *     `useCardColumns` slayderi (3…8, `CardColumnsSlider`);
 *   · tafsilot — `DetectionModal` HODISA OBYEKTI bilan (2-versiya hodisasini
 *     `EventDossier` ocholmaydi: u `id` bo'yicha kuzatuv postidan so'raydi).
 */

/** Hodisa tafsiloti — boshqa oyna USTIDA (`EventDossier` bilan AYNI o'ram). */
export function EventOpener({ ev, onClose, onSelect }: { ev: NvrEvent | null; onClose: () => void; onSelect: (ev: NvrEvent) => void }) {
  if (!ev || typeof document === "undefined") return null;
  return createPortal(
    /* ⚠️ `stopPropagation` SHART — React hodisasi portal orqali ham daraxt
       bo'yicha ko'tarilib, ochuvchi oynaning `onClick={onClose}` fon
       qatlamiga yetib borardi. */
    <div className="fixed inset-0 z-[100]" onClick={(e) => e.stopPropagation()}>
      <AnimatePresence>
        <DetectionModal key={ev.id} ev={ev} onClose={onClose} onSelect={onSelect} />
      </AnimatePresence>
    </div>,
    document.body
  );
}

/** 2-versiya kamera tanlovi — "Aniqlanganlar" bilan AYNI qoida. */
function useV2Selection() {
  const raw = useV2Cameras();
  return useMemo(() => applyV2CameraRules(raw), [raw]);
}

/** Qatordagi kartochkalar soni × 3 qator — bitta sahifa. */
const ROWS = 3;

export function EventTypeCardsModal({
  title,
  color,
  tab,
  source = "nvr",
  from,
  to,
  onClose,
  eyebrow,
  summary,
  count,
}: {
  title: string;
  color: string;
  tab: NvrTab;
  /** Sarlavha ustidagi mayda yozuv (standart — "AI tahlil" / 2-versiya nomi). */
  eyebrow?: string;
  /** Kartochkalar USTIDAGI qisqa kesim (masalan Statistika → ustun bosilganda
   *  o'sha kunning tur/kamera kesimi, 2026-10-26). */
  summary?: ReactNode;
  /** Sarlavhadagi son nishoni o'rniga (masalan bitta SOAT qaydlari — ro'yxat esa butun kun). */
  count?: number;
  /** `"weapon2"`/`"janjal2"` — 2-versiya serverlari (ko'cha kameralari). */
  source?: "nvr" | "weapon2" | "janjal2";
  from?: string;
  to?: string;
  onClose: () => void;
}) {
  const t = useT();
  useModalHistory(onClose);
  const cols = useCardColumns();
  const v2 = useV2Selection();
  const feed = useNvrEvents(tab, cols * ROWS, {
    dateFrom: source === "nvr" ? from : undefined,
    dateTo: source === "nvr" ? to : undefined,
    source,
    v2Cameras: source === "nvr" ? undefined : v2,
  });
  const [open, setOpen] = useState<NvrEvent | null>(null);
  const busy = feed.loading || feed.switching;

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        style={{ ["--c" as string]: color }}
        className="flex h-[min(900px,94vh)] w-[min(1440px,97vw)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0B1220] shadow-2xl"
      >
        <header className="flex flex-none flex-wrap items-center gap-3 border-b border-white/[0.08] px-4 py-3">
          <span className="h-8 w-1 flex-none rounded-full bg-[color:var(--c)]" />
          <div className="min-w-0 flex-1">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-slate-500">
              {eyebrow ?? (source === "nvr" ? "AI tahlil" : t.nvr.v2Button)}
            </p>
            <h3 className="truncate text-[16px] font-bold text-white">
              {title}
              <span
                style={{ borderColor: "color-mix(in srgb, var(--c) 45%, transparent)", background: "color-mix(in srgb, var(--c) 15%, transparent)" }}
                className="ml-2 inline-flex items-center rounded-full border px-2.5 py-0.5 align-middle font-mono text-[12px] font-bold text-[color:var(--c)]">
                {count == null && busy ? "…" : `${(count ?? feed.total).toLocaleString(t.locale)} ta`}
              </span>
            </h3>
          </div>
          <CardColumnsSlider />
          <button
            type="button"
            onClick={onClose}
            title={t.common.close}
            className="grid h-7 w-7 flex-none place-items-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={14} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {summary && <div className="mb-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">{summary}</div>}
          {busy ? (
            <CardGridSkeleton count={cols * 3} cols={cols} />
          ) : feed.error ? (
            <p className="py-16 text-center text-[11.5px] text-rose-300">{feed.error}</p>
          ) : feed.events.length === 0 ? (
            <EmptyState fill title="Hech narsa topilmadi" hint="Tanlangan davrda bu turdagi hodisalar qayd etilmadi." />
          ) : (
            <div className="nvr-grid" style={{ ["--cols" as string]: cols }}>
              {feed.events.map((ev) => (
                <DetectionCard key={ev.id} ev={ev} onOpen={setOpen} />
              ))}
            </div>
          )}
        </div>

        {feed.totalPages > 1 && (
          <footer className="flex-none border-t border-white/[0.08] px-4 py-2">
            <Pagination
              page={feed.page}
              totalPages={feed.totalPages}
              onChange={feed.setPage}
              prevLabel={t.detections.prev}
              nextLabel={t.detections.next}
            />
          </footer>
        )}

        <EventOpener ev={open} onClose={() => setOpen(null)} onSelect={setOpen} />
      </motion.div>
    </div>,
    document.body
  );
}

/** Panel ichidagi oxirgi 3 kadr — kuzatuv posti (`DetectionThumb`) yoki 2-versiya (`<img>`). */
export function ShotGrid({ shots, onOpen }: { shots: NvrEvent[]; onOpen: (ev: NvrEvent) => void }) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {shots.map((ev) => (
        <button
          key={`${ev.id}-${ev.image_url ?? ""}`}
          type="button"
          onClick={() => onOpen(ev)}
          title={`${ev.label} · ${nvrTime(ev.time)} — ochish`}
          className="group relative overflow-hidden rounded-lg border border-white/[0.1] transition-colors hover:border-white/30"
        >
          {isLocalModelEvent(ev) ? (
            <img src={nvrImageUrl(ev, 0) ?? ""} alt="" loading="lazy" decoding="async" className="aspect-[4/3] w-full object-cover" />
          ) : (
            <DetectionThumb id={ev.id} className="aspect-[4/3] w-full" alt="" />
          )}
          <span className="absolute inset-x-0 bottom-0 bg-black/70 py-0.5 text-center font-mono text-[9px] text-slate-200">
            {nvrTime(ev.time)}
          </span>
        </button>
      ))}
    </div>
  );
}

/** "Hammasi" tugmasi — panel sarlavhasining o'ng burchagi uchun. */
export function AllButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Barcha kartochkalarni ochish"
      className="flex items-center gap-1 rounded-md border border-white/15 bg-black/25 px-2 py-0.5 text-[10.5px] font-semibold text-slate-200 transition-colors hover:border-white/35 hover:text-white"
    >
      <SquaresFour size={12} weight="duotone" />
      Hammasi
    </button>
  );
}

/** Panelning umumiy qobig'i — sarlavha, son, "Hammasi", oxirgi kadr ma'lumoti. */
export function TypePanel({
  title,
  hint,
  color,
  count,
  shots,
  onOpenShot,
  onAll,
  empty,
}: {
  title: string;
  hint?: string;
  color: string;
  count: number;
  shots: NvrEvent[];
  onOpenShot: (ev: NvrEvent) => void;
  onAll: () => void;
  empty?: ReactNode;
}) {
  const last = shots[0] ?? null;
  return (
    <StatPanel
      title={title}
      hint={hint ?? (count > 0 ? `${count.toLocaleString()} ta qayd` : "Bu davrda aniqlanmadi")}
      right={
        <span className="flex items-center gap-1.5">
          {/* "Hammasi" — FAQAT panelga sig'maganlari bo'lsa (ko'rinib turgan
              kadrlardan ko'p qayd). 1–3 ta bo'lsa hammasi allaqachon ko'rinadi
              (2026-10-26, foydalanuvchi: "sig'masa keyin Hammasi tugmasi"). */}
          {count > shots.length && <AllButton onClick={onAll} />}
          <span className="rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold" style={{ background: `${color}22`, color }}>
            {count.toLocaleString()}
          </span>
        </span>
      }
    >
      {count === 0 ? (
        /* `min-h` — yuklanish/bo'sh holat kadrlar to'ri bilan BIR XIL balandlikda,
           panel ma'lumot kelganda sakramaydi (2026-10-26). */
        <div className="grid min-h-[170px] place-items-center text-center">
          {empty ?? <EmptyState title="Hech narsa topilmadi" hint="Tanlangan davrda bu turdagi hodisalar qayd etilmadi." />}
        </div>
      ) : (
        <>
          <div className="mb-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Clock size={12} weight="duotone" />
              Oxirgisi: {last ? nvrTime(last.time) : "—"}
            </span>
            <span aria-hidden className="text-slate-600">•</span>
            <span className="flex items-center gap-1">
              <SecurityCamera size={12} weight="duotone" />
              {last ? (isLocalModelEvent(last) ? last.camera : cameraPlaceLabel(last.channel, last.camera)) : "—"}
            </span>
          </div>
          <ShotGrid shots={shots} onOpen={onOpenShot} />
        </>
      )}
    </StatPanel>
  );
}

/**
 * 2-VERSIYA (ko'cha kameralari) — janjal yoki qurol paneli.
 * ⚠️ 2-versiya serverlari sana filtrini QABUL QILMAYDI (`/openapi.json`) —
 * son va kadrlar DOIM butun tarix; izohda ochiq yoziladi.
 */
export function V2TypePanel({ kind, onOpenShot }: { kind: "janjal" | "gun"; onOpenShot: (ev: NvrEvent) => void }) {
  const t = useT();
  const v2 = useV2Selection();
  const source = kind === "janjal" ? "janjal2" : "weapon2";
  const feed = useNvrEvents(kind, 3, { source, v2Cameras: v2 });
  const [all, setAll] = useState(false);
  const color = NVR_COLOR[kind] ?? "#F43F5E";
  const title = `${kind === "janjal" ? t.detect.category.janjal : t.detect.category.gun} · ${t.nvr.v2Button}`;
  return (
    <>
      <TypePanel
        title={title}
        hint={feed.loading ? "yuklanmoqda…" : `${feed.total.toLocaleString(t.locale)} ta · ko'cha kameralari · butun tarix`}
        color={color}
        count={feed.loading ? 0 : feed.total}
        shots={feed.events.slice(0, 3)}
        onOpenShot={onOpenShot}
        onAll={() => setAll(true)}
        empty={
          feed.loading ? (
            /* Kadrlar to'ri shaklidagi skelet — kelgan 3 ta kadr AYNI joyni egallaydi */
            <div className="grid w-full grid-cols-3 gap-1.5 self-start">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="aspect-[4/3] w-full" />
              ))}
            </div>
          ) : (
            <EmptyState
              title={feed.error ? "Ma'lumot olinmadi" : "Hech narsa topilmadi"}
              hint={feed.error ? feed.error : "Ko'cha kameralarida bu turdagi hodisalar qayd etilmadi."}
            />
          )
        }
      />
      {all && (
        <EventTypeCardsModal title={title} color={color} tab={kind} source={source} onClose={() => setAll(false)} />
      )}
    </>
  );
}
