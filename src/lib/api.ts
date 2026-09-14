/**
 * Backend API client — FastAPI. Manzil `src/config/endpoints.ts` da hal
 * qilinadi: sozlamaga qarab to'g'ridan-to'g'ri
 * `http://<backend-server-ip>:7005/api/v1/...` yoki same-origin `/api/v1/...` (Next
 * rewrites orqali). Swagger: `${BACKEND_ORIGIN}/docs`.
 *
 * Token localStorage'da saqlanadi, 401 bo'lsa refresh-token bilan bir marta
 * yangilashga urinadi, bo'lmasa logout qilib login sahifasiga qaytaradi.
 */

import { API_BASE, MEDIA_BASE } from "@/config/endpoints";

/** REST ildizi — to'g'ridan-to'g'ri backend origini yoki same-origin proxy
 *  (`.env.local` dagi `NEXT_PUBLIC_API_ORIGIN` bilan almashadi). */
const BASE = API_BASE;

/* ---------------------------------- Tiplar ---------------------------------- */

export interface Token {
  access_token: string;
  refresh_token: string;
  token_type: string;
  access_expires_hours: number;
  refresh_expires_hours: number;
}

export interface UserOut {
  id: string;
  username: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
}

export type PersonType = "student" | "teacher" | "staff";

/**
 * Backend `person.id` — UUID (`34b162f7-da4f-4eb5-8847-2ec6cf589543`).
 *
 * Mock/demo odamlarniki BOSHQACHA: `public/people/people.json` da `"10001"`,
 * `lib/demoStudents.ts` da `"demo-a-3"`. Backend bo'sh bo'lganda UI mock'ka
 * tushadi va o'sha soxta id bilan HAQIQIY manzilga so'rov ketardi —
 * `/attendance/person/10001/monthly` → **404** (o'lchandi 2026-08-31).
 *
 * Shuning uchun shaxsga bog'liq har bir so'rov SHU tekshiruv bilan yoqiladi.
 */
export const isBackendPersonId = (id: string | null | undefined): boolean =>
  !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);


export interface PersonOut {
  id: string;
  person_code: string;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  person_type: PersonType;
  group_name: string | null;
  course: number | null;
  department: string | null;
  position: string | null;
  phone: string | null;
  email: string | null;
  birth_date: string | null;
  extra_info: Record<string, unknown> | null;
  full_name: string;
  photo_path: string | null;
  is_active: boolean;
  has_face: boolean;
  created_at: string;
}

export interface PersonListOut {
  total: number;
  page: number;
  page_size: number;
  items: PersonOut[];
}

export interface PersonPayload {
  first_name: string;
  last_name: string;
  middle_name?: string;
  person_code?: string;
  person_type?: PersonType;
  group_name?: string;
  course?: number;
  department?: string;
  position?: string;
  phone?: string;
  email?: string;
  birth_date?: string;
}

export interface ImportReport {
  total_rows: number;
  created: number;
  updated: number;
  failed: number;
  without_face: number;
  errors: { row: number; error: string }[];
}

export interface AttendanceOut {
  id: string;
  person_id: string;
  camera_id: string | null;
  event_type: string;
  similarity: number | null;
  emotion_label: string | null;
  emotion_group: string | null;
  timestamp: string;
}

export interface RecentEntry {
  person_id: string;
  person_code: string;
  full_name: string;
  person_type: string;
  group_name: string | null;
  photo_path: string | null;
  emotion_group: string | null;
  emotion_label: string | null;
  timestamp: string;
}

export interface EmotionStats {
  positive: number;
  neutral: number;
  negative: number;
  total: number;
  positive_pct: number;
  neutral_pct: number;
  negative_pct: number;
}

export interface AttendanceStats {
  total: number;
  present: number;
  absent: number;
}

export interface DashboardStats {
  date: string;
  students: AttendanceStats;
  teachers: AttendanceStats;
  emotions_today: EmotionStats;
  recent_entries: RecentEntry[];
  unresolved_alarms: number;
  active_cameras: number;
  total_cameras: number;
}

export interface DayAttendance {
  date: string;
  entry_time: string | null;
  late: boolean;
  emotion_group: string | null;
  emotion_label: string | null;
}

export interface MonthlyAttendance {
  person_id: string;
  person_code: string | null;
  full_name: string | null;
  year: number;
  month: number;
  working_days: number;
  present_days: number;
  late_days: number;
  absent_days: number;
  emotions?: EmotionStats;
  days?: DayAttendance[];
}

export interface EmotionDaily extends EmotionStats {
  date: string;
}

export type CameraBrand = "hikvision" | "dahua" | "other";

export interface CameraOut {
  id: string;
  name: string;
  brand: string;
  location: string | null;
  ip_address: string | null;
  port: number;
  username: string | null;
  channel: number;
  stream_quality: string;
  direction: string;
  is_active: boolean;
  created_at: string;
  stream_url_masked: string | null;
}

export interface CameraPayload {
  name: string;
  brand?: CameraBrand;
  location?: string;
  ip_address?: string;
  port?: number;
  username?: string;
  password?: string;
  channel?: number;
  stream_quality?: "main" | "sub";
  rtsp_url?: string;
  direction?: "entry" | "exit" | "area";
  is_active?: boolean;
}

export interface AlarmEventOut {
  id: string;
  event_type: string;
  camera_id: string | null;
  description: string | null;
  severity: string;
  participants_count: number | null;
  snapshot_path: string | null;
  detected_at: string;
  is_resolved: boolean;
  resolved_at: string | null;
}

export interface EventStats {
  date: string;
  total: number;
  by_type: Record<string, number>;
}

/** Backend moduli holati. `error` — Python xatosi (`ModuleNotFoundError: …`),
 *  u EKRANGA CHIQARILMAYDI: UI undan odam o'qiydigan holat yasaydi. */
export interface EngineStatus {
  available: boolean;
  error?: string;
}

export interface AdminStatus {
  postgres_available: boolean;
  needs_resync: boolean;
  face_engine: EngineStatus;
  emotion_engine: EngineStatus;
  /** Ovoz modullari — serverda bor, lekin eski javoblarda bo'lmasligi mumkin. */
  stt_engine?: EngineStatus;
  tts_engine?: EngineStatus;
  face_index_size: number;
  active_streams: unknown[];
}

export interface FaceResult {
  bbox: number[];
  matched: boolean;
  similarity: number | null;
  person: PersonOut | null;
  emotion: { label: string; group: string; scores: Record<string, number> } | null;
  attendance_recorded: boolean;
  allowed: boolean;
}

export interface RecognitionResponse {
  faces_detected: number;
  results: FaceResult[];
}

/* ------------------------------- Token saqlash ------------------------------- */

const STORAGE_KEY = "hik-auth-tokens";

interface StoredTokens {
  access: string;
  refresh: string;
}

export function loadTokens(): StoredTokens | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredTokens) : null;
  } catch {
    return null;
  }
}

export function saveTokens(t: StoredTokens | null) {
  if (t) localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
  else localStorage.removeItem(STORAGE_KEY);
  syncNvrSession(t != null);
}

/**
 * `/nvr` proxysi endi httpOnly SESSIYA COOKIE'sini talab qiladi
 * (`app/session/route.ts`) — `localStorage` tokeni server'ga ko'rinmaydi,
 * shuning uchun har login/refresh/logout'da shu cookie ham birga
 * yangilanadi.
 *
 * ⚠️ **`saveTokens()` YETARLI EMAS — `restore()` da ham CHAQIRILADI.**
 * Sessiya cookie'si BRAUZER SESSIYASI bilan cheklangan (muddatsiz —
 * `app/session/route.ts` izohiga qarang): brauzer yopilib qayta
 * ochilsa cookie o'chadi, lekin `localStorage` tokeni qoladi va
 * `useAuthStore.restore()` uni ISHLATIB muvaffaqiyatli kirishi mumkin
 * — `saveTokens()` esa bu yo'lda QAYTA chaqirilmaydi (token o'zgarmadi).
 * Cookie yangilanmasa panel ochiladi-yu, "Aniqlanganlar"/kameralar/
 * xarita bo'sh turib qolardi. Shuning uchun `useAuthStore.restore()`
 * `api.me()` muvaffaqiyatidan keyin shu funksiyani ham chaqiradi.
 *
 * Fire-and-forget: bu so'rov muvaffaqiyatsiz bo'lsa ham asosiy oqim
 * (login/refresh/restore) to'xtamaydi — faqat kuzatuv posti bo'limi login talab
 * qiladigan bo'lib qoladi (`catch` shu uchun jim).
 */
export function syncNvrSession(active: boolean): void {
  if (typeof window === "undefined") return;
  void fetch("/session", { method: active ? "POST" : "DELETE" }).catch(() => {});
}

/** 401 refresh ham yordam bermasa chaqiriladi (auth store logout qilib qo'yadi). */
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function detailMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "detail" in body) {
    const d = (body as { detail: unknown }).detail;
    if (typeof d === "string") return d;
    if (Array.isArray(d)) {
      return d
        .map((e) => (e && typeof e === "object" && "msg" in e ? String((e as { msg: unknown }).msg) : JSON.stringify(e)))
        .join("; ");
    }
  }
  return fallback;
}

let refreshing: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (!refreshing) {
    refreshing = (async () => {
      const tokens = loadTokens();
      if (!tokens?.refresh) return false;
      try {
        const res = await fetch(`${BASE}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: tokens.refresh }),
        });
        if (!res.ok) return false;
        const t = (await res.json()) as Token;
        saveTokens({ access: t.access_token, refresh: t.refresh_token });
        return true;
      } catch {
        return false;
      }
    })().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

/** Backend manzili noto'g'ri/ishlamayotgan bo'lsa `fetch()` cheksiz osilib qolmasin —
 *  15 soniyadan keyin so'rov bekor qilinib, aniq xato ko'rsatiladi. */
const REQUEST_TIMEOUT_MS = 15_000;

/**
 * OMMAVIY IMPORT uchun alohida, UZUN chegara.
 *
 * ⚠️ 15 soniya bu yerda YETMAYDI: 1 000 qatorli Excel + rasm arxivi
 * yuklanadi va server har bir rasm uchun yuz vektorini hisoblaydi. Umumiy
 * chegara bilan brauzer so'rovni yarim yo'lda bekor qilardi ("Server javob
 * bermadi (15s)"), SERVER esa importni davom ettirardi — operator xatoni
 * ko'rib qayta yuborsa, yozuvlar IKKI MARTA qo'shilardi.
 */
const IMPORT_TIMEOUT_MS = 10 * 60_000;

/** Bitta rasm — yuz vektori hisoblanishi bir necha soniya olishi mumkin. */
const PHOTO_TIMEOUT_MS = 60_000;

async function request<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
  timeoutMs: number = REQUEST_TIMEOUT_MS
): Promise<T> {
  const tokens = loadTokens();
  const headers = new Headers(init.headers);
  if (tokens?.access) headers.set("Authorization", `Bearer ${tokens.access}`);

  const timeoutController = new AbortController();
  const timer = window.setTimeout(() => timeoutController.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...init, headers, signal: init.signal ?? timeoutController.signal });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new ApiError(0, `Server javob bermadi (${Math.round(timeoutMs / 1000)}s) — manzilni tekshiring`);
    }
    throw new ApiError(0, "Server bilan aloqa yo'q");
  } finally {
    window.clearTimeout(timer);
  }

  if (res.status === 401 && retry) {
    if (await tryRefresh()) return request<T>(path, init, false, timeoutMs);
    saveTokens(null);
    onUnauthorized?.();
    throw new ApiError(401, "Sessiya tugadi — qayta kiring");
  }

  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      /* json emas */
    }
    throw new ApiError(res.status, detailMessage(body, `Xatolik (${res.status})`));
  }

  if (res.status === 204) return undefined as T;
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) return (await res.blob()) as T;
  return (await res.json()) as T;
}

/**
 * YUZ TANISH DVIGATELI xatosini odam o'qiydigan matnga aylantirish.
 *
 * ⚠️ O'LCHANGAN (2026-09-02, `<backend-server-ip>:7005`): backendda `onnxruntime`
 * o'rnatilmagan va shu sababli **rasm biriktirilgan har qanday so'rov
 * 400 qaytaradi**:
 *   · `POST /persons` (photo bilan)  → 400, shaxs UMUMAN yaratilmaydi;
 *   · `POST /persons/{id}/photo`     → 400.
 * Rasmsiz `POST /persons` esa **201** — ya'ni muammo faqat yuz qismida.
 *
 * Xom Python xatosi (`ModuleNotFoundError: No module named 'onnxruntime'`)
 * foydalanuvchiga hech narsa aytmaydi, shuning uchun u shu yerda
 * tushunarli jumlaga aylantiriladi. Asl matn `cause` da qoladi.
 */
export function isFaceEngineError(message: string): boolean {
  return /onnxruntime|yuz tanish dvigateli|face engine/i.test(message);
}

export const FACE_ENGINE_HINT =
  "Serverda yuz tanish moduli o'rnatilmagan (onnxruntime) — surat saqlanmadi. " +
  "Shaxs ro'yxatga qo'shildi; rasmni modul o'rnatilgach biriktirish mumkin.";

function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

function form(data: Record<string, string | number | Blob | undefined | null>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined || v === null || v === "") continue;
    fd.append(k, v instanceof Blob ? v : String(v));
  }
  return fd;
}

/* --------------------------------- Endpointlar --------------------------------- */

/* ══════════════════════════════════════════════════════════════════════
   SERVER CHEGARALARI — O'LCHANGAN (2026-09-05, `<backend-server-ip>:7005`)
   ══════════════════════════════════════════════════════════════════════
   Bu sonlar TAXMIN emas, so'rov yuborib topilgan:
     · `/persons?page_size=200` → `200 OK`, `201` → **422**;
     · `/attendance?limit=1000` → `200 OK`, `1001` → **422**;
     · `/attendance` da `offset` ishlaydi, `skip` — YO'Q.
   Chegaradan oshgan so'rov javob TANASINI umuman bermaydi, ya'ni panel
   xatosiz, jimgina BO'SH qoladi — shuning uchun chegara shu yerda
   qat'iy yozilgan va butun kod shu orqali o'tadi. */

/** `/persons` bitta sahifadagi maksimal yozuv. */
export const PERSONS_MAX_PAGE_SIZE = 200;
/** Xavfsizlik chegarasi: 200 × 50 = 10 000 shaxs. */
const PERSONS_MAX_PAGES = 50;
/** `/attendance` bitta so'rovdagi maksimal yozuv. */
export const ATTENDANCE_MAX_LIMIT = 1000;
/** Xavfsizlik chegarasi: 1000 × 30 = 30 000 yozuv. */
const ATTENDANCE_MAX_PAGES = 30;

export const api = {
  /* Autentifikatsiya */
  async login(username: string, password: string): Promise<Token> {
    const body = new URLSearchParams({ username, password });
    let res: Response;
    try {
      res = await fetch(`${BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
    } catch {
      throw new ApiError(0, "Server bilan aloqa yo'q");
    }
    if (!res.ok) {
      let b: unknown = null;
      try {
        b = await res.json();
      } catch {
        /* bo'sh */
      }
      throw new ApiError(res.status, detailMessage(b, "Login xatosi"));
    }
    const t = (await res.json()) as Token;
    saveTokens({ access: t.access_token, refresh: t.refresh_token });
    return t;
  },
  me: () => request<UserOut>("/auth/me"),
  listUsers: () => request<UserOut[]>("/auth/users"),
  createUser: (data: { username: string; password: string; full_name?: string; role?: string }) =>
    request<UserOut>("/auth/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  /* Shaxslar */
  listPersons: (p: {
    person_type?: PersonType;
    group_name?: string;
    search?: string;
    is_active?: boolean;
    page?: number;
    page_size?: number;
  }) => request<PersonListOut>(`/persons${qs(p)}`),
  getPerson: (id: string) => request<PersonOut>(`/persons/${id}`),
  createPerson: (data: PersonPayload, photo?: File | null) =>
    request<PersonOut>("/persons", {
      method: "POST",
      body: form({ ...data, photo: photo ?? undefined }),
    }),
  updatePerson: (id: string, data: Partial<PersonPayload> & { is_active?: boolean }) =>
    request<PersonOut>(`/persons/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  deletePerson: (id: string) => request<void>(`/persons/${id}`, { method: "DELETE" }),
  setPersonPhoto: (id: string, photo: File) =>
    request<PersonOut>(`/persons/${id}/photo`, { method: "POST", body: form({ photo }) }, true, PHOTO_TIMEOUT_MS),
  importPersons: (file: File, photos?: File | null) =>
    request<ImportReport>(
      "/persons/import",
      { method: "POST", body: form({ file, photos: photos ?? undefined }) },
      true,
      IMPORT_TIMEOUT_MS
    ),
  downloadImportTemplate: () => request<Blob>("/persons/import/template"),

  /* Yuz tanish */
  identify: (image: File, opts?: { camera_id?: string; event_type?: string; record?: boolean }) =>
    request<RecognitionResponse>("/recognition/identify", {
      method: "POST",
      body: form({ image, ...opts, record: opts?.record === undefined ? undefined : String(opts.record) }),
    }),
  verify: (person_id: string, image: File) =>
    request<{ person_id: string; matched: boolean; similarity: number }>("/recognition/verify", {
      method: "POST",
      body: form({ person_id, image }),
    }),

  /* Davomat */
  listAttendance: (p: {
    person_id?: string;
    date_from?: string;
    date_to?: string;
    event_type?: "entry" | "exit";
    limit?: number;
    offset?: number;
  }) => request<AttendanceOut[]>(`/attendance${qs(p)}`),
  recentAttendance: (limit = 10) => request<RecentEntry[]>(`/attendance/recent${qs({ limit })}`),

  /**
   * BUTUN ro'yxat — sahifama-sahifa (`page_size` chegarasi bor).
   *
   * ⚠️ **`page_size` 200 dan katta bo'lsa server `422` qaytaradi**
   * (o'lchandi 2026-09-05: 200 → `200 OK`, 201 → `422`). Kod bir necha
   * joyda `page_size: 500` so'rardi — ya'ni o'sha so'rovlar HAR DOIM
   * yiqilardi va panel bo'sh turardi. Endi chegara bir joyda
   * (`PERSONS_MAX_PAGE_SIZE`) va ro'yxat sahifalab yig'iladi: 1 000
   * o'quvchi bitta sahifaga baribir sig'maydi.
   */
  listAllPersons: async (p: {
    person_type?: PersonType;
    group_name?: string;
    search?: string;
    is_active?: boolean;
  }): Promise<PersonListOut> => {
    const first = await request<PersonListOut>(
      `/persons${qs({ ...p, page: 1, page_size: PERSONS_MAX_PAGE_SIZE })}`
    );
    const total = first.total ?? first.items.length;
    const items = [...first.items];
    const pages = Math.min(Math.ceil(total / PERSONS_MAX_PAGE_SIZE), PERSONS_MAX_PAGES);
    for (let page = 2; page <= pages; page++) {
      const next = await request<PersonListOut>(
        `/persons${qs({ ...p, page, page_size: PERSONS_MAX_PAGE_SIZE })}`
      );
      if (!next.items?.length) break;
      items.push(...next.items);
    }
    return { total, page: 1, page_size: items.length, items };
  },

  /**
   * Oraliqdagi BARCHA davomat yozuvi — `limit` + `offset` bilan.
   *
   * ⚠️ **`limit` 1 000 dan katta bo'lsa `422`** (o'lchandi 2026-09-05:
   * 1000 → `200 OK`, 1001 → `422`); `offset` esa ISHLAYDI (`skip`
   * e'tiborga olinmaydi — tekshirilgan). Kod ilgari `limit: 5000`
   * so'rardi va javob umuman kelmasdi. 1 000 shaxs × 7 kun = 7 000
   * yozuv, ya'ni bitta so'rov yetmaydi — shuning uchun sahifalash.
   */
  listAllAttendance: async (p: {
    date_from?: string;
    date_to?: string;
    event_type?: "entry" | "exit";
    person_id?: string;
  }): Promise<AttendanceOut[]> => {
    const out: AttendanceOut[] = [];
    for (let page = 0; page < ATTENDANCE_MAX_PAGES; page++) {
      const batch = await request<AttendanceOut[]>(
        `/attendance${qs({ ...p, limit: ATTENDANCE_MAX_LIMIT, offset: page * ATTENDANCE_MAX_LIMIT })}`
      );
      out.push(...(batch ?? []));
      if (!batch || batch.length < ATTENDANCE_MAX_LIMIT) break;
    }
    return out;
  },
  monthlyAttendance: (personId: string, year?: number, month?: number) =>
    request<MonthlyAttendance>(`/attendance/person/${personId}/monthly${qs({ year, month })}`),

  /* Statistika */
  dashboard: () => request<DashboardStats>("/statistics/dashboard"),
  emotions: (date_from: string, date_to: string) =>
    request<EmotionStats>(`/statistics/emotions${qs({ date_from, date_to })}`),
  emotionsDaily: (days = 7) => request<EmotionDaily[]>(`/statistics/emotions/daily${qs({ days })}`),

  /* Kameralar */
  cameraBrands: () => request<string[]>("/cameras/brands"),
  activeStreams: () => request<unknown[]>("/cameras/streams/active"),
  listCameras: (brand?: CameraBrand) => request<CameraOut[]>(`/cameras${qs({ brand })}`),
  getCamera: (id: string) => request<CameraOut>(`/cameras/${id}`),
  createCamera: (data: CameraPayload) =>
    request<CameraOut>("/cameras", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  updateCamera: (id: string, data: Partial<CameraPayload>) =>
    request<CameraOut>(`/cameras/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  deleteCamera: (id: string) => request<void>(`/cameras/${id}`, { method: "DELETE" }),
  cameraStreamUrl: (id: string) => request<{ stream_url?: string; url?: string }>(`/cameras/${id}/stream-url`),
  /** MJPEG jonli oqim — <img src> uchun; header yuborib bo'lmagani sabab token query'da */
  cameraMjpegUrl: (id: string) => {
    const t = loadTokens();
    return `${BASE}/cameras/${id}/mjpeg${t?.access ? `?token=${encodeURIComponent(t.access)}` : ""}`;
  },
  checkCamera: (id: string) => request<Record<string, unknown>>(`/cameras/${id}/check`, { method: "POST" }),
  startStream: (id: string) => request<Record<string, unknown>>(`/cameras/${id}/stream/start`, { method: "POST" }),
  stopStream: (id: string) => request<Record<string, unknown>>(`/cameras/${id}/stream/stop`, { method: "POST" }),
  streamStatus: (id: string) => request<Record<string, unknown>>(`/cameras/${id}/stream/status`),

  /* Xavfli hodisalar */
  listEvents: (p: { event_type?: string; is_resolved?: boolean; date_from?: string; limit?: number }) =>
    request<AlarmEventOut[]>(`/events${qs(p)}`),
  createEvent: (data: {
    event_type: string;
    camera_id?: string;
    description?: string;
    severity?: string;
    participants_count?: number;
  }) =>
    request<AlarmEventOut>("/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  eventStats: () => request<EventStats>("/events/stats"),
  resolveEvent: (id: string) => request<AlarmEventOut>(`/events/${id}/resolve`, { method: "PATCH" }),

  /* Administrator */
  adminStatus: () => request<AdminStatus>("/admin/status"),
  resync: (direction: "to_backup" | "to_primary" = "to_backup") =>
    request<Record<string, unknown>>(`/admin/resync${qs({ direction })}`, { method: "POST" }),
  reloadFaceIndex: () => request<Record<string, unknown>>("/admin/face-index/reload", { method: "POST" }),

  /* Tizim holati — `/admin/status` (auth talab qiladi). FastAPI'ning ildizdagi
     `/health` yo'li ATAYLAB ishlatilmaydi: nginx uni backendga uzatmaydi,
     frontend'ning o'ziga tushib 404 qaytaradi. */
};

/** Shaxs fotosi uchun URL. photo_path bo'sh bo'lsa null.
 *  To'g'ridan-to'g'ri rejimda backend origini oldiga qo'shiladi. */
export function photoUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${MEDIA_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}
