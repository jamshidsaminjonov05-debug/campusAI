import { voiceApi } from "./VoiceService";

/**
 * VoiceResponseService — bajarilgan buyruqqa ovozli (TTS) javob.
 * Ixtiyoriy: TTS o'chiq bo'lsa ham matn javobi overlay'da ko'rinadi, UI hech
 * qachon to'xtamaydi. Bir vaqtda faqat bitta javob ijro etiladi.
 */
let currentAudio: HTMLAudioElement | null = null;

export async function speakResponse(text: string): Promise<void> {
  if (!text) return;
  try {
    stopSpeaking();
    const blob = await voiceApi.textToSpeech(text);
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    currentAudio = audio;
    audio.addEventListener("ended", () => URL.revokeObjectURL(url), { once: true });
    await audio.play().catch(() => undefined);
  } catch {
    /* ovozli javob muvaffaqiyatsiz — matn javobi baribir ko'rinadi */
  }
}

export function stopSpeaking(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
}
