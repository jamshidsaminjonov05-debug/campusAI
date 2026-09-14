"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, BellRinging, Checks, ImageBroken } from "@phosphor-icons/react";
import { useDetections } from "@/hooks/useDetections";
import { detectSubject, nvrDateTime, nvrImageUrl, type NvrEvent } from "@/lib/nvrApi";
import { isSeen, markSeen, seenVersion, subscribeSeen, unseenOf } from "@/lib/detectionSeen";
import { LEVEL_TONE, detectionLevel } from "@/lib/detectionLevel";
import { useAppStore } from "@/store/useAppStore";
import { useT } from "@/i18n";
import type { Messages } from "@/i18n";

/** Ro'yxatda ushlab turiladigan maksimal yozuv (menyu cheksiz o'smasin). */
const MAX_ROWS = 12;
/** Nisbiy vaqt shu qadamda qayta hisoblanadi — "3 daqiqa oldin" turib qolmasin. */
const TICK_MS = 30_000;

/**
 * `2026-08-31T11:36:18+05:00` → "3 daqiqa oldin".
 *
 * `now` ATAYLAB tashqaridan beriladi: bitta renderda o'nlab qator bir xil
 * asosdan hisoblansin va soat taymer bilan bir vaqtda yangilansin.
 */
export function relativeTime(iso: string, now: number, t: Messages): string {
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return "";
  const min = Math.floor((now - ts) / 60_000);
  if (min < 1) return t.notify.justNow;
  if (min < 60) return t.notify.minutesAgo(min);
  const h = Math.floor(min / 60);
  if (h < 24) return t.notify.hoursAgo(h);
  return t.notify.daysAgo(Math.floor(h / 24));
}

/**
 * Header'dagi bildirishnoma qo'ng'irog'i — KO'RILMAGAN aniqlanishlar soni.
 *
 * Manba `useDetections` (React Query): SSE ochilmaydi va so'rov kaliti
 * "Aniqlanganlar" sahifasiniki bilan bir xil, ya'ni ikkalasi BITTA keshdan
 * o'qiydi — header qo'shimcha yuk bermaydi.
 *
 * "Ko'rilgan" holati `lib/detectionSeen.ts` da (`localStorage`), chunki
 * serverda bunday maydon yo'q. Menyu ochilganda avtomatik belgilanmaydi —
 * operator o'zi qatorni bosishi yoki "hammasini" tugmasini bosishi kerak,
 * aks holda qo'ng'iroqqa tasodifan tegib butun ro'yxat "o'qilgan" bo'lardi.
 *
 * ⚠️ **Menyu `document.body` ga PORTAL orqali chiqariladi va `fixed` turadi.**
 * Header ichida `absolute` bo'lib qolsa IKKI joyda buziladi:
 *   1. header o'rami `overflow-hidden` ustunda — 420 px lik menyu 60 px lik
 *      header'dan pastda QIRQILADI (rasmda ikkinchi qatordan keyin kesilgan);
 *   2. header `nexa-card` → `backdrop-filter` bor, u YANGI stacking context
 *      yaratadi — ichkaridagi `z-50` tashqaridagi sahna ustiga CHIQA OLMAYDI,
 *      3D kampus menyu ustidan chiziladi.
 * Shu sabab joylashuv qo'ng'iroqning `getBoundingClientRect()` idan
 * hisoblanadi va oyna o'lchami/skroll o'zgarganda qayta o'lchanadi.
 *
 * Sirt ATAYLAB opaq (`geo-strip-card`): default `hik-glass-blue` — bg-white/4%,
 * ostidagi 3D kampus binolari ko'rinib matn o'qilmay qolardi.
 */
export function NotificationBell() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const boxRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  /** Menyu joylashuvi — qo'ng'iroq tugmasi ostida, o'ng cheti bilan tekis. */
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const setActivePage = useAppStore((s) => s.setActivePage);
  const setFocusedDetectionId = useAppStore((s) => s.setFocusedDetectionId);

  /* Eng yangi hodisalar — yig'ilgan holda (bir o'tish = bitta yozuv).
   *
   * ⚠️ ILGARI `last24h: true` va `limit: 60` edi va shu SABABLI rozetka
   * bo'sh turardi: "Aniqlanganlar" sahifasi BUTUN tarixni ko'rsatadi
   * (default `range: "all"`, 1000 dan ortiq yozuv, 40+ sahifa), qo'ng'iroq
   * esa faqat oxirgi sutkaning 60 tasini ko'rardi. Sahifada ko'rilmagan
   * yozuv turgani holda qo'ng'iroqning oynasiga u umuman tushmasdi —
   * operator "nima uchun rozetka yo'q?" deb qolardi.
   *
   * Endi vaqt cheklovi YO'Q va parametrlar `useDetectionCameras()` /
   * `useDetectionFeed()` bilan AYNAN bir xil — React Query uchalasiga
   * BITTA so'rovdan xizmat qiladi, ya'ni tarmoqqa qo'shimcha yuk ham
   * tushmaydi. */
  const { events, total } = useDetections({ category: "all", limit: 100 });

  // `localStorage` store'iga obuna — sahifada "ko'rildi" bo'lsa rozetka kamayadi
  const version = useSyncExternalStore(subscribeSeen, seenVersion, () => 0);
  /* Ro'yxatda O'QILGANLAR ham turadi — ular RANGSIZ bo'lib qoladi.
     Ilgari faqat ko'rilmaganlar chizilardi va operator xabarni bosishi bilan
     u ro'yxatdan YO'QOLARDI: nima bosganini qayta ko'ra olmasdi. */
  const rows = useMemo(
    () => events.slice(0, MAX_ROWS).map((ev) => ({ ev, seen: isSeen(String(ev.id)) })),
    // `version` — store o'zgarganini bildiruvchi yagona signal
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events, version]
  );
  const unseenCount = useMemo(
    () => unseenOf(events).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events, version]
  );

  const measure = useCallback(() => {
    const el = boxRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // O'ng chet oynadan hisoblanadi — menyu tugma bilan bir chiziqda tursin
    setPos({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
  }, []);

  useEffect(() => {
    if (!open) return;
    measure();
    window.addEventListener("resize", measure);
    // `capture` — ichki skroll konteynerlari ham hisobga olinsin
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, measure]);

  /* Nisbiy vaqt menyu OCHIQ bo'lgandagina yangilanadi — yopiq menyu uchun
     har 30 soniyada qayta chizish keraksiz ish. */
  useEffect(() => {
    if (!open) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(id);
  }, [open]);

  // Tashqariga bosish va Esc — menyuni yopadi
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const n = e.target as Node;
      // Menyu PORTALDA — u boxRef ichida emas, alohida tekshiriladi
      if (boxRef.current?.contains(n) || menuRef.current?.contains(n)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  /** Qatorga bosish — o'sha hodisani "Aniqlanganlar" da ochadi. */
  const openEvent = (ev: NvrEvent) => {
    markSeen([String(ev.id)]);
    setFocusedDetectionId(ev.id);
    setActivePage("Aniqlanganlar");
    setOpen(false);
  };

  /* Server `total` biz olgan oynadan katta bo'lsa, undan tashqarida ham
     ko'rilmagan yozuv bo'lishi mumkin — shuning uchun son "+" bilan
     ko'rsatiladi (aniq son o'rniga "kamida shuncha"). */
  const more = total > events.length;
  const badge = unseenCount > 99 ? "99+" : `${unseenCount}${more && unseenCount > 0 ? "+" : ""}`;
  const has = unseenCount > 0;

  const bell = (
    <div ref={boxRef} className="relative no-print">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={t.notify.title}
        aria-expanded={open}
        title={has ? t.notify.hint(unseenCount) : t.notify.empty}
        className={`relative grid h-9 w-9 place-items-center rounded-xl border transition-colors ${
          has
            ? "border-[#F43F5E]/40 bg-[#F43F5E]/10 text-[#FF8FA3] hover:border-[#F43F5E]/70"
            : "border-white/[0.08] bg-white/[0.04] text-slate-400 hover:border-white/20 hover:text-slate-100"
        }`}
      >
        {has ? <BellRinging size={17} weight="fill" /> : <Bell size={17} weight="duotone" />}
        {has && (
          <span
            className="absolute -right-1 -top-1 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-[#F43F5E] px-1
                       font-mono text-[9.5px] font-bold leading-none text-white ring-2 ring-[#0B1220]"
          >
            {badge}
          </span>
        )}
      </button>

    </div>
  );

  const menu = (
      <AnimatePresence>
        {open && (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            style={{ top: pos?.top ?? 0, right: pos?.right ?? 0 }}
            /* `geo-strip-card` — OPAQ sirt (`hik-glass-blue` emas): menyu 3D
               kampus va xarita ustida turadi, shaffof bo'lsa matn o'qilmaydi.
               `z-[70]` — sahifa mazmunidan (max z-40) yuqori, to'liq ekranli
               oynalardan (`z-[80]`…`z-[90]`) past. */
            className="geo-strip-card fixed z-[70] flex max-h-[min(420px,70vh)] w-[340px] max-w-[92vw] flex-col rounded-2xl px-3.5 py-3"
          >
            <header className="mb-2 flex flex-none items-baseline gap-2">
              <p className="text-[10px] uppercase tracking-wider text-ice-cyan/70">{t.notify.title}</p>
              <span className="truncate text-[9.5px] text-slate-500">
                {has ? t.notify.hint(unseenCount) : t.notify.emptyHint}
              </span>
              {has && (
                /* "Hammasini o'qildi" — ilgari faqat ikonka edi va nima
                   qilishi tushunarsiz edi; endi YOZUVI ham bor. */
                <button
                  type="button"
                  onClick={() => markSeen(events.map((e) => String(e.id)))}
                  title={t.notify.markAll}
                  className="ml-auto flex flex-none items-center gap-1 rounded-lg border border-white/[0.1] bg-white/[0.05] px-1.5 py-0.5 text-[9.5px] font-semibold text-slate-300 transition-colors hover:border-ice/50 hover:text-ice-bright"
                >
                  <Checks size={13} weight="bold" />
                  {t.notify.markAllShort}
                </button>
              )}
            </header>

            <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
              {rows.length === 0 && (
                <p className="py-8 text-center text-[11.5px] text-slate-500">{t.notify.empty}</p>
              )}

              {rows.map(({ ev, seen }) => {
                const tone = LEVEL_TONE[detectionLevel(ev)];
                const rel = relativeTime(ev.time, now, t);
                const subject = detectSubject(ev);
                /* Kichik surat — yuzda `index=0` (kesilgan yuz) eng aniq
                   ko'rinadi, qolgan turlarda birinchi kadr. */
                const shot = nvrImageUrl(ev, 0);
                return (
                  <button
                    key={ev.id}
                    type="button"
                    onClick={() => openEvent(ev)}
                    /* Hover'da — aniq kelgan vaqti va necha daqiqa bo'lgani */
                    title={t.notify.arrivedAt(nvrDateTime(ev.time), rel)}
                    style={{ ["--c" as string]: tone }}
                    className={`nb-row${seen ? " is-seen" : ""}`}
                  >
                    {/* Surat — o'qilganida kulrang bo'ladi (`is-seen` CSS) */}
                    <span className="nb-shot">
                      {shot ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={shot} alt="" loading="lazy" decoding="async" />
                      ) : (
                        <ImageBroken size={16} weight="duotone" className="text-slate-600" />
                      )}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-1.5">
                        {!seen && <i className="nb-dot" />}
                        <span className="nb-title">{ev.label}</span>
                        {/* Nisbiy vaqt DOIM ko'rinadi — hover shart emas */}
                        <span className="ml-auto flex-none font-mono text-[9.5px] text-slate-500">{rel}</span>
                      </span>
                      <span className="mt-0.5 block truncate text-[10.5px] text-slate-400">
                        {subject ? `${subject} · ` : ""}
                        {ev.camera}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            {unseenCount > rows.length && (
              <button
                type="button"
                onClick={() => {
                  setActivePage("Aniqlanganlar");
                  setOpen(false);
                }}
                className="mt-2 flex-none rounded-lg border border-white/[0.08] bg-white/[0.04] py-1.5 text-[10.5px]
                           font-semibold text-slate-300 transition-colors hover:border-white/20 hover:text-white"
              >
                {t.notify.openAll}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
  );

  /* Portal — header `overflow-hidden` ustunda va `backdrop-filter` li
     `nexa-card` ichida: u yerda menyu ham QIRQILADI, ham sahna ortida
     qoladi. SSR'da `document` yo'q, shunda menyu chizilmaydi (qo'ng'iroq
     yopiq holda keladi). */
  return (
    <>
      {bell}
      {typeof document !== "undefined" && createPortal(menu, document.body)}
    </>
  );
}
