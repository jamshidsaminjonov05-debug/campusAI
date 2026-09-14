/**
 * Aniqlangan hodisaning XAVFLILIK DARAJASI va rangi.
 *
 * ⚠️ Bu KATEGORIYA rangi EMAS (`NVR_COLOR` — yuz ko'k, chekish sariq…).
 * Operator uchun muhimi "qanchalik jiddiy", "qaysi turdagi" emas: shuning
 * uchun ATIGI UCH pog'ona — ilovadagi Trevoga / Diqqat / Norma palitrasining
 * o'zi (Geo Analitika va Statistika ham shu uchtadan foydalanadi).
 *
 * Header'dagi bildirishnoma qo'ng'irog'i va "Aniqlanganlar" kartochkalari
 * SHU bitta funksiyadan o'qiydi — ikkalasida rang bir xil bo'lsin.
 */
import type { NvrEvent } from "@/lib/nvrApi";

export type DetectionLevel = "alarm" | "warn" | "info";

export const LEVEL_TONE: Record<DetectionLevel, string> = {
  alarm: "#F43F5E",
  warn: "#F59E0B",
  info: "#38BDF8",
};

export function detectionLevel(ev: NvrEvent): DetectionLevel {
  // Qurol yoki serverning `alert` bayrog'i — darhol e'tibor
  if (ev.alert || ev.category === "gun") return "alarm";
  if (ev.category === "janjal") return "alarm";
  if (ev.category === "smoking") return "warn";
  // Tanilmagan yuz — tekshirish kerak, tanilgani oddiy qayd
  if (ev.category === "face" && ev.recognized === false) return "warn";
  return "info";
}
