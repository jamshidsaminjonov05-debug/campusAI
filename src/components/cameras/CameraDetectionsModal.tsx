"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { ImageBroken, UserFocus, X } from "@phosphor-icons/react";
import { useDetections } from "@/hooks/useDetections";
import { detectSubject, nvrDateTime, nvrImageUrl, type NvrEvent } from "@/lib/nvr/nvrApi";
import { NVR_COLOR } from "@/components/detections/DetectionCard";
import { parseCameraName, placeLabel } from "@/lib/nvr/cameraNaming";
import { useT } from "@/i18n";
import { EventDossier } from "@/components/detections/EventDossier";
import { useModalHistory } from "@/hooks/useModalHistory";
import { Pagination } from "@/components/common/Pagination";
import { CardGridSkeleton } from "@/components/common/panels";
import { EmptyState } from "@/components/common/EmptyState";

/** Bir sahifadagi kadrlar soni — 4 qator × 5 ustun kenglikda. */
const PAGE = 20;

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
  /* Bosilgan kadrning MA'LUMOTLARI — "Aniqlanganlar" bo'limidagi bilan AYNI
     oyna (`DetectionModal`).
     ⚠️ Ilgari bu yerda faqat RASM KO'RUVCHISI (`ImageLightbox`) ochilardi:
     kadrni kattalashtirish mumkin edi, lekin kim/qachon/qaysi kamera,
     nishon ramkalari, yuz belgilari, video va o'tish kadrlari
     ko'rinmasdi. Kattalashtirish yo'qolmadi — u ma'lumotlarning o'z ichida
     (butun kadr bosilganda). */
  const [openId, setOpenId] = useState<number | null>(null);
  /* 🔵 SAHIFALASH (2026-10-23, foydalanuvchi so'rovi: "hammasini chiqarmasdan
     pagination qilib ber"). Ilgari 100 ta kadr bir yo'la yuklanib, 100 ta
     rasm so'rovi ketardi. Endi 20 tadan, server `offset` bilan; `total`
     serverdan — sahifalar soni ANIQ. */
  const [page, setPage] = useState(1);
  const { events, total, isLoading } = useDetections({ category: "all", channel: ch, limit: PAGE, offset: (page - 1) * PAGE });
  const totalPages = Math.max(1, Math.ceil(total / PAGE));
  const listRef = useRef<HTMLDivElement>(null);
  /* Sahifa almashganda lenta TEPAGA — aks holda yangi sahifa pastdan boshlanib ko'rinardi */
  useEffect(() => {
    listRef.current?.scrollTo({ top: 0 });
  }, [page]);

  const place = useMemo(() => placeLabel(parseCameraName(cameraName).kind), [cameraName]);


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
              {place ? ` · ${place}` : ""} · {total} ta hodisa
              {totalPages > 1 ? ` · ${t.detections.page(page)} / ${totalPages}` : ""}
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
        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-3">
          {isLoading && <CardGridSkeleton count={8} />}

          {!isLoading && events.length === 0 && (
            <EmptyState fill title="Bu kamerada hodisa qayd etilmagan" />
          )}

          <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-2.5">
            {events.map((ev) => (
              <DetectionShot key={ev.id} ev={ev} onOpen={() => setOpenId(ev.id)} />
            ))}
          </div>
        </div>

        {totalPages > 1 && (
          <footer className="flex flex-none items-center justify-center border-t border-white/[0.08] px-4 py-2.5">
            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={setPage}
              prevLabel={t.detections.prev}
              nextLabel={t.detections.next}
              ariaLabel={t.detections.page(page)}
            />
          </footer>
        )}
      </div>

      {/* Hodisa ma'lumotlari — shu oynaning USTIDAN (`EventDossier` o'zi
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
      {/* Kadr BOSILADI — hodisa ma'lumotlari ochiladi */}
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
