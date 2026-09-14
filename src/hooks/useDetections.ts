/**
 * 3D kampus uchun aniqlash hodisalari — `useNvrEvents` ustidagi yupqa qatlam.
 *
 * Nega alohida hook: `Campus3D`/`BuildingInterior` hodisalarni FILTR bilan
 * (kategoriya, kanal, faqat xavfli) so'raydi va SSE oqimiga muhtoj emas —
 * ular qisqa, jonli bo'lmagan kesimlar. `useNvrEvents` esa har chaqiruvda
 * to'rtta SSE ochadi; bino ichida 5 ta qavat komponenti bo'lsa bu 20 ta
 * ulanish demakdir. Shuning uchun bu yerda faqat React Query ishlatiladi
 * (`refetchInterval` bilan jonli), SSE esa "Aniqlanganlar" sahifasida qoladi.
 *
 * `all` — serverdagi HAQIQIY kategoriya (to'rttasining birlashmasi), ya'ni
 * BITTA so'rov. Ilgari bunday kategoriya yo'q edi va to'rttasi parallel
 * so'ralardi.
 *
 * Ro'yxat `group=true` bilan olinadi (`FRONTEND.md` 4-A): yuz kamerasi bir
 * odamning bitta o'tishida o'nlab kadr yuboradi — yig'masdan xarita markerlari
 * ham, yon panel ham o'sha odamning nusxalari bilan to'lib ketardi.
 */
import { useMemo } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { isAlarm, listEvents, type NvrCategory, type NvrEvent, type NvrQuery } from "@/lib/nvrApi";

/** Jonli ro'yxat shu oraliqda yangilanadi (SSE o'rniga oddiy polling). */
const LIVE_MS = 15_000;

export const DETECT_CATEGORIES: NvrCategory[] = ["face", "gun", "janjal", "smoking"];

/** UI filtri: `all` — barcha kategoriya, aks holda bittasi. */
export type CategoryFilter = "all" | NvrCategory;

export interface DetectionFilters {
  category: CategoryFilter;
  /** Faqat xavfli (qurol yoki `alert:true`). */
  alarmOnly?: boolean;
  /** Faqat oxirgi 24 soat. */
  last24h?: boolean;
  /** `YYYY-MM-DD` — berilsa `last24h` e'tiborga olinmaydi. */
  dateFrom?: string;
  /** `YYYY-MM-DD`. */
  dateTo?: string;
  /** Kanal raqami (`channel`). */
  channel?: string;
  /** HAR BIR kategoriyadan so'raladigan yozuvlar soni. */
  limit?: number;
  /** `true` (default) — birlashtirilgan ro'yxat `limit` gacha kesiladi. */
  trim?: boolean;
  /** Takroriy kadrlarni yig'ish — DEFAULT YOQIQ (`FRONTEND.md` 4-A). */
  group?: boolean;
}

/** `YYYY-MM-DD` — server `date_from` shu formatni kutadi. */
function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function useDetections(f: DetectionFilters) {
  const limit = f.limit ?? 30;
  const trim = f.trim ?? true;
  // `all` — serverdagi HAQIQIY kategoriya (4 ta parallel so'rov endi kerak emas)
  const cat = f.category;

  const group = f.group ?? true;

  const q: NvrQuery = useMemo(() => {
    const base: NvrQuery = { limit, camera: f.channel, group };
    if (f.dateFrom || f.dateTo) {
      if (f.dateFrom) base.date_from = f.dateFrom;
      if (f.dateTo) base.date_to = f.dateTo;
    } else if (f.last24h) {
      base.date_from = isoDate(new Date(Date.now() - 24 * 3600_000));
    }
    return base;
  }, [limit, f.channel, f.last24h, f.dateFrom, f.dateTo, group]);

  const query = useQuery({
    queryKey: ["detections", cat, q],
    queryFn: () => listEvents(cat, q),
    refetchInterval: LIVE_MS,
    placeholderData: keepPreviousData,
  });

  const { data, isLoading, error, refetch } = query;

  return useMemo(() => {
    let events: NvrEvent[] = data?.events ?? [];
    // Server sanasi kunlik — soatlik aniqlikni o'zimiz kesamiz (faqat
    // `last24h` uchun; aniq sana oralig'i berilganda server filtri yetarli)
    if (f.last24h && !f.dateFrom && !f.dateTo) {
      const cut = Date.now() - 24 * 3600_000;
      events = events.filter((e) => new Date(e.time).getTime() >= cut);
    }
    if (f.alarmOnly) events = events.filter(isAlarm);
    events = [...events].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    return {
      events: trim ? events.slice(0, limit) : events,
      total: data?.total ?? 0,
      isLoading,
      error,
      refetch,
    };
  }, [data, isLoading, error, refetch, f.alarmOnly, f.last24h, f.dateFrom, f.dateTo, limit, trim]);
}

/**
 * Kamera ro'yxati — kameralar aniqlangan hodisalardan yig'iladi
 * (`channel` → `camera` nomi). Bino ichki ko'rinishi shundan foydalanadi.
 */
export interface DetectionCamera {
  channel: string;
  name: string;
  /** Shu kanaldagi HODISALAR soni. */
  count: number;
  /**
   * Shu kanal ANIQLAGAN ODAMLAR soni — takrorsiz `face_id` lar.
   *
   * NEGA `face_id`: `FRONTEND.md` 5-B ga ko'ra bir xil yuz DOIM bir xil
   * raqamni oladi (odam yuz bazasida bo'lmasa ham). Hodisalarni sanash
   * noto'g'ri bo'lardi — bitta odam kadrda turgan har soniyada hodisa
   * yuboriladi. `face_id` yo'q hodisalar (qurol, chekish...) sanalmaydi.
   */
  people: number;
  last: string;
}

export function useDetectionCameras() {
  const { events, isLoading, error } = useDetections({ category: "all", limit: 100 });
  const cameras = useMemo(() => {
    const map = new Map<string, DetectionCamera>();
    // Kanal → ko'rilgan `face_id` lar (takrorsiz sanash uchun)
    const faces = new Map<string, Set<number>>();
    for (const e of events) {
      const prev = map.get(e.channel);
      if (prev) {
        prev.count++;
        if (e.time > prev.last) prev.last = e.time;
      } else {
        map.set(e.channel, { channel: e.channel, name: e.camera, count: 1, people: 0, last: e.time });
      }
      if (typeof e.face_id === "number") {
        const set = faces.get(e.channel) ?? new Set<number>();
        set.add(e.face_id);
        faces.set(e.channel, set);
      }
    }
    for (const [ch, set] of faces) {
      const row = map.get(ch);
      if (row) row.people = set.size;
    }
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "uz"));
  }, [events]);
  return { cameras, isLoading, error };
}
