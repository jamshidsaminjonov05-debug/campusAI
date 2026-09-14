/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  ANIQLASH OVOZI — tayyor AUDIO FAYLLAR                               ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * Uchta signal `public/audio/` da:
 *   · `alert-alarm.mp3` — **20 s** ikki tonli sirena ("vuu-vuu"), janjal
 *     va qurol uchun;
 *   · `alert-warn.mp3`  — 1.6 s takrorlanuvchi "din-don" (chekish,
 *     tanilmagan yuz);
 *   · `alert-info.mp3`  — 0.5 s yumshoq "blip".
 *
 * ⚠️ Fayllar `tools/make-alert-audio.mjs` bilan ffmpeg orqali YASALADI
 * (`node tools/make-alert-audio.mjs`) — tashqi manbadan olinmagan, ya'ni
 * OFFLINE qoidasi buzilmaydi. Ovozni o'zgartirish kerak bo'lsa o'sha
 * skriptdagi ifoda tuzatiladi va qayta yuritiladi.
 *
 * ⚠️ Ilgari ovoz brauzerda `OscillatorNode` bilan SINTEZ qilinardi. U
 * ishlardi, lekin quruq va "raqamli" eshitilardi: garmonikasi yo'q, cho'qqisi
 * kesilgan. ffmpeg to'lqinni to'liq aniqlikda hisoblab, chegaralab
 * (`alimiter`) va tenglashtirib beradi — ovoz TINIQ chiqadi.
 *
 * ⚠️ BRAUZER SIYOSATI: `<audio>` foydalanuvchi sahifa bilan ishlamaguncha
 * chalinmaydi (autoplay taqiqi). Birinchi bosishda `unlockSound()` chaqiriladi
 * va fayllar oldindan yuklab qo'yiladi — usiz birinchi signal kechikardi.
 */
import type { DetectionLevel } from "@/lib/detectionLevel";

const MUTE_KEY = "hik-alert-muted";

/** Trevoga sirenasining davomiyligi (soniya) — `alert-alarm.mp3` uzunligi. */
export const ALARM_SECONDS = 20;

/** Daraja → audio fayl. */
const SRC: Record<DetectionLevel, string> = {
  alarm: "/audio/alert-alarm.mp3",
  warn: "/audio/alert-warn.mp3",
  info: "/audio/alert-info.mp3",
};

/* ─────────────────────────── Ovoz yoqiq/o'chiq ─────────────────────────── */

type Listener = () => void;
const listeners = new Set<Listener>();
let version = 0;

let muted = false;
let loaded = false;

function loadMuted(): boolean {
  if (loaded || typeof window === "undefined") return muted;
  loaded = true;
  try {
    muted = window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    /* private rejim — sukut bo'yicha ovoz yoqiq */
  }
  return muted;
}

export function isMuted(): boolean {
  return loadMuted();
}

export function setMuted(next: boolean): void {
  loadMuted();
  if (muted === next) return;
  muted = next;
  if (next) stopSound(); // o'chirilganda chalinayotgan sirena darhol tinsin
  try {
    window.localStorage.setItem(MUTE_KEY, next ? "1" : "0");
  } catch {
    /* kvota — tanlov shu sessiyada qoladi */
  }
  version++;
  for (const fn of listeners) fn();
}

export function subscribeMuted(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const mutedVersion = (): number => version;

/* ──────────────────────────────── Chalish ──────────────────────────────── */

/** Oldindan yuklangan elementlar — signal KECHIKMASDAN chalinsin. */
const players = new Map<DetectionLevel, HTMLAudioElement>();
/** Hozir chalinayotgani — `stopSound()` shuni to'xtatadi. */
let playing: HTMLAudioElement | null = null;

function player(level: DetectionLevel): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  let a = players.get(level);
  if (!a) {
    a = new Audio(SRC[level]);
    a.preload = "auto";
    a.volume = 1;
    players.set(level, a);
  }
  return a;
}

/**
 * Brauzer autoplay taqiqini ochish — HAR QANDAY foydalanuvchi harakatida.
 *
 * Shu bilan birga fayllar oldindan yuklanadi: birinchi trevoga kelganda
 * 300 KB lik mp3 ni kutib turmaydi.
 */
export function unlockSound(): void {
  if (typeof window === "undefined") return;
  for (const level of ["alarm", "warn", "info"] as DetectionLevel[]) {
    try {
      player(level)?.load();
    } catch {
      /* fayl yo'q — signal chalinmaydi, ilova buzilmaydi */
    }
  }
}

/**
 * Chalinayotgan signalni DARHOL to'xtatish.
 *
 * KERAK: trevoga sirenasi 20 soniya davom etadi. Operator xabarni ko'rib
 * yopsa yoki ovozni o'chirsa, u tugashini kutib o'tirmasligi kerak.
 */
export function stopSound(): void {
  if (!playing) return;
  try {
    playing.pause();
    playing.currentTime = 0;
  } catch {
    /* allaqachon to'xtagan */
  }
  playing = null;
}

/**
 * Aniqlash signalini chalish.
 *
 * @param level `alarm` — 20 s sirena; qolganlari — qisqa signal.
 */
export function playDetectionSound(level: DetectionLevel): void {
  if (loadMuted() || typeof window === "undefined") return;
  // Yangi signal eskisini bosib ketmasin
  stopSound();
  const a = player(level);
  if (!a) return;
  try {
    a.currentTime = 0;
    playing = a;
    void a.play().catch(() => {
      // Autoplay taqiqi — foydalanuvchi hali sahifaga tegmagan
      playing = null;
    });
  } catch {
    playing = null;
  }
}
