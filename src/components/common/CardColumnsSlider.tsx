"use client";

import { SquaresFour } from "@phosphor-icons/react";
import { CARD_COLS_MAX, CARD_COLS_MIN, setCardColumns, useCardColumns } from "@/hooks/useCardColumns";
import { useT } from "@/i18n";

/**
 * Ustunlar slayderi — "Aniqlanganlar" va "Ogohlantirishlar" to'ri uchun
 * (`useCardColumns`). Qiymat yonida son, hover'da izoh. Uslub — Kameralar sahifasidagi
 * `.cam-cols-range` (`index.css`), ikkala slayder bir xil ko'rinsin.
 */
export function CardColumnsSlider({ className = "" }: { className?: string }) {
  const t = useT();
  const cols = useCardColumns();
  return (
    <label
      className={`flex items-center gap-2 text-[10.5px] font-semibold text-slate-400 ${className}`}
      title={t.nvr.cardColumns(cols)}
    >
      <SquaresFour size={14} weight="duotone" className="flex-none text-slate-500" />
      <input
        type="range"
        min={CARD_COLS_MIN}
        max={CARD_COLS_MAX}
        step={1}
        value={cols}
        onChange={(e) => setCardColumns(Number(e.target.value))}
        className="cam-cols-range"
        aria-label={t.nvr.cardColumns(cols)}
      />
      <span className="w-3 font-mono text-[11px] text-slate-200">{cols}</span>
    </label>
  );
}
