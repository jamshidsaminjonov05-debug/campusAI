"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { ImageBroken, UserFocus, X } from "@phosphor-icons/react";
import { useDetections } from "@/hooks/useDetections";
import { detectSubject, nvrDateTime, nvrImageUrl, type NvrEvent } from "@/lib/nvrApi";
import { NVR_COLOR } from "@/components/detections/DetectionCard";
import { parseCameraName, placeLabel } from "@/lib/cameraNaming";
import { useT } from "@/i18n";
import { EventDossier } from "@/components/detections/EventDossier";
import { useModalHistory } from "@/hooks/useModalHistory";

/**
 * Bitta kamera ANIQLAGAN tasvirlar — kartochkadagi "ma'lumot" tugmasi ochadi.
 *
 * ⚠️ Ilgari o'sha tugma "ulanishni tekshirish" (Wi-Fi) edi: u kuzatuv postiga so'rov
 * yuborib faqat "ishlayapti" degan xabar chiqarardi — operator uchun deyarli
 * foydasiz. Endi tugma shu kanalning HODISALARINI ko'rsatadi.
 *
 * Manba — `useDetections({ channel })`, ya'ni "Aniqlanganlar" bo'limi bilan
 * AYNI oqim va ayni kesh: qo'shimcha ulanish ochilmaydi.
 *
 * Rasm `<img>` orqali alohida so'rov bo'lib keladi (`?images=true` base64
 * EMAS) — ro'yxat yengil qoladi va brauzer rasmni keshlaydi.
 */
export function CameraDetectionsModal({
  channel,
  cameraName,
  onClose,
}: {
  channel: number | string;
  cameraName: string;
  onClose: () => void;
}) {
  /* ◀ "orqaga" avval SHU oynani yopadi (`lib/modalHistory.ts`). */
  useModalHistory(onClose);
  const t = useT();
  const ch = String(channel);
  /* Bosilgan kadrning DOSSIYESI — "Aniqlanganlar" bo'limidagi bilan AYNI
     oyna (`DetectionModal`).
     ⚠️ Ilgari bu yerda faqat RASM KO'RUVCHISI (`ImageLightbox`) ochilardi:
     kadrni kattalashtirish mumkin edi, lekin kim/qachon/qaysi kamera,
     nishon ramkalari, yuz belgilari, video va o'tish kadrlari
     ko'rinmasdi. Kattalashtirish yo'qolmadi — u dossiyening o'z ichida
     (butun kadr bosilganda). */
  const [openId, setOpenId] = useState<number | null>(null);
  const { events, isLoading } = useDetections({ category: "all", channel: ch, limit: 100 });

  const place = useMemo(() => placeLabel(parseCameraName(cameraName).kind), [cameraName]);

  // Takrorsiz odamlar — `face_id` bo'yicha (`FRONTEND.md` 5-B)
  const people = useMemo(() => {
    const set = new Set<number>();
    for (const e of events) if (typeof e.face_id === "number") set.add(e.face_id);
    return set.size;
  }, [events]);

  const modal = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[88] grid place-items-center bg-[#03060E]/90 p-4 backdrop-blur-md"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${cameraName} — aniqlangan tasvirlar`}
        onClick={(e) => e.stopPropagation()}
        className="flex h-[min(760px,92vh)] w-[min(1100px,96vw)] flex-col overflow-hidden rounded-2xl border border-white/[0.1] bg-[#070d1c]"
      >
        <header className="flex flex-none items-center gap-2.5 border-b border-white/[0.08] px-4 py-3">
          <span className="grid h-8 w-8 flex-none place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-ice-soft">
            <UserFocus size={16} weight="duotone" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold text-white">{cameraName}</p>
            <p className="truncate text-[10px] text-slate-500">
              #{ch}
              {place ? ` · ${place}` : ""} · {events.length} ta hodisa
              {people > 0 ? ` · ${people} ta odam` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            title={t.common.close}
            className="ml-auto grid h-8 w-8 flex-none place-items-center rounded-lg text-slate-400 transition-colors hover:bg-white/[0.08] hover:text-white"
          >
            <X size={16} />
          </button>
        </header>

        {/* Lenta — SCROLL bilan */}
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {isLoading && <p className="py-10 text-center text-[12px] text-slate-500">{t.common.loading}</p>}

          {!isLoading && events.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-16 text-slate-500">
              <ImageBroken size={30} weight="duotone" />
              <p className="text-[12px]">Bu kamerada hodisa qayd etilmagan</p>
            </div>
          )}

          <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-2.5">
            {events.map((ev) => (
              <DetectionShot key={ev.id} ev={ev} onOpen={() => setOpenId(ev.id)} />
            ))}
          </div>
        </div>
      </div>

      {/* Hodisa dossiyesi — shu oynaning USTIDAN (`EventDossier` o'zi
          portal qiladi va z-index'ni hal etadi). */}
      <EventDossier eventId={openId} onClose={() => setOpenId(null)} />
    </motion.div>
  );

  return typeof document === "undefined" ? modal : createPortal(modal, document.body);
}

/** Bitta kadr — rasm + kategoriya rangi + vaqt. */
function DetectionShot({ ev, onOpen }: { ev: NvrEvent; onOpen: () => void }) {
  const tone = NVR_COLOR[ev.category] ?? "#85E0FF";
  const subject = detectSubject(ev);
  /* Yuzda 2 rasm bo'ladi: `index=1` — BUTUN KADR, `index=0` — kesilgan yuz.
     Lentada butun kadr ko'proq ma'no beradi (qayerda sodir bo'lgani ko'rinadi). */
  const shot = nvrImageUrl(ev, ev.image_count > 1 ? 1 : 0);
  return (
    <figure
      style={{ ["--c" as string]: tone }}
      className="overflow-hidden rounded-lg border border-[color-mix(in_srgb,var(--c)_35%,transparent)] bg-black/40 transition-colors hover:border-[color:var(--c)]"
      title={`${nvrDateTime(ev.time)} — tafsilotini ochish`}
    >
      {/* Kadr BOSILADI — hodisa dossiyesi ochiladi */}
      <button type="button" onClick={onOpen} className="relative block w-full cursor-pointer aspect-[4/3] bg-[#04070f]">
        {shot ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={shot}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-slate-600">
            <ImageBroken size={22} weight="duotone" />
          </span>
        )}
      </button>
      <figcaption className="flex items-baseline gap-1.5 px-2 py-1.5">
        <span className="truncate text-[10.5px] font-semibold" style={{ color: tone }}>
          {ev.label}
        </span>
        <span className="ml-auto flex-none font-mono text-[9.5px] text-slate-500">{nvrDateTime(ev.time)}</span>
      </figcaption>
      {subject && <p className="truncate px-2 pb-1.5 text-[10px] text-slate-400">{subject}</p>}
    </figure>
  );
}
