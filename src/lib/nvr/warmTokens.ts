import { listJanjal2Alerts } from "./janjal2Api";
import { listWeapon2Alerts } from "./weapon2Api";

/**
 * Login paytida 2-versiya serverlariga (qurol — `weapon2`, janjal —
 * `janjal2`) oldindan so'rov yuboradi.
 *
 * Ularning tokeni serverdagi proxy'da (`tokenProxy.ts`) birinchi so'rovda
 * olinadi va keshlanadi. Shu chaqiruvsiz bu login "Aniqlanganlar → 2-versiya"
 * birinchi bosilganda bajarilardi va ro'yxat sekin ochilardi.
 *
 * ⚠️ Avval `/session` KUTILADI: proxy sessiya cookie'sisiz `401` qaytaradi,
 * `api.login` ichidagi `syncNvrSession()` esa uni kutmasdan yuboradi.
 * Natija va xatolar ATAYLAB e'tiborsiz — bu faqat isitish, login'ni
 * to'xtatmasligi kerak.
 */
export function warmLocalModelTokens(): void {
  if (typeof window === "undefined") return;
  void (async () => {
    try {
      await fetch("/session", { method: "POST" });
      await Promise.allSettled([listWeapon2Alerts(1, 1), listJanjal2Alerts(1, 1)]);
    } catch {
      /* isitish — xato muhim emas */
    }
  })();
}
