/**
 * Taqdimot ovoz shinasi — bitta umumiy manba.
 *
 * Narrator (subtitr), AI orbi va slaydlarning bosqichli animatsiyalari
 * HAMMASI shu yerdan vaqt va ovoz darajasini o'qiydi. Shuning uchun ular
 * bir-biriga soniyagacha mos tushadi.
 *
 * Ikki rejim:
 *   • HAQIQIY AUDIO — `public/audio/taqdimot/slayd-N.mp3` mavjud bo'lsa
 *     u ijro etiladi va WebAudio analizatori orqali o'lchanadi;
 *   • SINTETIK KONVERT — fayl yo'q bo'lsa ovoz eshitilmaydi, lekin
 *     `level()` jonli nutq egri chizig'ini qaytaradi. Orb va subtitrlar
 *     xuddi ovoz bordek jonlanadi.
 *
 * ⚠️ Fayl YO'Q bo'lishi — normal holat. Taqdimot ovozsiz ham to'liq
 * ishlaydi; ovoz qo'shilsa esa kod o'zgarmaydi (`narration.ts` dagi
 * `audio` maydonini to'ldirish kifoya).
 */

export type Level = {
  /** 0…1 — umumiy balandlik */
  rms: number;
  /** 0…1 — lahzalik cho'qqi (zarba uchun) */
  peak: number;
};

export const SILENT: Level = { rms: 0, peak: 0 };

type Source = {
  /** Haqiqiy audio fayl ijro etilyaptimi */
  real: boolean;
  start: () => Promise<void>;
  level: () => Level;
  /**
   * Segment boshidan o'tgan vaqt. Audio uchun bu — faylning O'Z ijro
   * vaqti (`currentTime`), devor soati emas: brauzer ijroni kechiktirsa
   * yoki bufer to'xtasa ham subtitr ovozdan ajralib ketmaydi.
   */
  time: () => number;
  /** Fayl uzunligi (sekund) yoki 0 — hali noma'lum */
  duration: () => number;
  /** Taqdimotchi «joyida qotir» dedi — vaqt ham, ovoz ham to'xtaydi */
  hold: () => void;
  /** Pauzadan chiqish — vaqt qotgan joyidan davom etadi */
  unhold: () => void;
  /** Ovozni o'chirish/yoqish (vaqt oqishda davom etadi) */
  mute: (on: boolean) => void;
  dispose: () => void;
};

/* ───────────────────────── sintetik nutq konverti ─────────────────────── */

/**
 * Ovozsiz rejim uchun "nutqqa o'xshash" egri chiziq.
 *
 * Odam gapirganda balandlik bo'g'in tezligida (~4 Hz) tebranadi, orasida
 * nafas pauzalari bo'ladi. Uchta turli chastotali sinusni ko'paytirib
 * shunga yaqin shakl olamiz — eshitilmaydi, lekin ko'rinishda jonli.
 */
function syntheticLevel(t: number): Level {
  const syllable = 0.5 + 0.5 * Math.sin(t * 25.1);
  const word = 0.55 + 0.45 * Math.sin(t * 7.3 + 1.1);
  const breath = Math.max(0, Math.sin(t * 1.15 + 0.4)); // pauzalar
  const rms = Math.min(1, syllable * word * breath * 0.95);
  return { rms, peak: rms > 0.72 ? rms : 0 };
}

function createSynthetic(duration: number): Source {
  let t0 = performance.now();
  /** Pauzada qotgan vaqt; `null` — oqmoqda */
  let held: number | null = null;
  const now = () => held ?? (performance.now() - t0) / 1000;
  return {
    real: false,
    start: async () => {},
    level: () => (held === null ? syntheticLevel(now()) : SILENT),
    time: now,
    duration: () => duration,
    hold: () => {
      if (held === null) held = (performance.now() - t0) / 1000;
    },
    unhold: () => {
      if (held !== null) {
        // Vaqt o'qini siljitamiz — pauza uzunligi hisobga olinmasin
        t0 = performance.now() - held * 1000;
        held = null;
      }
    },
    mute: () => {},
    dispose: () => {},
  };
}

/* ─────────────────────────── haqiqiy audio manba ──────────────────────── */

const makeBuf = (n: number) => new Uint8Array(new ArrayBuffer(n));

function createAudio(url: string, fallback: number): Source {
  const el = new Audio(url);
  el.preload = "auto";
  el.crossOrigin = "anonymous";

  let ctx: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  /* ⚠️ `new ArrayBuffer(n)` orqali — shunda tip `Uint8Array<ArrayBuffer>`
     bo'ladi. `new Uint8Array(n)` esa `ArrayBufferLike` beradi va
     `getByteFrequencyData` uni qabul qilmaydi (TS 5.7+ lib.dom). */
  let buf: ReturnType<typeof makeBuf> | null = null;
  let failed = false;
  /** Ijro HAQIQATAN boshlanganmi. Shu bayroqsiz «pauza» ni «avtoijro
      bloklandi» dan ajratib bo'lmasdi: ikkalasida ham `el.paused` true. */
  let began = false;
  /** Taqdimotchi qo'yган pauza (avtoijro bloki emas) */
  let heldByUser = false;
  const t0 = performance.now();

  /* Analizator faqat ijro boshlangach ulanadi: AudioContext'ni foydalanuvchi
     imo-ishorasidan oldin yaratish brauzerda "suspended" holatga tushadi. */
  const attach = () => {
    if (ctx || failed) return;
    try {
      const AC: typeof AudioContext =
        window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
      const src = ctx.createMediaElementSource(el);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.72;
      src.connect(analyser);
      analyser.connect(ctx.destination);
      buf = makeBuf(analyser.frequencyBinCount);
    } catch {
      // WebAudio bo'lmasa ham audio o'ynayveradi — faqat o'lchov sintetik bo'ladi
      failed = true;
    }
  };

  return {
    real: true,
    start: async () => {
      attach();
      if (ctx?.state === "suspended") await ctx.resume().catch(() => {});
      await el.play();
      began = true;
    },
    level: () => {
      if (!analyser || !buf || el.paused) {
        // Hali boshlanmagan yoki analizator yo'q — konvert bilan to'ldiramiz
        return el.paused ? SILENT : syntheticLevel((performance.now() - t0) / 1000);
      }
      analyser.getByteFrequencyData(buf);
      let sum = 0;
      let peak = 0;
      // Faqat nutq diapazoni (~80 Hz … 4 kHz) — pastdagi gul hisobga olinmaydi
      const hi = Math.min(buf.length, Math.round(buf.length * 0.45));
      for (let i = 2; i < hi; i++) {
        const v = buf[i] / 255;
        sum += v * v;
        if (v > peak) peak = v;
      }
      const rms = Math.min(1, Math.sqrt(sum / Math.max(1, hi - 2)) * 2.4);
      return { rms, peak: peak > 0.78 ? peak : 0 };
    },
    /* Ijro boshlangach vaqt faylning O'Z vaqtidan olinadi — pauzada u
       o'z-o'zidan qotadi. Ijro hali boshlanmagan bo'lsa (brauzer avtoijroni
       bloklagan) devor soati ishlaydi, shunda ovozsiz ham sahna oldinga
       yuradi; `unlock` da `startedAt` qayta sanaladi va ikki o'q tutashadi. */
    time: () => (began ? el.currentTime : (performance.now() - t0) / 1000),
    duration: () => (Number.isFinite(el.duration) && el.duration > 0 ? el.duration : fallback),
    hold: () => {
      heldByUser = true;
      el.pause();
    },
    unhold: () => {
      if (!heldByUser) return;
      heldByUser = false;
      void el.play().then(() => {
        began = true;
      }).catch(() => {});
    },
    mute: (on: boolean) => {
      el.muted = on;
    },
    dispose: () => {
      el.pause();
      el.src = "";
      void ctx?.close().catch(() => {});
      ctx = null;
      analyser = null;
    },
  };
}

/* ───────────────────────────────── shina ──────────────────────────────── */

let source: Source | null = null;
/** Taqdimotchi pauza qo'yganmi — yangi segment ham shu holatda boshlanadi */
let held = false;
/** Ovoz o'chirilganmi — bu holat slaydlar almashganda ham saqlanadi */
let muted = false;
let pendingUnlock = false;
let unlockTimer: ReturnType<typeof setTimeout> | undefined;

const listen = (on: boolean) => {
  const fn = on ? window.addEventListener : window.removeEventListener;
  fn("pointerdown", unlock);
  fn("keydown", unlock);
};

/**
 * Brauzer avtomatik ijroga ruxsat bermasa — birinchi bosishda qayta urinamiz.
 *
 * Ijro boshlangach vaqt faylning O'Z vaqtiga o'tadi (`Source.time`), ya'ni
 * subtitr audiodan ajralib qolmaydi. Amalda bu yo'lga kamdan-kam tushiladi:
 * `StartGate` shouni foydalanuvchi bosishi bilan boshlaydi.
 */
function unlock() {
  if (!pendingUnlock || !source) return;
  pendingUnlock = false;
  listen(false);
  void source.start().catch(() => {});
}

export const voiceBus = {
  /**
   * Segmentni boshlaydi.
   * @param url      ovoz fayli (bo'lmasa sintetik konvert)
   * @param duration taxminiy uzunlik — subtitr vaqtlari shunga cho'ziladi
   */
  play(url: string | undefined, duration: number) {
    voiceBus.stop();
    source = url ? createAudio(url, duration) : createSynthetic(duration);

    /**
     * ⚠️ HOLATNI YANGI MANBAGA KO'CHIRAMIZ.
     *
     * `muted` va `held` — SHOUNING holati, bitta slaydniki emas. Har slaydda
     * yangi `Source` yaratiladi va usiz u holatni bilmay qolardi: ovozni
     * o'chirib keyingi slaydga o'tsangiz ovoz yana gapira boshlardi, pauzada
     * o'tsangiz esa qotgan sahna ustidan ovoz ijro etilardi.
     */
    source.mute(muted);

    if (url) {
      /* Pauzada yangi segment BOSHLANMAYDI — taqdimotchi davom etish
         tugmasini bosganda `unhold()` uni o'sha joyidan boshlaydi. */
      if (held) {
        source.hold();
      } else {
        void source.start().catch(() => {});
        /* Listenerlar KEYINGI tsiklda qo'shiladi: slaydni almashtirgan keydown
           hali tarqalib bo'lmagan — darrov qo'shsak, o'sha tugma `unlock` ni
           ishga tushirib, ovoz ikki marta boshlanib ketardi. */
        unlockTimer = setTimeout(() => {
          pendingUnlock = true;
          listen(true);
        }, 0);
      }
    } else if (held) {
      source.hold();
    }
  },

  stop() {
    clearTimeout(unlockTimer);
    pendingUnlock = false;
    listen(false);
    source?.dispose();
    source = null;
  },

  /**
   * Segment boshidan o'tgan vaqt (sekund). Segment yo'q bo'lsa 0.
   *
   * Ikkala manba ham o'z vaqtini O'ZI yuritadi — shuning uchun pauza
   * (`hold`) ikkalasida ham to'g'ri ishlaydi va bu yerda alohida hisob
   * kerak emas.
   */
  elapsed(): number {
    return source ? source.time() : 0;
  },

  /** Segment uzunligi — haqiqiy audio bo'lsa fayldan, aks holda taxminiy. */
  duration(): number {
    return source?.duration() ?? 0;
  },

  level(): Level {
    return source?.level() ?? SILENT;
  },

  get active(): boolean {
    return source !== null;
  },

  /** Haqiqiy ovoz fayli bormi (sintetik konvert emas) */
  get hasAudio(): boolean {
    return source?.real === true;
  },

  /**
   * Pauza — sahna joyida qotadi: ovoz to'xtaydi, vaqt oqmaydi, slayd
   * animatsiyasi o'sha kadrda qoladi. Taqdimotchi gapirmoqchi bo'lganda
   * yoki savolga javob berayotganda kerak.
   */
  setHeld(on: boolean) {
    if (held === on) return;
    held = on;
    if (on) source?.hold();
    else source?.unhold();
  },

  get isHeld(): boolean {
    return held;
  },

  /**
   * Ovozni o'chirish. Vaqt OQISHDA DAVOM ETADI — taqdimotchi matnni o'zi
   * o'qiydi, subtitr va animatsiya esa o'sha jadval bo'yicha ketaveradi.
   */
  setMuted(on: boolean) {
    muted = on;
    source?.mute(on);
  },

  get isMuted(): boolean {
    return muted;
  },
};
