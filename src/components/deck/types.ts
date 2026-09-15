import type { Context, ReactNode } from "react";

/**
 * TAQDIMOT DVIJOGINING UMUMIY TIPLARI.
 *
 * Bu papkada bitta dvijok turadi, uning ustida esa bir nechta taqdimot
 * ishlaydi:
 *   `presentation/` → `/taqdimot`  — mahsulot imkoniyatlari
 *   `investor/`     → `/investor`  — investor uchun biznes-hisob
 *
 * Har bir taqdimot o'z slaydlari, matni va ovoziga ega, lekin vaqt o'qi,
 * ovoz shinasi, boshqaruv va UI bloklari BITTA. Shu yerda tuzatilgan narsa
 * ikkala taqdimotga ham tushadi.
 */

export type DeckLang = "uz" | "en";

export const DECK_LANGS: DeckLang[] = ["uz", "en"];

export const isDeckLang = (v: unknown): v is DeckLang => v === "uz" || v === "en";

/** Bitta ovoz bo'lagi: matn + segment boshidan hisoblangan REJALASHTIRILGAN vaqt */
export type CueCopy = { at: number; text: string };

/** Taqdimot qobig'ining matni — tugmalar, yorliqlar, slayd nomlari */
export type DeckShell = {
  prev: string;
  next: string;
  auto: string;
  captions: string;
  exit: string;
  pause: string;
  resume: string;
  sound: string;
  hint: string;
  /** Pauza holatida ekran o'rtasida chiqadigan belgi */
  paused: string;
  /** Nuqtalar ustidagi yozuv — slaydlar tartibida */
  slideTitles: string[];
};

/** Boshlash ekranidagi matn */
export type DeckGate = {
  /** Sarlavha ostidagi bir qatorli izoh */
  sub: string;
  /** Katta tugma yozuvi */
  start: string;
  /** Tugma ostidagi kichik eslatma */
  note: string;
};

/**
 * HAR QANDAY taqdimot matni shu shaklga amal qiladi. Dvijok faqat shu
 * maydonlarni biladi — qolgani (slaydlar matni) taqdimotning o'ziniki.
 */
export type DeckCopyBase = {
  lang: DeckLang;
  /** `<html lang>` uchun emas — faqat tugma yorlig'i */
  langLabel: string;
  shell: DeckShell;
  gate: DeckGate;
  /** [slayd][bo'lak] — ovoz matni va rejalashtirilgan vaqtlar */
  narration: CueCopy[][];
};

/** Har bir slaydga beriladigan umumiy proplar */
export type SlideProps = {
  /** Slayd hozir ekrandami */
  active: boolean;
  /** Slaydning o'z vaqti, sekund (ovoz bilan bir xil o'q) */
  t: number;
  /**
   * Slayd BIRINCHI marta ko'rsatilyaptimi. `false` bo'lsa animatsiyalar
   * qayta o'ynamaydi — slayd oxirgi holatida ochiladi (orqaga qaytish).
   */
  fresh: boolean;
  /**
   * Shu slayd ovoz bo'laklarining boshlanish vaqtlari.
   *
   * ⚠️ Slaydlar vaqtni QATTIQ YOZMAYDI, shu massivdan oladi: ovoz fayli
   * generatsiya qilinganda vaqtlar o'lchangan qiymatlarga almashadi va
   * animatsiya tarjimaga ham, yangi ovozga ham o'zi moslashadi.
   */
  at: number[];
};

/* ────────────────────────────────  ovoz  ──────────────────────────────── */

export type AudioSegment = {
  /** `public/` ichidagi manzil */
  file: string;
  /** to'liq uzunlik, sekund */
  duration: number;
  /** har bo'lakning boshlanish vaqti, sekund */
  offsets: number[];
};

/** `[til][slayd]` — `tools/build-narration.py` chiqaradigan manifest */
export type NarrationManifest = Record<string, Record<number, AudioSegment>>;

/* ──────────────────────────  taqdimot ta'rifi  ────────────────────────── */

/**
 * Bitta taqdimotning to'liq ta'rifi. `Deck` shu obyektni oladi va
 * qolganini o'zi qiladi.
 */
export type DeckDefinition<T extends DeckCopyBase> = {
  /**
   * Qisqa identifikator (`product`, `investor`). Tanlangan til shu kalit
   * ostida saqlanadi, shuning uchun ikkala taqdimot bir-birining tilini
   * o'zgartirib yubormaydi.
   */
  id: string;
  slides: ((p: SlideProps) => JSX.Element)[];
  copies: Record<DeckLang, T>;
  audio: NarrationManifest;
  /** Matnni slaydlarga uzatuvchi kontekst — har taqdimot o'zinikini beradi */
  context: Context<T>;
  /** Orb sahna MARKAZIGA tushadigan slaydlar (ular `.orb-slot` chizadi) */
  centred?: number[];
  /** Esc va ✕ bosilganda qayerga qaytadi */
  exitHref?: string;
  /**
   * Butun sahnani o'rab oluvchi qo'shimcha provayder.
   *
   * Investor taqdimoti shu orqali valyuta holatini uzatadi: u ham
   * slaydlarga, ham pastdagi `Controls` tugmasiga kerak, shuning uchun
   * ikkalasidan HAM yuqorida turishi shart.
   */
  Wrapper?: (p: { children: ReactNode }) => JSX.Element;
  /**
   * Boshqaruv panelidagi qo'shimcha tugma (masalan UZS ⇄ USD).
   * `Wrapper` ichida render qilinadi.
   */
  Controls?: () => JSX.Element;
};
