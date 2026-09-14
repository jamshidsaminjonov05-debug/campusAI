"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Checks, ImageBroken, X } from "@phosphor-icons/react";
import { useDetections } from "@/hooks/useDetections";
import { detectSubject, nvrImageUrl, nvrTime, type NvrEvent } from "@/lib/nvrApi";
import { LEVEL_TONE, detectionLevel } from "@/lib/detectionLevel";
import { isSeen, markSeen, seenVersion, subscribeSeen } from "@/lib/detectionSeen";
import { playDetectionSound, stopSound } from "@/lib/detectionSound";
import { announceDetection, stopSpeech } from "@/lib/detectionSpeech";
import { useAppStore } from "@/store/useAppStore";

/** Bir vaqtda ekranda ushlab turiladigan maksimal xabar. */
const MAX_TOASTS = 3;
/** Oddiy xabar shuncha turib so'nadi; TREVOGA — o'zi so'nmaydi. */
const AUTO_HIDE_MS = 8_000;

/**
 * Yangi aniqlash — EKRAN USTIDA chiqadigan xabar + OVOZ.
 *
 * Butun ilovada ishlaydi (`App.tsx` da bir marta ulanadi), ya'ni operator
 * qaysi bo'limda bo'lishidan qat'i nazar yangi hodisani ko'radi va eshitadi.
 *
 * ⚠️ Faqat HAQIQATAN YANGI hodisa ko'rsatiladi. Birinchi yuklanishda kelgan
 * ro'yxat "yangi" hisoblanmaydi (`primed` ref) — aks holda sahifa ochilishi
 * bilan 100 ta xabar va 100 ta signal yog'ilardi.
 *
 * ⚠️ Ko'rilgan hodisa qayta chiqmaydi (`lib/detectionSeen.ts`) — bildirishnoma
 * qo'ng'irog'i bilan AYNI reyestr.
 *
 * Ovoz `lib/detectionSound.ts` da SINTEZ qilinadi (audio fayl yo'q — loyiha
 * offline). Janjal/qurol uzun sirena, qolganlari qisqa signal.
 */
export function DetectionToast() {
  const setActivePage = useAppStore((s) => s.setActivePage);
  const setFocusedDetectionId = useAppStore((s) => s.setFocusedDetectionId);
  // "Aniqlanganlar" bo'limi bilan AYNI kesh — qo'shimcha so'rov ketmaydi
  const { events } = useDetections({ category: "all", limit: 60, last24h: true });
  useSyncExternalStore(subscribeSeen, seenVersion, () => 0);

  const [shown, setShown] = useState<NvrEvent[]>([]);
  /** Birinchi javob "yangi" emas — faqat undan KEYINGILARI. */
  const primed = useRef(false);
  const knownIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (events.length === 0) return;

    if (!primed.current) {
      primed.current = true;
      for (const e of events) knownIds.current.add(String(e.id));
      return;
    }

    const fresh = events.filter((e) => {
      const id = String(e.id);
      if (knownIds.current.has(id)) return false;
      knownIds.current.add(id);
      return !isSeen(id);
    });
    if (fresh.length === 0) return;

    /* Eng jiddiy hodisa ovozlanadi — uchtasi birdan kelsa uch xil signal
       ustma-ust tushmasin. Tartib: AVVAL "… aniqlandi" degan GAP, KEYIN
       sirena; aks holda 15 soniyalik sirena ostida gap eshitilmasdi. */
    const top =
      fresh.find((e) => detectionLevel(e) === "alarm") ??
      fresh.find((e) => detectionLevel(e) === "warn") ??
      fresh[0];
    const worst = detectionLevel(top);
    void announceDetection(top).then(() => playDetectionSound(worst));

    setShown((prev) => [...fresh, ...prev].slice(0, MAX_TOASTS));
  }, [events]);

  /* Oddiy xabarlar o'zi so'nadi. TREVOGA qoladi — operator uni ko'rib,
     o'zi yopishi kerak. */
  useEffect(() => {
    if (shown.length === 0) return;
    const soft = shown.filter((e) => detectionLevel(e) !== "alarm");
    if (soft.length === 0) return;
    const id = window.setTimeout(() => {
      setShown((prev) => prev.filter((e) => detectionLevel(e) === "alarm"));
    }, AUTO_HIDE_MS);
    return () => window.clearTimeout(id);
  }, [shown]);

  const close = (ev: NvrEvent) => {
    /* Trevoga sirenasi 10 soniya chalinadi — operator xabarni yopgan bo'lsa,
       demak ko'rdi: signalni tugashini kutib o'tirmaymiz. */
    if (detectionLevel(ev) === "alarm") stopSound();
    stopSpeech();
    setShown((prev) => prev.filter((x) => x.id !== ev.id));
  };

  /**
   * "Hammasini yopish" — 2026-09-09, foydalanuvchi so'rovi: "odam gavjum
   * paytida [xabarlar] juda ko'payib ketyabdi ... eng pastiga hammasini
   * o'chirishni qo'shishimiz kerak". `MAX_TOASTS=3` ekranni to'ldirib
   * yubormasa ham, gavjum paytda operator har birini alohida yopish
   * o'rniga bitta bosish bilan hammasidan qutuladi.
   */
  const closeAll = () => {
    stopSound();
    stopSpeech();
    setShown([]);
  };

  const open = (ev: NvrEvent) => {
    stopSound();
    stopSpeech();
    markSeen([String(ev.id)]);
    setFocusedDetectionId(ev.id);
    setActivePage("Aniqlanganlar");
    close(ev);
  };

  return (
    <div className="no-print pointer-events-none fixed right-4 top-[86px] z-[75] flex w-[320px] max-w-[92vw] flex-col gap-2">
      <AnimatePresence initial={false}>
        {shown.map((ev) => {
          const tone = LEVEL_TONE[detectionLevel(ev)];
          const shot = nvrImageUrl(ev, 0);
          const subject = detectSubject(ev);
          return (
            <motion.div
              key={ev.id}
              layout
              initial={{ opacity: 0, x: 40, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.96 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              style={{ ["--c" as string]: tone }}
              className="det-toast pointer-events-auto"
            >
              <button type="button" onClick={() => open(ev)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                <span className="det-toast-shot">
                  {shot ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={shot} alt="" decoding="async" />
                  ) : (
                    <ImageBroken size={16} weight="duotone" className="text-slate-600" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-1.5">
                    <span className="truncate text-[12px] font-bold text-white">{ev.label}</span>
                    <span className="ml-auto flex-none font-mono text-[9.5px] text-slate-400">{nvrTime(ev.time)}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-[10.5px] text-slate-300">
                    {subject ? `${subject} · ` : ""}
                    {ev.camera}
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => close(ev)}
                aria-label="Yopish"
                className="flex-none text-slate-400 transition-colors hover:text-white"
              >
                <X size={13} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* "Hammasini yopish" — ENG PASTDA (foydalanuvchi so'rovi), faqat
          bir nechtasi to'planganda ko'rinadi — bitta xabar uchun o'zining
          X'i yetarli. */}
      <AnimatePresence>
        {shown.length > 1 && (
          <motion.button
            type="button"
            onClick={closeAll}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="pointer-events-auto flex items-center justify-center gap-1.5 self-end rounded-full
                       border border-white/15 bg-[#0C1020]/90 px-3 py-1.5 text-[10.5px] font-semibold
                       text-slate-300 backdrop-blur-xl transition-colors hover:border-white/30 hover:text-white"
          >
            <Checks size={13} weight="bold" />
            Hammasini yopish
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
