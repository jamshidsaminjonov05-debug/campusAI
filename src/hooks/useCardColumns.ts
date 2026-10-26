"use client";

import { useSyncExternalStore } from "react";

/**
 * KARTOCHKA TO'RIDAGI USTUNLAR SONI — foydalanuvchi slayder bilan tanlaydi
 * (2026-10-23, so'rov: "gridga 3,4,5,6,7,8 tadan card qilsa bo'lishi kerak
 * slider bilan"). "Aniqlanganlar" va "Ogohlantirishlar" to'rlari BITTA
 * qiymatdan o'qiydi — bir joyda o'zgartirilsa ikkalasida ham o'zgaradi.
 *
 * Qiymat `localStorage`da (`hik-card-cols`) — shu brauzerdagi operator
 * tanlovi, serverda bunday sozlama yo'q. Store React'siz (`detectionSeen.ts`
 * naqshi): `useSyncExternalStore` bilan o'qiladi, SSR'da default.
 */
export const CARD_COLS_MIN = 3;
export const CARD_COLS_MAX = 8;
const DEFAULT = 4;
const KEY = "hik-card-cols";

let value: number | null = null;
const listeners = new Set<() => void>();

function read(): number {
  if (value != null) return value;
  if (typeof window === "undefined") return DEFAULT;
  try {
    const n = Number(window.localStorage.getItem(KEY));
    value = Number.isFinite(n) && n >= CARD_COLS_MIN && n <= CARD_COLS_MAX ? n : DEFAULT;
  } catch {
    value = DEFAULT;
  }
  return value;
}

export function setCardColumns(n: number): void {
  const v = Math.min(CARD_COLS_MAX, Math.max(CARD_COLS_MIN, Math.round(n)));
  if (v === value) return;
  value = v;
  try {
    window.localStorage.setItem(KEY, String(v));
  } catch {
    /* kvota/private rejim — xotirada qoladi */
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Joriy ustunlar soni (3…8). */
export function useCardColumns(): number {
  return useSyncExternalStore(subscribe, read, () => DEFAULT);
}
