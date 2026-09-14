/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  MODAL ↔ BRAUZER TARIXI — "◀ orqaga" avval OYNANI yopadi             ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * `lib/pageRoute.ts` bo'limlar uchun tarix yozuvini qo'shadi. Bu modul
 * xuddi shuni OYNALAR uchun qiladi: oyna ochilganda tarixga bitta yozuv
 * qo'shiladi, "orqaga" bosilganda esa bo'lim almashmaydi — avval o'sha
 * oyna yopiladi. Telefon/planshetdagi "orqaga" imo-ishorasi ham shunday
 * ishlaydi, ya'ni odat bo'yicha kutilgan xatti-harakat.
 *
 * ── QANDAY ISHLAYDI ───────────────────────────────────────────────────
 * Oyna ochilganda `history.pushState` chaqiriladi — **manzil
 * O'ZGARMAYDI** (bo'lim o'sha-o'sha), faqat yozuvning `state` iga
 * qatlamlar CHUQURLIGI yoziladi. "Orqaga" bosilganda kelgan yozuvdagi
 * chuqurlik joriysidan kichik bo'lsa — farq qancha bo'lsa, shuncha oyna
 * yopiladi. Shu sabab ustma-ust ochilgan oynalar ham (masalan
 * "Kameraga tushgan odamlar" → dossiye → rasm ko'ruvchisi) BITTA-BITTADAN
 * yopiladi.
 *
 * ⚠️ **Manzil o'zgarmagani ATAYLAB**: `pageFromUrl()` o'sha bo'limni
 * qaytaraveradi, ya'ni `usePageHistory` bu yozuvlarni "bo'lim almashdi"
 * deb o'ylamaydi — ikkala tinglovchi bir-biriga xalaqit bermaydi.
 *
 * ⚠️ **Oyna X/Esc bilan yopilsa tarix yozuvi ham OLINADI** (`history.go`),
 * aks holda tarixda "o'lik" yozuv qolib, keyinroq "orqaga" bosilganda
 * hech narsa bo'lmagandek tuyulardi.
 */

/**
 * Bitta ochiq oyna.
 *
 * `close()` **`false` qaytarsa** oyna yopilmaydi — masalan formada
 * saqlanmagan ma'lumot bor va foydalanuvchidan tasdiq so'ralmoqda. Bunday
 * holatda tarix yozuvi QAYTA QO'YILADI (pastga qarang).
 */
interface Layer {
  id: number;
  close: () => void | boolean;
}

/** `history.state` ichidagi maydon — nechta oyna ochiq bo'lgani. */
export const MODAL_DEPTH_KEY = "__campusModalDepth";

let layers: Layer[] = [];
let seq = 0;
/**
 * `history.go()` ni O'ZIMIZ chaqirdikmi.
 *
 * Oyna X bilan yopilganda tarix yozuvini olib tashlaymiz, bu esa
 * `popstate` ni uyg'otadi — o'sha hodisani "foydalanuvchi orqaga bosdi"
 * deb tushunib, oynani IKKINCHI marta yopishga urinmasligimiz kerak.
 */
let selfNav = 0;
let listening = false;

function depthOf(state: unknown): number {
  if (!state || typeof state !== "object") return 0;
  const v = (state as Record<string, unknown>)[MODAL_DEPTH_KEY];
  return typeof v === "number" ? v : 0;
}

function onPopState() {
  if (selfNav > 0) {
    selfNav--;
    return;
  }
  const depth = depthOf(window.history.state);
  /* Chuqurlik pasaydi — farq qancha bo'lsa shuncha oyna yopiladi
     (eng ustkisidan boshlab). */
  while (layers.length > depth) {
    const top = layers[layers.length - 1];
    if (!top) break;
    if (top.close() === false) {
      /* ⚠️ **YOPISH BEKOR QILINDI** (saqlanmagan ma'lumot — tasdiq
         so'ralmoqda). `popstate` ni to'xtatib bo'lmaydi: yozuv
         allaqachon olib tashlangan, shuning uchun uni QAYTA qo'yamiz —
         aks holda oyna ochiq qolgani holda tarixda unga tegishli yozuv
         bo'lmasdi va keyingi "orqaga" bo'limni almashtirib yuborardi.
         `pushState` `popstate` ni uyg'otmaydi, ya'ni halqa yo'q. */
      const state = { ...(window.history.state ?? {}), [MODAL_DEPTH_KEY]: layers.length };
      window.history.pushState(state, "", window.location.href);
      break;
    }
    layers.pop();
  }
}

function ensureListener() {
  if (listening || typeof window === "undefined") return;
  window.addEventListener("popstate", onPopState);
  listening = true;
}

/** Oyna ochildi — tarixga bitta yozuv. Qaytgan `id` yopishda kerak. */
export function openModalLayer(close: () => void | boolean): number {
  if (typeof window === "undefined") return 0;
  ensureListener();
  const id = ++seq;
  layers.push({ id, close });
  const state = { ...(window.history.state ?? {}), [MODAL_DEPTH_KEY]: layers.length };
  // Manzil O'ZGARMAYDI — faqat yangi yozuv qo'shiladi
  window.history.pushState(state, "", window.location.href);
  return id;
}

/** Oyna yopildi (X, Esc, fon bosildi yoki komponent unmount bo'ldi). */
export function closeModalLayer(id: number): void {
  if (typeof window === "undefined" || id === 0) return;
  const idx = layers.findIndex((l) => l.id === id);
  if (idx === -1) return;

  const removed = layers.length - idx;
  layers = layers.slice(0, idx);

  /* ⚠️ Tarixdan faqat SHU qatlam hali o'sha yerda tursa qaytamiz.
     Bo'lim almashib ketgan bo'lsa (`resetModalLayers`) chuqurlik
     allaqachon nolga tushgan — u holda `history.go` foydalanuvchini
     bekordan-bekor oldingi bo'limga tashlab yuborardi. */
  if (depthOf(window.history.state) >= idx + removed) {
    selfNav++;
    window.history.go(-removed);
  }
}

/**
 * Bo'lim almashdi — ochiq oynalar baribir unmount bo'ladi.
 *
 * Ro'yxat tarixga TEGMASDAN tozalanadi: yangi bo'lim yozuvi ustidan
 * qo'shilgan, ya'ni eski oyna yozuvlariga qaytishning ma'nosi yo'q.
 */
export function resetModalLayers(): void {
  layers = [];
}
