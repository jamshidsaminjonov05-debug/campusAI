/**
 * Rol asosidagi ruxsatlar — YAGONA joy. Yangi cheklangan amal qo'shish uchun
 * shu faylga bitta `Action` va `MATRIX`ga bitta yozuv yetarli — sahifalarda
 * `role === "admin"` kabi tekshiruv qaytarilmasin.
 *
 * DIQQAT: bu — FAQAT UX qatlami (tugmani yashirish/xabar berish). Haqiqiy
 * xavfsizlik chegarasi backend'da (`401`/`403`) — frontend bu yerda faqat
 * foydalanuvchiga oldindan aniq signal beradi, ruxsatsiz so'rov baribir
 * backend tomonidan rad etiladi.
 */
import { useAuthStore } from "@/store/useAuthStore";

/**
 * Rollar:
 *   viewer       — faqat ko'radi
 *   operator     — hodisa/kamera boshqaruvi, shaxs tahriri
 *   school_admin — O'Z MUASSASASI ichida to'liq huquq, boshqasini ko'rmaydi
 *   admin        — bosh admin: respublika miqyosi, barcha muassasa
 *
 * DIQQAT: `school_admin` va `admin` farqi — huquq DARAJASIDA emas, KO'LAMIDA.
 * Ikkalasi ham bir xil amallarni bajaradi; farqi `lib/institutionScope.ts` da
 * (kim qaysi muassasani ko'radi).
 */
export type Role = "viewer" | "operator" | "school_admin" | "admin";

export const ROLES: Role[] = ["viewer", "operator", "school_admin", "admin"];

export const ROLE_LABEL: Record<Role, string> = {
  viewer: "Kuzatuvchi",
  operator: "Operator",
  school_admin: "Muassasa administratori",
  admin: "Bosh administrator",
};

export type Action =
  | "camera.create"
  | "camera.update"
  | "camera.delete"
  | "camera.control" // play/pause/check
  | "person.create"
  | "person.update"
  | "person.delete"
  | "person.import"
  | "event.resolve"
  | "event.create"
  | "user.create";

/** viewer — faqat ko'radi (bo'sh to'plam). admin — hammasi (pastda alohida tekshiriladi). */
const OPERATOR_ACTIONS = new Set<Action>([
  "camera.control",
  "person.update",
  "event.resolve",
  "event.create",
]);

export function isKnownRole(v: string | undefined | null): v is Role {
  return v === "viewer" || v === "operator" || v === "school_admin" || v === "admin";
}

/** Faqat bosh admin qila oladigan amallar (muassasadan yuqori daraja). */
const GLOBAL_ONLY = new Set<Action>(["user.create"]);

export function canPerform(role: string | undefined | null, action: Action): boolean {
  if (!isKnownRole(role)) return false;
  if (role === "admin") return true;
  // Muassasa admini — o'z muassasasi ichida to'liq, lekin foydalanuvchi
  // yarata olmaydi (bu bosh adminda qoladi)
  if (role === "school_admin") return !GLOBAL_ONLY.has(action);
  if (role === "operator") return OPERATOR_ACTIONS.has(action);
  return false; // viewer
}

/** Bloklanganda ko'rsatiladigan bir xil xabar — sahifalar qayta yozmasin. */
export function permissionDeniedMessage(role: string | undefined | null): string {
  return `Ruxsat yo'q (rol: ${isKnownRole(role) ? ROLE_LABEL[role] : "noma'lum"}) — administrator bilan bog'laning`;
}

/**
 * Joriy foydalanuvchi roli va ruxsat tekshiruvi (`/auth/me` dan kelgan rol).
 * Noma'lum/bo'sh rol — eng cheklangan (`viewer`) deb hisoblanadi.
 */
export function usePermissions() {
  const userRole = useAuthStore((s) => s.user?.role);
  const role: Role = isKnownRole(userRole) ? userRole : "viewer";
  return {
    role,
    can: (action: Action) => canPerform(role, action),
    deniedMessage: permissionDeniedMessage(role),
  };
}
