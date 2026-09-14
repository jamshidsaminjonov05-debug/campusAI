/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  HODISA SANOQLARI — SERVER HISOBLAGAN `total` dan                    ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * 🔴 **NEGA KERAK — "DAVR KESIMI" GRAFIGI ESKI KUNLARNI KO'RSATMASDI**
 * (2026-09-13 da topildi, foydalanuvchi skrinshot bilan xabar qildi:
 * "Davr kesimida faqat 3 kunlik natijasi chiqaryabdi, eski ma'lumotlari
 * kelmayabdi").
 *
 * Sabab `useTodayArrivals.ts` da: u oraliqdagi HAR BIR XOM hodisani
 * sahifama-sahifa o'qiydi va xavfsizlik chegarasi bor —
 * `MAX_PAGES (30) × PAGE (100) = 3 000` yozuv. Hodisalar YANGISIDAN
 * ESKISIGA keladi, jonli serverda esa bir kunda ~2 200 qayd bor, ya'ni
 * 3 000 yozuv ATIGI ~1.5 KUNGA yetadi. 30 kunlik oraliq so'ralganda ham
 * grafik faqat oxirgi bir-ikki kunni chizardi, qolgan 28 kun esa NOL
 * bo'lib yotardi — go'yo o'sha kunlarda kamera umuman ishlamagandek.
 *
 * ── YECHIM ────────────────────────────────────────────────────────────
 * Grafikka hodisalarning O'ZI kerak emas, faqat SONI kerak. Server esa
 * har javobda `total` ni beradi (`NvrPage.total`), ya'ni `limit=1` bilan
 * so'ralgan bitta yengil so'rov butun kunning ANIQ sonini qaytaradi.
 *
 * · 30 kunlik oraliq = 30 ta mitti so'rov (har biri 1 yozuv), xom
 *   hodisalarni tortish esa 3 000 yozuv bo'lardi VA baribir noto'g'ri
 *   chiqardi;
 * · natija CHEGARASIZ aniq — oraliq qancha uzun bo'lsa ham har kunning
 *   soni serverning o'z hisobidan keladi.
 *
 * ⚠️ **So'rovlar TO'DA-TO'DA yuboriladi** (`CHUNK`): 30 tasi birdan
 * yuborilsa brauzer ham (origin'ga ~6 ulanish), kuzatuv posti ham
 * bekorga navbatga tushadi — loyihada bu tuzoq allaqachon o'lchangan
 * (32 ta kamera stop-kadri, `CLAUDE.md` "Kameralar" bo'limi).
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listEvents, type NvrQueryCategory } from "@/lib/nvrApi";
import { daysBetween } from "@/hooks/useNvrAttendance";

/** Bir vaqtda yuboriladigan so'rovlar soni. */
const CHUNK = 6;

/** Bitta kun (yoki kategoriya) uchun ANIQ sanoq — serverning `total` i. */
async function countOf(category: NvrQueryCategory, from: string, to: string): Promise<number> {
  const page = await listEvents(category, { limit: 1, date_from: from, date_to: to });
  return page.total ?? page.events?.length ?? 0;
}

/** Ro'yxatni to'da-to'da bajaradi (hammasi birdan emas). */
async function inChunks<T, R>(items: T[], run: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += CHUNK) {
    out.push(...(await Promise.all(items.slice(i, i + CHUNK).map(run))));
  }
  return out;
}

export interface DayCount {
  /** `YYYY-MM-DD` */
  date: string;
  /** O'sha kundagi qaydlar soni — SERVER hisobi. */
  events: number;
}

/**
 * Oraliqning HAR KUNI uchun aniq qayd soni.
 *
 * Chiziqli grafik uchun ishlatiladi — xom hodisalar o'qilmaydi, ya'ni
 * oraliq uzunligi natijaga ta'sir qilmaydi.
 */
export function useEventDailyCounts(from: string, to: string, category: NvrQueryCategory = "all") {
  const days = useMemo(() => daysBetween(from, to), [from, to]);

  const q = useQuery({
    queryKey: ["nvr-daily-counts", category, from, to],
    queryFn: async (): Promise<DayCount[]> => {
      const counts = await inChunks(days, (d) => countOf(category, d, d).catch(() => 0));
      return days.map((date, i) => ({ date, events: counts[i] ?? 0 }));
    },
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });

  const byDate = useMemo(() => new Map((q.data ?? []).map((d) => [d.date, d.events])), [q.data]);
  const total = useMemo(() => (q.data ?? []).reduce((s, d) => s + d.events, 0), [q.data]);

  return { days, rows: q.data ?? [], byDate, total, isLoading: q.isLoading, error: q.error };
}

/** kuzatuv postining HAQIQIY kategoriyalari (`all` — shularning birlashmasi). */
export const NVR_CATEGORIES = ["face", "gun", "janjal", "smoking"] as const;
export type NvrRealCategory = (typeof NVR_CATEGORIES)[number];

/**
 * Oraliqdagi kesim — HAR BIR kategoriya uchun aniq son (4 ta mitti so'rov).
 *
 * ⚠️ Bu yerda ATAYLAB SERVER kategoriyalari ishlatiladi
 * (`face`/`gun`/`janjal`/`smoking`), `DETECTION_TYPES` emas. Sabab —
 * `lib/detectionEvents.ts` `typeFromNvr()`: "Begona odam" faqat
 * TANILMAGAN yuz, "Telefon" esa `smoking` ichidan MATN bo'yicha
 * ajratiladi — ikkalasi ham hodisaning O'ZINI ko'rmasdan aniqlanmaydi,
 * ya'ni xom yozuvlarni tortishni talab qiladi (va yuqoridagi 3 000
 * chegarasiga qaytarardi). Server kategoriyasi esa ANIQ va oraliq
 * uzunligidan mustaqil.
 */
export function useEventCategoryTotals(from: string, to: string) {
  const q = useQuery({
    queryKey: ["nvr-category-totals", from, to],
    queryFn: async (): Promise<Record<NvrRealCategory, number>> => {
      const counts = await inChunks([...NVR_CATEGORIES], (c) => countOf(c, from, to).catch(() => 0));
      return {
        face: counts[0] ?? 0,
        gun: counts[1] ?? 0,
        janjal: counts[2] ?? 0,
        smoking: counts[3] ?? 0,
      };
    },
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });

  const totals = q.data ?? { face: 0, gun: 0, janjal: 0, smoking: 0 };
  const sum = NVR_CATEGORIES.reduce((s, c) => s + totals[c], 0);
  return { totals, sum, isLoading: q.isLoading, error: q.error };
}
