"use client";

import { useEffect, useRef, useState } from "react";
import { voiceBus } from "./voiceBus";

/**
 * Slaydning O'Z vaqti (sekund).
 *
 * Manba — ovoz shinasi: haqiqiy audio ijro etilayotgan bo'lsa vaqt AYNAN
 * o'sha faylning ijro vaqti bo'ladi (brauzer avtomatik ijroni bloklab,
 * ovoz kech boshlansa ham subtitr va animatsiya ovozdan ajralib ketmaydi).
 * Ovoz bo'lmasa — oddiy sekundomer.
 *
 * `settled` — slaydga QAYTILGAN holat: animatsiya boshidan takrorlanmaydi,
 * slayd oxirgi kadrida ochiladi.
 *
 * Yangilanish qadami 80 ms: bosqich va subtitr almashuvi uchun yetarli,
 * uzluksiz harakatni esa CSS/framer chizadi (har kadrda `setState` yo'q).
 */
export function useShowTime(
  slide: number,
  settled: boolean,
  duration: number,
  running = true,
  /** Pauza — vaqt qotadi, slayd o'sha kadrda qoladi */
  held = false,
  /** Qayta o'ynatish hisoblagichi — o'zgarsa vaqt boshidan sanaladi */
  runId = 0,
): number {
  const [t, setT] = useState(0);
  const startRef = useRef(0);

  useEffect(() => {
    if (!running) {
      setT(0);
      return;
    }

    if (settled) {
      setT(duration + 999);
      return;
    }

    startRef.current = performance.now();
    setT(0);

    const id = window.setInterval(() => {
      /* Pauzada hech narsa yangilanmaydi — `voiceBus` ham o'z vaqtini
         qotirib turadi, shuning uchun ikkisi bir-biridan ajralmaydi. */
      if (voiceBus.isHeld) return;
      const local = (performance.now() - startRef.current) / 1000;
      setT(voiceBus.active ? voiceBus.elapsed() : local);
    }, 80);

    return () => window.clearInterval(id);
  }, [slide, settled, duration, running, runId]);

  /* `held` bog'liqlik sifatida kerak emas — pauza `voiceBus` da kuzatiladi.
     Lekin prop sifatida qabul qilinadi: chaqiruvchi holatni o'qib turishi
     va pauzada qayta render bo'lishi uchun. */
  void held;

  return t;
}
