/**
 * BILDIRISHNOMALARNI JIMITISH — global yoqish/o'chirish tugmasi.
 *
 * 2026-09-18, foydalanuvchi so'rovi: "hozirda kimdir aniqlansa bizga alert
 * sifatida ko'rinadi ... shuni chiqmaydigan qilish ... hodisa aniqlansa
 * ham alert chiqmaydigan qiladigan tugma qo'shishing kerak — bossam
 * chiqmay qoladi va alert rangsiz bo'lib qoladi".
 *
 * React'siz kichik store (`detectionSeen.ts` bilan AYNI naqsh): holat
 * `localStorage` da, o'zgarish obunachilarga xabar qilinadi. Bell
 * (`NotificationBell.tsx`) va ekran ustidagi tez xabar (`DetectionToast.tsx`)
 * ikkalasi ham shu yerdan o'qiydi.
 *
 * ⚠️ **Hodisa O'ZI yo'qolmaydi, faqat "ALERT" qatlami jimlanadi** —
 * "Aniqlanganlar" bo'limida (tarix) hamon to'liq ko'rinadi, `detectionSeen.ts`
 * bilan ARALASHTIRILMAYDI (bu — global rejim, u — bitta-bitta hodisa holati):
 *   · `DetectionToast` — jim bo'lsa YANGI hodisa uchun ekran ustida
 *     qalqib chiquvchi karta va ovoz/nutq UMUMAN ishga tushmaydi;
 *   · `NotificationBell` — jim bo'lsa qo'ng'iroq "jaranglamaydi" (qizil
 *     rozetka/halqa chizilmaydi), ro'yxatdagi yangi qatorlar esa "ko'rilgan"
 *     kabi RANGSIZ (`.is-seen`) bo'lib chiqadi — operator qo'lda ochsa
 *     baribir ko'radi, faqat "yangi/muhim" deb ajratilmaydi.
 *
 * NEGA `localStorage`: bu — shu brauzerdagi operatorning shaxsiy tanlovi
 * (boshqa kompyuterda yana yoqiq holatda ochiladi), serverga aloqasi yo'q.
 */

const KEY = "hik-notify-muted";

type Listener = () => void;

const listeners = new Set<Listener>();
/** `null` — hali o'qilmagan (birinchi murojaatda diskdan yuklanadi). */
let cache: boolean | null = null;
let version = 0;

function load(): boolean {
  if (cache !== null) return cache;
  // SSR'da `localStorage` yo'q — jim EMAS holat bilan davom etamiz
  if (typeof window === "undefined") return false;
  try {
    cache = window.localStorage.getItem(KEY) === "1";
  } catch {
    cache = false;
  }
  return cache;
}

/** Jim rejimi yoqiqmi. */
export function isNotifyMuted(): boolean {
  return load();
}

/** Yoqish/o'chirish — `undefined` bo'lsa teskarisiga almashtiradi (toggle). */
export function setNotifyMuted(v?: boolean): void {
  const next = v ?? !load();
  cache = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, next ? "1" : "0");
    } catch {
      /* kvota to'lgan — holat sessiya davomida xotirada qoladi */
    }
  }
  // Versiya obunachilardan OLDIN oshadi — aks holda React eski snapshot'ni
  // o'qib, qayta chizmasdi (`detectionSeen.ts` dagi AYNI izoh).
  version++;
  for (const fn of listeners) fn();
}

/** Obuna — React `useSyncExternalStore` uchun. */
export function subscribeNotifyMuted(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const notifyMuteVersion = (): number => version;
