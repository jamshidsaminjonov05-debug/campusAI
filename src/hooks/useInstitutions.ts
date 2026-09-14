/**
 * Muassasalar ro'yxati — React Query orqali, KELAJAKDAGI API bilan bir xil shaklda.
 *
 * ── NEGA HOOK, TO'G'RIDAN-TO'G'RI IMPORT EMAS ────────────────────────
 * Hozir ro'yxat `src/config/institutions.ts` da qo'lda yozilgan (7 ta).
 * Yangi maktab qo'shish = manbani tahrirlash + qayta build + qayta yoyish.
 * 645 maktab uchun bu yo'l yopiq.
 *
 * Shu hook orqali o'tkazilgach, chaqiruvchi komponentlar `{ data, isLoading }`
 * shaklini ko'radi — ya'ni ular allaqachon "ro'yxat serverdan keladi" degan
 * holatga tayyor.
 *
 * ── BACKEND TAYYOR BO'LGANDA ─────────────────────────────────────────
 * ⚠️ ALMASHTIRISH NUQTASI — faqat pastdagi `queryFn`:
 *     queryFn: () => api.listInstitutions()
 * Boshqa hech narsa o'zgarmaydi (`staleTime` ham o'sha holicha qoladi —
 * muassasalar ro'yxati kamdan-kam o'zgaradi).
 */
import { useQuery } from "@tanstack/react-query";
import { INSTITUTIONS, type Institution } from "@/config/institutions";

/** Ro'yxat kamdan-kam o'zgaradi — 10 daqiqa yangi hisoblanadi. */
const STALE_MS = 10 * 60_000;

export function useInstitutions() {
  return useQuery<Institution[]>({
    queryKey: ["institutions"],
    // ⚠️ MOCK: statik ro'yxat. Backend `GET /institutions` bergach shu qator
    //    `api.listInstitutions()` ga almashadi — boshqa hech narsa tegilmaydi.
    queryFn: async () => INSTITUTIONS,
    staleTime: STALE_MS,
  });
}

/** Bitta muassasa — id bo'yicha (ro'yxat keshidan, qo'shimcha so'rovsiz). */
export function useInstitution(id: string | null | undefined) {
  const { data, isLoading, error } = useInstitutions();
  return {
    data: id ? data?.find((i) => i.id === id) ?? null : null,
    isLoading,
    error,
  };
}
