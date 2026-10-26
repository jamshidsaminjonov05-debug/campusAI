/**
 * Eski backend (`src/lib/api.ts`) uchun React Query hooklari.
 *
 * 🔴 **2026-10-26 da QISQARTIRILDI.** `NEXT_PUBLIC_API_ORIGIN` kuzatuv posti
 * serveriga (7007) qaraydi; eski 7005 backendning `/persons`, `/attendance`,
 * `/cameras` CRUD, `/events`, `/statistics/*`, `/admin/*` yo'llari u yerda
 * YO'Q (HTML yoki boshqa shakl qaytaradi). Shu yo'llarga qaragan hooklar —
 * `useDashboard`, `useEmotionsDaily`, `useAttendance`, `useMonthlyAttendance`,
 * `usePersons`, `usePersonMutations`, `useCameraMutations`, `useEvents`,
 * `useEventMutations`, `useAdminStatus`, `useAdminMutations().resync/
 * reloadFaceIndex` — chaqiruvchilari bilan birga olib tashlandi
 * (`TEST-HISOBOT.md` 2–3-bo'lim). Qolganlari:
 *
 * - `useCameras` — `/api/v1/cameras` (hodisa bo'lgan kameralar) — Kameralar
 *   sahifasida qurilma kanallari KELMAGANDA zaxira, `useStudentDay`da zaxira;
 * - `useAllPersons` / `useAllAttendance` — `useStudentDay` zaxirasi (hozir
 *   bo'sh qaytadi, massiv bo'lmasa `[]`);
 * - `useUsers` / `useAdminMutations().createUser` — `GET/POST /api/users`
 *   (kuzatuv posti serverining o'z foydalanuvchilari, admin JWT bilan).
 *
 * ── MUASSASA KO'LAMI (multi-tenancy) ─────────────────────────────────
 * Ro'yxat hooklari `useInstitutionScope()` dan joriy muassasani oladi va
 * `queryKey` ga qo'shadi; javobda `institution_id` bo'lmagani uchun
 * `scopeToInstitution()` amalda hech narsani kesmaydi — ulanish nuqtasi.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, isBackendPersonId, type CameraBrand, type PersonType } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { useInstitutionScope } from "@/lib/nvr/institutionScope";

/** Login bo'lmaganda so'rovlar yuborilmasin. */
function useAuthed() {
  return useAuthStore((s) => s.authenticated);
}

/**
 * Ro'yxatni joriy muassasaga qisqartiradi.
 *
 * `institutionId === null` (bosh admin, "Barchasi") — hech narsa kesilmaydi.
 * Yozuvda muassasa belgisi bo'lmasa ham kesilmaydi: hozircha backend uni
 * bermaydi, va mavjud ma'lumotni yashirib qo'yish xato bo'lardi.
 */
function scopeToInstitution<T extends object>(rows: T[] | undefined, institutionId: string | null): T[] | undefined {
  if (!rows || !institutionId) return rows;
  return rows.filter((r) => {
    const own = (r as { institution_id?: string | null }).institution_id;
    return own == null || own === institutionId;
  });
}

/* ---------------------------------- Shaxslar ---------------------------------- */

/**
 * BUTUN shaxslar ro'yxati — sahifalab (`page_size` ≤ 200, `lib/api.ts`
 * dagi o'lchangan chegara). Hozirgi serverda `/persons` yo'q — bo'sh
 * qaytadi; `useStudentDay` zaxirasi.
 */
export function useAllPersons(
  params: { person_type?: PersonType; group_name?: string; search?: string; is_active?: boolean },
  opts?: { enabled?: boolean }
) {
  const enabled = useAuthed();
  const { institutionId } = useInstitutionScope();
  return useQuery({
    queryKey: ["persons-all", institutionId, params],
    queryFn: async () => {
      const res = await api.listAllPersons(params);
      return { ...res, items: scopeToInstitution(res.items, institutionId) ?? res.items };
    },
    enabled: enabled && (opts?.enabled ?? true),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });
}

/**
 * Oraliqdagi BARCHA davomat yozuvi (`limit` ≤ 1 000, `offset` bilan
 * sahifalanadi). Kuzatuv posti serverida `/attendance` kunlik OBYEKT —
 * massiv bo'lmasa `[]` qaytadi.
 */
export function useAllAttendance(
  params: { date_from?: string; date_to?: string; event_type?: "entry" | "exit"; person_id?: string },
  opts?: { live?: boolean; enabled?: boolean }
) {
  const enabled = useAuthed();
  const idOk = params.person_id === undefined || isBackendPersonId(params.person_id);
  return useQuery({
    queryKey: ["attendance-all", params],
    queryFn: () => api.listAllAttendance(params),
    refetchInterval: opts?.live ? 60_000 : false,
    staleTime: 45_000,
    enabled: enabled && idOk && (opts?.enabled ?? true),
  });
}

/* ---------------------------------- Kameralar ---------------------------------- */

export function useCameras(brand?: CameraBrand) {
  const enabled = useAuthed();
  const { institutionId } = useInstitutionScope();
  return useQuery({
    queryKey: ["cameras", institutionId, brand],
    queryFn: async () => scopeToInstitution(await api.listCameras(brand), institutionId) ?? [],
    /* Haqiqiy, jonli kamera ro'yxati `useNvrChannels()`dan; bu endpoint
       faqat zaxira — tez-tez so'rash foydasiz (2026-09-18). */
    refetchInterval: 5 * 60_000,
    enabled,
  });
}

/* -------------------------------- Administrator -------------------------------- */

export function useUsers() {
  const enabled = useAuthed();
  return useQuery({ queryKey: ["users"], queryFn: () => api.listUsers(), enabled });
}

export function useAdminMutations() {
  const qc = useQueryClient();
  const createUser = useMutation({
    mutationFn: (data: { username: string; password: string; full_name?: string; role?: string }) =>
      api.createUser(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
  return { createUser };
}
