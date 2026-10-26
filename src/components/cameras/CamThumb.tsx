"use client";

import { memo, useEffect, useRef, useState } from "react";
import { cachedThumb, loadThumb } from "@/lib/nvr/cameraThumbs";

/* `CamerasPage.tsx`dan ko'chirildi (2026-10-26) — Boshqaruv panelidagi
   kameralar oynasi (`CamerasListModal`) ham AYNI kartochka rasmini ishlatadi. */
/**
 * Kartochkadagi STOP-KADR — bitta JPEG (`/channels/{ch}/snapshot`).
 *
 * Panjarada jonli oqim ATAYLAB ochilmaydi: 32 ta MJPEG uzluksiz ulanish
 * demakdir. Snapshot esa oddiy so'rov — darhol tugaydi.
 *
 * Surat BIR MARTA olinadi va sessiya davomida saqlanadi
 * (`lib/cameraThumbs.ts`): sahifadan chiqib qaytilganda ham, ro'yxat
 * yangilanganda ham u QAYTA YUKLANMAYDI va kartochka "sakramaydi".
 * Yuklash faqat kartochka ekranga yaqinlashganda boshlanadi
 * (`IntersectionObserver`) va bir vaqtda 4 tadan oshmaydi.
 */
export const CamThumb = memo(function CamThumb({ channel, bust }: { channel: number; bust?: number }) {
  const [src, setSrc] = useState<string | null>(() => cachedThumb(channel) ?? null);
  const slotRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (src) return;
    const el = slotRef.current;
    if (!el) return;
    let alive = true;

    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        loadThumb(channel, bust).then((url) => {
          if (alive && url) setSrc(url);
        });
      },
      { rootMargin: "300px" } // ekranga yaqinlashganda oldindan boshlanadi
    );
    io.observe(el);
    return () => {
      alive = false;
      io.disconnect();
    };
  }, [channel, bust, src]);

  /* Stop-kadr kelguncha — skelet to'lqini (kelgach `<img>` bilan almashadi) */
  if (!src) return <span ref={slotRef} className="cam-card-img skeleton-shimmer overflow-hidden bg-white/[0.04]" aria-hidden />;
  return <img src={src} alt="" decoding="async" className="cam-card-img" />;
});
