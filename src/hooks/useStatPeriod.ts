"use client";

import { useMemo, useState } from "react";
import { localDay } from "@/hooks/useTodayArrivals";

/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  STATISTIKA — YAGONA DAVR TANLOVI                                    ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * Sahifaning O'NG YUQORI burchagidagi tanlov: **Bugun / 3 kun / Hafta /
 * Oy / Oraliq**. U BARCHA kesimlarga (Umumiy, Hududlar, Muassasalar,
 * Shaxslar, Hodisalar) bir xil oraliqni beradi.
 *
 * ⚠️ Ilgari har tab o'z davrini o'zi tanlardi (`StatEvents` da alohida
 * pilyulalar, `StatPeople` da sana maydoni) — bir sahifada uch xil davr
 * ochiq turishi mumkin edi va "bugungi" bilan "oylik" sonlar yonma-yon
 * chiqib, ular bir-biriga zid ko'rinardi.
 */

export type StatPeriodId = "today" | "3d" | "week" | "month" | "custom";

export const STAT_PERIODS: { id: StatPeriodId; label: string; days: number }[] = [
  { id: "today", label: "Bugun", days: 1 },
  { id: "3d", label: "3 kun", days: 3 },
  { id: "week", label: "Hafta", days: 7 },
  { id: "month", label: "Oy", days: 30 },
  { id: "custom", label: "Oraliq", days: 0 },
];

export interface StatPeriod {
  id: StatPeriodId;
  setId: (id: StatPeriodId) => void;
  /** `YYYY-MM-DD` */
  from: string;
  to: string;
  setFrom: (v: string) => void;
  setTo: (v: string) => void;
  /** Oraliqdagi kunlar soni (kamida 1). */
  days: number;
  /** Odam o'qiydigan tavsif — panel izohlarida ishlatiladi. */
  label: string;
}

/** `n` kun oldingi sana. */
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - (n - 1));
  return localDay(d);
}

export function useStatPeriod(initial: StatPeriodId = "today"): StatPeriod {
  const [id, setId] = useState<StatPeriodId>(initial);
  const [customFrom, setFrom] = useState(() => daysAgo(14));
  const [customTo, setTo] = useState(() => localDay());

  return useMemo(() => {
    const def = STAT_PERIODS.find((p) => p.id === id) ?? STAT_PERIODS[0];
    const from = id === "custom" ? customFrom : daysAgo(def.days);
    const to = id === "custom" ? customTo : localDay();
    // Kunlar soni — chiziqli diagrammadagi ustunlar uchun
    const ms = new Date(`${to}T00:00:00`).getTime() - new Date(`${from}T00:00:00`).getTime();
    const days = Math.max(1, Math.round(ms / 86_400_000) + 1);
    return {
      id,
      setId,
      from,
      to,
      setFrom,
      setTo,
      days,
      label: id === "custom" ? `${from} … ${to}` : def.label,
    };
  }, [id, customFrom, customTo]);
}
