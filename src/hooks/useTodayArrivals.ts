/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  BUGUN KELGAN SHAXSLAR — to'liq sanoq                                ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * ── NEGA ALOHIDA HOOK ─────────────────────────────────────────────────
 * Ilgari "Aniqlangan odamlar" ko'rsatkichi `useDetectionCameras()` dan
 * olinardi, u esa faqat OXIRGI 100 hodisani so'raydi. Natijada
 * (2026-09-02 da o'lchandi) panel **56** ta odam ko'rsatardi, kun
 * davomida esa **640** ta turli shaxs o'tgan edi. Ya'ni son "bugungi
 * jami" emas, "oxirgi bir necha daqiqa" edi.
 *
 * ── O'LCHANGAN HAQIQAT (2026-09-02, `<nvr-server-ip>:7007`) ───────────────
 * · `GET /face/events?date_from=<bugun>` → **1082** xom hodisa;
 * · takrorsiz `face_id` → **640** ta shaxs;
 * · `face_id` yo'q hodisa → 86 ta (yuz sifati past — shaxs ajratilmagan);
 * · `recognized:true` → atigi 2 ta (yuz bazasi deyarli bo'sh);
 * · kanallar: **31** (1074) va **32** (8) — kirish posti kameralari.
 *
 * ⚠️ **BACKEND BU YERDA YORDAM BERMAYDI.** O'lchandi: `/api/v1/persons`
 * da jami **3** ta yozuv, `/api/v1/attendance?date=<bugun>` esa
 * **2026-07-15** dagi ikkita eski qatorni qaytaradi (sana filtri
 * e'tiborga olinmaydi). Shuning uchun "bugun kelganlar" YAGONA ishonchli
 * manbasi — kuzatuv posti yuz hodisalari.
 *
 * ── NEGA `group=true` EMAS ────────────────────────────────────────────
 * Yig'ish bitta O'TISHNI bitta qatorga aylantiradi, lekin `offset` XOM
 * hodisalar bo'yicha ishlaydi (o'lchandi: `offset=90` da 87 qator qaytdi).
 * Ya'ni yig'ilgan ro'yxatni sahifalab aniq sanab bo'lmaydi. Shu sababli
 * xom hodisalar o'qiladi va takrorsizlik `face_id` bo'yicha KLIENTDA
 * hisoblanadi — `face_id` doim bir xil shaxsga tegishli
 * (`FRONTEND.md` 5-B), shuning uchun bu ANIQ sanoq.
 */
import { useQuery } from "@tanstack/react-query";
import { NVR_MAX_LIMIT, isAlarm, listEvents, type NvrEvent, type NvrQueryCategory } from "@/lib/nvrApi";
import { nowAdjusted } from "@/lib/serverClock";

/**
 * Bitta so'rovdagi yozuv — serverning o'z chegarasi (`NVR_MAX_LIMIT` = 500).
 *
 * 🔴 **2026-09-15 gacha 100 edi** — server chegarasi 2026-09-03 da 500 ga
 * ko'tarilgan, bu yer esa eskicha qolgan edi. Natijada Boshqaruv panelidagi
 * "Hodisa turlari" (`useArrivals({})`) HAR 60 SONIYADA 30+3 = 33 ta so'rov
 * yuborardi (foydalanuvchi Network skrinshoti bilan xabar qildi). Endi o'sha
 * 3 000 yozuv 6 ta so'rovda keladi (o'lchandi: `limit=500` — ~400 KB, ~0.06 s).
 */
const PAGE = NVR_MAX_LIMIT;
/**
 * Xavfsizlik chegarasi: eng ko'pi bilan shuncha so'rov (`PAGE × MAX_PAGES`
 * = 3 000 yozuv — ilgarigi chegara bilan AYNI, faqat so'rov 5 barobar kam).
 *
 * Bugungi oqim kutilmaganda katta bo'lsa (masalan 50 000 hodisa) sahifa
 * yuzlab so'rov yuborib osilib qolmasin. Chegara ishlaganda `capped:true`
 * qaytadi va UI "kamida shuncha" deb ko'rsatadi.
 */
const MAX_PAGES = 6;

export interface ArrivalRow {
  faceId: number;
  /** Ismi (yuz bazasida bo'lsa). */
  name: string | null;
  /** Nechta kadrda ko'ringan. */
  frames: number;
  /** Birinchi va oxirgi ko'rinish (ISO). */
  first: string;
  last: string;
  /** Oxirgi kanal — qaysi kameradan o'tgan. */
  channel: string;
  camera: string;
  /** Ro'yxatdagi vakil hodisa — rasm shundan olinadi. */
  eventId: number;
}

export interface TodayArrivals {
  /** Takrorsiz shaxslar — ASOSIY son. */
  people: number;
  /** Shundan yuz bazasida tanilgani. */
  named: number;
  /** Xom hodisalar soni (bir odam ko'p kadr beradi). */
  events: number;
  /** `face_id` ajratilmagan hodisalar — shaxs sifatida sanalmaydi. */
  noFace: number;
  /** Xavfli qaydlar (qurol / janjal / server `alert` bayrog'i). */
  alarms: number;
  /** Hodisa kelgan takrorsiz KANALLAR soni. */
  channels: number;
  /** Soatlik taqsimot — 0..23, har soatda BIRINCHI marta ko'ringanlar. */
  byHour: { hour: number; people: number }[];
  /** Kanal kesimi — qaysi kameradan nechta odam o'tgan. */
  byChannel: { channel: string; camera: string; people: number; events: number }[];
  /** Shaxslar ro'yxati — oxirgi ko'rinish bo'yicha yangidan eskiga. */
  rows: ArrivalRow[];
  /** `MAX_PAGES` chegarasiga urildi — son "kamida shuncha". */
  capped: boolean;
  /** `YYYY-MM-DD` */
  date: string;
  /**
   * XOM kuzatuv posti yozuvlari — oraliqning HAMMASI.
   *
   * Boshqa hisoblar ham shu ro'yxatdan chiqadi, shuning uchun u
   * ochiqlangan: `useDetectionFeed()` uni `fromNvr()` bilan o'giradi va
   * shu tufayli Statistika/HUD "oxirgi 100" o'rniga BUTUN kunni ko'radi.
   */
  raw: NvrEvent[];
  isLoading: boolean;
  error: unknown;
}

/**
 * `YYYY-MM-DD` — SERVER zonasidan (`lib/serverClock.ts`), brauzer
 * `new Date()` EMAS. `GUIDE.md`: "bugun"ni brauzer zonasidan olsangiz,
 * panel boshqa mintaqadan (yoki noto'g'ri sozlangan soatdan) ochilganda
 * serverdan bir kun farq qilib, ro'yxat sababsiz bo'sh chiqadi.
 */
export function localDay(d = nowAdjusted()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * KAM UCHRAYDIGAN kategoriyalar — `all` oqimida ko'milib qoladiganlar.
 *
 * 🔴 **JANJAL/QUROL/CHEKISH "YO'Q BO'LIB QOLGAN" XATOSI** (topildi va
 * tuzatildi 2026-09-04). `all` — to'rtala kategoriyaning BIRLASHMASI va
 * u YANGISIDAN ESKISIGA saralangan; hodisalarning deyarli hammasi esa
 * `face` (o'lchandi: jami **6 919** dan **6 916** tasi yuz). Biz esa
 * `MAX_PAGES × PAGE = 3 000` yozuvda to'xtaymiz — o'lchandi: `offset=3000`
 * da sana atigi **2026-09-03** ga yetadi, ya'ni oyna BOR-YO'G'I bir kun.
 * Janjal hodisalari esa **2026-08-31** dan — ular chegaradan TASHQARIDA
 * qolib, "AI tahlil"da (va Statistikada) HECH QACHON ko'rinmasdi.
 * Kamchilik yuz oqimi qancha ko'p bo'lsa shuncha yomonlashardi.
 *
 * Yechim: `all` so'ralganda shu kategoriyalar ALOHIDA ham so'raladi —
 * ular kichkina (janjal 3, qurol 0, chekish 0), ya'ni bittadan so'rov
 * yetadi va natija `id` bo'yicha birlashtiriladi.
 */
const RARE: NvrQueryCategory[] = ["gun", "janjal", "smoking"];

/** Bitta kategoriyaning oraliqdagi hodisalari, sahifama-sahifa. */
async function fetchOne(
  category: NvrQueryCategory,
  from?: string,
  to?: string
): Promise<{ events: NvrEvent[]; capped: boolean }> {
  const first = await listEvents(category, {
    limit: PAGE,
    offset: 0,
    date_from: from,
    date_to: to,
    // ⚠️ `group` ATAYLAB yo'q — yuqoridagi izohga qarang
  });
  const out = first.events ?? [];
  const total = first.total ?? out.length;
  if (out.length < PAGE || out.length >= total) return { events: out, capped: false };

  /* ⚠️ Qolgan sahifalar PARALLEL olinadi. Ilgari 30 tasi KETMA-KET
     o'qilardi (`await` halqada) — har biri ~35 ms bo'lsa ham jami bir
     soniyadan oshardi va "ma'lumot sekin kelyapti" shundan edi. Sahifa
     soni `total` dan ANIQ hisoblanadi, ya'ni ortiqcha so'rov ketmaydi. */
  const pages = Math.min(Math.ceil(total / PAGE), MAX_PAGES);
  const rest = await Promise.all(
    Array.from({ length: pages - 1 }, (_, i) =>
      listEvents(category, { limit: PAGE, offset: (i + 1) * PAGE, date_from: from, date_to: to })
    )
  );
  for (const r of rest) out.push(...(r.events ?? []));
  return { events: out, capped: pages === MAX_PAGES && total > pages * PAGE };
}

/** Oraliqdagi BARCHA hodisalar (`all` da kam uchraydiganlari ham). */
async function fetchRange(
  category: NvrQueryCategory,
  from?: string,
  to?: string
): Promise<{ events: NvrEvent[]; capped: boolean }> {
  const main = await fetchOne(category, from, to);
  if (category !== "all") return main;

  /* `all` chegaradan oshgan bo'lsa kam uchraydiganlari ko'milgan bo'lishi
     mumkin — ularni alohida olib qo'shamiz (yuqoridagi izoh). */
  const extra = await Promise.all(RARE.map((c) => fetchOne(c, from, to).catch(() => null)));
  const byId = new Map(main.events.map((e) => [e.id, e]));
  for (const r of extra) {
    for (const e of r?.events ?? []) if (!byId.has(e.id)) byId.set(e.id, e);
  }
  const events = Array.from(byId.values()).sort(
    (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
  );
  return { events, capped: main.capped };
}

export interface ArrivalsOptions {
  /** `YYYY-MM-DD` — boshlanish. Ikkalasi ham berilmasa BUTUN tarix o'qiladi. */
  from?: string;
  /** `YYYY-MM-DD` — tugash. */
  to?: string;
  /** Qaysi kategoriya — default `all` (yuz + qurol + janjal + chekish). */
  category?: NvrQueryCategory;
  /**
   * `false` — so'rov UMUMAN yuborilmaydi (barcha sonlar nol bo'lib qoladi).
   *
   * ⚠️ Chaqiruvchi oraliqdagi XOM hodisalarga muhtoj bo'lmaganda kerak:
   * bu hook oraliqni sahifama-sahifa o'qiydi (30 tagacha so'rov), faqat
   * SANOQ kerak bo'lsa esa `useEventCounts.ts` bitta mitti so'rov bilan
   * ANIQ javob beradi (`hooks/useEventCounts.ts` boshidagi izohga qarang).
   */
  enabled?: boolean;
}

/**
 * Oraliqdagi shaxslar va qaydlar — TO'LIQ sanoq.
 *
 * `from`/`to` berilmasa serverdagi butun tarix o'qiladi (`MAX_PAGES` gacha) —
 * "Aniqlanganlar" sahifasi default `range:"all"` bilan ishlagani uchun shu
 * kerak bo'ladi.
 */
export function useArrivals(opts: ArrivalsOptions = {}): TodayArrivals {
  const { from, to, category = "all", enabled = true } = opts;

  const q = useQuery({
    queryKey: ["arrivals", category, from ?? "", to ?? ""],
    queryFn: () => fetchRange(category, from, to),
    /* Kun davomida o'sib boradi — daqiqada bir marta yangilanadi.
       ⚠️ Oraliqsiz (BUTUN tarix) so'rov esa 5 daqiqada bir: u eng og'iri
       (3 000 yozuv, ~2.4 MB) va bir daqiqada sezilarli o'zgarmaydi —
       yangi hodisa baribir SSE / `useDetections` orqali darhol ko'rinadi. */
    refetchInterval: from || to ? 60_000 : 5 * 60_000,
    staleTime: from || to ? 45_000 : 4 * 60_000,
    enabled,
  });

  const events = q.data?.events ?? [];

  /* Takrorsizlik `face_id` bo'yicha. Hisob `useMemo` siz — `events`
     havolasi faqat so'rov yangilanganda o'zgaradi, ya'ni bu blok kunda
     bir necha marta ishlaydi. */
  const byFace = new Map<number, ArrivalRow>();
  let noFace = 0;
  for (const e of events) {
    if (typeof e.face_id !== "number") {
      noFace++;
      continue;
    }
    const row = byFace.get(e.face_id);
    if (!row) {
      byFace.set(e.face_id, {
        faceId: e.face_id,
        name: e.name ?? null,
        frames: 1,
        first: e.time,
        last: e.time,
        channel: e.channel,
        camera: e.camera,
        eventId: e.id,
      });
      continue;
    }
    row.frames++;
    if (e.time < row.first) row.first = e.time;
    if (e.time > row.last) {
      row.last = e.time;
      row.channel = e.channel;
      row.camera = e.camera;
      row.eventId = e.id;
    }
    if (!row.name && e.name) row.name = e.name;
  }

  const rows = [...byFace.values()].sort((a, b) => (a.last < b.last ? 1 : -1));

  /* Xavfli qaydlar va kanallar — BUTUN oraliq bo'yicha (xom hodisalardan,
     chunki bitta odam bir necha xavfli qayd berishi mumkin). */
  const alarms = events.filter(isAlarm).length;
  const channels = new Set(events.map((e) => e.channel)).size;

  /* Soatlik taqsimot — odam BIRINCHI marta ko'ringan soatga yoziladi,
     aks holda bir odam kirgan soatida ham, chiqqan soatida ham sanalardi. */
  const hours = new Array(24).fill(0) as number[];
  for (const r of rows) {
    const h = new Date(r.first).getHours();
    if (h >= 0 && h < 24) hours[h]++;
  }

  /* Kanal kesimi: QAYDLAR xom hodisalardan (shaxsga ajratilmaganlari ham
     kirsin), SHAXSLAR esa kanal bo'yicha takrorsiz `face_id` dan. */
  const chan = new Map<string, { channel: string; camera: string; people: number; events: number }>();
  const chanFaces = new Map<string, Set<number>>();
  for (const e of events) {
    const c = chan.get(e.channel) ?? { channel: e.channel, camera: e.camera, people: 0, events: 0 };
    c.events++;
    chan.set(e.channel, c);
    if (typeof e.face_id === "number") {
      const set = chanFaces.get(e.channel) ?? new Set<number>();
      set.add(e.face_id);
      chanFaces.set(e.channel, set);
    }
  }
  for (const [ch, set] of chanFaces) {
    const c = chan.get(ch);
    if (c) c.people = set.size;
  }

  return {
    people: rows.length,
    named: rows.filter((r) => r.name).length,
    events: events.length,
    noFace,
    alarms,
    channels,
    byHour: hours.map((people, hour) => ({ hour, people })),
    byChannel: [...chan.values()].sort((a, b) => b.people - a.people),
    rows,
    capped: q.data?.capped ?? false,
    date: from ?? to ?? localDay(),
    raw: events,
    isLoading: q.isLoading,
    error: q.error,
  };
}

/**
 * BUGUNGI shaxslar — `useArrivals` ning qisqartmasi.
 *
 * @param day `YYYY-MM-DD`; berilmasa — bugun.
 */
export function useTodayArrivals(day?: string): TodayArrivals {
  const date = day ?? localDay();
  return useArrivals({ from: date, to: date });
}

/* ══════════════════════════════════════════════════════════════════════
   DAVR TANLOVI — bir necha bo'lim uchun YAGONA ro'yxat
   ══════════════════════════════════════════════════════════════════════
   Statistika, Kameralar, Aniqlanganlar va Geo Analitika bir xil tanlovni
   ko'rsatsin: tanlov nomi ham, oraliq hisobi ham bir joyda tursin.

   ⚠️ Serverdagi eng eski qayd — 2026-08-25 (o'lchandi). "Hammasi" sana
   filtrisiz so'raydi, ya'ni oraliq serverning o'zi bilan cheklanadi. */
export interface ArrivalPeriod {
  id: string;
  label: string;
  /** Necha kunlik oraliq; `null` — sana filtri yo'q (butun tarix). */
  days: number | null;
}

export const ARRIVAL_PERIODS: ArrivalPeriod[] = [
  { id: "today", label: "Bugun", days: 1 },
  { id: "7d", label: "7 kun", days: 7 },
  { id: "30d", label: "30 kun", days: 30 },
  { id: "all", label: "Hammasi", days: null },
];

/** Davr id'si → `useArrivals` parametrlari. */
export function periodRange(id: string): ArrivalsOptions {
  const p = ARRIVAL_PERIODS.find((x) => x.id === id) ?? ARRIVAL_PERIODS[0];
  if (p.days === null) return {};
  const d = new Date();
  d.setDate(d.getDate() - (p.days - 1));
  return { from: localDay(d), to: localDay() };
}
