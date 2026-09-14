import { loadTokens } from "@/lib/api";
import { SPEECH_BASE } from "@/config/endpoints";
import { VOICE_ERROR } from "./VoiceCommands";

/**
 * O'zbek STT-TTS API klienti — ichki tarmoqdagi backend ostida
 * (`/api/v1/speech`). Himoyalangan (tokensiz 401 "Not authenticated") — shu
 * sabab bearer token asosiy API bilan bir xil `hik-auth-tokens` localStorage'dan
 * olinadi. Manzil `src/config/endpoints.ts` da hal qilinadi: to'g'ridan-to'g'ri
 * yoki same-origin `/speech` (Next rewrites).
 */
const BASE = SPEECH_BASE;

function authHeaders(): HeadersInit | undefined {
  const tokens = loadTokens();
  return tokens?.access ? { Authorization: `Bearer ${tokens.access}` } : undefined;
}

export class VoiceServiceError extends Error {}

/** Timeout + tashqi bekor qilish (masalan yangi buyruq eskisini bekor qiladi) bitta signalga birlashadi. */
function createRequestSignal(ms: number, external?: AbortSignal) {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, ms);
  if (external) {
    if (external.aborted) controller.abort();
    else external.addEventListener("abort", () => controller.abort(), { once: true });
  }
  return {
    signal: controller.signal,
    cancel: () => clearTimeout(timer),
    isTimeout: () => timedOut,
  };
}

export const voiceApi = {
  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${BASE}/health`, { headers: authHeaders() });
      return res.ok;
    } catch {
      return false;
    }
  },

  /** Audio blob'ni backendga yuboradi, tanilgan o'zbekcha matnni qaytaradi. */
  async speechToText(audio: Blob, externalSignal?: AbortSignal): Promise<string> {
    const { signal, cancel, isTimeout } = createRequestSignal(15_000, externalSignal);
    try {
      const form = new FormData();
      const filename = audio.type.includes("wav") ? "voice.wav" : audio.type.includes("mp4") ? "voice.mp4" : "voice.webm";
      form.append("file", audio, filename);

      let res: Response;
      try {
        res = await fetch(`${BASE}/stt`, { method: "POST", body: form, signal, headers: authHeaders() });
      } catch {
        throw new VoiceServiceError(isTimeout() ? VOICE_ERROR.timeout : VOICE_ERROR.serviceOffline);
      }
      if (!res.ok) throw new VoiceServiceError(VOICE_ERROR.serviceOffline);

      const ct = res.headers.get("content-type") ?? "";
      let text = "";
      if (ct.includes("application/json")) {
        const data: unknown = await res.json().catch(() => null);
        if (typeof data === "string") text = data;
        else if (data && typeof data === "object") {
          const obj = data as Record<string, unknown>;
          text = String(obj.text ?? obj.result ?? obj.transcript ?? "");
        }
      } else {
        text = (await res.text()).trim();
      }

      text = text.trim();
      if (!text) throw new VoiceServiceError(VOICE_ERROR.emptyResult);
      return text;
    } finally {
      cancel();
    }
  },

  /** Matnni ovozli javobga (.mp3) o'giradi. */
  async textToSpeech(text: string, externalSignal?: AbortSignal): Promise<Blob> {
    const { signal, cancel, isTimeout } = createRequestSignal(10_000, externalSignal);
    try {
      let res: Response;
      try {
        res = await fetch(`${BASE}/tts`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ text }),
          signal,
        });
      } catch {
        throw new VoiceServiceError(isTimeout() ? VOICE_ERROR.timeout : VOICE_ERROR.serviceOffline);
      }
      if (!res.ok) throw new VoiceServiceError(VOICE_ERROR.serviceOffline);
      return await res.blob();
    } finally {
      cancel();
    }
  },
};
