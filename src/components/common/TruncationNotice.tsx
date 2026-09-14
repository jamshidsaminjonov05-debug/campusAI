"use client";

import { ChevronRight } from "lucide-react";

/**
 * "Ro'yxat kesildi" ogohlantirishi.
 *
 * NEGA: qattiq `limit` tufayli ortiqcha yozuvlar jim tushib qolardi va
 * operator to'liq ro'yxatni ko'ryapman deb o'ylardi. Endi chegaraga
 * yetilganda buni ochiq aytamiz.
 *
 * `onMore` berilsa — bosiladigan qator (to'liq sahifaga o'tish yoki
 * ko'proq yuklash), aks holda oddiy yozuv.
 */
export function TruncationNotice({
  shown,
  onMore,
  moreLabel = "Barchasini ko'rish",
}: {
  shown: number;
  onMore?: () => void;
  moreLabel?: string;
}) {
  const text = `Ko'rsatilgan: ${shown} · ro'yxat kesilgan`;

  if (!onMore) {
    return <p className="px-2 py-1.5 text-center text-[10px] text-slate-500">{text}</p>;
  }

  return (
    <button
      onClick={onMore}
      className="flex w-full items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-[10px] text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-ice-bright"
    >
      {text}
      <span className="font-semibold">{moreLabel}</span>
      <ChevronRight size={11} />
    </button>
  );
}
