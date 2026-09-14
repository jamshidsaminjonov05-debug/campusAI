/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  "HOZIR QAYSI MUASSASA KO'RILYAPTI" — YAGONA MANBA                   ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * Butun ilova shu savolga javobni FAQAT shu yerdan oladi. Sahifalarda
 * `useAppStore.selectedTeknikum` yoki `user.role === "admin"` kabi
 * tekshiruvlar TAKRORLANMASIN — hammasi shu hook orqali.
 *
 * ── HOZIRGI (MOCK) HOLAT ─────────────────────────────────────────────
 * Backend `UserOut` da muassasa belgisi YO'Q (`institution_id` maydoni
 * mavjud emas), shuning uchun kontekst ikki manbadan yig'iladi:
 *   1. foydalanuvchi roli    → u umuman almashtira oladimi,
 *   2. header'dagi tanlov    → qaysi muassasa ko'rilyapti.
 *
 * ── BACKEND TAYYOR BO'LGANDA ─────────────────────────────────────────
 * ⚠️ ALMASHTIRISH NUQTASI — pastdagi `resolveScope()` funksiyasi.
 * `UserOut` ga `institution_id: string | null` qo'shilgach:
 *   - `null`      → bosh admin: `isGlobal = true`, tanlagich ochiq
 *   - `"edu-…"`   → maktab admini: shu id qattiq biriktiriladi,
 *                   header tanlovi e'tiborga OLINMAYDI (`canSwitch = false`)
 * Boshqa hech qaysi fayl o'zgartirilmaydi — chaqiruvchilar shu interfeysni
 * ko'radi, ichki mantiq esa shu faylda qoladi.
 */
import { useMemo } from "react";
import { INSTITUTIONS, institutionById, type Institution } from "@/config/institutions";
import { useAppStore } from "@/store/useAppStore";
import { useAuthStore } from "@/store/useAuthStore";

export interface InstitutionScope {
  /** Ko'rilayotgan muassasa id'si. `null` = respublika miqyosi (barcha muassasa). */
  institutionId: string | null;
  /** Shu id'ga mos muassasa yozuvi (topilmasa `null`). */
  institution: Institution | null;
  /** Foydalanuvchi barcha muassasani ko'ra oladimi (bosh admin). */
  isGlobal: boolean;
  /** Header'da muassasa tanlagichi ko'rsatilsinmi. */
  canSwitch: boolean;
  /** Ko'rsatish uchun nom — "Barcha muassasalar" yoki muassasa nomi. */
  label: string;
}

/**
 * ⚠️ DEMO — backend hali `school_admin` rolini bermaydi, shuning uchun
 * uni sinab ko'rish uchun localStorage kaliti o'qiladi:
 *
 *     localStorage.setItem("campus-demo-role", "school_admin")   // maktab admini
 *     localStorage.removeItem("campus-demo-role")                // haqiqiy rol
 *
 * Backend rolni bera boshlagach BU FUNKSIYA butunlay o'chiriladi.
 */
const DEMO_ROLE_KEY = "campus-demo-role";

function demoRoleOverride(): string | null {
  try {
    return localStorage.getItem(DEMO_ROLE_KEY);
  } catch {
    return null; // localStorage yopiq (private rejim) — e'tiborsiz qoldiramiz
  }
}

/**
 * Rol → kontekst. FAQAT shu funksiya backend `institution_id` bergach
 * o'zgaradi (yuqoridagi izohga qarang).
 */
function resolveScope(rawRole: string | undefined, selected: string | null): InstitutionScope {
  const role = demoRoleOverride() ?? rawRole;

  // ⚠️ MOCK: bosh admin — `role === "admin"`. Backend `institution_id: null`
  //    bergach shu shart o'shanga almashtiriladi.
  const isGlobal = role === "admin";

  if (isGlobal) {
    // Bosh admin: header tanlovi kontekstni belgilaydi, "Barchasi" ham mumkin
    const institution = institutionById(selected);
    return {
      institutionId: institution?.id ?? null,
      institution,
      isGlobal: true,
      canSwitch: true,
      label: institution?.name ?? "Barcha muassasalar",
    };
  }

  // ⚠️ MOCK: maktab foydalanuvchisi uchun backend hali muassasa bermaydi,
  //    shuning uchun birinchi muassasaga biriktiramiz. Backend tayyor bo'lgach
  //    bu qator `user.institution_id` ga almashadi.
  const pinned = INSTITUTIONS[0] ?? null;
  return {
    institutionId: pinned?.id ?? null,
    institution: pinned,
    isGlobal: false,
    canSwitch: false,
    label: pinned?.name ?? "Muassasa biriktirilmagan",
  };
}

/** Joriy muassasa konteksti — butun ilova shundan foydalanadi. */
export function useInstitutionScope(): InstitutionScope {
  const role = useAuthStore((s) => s.user?.role);
  const selected = useAppStore((s) => s.selectedTeknikum);
  return useMemo(() => resolveScope(role, selected), [role, selected]);
}

/**
 * React'dan TASHQARIDA (lib/, services/) kerak bo'lganda — masalan ovozli
 * executor yoki xato hisoboti uchun. Hook chaqirib bo'lmaydigan joylar uchun.
 */
export function getInstitutionScope(): InstitutionScope {
  return resolveScope(useAuthStore.getState().user?.role, useAppStore.getState().selectedTeknikum);
}
