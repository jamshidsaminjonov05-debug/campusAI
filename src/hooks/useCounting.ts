/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  ODAM SANASH — kirdi / chiqdi / ichkarida (`FRONTEND.md` 10-A bo'lim) ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * ⚠️ Bu hodisa emas, O'LCHOV: `useDetections`/`useNvrEvents` bilan
 * ARALASHMAYDI — o'z manzillari (`/counting/...`), `all` ga tushmaydi.
 *
 * Jonli yangilanish ATAYLAB oddiy so'rov (`refetchInterval`), SSE/WS emas —
 * hujjatning o'zi ham shuni tavsiya qiladi: qurilma daqiqada bir hisobot
 * yuboradi, 30 soniyada bir yangilash yetarli.
 */
import { useQuery } from "@tanstack/react-query";
import {
  getCountingStats,
  listCountingCameras,
  listCountingEvents,
  type CountingQuery,
  type CountingStats,
} from "@/lib/nvrApi";

export function useCountingStats(q: CountingQuery = {}) {
  return useQuery({
    queryKey: ["nvr-counting-stats", q],
    queryFn: () => getCountingStats(q),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

export function useCountingEvents(q: CountingQuery & { limit?: number; offset?: number } = {}) {
  return useQuery({
    queryKey: ["nvr-counting-events", q],
    queryFn: () => listCountingEvents(q),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

export function useCountingCameras() {
  return useQuery({
    queryKey: ["nvr-counting-cameras"],
    queryFn: listCountingCameras,
    staleTime: 60_000,
  });
}

/** Sahifa bo'sh javob bilan ham chizilishi kerak (birinchi yuklanish). */
export const EMPTY_COUNTING_STATS: CountingStats = {
  enter: 0,
  exit: 0,
  pass: 0,
  inside: 0,
  reports: 0,
  today: { enter: 0, exit: 0, pass: 0, reports: 0, inside: 0 },
  all_time: { enter: 0, exit: 0, pass: 0, reports: 0, inside: 0 },
  by_channel: [],
  by_hour: [],
  by_day: [],
  last_report: null,
  live: false,
};
