/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  SHAXSGA BIRIKTIRILGAN HODISALAR — operator reyestri                 ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * 🔴 **NEGA QO'LDA, AVTOMATIK EMAS.** Kuzatuv posti API'sida hodisa
 * SHAXSGA bog'lanmaydi (o'lchandi 2026-09-14, `NvrEvent`):
 *   · `face` hodisasida — `face_id` va `person` bor, ya'ni KIM ekani ma'lum;
 *   · `gun` / `janjal` / `smoking` hodisasida — faqat `targets`, `boxes`,
 *     `alert`; odam raqami UMUMAN YO'Q.
 *
 * Ya'ni "bu janjal shu o'quvchiniki" degan xulosani server bermaydi.
 * Uni vaqt/kamera yaqinligi bilan TAXMIN qilish mumkin edi, lekin bitta
 * kadrda bir necha odam turadi — begona odamning janjali nomi ma'lum
 * bolaga yozilib qolardi. Bola haqidagi bunday ayblov TAXMIN bo'lishi
 * mumkin emas, shuning uchun bog'lanishni FAQAT operator tasdiqlaydi
 * (foydalanuvchi tanlovi, 2026-09-14).
 *
 * Saqlash — `localStorage` (offline qoidasi; `lib/absenceReasons.ts` va
 * `lib/detectionSeen.ts` bilan AYNI naqsh).
 *
 * ⚠️ **Reyestr SHU BRAUZERDA qoladi** — boshqa kompyuterda ko'rinmaydi.
 * Server hodisa↔shaxs maydonini bergan kunda FAQAT shu fayl
 * almashtiriladi: quyidagi funksiyalar imzosi o'zgarmasa iste'molchilarga
 * tegilmaydi.
 */

const STORAGE_KEY = "hik-person-incidents";

/** Biriktirilgan hodisa — ko'rsatish uchun kerak bo'lgan MINIMUM nusxa.
 *  (Hodisaning o'zi serverda qoladi; bu yerda faqat havola va yorliq.) */
export interface PersonIncident {
  /** kuzatuv posti hodisasi raqami — dossiye shu bilan ochiladi. */
  eventId: number;
  /** `gun` | `janjal` | `smoking` | `face` … — belgisi/rangi shundan. */
  category: string;
  /** Ekranda ko'rinadigan nom (server bergan `label`). */
  label: string;
  /** Hodisa vaqti (ISO) — qayta so'ramasdan ko'rsatish uchun. */
  time: string;
  /** Kamera kanali va nomi. */
  channel: string;
  camera: string;
  /** Operator izohi — ixtiyoriy. */
  note?: string;
  /** Kim qachon biriktirgani (ISO). */
  at: string;
}

/**
 * Kim uchun biriktirilgani — REYESTR KALITI.
 *
 * Ikki xil bo'lishi mumkin, chunki shaxs paneli ikkala manbadan ham
 * ochiladi: ro'yxatdagi odam (`p:<person_id>`) va hali ro'yxatga
 * olinmagan begona yuz (`f:<face_id>` — `FRONTEND.md` 5-B: bir xil yuz
 * DOIM bir xil raqamni oladi, ya'ni bu ham BARQAROR kalit).
 */
export const personKey = (personId: number) => `p:${personId}`;
export const faceKey = (faceId: number) => `f:${faceId}`;

/** Kalit → biriktirilgan hodisalar. */
type Registry = Record<string, PersonIncident[]>;

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
    /* kvota to'lgan — biriktirish faqat shu sessiyada qoladi */
  }
  for (const fn of listeners) fn();
}

/** O'zgarishga obuna (React `useSyncExternalStore` uchun). */
export function subscribeIncidents(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Snapshot — REYESTR O'ZI emas, VERSIYA sanog'i.
 *
 * ⚠️ `useSyncExternalStore` snapshot'ni `Object.is` bilan solishtiradi:
 * obyekt qaytarilsa va u har chaqiruvda yangi bo'lsa React cheksiz
 * qayta chizadi (`detectionSeen.ts` dagi AYNI tuzoq).
 */
let version = 0;
export function incidentsVersion(): number {
  return version;
}

/** Shaxsga biriktirilgan hodisalar — eng yangisi birinchi. */
export function incidentsOf(key: string): PersonIncident[] {
  const list = read()[key] ?? [];
  return [...list].sort((a, b) => (a.time < b.time ? 1 : -1));
}

/** Biriktirish. Bir hodisa ikki marta qo'shilmaydi. */
export function linkIncident(key: string, incident: Omit<PersonIncident, "at">): void {
  const reg = read();
  const list = reg[key] ?? [];
  if (list.some((i) => i.eventId === incident.eventId)) return;
  version++;
  write({ ...reg, [key]: [...list, { ...incident, at: new Date().toISOString() }] });
}

/** Bog'lanishni bekor qilish (xato biriktirilgan bo'lsa). */
export function unlinkIncident(key: string, eventId: number): void {
  const reg = read();
  const list = reg[key] ?? [];
  if (!list.some((i) => i.eventId === eventId)) return;
  version++;
  const next = list.filter((i) => i.eventId !== eventId);
  const copy = { ...reg };
  if (next.length) copy[key] = next;
  else delete copy[key];
  write(copy);
}

/** Shu hodisa allaqachon biriktirilganmi (tanlash ro'yxatida belgilash uchun). */
export function isLinked(key: string, eventId: number): boolean {
  return (read()[key] ?? []).some((i) => i.eventId === eventId);
}
