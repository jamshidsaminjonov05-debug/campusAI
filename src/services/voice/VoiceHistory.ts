import type { IntentId } from "./VoiceCommandRegistry";

/**
 * VoiceHistory — oxirgi 20 ovozli buyruqni saqlaydi (localStorage), replay uchun.
 * Sof funksiyalar — React'ga bog'liq emas; VoiceProvider o'qib/yozib turadi.
 */
export interface VoiceHistoryEntry {
  transcript: string;
  intentId: IntentId | null;
  label: string;
  confidence: number;
  success: boolean;
  at: number;
}

const KEY = "hik-voice-history";
const MAX = 20;

export function loadHistory(): VoiceHistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as VoiceHistoryEntry[];
    return Array.isArray(arr) ? arr.slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function pushHistory(entry: VoiceHistoryEntry): VoiceHistoryEntry[] {
  const next = [entry, ...loadHistory()].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* localStorage to'la bo'lishi mumkin — jim o'tkazamiz */
  }
  return next;
}

export function clearHistory(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
