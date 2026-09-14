"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { VideoCameraSlash } from "@phosphor-icons/react";
import { getEvent, type NvrEvent } from "@/lib/nvrApi";
import { DetectionModal } from "@/components/detections/DetectionsPage";

/**
 * HODISA MA'LUMOTLARI — `id` bo'yicha ochiladigan to'liq oyna.
 *
 * "Aniqlanganlar" bo'limida kartochka bosilganda ochiladigan AYNI oyna
 * (`DetectionModal`), faqat bu yerda yozuv qo'lda emas, SERVERDAN olinadi.
 * Boshqa ro'yxatlarda (kamera kadrlari, "Kameraga tushgan odamlar") to'liq
 * `NvrEvent` yo'q — faqat `id` bor, shuning uchun shu qobiq kerak.
 *
 * ⚠️ **NEGA ALOHIDA `fixed inset-0 z-[92]` O'RAMI BOR.**
 * `DetectionModal` ning o'z o'rami `z-[60]`, u esa "Aniqlanganlar"
 * sahifasida — eng ustki oyna bo'lgani uchun — yetarli. Bu komponent esa
 * BOSHQA MODAL USTIDAN ochiladi (`CameraDetectionsModal` — `z-[88]`,
 * `TodayArrivalsModal` — `z-[80]`), ya'ni `z-[60]` bilan u ostida
 * ko'rinmay qolardi. O'ram o'z stacking context'ini yaratadi va ichkarida
 * `DetectionModal` avvalgidek ishlayveradi (`EnrollPerson` ning `z-[95]`
 * i ham shu context ichida yuqorida qoladi).
 *
 * ⚠️ **PORTAL SHART** — ochuvchi modallarda `backdrop-filter` bor
 * (`backdrop-blur-*`), u `position: fixed` uchun YANGI containing block
 * yaratadi: portalsiz dossiye butun ekranni emas, ochuvchi modal
 * maydonini egallab, chetidan qirqilib qolardi (CamerasPage'dagi bilan
 * ayni tuzoq).
 */
export function EventDossier({ eventId, onClose }: { eventId: number | null; onClose: () => void }) {
  /* Dossiye ICHIDA boshqa kadrga o'tish mumkin (o'tish lentasi, shaxs
     tarixi) — `DetectionModal.onSelect` shuni beradi. O'sha yozuv to'liq
     kelgani uchun qayta so'rov kerak emas. */
  const [picked, setPicked] = useState<NvrEvent | null>(null);
  useEffect(() => setPicked(null), [eventId]);

  const q = useQuery({
    queryKey: ["nvr-event", eventId],
    queryFn: () => getEvent(eventId as number),
    enabled: eventId != null,
    staleTime: 60_000,
    retry: false,
  });

  if (eventId == null || typeof document === "undefined") return null;

  const ev = picked ?? q.data ?? null;

  const body = (
    /* ⚠️ **`stopPropagation` SHART.** React hodisalari portal orqali ham
       REACT DARAXTI bo'yicha ko'tariladi (DOM daraxti bo'yicha emas):
       dossiye `document.body` ga chiqarilgan bo'lsa-da, uning ichidagi
       klik ochuvchi modalning o'ramiga yetib borardi. O'sha o'ramda esa
       `onClick={onClose}` turibdi — natijada ma'lumotlarni yopganda ostidagi
       oyna ham birga yopilib ketardi. */
    <div className="fixed inset-0 z-[92]" onClick={(e) => e.stopPropagation()}>
      {ev ? (
        <DetectionModal ev={ev} onClose={onClose} onSelect={setPicked} />
      ) : (
        <div
          onClick={onClose}
          className="fixed inset-0 grid place-items-center bg-[#03060E]/85 p-4 backdrop-blur-sm"
        >
          {q.isLoading ? (
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-ice/40 border-t-ice" />
          ) : (
            /* Hodisa o'chirilgan yoki server javob bermadi — jim qolmaymiz */
            <p className="flex items-center gap-2 text-[12px] text-slate-400">
              <VideoCameraSlash size={16} />
              Hodisa tafsilotini olib bo'lmadi
            </p>
          )}
        </div>
      )}
    </div>
  );

  return createPortal(body, document.body);
}
