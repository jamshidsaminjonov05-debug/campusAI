/**
 * Kun davomidagi kayfiyat, dars kesimidagi e'tibor va AGRESSIYA belgisi.
 *
 * ── Nimasi haqiqiy, nimasi hosila ────────────────────────────────────────
 *  · Kayfiyat yozuvlari HAQIQIY: `/attendance` har bir tanishda
 *    `emotion_label` (matn) va `emotion_group` (positive/neutral/negative)
 *    qaytaradi.
 *  · "E'tibor" ko'rsatkichi HOSILA: tizimda diqqatni o'lchaydigan sensor
 *    YO'Q. U kayfiyat aralashmasidan hisoblanadi va UI'da shundayligi ochiq
 *    yoziladi — uni "o'quvchi darsni tinglayaptimi" deb talqin qilmang.
 *  · Agressiya — QOIDA (heuristika), model emas: yorliqda g'azab so'zi
 *    bo'lishi yoki qisqa oraliqda ketma-ket salbiy qayd.
 */
import type { AttendanceOut } from "@/lib/api";
import { LESSON_SLOTS, lessonAt, type LessonSlot } from "@/config/lessons";

/** Yorliqda shu so'zlar bo'lsa — agressiya (o'zbek/ingliz/rus). */
const AGGRESSIVE_RE = /jahl|g'azab|gazab|asabiy|agress|angry|anger|rage|злост|гнев|агресс/i;

/** Ketma-ket shuncha salbiy qayd — agressiya deb baholanadi. */
const NEGATIVE_STREAK = 3;
/** Streak shu oraliqda bo'lsagina hisobga olinadi (daqiqa). */
const STREAK_WINDOW_MIN = 30;

export type MoodGroup = "positive" | "neutral" | "negative";

export interface MoodPoint {
  ts: number;
  /** HH:MM */
  time: string;
  group: MoodGroup;
  label: string | null;
  /** Shu qayd agressiya belgisi berganmi. */
  aggressive: boolean;
  /** Shu vaqtda qaysi dars ketayotgani (tanaffusda `null`). */
  lesson: LessonSlot | null;
}

export interface LessonMood {
  slot: LessonSlot;
  positive: number;
  neutral: number;
  negative: number;
  total: number;
  /** 0..100 — kayfiyat aralashmasidan hisoblangan HOSILA ko'rsatkich. */
  attention: number;
  aggressive: boolean;
}

export interface MoodDay {
  points: MoodPoint[];
  lessons: LessonMood[];
  positive: number;
  neutral: number;
  negative: number;
  /** Kun bo'yicha umumiy e'tibor (hosila). */
  attention: number;
  /** Agressiya aniqlangan — ogohlantirish chiqadi. */
  aggressive: boolean;
  /** Agressiya birinchi qayd etilgan vaqt (HH:MM). */
  aggressiveAt: string | null;
  /** Agressiya sababi — UI shuni yozadi (qoida ochiq bo'lsin). */
  aggressiveReason: "label" | "streak" | null;
  hasData: boolean;
}

export const EMPTY_MOOD: MoodDay = {
  points: [],
  lessons: [],
  positive: 0,
  neutral: 0,
  negative: 0,
  attention: 0,
  aggressive: false,
  aggressiveAt: null,
  aggressiveReason: null,
  hasData: false,
};

const normalizeGroup = (g: string | null): MoodGroup => {
  const v = (g ?? "").toLowerCase();
  if (v.includes("pos") || v.includes("ijob")) return "positive";
  if (v.includes("neg") || v.includes("salb")) return "negative";
  return "neutral";
};

/** E'tibor (hosila): ijobiy to'liq, neytral yarmi, salbiy nol. */
const attentionOf = (p: number, n: number, neg: number): number => {
  const total = p + n + neg;
  return total === 0 ? 0 : Math.round(((p + n * 0.6) / total) * 100);
};

const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

/** Kayfiyat qaydlarini vaqt bo'yicha tartiblangan nuqtalarga aylantiradi. */
function pointsOf(records: AttendanceOut[]): MoodPoint[] {
  const withMood = records.filter((r) => r.emotion_group || r.emotion_label);
  const sorted = [...withMood].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  return sorted.map((r) => {
    const d = new Date(r.timestamp);
    const label = r.emotion_label ?? null;
    return {
      ts: d.getTime(),
      time: hhmm(d),
      group: normalizeGroup(r.emotion_group ?? label),
      label,
      aggressive: !!label && AGGRESSIVE_RE.test(label),
      lesson: lessonAt(d),
    };
  });
}

/** Dars kesimi — qayd bo'lmagan darslar ro'yxatga tushmaydi. */
function lessonsOf(points: MoodPoint[]): LessonMood[] {
  return LESSON_SLOTS.map((slot) => {
    const inSlot = points.filter((p) => p.lesson?.n === slot.n);
    const pos = inSlot.filter((p) => p.group === "positive").length;
    const neu = inSlot.filter((p) => p.group === "neutral").length;
    const neg = inSlot.filter((p) => p.group === "negative").length;
    return {
      slot,
      positive: pos,
      neutral: neu,
      negative: neg,
      total: inSlot.length,
      attention: attentionOf(pos, neu, neg),
      aggressive: inSlot.some((p) => p.aggressive),
    };
  }).filter((l) => l.total > 0);
}

/**
 * @param records Bitta shaxsning bitta kundagi davomat yozuvlari
 *                (kayfiyati bo'lmagan qaydlar hisobga olinmaydi).
 */
export function buildMoodDay(records: AttendanceOut[]): MoodDay {
  const points = pointsOf(records);
  if (points.length === 0) return EMPTY_MOOD;

  /* Agressiya: (1) yorliqda g'azab so'zi, yoki (2) qisqa oraliqda ketma-ket
     salbiy qaydlar. Ikkinchisi bitta tasodifiy "salbiy" dan farq qiladi. */
  let aggressiveAt: string | null = null;
  let aggressiveReason: MoodDay["aggressiveReason"] = null;

  const byLabel = points.find((p) => p.aggressive);
  if (byLabel) {
    aggressiveAt = byLabel.time;
    aggressiveReason = "label";
  } else {
    let streak = 0;
    let streakStart = 0;
    for (const p of points) {
      if (p.group !== "negative") {
        streak = 0;
        continue;
      }
      if (streak === 0) streakStart = p.ts;
      streak++;
      if (streak >= NEGATIVE_STREAK && p.ts - streakStart <= STREAK_WINDOW_MIN * 60_000) {
        aggressiveAt = hhmm(new Date(streakStart));
        aggressiveReason = "streak";
        break;
      }
    }
  }

  let positive = 0;
  let neutral = 0;
  let negative = 0;
  for (const p of points) {
    if (p.group === "positive") positive++;
    else if (p.group === "negative") negative++;
    else neutral++;
  }

  const lessons = lessonsOf(points);

  return {
    points,
    lessons,
    positive,
    neutral,
    negative,
    attention: attentionOf(positive, neutral, negative),
    aggressive: aggressiveAt !== null,
    aggressiveAt,
    aggressiveReason,
    hasData: true,
  };
}

/* ─────────────── Guruh (butun ro'yxat) kesimi — statistika uchun ─────────────── */

export interface GroupMood {
  /** Dars kesimida umumiy kayfiyat va e'tibor (hosila). */
  lessons: LessonMood[];
  positive: number;
  neutral: number;
  negative: number;
  /** Kun bo'yicha umumiy e'tibor (hosila). */
  attention: number;
  /** Kayfiyat qaydi bo'lgan yozuvlar soni. */
  total: number;
  hasData: boolean;
}

/**
 * KO'P shaxsning qaydlaridan umumiy kesim: "qaysi darsda sinf qanday kayfiyatda
 * bo'lgan".
 *
 * `buildMoodDay()` dan farqi — AGRESSIYA BAYROG'I YO'Q va bu ATAYLAB: agressiya
 * qoidasi "bitta odamning 30 daqiqada ketma-ket 3 ta salbiy qaydi"ga tayanadi,
 * aralash ro'yxatda esa u uch xil odamning qaydi bo'lib chiqishi va yolg'on
 * ogohlantirish berishi mumkin. Agressiya faqat shaxs kesimida hisoblanadi
 * (`lib/personDay.ts`).
 */
export function buildGroupMood(records: AttendanceOut[]): GroupMood {
  const points = pointsOf(records);
  if (points.length === 0) {
    return { lessons: [], positive: 0, neutral: 0, negative: 0, attention: 0, total: 0, hasData: false };
  }

  let positive = 0;
  let neutral = 0;
  let negative = 0;
  for (const p of points) {
    if (p.group === "positive") positive++;
    else if (p.group === "negative") negative++;
    else neutral++;
  }

  return {
    lessons: lessonsOf(points),
    positive,
    neutral,
    negative,
    attention: attentionOf(positive, neutral, negative),
    total: points.length,
    hasData: true,
  };
}
