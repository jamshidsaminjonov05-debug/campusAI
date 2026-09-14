/**
 * SERVER SOATI — "bugun" hisoblashda ishlatiladigan asos.
 *
 * `GUIDE.md` ("Vaqt zonasi bitta joydan — kodingizga tegadi"): "bugun"ni
 * brauzer zonasidan olmang — panel boshqa mintaqadan ochilsa (yoki
 * qurilmaning soati noto'g'ri sozlangan bo'lsa) hisoblangan "bugun"
 * serverdan bir kun farq qilib, ro'yxat SABABSIZ bo'sh chiqadi. kuzatuv posti
 * `GET /api/status` javobida `timezone.now` beradi — shu bilan brauzer
 * soatini solishtirib, farqni shu yerda saqlaymiz.
 *
 * ⚠️ Bu modul REACT'SIZ (`i18n/store.ts` naqshi bilan AYNI) — `attDay()`
 * (`hooks/useNvrAttendance.ts`) va `localDay()` (`hooks/useTodayArrivals.ts`)
 * kabi ko'plab joyda `useState(attDay())` sifatida, componentdan TASHQARI
 * chaqiriladi. `useSyncServerClock()` (`hooks/useNvrAttendance.ts`) ilova
 * ochilganda BIR MARTA server holatini so'rab, farqni shu yerga yozadi —
 * server hali `/api/status`ni bermasa (eski versiya) yoki so'rov
 * muvaffaqiyatsiz bo'lsa `offsetMs` `0` bo'lib qoladi, ya'ni xatti-harakat
 * OLDINGIDEK (brauzer soati) — hech qanday regressiya yo'q.
 */
let offsetMs = 0;

/** `timezone.now` (ISO, server zonasi bilan) — brauzer bilan farqni hisoblaydi. */
export function setServerClockFromIso(serverNowIso: string) {
  const serverNow = new Date(serverNowIso).getTime();
  if (Number.isNaN(serverNow)) return;
  offsetMs = serverNow - Date.now();
}

/** Brauzer soati + serverdan o'lchangan farq. */
export function nowAdjusted(): Date {
  return offsetMs === 0 ? new Date() : new Date(Date.now() + offsetMs);
}
