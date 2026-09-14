/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  ANIQLASH E'LONI — "Janjal aniqlandi" degan OVOZLI gap               ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * Sirena "nimadir bo'ldi" deydi, e'lon esa NIMA bo'lganini aytadi. Operator
 * ekranga qaramasdan ham qaysi hodisa ekanini biladi.
 *
 * Tartib: AVVAL gap, KEYIN sirena (`DetectionToast`) — aks holda 20 soniyalik
 * sirena ostida gap eshitilmasdi.
 *
 * ── MANBA ────────────────────────────────────────────────────────────
 * 1. **Tayyor o'zbekcha AUDIO** — `public/audio/` da yozib qo'yilgan
 *    (`Janjal_aniqlandi.mp3` va h.k.). Bu ENG YAXSHI variant: talaffuz
 *    to'g'ri, kechikish yo'q, tarmoq ham kerak emas.
 * 2. Kategoriyaga fayl topilmasa — **backend TTS** (`/speech/tts`),
 *    hodisaning o'z nomi bilan.
 * 3. U ham javob bermasa — brauzerning `speechSynthesis` zaxirasi.
 *    ⚠️ O'zbek ovozi ko'pincha yo'q, shunda boshqa talaffuz bilan o'qiydi.
 * 4. Hech biri bo'lmasa — jim qoladi, faqat sirena chalinadi. Xato
 *    ekranga chiqmaydi: e'lon qo'shimcha qulaylik, signal ishlayveradi.
 */
import { voiceApi } from "@/services/voice/VoiceService";
import { isMuted } from "@/lib/detectionSound";
import { isPhoneEvent, type NvrEvent } from "@/lib/nvrApi";

/**
 * Kategoriya → tayyor o'zbekcha e'lon.
 *
 * ⚠️ Fayl nomlari `public/audio/` dagi bilan AYNAN bir xil bo'lishi shart
 * (katta-kichik harf ham) — `SHaxs_aniqlandi.mp3` shunday yozilgan.
 */
const CLIP = {
  unknown: "/audio/Begona_shaxs.mp3",
  known: "/audio/SHaxs_aniqlandi.mp3",
  gun: "/audio/Qurol_aniqlandi.mp3",
  fight: "/audio/Janjal_aniqlandi.mp3",
  smoking: "/audio/Chekish_Aniqlandi.mp3",
  phone: "/audio/Telefon_aniqlandi.mp3",
} as const;

/** Hodisa uchun tayyor e'lon fayli (yo'q bo'lsa `null`). */
export function clipFor(ev: NvrEvent): string | null {
  if (ev.category === "gun") return CLIP.gun;
  if (ev.category === "janjal") return CLIP.fight;
  if (ev.category === "smoking") return isPhoneEvent(ev) ? CLIP.phone : CLIP.smoking;
  if (ev.category === "face") return ev.recognized ? CLIP.known : CLIP.unknown;
  return null;
}

/** Hozir chalinayotgan e'lon — yangisi eskisini bosib ketmasin. */
let current: HTMLAudioElement | null = null;
/** Oldindan yuklangan e'lonlar — kechikmasdan chalinsin. */
const clips = new Map<string, HTMLAudioElement>();

function clipPlayer(src: string): HTMLAudioElement {
  let a = clips.get(src);
  if (!a) {
    a = new Audio(src);
    a.preload = "auto";
    a.volume = 1;
    clips.set(src, a);
  }
  return a;
}

/** Barcha e'lonlarni oldindan yuklash — birinchi hodisada kutilmasin. */
export function preloadSpeech(): void {
  if (typeof window === "undefined") return;
  for (const src of Object.values(CLIP)) {
    try {
      clipPlayer(src).load();
    } catch {
      /* fayl yo'q — o'sha kategoriya uchun zaxira manbaga tushiladi */
    }
  }
}

/** E'lonni to'xtatish (xabar yopilganda, ovoz o'chirilganda). */
export function stopSpeech(): void {
  if (current) {
    try {
      current.pause();
      current.currentTime = 0;
    } catch {
      /* allaqachon to'xtagan */
    }
    current = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

/** Bitta audio faylni chalib, tugashini kutadi. */
function playClip(src: string): Promise<boolean> {
  return new Promise((done) => {
    const a = clipPlayer(src);
    current = a;
    const finish = (ok: boolean) => {
      if (current === a) current = null;
      done(ok);
    };
    a.onended = () => finish(true);
    a.onerror = () => finish(false);
    try {
      a.currentTime = 0;
      void a.play().catch(() => finish(false));
    } catch {
      finish(false);
      return;
    }
    // Zaxira: `ended` kelmasa ham 5 soniyadan keyin davom etamiz
    window.setTimeout(() => finish(true), 5000);
  });
}

/** Brauzer zaxirasi — tizimdagi ovoz bilan o'qiydi. */
function speakLocally(text: string): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    const uz = window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith("uz"));
    if (uz) u.voice = uz;
    u.lang = uz?.lang ?? "uz-UZ";
    u.rate = 1.05;
    u.volume = 1;
    window.speechSynthesis.speak(u);
  } catch {
    /* ovoz sintezi yo'q — jim qolamiz */
  }
}

/**
 * Hodisani ovoz bilan e'lon qilish.
 *
 * @param ev hodisa — kategoriyasidan tayyor fayl tanlanadi
 * @returns  gap TUGAGUNCHA kutadi; sirena shundan keyin boshlansin uchun
 *           chaqiruvchi `await` qiladi
 */
export async function announceDetection(ev: NvrEvent): Promise<void> {
  if (isMuted() || typeof window === "undefined") return;
  stopSpeech();

  // 1) Tayyor o'zbekcha e'lon
  const clip = clipFor(ev);
  if (clip && (await playClip(clip))) return;

  // 2) Backend TTS — hodisaning o'z nomi bilan
  const text = `${ev.label} aniqlandi`;
  try {
    const blob = await voiceApi.textToSpeech(text);
    const audio = new Audio(URL.createObjectURL(blob));
    current = audio;
    audio.onended = () => {
      URL.revokeObjectURL(audio.src);
      if (current === audio) current = null;
    };
    await audio.play();
    await new Promise<void>((doneFn) => {
      audio.addEventListener("ended", () => doneFn(), { once: true });
      window.setTimeout(doneFn, 4000);
    });
  } catch {
    // 3) Brauzer zaxirasi
    speakLocally(text);
    await new Promise<void>((doneFn) => window.setTimeout(doneFn, 1800));
  }
}
