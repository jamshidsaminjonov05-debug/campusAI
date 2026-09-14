/**
 * Dashboard footer'idagi aniqlash turlari (AI detektorlari).
 *
 * Bitta manba: footer tugmalari, alert kartochkalari va sanoqlar shu ro'yxatdan
 * o'qiydi — yangi detektor qo'shish = shu massivga bitta yozuv.
 *
 * DIQQAT: backend `POST /events` faqat cheklangan kodlarni oladi
 * (`crowd, fight, smoking, no_pass, left_object, unknown_person, other`).
 * Telefon/yong'in/qurol hali backend'da yo'q — ular `code: null` bilan turadi
 * va real hodisa oqimida `other` sifatida keladi (qo'shilsa avto-ishlaydi).
 */
/* Ikonkalar — `@phosphor-icons/react` (ilova bo'ylab bitta uslub: duotone/fill).
   Ilgari lucide chiziqli ikonkalari edi: janjal `Swords` (o'rta asr qilichlari),
   telefon `PhoneCall` (statsionar go'shak) — ikkalasi ham ma'noga to'g'ri
   kelmasdi. "Qurol" uchun phosphor'da ikonka YO'Q, shuning uchun O'Z
   SVG'imiz ishlatiladi (`common/PistolIcon.tsx`) — ilgari `Crosshair`
   (nishonga olish halqasi) turardi va u qurolga o'xshamasdi. */
import {
  BoxingGlove,
  Cigarette,
  DeviceMobile,
  type Icon as PhosphorIcon,
  Prohibit,
} from "@phosphor-icons/react";
import { Pistol } from "@/components/common/PistolIcon";

/* ⚠️ "To'planish" (`crowd`) va "Yong'in" (`fire`) UI'dan BUTUNLAY olib
   tashlandi (operator talabi): ular hech qaysi ro'yxatda, panelda yoki
   diagrammada ko'rinmasligi kerak. `crowd` backend `POST /events` da hali
   qabul qilinadi, lekin oqimga tushmaydi — `detectionIdByCode()` uni
   topmagani uchun bunday hodisa e'tiborsiz qoladi. */
export type DetectionId = "smoking" | "fight" | "phone" | "unknown_person" | "weapon";

export interface DetectionType {
  id: DetectionId;
  label: string;
  /** Footer yorlig'i — bir qatorga sig'adigan qisqa nom. */
  short: string;
  icon: PhosphorIcon;
  color: string;
  /** Backend `event_type` kodi (yo'q bo'lsa — hali qo'llanmaydi). */
  code: string | null;
  /** Asosiy detektor — footer markazida kattaroq, alertlar shundan chiqadi. */
  primary?: boolean;
}

/** Footer tartibi — markazda "Begona odam" (asosiy). */
export const DETECTION_TYPES: DetectionType[] = [
  /* ⚠️ **TO'Q APELSIN** — "Begona odam" `#f59e0b` ga o'tgach
     chekish bilan AYNI rang bo'lib qolardi (diagrammada ikki
     bo'lakni ajratib bo'lmasdi). Bitta so'z bilan qaytariladi. */
  { id: "smoking", label: "Chekish", short: "Chekish", icon: Cigarette, color: "#e2603a", code: "smoking" },
  { id: "fight", label: "Janjal", short: "Janjal", icon: BoxingGlove, color: "#f43f5e", code: "fight" },
  { id: "phone", label: "Telefonda gaplashish", short: "Telefon", icon: DeviceMobile, color: "#a78bfa", code: null },
  /* ⚠️ **KAHRABO (`#f59e0b`), qizil EMAS** (2026-09-05, foydalanuvchi
     so'rovi): ilgari `#ff4d4d` edi va "Janjal" ning `#f43f5e` idan
     deyarli farq qilmasdi — diagrammada ikki bo'lak bir xil
     ko'rinardi. */
  { id: "unknown_person", label: "Begona odam", short: "Begona odam", icon: Prohibit, color: "#f59e0b", code: "unknown_person", primary: true },
  { id: "weapon", label: "Qurol", short: "Qurol", icon: Pistol, color: "#e879f9", code: null },
];

export const DETECTION_BY_ID = new Map(DETECTION_TYPES.map((d) => [d.id, d]));

/** Backend `event_type` → detektor id (topilmasa `null`). */
export function detectionIdByCode(code: string): DetectionId | null {
  return DETECTION_TYPES.find((d) => d.code === code)?.id ?? null;
}
