import { EVENT_TYPE_KEYWORDS, type EventTypeCode, type PersonType } from "./VoiceCommands";
import { tokens } from "./VoiceNormalizer";

/**
 * VoiceEntityExtractor — normallashgan matndan mazmuniy birliklarni ajratadi:
 * kamera raqami, shaxs ismi, texnikum/hudud so'rovi, hodisa turi, davomat filtri,
 * tartib son (birinchi/1). Registry+predictor shu birliklardan foydalanadi.
 */
export interface VoiceEntities {
  personName?: string;
  personType?: PersonType;
  cameraNumber?: number;
  ordinal?: number;
  placeQuery?: string; // texnikum yoki hudud nomi (matn)
  eventType?: EventTypeCode;
  attendanceAbsent?: boolean;
}

const ORDINAL_WORDS: Record<string, number> = {
  birinchi: 1, ikkinchi: 2, uchinchi: 3, tortinchi: 4, "to'rtinchi": 4,
  beshinchi: 5, oltinchi: 6, yettinchi: 7, sakkizinchi: 8, "to'qqizinchi": 9, oninchi: 10,
};

const SEARCH_VERBS = ["top", "topib", "qidir", "qidirib", "qidiring", "toping"];
const TEACHER_HINTS = ["o'qituvchi", "oqituvchi", "aka", "opa", "domla", "ustoz"];

export function extractEntities(normalized: string): VoiceEntities {
  const e: VoiceEntities = {};
  const ws = tokens(normalized);

  // Kamera raqami: "15-kamera", "kamera 15", "15 kamera"
  const camMatch = normalized.match(/(?:kamera\s*)?(\d{1,3})\s*[- ]?\s*kamera|kamera\s*(\d{1,3})/);
  if (camMatch) {
    const num = camMatch[1] ?? camMatch[2];
    if (num) e.cameraNumber = parseInt(num, 10);
  } else {
    const bare = normalized.match(/\b(\d{1,3})\b/);
    if (bare && /kamera/.test(normalized)) e.cameraNumber = parseInt(bare[1], 10);
  }

  // Tartib son (birinchi kamera)
  for (const [word, n] of Object.entries(ORDINAL_WORDS)) {
    if (ws.includes(word)) {
      e.ordinal = n;
      break;
    }
  }

  // Hodisa turi
  for (const [code, keywords] of Object.entries(EVENT_TYPE_KEYWORDS) as [EventTypeCode, string[]][]) {
    if (keywords.some((k) => normalized.includes(k))) {
      e.eventType = code;
      break;
    }
  }

  // Davomat: kelmaganlar / yo'q
  if (/kelmagan|yo'q|nofaol|absent/.test(normalized)) e.attendanceAbsent = true;

  // Shaxs ismi: "<ism> ni top/qidir" — fe'ldan oldingi qism
  const searchIdx = ws.findIndex((w) => SEARCH_VERBS.includes(w));
  if (searchIdx > 0) {
    let namePart = ws.slice(0, searchIdx).join(" ");
    namePart = namePart.replace(/(ni|ini)$/, "").trim();
    if (namePart && !/texnikum|kamera|hudud|viloyat/.test(namePart)) {
      e.personName = namePart;
      e.personType = TEACHER_HINTS.some((h) => normalized.includes(h)) ? "teacher" : "student";
    }
    if (namePart && /texnikum/.test(namePart)) {
      e.placeQuery = namePart.replace(/texnikum(ini|i)?/, "").trim() || namePart;
    }
  }

  // Joy so'rovi: "... viloyatini ko'rsat" / "... texnikumini top"
  if (!e.placeQuery) {
    const placeMatch = normalized.match(/(.+?)\s*(?:viloyat(?:ini|ni)?|shahri|hudud(?:ini)?|texnikum(?:ini|i)?)/);
    if (placeMatch && /viloyat|shahri|hudud|texnikum/.test(normalized)) {
      const q = placeMatch[1]
        .replace(/\b(ko'rsat|och|top|qidir|ni|xaritada|xarita)\b/g, "")
        .trim();
      if (q) e.placeQuery = q;
    }
  }

  return e;
}
