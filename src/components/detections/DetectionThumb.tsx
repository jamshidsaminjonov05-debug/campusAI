import { useEffect, useRef, useState } from "react";
import { ImageBroken as ImageOff } from "@phosphor-icons/react";
import { nvrUrl } from "@/config/endpoints";
import type { NvrBox } from "@/lib/nvrApi";
import { useT } from "@/i18n";

/**
 * kuzatuv posti hodisasining kadri.
 *
 * V3 dan farq: u yerda rasm faqat `Authorization` sarlavhasi bilan olinardi
 * va blob → objectURL yasash kerak edi. Bu loyihada kalitni `app/nvr/[...path]`
 * proxy'si SERVER tomonda qo'shadi, ya'ni oddiy `<img src>` yetadi va brauzer
 * rasmni o'zi keshlaydi.
 *
 * DIQQAT — rasm faqat EKRANGA KIRGANDA so'raladi (`IntersectionObserver`):
 * uzun ro'yxat aks holda o'nlab parallel yuklashni boshlab yuboradi.
 *
 * @param index 0 — kesilgan yuz, 1 — butun kadr.
 */
export function DetectionThumb({
  id,
  className = "",
  boxes,
  alt = "",
  eager = false,
  index = 0,
  pictureLost = false,
}: {
  id: number;
  className?: string;
  /** 0..1 normallashgan ramkalar — kadr ustiga chiziladi. */
  boxes?: NvrBox[] | null;
  alt?: string;
  /** Darhol yuklash (doim ko'rinadigan bitta rasm uchun). */
  eager?: boolean;
  index?: number;
  /**
   * Chaqiruvchida to'liq `NvrEvent` bo'lsa `ev.picture_lost` shu yerga
   * beriladi — so'rov UMUMAN yuborilmaydi (`FRONTEND.md` 5-D: 1585 tadan
   * 646 tasi, 41% shunday). Berilmasa (chaqiruvchida faqat `id` bor —
   * masalan `last_event_id`), oldingi `onError` fallback ishlayveradi.
   */
  pictureLost?: boolean;
}) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(eager);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;
    // rootMargin — qator ko'rinishdan sal oldin yuklana boshlasin
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((en) => en.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  // Hodisa almashsa oldingi xato holati qolib ketmasin
  useEffect(() => setFailed(false), [id, index]);

  const src = nvrUrl(`/events/${id}/image${index ? `?index=${index}` : ""}`);
  const dead = pictureLost || failed;

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      {visible && !dead ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            draggable={false}
            onError={() => setFailed(true)}
            /* ⚠️ `text-transparent`: rasm yuklanmay turgan (yoki buzilgan)
               paytda brauzer `alt` MATNINI kadr ustiga chizadi va u
               kartochkadan toshib chiqardi. Xato holati baribir
               `onError` bilan ushlanadi va o'z ikonkasi ko'rsatiladi. */
            className="h-full w-full object-cover text-transparent"
          />
          {/* Nishon ramkalari — koordinatalar 0..1, foizga aylantiriladi */}
          {boxes?.map((b, i) => (
            <span
              key={i}
              className="pointer-events-none absolute border border-rose-400/90"
              style={{
                left: `${b.x * 100}%`,
                top: `${b.y * 100}%`,
                width: `${b.w * 100}%`,
                height: `${b.h * 100}%`,
                boxShadow: "0 0 10px -2px rgba(244,63,94,0.9)",
              }}
            />
          ))}
        </>
      ) : (
        <div className="grid h-full w-full place-items-center bg-black/30 text-slate-600">
          {dead ? <ImageOff size={16} /> : null}
          {dead && <span className="sr-only">{pictureLost ? t.nvr.pictureLost : t.detect.imageFailed}</span>}
        </div>
      )}
    </div>
  );
}
