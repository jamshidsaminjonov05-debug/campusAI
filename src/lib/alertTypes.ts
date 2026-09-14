/**
 * Trevoga hodisasining UMUMIY shakli va jiddiylik ranglari.
 *
 * ⚠️ Ilgari bu tiplar `lib/mockData.ts` da edi — o'sha fayl butunlay
 * O'CHIRILDI (mock son generatsiya qilardi). Tiplarning o'zi esa MOCK
 * emas: ular kuzatuv posti va backend hodisalarini bitta shaklga keltiradi
 * (`lib/detectionEvents.ts` `toAlertEvent()`), ya'ni haqiqiy oqim uchun
 * kerak. Shuning uchun alohida, ma'lumotsiz faylga ko'chirildi.
 */

export type AlertSeverity = "critical" | "high" | "medium" | "low" | "info";

export interface AlertEvent {
  id: string;
  title: string;
  severity: AlertSeverity;
  time: string;
  institute: string;
  camera: string;
  participants?: number;
}

export const SEVERITY_COLOR: Record<AlertSeverity, string> = {
  critical: "#EF4444",
  high: "#EF4444",
  medium: "#F97316",
  low: "#EAB308",
  info: "#2563EB",
};
