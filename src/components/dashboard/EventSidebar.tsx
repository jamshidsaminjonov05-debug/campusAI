/**
 * **Hodisa turlari** — Dashboard'ning o'ng-past paneli.
 *
 * 🔵 **RO'YXAT O'RNIGA HAJMLI PIE** (2026-09-05, foydalanuvchi so'rovi).
 * Ilgari bu yerda oxirgi bir necha hodisaning ro'yxati turardi; endi
 * **`Pie3D`** — qiya qaralgan to'liq doira, yon devori va bo'lak
 * ichidagi foizi bilan.
 *
 * ⚠️ **`Donut3D` EMAS**: u halqa (o'rtasi teshik) va tekis
 * proyeksiyada — Statistika bo'limida shu qoladi. Bu yerda esa
 * hajmli doira so'raldi, shuning uchun alohida komponent
 * (`components/common/Pie3D.tsx`).
 *
 * · **Har bo'lak bosiladi** — o'sha turning XULOSASI oynasi ochiladi
 *   (bo'lakning o'zi + sonlar; ro'yxat ATAYLAB yo'q).
 * · **"Batafsil"** — Statistika bo'limiga o'tadi.
 *
 * ⚠️ Bo'lak nomi TARJIMA qilinadi, shuning uchun moslik `id`
 * (`DetectionId`) bo'yicha — nom bo'yicha emas: til almashganda
 * bog'lanish buzilardi.
 */
"use client";

import { useT } from "@/i18n";
import { useMemo, useState } from "react";
import { ArrowRight } from "@phosphor-icons/react";
import { useArrivals } from "@/hooks/useTodayArrivals";
import { fromNvr, type DetectionEvent } from "@/lib/detectionEvents";
import { DETECTION_BY_ID, DETECTION_TYPES, type DetectionId } from "@/lib/detectionTypes";
import { useAppStore } from "@/store/useAppStore";
import { Pie3D, type PieSlice } from "@/components/common/Pie3D";
import { StatPanel } from "@/components/common/panels";
import { EventTypeModal } from "./EventTypeModal";

export function EventSidebar() {
  const u = useT().dashboard.ui.types;
  /**
   * 🔵 **BUTUN TARIX**, bugungi kun EMAS (2026-09-05, foydalanuvchi
   * so'rovi).
   *
   * ⚠️ Ilgari manba `useDetectionFeed()` edi — u ATAYLAB bugungi
   * kunga cheklangan (`useArrivals({from: bugun, to: bugun})`), ya'ni
   * halqa "bugun nima bo'ldi" ni ko'rsatardi. Panel sarlavhasi esa
   * "Hodisa turlari" — umumiy kesim kutiladi.
   *
   * `useArrivals({})` — oraliqsiz, ya'ni BUTUN tarix. So'rov "AI
   * tahlil" sahifasining "Hammasi" davri bilan AYNI kalitga tushadi
   * (React Query uni ikkinchi marta so'ramaydi).
   */
  const scope = useArrivals({});

  /** Xom kuzatuv posti yozuvlari → UI turlariga. */
  const events = useMemo<DetectionEvent[]>(
    () => scope.raw.map(fromNvr).filter((e): e is DetectionEvent => e !== null),
    [scope.raw]
  );

  const eventsByType = useMemo(() => {
    const map = Object.fromEntries(DETECTION_TYPES.map((d) => [d.id, [] as DetectionEvent[]])) as Record<
      DetectionId,
      DetectionEvent[]
    >;
    for (const e of events) map[e.type]?.push(e);
    /* Har turda eng yangisi birinchi — oyna shu tartibda ochiladi. */
    for (const id of Object.keys(map) as DetectionId[]) map[id].sort((a, b) => b.ts - a.ts);
    return map;
  }, [events]);
  const setActivePage = useAppStore((s) => s.setActivePage);
  /** Ochilgan tur — `null` bo'lsa oyna yopiq. */
  const [openType, setOpenType] = useState<DetectionId | null>(null);

  /* ⚠️ Bo'sh turlar CHIZILMAYDI (`Donut3D` o'zi ham `value > 0` ni
     filtrlaydi): "0 ta qurol" bo'lagi halqada joy egallab, mavjud
     turlarni siqib qo'yardi. */
  const slices = useMemo<PieSlice[]>(
    () =>
      DETECTION_TYPES.map((d) => ({
        id: d.id,
        label: u.names[d.id],
        value: eventsByType[d.id]?.length ?? 0,
        color: d.color,
      })).filter((s) => s.value > 0),
    [eventsByType, u]
  );

  return (
    <StatPanel
      title={u.title}
      right={
        <span className="font-mono text-[10px] text-slate-500">
          {scope.isLoading ? "…" : u.count(events.length)}
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
            {u.empty}
          </p>
        ) : (
          <Pie3D
            data={slices}
            size={300}
            /* Bo'lak bosilsa — o'sha turning xulosasi oynasi */
            onSelect={(s) => setOpenType((s.id as DetectionId) ?? null)}
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
          label={u.names[openType] ?? openType}
          color={DETECTION_BY_ID.get(openType)?.color ?? "#8FB8FF"}
          list={eventsByType[openType] ?? []}
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
