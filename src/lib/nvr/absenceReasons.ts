/**
 * Kelmaganlik SABABI — operator kiritadigan reyestr.
 *
 * ⚠️ NEGA lokal saqlanadi: backend `/attendance` da sabab maydoni YO'Q — u
 * faqat yuz tanish qaydini beradi (kim, qachon, qaysi kamera). "Sababli /
 * sababsiz" degan xulosani hech qanday formula bilan chiqarib bo'lmaydi, uni
 * FAQAT odam biladi. Shuning uchun sabab o'ylab topilmaydi: operator belgilaydi,
 * belgilanmagani esa **"aniqlanmagan"** bo'lib turadi va taxtada alohida
 * ko'rinadi (vazir "sababsiz" deb noto'g'ri o'qimasin).
 *
 * Saqlash — `localStorage` (offline qoidasi: tashqi xizmat yo'q). Backend
 * sabab maydonini bergan kunda faqat shu fayl almashtiriladi: `getReason` /
 * `setReason` imzosi o'zgarmasa iste'molchilarga tegilmaydi.
 */

const STORAGE_KEY = "hik-absence-reasons";

/** Sabab kodlari. `unexcused` — SABABSIZ, qolganlari sababli hisoblanadi. */
export type AbsenceCode = "sick" | "family" | "trip" | "study" | "other" | "unexcused";

/** Sababli deb hisoblanadigan kodlar — YAGONA qoida (UI ham shundan o'qiydi). */
export const EXCUSED_CODES: AbsenceCode[] = ["sick", "family", "trip", "study", "other"];

export const ABSENCE_CODES: AbsenceCode[] = [...EXCUSED_CODES, "unexcused"];

export interface AbsenceReason {
  code: AbsenceCode;
  /** Operator izohi (hujjat raqami, ariza va h.k.) — ixtiyoriy. */
  note?: string;
  /** Belgilangan vaqt (ISO) — kim qachon kiritganini ko'rish uchun. */
  at: string;
}

/** `YYYY-MM-DD|personId` — bir shaxs har kuni alohida belgilanadi. */
type Registry = Record<string, AbsenceReason>;

const keyOf = (date: string, personId: string) => `${date}|${personId}`;

let cache: Registry | null = null;
const listeners = new Set<() => void>();

function read(): Registry {
  if (cache) return cache;
  try {
    const raw = typeof localStorage === "undefined" ? null : localStorage.getItem(STORAGE_KEY);
    cache = raw ? (JSON.parse(raw) as Registry) : {};
  } catch {
    cache = {}; // buzilgan yozuv — bo'sh reyestr bilan davom etamiz
  }
  return cache;
}

function write(next: Registry): void {
  cache = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* kvota to'lgan — sabab faqat shu sessiyada qoladi */
  }
  for (const fn of listeners) fn();
}

/** O'zgarishga obuna (React `useSyncExternalStore` uchun). */
export function subscribeAbsence(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Reyestr versiyasi — `useSyncExternalStore` snapshot'i sifatida ishlatiladi. */
export function absenceSnapshot(): Registry {
  return read();
}

export function getReason(date: string, personId: string): AbsenceReason | null {
  return read()[keyOf(date, personId)] ?? null;
}

export function setReason(date: string, personId: string, code: AbsenceCode, note?: string): void {
  const next = { ...read(), [keyOf(date, personId)]: { code, note, at: new Date().toISOString() } };
  write(next);
}

/** Belgini olib tashlash — qatorda "aniqlanmagan" holatiga qaytadi. */
export function clearReason(date: string, personId: string): void {
  const next = { ...read() };
  delete next[keyOf(date, personId)];
  write(next);
}

export interface AbsenceSummary {
  /** Kelmaganlar jami. */
  total: number;
  /** Sababi belgilangan va u `unexcused` EMAS. */
  excused: number;
  /** Sababsiz deb belgilangan. */
  unexcused: number;
  /** Hali belgilanmagan — o'ylab topilmaydi, shundayligicha ko'rsatiladi. */
  unknown: number;
  /** Kod kesimida sanoq (diagramma uchun). */
  byCode: Record<AbsenceCode, number>;
}

export const EMPTY_ABSENCE_SUMMARY: AbsenceSummary = {
  total: 0,
  excused: 0,
  unexcused: 0,
  unknown: 0,
  byCode: { sick: 0, family: 0, trip: 0, study: 0, other: 0, unexcused: 0 },
};

/**
 * @param date       `YYYY-MM-DD`
 * @param absentIds  O'sha kuni kelmaganlarning id'lari.
 */
export function summarizeAbsence(date: string, absentIds: string[]): AbsenceSummary {
  const reg = read();
  const byCode: Record<AbsenceCode, number> = { sick: 0, family: 0, trip: 0, study: 0, other: 0, unexcused: 0 };
  let excused = 0;
  let unexcused = 0;
  let unknown = 0;

  for (const id of absentIds) {
    const r = reg[keyOf(date, id)];
    if (!r) {
      unknown++;
      continue;
    }
    byCode[r.code]++;
    if (r.code === "unexcused") unexcused++;
    else excused++;
  }

  return { total: absentIds.length, excused, unexcused, unknown, byCode };
}
