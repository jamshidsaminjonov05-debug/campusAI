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
 */
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
    setPan({ x: s.panX + (e.clientX - s.x), y: s.panY + (e.clientY - s.y) });
  };
  const stopDrag = () => {
    setDragging(false);
    dragStart.current = null;
  };

  if (!current) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[70] flex flex-col bg-black/95 backdrop-blur-sm"
    >
      <header className="flex flex-none items-center justify-between px-5 py-3" onClick={(e) => e.stopPropagation()}>
        <p className="text-[13px] font-bold text-white">{current.label}</p>
        <button
          type="button"
          onClick={onClose}
          title={t.common.close}
          className="grid h-8 w-8 place-items-center rounded-md text-slate-400 hover:bg-white/10 hover:text-white"
        >
          <X size={18} />
        </button>
      </header>

      <div
        className="relative min-h-0 flex-1 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={stopDrag}
        onMouseLeave={stopDrag}
      >
        <img
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
              onClick={() => setIndex((i) => (i - 1 + images.length) % images.length)}
              className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
            >
              <CaretLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => setIndex((i) => (i + 1) % images.length)}
              className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
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
            className="grid h-8 w-8 place-items-center rounded-lg bg-white/[0.06] text-slate-200 hover:bg-white/[0.12]"
          >
            <Minus size={14} />
          </button>
          <span className="w-12 text-center font-mono text-[12px] text-slate-300">{zoom}%</span>
          <button
            type="button"
            onClick={() => zoomBy(25)}
            className="grid h-8 w-8 place-items-center rounded-lg bg-white/[0.06] text-slate-200 hover:bg-white/[0.12]"
          >
            <Plus size={14} />
          </button>
          <button
            type="button"
            onClick={resetZoom}
            className="rounded-lg bg-white/[0.06] px-3 py-1.5 text-[12px] font-semibold text-slate-200 hover:bg-white/[0.12]"
          >
            {t.nvr.resetZoom}
          </button>
          <a
            href={current.src}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-white/[0.06] px-3 py-1.5 text-[12px] font-semibold text-slate-200 hover:bg-white/[0.12]"
          >
            {t.nvr.openInNewTab}
          </a>
        </div>
      </footer>
    </motion.div>
  );
}

