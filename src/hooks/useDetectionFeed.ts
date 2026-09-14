/**
 * Hodisalar oqimi — HUD footer rozetkalari, o'ng panel ro'yxati va begona
 * shaxs ogohlantirishlari SHU yagona manbadan chiqadi.
 *
 * Asosiy qoida: **rozetka raqami = ro'yxat uzunligi**. Hech qanday qo'lda
 * yozilgan son yo'q — hammasi `events` dan hisoblanadi.
 *
 * Begona shaxs qo'shimcha qoidasi (operator talabi):
 *  - Ogohlantirish kartochkalari faqat JORIY SESSIYADA aniqlanganlar uchun
 *    chiqadi (sahifa ochilganda bazadagi eskilar qichqirmaydi).
 *  - Avval aniqlangan shaxs qaytsa (`localStorage` tarixi) kartochka
 *    "TAKRORIY" bo'lib doimiy turadi; birinchi marta ko'ringan ~20 soniyada
 *    so'nadi. Ro'yxatdagi (filtr rejimidagi) yozuvlar esa o'chmaydi.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDetections } from "./useDetections";
import { localDay, useArrivals } from "./useTodayArrivals";
import { fromNvr, type DetectionEvent } from "@/lib/detectionEvents";
import { DETECTION_TYPES, type DetectionId } from "@/lib/detectionTypes";

/** Takroriy tashrifni aniqlash uchun shaxs kalitlari tarixi. */
const HISTORY_KEY = "hik-unknown-history";
/** Birinchi marta ko'ringan begona shuncha turib so'nadi (takroriylar — hech qachon). */
const AUTO_DISMISS_MS = 20_000;
/** Ekranda bir vaqtda ushlab turiladigan maksimal ogohlantirish. */
const MAX_VISIBLE = 6;
/**
 * Sahifa ochilganda ro'yxatga jimgina qo'yiladigan YAQIN o'tmish oynasi.
 *
 * Bu ogohlantirish EMAS (ovoz ham, tarix yozuvi ham yo'q) — shunchaki
 * "hozirgina nima bo'ldi" ko'rinishi. Ilgari panel sahifa ochilganda
 * butunlay bo'sh turardi.
 */
const SEED_WINDOW_MS = 30 * 60_000;

/** Jonli demo generatori qaysi turlarni qanchalik tez-tez chiqarishi. */
/* ------------------------------- Tarix (localStorage) ------------------------------- */

function readHistory(): Record<string, number> {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {}; // buzilgan yozuv — bo'sh tarix bilan davom etamiz
  }
}

function writeHistory(h: Record<string, number>): void {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
  } catch {
    /* kvota to'lgan bo'lsa — takror aniqlash ishlamaydi, xolos */
  }
}

/* ------------------------------------- Hook ------------------------------------- */

export interface DetectionFeed {
  /** Butun oqim (yangi → eski). */
  events: DetectionEvent[];
  /** Tur bo'yicha guruhlangan — panel ro'yxati shundan. */
  eventsByType: Record<DetectionId, DetectionEvent[]>;
  /** Rozetka raqamlari = `eventsByType[id].length`. */
  counts: Record<DetectionId, number>;
  /** Joriy sessiyada aniqlangan begona shaxslar (ogohlantirish kartochkalari). */
  alerts: DetectionEvent[];
  /** Tarixda turgan (avval aniqlangan) shaxslar soni. */
  knownCount: number;
  dismiss: (id: string) => void;
  clearAll: () => void;
  /** Ma'lumot real backend'danmi. */
  live: boolean;
}

export function useDetectionFeed(): DetectionFeed {
  /* ── MANBA — FAQAT kuzatuv posti ──
     ⚠️ Haqiqiy aniqlanishlar (yuz/qurol/janjal/chekish) SHU yerdan
     keladi va "Aniqlanganlar" bo'limi ham aynan shu oqimni ko'rsatadi —
     ya'ni HUD endi soxta emas, ikkala bo'lim bir xil hodisani
     ko'rsatadi. Kampus `resolveCampus()` orqali 179-maktabga bog'lanadi.

     Parametrlar `useDetectionCameras()` bilan AYNAN bir xil
     (`category:"all"`, `limit:100`) — shunda React Query ikkalasiga BITTA
     so'rovdan xizmat qiladi, qo'shimcha ulanish ochilmaydi. */
  /* ⚠️ IKKI SO'ROV, ATAYLAB:
     · `day` — BUGUNGI KUNNING HAMMASI (sahifama-sahifa, 60 s da bir).
       Shusiz Statistika "97 ta hodisa" ko'rsatardi, holbuki kunda 1082
       xom qayd bor edi — sanoq, soatlik zichlik va kamera kesimi ham
       o'sha qirqilgan oynadan chiqardi.
     · `fresh` — eng yangi 100 ta (15 s da bir). Kun skanini har 15
       soniyada takrorlash 11 ta so'rov degani; yangi hodisa esa TEZ
       ko'rinishi kerak. Ikkalasi `id` bo'yicha birlashtiriladi. */
  const day = useArrivals({ from: localDay(), to: localDay() });
  const fresh = useDetections({ category: "all", limit: 100 });
  /**
   * 🔴 **BACKEND `/api/v1/events` ZAXIRASI OLIB TASHLANDI** (2026-09-10,
   * foydalanuvchi so'rovi: "shu so'rov loyihada ishlatilmagan bo'lsa
   * olib tashla"). O'lchandi (jonli serverda, admin token bilan):
   * `GET /api/v1/events?limit=50` → JAMI **6** ta yozuv, hammasi
   * **2026-07-09 … 2026-07-15** dan (ikki oydan ortiq eski),
   * `camera_id: null` — birortasi ham kamera oqimidan EMAS, hammasi
   * "Operator tomonidan qo'lda kiritilgan hodisa" (test yozuvlari).
   *
   * Bu yer FAQAT kuzatuv posti bo'sh bo'lganda ishga tushadigan ZAXIRA edi
   * (`if (nvrEvents.length > 0) return nvrEvents; ... backend ...`).
   * kuzatuv postida esa doim minglab haqiqiy hodisa bor (`FRONTEND.md`), ya'ni
   * bu shoxobcha AMALDA hech qachon ishga tushmagan — faqat har
   * Boshqaruv paneli ochilganda BEKORGA bitta so'rov (va eskirgan test
   * ma'lumotini ko'rsatish xavfi) qo'shib turgan. O'chirilgach oqim
   * kuzatuv posti bo'sh bo'lganda ham BO'SH qoladi (yuqoridagi "demo zaxirasi"
   * bilan bir xil qoida — hech narsa o'ylab topilmaydi).
   */
  /** Demo rejimda jonli qo'shilgan hodisalar (eng yangisi boshida). */
  const [alerts, setAlerts] = useState<DetectionEvent[]>([]);

  const historyRef = useRef<Record<string, number>>({});
  const [knownCount, setKnownCount] = useState(0);
  /** Ko'rilgan backend id'lari. `null` = birinchi javob hali kelmagan. */
  const seenRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    historyRef.current = readHistory();
    setKnownCount(Object.keys(historyRef.current).length);
  }, []);

  /** kuzatuv posti oqimi — HUD ko'rsatadigan turlarga aylantirilgan, takrorsiz. */
  const nvrEvents = useMemo<DetectionEvent[]>(() => {
    const map = new Map<string, DetectionEvent>();
    // Yangi ro'yxat BIRINCHI — takror bo'lsa o'shanisi qoladi
    for (const src of [fresh.events, day.raw]) {
      for (const e of src) {
        const d = fromNvr(e);
        if (d && !map.has(d.id)) map.set(d.id, d);
      }
    }
    return [...map.values()].sort((a, b) => b.ts - a.ts);
  }, [fresh.events, day.raw]);

  const live = nvrEvents.length > 0;

  /**
   * Butun oqim — kuzatuv postidan.
   *
   * ⚠️ **DEMO VA BACKEND ZAXIRALARI OLIB TASHLANDI** (2026-09-05 /
   * 2026-09-10): ilgari kuzatuv posti bo'sh bo'lsa avval `DEMO_DETECTION_EVENTS`
   * (to'qilgan), keyin backend `/api/v1/events` (eskirgan test
   * yozuvlari) qaytarilardi. Ikkalasi ham "MOCK YO'Q" qoidasiga zid —
   * endi oqim bo'sh bo'lsa BO'SH qoladi va panellar sababini yozadi.
   */
  const events = nvrEvents;

  const eventsByType = useMemo(() => {
    const map = Object.fromEntries(DETECTION_TYPES.map((d) => [d.id, [] as DetectionEvent[]])) as Record<
      DetectionId,
      DetectionEvent[]
    >;
    for (const e of events) map[e.type]?.push(e);
    return map;
  }, [events]);

  const counts = useMemo(
    () =>
      Object.fromEntries(DETECTION_TYPES.map((d) => [d.id, eventsByType[d.id].length])) as Record<
        DetectionId,
        number
      >,
    [eventsByType]
  );

  /** Begona shaxs aniqlanishini ogohlantirishga aylantirib, tarixni yangilaydi. */
  const raiseAlert = useCallback((ev: DetectionEvent) => {
    const key = ev.personKey ?? ev.id;
    const h = historyRef.current;
    const repeat = key in h;
    const item: DetectionEvent = { ...ev, repeat };

    setAlerts((prev) => [item, ...prev.filter((p) => p.id !== item.id)].slice(0, MAX_VISIBLE));
    h[key] = ev.ts;
    writeHistory(h);
    setKnownCount(Object.keys(h).length);

    // Birinchi marta ko'ringan — o'zi so'nadi; takroriy — operator yopadi
    if (!repeat) {
      setTimeout(() => setAlerts((prev) => prev.filter((p) => p.id !== item.id)), AUTO_DISMISS_MS);
    }
  }, []);

  /* 1) Ogohlantirishlar — BUTUN oqim ustidan, manbadan qat'i nazar.
        Sessiya davomida kelganlar `raiseAlert` orqali qo'shiladi. */
  useEffect(() => {
    if (events.length === 0) return;
    if (seenRef.current === null) {
      seenRef.current = new Set(events.map((e) => e.id));
      /* ⚠️ BIRINCHI JAVOB — bazadagi hammasi "eski", ular QICHQIRMAYDI
         (`raiseAlert` chaqirilmaydi: na tarixga yoziladi, na sirena).
         AMMO panel BO'SH ham qolmasligi kerak: ilgari sahifa ochilganda
         "begona shaxs aniqlanmadi" deb turardi, holbuki bir necha daqiqa
         oldin o'nlab begona o'tgan bo'lardi. Shuning uchun YAQINDAGILAR
         (oxirgi 30 daqiqa) ro'yxatga jimgina qo'yiladi. */
      const cut = Date.now() - SEED_WINDOW_MS;
      const recent = events
        .filter((e) => e.type === "unknown_person" && e.ts >= cut)
        .slice(0, MAX_VISIBLE);
      if (recent.length > 0) setAlerts(recent);
      return;
    }
    const fresh = events.filter((e) => !seenRef.current!.has(e.id));
    for (const e of events) seenRef.current.add(e.id);
    for (const e of fresh) {
      if (e.type === "unknown_person") raiseAlert(e);
    }
  }, [events, raiseAlert]);

  /* ⚠️ **JONLI DEMO GENERATORI OLIB TASHLANDI** (2026-09-05): backend
     bo'sh bo'lsa har 9–18 soniyada YANGI to'qilgan hodisa yasalardi va
     u ro'yxatga ham, rozetkaga ham tushardi — panel "ishlayotgandek"
     ko'rinardi, holbuki hech qanday kamera hech narsa yubormagan. */

  const dismiss = useCallback((id: string) => setAlerts((prev) => prev.filter((a) => a.id !== id)), []);
  const clearAll = useCallback(() => setAlerts([]), []);

  return { events, eventsByType, counts, alerts, knownCount, dismiss, clearAll, live };
}
