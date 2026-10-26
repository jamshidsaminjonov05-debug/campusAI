"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { CaretLeft, CaretRight, X } from "@phosphor-icons/react";
import { useModalHistory } from "@/hooks/useModalHistory";
import { DetectionCard } from "@/components/detections/DetectionCard";
import { EventDossier } from "@/components/detections/EventDossier";
import { NVR_MAX_LIMIT, isPhoneEvent, listEvents, type NvrEvent } from "@/lib/nvr/nvrApi";
import { useT } from "@/i18n";
import { CardGridSkeleton } from "@/components/common/panels";
import { EmptyState } from "@/components/common/EmptyState";

/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  QOIDABUZARLIK RO'YXATI — Statistika → Umumiy → "Ko'rish" oynasi      ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * 2026-10-26, foydalanuvchi: "bosganda chiqadigan modallarda aniq ma'lumotlar
 * chiqib berishi kerak rasmlari bilan ... card bo'lib, bosib video, rasm va
 * vaqt hammasini ko'rish mumkin bo'lishi kerak". Ilgari "Ko'rish" o'ng
 * panelda (`StatDetailDrawer`) faqat "Camera 01 · vaqt" qatorlarini
 * ko'rsatardi — rasm ham, dossiye ham yo'q edi.
 *
 * Endi: "Aniqlanganlar"dagi AYNI `DetectionCard` kartochkalari (kadr, tur
 * nishoni, vaqt, ishonch), bosilsa AYNI `EventDossier` (butun kadr, video,
 * o'tish kadrlari). Hech narsa qayta yozilmadi — ikkala komponent o'zi.
 *
 * Manba: `listEvents(cat, {limit: 500, date_from, date_to})` — `AlertKpiModal`
 * bilan bir naqsh. Chekish/Telefon serverda bitta `smoking` kategoriyasi,
 * `isPhoneEvent()` bilan KLIENTDA ajratiladi (`useSmokingSplit` bilan AYNI
 * qoida — kartochkadagi son va oynadagi ro'yxat mos tushadi). Oyna to'lsa
 * (`total > 500`) pastda ochiq yoziladi, jim qirqilmaydi.
 */
/** `"all"` — to'rttala qoidabuzarlik birga (janjal + qurol + chekish/telefon),
 *  YUZ TANISH KIRMAYDI. Boshqaruv paneli → muassasa → "Hodisalar" (2026-10-26). */
export type ViolationKind = "janjal" | "smoking" | "phone" | "gun" | "all";

const PAGE = 24;

export function ViolationListModal({
  kind,
  label,
  color,
  from,
  to,
  onClose,
}: {
  kind: ViolationKind;
  /** Sarlavha — `t.stats.panel.kinds[...]`, chaqiruvchi beradi. */
  label: string;
  color: string;
  from?: string;
  to?: string;
  onClose: () => void;
}) {
  const t = useT();
  const P = t.stats.panel;
  const [openId, setOpenId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  /* ◀ "orqaga" avval shu oynani yopadi (`lib/modalHistory.ts`). */
  useModalHistory(onClose);

  const q = useQuery({
    queryKey: ["nvr-violation-list", kind === "phone" ? "smoking" : kind, from ?? "", to ?? ""],
    /* `prefetch` YO'Q (2026-10-26): "Aniqlanganlar"dagi kabi — 3 ta kategoriya
       × 10 video = 30 ffmpeg 1 vCPU serverda hamma so'rovni 3–10× sekinlatardi
       (`SEKINLIK-TUZATISH.md` 13-D). Video dossiyeda ochilganda tayyorlanadi. */
    queryFn: async () => {
      const cats = kind === "all" ? (["janjal", "gun", "smoking"] as const) : ([kind === "phone" ? "smoking" : kind] as const);
      const pages = await Promise.all(
        cats.map((c) => listEvents(c, { limit: NVR_MAX_LIMIT, date_from: from, date_to: to }))
      );
      return {
        events: pages.flatMap((p) => p.events),
        total: pages.reduce((sum, p) => sum + p.total, 0),
      };
    },
    staleTime: 45_000,
  });

  const events = useMemo<NvrEvent[]>(() => {
    const all = q.data?.events ?? [];
    const own =
      kind === "phone" ? all.filter(isPhoneEvent) : kind === "smoking" ? all.filter((e) => !isPhoneEvent(e)) : all;
    return [...own].sort((a, b) => (a.time < b.time ? 1 : a.time > b.time ? -1 : 0));
  }, [q.data, kind]);
  const serverTotal = q.data?.total ?? 0;
  const windowCapped = serverTotal > (q.data?.events.length ?? 0);
  const pages = Math.max(1, Math.ceil(events.length / PAGE));
  const safePage = Math.min(page, pages);
  const rows = events.slice((safePage - 1) * PAGE, safePage * PAGE);

  if (typeof document === "undefined") return null;
  const btn =
    "grid h-7 w-7 place-items-center rounded-lg border border-white/10 text-slate-300 transition-colors hover:border-ice/30 hover:text-white disabled:opacity-30";

  return createPortal(
    /* ⚠️ PORTAL SHART — Statistika panellari `motion.section` (transform)
       ichida; `fixed` oyna ularning ichida qolsa z-index sahifa sarlavhasidan
       past bo'lib qoladi (`StatDetailDrawer`da aynan shu xato bor edi). */
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="flex h-[min(860px,90vh)] w-[min(1280px,96vw)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0B1220] shadow-2xl"
        style={{ ["--c" as string]: color }}
      >
        <header className="flex flex-none items-start gap-3 border-b border-white/[0.08] px-4 py-3">
          <span className="mt-1 h-8 w-1 flex-none rounded-full bg-[color:var(--c)]" />
          <div className="min-w-0 flex-1">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-slate-500">{P.violationsTitle}</p>
            <h3 className="truncate text-[16px] font-bold text-white">
              {label}
              <span className="ml-2 font-mono text-[13px] font-semibold text-[color:var(--c)]">
                {q.isLoading ? "…" : P.violationsTotal(events.length.toLocaleString(t.locale))}
              </span>
            </h3>
            <p className="mt-0.5 text-[10.5px] text-slate-500">{P.violationModalSub}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            title={t.common.close}
            className="grid h-7 w-7 flex-none place-items-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={14} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
          {q.isLoading ? (
            <CardGridSkeleton count={8} />
          ) : q.isError ? (
            <p className="py-16 text-center text-[11.5px] text-rose-300">{t.nvr.tabCountError}</p>
          ) : events.length === 0 ? (
            /* Nol o'rniga SABAB — bo'sh oyna nosozlik deb o'qilmasin */
            <EmptyState fill title={P.violationNone} />
          ) : (
            <div className="nvr-grid" style={{ ["--cols" as string]: 4 }}>
              {rows.map((ev) => (
                <DetectionCard key={ev.id} ev={ev} onOpen={(e) => setOpenId(e.id)} />
              ))}
            </div>
          )}
          {windowCapped && !q.isLoading && (
            <p className="px-1 pt-3 text-[10px] text-slate-500">
              {P.violationCapped(events.length.toLocaleString(t.locale), serverTotal.toLocaleString(t.locale))}
            </p>
          )}
        </div>

        {pages > 1 && (
          <footer className="flex flex-none items-center justify-center gap-2 border-t border-white/[0.08] px-3 py-2 font-mono text-[11px] text-slate-400">
            <button type="button" className={btn} disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
              <CaretLeft size={12} weight="bold" />
            </button>
            <span>
              {safePage} / {pages}
            </span>
            <button type="button" className={btn} disabled={safePage >= pages} onClick={() => setPage(safePage + 1)}>
              <CaretRight size={12} weight="bold" />
            </button>
          </footer>
        )}

        {/* ⚠️ `stopPropagation` — dossiye portal orqali `body`da tursa ham React
            hodisasi daraxt bo'yicha ko'tarilib, bu oynaning `onClick={onClose}`
            fon qatlamiga yetib borardi (CLAUDE.md, EventDossier bo'limi). */}
        <div onClick={(e) => e.stopPropagation()}>
          <EventDossier eventId={openId} onClose={() => setOpenId(null)} />
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
