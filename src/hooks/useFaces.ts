/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  KAMERAGA TUSHGAN ODAMLAR — `GET /api/v1/faces`                      ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * `FRONTEND.md` 5-C bo'limi. Bitta so'rov: server odamlarni O'ZI yig'adi
 * (bir odamning bir necha `face_id` si `face_ids` ga birlashtiriladi),
 * kamera kesimini ham qo'shib beradi.
 *
 * ⚠️ **BU `useArrivals` NING O'RNIGA KELDI** (shaxs sanog'i uchun).
 * Ilgari son klientda hisoblanardi: kunning barcha hodisalari
 * sahifama-sahifa o'qilib (11 ta so'rov), `face_id` lar to'plamga
 * yig'ilardi. Server birlashtirishni O'ZI qilgani uchun uning soni
 * aniqroq — bugungi kun uchun klient **640**, server **620** bergan
 * (o'lchandi 2026-09-02). `useArrivals` esa XOM hodisa oqimi kerak
 * bo'lgan joylarda qoladi (Statistika → Hodisalar, HUD oqimi, trevoga
 * sanog'i).
 */
import { useQuery } from "@tanstack/react-query";
import { listFaces, type NvrFaceRow, type NvrFacesQuery } from "@/lib/nvrApi";

/** Bitta so'rovdagi maksimal yozuv — serverning o'z chegarasi. */
const PAGE = 100;

export interface FacesView {
  /** Nechta HAR XIL odam ko'ringan — ASOSIY son. */
  total: number;
  /** Shundan yuz bazasida bor. */
  known: number;
  unknown: number;
  /** Ko'rsatiladigan yozuvlar (birinchi sahifa). */
  faces: NvrFaceRow[];
  /** Kanal kesimi — qaysi kameradan nechta odam va nechta qayd. */
  byChannel: { channel: string; camera: string; people: number; events: number }[];
  /** Soatlik taqsimot — odam BIRINCHI marta ko'ringan soat bo'yicha. */
  byHour: { hour: number; people: number }[];
  /** Ko'rilgan qaydlar yig'indisi (birinchi sahifadagi odamlar bo'yicha). */
  events: number;
  isLoading: boolean;
  error: unknown;
}

export interface FacesOptions extends NvrFacesQuery {
  /** So'rov umuman yuborilsinmi (oyna yopiq bo'lsa — yo'q). */
  enabled?: boolean;
}

export function useFaces(opts: FacesOptions = {}): FacesView {
  const { enabled = true, limit = PAGE, ...q } = opts;

  const query = useQuery({
    queryKey: ["nvr-faces", limit, q],
    queryFn: () => listFaces({ ...q, limit }),
    enabled,
    refetchInterval: 60_000,
    staleTime: 45_000,
  });

  const faces = query.data?.faces ?? [];

  /* Kanal kesimi — har odamning `cameras[]` idan yig'iladi.
     ODAMLAR takrorsiz sanaladi: bitta odam ikki kameradan o'tsa, u
     ikkalasida ham bir marta hisoblanadi (bu "shu kameradan nechta odam
     o'tdi" degani, "jami odam" emas). */
  const chan = new Map<string, { channel: string; camera: string; people: number; events: number }>();
  for (const f of faces) {
    for (const c of f.cameras ?? []) {
      const row = chan.get(c.channel) ?? { channel: c.channel, camera: c.camera, people: 0, events: 0 };
      row.people++;
      row.events += c.count;
      chan.set(c.channel, row);
    }
  }

  const hours = new Array(24).fill(0) as number[];
  for (const f of faces) {
    const h = new Date(f.first_seen).getHours();
    if (h >= 0 && h < 24) hours[h]++;
  }

  return {
    total: query.data?.total ?? 0,
    known: query.data?.known ?? 0,
    unknown: query.data?.unknown ?? 0,
    faces,
    byChannel: [...chan.values()].sort((a, b) => b.people - a.people),
    byHour: hours.map((people, hour) => ({ hour, people })),
    events: faces.reduce((s, f) => s + f.count, 0),
    isLoading: query.isLoading,
    error: query.error,
  };
}
