/**
 * AI xulosasi va anomaliya — hodisalar oqimidan hisoblanadi.
 *
 * Hech qanday matn generatsiyasi YO'Q: bularning hammasi oddiy sanoq va
 * o'rtacha bilan chiqadi, shuning uchun natija tekshirilishi mumkin va
 * internetga chiqmaydi (loyihaning offline qoidasi).
 *
 * DIQQAT — "bugun" so'zi shartli: backend bazasida hodisalar bir oy oldingi
 * sanada bo'lishi mumkin. Shu sabab hisob **oqimdagi eng so'nggi kun** bo'yicha
 * yuritiladi va o'sha kun sanasi qaytariladi — panel uni ochiq yozadi,
 * "bugun 0 ta" degan aldamchi xulosa chiqmaydi.
 */
import type { DetectionEvent } from "@/lib/detectionEvents";
import { DETECTION_TYPES, type DetectionId } from "@/lib/detectionTypes";

/** Xavfli deb hisoblanadigan jiddiylik darajalari. */
const DANGEROUS = new Set(["critical", "high"]);

/** Anomaliya e'lon qilish uchun kamida shuncha kunlik tarix kerak. */
const MIN_HISTORY_DAYS = 3;
/** Kunlik o'rtachadan shuncha barobar oshsa — anomaliya. */
const ANOMALY_FACTOR = 2;
/** Shundan kam hodisa "sakrash" deb sanalmaydi (1 dan 2 ga o'sish shovqin). */
const ANOMALY_MIN = 3;

export interface AiAnomaly {
  type: DetectionId;
  /** Tanlangan kundagi soni. */
  count: number;
  /** Boshqa kunlardagi kunlik o'rtacha (bir kasrgacha). */
  usual: number;
}

export interface AiSummary {
  /** Hisob yuritilgan kun (oqimdagi eng so'nggi kun). */
  day: Date | null;
  /** Shu kundagi jami aniqlanish. */
  total: number;
  /** Shulardan xavflisi (critical/high). */
  dangerous: number;
  /** 24 ta katak — soatlik zichlik (timeline shundan chiziladi). */
  hourly: number[];
  /** Eng gavjum soat; hodisa bo'lmasa `null`. */
  peakHour: number | null;
  peakCount: number;
  /** Shu kunda eng ko'p uchragan tur. */
  topType: DetectionId | null;
  /** Odatdagidan sezilarli oshgan turlar. */
  anomalies: AiAnomaly[];
  /** Anomaliya hisoblash uchun tarix yetarlimi. */
  hasHistory: boolean;
}

const dayKey = (ts: number): string => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

export const EMPTY_SUMMARY: AiSummary = {
  day: null,
  total: 0,
  dangerous: 0,
  hourly: Array(24).fill(0),
  peakHour: null,
  peakCount: 0,
  topType: null,
  anomalies: [],
  hasHistory: false,
};

export function buildAiSummary(events: DetectionEvent[]): AiSummary {
  if (events.length === 0) return EMPTY_SUMMARY;

  // Kunlar bo'yicha guruhlash — eng so'nggi kun hisobot kuni bo'ladi
  const byDay = new Map<string, DetectionEvent[]>();
  for (const e of events) {
    const k = dayKey(e.ts);
    const list = byDay.get(k);
    if (list) list.push(e);
    else byDay.set(k, [e]);
  }

  const latestKey = [...byDay.keys()].reduce((a, b) => {
    const ta = byDay.get(a)![0].ts;
    const tb = byDay.get(b)![0].ts;
    return tb > ta ? b : a;
  });
  const today = byDay.get(latestKey)!;

  const hourly = Array(24).fill(0) as number[];
  const perType = new Map<DetectionId, number>();
  let dangerous = 0;
  for (const e of today) {
    hourly[new Date(e.ts).getHours()]++;
    perType.set(e.type, (perType.get(e.type) ?? 0) + 1);
    if (DANGEROUS.has(e.severity)) dangerous++;
  }

  let peakHour: number | null = null;
  let peakCount = 0;
  hourly.forEach((n, h) => {
    if (n > peakCount) {
      peakCount = n;
      peakHour = h;
    }
  });

  let topType: DetectionId | null = null;
  let topCount = 0;
  for (const [type, n] of perType) {
    if (n > topCount) {
      topCount = n;
      topType = type;
    }
  }

  /* Anomaliya: shu kundagi son ↔ QOLGAN kunlardagi kunlik o'rtacha.
     Tarix qisqa bo'lsa umuman e'lon qilinmaydi — 1-2 kunlik ma'lumotdan
     "odatdagi" degan xulosa chiqmaydi. */
  const otherDays = [...byDay.entries()].filter(([k]) => k !== latestKey);
  const hasHistory = otherDays.length >= MIN_HISTORY_DAYS - 1;
  const anomalies: AiAnomaly[] = [];
  if (hasHistory) {
    for (const d of DETECTION_TYPES) {
      const count = perType.get(d.id) ?? 0;
      if (count < ANOMALY_MIN) continue;
      const past = otherDays.reduce((s, [, list]) => s + list.filter((e) => e.type === d.id).length, 0);
      const usual = past / otherDays.length;
      if (count >= Math.max(ANOMALY_MIN, usual * ANOMALY_FACTOR)) {
        anomalies.push({ type: d.id, count, usual: Math.round(usual * 10) / 10 });
      }
    }
    anomalies.sort((a, b) => b.count - a.count);
  }

  return {
    day: new Date(today[0].ts),
    total: today.length,
    dangerous,
    hourly,
    peakHour,
    peakCount,
    topType,
    anomalies,
    hasHistory,
  };
}
