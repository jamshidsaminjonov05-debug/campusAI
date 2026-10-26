/**
 * Jonli sinxronizatsiya — BITTA umumiy SSE (`all`) hodisa kelganda
 * ro'yxat/sanoq so'rovlarini yangilaydi.
 *
 * NEGA: ilgari har ro'yxat o'z 15–60 soniyalik pollingini yurgizardi va
 * hodisa tunda ham, kunduzi ham bir xil tezlikda so'ralardi. Endi hodisa
 * bo'lmasa so'rov ham yo'q; bo'lsa — throttle bilan yangilanadi.
 *
 * ⚠️ Yuz kamerasi kuniga minglab xom hodisa yuboradi, shuning uchun har
 * xabarda so'rov ketmaydi: `THROTTLE_*` (bosh + oxirgi chaqiruv). Polling
 * O'CHIRILMAGAN — `liveInterval()` bilan uzoq zaxira oralig'iga tushadi va
 * SSE uzilsa avvalgi tez oraliqqa qaytadi.
 *
 * `App`da BIR marta, faqat kirilgandan keyin (`components/layout/LiveSync`).
 */
import { useEffect } from "react";
import { useQueryClient, type Query } from "@tanstack/react-query";
import { subscribeNvr, type NvrEvent, type NvrQuery } from "@/lib/nvr/nvrApi";
import { merge } from "@/hooks/useNvrEvents";

/**
 * 🔴 2026-10-26 — RO'YXAT QAYTA SO'RALMAYDI, SSE HODISASI KESHGA QO'SHILADI.
 * Kuzatuv postining o'z paneli (`:7007/`) shunday ishlaydi (bundle'i o'qildi:
 * `jd()`/`qr()` — kelgan hodisa ro'yxat boshiga qo'shiladi, `total+1`, server
 * qayta so'ralmaydi). Bizda esa har 30 s da `["detections"]` keshi bekor
 * qilinib, panelda ochiq har bir ro'yxat (qo'ng'iroq, toast, ogohlantirishlar,
 * xarita — 7 kunlik `group=true`, 1.7 s har biri) serverdan QAYTA olinardi;
 * server bazaga so'rovlarni navbat bilan bajargani uchun shu paytda bosilgan
 * sahifa ham kutardi. Endi SSE hodisalari `MERGE_MS` davomida yig'ilib,
 * HAR `["detections", cat, q]` keshiga `merge()` bilan (o'tish yig'ish —
 * `useNvrEvents` bilan AYNI qoida) qo'shiladi — tarmoq so'rovi NOL.
 * To'liq qayta yuklash faqat: SSE qayta ulanganda, tab qaytganda va
 * `useDetections`ning o'z 5 daqiqalik zaxira oralig'ida.
 */
const MERGE_MS = 3_000;
type DetectionsCache = { events: NvrEvent[]; total: number };

/** `["detections", cat, q]` keshiga hodisalar to'plamini qo'shish. */
function mergeIntoCache(old: DetectionsCache | undefined, cat: unknown, q: NvrQuery | undefined, batch: NvrEvent[]): DetectionsCache | undefined {
  if (!old || !Array.isArray(old.events)) return old;
  const fit = batch.filter((ev) => {
    if (cat !== "all" && ev.category !== cat) return false;
    if (q?.camera && String(ev.channel) !== String(q.camera)) return false;
    return true;
  });
  if (!fit.length) return old;
  const known = new Set(old.events.map((e) => e.id));
  const fresh = fit.filter((e) => !known.has(e.id)).length;
  const merged = merge(q?.group ?? true, fit, old.events);
  const limit = q?.limit ?? merged.length;
  /* `total` — server soni; yangi KADR har doim +1 emas (o'tishga qo'shilgan
     bo'lishi mumkin), shuning uchun faqat yangi QATOR soni qo'shiladi. */
  const grew = Math.max(0, merged.length - old.events.length);
  return { events: merged.slice(0, limit), total: old.total + Math.min(fresh, grew) };
}

/** Yangi hodisa ro'yxatlarda ko'rinishi uchun eng ko'pi bilan shuncha kutiladi. */
/* ⚠️ 5 s → 30 s (2026-10-19, "loyiha qotyapti"): yuz kamerasi kunduzi deyarli
   har soniyada hodisa beradi, ya'ni 5 s throttle amalda "har 5 soniyada barcha
   ro'yxatlar qayta so'raladi" degani edi (panelda 4–5 ta har xil kalit). */
const THROTTLE_LIST_MS = 30_000;
/** Sanoq/statistika og'irroq (ba'zilari o'nlab sahifa skani) — siyrakroq. */
/* ⚠️ 60 s → 5 min: bunga BUGUNGI kunning xom skani (`arrivals`, 6+3 sahifa,
   megabaytlab JSON) ham kiradi — daqiqada bir qayta yuklash UI'ni qotirardi. */
const THROTTLE_STATS_MS = 5 * 60_000;

function makeThrottle(fn: () => void, ms: number) {
  let last = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  return {
    call() {
      const wait = last + ms - Date.now();
      if (wait <= 0) {
        last = Date.now();
        fn();
      } else if (!timer) {
        timer = setTimeout(() => {
          timer = undefined;
          last = Date.now();
          fn();
        }, wait);
      }
    },
    cancel() {
      clearTimeout(timer);
      timer = undefined;
    },
  };
}

/** `["arrivals"|"nvr-event-stats"|"nvr-faces-count", …, from, to]` — oraliqli (davrga bog'liq) kalitmi. */
function isRanged(q: Query): boolean {
  const k = q.queryKey as unknown[];
  const last2 = k.slice(-2);
  return last2.some((v) => typeof v === "string" && v !== "");
}

export function useLiveSync(): void {
  const qc = useQueryClient();

  useEffect(() => {
    const lists = makeThrottle(() => {
      qc.invalidateQueries({ queryKey: ["detections"] });
    }, THROTTLE_LIST_MS);

    const stats = makeThrottle(() => {
      qc.invalidateQueries({ queryKey: ["nvr-faces"] });
      /* Oraliqsiz (BUTUN tarix) so'rovlar og'ir va sekin o'zgaradi — ularga
         tegilmaydi, o'z 5 daqiqalik oralig'ida yangilanadi. */
      for (const root of ["arrivals", "nvr-event-stats", "nvr-faces-count", "ai-latest-shots"]) {
        qc.invalidateQueries({ queryKey: [root], predicate: isRanged });
      }
    }, THROTTLE_STATS_MS);

    let disposed = false;
    /* To'liq qayta yuklash — FAQAT qayta ulanish / tab qaytganda. */
    const trigger = () => {
      if (disposed) return;
      /* Yashirin tabda yangilamaymiz (polling ham shunday to'xtaydi) —
         tab qaytganda `visibilitychange` bir marta yangilaydi. */
      if (typeof document !== "undefined" && document.hidden) return;
      lists.call();
      stats.call();
    };

    /* Oddiy hodisa — keshga qo'shiladi, so'rov yo'q. */
    const pending: NvrEvent[] = [];
    let mergeTimer: ReturnType<typeof setTimeout> | undefined;
    const flush = () => {
      mergeTimer = undefined;
      if (disposed || !pending.length) return;
      const batch = pending.splice(0);
      for (const query of qc.getQueryCache().findAll({ queryKey: ["detections"] })) {
        const [, cat, q] = query.queryKey as [string, unknown, NvrQuery | undefined];
        qc.setQueryData<DetectionsCache>(query.queryKey, (old) => mergeIntoCache(old, cat, q, batch));
      }
    };
    const onEvent = (ev: NvrEvent) => {
      if (disposed) return;
      if (typeof document !== "undefined" && document.hidden) return;
      pending.push(ev);
      if (!mergeTimer) mergeTimer = setTimeout(flush, MERGE_MS);
      stats.call();
    };

    /* Birinchi ulanish — yangilash shart emas (so'rovlar hozirgina yuklangan).
       Keyingi o'zgarishlar: uzilish → tez polling oralig'i qayta hisoblanishi
       uchun, qayta ulanish → uzilgan paytdagi hodisalarni olish uchun. */
    let prev: boolean | undefined;
    const stop = subscribeNvr(
      "all",
      onEvent,
      (connected) => {
        const changed = prev !== undefined && prev !== connected;
        prev = connected;
        if (changed) trigger();
      }
    );

    const onVisible = () => {
      if (!document.hidden) trigger();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      disposed = true;
      stop();
      document.removeEventListener("visibilitychange", onVisible);
      lists.cancel();
      stats.cancel();
      clearTimeout(mergeTimer);
    };
  }, [qc]);
}
