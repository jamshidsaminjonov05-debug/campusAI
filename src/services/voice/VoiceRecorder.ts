import { toWav16kMono } from "./audioProcessing";

/**
 * MediaRecorder ustidan yupqa wrapper — push-to-talk: tugma bosilganda start(),
 * qo'yib yuborilganda stop() chaqiriladi. Mikrofon faqat yozish paytida ochiq
 * turadi, dispose()/stop() da barcha track'lar to'xtatiladi (memory leak yo'q).
 *
 * Sifat: mono, echo/shovqin bostirish va avto-kuchaytirish yoqilgan holda
 * yoziladi; stop() da audio 16kHz mono PCM WAV'ga o'giriladi (sukunat kesilib,
 * ovoz normallanadi) — STT aniqligi shu bilan sezilarli oshadi.
 */
export class MicPermissionDeniedError extends Error {}
/** localhost bo'lmagan HTTP kelib chiqishida `navigator.mediaDevices` mavjud emas — brauzer xavfsiz kontekst (HTTPS) talab qiladi. */
export class InsecureContextError extends Error {}

const PREFERRED_MIME_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];

/** Yuqori sifatli, nutqqa moslangan mono capture cheklovlari. */
const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  channelCount: 1,
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  sampleRate: 48_000, // yuqori sifatda olamiz, keyin 16kHz'ga tushiramiz
};

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return PREFERRED_MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t));
}

export class VoiceRecorder {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];

  get isRecording(): boolean {
    return this.recorder?.state === "recording";
  }

  async start(): Promise<void> {
    if (this.isRecording) return;
    // HTTPS/localhost bo'lmasa brauzer mikrofonni bermaydi: ba'zida mediaDevices
    // umuman yo'q, ba'zida bor-u getUserMedia "ruxsat rad etildi" deb tashlaydi —
    // ikkalasini ham oldindan aniq InsecureContextError bilan ushlaymiz.
    if (!window.isSecureContext || !navigator.mediaDevices) throw new InsecureContextError();
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS });
    } catch {
      // Ba'zi qurilmalarda aniq cheklovlar rad etilishi mumkin — oddiy audio bilan qayta urinamiz
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        throw new MicPermissionDeniedError();
      }
    }
    this.stream = stream;
    this.chunks = [];
    // Yaxshi oraliq sifat — WAV'ga o'girishda ma'lumot yo'qolmasin (past bitrate qo'yilmaydi)
    const recorder = new MediaRecorder(stream, { mimeType: pickMimeType(), audioBitsPerSecond: 128_000 });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.recorder = recorder;
    recorder.start();
  }

  /**
   * Yozishni to'xtatadi va audioni 16kHz mono PCM WAV sifatida qaytaradi
   * (sukunat kesilgan, ovoz normallangan). Konversiya muvaffaqiyatsiz bo'lsa —
   * asl (webm) blob qaytadi, STT baribir ishlaydi.
   */
  stop(): Promise<Blob | null> {
    const recorder = this.recorder;
    if (!recorder || recorder.state === "inactive") {
      this.releaseStream();
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      recorder.onstop = async () => {
        const raw = this.chunks.length > 0 ? new Blob(this.chunks, { type: recorder.mimeType || "audio/webm" }) : null;
        this.releaseStream();
        if (!raw) {
          resolve(null);
          return;
        }
        const wav = await toWav16kMono(raw).catch(() => null);
        resolve(wav ?? raw);
      };
      recorder.stop();
    });
  }

  /** Natijani tashlab, yozishni bekor qiladi (masalan tugma juda qisqa bosilsa). */
  cancel(): void {
    if (this.recorder && this.recorder.state !== "inactive") {
      this.recorder.onstop = null;
      this.recorder.stop();
    }
    this.releaseStream();
  }

  private releaseStream() {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    this.recorder = null;
    this.chunks = [];
  }

  dispose(): void {
    this.cancel();
  }
}
