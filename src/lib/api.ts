/**
 * Backend API client — FastAPI. Manzil `src/config/endpoints.ts` da hal
 * qilinadi: sozlamaga qarab to'g'ridan-to'g'ri
 * `http://<backend-server-ip>:7005/api/v1/...` yoki same-origin `/api/v1/...` (Next
 * rewrites orqali). Swagger: `${BACKEND_ORIGIN}/docs`.
 *
 * Token localStorage'da saqlanadi, 401 bo'lsa refresh-token bilan bir marta
 * yangilashga urinadi, bo'lmasa logout qilib login sahifasiga qaytaradi.
 */

import { API_BASE, MEDIA_BASE, serviceBase } from "@/config/endpoints";

/** REST ildizi — to'g'ridan-to'g'ri backend origini yoki same-origin proxy
 *  (`.env.local` dagi `NEXT_PUBLIC_API_ORIGIN` bilan almashadi). */
const BASE = API_BASE;
/**
 * API ILDIZI (`/api`, `/v1`siz).
 *
 * 🔴 2026-09-14 dan asosiy API — kuzatuv posti serveri (foydalanuvchi
 * `BACKEND_ORIGIN`ni shu serverga o'zgartirdi). U yerda login/refresh/me/users
 * `/api/login`, `/api/auth/refresh`, `/api/me`, `/api/users` da — eski
 * backenddagi `/api/v1/auth/...` EMAS (o'lchandi: eski yo'l `401`, yangisi
 * `200`). Eski backend bilan ham ishlashi uchun avval yangi yo'l, u yerda
 * bo'lmasa eskisi so'raladi (`withFallback`).
 */
const API_ROOT = serviceBase("api");

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

export interface PersonListOut {
  total: number;
  page: number;
  page_size: number;
  items: PersonOut[];
}

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

/** Javob JSON'mi — noma'lum yo'lda yangi server `200` + HTML (o'z panel sahifasi) qaytaradi. */
function isJson(res: Response): boolean {
  return (res.headers.get("content-type") ?? "").includes("application/json");
}

/** Bu yo'l shu serverda YO'Qmi — eski/yangi server orasida zaxira yo'lga o'tish uchun. */
function missingRoute(res: Response): boolean {
  return res.status === 404 || res.status === 405 || !isJson(res);
}

/**
 * Yangi server (kuzatuv posti) foydalanuvchi obyekti — maydonlari eski
 * backenddan farq qiladi: `/api/me` da `uid` + `user` (login MATNI),
 * `/api/users` da `id` + `username`. UI eski `UserOut` shaklini kutadi.
 */
type RawUser = {
  id?: number | string;
  uid?: number | string;
  username?: string;
  user?: unknown;
  full_name?: string | null;
  role?: string;
  is_active?: boolean;
};

function normalizeUser(u: RawUser): UserOut {
  return {
    id: String(u.id ?? u.uid ?? ""),
    username: u.username ?? (typeof u.user === "string" ? u.user : ""),
    full_name: u.full_name ?? null,
    role: u.role ?? "",
    is_active: u.is_active ?? true,
  };
}

/**
 * Avval YANGI server yo'li, u yerda bo'lmasa (`404`/`405`, HTML) — ESKI
 * backend yo'li. Shunda panel ikkala server bilan ham ishlaydi.
 */
async function withFallback<T>(primary: () => Promise<T>, legacy: () => Promise<T>): Promise<T> {
  try {
    return await primary();
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 405)) return legacy();
    throw e;
  }
}

let refreshing: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (!refreshing) {
    refreshing = (async () => {
      const tokens = loadTokens();
      if (!tokens?.refresh) return false;
      try {
        const init: RequestInit = {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: tokens.refresh }),
        };
        /* Yangi server — `/api/auth/refresh`; eski backend — `/api/v1/auth/refresh` */
        let res = await fetch(`${API_ROOT}/auth/refresh`, init);
        if (missingRoute(res)) res = await fetch(`${BASE}/auth/refresh`, init);
        if (!res.ok || !isJson(res)) return false;
        const t = (await res.json()) as Token;
        if (!t.access_token) return false;
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

async function request<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
  timeoutMs: number = REQUEST_TIMEOUT_MS,
  /** Yo'l ildizi — odatda `/api/v1`; yangi serverning auth yo'llari uchun `API_ROOT`. */
  base: string = BASE
): Promise<T> {
  const tokens = loadTokens();
  const headers = new Headers(init.headers);
  if (tokens?.access) headers.set("Authorization", `Bearer ${tokens.access}`);

  const timeoutController = new AbortController();
  const timer = window.setTimeout(() => timeoutController.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${base}${path}`, { ...init, headers, signal: init.signal ?? timeoutController.signal });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new ApiError(0, `Server javob bermadi (${Math.round(timeoutMs / 1000)}s) — manzilni tekshiring`);
    }
    throw new ApiError(0, "Server bilan aloqa yo'q");
  } finally {
    window.clearTimeout(timer);
  }

  if (res.status === 401 && retry) {
    if (await tryRefresh()) return request<T>(path, init, false, timeoutMs, base);
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
  /* ⚠️ Noma'lum yo'lda yangi server (kuzatuv posti) `200` bilan HTML — o'z
     panel sahifasini — qaytaradi (o'lchandi 2026-09-14: `/persons`,
     `/statistics/dashboard`, `/admin/status`). Ilgari bu Blob bo'lib
     chaqiruvchiga ketardi va JSON kutgan kod (`.map`, `.items`) yiqilardi. */
  if (ct.includes("text/html")) throw new ApiError(404, "Bu imkoniyat joriy serverda yo'q");
  if (!ct.includes("application/json")) return (await res.blob()) as T;
  return (await res.json()) as T;
}

function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
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
    let res: Response;
    try {
      /* Yangi server — JSON, `/api/login` */
      res = await fetch(`${API_ROOT}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      /* Eski backend — form, `/api/v1/auth/login` (yangi yo'l bo'lmasa) */
      if (missingRoute(res)) {
        res = await fetch(`${BASE}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ username, password }),
        });
      }
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
    /* `200` bo'lsa ham token bo'lmasligi mumkin (`{ok:false}`) — bo'sh token
       saqlanib, keyingi har so'rov jim `401` bilan qaytmasin. */
    if (!t.access_token) throw new ApiError(401, detailMessage(t, "Login yoki parol noto'g'ri"));
    saveTokens({ access: t.access_token, refresh: t.refresh_token });
    return t;
  },
  me: () =>
    withFallback(
      async () => normalizeUser(await request<RawUser>("/me", {}, true, REQUEST_TIMEOUT_MS, API_ROOT)),
      () => request<UserOut>("/auth/me")
    ),
  listUsers: () =>
    withFallback(
      async () =>
        (await request<{ users?: RawUser[] }>("/users", {}, true, REQUEST_TIMEOUT_MS, API_ROOT)).users?.map(normalizeUser) ?? [],
      () => request<UserOut[]>("/auth/users")
    ),
  createUser: (data: { username: string; password: string; full_name?: string; role?: string }) =>
    withFallback(
      async () => {
        const r = await request<RawUser & { user?: unknown }>(
          "/users",
          { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) },
          true,
          REQUEST_TIMEOUT_MS,
          API_ROOT
        );
        /* Javob `{user:{...}}` yoki to'g'ridan-to'g'ri foydalanuvchi bo'lishi mumkin */
        return normalizeUser(r.user && typeof r.user === "object" ? (r.user as RawUser) : r);
      },
      () =>
        request<UserOut>("/auth/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        })
    ),

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
    if (!Array.isArray(first?.items)) return { total: 0, page: 1, page_size: 0, items: [] };
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
      /* Kuzatuv posti serverida `/attendance` — KUNLIK holat obyekti (`rows`,
         `summary`…), eski backenddagi yozuvlar massivi EMAS; obyektni
         yoyish (`...batch`) TypeError berardi. Massiv bo'lmasa — bo'sh. */
      if (!Array.isArray(batch)) break;
      out.push(...batch);
      if (batch.length < ATTENDANCE_MAX_LIMIT) break;
    }
    return out;
  },
  /* Kameralar (zaxira ro'yxat).
     🔴 2026-10-23: `NEXT_PUBLIC_API_ORIGIN` endi kuzatuv posti serveriga (7007)
     qaraydi; u `/cameras` ga eski backend kabi MASSIV emas, `{cameras:[{id,
     name,count,last}]}` qaytaradi. Ilgari bu obyekt `CameraOut[]` deb
     chaqiruvchiga ketib, `.map`/`.filter` da butun bo'limni ("Shaxslar →
     Xodimlar") yiqitardi. Endi ikkala shakl ham `CameraOut[]`ga keltiriladi. */
  listCameras: async (brand?: CameraBrand): Promise<CameraOut[]> => {
    const r = await request<unknown>(`/cameras${qs({ brand })}`);
    if (Array.isArray(r)) return r as CameraOut[];
    const list = (r as { cameras?: unknown } | null)?.cameras;
    if (!Array.isArray(list)) return [];
    return (list as { id: string | number; name?: string }[]).map((c) => ({
      id: String(c.id),
      name: c.name ?? String(c.id),
      brand: "",
      location: null,
      ip_address: null,
      port: 0,
      username: null,
      channel: Number(c.id) || 0,
      stream_quality: "",
      direction: "",
      is_active: true,
      created_at: "",
      stream_url_masked: null,
    })) as CameraOut[];
  },
};

/** Shaxs fotosi uchun URL. photo_path bo'sh bo'lsa null.
 *  To'g'ridan-to'g'ri rejimda backend origini oldiga qo'shiladi. */
export function photoUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${MEDIA_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}
