/**
 * Audio post-ishlov — STT sifatini oshirish uchun.
 *
 * Brauzer MediaRecorder odatda WebM/Opus (yoki mp4) yozadi. Ko'plab STT
 * xizmatlari 16kHz mono PCM WAV bilan eng aniq ishlaydi. Shuning uchun
 * yuborishdan oldin: dekod → mono → 16kHz resample → sukunatni kesish →
 * ovozni normallash → 16-bit PCM WAV.
 *
 * Barcha bosqichlar brauzerning Web Audio API'sida bajariladi (tashqi
 * kutubxona yo'q). Biror bosqich xato bersa, chaqiruvchi asl blob'ga
 * qaytishi kerak — ovoz buyrug'i baribir ishlaydi.
 */

const TARGET_SAMPLE_RATE = 16_000;
const SILENCE_THRESHOLD = 0.008; // shu amplitudadan past = sukunat
const SILENCE_PAD_SEC = 0.06; // nutq boshi/oxiri kesilmasin uchun kichik zaxira
const NORMALIZE_PEAK = 0.97;

type AudioCtor = typeof AudioContext;

function getAudioContextCtor(): AudioCtor | null {
  if (typeof window === "undefined") return null;
  return window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext ?? null;
}

/**
 * Blob (webm/opus/mp4/...) → 16kHz mono PCM WAV Blob.
 * Web Audio mavjud bo'lmasa yoki dekod muvaffaqiyatsiz bo'lsa — null qaytadi
 * (chaqiruvchi asl blob bilan davom etadi).
 */
export async function toWav16kMono(input: Blob): Promise<Blob | null> {
  const Ctor = getAudioContextCtor();
  if (!Ctor || typeof OfflineAudioContext === "undefined") return null;

  let decoded: AudioBuffer;
  const decodeCtx = new Ctor();
  try {
    const arrayBuffer = await input.arrayBuffer();
    decoded = await decodeCtx.decodeAudioData(arrayBuffer);
  } catch {
    return null;
  } finally {
    void decodeCtx.close();
  }

  // Mono + 16kHz resample: 1 kanalli, 16kHz OfflineAudioContext ikkalasini ham bajaradi
  const frameCount = Math.max(1, Math.ceil(decoded.duration * TARGET_SAMPLE_RATE));
  const offline = new OfflineAudioContext(1, frameCount, TARGET_SAMPLE_RATE);
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.connect(offline.destination);
  src.start();

  let mono: Float32Array;
  try {
    const rendered = await offline.startRendering();
    mono = rendered.getChannelData(0);
  } catch {
    return null;
  }

  const trimmed = trimSilence(mono);
  normalizePeak(trimmed);
  return encodeWavPcm16(trimmed, TARGET_SAMPLE_RATE);
}

/** Boshi va oxiridagi sukunatni kesadi (nutq atrofida kichik zaxira qoldirib). */
function trimSilence(samples: Float32Array): Float32Array {
  const n = samples.length;
  let start = 0;
  let end = n;
  while (start < end && Math.abs(samples[start]) < SILENCE_THRESHOLD) start++;
  while (end > start && Math.abs(samples[end - 1]) < SILENCE_THRESHOLD) end--;

  // Butun signal sukunat bo'lsa — asl holicha qaytaramiz (xavfsizlik uchun)
  if (end <= start) return samples;

  const pad = Math.floor(SILENCE_PAD_SEC * TARGET_SAMPLE_RATE);
  start = Math.max(0, start - pad);
  end = Math.min(n, end + pad);
  return samples.subarray(start, end);
}

/** Cho'qqi bo'yicha normallash — sekin gapirilgan ovozni ham eshitiladigan darajaga ko'taradi. */
function normalizePeak(samples: Float32Array): void {
  let max = 0;
  for (let i = 0; i < samples.length; i++) {
    const a = Math.abs(samples[i]);
    if (a > max) max = a;
  }
  if (max < 1e-4) return; // deyarli sukunat — kuchaytirish shovqinni oshiradi
  const gain = NORMALIZE_PEAK / max;
  for (let i = 0; i < samples.length; i++) samples[i] *= gain;
}

/** Float32 [-1,1] namunalardan 16-bit PCM WAV konteyner quradi. */
function encodeWavPcm16(samples: Float32Array, sampleRate: number): Blob {
  const numChannels = 1;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true); // fmt chunk hajmi
  view.setUint16(20, 1, true); // audio format = PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // bit/namuna
  writeAscii(view, 36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  return new Blob([buffer], { type: "audio/wav" });
}

function writeAscii(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}
