"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CaretLeft, CaretRight, Minus, Plus, X } from "@phosphor-icons/react";
import { useModalHistory } from "@/hooks/useModalHistory";
import { useT } from "@/i18n";

/**
 * RASM KO'RUVCHISI — kattalashtirish, surish, bir nechta rasm orasida
 * o'tish.
 *
 * ⚠️ **ALOHIDA FAYLGA KO'CHIRILDI** (2026-09-04). Ilgari u
 * `DetectionsPage.tsx` ichida edi va u yerdan eksport qilinardi; endi
 * uni `FaceHistoryModal` ham ishlatadi, o'sha yo'l esa AYLANMA IMPORT
 * yasardi: FaceHistoryModal → DetectionsPage → FaceDatabasePage
 * (`LibraryPhoto`) → FaceHistoryModal. Umumiy komponent umumiy joyda
 * tursa bu muammo butunlay yo'qoladi.
 *
 * 🔴 **YORUG' REJIMDA "×" KO'RINMAY QOLGAN EDI** (2026-09-14,
 * foydalanuvchi skrinshot bilan ko'rsatdi). Sababi `index.css` dagi
 * yorug' mavzu qoidalari (ular `!important`):
 *   · `[class*="bg-black/"]` → deyarli oq parda, ya'ni ko'ruvchi FONI
 *     oqarardi;
 *   · `.text-slate-400` → o'rta kulrang, ya'ni "×" oq parda ustida
 *     kulrang bo'lib, deyarli ko'rinmasdi.
 *
 * Yechim — **ko'ruvchi IKKALA rejimda ham QORONG'I qoladi**: bu MEDIA
 * SAHNASI, kadr o'z rangida ko'rinishi kerak (CLAUDE.md, "Mavzu"
 * bo'limi: "media sahnasi ATAYLAB qorong'i qoladi"). Shuning uchun bu
 * yerda `bg-black/…`, `bg-white/…`, `text-white`, `text-slate-*`
 * sinflari ISHLATILMAYDI — rang inline yoki hex-sinf bilan beriladi,
 * ularga yorug' mavzu qoidalari umuman tegmaydi.
 *
 * ⚠️ `!important` inline uslubdan KUCHLIROQ, shuning uchun "sinfni
 * qoldirib, ustidan inline rang berish" ISHLAMAYDI — sinfning O'ZI
 * olib tashlanishi shart.
 */

/** Qorong'i chrome ranglari — yorug' mavzu qoidalari tegmasin deb hex. */
const CHROME = {
  veil: "rgba(4, 7, 15, 0.95)",
  text: "#F1F5F9",
  soft: "#CBD5E1",
} as const;

export function ImageLightbox({
  images,
  initialIndex,
  onClose,
}: {
  images: { src: string; label: string }[];
  initialIndex: number;
  onClose: () => void;
}) {
  const t = useT();
  /* ◀ "orqaga" avval rasm ko'ruvchisini yopadi — dossiye ochiq qoladi
     (ustma-ust qatlamlar, `lib/modalHistory.ts`). */
  useModalHistory(onClose);
  const [index, setIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(100);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  /** Rasmning EKRANDAGI chegarasi — "tashqarisiga bosilsa yopish" uchun. */
  const imgRef = useRef<HTMLImageElement>(null);
  /** Surish (pan) BO'LDIMI — bo'lsa, sichqoncha qo'yib yuborilgandagi
   *  `click` ko'ruvchini TASODIFAN yopib yubormasin. */
  const movedRef = useRef(false);

  useEffect(() => {
    setZoom(100);
    setPan({ x: 0, y: 0 });
  }, [index]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (images.length > 1 && e.key === "ArrowLeft") setIndex((i) => (i - 1 + images.length) % images.length);
      if (images.length > 1 && e.key === "ArrowRight") setIndex((i) => (i + 1) % images.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, images.length]);

  const current = images[index];
  const zoomBy = (delta: number) => setZoom((z) => Math.min(500, Math.max(100, z + delta)));
  const resetZoom = () => {
    setZoom(100);
    setPan({ x: 0, y: 0 });
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 100) return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragStart.current) return;
    const s = dragStart.current;
    /* 3 px dan ortiq siljish — bu SURISH, bosish emas. */
    if (Math.abs(e.clientX - s.x) > 3 || Math.abs(e.clientY - s.y) > 3) movedRef.current = true;
    setPan({ x: s.panX + (e.clientX - s.x), y: s.panY + (e.clientY - s.y) });
  };
  const stopDrag = () => {
    setDragging(false);
    dragStart.current = null;
  };

  /**
   * RASM TASHQARISIGA bosilsa — yopiladi (2026-09-14, foydalanuvchi
   * so'rovi; ikkala mavzuda ham).
   *
   * ⚠️ `e.target` bilan ajratib bo'lMAYDI: `<img>` da
   * `pointer-events-none` (surish uchun), ya'ni rasm USTIDAGI bosish
   * ham konteynerga tushadi va "tashqari" bilan bir xil ko'rinadi.
   * Shuning uchun bosish nuqtasi rasmning HAQIQIY chegarasi ichidami —
   * shu tekshiriladi (`getBoundingClientRect`, kattalashtirilgan va
   * surilgan holatni ham to'g'ri hisoblaydi).
   */
  const onAreaClick = (e: React.MouseEvent) => {
    if (movedRef.current) {
      movedRef.current = false; // surish edi — yopilmaydi
      return;
    }
    const r = imgRef.current?.getBoundingClientRect();
    const onImage =
      !!r && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!onImage) onClose();
  };

  if (!current) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      /* ⚠️ `bg-black/95` SINFI EMAS — yorug' mavzu uni deyarli oq pardaga
         aylantirardi (yuqoridagi izoh). Rang inline beriladi. */
      className="fixed inset-0 z-[70] flex flex-col backdrop-blur-sm"
      style={{ background: CHROME.veil }}
    >
      <header className="flex flex-none items-center justify-between px-5 py-3" onClick={(e) => e.stopPropagation()}>
        <p className="text-[13px] font-bold" style={{ color: CHROME.text }}>
          {current.label}
        </p>
        <button
          type="button"
          onClick={onClose}
          title={t.common.close}
          className="grid h-8 w-8 place-items-center rounded-md transition-colors hover:bg-[#FFFFFF]/10"
          style={{ color: CHROME.soft }}
        >
          <X size={18} weight="bold" />
        </button>
      </header>

      <div
        className="relative min-h-0 flex-1 overflow-hidden"
        /* Ildizning `onClose` iga chiqmasin — bu yerda O'Z qoidasi bor:
           faqat RASM TASHQARISIGA bosilganda yopiladi. */
        onClick={(e) => {
          e.stopPropagation();
          onAreaClick(e);
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
      >
        <img
          ref={imgRef}
          src={current.src}
          alt={current.label}
          draggable={false}
          className="pointer-events-none absolute left-1/2 top-1/2 max-h-[80vh] max-w-[90vw] select-none object-contain"
          style={{
            transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom / 100})`,
            transition: dragging ? "none" : "transform 0.15s ease",
            cursor: zoom > 100 ? "grab" : "default",
          }}
        />

        {images.length > 1 && (
          <>
            <button
              type="button"
              /* ⚠️ `stopPropagation` SHART — aks holda strelkani bosish
                 "rasm tashqarisi" hisoblanib ko'ruvchi yopilardi. */
              onClick={(e) => {
                e.stopPropagation();
                setIndex((i) => (i - 1 + images.length) % images.length);
              }}
              className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-[#FFFFFF]/10 hover:bg-[#FFFFFF]/20"
              style={{ color: CHROME.text }}
            >
              <CaretLeft size={18} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIndex((i) => (i + 1) % images.length);
              }}
              className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-[#FFFFFF]/10 hover:bg-[#FFFFFF]/20"
              style={{ color: CHROME.text }}
            >
              <CaretRight size={18} />
            </button>
          </>
        )}
      </div>

      <footer
        className="flex flex-none flex-wrap items-center justify-between gap-3 px-5 py-3"
        onClick={(e) => e.stopPropagation()}
      >
        {images.length > 1 ? (
          <div className="flex gap-2">
            {images.map((img, i) => (
              <button
                key={img.label}
                type="button"
                onClick={() => setIndex(i)}
                className={`h-12 w-12 overflow-hidden rounded-md border-2 ${i === index ? "border-ice" : "border-transparent opacity-60"}`}
              >
                <img src={img.src} alt={img.label} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        ) : (
          <span />
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => zoomBy(-25)}
            className="grid h-8 w-8 place-items-center rounded-lg bg-[#FFFFFF]/[0.08] hover:bg-[#FFFFFF]/[0.16]"
            style={{ color: CHROME.text }}
          >
            <Minus size={14} />
          </button>
          <span className="w-12 text-center font-mono text-[12px]" style={{ color: CHROME.soft }}>
            {zoom}%
          </span>
          <button
            type="button"
            onClick={() => zoomBy(25)}
            className="grid h-8 w-8 place-items-center rounded-lg bg-[#FFFFFF]/[0.08] hover:bg-[#FFFFFF]/[0.16]"
            style={{ color: CHROME.text }}
          >
            <Plus size={14} />
          </button>
          <button
            type="button"
            onClick={resetZoom}
            className="rounded-lg bg-[#FFFFFF]/[0.08] px-3 py-1.5 text-[12px] font-semibold hover:bg-[#FFFFFF]/[0.16]"
            style={{ color: CHROME.text }}
          >
            {t.nvr.resetZoom}
          </button>
          <a
            href={current.src}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-[#FFFFFF]/[0.08] px-3 py-1.5 text-[12px] font-semibold hover:bg-[#FFFFFF]/[0.16]"
            style={{ color: CHROME.text }}
          >
            {t.nvr.openInNewTab}
          </a>
        </div>
      </footer>
    </motion.div>
  );
}
