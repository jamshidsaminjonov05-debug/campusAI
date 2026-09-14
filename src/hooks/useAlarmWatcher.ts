/**
 * Trevoga kuzatuvchisi — yangi kritik hodisa kelganda operatorni OGOHLANTIRADI.
 *
 * Nega kerak: hodisalar ilgari faqat ro'yxatga jimgina qo'shilardi — operator
 * boshqa sahifada bo'lsa (yoki brauzer boshqa tabda bo'lsa) hodisadan bexabar
 * qolardi. Bu hook App darajasida BIR MARTA chaqiriladi va sahifadan qat'i
 * nazar ishlaydi: ovozli signal + ekrandagi kartochka + brauzer bildirishnomasi.
 *
 * So'rov kaliti EventSidebar bilan bir xil (`limit: 30`) — React Query keshini
 * baham ko'radi, ya'ni qo'shimcha tarmoq so'rovi paydo bo'lmaydi.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useEvents } from "./useApi";
import type { AlarmEventOut } from "@/lib/api";
import { eventTypeLabel } from "@/lib/eventLabels";

/** Faqat shu darajalar trevoga hisoblanadi (qolganlari ro'yxatga jim qo'shiladi). */
const ALARM_SEVERITY = new Set(["critical", "high"]);
const MUTE_KEY = "hik-alarm-muted";
/** Ekranда bir vaqtda ko'rinadigan maksimal kartochka — ortig'i eskisini siqib chiqaradi. */
const MAX_VISIBLE = 4;

export interface AlarmItem {
  id: string;
  title: string;
  description: string | null;
  time: string;
  severity: string;
  cameraId: string | null;
}

/* ------------------------------- Ovozli signal ------------------------------- */

let audioCtx: AudioContext | null = null;

/**
 * Ikki bosqichli "siren" — audio fayl kerak emas (WebAudio oscillator).
 * Brauzer avtoijroni bloklasa jim qoladi: operator allaqachon login tugmasini
 * bosgan bo'ladi, shuning uchun amalda kontekst "running" holatida bo'ladi.
 */
function playSiren(): void {
  try {
    const Ctx: typeof AudioContext | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    audioCtx ??= new Ctx();
    if (audioCtx.state === "suspended") void audioCtx.resume();

    const t0 = audioCtx.currentTime;
    // Ikki marta "bip-bip": 880 Hz → 620 Hz
    for (let i = 0; i < 2; i++) {
      const start = t0 + i * 0.42;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(880, start);
      osc.frequency.setValueAtTime(620, start + 0.16);
      // Qulоq uchun yumshoq kirish/chiqish — "chirt" etgan shovqin bo'lmasin
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.32);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(start);
      osc.stop(start + 0.34);
    }
  } catch {
    /* ovoz ishlamasa — vizual ogohlantirish baribir qoladi */
  }
}

/* ---------------------------- Brauzer bildirishnomasi ---------------------------- */

function notify(item: AlarmItem): void {
  try {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    // `tag` — bitta hodisa ikki marta ko'rsatilmasin
    new Notification(`TREVOGA — ${item.title}`, {
      body: item.description ?? `Aniqlangan vaqt: ${item.time}`,
      tag: item.id,
    });
  } catch {
    /* bildirishnoma bloklangan bo'lsa — muhim emas */
  }
}

function toItem(ev: AlarmEventOut): AlarmItem {
  return {
    id: ev.id,
    title: eventTypeLabel(ev.event_type),
    description: ev.description,
    time: new Date(ev.detected_at).toLocaleTimeString("uz-UZ"),
    severity: ev.severity,
    cameraId: ev.camera_id,
  };
}

/* ---------------------------------- Hook ---------------------------------- */

export function useAlarmWatcher() {
  const { data: events } = useEvents({ limit: 30 });
  const [alarms, setAlarms] = useState<AlarmItem[]>([]);
  const [muted, setMuted] = useState(false);

  // Ko'rilgan hodisa id'lari. `null` = hali birinchi javob kelmagan.
  const seen = useRef<Set<string> | null>(null);
  // `muted` ni effekt bog'liqligiga qo'shmaslik uchun ref orqali o'qiymiz —
  // aks holda ovozni o'chirish/yoqish butun kuzatuvni qayta ishga tushirardi.
  const mutedRef = useRef(false);

  // Saqlangan sozlama + bildirishnoma ruxsati (bir marta so'raladi)
  useEffect(() => {
    const saved = localStorage.getItem(MUTE_KEY) === "1";
    setMuted(saved);
    mutedRef.current = saved;
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "default") {
        void Notification.requestPermission();
      }
    } catch {
      /* eski brauzer — bildirishnomasiz davom etamiz */
    }
  }, []);

  const toggleMuted = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      mutedRef.current = next;
      localStorage.setItem(MUTE_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  const dismiss = useCallback((id: string) => {
    setAlarms((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const dismissAll = useCallback(() => setAlarms([]), []);

  useEffect(() => {
    if (!events) return;

    // Birinchi javob — mavjud hodisalar "eski" hisoblanadi. Aks holda tizimga
    // kirgan zahoti bir nechta eski trevoga bir yo'la qichqirardi.
    if (seen.current === null) {
      seen.current = new Set(events.map((e) => e.id));
      return;
    }

    const fresh = events.filter((e) => !seen.current!.has(e.id));
    if (fresh.length === 0) return;
    for (const e of fresh) seen.current.add(e.id);

    const alarming = fresh.filter((e) => !e.is_resolved && ALARM_SEVERITY.has(e.severity)).map(toItem);
    if (alarming.length === 0) return;

    setAlarms((prev) => [...alarming, ...prev].slice(0, MAX_VISIBLE));
    if (!mutedRef.current) playSiren();
    for (const item of alarming) notify(item);
  }, [events]);

  return { alarms, dismiss, dismissAll, muted, toggleMuted };
}
