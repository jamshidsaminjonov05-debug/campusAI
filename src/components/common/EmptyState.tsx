"use client";

import type { ReactNode } from "react";

/**
 * "MA'LUMOT YO'Q" holati — rasm + matn (2026-10-26, foydalanuvchi: "ma'lumot
 * yo'q bo'lsa no items rasmini qo'yib ko'r").
 *
 * Rasm — INLINE SVG (bo'sh quti + lupa): OFFLINE qoidasi tashqi rasmni
 * taqiqlaydi, fayl ham qo'shilmadi (`public/` dagi yangi fayl dev'ni qayta
 * ishga tushirishni talab qilardi). Animatsiya YO'Q — ko'p panelda bir vaqtda
 * turishi mumkin, sahifa og'irlashmasin. Ranglar `currentColor`/past
 * shaffoflikda — qorong'i va yorug' mavzuda ham o'qiladi.
 */
export function EmptyState({
  title,
  hint,
  size,
  compact = false,
  fill = false,
  className = "",
}: {
  title: ReactNode;
  hint?: ReactNode;
  /** Rasm eni (px). Default: 96, `compact`da 52. */
  size?: number;
  /** Tor joy (ochiladigan ro'yxat, kichik panel) — kichik rasm, mayda matn. */
  compact?: boolean;
  /**
   * KATTA joy (sahifa ro'yxati, oyna tanasi) — bo'sh maydonni egallaydi va
   * MARKAZDA turadi, rasm/matn kattaroq (2026-10-26, foydalanuvchi: "topilmasa
   * kattaroq va markazda turishi kerak"). Ilgari kichik rasm yuqori chetda
   * yopishib, ostida katta bo'sh joy qolardi.
   */
  fill?: boolean;
  className?: string;
}) {
  const w = size ?? (compact ? 52 : fill ? 150 : 96);
  const layout = compact ? "gap-1 py-2" : fill ? "min-h-[min(480px,60vh)] w-full flex-1 gap-3 py-8" : "gap-2 py-4";
  return (
    <div className={`flex flex-col items-center justify-center text-center ${layout} ${className}`}>
      <svg
        width={w}
        height={Math.round(w * 0.8)}
        viewBox="0 0 120 96"
        fill="none"
        aria-hidden
        className="text-slate-500"
      >
        {/* Soya */}
        <ellipse cx="58" cy="86" rx="40" ry="5" fill="currentColor" opacity="0.12" />
        {/* Quti — orqa qopqoq */}
        <path d="M22 38 L58 26 L94 38 L58 50 Z" fill="currentColor" opacity="0.10" />
        {/* Quti tanasi */}
        <path d="M22 38 L58 50 L58 82 L22 70 Z" fill="currentColor" opacity="0.18" />
        <path d="M94 38 L58 50 L58 82 L94 70 Z" fill="currentColor" opacity="0.26" />
        <path
          d="M22 38 L58 50 L94 38 M58 50 L58 82 M22 38 L22 70 L58 82 L94 70 L94 38"
          stroke="currentColor"
          strokeOpacity="0.55"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* Ochiq qopqoq qanotlari */}
        <path d="M22 38 L10 28 L46 16 L58 26" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.5" strokeLinejoin="round" fill="currentColor" fillOpacity="0.06" />
        <path d="M94 38 L106 28 L70 16 L58 26" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.5" strokeLinejoin="round" fill="currentColor" fillOpacity="0.06" />
        {/* Lupa — urg'u rangi */}
        <circle cx="86" cy="22" r="10" stroke="#60A5FA" strokeOpacity="0.85" strokeWidth="2.5" fill="#60A5FA" fillOpacity="0.08" />
        <path d="M93.5 29.5 L101 37" stroke="#60A5FA" strokeOpacity="0.85" strokeWidth="3" strokeLinecap="round" />
        {/* Uchqunlar */}
        <path d="M30 14 v6 M27 17 h6" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="106" cy="54" r="1.8" fill="currentColor" opacity="0.4" />
      </svg>
      <p
        className={`${compact ? "text-[11px]" : fill ? "text-[16px]" : "text-[12.5px]"} max-w-[420px] font-semibold leading-snug text-slate-200`}
      >
        {title}
      </p>
      {hint && (
        <p className={`${fill ? "max-w-[420px] text-[12.5px]" : "max-w-[280px] text-[11px]"} leading-snug text-slate-500`}>{hint}</p>
      )}
    </div>
  );
}
