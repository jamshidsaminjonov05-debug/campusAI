"use client";

import { useEffect, useState } from "react";
import { List, SquaresFour } from "@phosphor-icons/react";

/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  RO'YXAT / KARTOCHKA KO'RINISHI — UMUMIY, BUTUN LOYIHA UCHUN          ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * Avval `AttendanceListModal.tsx`da SINAB ko'rilgan naqsh (2026-09-11,
 * foydalanuvchi so'rovi), endi shu YAGONA joyga ko'chirildi — "Ro'yxat/
 * Kartochka" almashtirgichi qayerda ro'yxat bo'lsa, o'sha yerda BIR XIL
 * ko'rinishda ishlashi kerak (foydalanuvchi so'rovi: "butun loyihaga
 * joriy qilasan qayerda ro'yhat bo'lsa hammasida huddi shu ko'rinishda").
 *
 * Ishlatilishi:
 * ```tsx
 * const [view, setView] = useViewMode("people-all");
 * <ViewToggle mode={view} onChange={setView} />
 * {view === "card" ? <CardGrid/> : <ListRows/>}
 * ```
 */
export type ViewMode = "list" | "card";

/**
 * Tanlovni `localStorage`da saqlaydi — brauzerni yopib ochsa ham
 * oldingi tanlov qoladi. `key` HAR BIR ro'yxat uchun UNIKAL bo'lishi
 * shart — aks holda bitta ro'yxatdagi tanlov boshqasiga ham tarqalib
 * ketardi (masalan "Davomat" ro'yxati "Xodimlar" ro'yxatiga ta'sir
 * qilmasligi kerak).
 */
export function useViewMode(key: string, initial: ViewMode = "list") {
  const storageKey = `hik-view:${key}`;
  const [mode, setMode] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return initial;
    try {
      const v = localStorage.getItem(storageKey);
      return v === "card" || v === "list" ? v : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, mode);
    } catch {
      /* xavfsiz — saqlanmasa ham ro'yxat ishlayveradi */
    }
  }, [mode, storageKey]);
  return [mode, setMode] as const;
}

export function ViewToggle({
  mode,
  onChange,
  className = "",
}: {
  mode: ViewMode;
  onChange: (m: ViewMode) => void;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-none items-center gap-0.5 rounded-lg border border-white/10 bg-white/[0.03] p-0.5 ${className}`}
    >
      <button
        type="button"
        onClick={() => onChange("list")}
        title="Ro'yxat ko'rinishi"
        className={`grid h-6 w-6 place-items-center rounded-md transition-colors ${
          mode === "list" ? "bg-ice/20 text-ice-bright" : "text-slate-500 hover:text-slate-300"
        }`}
      >
        <List size={13} weight={mode === "list" ? "bold" : "regular"} />
      </button>
      <button
        type="button"
        onClick={() => onChange("card")}
        title="Kartochka ko'rinishi"
        className={`grid h-6 w-6 place-items-center rounded-md transition-colors ${
          mode === "card" ? "bg-ice/20 text-ice-bright" : "text-slate-500 hover:text-slate-300"
        }`}
      >
        <SquaresFour size={13} weight={mode === "card" ? "bold" : "regular"} />
      </button>
    </div>
  );
}
