"use client";

import { useT } from "@/i18n";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Info, X } from "@phosphor-icons/react";
import { useAppStore } from "@/store/useAppStore";
import { useLiveInstitution } from "@/hooks/useLiveInstitutions";
import { InstitutionDetail } from "./InstitutionDetail";
import { EmotionPanel, RecentEntriesPanel } from "./RecentEntriesPanel";
import { EventSidebar } from "./EventSidebar";
import { EventAnalysisPanel } from "./EventAnalysisPanel";

/**
 * Xarita ustidagi "Batafsil ma'lumot" tugmasi + suziluvchi tafsilot
 * qatlami (2026-09-07, foydalanuvchi so'rovi).
 *
 * Ilgari o'ng ustun (`InstitutionDetail`/`RecentEntriesPanel`/
 * `EmotionPanel`/`EventSidebar`) DOIM ko'rinardi va o'z grid ustunini
 * (330px) egallardi — xarita endi TO'LIQ orqa fonda bo'lgani uchun
 * (`DashboardScreen.tsx`) bu doimiy ustun ORTIQCHA joy band qilardi.
 * Endi shu ma'lumot faqat SO'RALGANDA (tugma bosilganda) chiqadi:
 * o'ng-past burchakdagi tugma bosilsa, panel O'NGDAN suzib kiradi
 * (fade + slide, `framer-motion`), TO'LIQ balandlikni OLMAYDI —
 * foydalanuvchi so'ragan aynan shu talab.
 *
 * **Mazmuni UCHTA holatga qarab almashadi**:
 *   · `eventDetailId` BOR (CHAP `AlertsOverviewPanel`dan hodisa tanlandi)
 *     → **"Hodisa tahlili"** (`EventAnalysisPanel`) — ustuvor, qolgan
 *     ikkalasidan qat'i nazar;
 *   · aks holda, `useAppStore.selectedTeknikum` kanalidan: muassasa
 *     TANLANMAGAN (umumiy holat) → umumiy panellar (oxirgi kirishlar,
 *     kayfiyat, hodisa turlari — Pie3D); muassasa TANLANGAN → o'sha
 *     muassasaning O'ZI (`InstitutionDetail`).
 *
 * ⚠️ Panellar (`RecentEntriesPanel` va h.k.) FAQAT shu qatlamda
 * ishlatiladi — ularning `surface="map-glass-card"` propi shu sabab
 * qo'shildi (default `hik-glass-blue` xarita ustida o'qilmay qolardi,
 * CLAUDE.md "XARITA USTIDAGI panelga surface bering" qoidasi;
 * `.map-glass-card` — 2026-09-07: `geo-strip-card`dan farqli, past
 * alfa + kuchli blur, "muzlangan shisha" ko'rinishi — pastdagi
 * "CARDLAR OCHROQ" izohiga qarang).
 *
 * 🔵 **TAG-MA-TAG CHIQISH — 2026-09-07** (foydalanuvchi so'rovi: "o'ng
 * tomonidagi panellar cardlar hammasi transformX bilan o'ngda asta
 * sekin tagma tag ko'rinishi kerak"). Ilgari butun panel BITTA
 * animatsiya bilan (fade+slide) kirar edi — ichidagi uch bo'lim
 * (Oxirgi kirishlar/Kayfiyat/Hodisa turlari) BIRDANIGA paydo bo'lardi.
 * Endi tashqi `motion.div` `variants` + `staggerChildren` ishlatadi:
 * o'zi hamon o'ngdan suzib kiradi, ICHIDAGI har bir bo'lim esa
 * ketma-ket, sal kechikib, `x` bilan (`panelItemVariants`) chiqadi.
 * Muassasa TANLANGANDA `InstitutionDetail`ning ICHIDAGI besh
 * ko'rsatkich (O'quvchilar/O'qituvchilar/Davomat/Kameralar/Signallar)
 * ham xuddi shu naqsh bilan chiqadi — o'sha komponentning O'ZIDA
 * (`InstitutionDetail.tsx` `statListVariants`/`statItemVariants`).
 */
const overlayVariants = {
  hidden: { opacity: 0, x: 36 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1], staggerChildren: 0.09, delayChildren: 0.06 },
  },
  exit: { opacity: 0, x: 36, transition: { duration: 0.18 } },
};
const panelItemVariants = {
  hidden: { opacity: 0, x: 22 },
  show: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
};

export function MapDetailOverlay({
  eventDetailId = null,
  onEventDetailClose,
}: {
  /**
   * Hodisa raqami — `AlertsOverviewPanel` (CHAP panel) dagi qator
   * bosilganda keladi. 2026-09-09, foydalanuvchi so'rovi: "hodisalar
   * ustiga bosilsa o'ngda chiqib beradi hodisa tahlili". Bu — mavjud
   * "Batafsil ma'lumot" slotining UCHINCHI mazmuni (muassasa / umumiy
   * panellar / hodisa tahlili): yangi qatlam yaratish o'rniga BOR
   * panelning o'zi kengaytirildi — ikkita mustaqil o'ng panel ustma-ust
   * chiqib ketmasin.
   */
  eventDetailId?: number | null;
  /** Hodisa tahlili yopilganda (`X` yoki tashqaridan) `null` qaytariladi. */
  onEventDetailClose?: () => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const selectedId = useAppStore((s) => s.selectedTeknikum);
  const selected = useLiveInstitution(selectedId);

  /* Tashqi trigger — CHAP paneldan hodisa tanlansa o'ng panelni majburan
     ochadi, boshqa ikkala mazmun (muassasa/umumiy) ustidan ustuvor bo'ladi. */
  useEffect(() => {
    if (eventDetailId != null) setOpen(true);
  }, [eventDetailId]);

  /** Panelni yopish — QAYERDAN chaqirilmasin, `eventDetailId` ham tozalanadi. */
  const close = () => {
    setOpen(false);
    onEventDetailClose?.();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        title={open ? t.common.close : t.dashboard.ui.detailBtn}
        className={`absolute top-3 left-16 z-20 flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-bold backdrop-blur-xl transition-colors ${
          open
            ? "border-ice/50 bg-ice/20 text-ice-bright"
            : "border-white/10 bg-[#0C1020]/80 text-slate-200 hover:text-white"
        }`}
      >
        {open ? <X size={14} weight="bold" /> : <Info size={14} weight="bold" />}
        {t.dashboard.ui.detailBtn}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            /* Muassasa/rejim almashsa ham qayta suzib kirsin — o'tish sezilsin */
            key={eventDetailId != null ? `event-${eventDetailId}` : (selectedId ?? "overview")}
            variants={overlayVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className="absolute top-16 right-3 z-20 flex min-h-0 w-[330px] flex-col gap-2"
            style={{ height: "min(680px, calc(100% - 88px))" }}
          >
            {eventDetailId != null ? (
              <EventAnalysisPanel eventId={eventDetailId} onClose={close} />
            ) : selected ? (
              <InstitutionDetail inst={selected} />
            ) : (
              <>
                <motion.div variants={panelItemVariants} className="min-h-0 flex-1">
                  <RecentEntriesPanel />
                </motion.div>
                <motion.div variants={panelItemVariants} className="flex-none">
                  <EmotionPanel />
                </motion.div>
                <motion.div variants={panelItemVariants} className="min-h-0 flex-[1.2]">
                  <EventSidebar />
                </motion.div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
