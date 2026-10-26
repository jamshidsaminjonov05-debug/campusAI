"use client";

import { useMemo } from "react";
import { attDay } from "@/hooks/useNvrAttendance";
import { dayMonthLongLabel, weekdayLongLabel } from "@/lib/dateLabel";
import { useT } from "@/i18n";

/**
 * "BUGUNGI HOLAT" SARLAVHASI — Statistika → Davomat / O'qituvchi / O'quvchilar
 * tablaridagi yuqori KPI qatori ustida.
 *
 * Foydalanuvchi so'rovi (2026-10-23): "bugungi holat davomat qismida
 * bugungiligini bildirib tursin". Ilgari Davomat tabida bu shunchaki so'niq
 * "BUGUNGI HOLAT" matni edi, O'qituvchi tabida esa sana pilyulasi bor edi —
 * ikki tab ikki xil ko'rinardi. Endi BITTA komponent:
 *   · yashil pulsatsiyalanuvchi nuqta — "jonli", bugungi kun;
 *   · aniq "BUGUN" nishoni;
 *   · to'liq sana + hafta kuni pilyulasi (`dateLabel.ts` — lug'atdan,
 *     `toLocaleDateString` EMAS, CLAUDE.md "SANA YORLIQLARI");
 *   · dam olish kunida sariq izoh;
 *   · hover `title` — sonlar davr tanloviga bog'liq emasligi.
 *
 * Sana `attDay()` dan — SERVER soati bo'yicha bugun (`serverClock`), ya'ni
 * klient soati noto'g'ri bo'lsa ham kuzatuv posti bilan bir xil kun.
 */
export function TodayStateHeading({ isWeekend = false, className = "" }: { isWeekend?: boolean; className?: string }) {
  const t = useT();
  const todayKey = attDay();
  const todayDate = useMemo(() => new Date(`${todayKey}T00:00:00`), [todayKey]);
  const s = t.stats.todayState;

  return (
    <div
      className={`flex flex-none flex-wrap items-center gap-x-2.5 gap-y-1.5 ${className}`}
      title={s.hint}
    >
      {/* Jonli nuqta — `animate-ping` ichki elementda, tashqi `span` qimirlamaydi */}
      <span className="relative flex h-2 w-2 flex-none">
        <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/70" />
        <span className="relative h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
      </span>

      {/* 2026-10-24 (UX tahlili): ilgari bir xil ma'lumot TO'RT marta
          takrorlanardi ("BUGUNGI HOLAT | BUGUN | 24-oktabr · Shan |
          2026-10-24"). Endi BITTA toza sarlavha: "Bugungi holat: 24-oktabr
          2026 (Shanba)" + "Bugun" nishoni; ISO sana faqat `title`da. */}
      <span className="text-[11px] font-semibold uppercase tracking-wider text-ice-cyan/80">{s.label}:</span>

      <span className="font-mono text-[12px] font-bold text-slate-100" title={todayKey}>
        {dayMonthLongLabel(todayDate, t)} {todayDate.getFullYear()}
        <span className="font-sans font-medium text-slate-400"> ({weekdayLongLabel(todayDate, t)})</span>
      </span>

      <span className="rounded-full border border-emerald-400/35 bg-emerald-400/[0.12] px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-emerald-300">
        {s.badge}
      </span>

      {isWeekend && (
        <span className="rounded-full border border-amber-400/30 bg-amber-400/[0.1] px-2 py-0.5 text-[9.5px] font-semibold text-amber-300">
          {t.board.weekend}
        </span>
      )}
    </div>
  );
}
