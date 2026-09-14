/**
 * Backend API uchun React Query hooklari.
 * Barcha so'rovlar src/lib/api.ts orqali — token va 401-refresh u yerda hal qilinadi.
 *
 * ── MUASSASA KO'LAMI (multi-tenancy) ─────────────────────────────────
 * Har bir ro'yxat hook'i `useInstitutionScope()` dan joriy muassasani oladi va:
 *   1. uni `queryKey` ga qo'shadi — kesh muassasalar orasida ARALASHMAYDI,
 *   2. javob kelgach `scopeToInstitution()` bilan klient tomonda filtrlaydi.
 *
 * ⚠️ HOZIRGI HOLAT: backend javoblarida muassasa belgisi YO'Q
 * (`CameraOut`/`PersonOut`/`AlarmEventOut` da `institution_id` maydoni yo'q),
 * shuning uchun filtr amalda hech narsani kesmaydi — bu KUTILGAN. Maqsad:
 * ulanish nuqtasi tayyor tursin.
 *
 * ⚠️ BACKEND TAYYOR BO'LGANDA: `scopeToInstitution()` chaqiruvlari olib
 * tashlanadi va o'rniga so'rovga parametr qo'shiladi:
 *     api.listCameras({ institution_id: scope.institutionId })
 * `queryKey` esa o'zgarishsiz qoladi.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  api,
  isBackendPersonId,
  FACE_ENGINE_HINT,
  isFaceEngineError,
  type CameraBrand,
  type CameraOut,
  type CameraPayload,
  type PersonPayload,
  type PersonType,
} from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { useInstitutionScope } from "@/lib/institutionScope";

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

/* --------------------------------- Statistika --------------------------------- */

export function useDashboard() {
  const enabled = useAuthed();
  const { institutionId } = useInstitutionScope();
  return useQuery({
    // Muassasa kalitda — bosh admin muassasa almashtirsa kesh aralashmaydi
    queryKey: ["dashboard", institutionId],
    queryFn: () => api.dashboard(),
    refetchInterval: 5_000,
    enabled,
  });
}

export function useEmotionsDaily(days = 7) {
  const enabled = useAuthed();
  return useQuery({
    queryKey: ["emotions-daily", days],
    queryFn: () => api.emotionsDaily(days),
    refetchInterval: 60_000,
    enabled,
  });
}

/* ---------------------------------- Davomat ---------------------------------- */

export function useRecentAttendance(limit = 10) {
  const enabled = useAuthed();
  return useQuery({
    queryKey: ["attendance-recent", limit],
    queryFn: () => api.recentAttendance(limit),
    refetchInterval: 10_000,
    enabled,
  });
}

export function useAttendance(
  params: {
    person_id?: string;
    date_from?: string;
    date_to?: string;
    event_type?: "entry" | "exit";
    limit?: number;
    offset?: number;
  },
  /** `live` — davomat monitoringi uchun: ro'yxat o'zi yangilanib turadi. */
  opts?: { live?: boolean }
) {
  const enabled = useAuthed();
  /* Shaxs bo'yicha filtr so'ralgan bo'lsa, id BACKENDNIKI bo'lishi shart —
     mock odam uchun so'rov umuman yuborilmaydi. */
  const idOk = params.person_id === undefined || isBackendPersonId(params.person_id);
  return useQuery({
    queryKey: ["attendance", params],
    queryFn: () => api.listAttendance(params),
    refetchInterval: opts?.live ? 15_000 : false,
    enabled: enabled && idOk,
  });
}

export function useMonthlyAttendance(personId: string | null, year?: number, month?: number) {
  const enabled = useAuthed();
  return useQuery({
    queryKey: ["attendance-monthly", personId, year, month],
    queryFn: () => api.monthlyAttendance(personId!, year, month),
    // Mock odamning id'si backendda YO'Q — 404 bermasin (`isBackendPersonId`)
    enabled: enabled && isBackendPersonId(personId),
  });
}

/* ---------------------------------- Shaxslar ---------------------------------- */

export function usePersons(params: {
  person_type?: PersonType;
  group_name?: string;
  search?: string;
  is_active?: boolean;
  page?: number;
  page_size?: number;
}) {
  const enabled = useAuthed();
  const { institutionId } = useInstitutionScope();
  return useQuery({
    queryKey: ["persons", institutionId, params],
    // ⚠️ Backend `institution_id` ni qo'llagach: api.listPersons({ ...params, institution_id: institutionId })
    queryFn: async () => {
      const res = await api.listPersons(params);
      return { ...res, items: scopeToInstitution(res.items, institutionId) ?? res.items };
    },
    enabled,
    placeholderData: (prev) => prev,
  });
}

/**
 * BUTUN shaxslar ro'yxati — statistika uchun (jadval uchun `usePersons`).
 *
 * ⚠️ **`page_size: 500` BILAN CHAQIRMANG** — server 200 dan keyin `422`
 * qaytaradi (`lib/api.ts` dagi o'lchangan chegaralar). Ilgari
 * `useStudentDay`, `useWeeklyByType` va `WeeklyAttendance` aynan shunday
 * so'rardi: so'rov har safar yiqilib, panellar jimgina bo'sh turardi.
 * Bu hook sahifalarni O'ZI aylanib chiqadi, ya'ni 1 000 o'quvchi ham
 * to'liq keladi.
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
    /* Ro'yxat kun davomida kam o'zgaradi, so'rov esa bir necha sahifa —
       navigatsiyada qayta yuklanmasin. */
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  });
}

/**
 * Oraliqdagi BARCHA davomat yozuvi (`limit` 1 000 dan katta bo'lolmaydi).
 *
 * 1 000 shaxs × 7 kun = 7 000 yozuv — bitta so'rovga sig'maydi, shuning
 * uchun `offset` bilan sahifalanadi.
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
    refetchInterval: opts?.live ? 30_000 : false,
    staleTime: 30_000,
    enabled: enabled && idOk && (opts?.enabled ?? true),
  });
}

export function usePersonMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["persons"] });
    /* ⚠️ `persons-all` / `attendance-all` ALOHIDA kalitlar — ular
       bekor qilinmasa import yoki tahrirdan keyin Statistika va davomat
       panellari ESKI ro'yxatni ko'rsatib turaverardi (React Query kaliti
       boshqa, ya'ni "persons" bekor qilinishi ularga tegmaydi). */
    qc.invalidateQueries({ queryKey: ["persons-all"] });
    qc.invalidateQueries({ queryKey: ["attendance"] });
    qc.invalidateQueries({ queryKey: ["attendance-all"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };
  /**
   * Shaxs qo'shish — IKKI QADAMDA.
   *
   * ⚠️ NEGA: backend rasm biriktirilgan `POST /persons` ni **400** bilan
   * rad etadi (`No module named 'onnxruntime'`) va shunda shaxs UMUMAN
   * yaratilmaydi — foydalanuvchi formani to'ldirib, rasm tanlab, hech
   * nima saqlanmaganini ko'rardi (o'lchandi 2026-09-02).
   *
   * Endi avval shaxs RASMSIZ yaratiladi (bu **201** qaytaradi), so'ng
   * rasm alohida so'rov bilan biriktiriladi. Rasm bosqichi yiqilsa ham
   * SHAXS SAQLANIB QOLADI, chaqiruvchiga esa `photoError` qaytadi va u
   * ogohlantirish ko'rsatadi.
   */
  const create = useMutation({
    mutationFn: async ({ data, photo }: { data: PersonPayload; photo?: File | null }) => {
      const person = await api.createPerson(data, null);
      if (!photo) return { person, photoError: null as string | null };
      try {
        return { person: await api.setPersonPhoto(person.id, photo), photoError: null as string | null };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return { person, photoError: isFaceEngineError(msg) ? FACE_ENGINE_HINT : msg };
      }
    },
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PersonPayload> & { is_active?: boolean } }) =>
      api.updatePerson(id, data),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: (id: string) => api.deletePerson(id), onSuccess: invalidate });
  const setPhoto = useMutation({
    mutationFn: ({ id, photo }: { id: string; photo: File }) => api.setPersonPhoto(id, photo),
    onSuccess: invalidate,
  });
  const importFile = useMutation({
    mutationFn: ({ file, photos }: { file: File; photos?: File | null }) => api.importPersons(file, photos),
    onSuccess: invalidate,
  });
  return { create, update, remove, setPhoto, importFile };
}

/* ---------------------------------- Kameralar ---------------------------------- */

export function useCameras(brand?: CameraBrand) {
  const enabled = useAuthed();
  const { institutionId } = useInstitutionScope();
  return useQuery({
    queryKey: ["cameras", institutionId, brand],
    // ⚠️ Backend tayyor bo'lgach: api.listCameras({ brand, institution_id: institutionId })
    queryFn: async () => scopeToInstitution(await api.listCameras(brand), institutionId) ?? [],
    refetchInterval: 15_000,
    enabled,
  });
}

export function useCameraMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["cameras"] });
  const create = useMutation({ mutationFn: (data: CameraPayload) => api.createCamera(data), onSuccess: invalidate });
  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CameraPayload> }) => api.updateCamera(id, data),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: (id: string) => api.deleteCamera(id), onSuccess: invalidate });
  const check = useMutation({ mutationFn: (id: string) => api.checkCamera(id) });

  // Play/Pauza — is_active'ni darhol (server javobini kutmasdan) yangilaymiz,
  // shunda tugma bosilgach UI kechikmasdan javob beradi; haqiqiy holat
  // fonda invalidate orqali tekshiriladi va kerak bo'lsa qayta tiklanadi.
  function setActiveOptimistic(id: string, isActive: boolean) {
    const previous = qc.getQueriesData<CameraOut[]>({ queryKey: ["cameras"] });
    qc.setQueriesData<CameraOut[]>({ queryKey: ["cameras"] }, (old) =>
      old?.map((c) => (c.id === id ? { ...c, is_active: isActive } : c))
    );
    return previous;
  }
  function rollback(previous: ReturnType<typeof setActiveOptimistic>) {
    previous.forEach(([key, data]) => qc.setQueryData(key, data));
  }

  // Play: backend RTSP ko'prigini haqiqatda ishga tushirmaguncha is_active'ni
  // optimistik true qilib bo'lmaydi — aks holda <img> hali tayyor bo'lmagan
  // oqimga ulanishga urinib, "OQIM UZILDI" xatosini ko'rsatib qo'yadi. Shu
  // sabab bu yerda faqat onSuccess'da (POST tasdiqlangach) cache'ni yangilab,
  // to'liq ro'yxatni qayta so'rashni (invalidate+refetch) kutish bosqichini
  // olib tashlaymiz — bitta network round-trip qisqaradi.
  const start = useMutation({
    mutationFn: (id: string) => api.startStream(id),
    onSuccess: async (_data, id) => {
      await qc.cancelQueries({ queryKey: ["cameras"] });
      setActiveOptimistic(id, true);
      invalidate();
    },
  });
  // Pauza: darhol (server javobini kutmasdan) to'xtatamiz — foydalanuvchi
  // bosgan zahoti oqim uzilishini ko'rishi kerak, backend tasdig'ini kutish shart emas.
  const stop = useMutation({
    mutationFn: (id: string) => api.stopStream(id),
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: ["cameras"] });
      return { previous: setActiveOptimistic(id, false) };
    },
    onError: (_err, _id, ctx) => ctx && rollback(ctx.previous),
    onSettled: invalidate,
  });
  return { create, update, remove, check, start, stop };
}

/* ---------------------------------- Hodisalar ---------------------------------- */

export function useEvents(params: { event_type?: string; is_resolved?: boolean; date_from?: string; limit?: number } = {}) {
  const enabled = useAuthed();
  const { institutionId } = useInstitutionScope();
  return useQuery({
    queryKey: ["events", institutionId, params],
    // ⚠️ Backend tayyor bo'lgach: api.listEvents({ ...params, institution_id: institutionId })
    queryFn: async () => scopeToInstitution(await api.listEvents(params), institutionId) ?? [],
    refetchInterval: 10_000,
    enabled,
  });
}

export function useEventStats() {
  const enabled = useAuthed();
  return useQuery({
    queryKey: ["event-stats"],
    queryFn: () => api.eventStats(),
    refetchInterval: 30_000,
    enabled,
  });
}

export function useEventMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["events"] });
    qc.invalidateQueries({ queryKey: ["event-stats"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };
  const resolve = useMutation({ mutationFn: (id: string) => api.resolveEvent(id), onSuccess: invalidate });
  const create = useMutation({
    mutationFn: (data: Parameters<typeof api.createEvent>[0]) => api.createEvent(data),
    onSuccess: invalidate,
  });
  return { resolve, create };
}

/* -------------------------------- Administrator -------------------------------- */

export function useAdminStatus() {
  const enabled = useAuthed();
  return useQuery({
    queryKey: ["admin-status"],
    queryFn: () => api.adminStatus(),
    refetchInterval: 30_000,
    enabled,
  });
}

export function useUsers() {
  const enabled = useAuthed();
  return useQuery({ queryKey: ["users"], queryFn: () => api.listUsers(), enabled });
}

export function useAdminMutations() {
  const qc = useQueryClient();
  const resync = useMutation({
    mutationFn: (direction: "to_backup" | "to_primary") => api.resync(direction),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-status"] }),
  });
  const reloadFaceIndex = useMutation({
    mutationFn: () => api.reloadFaceIndex(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-status"] }),
  });
  const createUser = useMutation({
    mutationFn: (data: { username: string; password: string; full_name?: string; role?: string }) =>
      api.createUser(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
  return { resync, reloadFaceIndex, createUser };
}
