import { COMMAND_REGISTRY, type CommandDef, type IntentId } from "./VoiceCommandRegistry";
import type { VoiceEntities } from "./VoiceEntityExtractor";
import { stem, tokens } from "./VoiceNormalizer";

/**
 * VoiceIntentPredictor — normallashgan matnni buyruqlar bilan fuzzy solishtiradi
 * va har biri uchun ishonch (confidence) beradi. Aniq matn mosligiga bog'liq emas:
 * to'liqsiz ("kam" → Kameralar) va xato yozilgan buyruqlarni ham taxmin qiladi.
 */
export interface IntentPrediction {
  id: IntentId;
  command: CommandDef;
  confidence: number; // 0..1
  entities: VoiceEntities;
  /** Buyruq talab qilgan birlik yo'q (masalan kamera raqami) → avtomatik bajarilmaydi. */
  incomplete: boolean;
}

/** Avtomatik bajarish uchun minimal ishonch. Pastroq bo'lsa — takliflar ko'rsatiladi. */
export const EXECUTE_THRESHOLD = 0.62;

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/** Ikki so'z o'xshashligi 0..1 (aniq / prefiks / ichki / Levenshtein). */
export function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  if (long.startsWith(short) && short.length >= 2) return 0.72 + 0.28 * (short.length / long.length);
  if (long.includes(short) && short.length >= 3) return 0.6 + 0.2 * (short.length / long.length);
  const dist = levenshtein(a, b);
  const ratio = 1 - dist / Math.max(a.length, b.length);
  return ratio > 0.6 ? ratio * 0.85 : 0;
}

function keywordScore(normalized: string, inputWords: string[], keyword: string): number {
  if (normalized.includes(keyword)) return 1;
  const kw = keyword.split(" ").map(stem);
  if (kw.length > 1) {
    const sims = kw.map((k) => Math.max(0, ...inputWords.map((w) => similarity(w, k))));
    const min = Math.min(...sims);
    const avg = sims.reduce((s, v) => s + v, 0) / sims.length;
    return min > 0.5 ? 0.6 + (0.35 * (avg - 0.5)) / 0.5 : 0;
  }
  return Math.max(0, ...inputWords.map((w) => similarity(w, kw[0])));
}

function baseScore(normalized: string, inputWords: string[], cmd: CommandDef): number {
  let best = 0;
  for (const kw of cmd.keywords) {
    best = Math.max(best, keywordScore(normalized, inputWords, kw));
    if (best >= 1) break;
  }
  return best;
}

/** Normallashgan matn + ajratilgan birliklar → ishonch bo'yicha tartiblangan taxminlar. */
export function predictIntents(normalized: string, entities: VoiceEntities): IntentPrediction[] {
  const inputWords = tokens(normalized).map(stem);

  const preds: IntentPrediction[] = COMMAND_REGISTRY.map((command) => {
    let confidence = baseScore(normalized, inputWords, command);
    let incomplete = false;

    if (command.requires) {
      const hasEntity = entities[command.requires] !== undefined;
      if (hasEntity) {
        // Kerakli birlik topilgani buyruqni kuchli tasdiqlaydi
        confidence = Math.min(1, Math.max(confidence, 0.7) + 0.2);
      } else {
        // Birlik yo'q — hali ham taklif sifatida ko'rsatiladi, lekin bajarilmaydi
        incomplete = true;
        confidence *= 0.5;
      }
    }

    return { id: command.id, command, confidence: Math.min(1, confidence), entities, incomplete };
  });

  return preds.filter((p) => p.confidence > 0.15).sort((a, b) => b.confidence - a.confidence);
}
