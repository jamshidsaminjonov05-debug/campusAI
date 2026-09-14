/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  KAMERA JOYLASHTIRISH — ish vaqtida tahrirlanadigan qatlam           ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * `config/cameraPlacements.ts` — KODDAGI jadval: u build bilan keladi va
 * foydalanuvchi uni o'zgartira olmaydi. Operator esa xaritada kamerani
 * qo'lda joylashtirishi, surishi va olib tashlashi kerak.
 *
 * Shu store `localStorage` da USTIDAN yoziladigan qatlam saqlaydi:
 *   · `placementFor()` avval SHU YERGA qaraydi, keyin koddagi jadvalga;
 *   · `null` qiymat — "koddagi joyni ham BEKOR QIL" degani (o'chirish),
 *     shunchaki kalitni yo'q qilish yetmaydi: koddagi qiymat qaytib kelardi.
 *
 * ⚠️ Backend kamera koordinatasini bergan kunda bu qatlam o'chiriladi va
 * `placementFor()` to'g'ridan-to'g'ri kamera yozuvidan o'qiydi.
 *
 * ⚠️ Ma'lumot SHU BRAUZERDA qoladi — server bilan almashinmaydi. Shuning
 * uchun `exportPlacements()` bor: operator natijani ko'chirib, koddagi
 * jadvalga doimiy qilib yozib qo'yishi mumkin.
 */
import type { CameraPlacement } from "@/config/cameraPlacements";

const KEY = "hik-camera-placements";

/** `null` — koddagi joy ham bekor qilingan (kamera taqsimlashga tushadi). */
export type PlacementOverride = CameraPlacement | null;

type Listener = () => void;
const listeners = new Set<Listener>();
let version = 0;

let cache: Record<string, PlacementOverride> | null = null;

function load(): Record<string, PlacementOverride> {
  if (cache) return cache;
  cache = {};
  if (typeof window === "undefined") return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === "object") cache = parsed as Record<string, PlacementOverride>;
    }
  } catch {
    /* buzuq JSON — bo'sh qatlam bilan davom etamiz */
  }
  return cache;
}

function persist(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(load()));
  } catch {
    /* kvota — o'zgarish shu sessiyada qoladi */
  }
  version++;
  for (const fn of listeners) fn();
}

/** Kanal uchun qo'lda qo'yilgan joy. `undefined` — qatlamda yo'q. */
export function overrideFor(channel: string | number): PlacementOverride | undefined {
  return load()[String(channel)];
}

/** Kamerani xaritaga qo'yish yoki surish. */
export function setPlacement(channel: string | number, at: CameraPlacement): void {
  load()[String(channel)] = at;
  persist();
}

/**
 * Kamerani xaritadan olib tashlash.
 *
 * Koddagi jadvalda ham bor bo'lsa `null` yoziladi — aks holda o'chirgandan
 * keyin kamera eski joyiga qaytib kelardi.
 */
export function clearPlacement(channel: string | number, hasStatic: boolean): void {
  const key = String(channel);
  if (hasStatic) load()[key] = null;
  else delete load()[key];
  persist();
}

/** Butun qatlamni tozalash — koddagi jadval qayta kuchga kiradi. */
export function resetPlacements(): void {
  cache = {};
  persist();
}

/** Nechta kanal qo'lda joylashtirilgan (`null` — o'chirilganlari sanalmaydi). */
export function placedCount(): number {
  return Object.values(load()).filter((v) => v != null).length;
}

/**
 * Qatlamni `cameraPlacements.ts` ga ko'chirib qo'yish uchun tayyor matn.
 *
 * Operator xaritada joylashtirib bo'lgach shu matnni nusxalab, koddagi
 * jadvalga qo'yadi — shunda joylar BARCHA brauzerlarda bir xil bo'ladi.
 */
export function exportPlacements(): string {
  const rows = Object.entries(load())
    .filter(([, v]) => v != null)
    .map(([ch, v]) => {
      const p = v as CameraPlacement;
      const note = p.note ? `, note: ${JSON.stringify(p.note)}` : "";
      const campus = p.campusId ? `, campusId: ${JSON.stringify(p.campusId)}` : "";
      return `  ${JSON.stringify(ch)}: { lat: ${p.lat}, lng: ${p.lng}${campus}${note} },`;
    });
  return rows.length === 0
    ? "// Hech qanday kamera joylashtirilmagan"
    : `export const CAMERA_PLACEMENTS: Record<string, CameraPlacement> = {\n${rows.join("\n")}\n};`;
}

export function subscribePlacements(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const placementsVersion = (): number => version;
