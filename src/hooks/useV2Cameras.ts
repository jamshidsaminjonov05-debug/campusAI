/**
 * "2-VERSIYA" KAMERA TANLOVI — qaysi kameralarning hodisalari ko'rsatilsin
 * (2026-10-24, foydalanuvchi: "2-versiyada hozir hamma qurollar va janjallar
 * chiqyabdi, o'rniga faqat aynan men bergan kameralarni chiqarish").
 *
 * Ikki lokal server (qurol — `weapon2`, janjal — `janjal2`) BIR-BIRIDAN
 * MUSTAQIL kamera raqamlariga ega (`camera_id` fazolari boshqa-boshqa),
 * shuning uchun tanlov manba bo'yicha alohida saqlanadi. Bo'sh ro'yxat —
 * "hammasi" (filtr yo'q, avvalgidek).
 *
 * Qiymat `localStorage`da (`hik-v2-cameras`) — shu brauzerdagi operatorning
 * sozlamasi, serverda bunday maydon yo'q. `useCardColumns` bilan AYNI
 * naqsh (React'siz store + `useSyncExternalStore`).
 */
import { useSyncExternalStore } from "react";

export type V2Source = "weapon2" | "janjal2";
export interface V2Cameras {
  weapon2: number[];
  janjal2: number[];
}

const KEY = "hik-v2-cameras";
const EMPTY: V2Cameras = { weapon2: [], janjal2: [] };

let value: V2Cameras | null = null;
const listeners = new Set<() => void>();

const clean = (v: unknown): number[] =>
  Array.isArray(v) ? Array.from(new Set(v.map(Number).filter((n) => Number.isInteger(n) && n > 0))).sort((a, b) => a - b) : [];

function read(): V2Cameras {
  if (value) return value;
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    const p = raw ? (JSON.parse(raw) as Partial<Record<V2Source, unknown>>) : null;
    value = p ? { weapon2: clean(p.weapon2), janjal2: clean(p.janjal2) } : EMPTY;
  } catch {
    value = EMPTY;
  }
  return value;
}

export function setV2Cameras(source: V2Source, ids: number[]): void {
  const next: V2Cameras = { ...read(), [source]: clean(ids) };
  value = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* kvota/private rejim — xotirada qoladi */
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Tanlangan kameralar (manba bo'yicha). Bo'sh massiv — filtr yo'q. */
export function useV2Cameras(): V2Cameras {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
