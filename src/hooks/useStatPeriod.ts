"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { localDay } from "@/hooks/useTodayArrivals";
import { getEventStats } from "@/lib/nvr/nvrApi";

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

export type StatPeriodId = "today" | "3d" | "week" | "month" | "all" | "custom";

export const STAT_PERIODS: { id: StatPeriodId; label: string; days: number }[] = [
  { id: "today", label: "Bugun", days: 1 },
  { id: "3d", label: "3 kun", days: 3 },
  { id: "week", label: "Hafta", days: 7 },
  { id: "month", label: "Oy", days: 30 },
  { id: "all", label: "Butun tarix", days: 0 },
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
  /**
   * "Butun tarix" boshlanish sanasi hali serverdan kelmagan (~3.5 s).
   * Shu payt `from`/`to` vaqtincha BUGUN — panellar uni CHIZMASLIGI kerak,
   * yuklanish ko'rsatadi (aks holda bir lahza "1 kun" grafigi chiqardi).
   */
  resolving: boolean;
}

/** `n` kun oldingi sana. */
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - (n - 1));
  return localDay(d);
}

/**
 * "Butun tarix" boshlanishi — serverning O'ZI aytadi (`/events/stats` →
 * `first_event`), sana kodda QOTIRILMAYDI. O'lchandi (2026-10-23): oraliqli
 * so'rov ~3.5 s, oraliqSIZ esa 60 s da ham javob bermagan — shuning uchun
 * keng, lekin CHEGARALI oraliq so'raladi. Faqat "Butun tarix" tanlanganda.
 */
const HISTORY_PROBE_FROM = "2020-01-01";
function useHistoryStart(enabled: boolean): string | null {
  const q = useQuery({
    queryKey: ["nvr-history-start"],
    queryFn: async () => {
      const st = await getEventStats(HISTORY_PROBE_FROM, localDay());
      const first = st.first_event?.slice(0, 10) || st.by_day[0]?.day || null;
      return first;
    },
    enabled,
    staleTime: 60 * 60_000,
  });
  return q.data ?? null;
}

export function useStatPeriod(initial: StatPeriodId = "today"): StatPeriod {
  const [id, setId] = useState<StatPeriodId>(initial);
  const [customFrom, setFrom] = useState(() => daysAgo(14));
  const [customTo, setTo] = useState(() => localDay());
  const historyStart = useHistoryStart(id === "all");

  return useMemo(() => {
    const def = STAT_PERIODS.find((p) => p.id === id) ?? STAT_PERIODS[0];
    /* "Butun tarix" boshlanishi hali kelmagan bo'lsa — BUGUN (panellar
       vaqtincha bugunni ko'rsatadi, sana kelgach o'zi kengayadi). */
    const from =
      id === "custom" ? customFrom : id === "all" ? historyStart ?? localDay() : daysAgo(def.days);
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
      resolving: id === "all" && historyStart == null,
    };
  }, [id, customFrom, customTo, historyStart]);
}
