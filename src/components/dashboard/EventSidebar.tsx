/**
 * **Hodisa turlari** — Dashboard'ning o'ng-past paneli.
 *
 * 🔵 **RO'YXAT O'RNIGA HAJMLI PIE** (2026-09-05, foydalanuvchi so'rovi).
 * Ilgari bu yerda oxirgi bir necha hodisaning ro'yxati turardi; endi
 * **`Pie3D`** — qiya qaralgan to'liq doira, yon devori va bo'lak
 * ichidagi foizi bilan.
 *
 * 🔴 **MANBA — `GET /events/stats`** (2026-09-15, foydalanuvchi so'rovi).
 * Ilgari `useArrivals({})` butun tarixni 100 tadan 30 sahifa + 3 so'rov
 * qilib HAR 60 SONIYADA o'qirdi (Network'da 33 qator), 3 000 yozuv esa
 * amalda ~1 kunga yetardi — "butun tarix" diagrammasi bir kunni
 * ko'rsatardi. Endi server BUTUN tarixni bazada sanaydi: bitta so'rov,
 * ~1.3 KB, 5 daqiqada bir (`hooks/useEventStats.ts`).
 *
 * ⚠️ Bo'laklar endi SERVER kategoriyalari (Shaxsni aniqlash / Janjal /
 * Chekish-telefon / Qurol). "Begona odam" va "Telefon" alohida bo'lak
 * EMAS — server ularni ajratib sanamaydi (`recognized` filtri yo'q).
 *
 * ⚠️ **`Donut3D` EMAS**: u halqa (o'rtasi teshik) va tekis
 * proyeksiyada — Statistika bo'limida shu qoladi. Bu yerda esa
 * hajmli doira so'raldi (`components/common/Pie3D.tsx`).
 *
 * · **Har bo'lak bosiladi** — o'sha turning XULOSASI oynasi ochiladi.
 * · **"Batafsil"** — Statistika bo'limiga o'tadi.
 *
 * ⚠️ Moslik `id` (server kategoriyasi) bo'yicha — nom bo'yicha emas: nom
 * tarjima qilinadi va til almashganda bog'lanish buzilardi.
 */
"use client";

import { useT } from "@/i18n";
import { useMemo, useState } from "react";
import { ArrowRight } from "@phosphor-icons/react";
import { useEventStats } from "@/hooks/useEventStats";
import { NVR_CATEGORIES, type NvrRealCategory } from "@/hooks/useEventCounts";
import { NVR_COLOR } from "@/components/detections/DetectionCard";
import { useAppStore } from "@/store/useAppStore";
import { Pie3D, type PieSlice } from "@/components/common/Pie3D";
import { StatPanel } from "@/components/common/panels";
import { EventTypeModal } from "./EventTypeModal";

export function EventSidebar() {
  const t = useT();
  const u = t.dashboard.ui.types;
  /** Oraliqsiz — BUTUN tarix, server hisobi. */
  const stats = useEventStats();

  const setActivePage = useAppStore((s) => s.setActivePage);
  /** Ochilgan tur — `null` bo'lsa oyna yopiq. */
  const [openType, setOpenType] = useState<NvrRealCategory | null>(null);

  /* ⚠️ Bo'sh turlar CHIZILMAYDI: "0 ta qurol" bo'lagi halqada joy
     egallab, mavjud turlarni siqib qo'yardi. */
  const slices = useMemo<PieSlice[]>(
    () =>
      NVR_CATEGORIES.map((c) => ({
        id: c,
        label: t.detect.category[c],
        value: stats.byCategory[c],
        color: NVR_COLOR[c] ?? "#8FB8FF",
      })).filter((s) => s.value > 0),
    [stats.byCategory, t]
  );

  return (
    <StatPanel
      title={u.title}
      right={
        <span className="font-mono text-[10px] text-slate-500">
          {stats.isLoading ? "…" : u.count(stats.total)}
        </span>
      }
      delay={0.2}
      /* ⚠️ `h-full` SHART — `StatPanel` balandligi aks holda `auto`
         bo'lib qoladi va o'ram `div` ni to'ldirmaydi (panel pastdan
         qirqilardi, skroll ishlamasdi). */
      className="h-full min-h-0"
      bodyClass="flex min-h-0 flex-col"
      /* Xarita ustidagi tafsilot qatlamida suzadi (`MapDetailOverlay.tsx`)
         — default `hik-glass-blue` ostidagi xarita ustidan matn
         o'qilmay qoladi (CLAUDE.md qoidasi). */
      surface="map-glass-card"
    >
      <div className="grid min-h-0 flex-1 place-items-center overflow-y-auto">
        {slices.length === 0 ? (
          /* Nol o'rniga SABAB — bo'sh panel nosozlik deb o'qilmasin */
          <p className="py-6 text-center text-[11px] leading-snug text-slate-500">
            {stats.isLoading ? "…" : u.empty}
          </p>
        ) : (
          <Pie3D
            data={slices}
            size={300}
            /* Bo'lak bosilsa — o'sha turning xulosasi oynasi */
            onSelect={(s) => setOpenType((s.id as NvrRealCategory) ?? null)}
          />
        )}
      </div>

      {/* Batafsil — Statistika bo'limiga o'tadi */}
      <button
        type="button"
        onClick={() => setActivePage("Statistika")}
        className="mt-2 flex flex-none items-center justify-center gap-1.5 rounded-lg border border-white/10
                   bg-white/[0.04] py-1.5 text-[11px] font-semibold text-slate-300 transition-colors
                   hover:border-ice/30 hover:text-ice-bright"
      >
        {u.more}
        <ArrowRight size={12} weight="bold" />
      </button>

      {/* Bo'lak oynasi — bo'lakning O'ZI + umumiy xulosa (ro'yxatsiz) */}
      {openType && (
        <EventTypeModal
          slices={slices}
          activeId={openType}
          label={t.detect.category[openType]}
          color={NVR_COLOR[openType] ?? "#8FB8FF"}
          stats={stats}
          onOpenAll={() => {
            setOpenType(null);
            setActivePage("Aniqlanganlar");
          }}
          onClose={() => setOpenType(null)}
        />
      )}
    </StatPanel>
  );
}
