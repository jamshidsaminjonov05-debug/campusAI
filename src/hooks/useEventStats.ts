/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  HODISA STATISTIKASI — `GET /api/v1/events/stats` (server sanaydi)   ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * 🔴 **NEGA** (2026-09-15, foydalanuvchi Network skrinshoti bilan xabar
 * qildi): Boshqaruv panelidagi "Hodisa turlari" `useArrivals({})` bilan
 * butun tarixni 100 tadan 30 sahifa + 3 ta kam uchraydigan kategoriya =
 * **33 so'rov** qilib o'qirdi, HAR 60 SONIYADA (~2.4 MB). Sonlar esa
 * NOTO'G'RI edi: 3 000 yozuv amalda ~1 kunga yetardi. Server esa
 * hammasini BAZADA sanab, BITTA so'rovda beradi (o'lchandi: butun tarix
 * 1.3 KB / 0.8 s, bir kun 541 B / 0.06 s).
 *
 * ── QOIDA ─────────────────────────────────────────────────────────────
 * · Diagramma / KPI uchun SON kerak — shu hook (`useEventStats`,
 *   shaxslar soni uchun `useFacesCount`).
 * · Xom yozuv (kadr, ro'yxat) kerak — faqat KO'RINADIGAN sahifa so'raladi
 *   (`listEvents` `limit`/`offset`), butun oraliq o'qilmaydi.
 *
 * ⚠️ Faqat SERVER kategoriyalari (`face`/`gun`/`janjal`/`smoking`):
 * "Begona odam" (tanilmagan yuz) va "Telefon" ajratmasi YO'Q, serverda
 * `recognized`/`known` filtri ham yo'q (o'lchandi — parametr e'tiborsiz
 * qoldiriladi). Kamera kesimi va `alerts` ham KATEGORIYAGA bo'linmagan.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getEventStats, listFaces, type NvrEventStats } from "@/lib/nvrApi";
import { NVR_CATEGORIES, type NvrRealCategory } from "@/hooks/useEventCounts";

export interface StatsRange {
  /** `YYYY-MM-DD`. Ikkalasi ham bo'sh — BUTUN tarix. */
  from?: string;
  to?: string;
  enabled?: boolean;
}

/** Bitta kun — har kategoriya nol bilan to'ldirilgan (server faqat noldan kattasini beradi). */
export type StatsDay = { day: string; total: number } & Record<NvrRealCategory, number>;

export interface StatsAnomaly {
  category: NvrRealCategory;
  /** Oxirgi kundagi soni. */
  count: number;
  /** Oldingi kunlardagi kunlik o'rtacha (bir kasrgacha). */
  usual: number;
}

export interface EventStatsView {
  total: number;
  /** Server `alert` bayrog'i qo'yilganlari. */
  alerts: number;
  byCategory: Record<NvrRealCategory, number>;
  /** "Xavf signali" — janjal + qurol (foydalanuvchi ta'rifi, `isDangerEvent` bilan AYNI). */
  danger: number;
  /** 24 katak — soatlik zichlik. */
  hourly: number[];
  peakHour: number | null;
  peakCount: number;
  /** Eskidan yangiga. Faqat hodisa BO'LGAN kunlar (server bo'sh kunni bermaydi). */
  byDay: StatsDay[];
  /** Ko'pidan ozga. */
  byChannel: { channel: string; camera: string; total: number }[];
  firstEvent: string | null;
  lastEvent: string | null;
  /** Oxirgi hodisali kun — anomaliya shu kun uchun. */
  lastDay: string | null;
  /** Odatdagidan sezilarli oshgan kategoriyalar (`lib/aiSummary.ts` bilan AYNI qoida). */
  anomalies: StatsAnomaly[];
  isLoading: boolean;
  error: unknown;
}

/* `lib/aiSummary.ts` dagi chegaralar bilan AYNI — ikki joyda "anomaliya"
   boshqa-boshqa ma'no bermasin. */
const MIN_HISTORY_DAYS = 3;
const ANOMALY_FACTOR = 2;
const ANOMALY_MIN = 3;

const zeroCats = (): Record<NvrRealCategory, number> => ({ face: 0, gun: 0, janjal: 0, smoking: 0 });

/** Xom server javobini UI qulay shaklga keltiradi (sof funksiya). */
export function summarizeStats(d?: NvrEventStats): Omit<EventStatsView, "isLoading" | "error"> {
  const byCategory = zeroCats();
  for (const c of NVR_CATEGORIES) byCategory[c] = d?.by_category?.[c] ?? 0;

  const hourly = Array<number>(24).fill(0);
  for (const h of d?.by_hour ?? []) {
    const i = Number(h.hour);
    if (Number.isInteger(i) && i >= 0 && i < 24) hourly[i] += h.total ?? 0;
  }
  let peakHour: number | null = null;
  let peakCount = 0;
  hourly.forEach((v, h) => {
    if (v > peakCount) {
      peakCount = v;
      peakHour = h;
    }
  });

  const byDay: StatsDay[] = (d?.by_day ?? [])
    .map((r) => {
      const row = { day: r.day, total: r.total ?? 0, ...zeroCats() };
      for (const c of NVR_CATEGORIES) row[c] = r[c] ?? 0;
      return row;
    })
    .sort((a, b) => (a.day < b.day ? -1 : 1));

  /* Anomaliya: oxirgi hodisali kun ↔ oldingi kunlarning o'rtachasi.
     ⚠️ Server hodisasiz kunni bermaydi, ya'ni o'rtacha "hodisa bo'lgan
     kunlar" bo'yicha — nol kunlar hisobni pasaytirmaydi (ehtiyotkor tomon). */
  const last = byDay[byDay.length - 1];
  const others = byDay.slice(0, -1);
  const anomalies: StatsAnomaly[] = [];
  if (last && others.length >= MIN_HISTORY_DAYS - 1) {
    for (const c of NVR_CATEGORIES) {
      const usual = others.reduce((s, r) => s + r[c], 0) / others.length;
      if (last[c] >= Math.max(ANOMALY_MIN, usual * ANOMALY_FACTOR)) {
        anomalies.push({ category: c, count: last[c], usual: Math.round(usual * 10) / 10 });
      }
    }
    anomalies.sort((a, b) => b.count - a.count);
  }

  return {
    total: d?.total ?? 0,
    alerts: d?.alerts ?? 0,
    byCategory,
    danger: byCategory.janjal + byCategory.gun,
    hourly,
    peakHour,
    peakCount,
    byDay,
    byChannel: [...(d?.by_channel ?? [])].sort((a, b) => b.total - a.total),
    firstEvent: d?.first_event ?? null,
    lastEvent: d?.last_event ?? null,
    lastDay: last?.day ?? null,
    anomalies,
  };
}

/** Oraliqsiz (butun tarix) so'rov og'irroq va sekin o'zgaradi — kamroq yangilanadi. */
const timing = (ranged: boolean) =>
  ranged ? { refetchInterval: 60_000, staleTime: 45_000 } : { refetchInterval: 5 * 60_000, staleTime: 4 * 60_000 };

export function useEventStats({ from, to, enabled = true }: StatsRange = {}): EventStatsView {
  const q = useQuery({
    queryKey: ["nvr-event-stats", from ?? "", to ?? ""],
    queryFn: () => getEventStats(from, to),
    enabled,
    ...timing(Boolean(from || to)),
  });
  const view = useMemo(() => summarizeStats(q.data), [q.data]);
  return { ...view, isLoading: q.isLoading, error: q.error };
}

/**
 * Oraliqda nechta HAR XIL odam ko'ringan — `GET /faces?limit=1`.
 *
 * Server shaxslarni O'ZI birlashtiradi va `total`/`known`/`unknown` ni
 * beradi, ya'ni ro'yxatning o'zi kerak emas (bitta qator + sonlar).
 */
export function useFacesCount({ from, to, enabled = true }: StatsRange = {}) {
  const q = useQuery({
    queryKey: ["nvr-faces-count", from ?? "", to ?? ""],
    queryFn: () => listFaces({ limit: 1, date_from: from, date_to: to }),
    enabled,
    ...timing(Boolean(from || to)),
  });
  return {
    total: q.data?.total ?? 0,
    known: q.data?.known ?? 0,
    unknown: q.data?.unknown ?? 0,
    isLoading: q.isLoading,
    error: q.error,
  };
}
