/**
 * "Aniqlanganlar" bildirishnomasi — qaysi hodisa KO'RILGAN/TASDIQLANGAN.
 *
 * React'siz kichik store (`i18n/store.ts` bilan bir xil naqsh): holat
 * `localStorage` da, o'zgarish obunachilarga xabar qilinadi. Header'dagi
 * qo'ng'iroq va "Aniqlanganlar" sahifasi ikkalasi ham shu yerdan o'qiydi,
 * shuning uchun sahifa ochilishi bilan rozetka darhol kamayadi.
 *
 * NEGA `localStorage`: bildirishnoma "o'qildi" holati SERVERDA yo'q
 * (`FRONTEND.md` da bunday maydon yo'q) va u shu brauzerdagi operatorga
 * tegishli. Server bergan kunda faqat shu fayl almashtiriladi.
 *
 * ⚠️ Ro'yxat CHEKLANGAN (`MAX_IDS`): kuzatuv posti kuniga minglab hodisa beradi va
 * cheksiz o'sadigan massiv `localStorage` kvotasini (~5 MB) to'ldirib,
 * `setItem` XATO tashlardi. Eng yangi id'lar saqlanadi — eskilari baribir
 * ro'yxatdan chiqib ketgan bo'ladi.
 */

const KEY = "hik-detections-seen";
const MAX_IDS = 800;

type Listener = () => void;

const listeners = new Set<Listener>();
/** `null` — hali o'qilmagan (birinchi murojaatda diskdan yuklanadi). */
let cache: Set<string> | null = null;

/**
 * Store'ning "versiyasi" — `useSyncExternalStore` snapshot'i.
 *
 * To'plamning O'ZINI qaytarib bo'lmaydi: u har safar bir xil havola
 * (mutatsiya qilinadi), React esa o'zgarishni sezmaydi. Shuning uchun
 * har o'zgarishda ortadigan sanoq qaytariladi.
 */
let version = 0;

function load(): Set<string> {
  if (cache) return cache;
  cache = new Set();
  // SSR'da `localStorage` yo'q — bo'sh to'plam bilan davom etamiz
  if (typeof window === "undefined") return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const arr: unknown = JSON.parse(raw);
      if (Array.isArray(arr)) for (const id of arr) if (typeof id === "string") cache.add(id);
    }
  } catch {
    /* buzuq JSON yoki kvota — bo'sh tarix bilan davom etamiz */
  }
  return cache;
}

function persist(): void {
  if (typeof window === "undefined") return;
  const ids = [...load()];
  // Oxirgi `MAX_IDS` ta saqlanadi (yangilari massiv OXIRIDA)
  const trimmed = ids.length > MAX_IDS ? ids.slice(ids.length - MAX_IDS) : ids;
  if (trimmed.length !== ids.length) cache = new Set(trimmed);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch {
    /* kvota to'lgan — holat sessiya davomida xotirada qoladi */
  }
  // Versiya obunachilardan OLDIN oshadi — aks holda React eski snapshot'ni
  // o'qib, qayta chizmasdi
  version++;
  for (const fn of listeners) fn();
}

/** Bitta hodisa ko'rilganmi. */
export function isSeen(id: string): boolean {
  return load().has(id);
}

/**
 * Ro'yxatdagi ko'rilmaganlar. Tartib saqlanadi.
 *
 * `id` kuzatuv postida SON (`NvrEvent.id`), demo oqimida esa MATN — shuning uchun
 * ikkalasi ham qabul qilinadi va kalit matnga keltiriladi.
 */
export function unseenOf<T extends { id: string | number }>(events: readonly T[]): T[] {
  const seen = load();
  return events.filter((e) => !seen.has(String(e.id)));
}

/** Bir yoki bir nechta hodisani ko'rilgan deb belgilash. */
export function markSeen(ids: readonly string[]): void {
  const seen = load();
  let changed = false;
  for (const id of ids) {
    if (!seen.has(id)) {
      seen.add(id);
      changed = true;
    }
  }
  if (changed) persist();
}

/** Obuna — React `useSyncExternalStore` uchun. */
export function subscribeSeen(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const seenVersion = (): number => version;
