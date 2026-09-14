"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { X } from "@phosphor-icons/react";
import { getEvent } from "@/lib/nvrApi";
import { DetectionModal } from "@/components/detections/DetectionsPage";
import { DETECTION_BY_ID } from "@/lib/detectionTypes";
import type { DetectionEvent } from "@/lib/detectionEvents";

/**
 * HUD'dan bosilgan hodisaning TAFSILOTI.
 *
 * ── NEGA QAYTA YOZILDI ────────────────────────────────────────────────
 * Ilgari bu yerda ESKI "Hodisalar" bo'limi (`EventsPage`) to'liq ekran
 * bo'lib ochilardi. U bitta kuzatuv posti hodisasining ustiga:
 *   · respublika miqyosidagi KPI qatorini (645 texnikum, 645 000 talaba…),
 *   · "Noma'lum kamera" bilan to'lgan demo trevoga ro'yxatini,
 *   · hodisaga aloqasi yo'q STOK rasmni (`/imges/incident-scene.webp`),
 *   · o'ylab topilgan "18 ishtirokchi" va "S1…S5" yuzlarini
 * chiqarardi. Ya'ni ekranning ko'p qismi HAQIQIY hodisaga tegishli emas
 * edi va operatorni chalg'itardi.
 *
 * Endi AYNAN o'sha hodisaning ma'lumotlari ochiladi — "Aniqlanganlar"
 * bo'limidagi bilan BITTA komponent (`DetectionModal`): haqiqiy kadr,
 * nishon ramkalari, yuz belgilari, video va o'tish kadrlari.
 *
 * ⚠️ HUD yozuvi (`DetectionEvent`) kuzatuv posti hodisasining QISQARTMASI — unda
 * rasm, ramka va belgilar yo'q. Shuning uchun to'liq yozuv `id` bo'yicha
 * serverdan olinadi (`nvr-31955` → `31955`). Bu `DetectionsPage` dagi
 * "ro'yxatda topilmagan hodisani serverdan olish" oqimining o'zi.
 */
export function HudEventDetail({ ev, onClose }: { ev: DetectionEvent | null; onClose: () => void }) {
  /* kuzatuv posti yozuvimi? Demo/backend hodisasida bunday id bo'lmaydi. */
  const nvrId = ev && ev.id.startsWith("nvr-") ? Number(ev.id.slice(4)) : null;

  const q = useQuery({
    queryKey: ["nvr-event", nvrId],
    queryFn: () => getEvent(nvrId as number),
    enabled: nvrId != null,
    staleTime: 60_000,
  });

  if (!ev) return null;

  /* Haqiqiy kuzatuv posti hodisasi — to'liq dossiye. */
  if (nvrId != null && q.data) {
    return <DetectionModal ev={q.data} onClose={onClose} onSelect={() => {}} />;
  }

  const det = DETECTION_BY_ID.get(ev.type);
  const loading = nvrId != null && q.isLoading;

  /* Zaxira: kuzatuv posti yozuvi emas (demo oqimi) yoki server javob bermadi.
     ⚠️ Bu yerda HECH NARSA O'YLAB TOPILMAYDI — faqat yozuvda BOR maydonlar
     ko'rsatiladi. Ilgari shu holatda ham soxta rasm va sonlar chiqardi. */
  const rows: [string, string][] = [
    ["Hodisa", ev.title],
    ["Muassasa", ev.campus],
    ["Mahalla", ev.mahalla],
    ["Kamera", ev.channel ? `#${ev.channel} · ${ev.camera}` : ev.camera],
    ["Vaqt", ev.time],
    ...(ev.confidence != null ? ([["Ishonch", `${ev.confidence}%`]] as [string, string][]) : []),
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[60] grid place-items-center bg-[#03060E]/85 p-4 backdrop-blur-sm"
      >
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => e.stopPropagation()}
          style={{ ["--c" as string]: det?.color ?? "#85E0FF" }}
          className="nvr-dsr"
        >
          <header className="nvr-dsr-top">
            <span className="nvr-dsr-brand">
              <b>{ev.title}</b>
              <em>{det?.label ?? ""}</em>
            </span>
            <button type="button" onClick={onClose} className="nvr-dsr-x ml-auto" aria-label="Yopish">
              <X size={17} />
            </button>
          </header>

          <section className="nvr-dsr-block">
            {loading ? (
              <p className="nvr-dsr-empty">Yuklanmoqda…</p>
            ) : (
              <dl className="nvr-dsr-list">
                {rows.map(([k, v]) => (
                  <div key={k} className="nvr-dsr-row">
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
