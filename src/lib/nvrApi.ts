/**
 * kuzatuv posti hodisalari klienti — yuz tanish, qurol, janjal, chekish/telefon.
 *
 * Manzil DOIM same-origin `/nvr/...` (`app/nvr/[...path]/route.ts`): u so'rovga
 * `X-API-Key` ni SERVER tomonda qo'shadi, shuning uchun kalit brauzerga
 * chiqmaydi va CORS ham kerak emas. To'g'ridan-to'g'ri rejim ataylab yo'q.
 *
 * Server manzili/kaliti: `config/services.mjs` → `nvr` yozuvi.
 * API tavsifi — YAGONA MANBA: **`FRONTEND.md`** (`API.md` ESKIRGAN).
 * Jonli serverda tekshirilgan (`GET /openapi.json` shu ro'yxatni beradi).
 */
import { NVR_BASE } from "@/config/endpoints";
import { tr } from "@/i18n";

/**
 * Qidiruv matnini SERVERGA yuborishdan oldin — `GUIDE.md` ("Ismlardagi
 * apostrof"): qurilma oddiy `'` (U+0027) ni RAD ETADI, shuning uchun
 * ismlar `ʻ` (U+02BB) bilan saqlanadi (`Qoʻldosheva`, `Gʻofurov`).
 * Foydalanuvchi esa klaviaturadagi oddiy apostrofni yozadi — shu farq
 * tufayli apostrofli ism qidiruvda topilmasdi. `search=` parametri
 * berilgan HAR bir joyda shu funksiya orqali o'tkaziladi
 * (`listPeople`, `listFaces`, `getAttendance`).
 */
function normalizeSearch(s: string): string {
  return s.replace(/['‘’`]/g, "ʻ");
}

/**
 * Serverdagi HAQIQIY hodisa kategoriyalari (`FRONTEND.md` 0-bo'lim) — atigi
 * to'rtta.
 *
 * DIQQAT: eski `people` (odam sanash, ESKI shakli) OLIB TASHLANGAN.
 * `GET /api/v1/people/events` endi **`200`** + bo'sh ro'yxat +
 * `"deprecated": true` qaytaradi (2026-09-02 da tuzatildi — ilgari
 * `/people/{id}` yo'liga tushib `422` berardi). Bu manzil baribir
 * ISHLATILMAYDI: odam sanash endi HAQIQIY manba bilan — pastdagi
 * `/counting/...` funksiyalari (`FRONTEND.md` 10-A bo'lim).
 */
export type NvrCategory = "face" | "gun" | "janjal" | "smoking";

/** So'rov uchun kategoriya — `all` server tomonda TO'RTTASINING BIRLASHMASI.
 *  Ilgari bunday kategoriya yo'q edi va klient 4 ta parallel so'rov yuborardi. */
export type NvrQueryCategory = NvrCategory | "all";

/** Nishon ramkasi — koordinatalar 0..1 (rasm o'lchamiga nisbatan). */
export interface NvrBox {
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
}

export interface NvrEvent {
  id: number;
  category: NvrCategory;
  category_label: string;
  /** Tayyor matn — shundoq ko'rsatsa bo'ladi. */
  label: string;
  /** ISO vaqt (+05:00). */
  time: string;
  camera: string;
  channel: string;
  /** Ishonch foizda (`94.4`), yo'q bo'lsa `null`. */
  confidence: number | null;
  /** Rasm yo'li (`/api/v1/events/{id}/image`) yoki `null`. */
  image_url: string | null;
  image_count: number;
  image: string | null;
  /**
   * `true` — qurilmadagi HALQA BUFER rasmni allaqachon ustidan yozib
   * yuborgan (`FRONTEND.md` 5-D bo'limi, o'lchandi 2026-09-03: 1585 ta
   * rasmdan **646 tasi** — 41% — shunday chiqqan, birortasi ham
   * tiklanmagan). Bunday holatda `<img>` UMUMAN CHIZILMASLIGI kerak —
   * qurilma so'rovga `200` bilan javob berib, ichiga JPEG o'rniga
   * tasodifiy baytlar solib yuboradi (brauzerda bu qop-qora to'rtburchak
   * bo'lib ko'rinardi, aniq sababsiz).
   */
  picture_lost?: boolean;
  /* face */
  name?: string | null;
  recognized?: boolean;
  face_library?: string | null;
  /** Yosh/jins/ko'zoynak/niqob — yo'q bo'lsa `null` (bo'sh obyekt EMAS). */
  attributes?: Record<string, string> | null;
  /**
   * SHAXS raqami (`FRONTEND.md` 5-B): bir xil yuz DOIM bir xil raqamni oladi —
   * odam yuz bazasida bo'lmasa ham. Suratda yuz topilmasa `null`.
   */
  face_id?: number | null;
  /* gun / janjal / smoking */
  targets?: string | null;
  /** `FRONTEND.md`: DOIM ro'yxat — yo'q bo'lsa `[]` (hech qachon `null` emas). */
  boxes?: NvrBox[];
  alert?: boolean;
  /* video (`FRONTEND.md` 5-A) — hodisa bilan BIRGA keladi, alohida so'rov shart emas */
  video_url?: string | null;
  /** `false` — video hali tayyorlanmoqda (server birinchi so'rovda aylantiradi). */
  video_ready?: boolean;
  /* faqat `group=true` da (`FRONTEND.md` 4-A) */
  /** Shu o'tishda nechta kadr olingan. */
  frames?: number;
  visit_from?: string;
  visit_to?: string;
  /**
   * TANILGAN odam haqida TAYYOR ma'lumot — `GET /events/{id}` javobida
   * (`FRONTEND.md` 10-D). Bazadagi suratni alohida qidirish SHART EMAS.
   *
   * Uch holat AJRATIB ko'rsatiladi: `null` — kadrda tanilgan odam yo'q;
   * `in_library:false` — ism bor, lekin bazada surati yo'q (tanishga
   * ishonib bo'lmaydi, `detail` sababini yozadi); `in_library:true` —
   * solishtirish mumkin.
   */
  person?: {
    in_library: boolean;
    person_id: number;
    full_name: string;
    role?: string;
    role_label?: string;
    note?: string;
    gender?: string;
    /** Panel yo'li (`/api/people/{id}/photo`) — biz `nvrPersonPhotoUrl()` ni
     *  ishlatamiz (ochiq API varianti), shuning uchun bu maydon faqat
     *  ma'lumot uchun. */
    library_photo_url?: string;
    detail?: string;
  } | null;
  /** Operator hukmi: `"ok"` | `"wrong"` | `""` (hali hukm yo'q). */
  verdict?: string;
  /**
   * `verdict` QAYSI DARAJADA berilgan (`GUIDE.md`, 2026-09-10 kunduzi —
   * "Tasdiqlangan odam QAYTA so'ralmaydi"): `"frame"` — aynan shu yuz
   * guruhi tekshirilgan; `"person"` — bu ODAM ilgari (boshqa kadrda)
   * tasdiqlangan, shuning uchun bu kadr ham hisobga kiradi.
   *
   * ⚠️ Ikkalasida ham qoida bir xil: `verdict` BO'SH BO'LMASA savol
   * qayta ko'rsatilMAYDI (`VerifyRecognition`, `DetectionsPage.tsx`) —
   * `verdict_scope` faqat SABABINI tushuntiradi, xatti-harakatga
   * ta'sir qilmaydi.
   */
  verdict_scope?: "frame" | "person" | "";
}

export interface NvrPage {
  category: string;
  events: NvrEvent[];
  total: number;
  limit: number;
  offset: number;
}

export interface NvrQuery {
  limit?: number;
  offset?: number;
  /** Kanal RAQAMI (server parametri `camera` deb ataladi, lekin kanal raqamini kutadi). */
  camera?: string;
  date_from?: string;
  date_to?: string;
  /**
   * Takroriy kadrlarni yig'ish (`FRONTEND.md` 4-A): bitta o'tish — bitta yozuv.
   * Yuz kamerasi odam kadrda turgan HAR SONIYADA surat yuboradi, shuning uchun
   * yig'masdan ro'yxat bitta odamning 20-30 nusxasi bilan to'lib ketadi
   * (jonli serverda o'lchandi: 2131 xom hodisa → 698 o'tish).
   * Faqat `face` hodisalariga ta'sir qiladi; `total` ham o'tishlar soni bo'ladi.
   */
  group?: boolean;
  /** Dastlabki N ta hodisaning VIDEOSINI serverda oldindan tayyorlash (0–10). */
  prefetch?: number;
}

/** Hodisalar tarixi. Rasm ATAYLAB so'ralmaydi (`images=false`) — ro'yxat
 *  yengil bo'lsin, rasmni `<img>` o'zi yuklaydi va brauzer keshlaydi. */
/**
 * Server `limit` uchun YUQORI chegara.
 *
 * ⚠️ **2026-09-03 da 100 dan 500 ga KO'TARILDI** (`FRONTEND.md`
 * o'zgarishlar jadvali, 1-band) — ilgari `limit=101` **422** qaytarardi
 * (`{"msg":"Input should be less than or equal to 100"}`) va shu sabab
 * bu chegara 100 da qotirilgan edi. Endi eski `limit=150` chaqiruvlari
 * ham to'g'ri ishlaydi; chegara SHU YERDA qo'yiladi, chaqiruvchida emas —
 * bitta joyni unutib undan katta son so'ralsa butun ro'yxat yiqilardi.
 */
export const NVR_MAX_LIMIT = 500;

export async function listEvents(category: NvrQueryCategory, q: NvrQuery = {}): Promise<NvrPage> {
  const limit = Math.min(q.limit ?? 24, NVR_MAX_LIMIT);
  const p = new URLSearchParams({ images: "false", limit: String(limit) });
  if (q.offset) p.set("offset", String(q.offset));
  if (q.camera) p.set("camera", q.camera);
  if (q.date_from) p.set("date_from", q.date_from);
  if (q.date_to) p.set("date_to", q.date_to);
  if (q.group) p.set("group", "true");
  if (q.prefetch) p.set("prefetch", String(q.prefetch));

  const res = await fetch(`${NVR_BASE}/${category}/events?${p}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`kuzatuv posti ${category}: ${res.status}`);
  return res.json();
}

/**
 * Bitta hodisa (`FRONTEND.md` 8-bo'lim).
 *
 * KERAK BO'LADI: 3D kampus markeridan kelgan hodisa joriy sahifada yoki
 * yig'ilgan (`group=true`) ro'yxatda BO'LMASLIGI mumkin — o'shanda yozuv shu
 * so'rov bilan olinadi, aks holda tafsilot oynasi umuman ochilmasdi.
 */
export async function getEvent(id: number): Promise<NvrEvent> {
  const res = await fetch(`${NVR_BASE}/events/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`kuzatuv posti event ${id}: ${res.status}`);
  return res.json();
}

/** Yig'ilgan o'tishning QOLGAN kadrlari (`FRONTEND.md` 4-A).
 *  `group=true` ma'lumotni yashirmaydi — kartochka bosilganda shu ro'yxat olinadi. */
export async function listVisit(id: number): Promise<{ events: NvrEvent[]; total: number }> {
  const res = await fetch(`${NVR_BASE}/events/${id}/visit`, { cache: "no-store" });
  if (!res.ok) throw new Error(`kuzatuv posti visit ${id}: ${res.status}`);
  return res.json();
}

/**
 * BITTA SHAXSNING butun tarixi — `face_id` bo'yicha (`FRONTEND.md` 5-B).
 *
 * `GET /faces/{id}` shu odamning BARCHA suratlarini beradi: u bazaga
 * qo'shilgan bo'lishi SHART EMAS. Server bir xil yuzga doim bir xil raqam
 * beradi, shuning uchun "notanish" odam ham to'liq kuzatiladi.
 *
 * `linked_face_ids` — server bir xil deb topgan BOSHQA raqamlar (yuz
 * turli burchakda tushganda alohida raqam olishi mumkin); ular ham shu
 * javobga qo'shilgan.
 */
export interface NvrFace {
  /* O'lchandi (2026-09-06): `{id, full_name, role}` — `id` kuzatuv postining O'Z
     `NvrPerson.id`si (number), backend `Person.id` (UUID) EMAS. */
  person: { id: number; full_name: string; role: string } | null;
  name: string;
  face_ids: number[];
  linked_face_ids: number[];
  /**
   * `GUIDE.md` (2026-09-10 kechki, "Shaxs tarixiga BEGONA kadrlar
   * tushmaydi"): `face_ids` ICHIDAGI qaysi guruhlar ISHONCHLI
   * (`clean_face_ids`) va qaysilari ARALASH (`mixed_face_ids` —
   * guruhda bir nechta turli odamning kadri bor, faqat ISMLI/bog'langan
   * kadrlari shu odamga olingan, qolgani tashlab yuborilgan). Ikkalasi
   * ham ixtiyoriy — server hali bermasa `undefined`, ogohlantirish
   * chizilmaydi.
   */
  clean_face_ids?: number[];
  mixed_face_ids?: number[];
  events: NvrEvent[];
  total: number;
  stats?: {
    total: number;
    /* ⚠️ `null` bo'lishi mumkin — ro'yxatga OLINGAN, lekin HALI BIRON
       marta kamerada KO'RINMAGAN shaxs uchun (`total:0`). O'lchandi
       2026-09-11: 642 tadan 150 tasi (~23%) shu holatda — kamdan-kam
       chekka hol emas. `cameras`/`by_day` bunday holatda bo'sh massiv
       keladi, `first_seen`/`last_seen` esa hisoblab bo'lmaydigani uchun
       `null`. */
    first_seen: string | null;
    last_seen: string | null;
    days: number;
    cameras: { channel: string; camera: string; count: number; first_seen: string; last_seen: string }[];
    /** Kunlar kesimi — server tayyor beradi, klientda qayta hisoblanmaydi. */
    by_day: { day: string; count: number; first_seen: string; last_seen: string }[];
  };
}

/**
 * RO'YXATDAGI SHAXSNING kuzatuv tarixi — `GET /people/{id}`.
 *
 * ⚠️ **JAVOB `getFace()` BILAN AYNI SHAKLDA** (o'lchandi 2026-09-04:
 * `name`, `face_ids`, `linked_face_ids`, `events`, `total`, `stats`) —
 * shuning uchun `FaceHistoryModal` hech qanday o'zgarishsiz ikkala
 * manbadan ham ishlaydi.
 *
 * ⚠️ **NEGA MUHIM — ISM BO'YICHA QIDIRISHNI ALMASHTIRADI.** Ilgari
 * ro'yxatdagi odamning tarixi `FaceHistoryModalByName` orqali ochilardi:
 * `listFaces({search: ism, known:"yes"})` bilan mos `face_id` QIDIRILARDI,
 * ya'ni bir xil ismli ikki odam bo'lsa NOTO'G'RI tarix chiqishi mumkin
 * edi. Bu yerda esa ANIQ FK — `NvrPerson.id`, taxmin yo'q.
 */
export async function getPersonHistory(personId: number, limit = 200): Promise<NvrFace> {
  const res = await fetch(`${NVR_BASE}/people/${personId}?limit=${Math.min(limit, 500)}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`kuzatuv posti person ${personId}: ${res.status}`);
  return res.json();
}

export async function getFace(faceId: number, limit = 200): Promise<NvrFace> {
  const res = await fetch(`${NVR_BASE}/faces/${faceId}?limit=${Math.min(limit, 500)}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`kuzatuv posti face ${faceId}: ${res.status}`);
  return res.json();
}

/**
 * `/api/v1/...` (kuzatuv posti javobidagi yo'l) → `/nvr/...` (bizning proxy).
 *
 * ⚠️ **BOSHQA MANBADAN kelgan, ALLAQACHON TAYYOR yo'l O'ZGARTIRILMAYDI**
 * (2026-09-09 qo'shildi — "2-versiya" uchun `weapon2ToNvrEvent()`,
 * `lib/weapon2Api.ts`). `/api/v1` bilan boshlanmagan yo'l (masalan
 * `/weapon2/alert_images/...`) allaqachon to'g'ri proxy manzili —
 * `NVR_BASE` qo'shib qo'yish uni BUZAR edi (`/nvr/weapon2/...`).
 */
function toProxyPath(url: string): string {
  if (!url.startsWith("/api/v1")) return url;
  return `${NVR_BASE}${url.replace(/^\/api\/v1/, "")}`;
}

/** Rasm manzili — `<img src>` ga to'g'ridan-to'g'ri qo'yiladi.
 *  `index`: 0 — kesilgan yuz, 1 — butun kadr (`image_count` dan kichik bo'lsin). */
export function nvrImageUrl(ev: NvrEvent, index = 0): string | null {
  if (!ev.image_url) return null;
  return `${toProxyPath(ev.image_url)}${index ? `?index=${index}` : ""}`;
}

/**
 * Jonli oqim — SSE (`text/event-stream`).
 *
 * WebSocket ATAYLAB ishlatilmaydi: u proxy orqali o'tmaydi (kalit serverda
 * qolishi kerak), SSE esa oddiy HTTP va brauzer uzilgan ulanishni O'ZI tiklaydi.
 *
 * @returns to'xtatish funksiyasi
 */
export function subscribeNvr(
  category: NvrQueryCategory,
  onEvent: (ev: NvrEvent) => void,
  onState?: (connected: boolean) => void
): () => void {
  let es: EventSource | null = null;
  let stopped = false;

  const open = () => {
    if (stopped) return;
    es = new EventSource(`${NVR_BASE}/${category}/sse`);
    es.onopen = () => onState?.(true);
    es.onmessage = (m) => {
      try {
        onEvent(JSON.parse(m.data) as NvrEvent);
      } catch {
        /* ": kutilmoqda" kabi izoh qatorlari — e'tibor bermaymiz */
      }
    };
    es.onerror = () => {
      onState?.(false);
      // EventSource o'zi qayta ulanadi; server butunlay yopilsa ham urinaveradi
    };
  };

  open();
  return () => {
    stopped = true;
    es?.close();
    onState?.(false);
  };
}

/* ───────────────────────── Hodisa yordamchilari ─────────────────────────
   3D kampus va bino ichki ko'rinishi shu funksiyalardan foydalanadi —
   hodisani ko'rsatish qoidasi bitta joyda tursin. */

/** Hodisa xavflimi — server `alert` bersa o'shani, aks holda kategoriya bo'yicha. */
export function isAlarm(e: NvrEvent): boolean {
  if (typeof e.alert === "boolean") return e.alert;
  return e.category === "gun" || e.category === "janjal";
}

/** Telefonni bildiruvchi so'zlar — server matnini turli tilda berishi mumkin. */
const PHONE_RE = /telefon|phone|call|qo'ng'iroq|мобил|телефон/i;

/**
 * `smoking` kategoriyasidagi hodisa TELEFONmi (chekish emas)?
 *
 * Server ikkalasini BITTA kategoriyaga qo'shib yuboradi (`FRONTEND.md` 0-bo'lim:
 * `smoking` — "Telefonda gaplashish va chekish"), alohida kategoriya YO'Q.
 * Shuning uchun ajratish faqat matn bo'yicha bo'ladi: hodisa nomi (`label`)
 * yoki aniqlangan nishon (`targets`) telefonni tilga olsa — telefon, aks holda
 * chekish.
 *
 * Server kelajakda alohida kategoriya bersa, shu funksiya o'rniga o'sha
 * ishlatiladi va UI o'zgarmaydi.
 */
export function isPhoneEvent(e: NvrEvent): boolean {
  if (e.category !== "smoking") return false;
  return PHONE_RE.test(`${e.label} ${e.targets ?? ""}`);
}

/* ────────────────────────────── Hodisa VIDEOSI ──────────────────────────────
   `FRONTEND.md` 5-A. Video ENDI OCHIQ API'da: `GET /api/v1/events/{id}/video`
   to'g'ridan-to'g'ri MP4 (H.264) qaytaradi va tayyor bo'lguncha so'rovni O'ZI
   ushlab turadi. Ilgari bu yo'l yo'q edi va biz panel API'sining `/mp4` ini
   so'rab, `202` kelganda 5 soniyada bir qayta urinardik.

   Panel API (`/nvr/panel/...`) faqat QO'SHIMCHA ma'lumot uchun qoldi: kodek,
   jonli oqim, asl `.dav` lavha. U ochiq API'da ham, rasmiy hujjatda ham yo'q —
   shuning uchun unga TAYANMAYMIZ: so'rov yiqilsa ham video ko'rsatiladi. */

export interface NvrVideoInfo {
  event_id: number;
  channel: number;
  channel_name: string;
  window: { start: string; end: string };
  /** Brauzer to'g'ridan-to'g'ri o'ynata oladimi (kuzatuv posti lavhasi odatda H.265 — yo'q). */
  playable_in_browser: boolean;
  codec: string | null;
  /** Asl lavha (`.dav`) — brauzer o'ynatmaydi, yuklab olinadi. */
  clip_url: string | null;
  clip_saved: boolean;
  /** Brauzer uchun aylantirilgan MP4. */
  mp4_url: string | null;
  /** `false` bo'lsa aylantirish hali tugamagan. */
  mp4_ready: boolean;
  can_convert: boolean;
  replay_frames: number;
  /** Kanalning jonli oqimi (MJPEG). */
  live_url: string | null;
  /** Video bo'lmasa — sababi (o'zbekcha, shundoq ko'rsatsa bo'ladi). */
  reason?: string | null;
}

/** `<video src>` uchun MP4 manzili — OCHIQ API (`/api/v1/events/{id}/video`).
 *  Hodisada `video_url` bo'lsa o'sha olinadi (yo'lni server o'zi beradi). */
export function nvrEventVideoUrl(ev: NvrEvent | number): string {
  if (typeof ev === "number") return `${NVR_BASE}/events/${ev}/video`;
  return ev.video_url ? toProxyPath(ev.video_url) : `${NVR_BASE}/events/${ev.id}/video`;
}

/** Video tayyorligi. */
export type NvrVideoState = "ready" | "preparing" | "none";

/**
 * Video tayyormi — `HEAD .../video?wait=0`.
 *
 * NEGA `wait=0` va NEGA `HEAD`: `<video>` teg `202` ni XATO deb biladi va
 * qayta so'ramaydi (`FRONTEND.md` 5-A ogohlantirishi), shuning uchun manzil
 * `<video>` ga faqat TAYYOR bo'lganda beriladi. `HEAD` esa tanani tortmaydi —
 * tekshiruv uchun bir necha MB video yuklanmasin.
 *
 * `200` — tayyor, `202` — aylantirilmoqda, qolgani (`404`/`503`) — video yo'q.
 */
export async function probeVideo(id: number): Promise<NvrVideoState> {
  const res = await fetch(`${NVR_BASE}/events/${id}/video?wait=0`, { method: "HEAD", cache: "no-store" });
  if (res.status === 200) return "ready";
  if (res.status === 202) return "preparing";
  return "none";
}

/* ── Panel API (`/nvr/panel/...`) — qo'shimcha imkoniyatlar ────────────────
   Ochiq API'da (`/api/v1`) YO'Q: kanallar ro'yxati, jonli MJPEG oqim, asl
   `.dav` lavha va kodek ma'lumoti. Proxy `panel/` prefiksini `/api/` ga
   almashtiradi (`app/nvr/[...path]/route.ts`). */

/** Panel API yo'lini (`/api/...`) proxy manziliga aylantiradi. */
function panelUrl(path: string): string {
  return `${NVR_BASE}/panel${path.replace(/^\/api/, "")}`;
}

/**
 * kuzatuv posti kanali = HAQIQIY kamera.
 *
 * Hodisalar faqat bir nechta kanaldan keladi, lekin qurilmada hammasi
 * ro'yxatga olingan; Kameralar bo'limi shu ro'yxatni ko'rsatadi.
 */
export interface NvrChannel {
  /** Kanal raqami (hodisadagi `channel` bilan bir xil, lekin SON). */
  id: number;
  name: string;
  ip: string;
  protocol: string;
  online: boolean;
}

export async function listChannels(): Promise<NvrChannel[]> {
  const res = await fetch(`${NVR_BASE}/panel/channels`, { cache: "no-store" });
  if (!res.ok) throw new Error(`kuzatuv posti channels: ${res.status}`);
  const j = (await res.json()) as { channels?: NvrChannel[] };
  return j.channels ?? [];
}

/** Kanalning jonli oqimi (MJPEG) — `<img src>` uchun.
 *  DIQQAT: bu UZLUKSIZ ulanish. Bir vaqtda o'nlab kanalni ochmang —
 *  panjarada `nvrChannelSnapshotUrl()` (bitta kadr) ishlatiladi. */
export function nvrChannelStreamUrl(channel: number, fps = 1): string {
  return `${NVR_BASE}/panel/channels/${channel}/stream?fps=${fps}`;
}

/**
 * Kanalning BITTA kadri (JPEG, ~40 KB) — panjaradagi kartochka va oqim
 * ulanguncha ko'rsatiladigan stop-kadr uchun.
 *
 * Oqimdan farqi: oddiy so'rov, darhol tugaydi. `bust` berilsa kesh chetlab
 * o'tiladi (yangilash tugmasi uchun).
 */
export function nvrChannelSnapshotUrl(channel: number, bust?: number): string {
  const q = bust ? `?t=${bust}` : "";
  return `${NVR_BASE}/panel/channels/${channel}/snapshot${q}`;
}

/** Kodek / jonli oqim / asl lavha — FAQAT qo'shimcha ma'lumot.
 *  Yiqilsa videoni ko'rsatishga xalaqit bermaydi. */
export async function getVideoInfo(eventId: number): Promise<NvrVideoInfo> {
  const res = await fetch(`${NVR_BASE}/panel/events/${eventId}/video`, { cache: "no-store" });
  if (!res.ok) throw new Error(`kuzatuv posti video info: ${res.status}`);
  return res.json();
}

/** Jonli oqim yoki asl lavha manzili (`live_url` / `clip_url` dan). */
export function nvrPanelUrl(path: string | null | undefined): string | null {
  return path ? panelUrl(path) : null;
}

/**
 * Server holati — `GET /api/status` (`GUIDE.md`, "Vaqt zonasi bitta
 * joydan"). Asosiy maqsad — `timezone.now`: butun tizim `Asia/Tashkent`
 * zonasida ishlaydi, "bugun"ni shundan hisoblash kerak (`lib/serverClock.ts`).
 *
 * ⚠️ Bu manzil `/api/v1` OSTIDA EMAS (login/auth kabi) — shuning uchun
 * `panelUrl()` orqali (`/nvr/panel/status` → `{origin}/api/status`).
 */
export interface NvrTimezone {
  name: string;
  offset_minutes: number;
  now: string;
  today: string;
}
export async function getNvrStatus(): Promise<{ timezone?: NvrTimezone }> {
  const res = await fetch(panelUrl("/api/status"), { cache: "no-store" });
  if (!res.ok) throw new Error(`kuzatuv posti status: ${res.status}`);
  return res.json();
}

/* ─────────────────────────── Yuz bazasi (`/people`) ───────────────────────────
   `FRONTEND.md` 10-bo'lim. Kamera odamni TANISHI uchun u shu bazada bo'lishi
   kerak; bo'lmasa yuz baribir ushlanadi, lekin `recognized:false` bo'ladi. */

export type NvrPersonRole = "student" | "teacher";

export interface NvrPerson {
  id: number;
  first_name: string;
  last_name: string | null;
  full_name: string;
  role: NvrPersonRole;
  role_label: string;
  fdid: string | null;
  /** Kuzatuv postidagi yuz yozuvi raqami. BO'SH bo'lsa rasm yuborilmagan,
   *  ya'ni kamera bu odamni TANIMAYDI — UI buni ko'rsatishi kerak. */
  pid: string | null;
  note: string | null;
  created_at: string;
  /* Quyidagilar hujjat namunasida yo'q, lekin server DOIM qaytaradi */
  gender?: string;
  born?: string;
  /** Necha marta kamerada ko'ringan. */
  seen_count?: number;
  last_seen?: string | null;
  last_event_id?: number | null;
}

export interface NvrPeoplePage {
  people: NvrPerson[];
  total: number;
  limit?: number;
  offset?: number;
  counts: { student: number; teacher: number; total: number };
}

export async function listPeople(
  q: { role?: NvrPersonRole; search?: string; klass?: string; limit?: number; offset?: number } = {}
) {
  const p = new URLSearchParams();
  if (q.role) p.set("role", q.role);
  if (q.search) p.set("search", normalizeSearch(q.search));
  /* ⚠️ Server parametri AYNAN `class` — bu JS'da zaxiralangan so'z,
     shuning uchun TS tomonda `klass` deb ataladi. */
  if (q.klass) p.set("class", q.klass);
  p.set("limit", String(q.limit ?? 100));
  if (q.offset) p.set("offset", String(q.offset));

  const res = await fetch(`${NVR_BASE}/people?${p}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`kuzatuv posti people: ${res.status}`);
  return res.json() as Promise<NvrPeoplePage>;
}

/* ── SINFLAR — `GET /api/v1/classes` ──────────────────────────────────
   Sinf ro'yxati SERVERDAN keladi, klientda `note` maydonidan yig'ilmaydi:
   ro'yxatda hali kamerada ko'rinmagan sinf ham bo'ladi va har birida
   nechta odam borligi tayyor keladi. O'lchandi 2026-09-04: 14 ta sinf +
   `Uqituvchilar`, jami 397 odam, javob 847 bayt / 22 ms. */

export interface NvrClassInfo {
  class: string;
  total: number;
  students: number;
  teachers: number;
}

export async function listClasses(): Promise<{ classes: NvrClassInfo[]; total: number }> {
  const res = await fetch(`${NVR_BASE}/classes`, { cache: "no-store" });
  if (!res.ok) throw new Error(`kuzatuv posti classes: ${res.status}`);
  return res.json();
}

/** Yangi odam qo'shish/tahrirlashda yuboriladigan maydonlar (`FRONTEND.md` 10-bo'lim). */
export interface NvrPersonPayload {
  first_name: string;
  last_name?: string;
  role?: NvrPersonRole;
  note?: string;
  gender?: "male" | "female";
  /** `YYYY-MM-DD` */
  born?: string;
}

/**
 * Yangi odam qo'shish — `POST /people`, `multipart/form-data`.
 *
 * ⚠️ Rasm YO'Q bo'lsa ham yozuv yaratiladi — server `pid`ni bo'sh
 * qaytaradi, ya'ni kamera bu odamni hali tanimaydi (UI shuni ko'rsatishi
 * kerak, `FRONTEND.md`da ochiq yozilgan).
 */
export async function createNvrPerson(data: NvrPersonPayload, image?: File | null): Promise<NvrPerson> {
  const fd = new FormData();
  fd.set("first_name", data.first_name);
  if (data.last_name) fd.set("last_name", data.last_name);
  fd.set("role", data.role ?? "student");
  if (data.note) fd.set("note", data.note);
  if (data.gender) fd.set("gender", data.gender);
  if (data.born) fd.set("born", data.born);
  // `Content-Type` QO'YILMAYDI — brauzer FormData chegarasini o'zi qo'shadi
  if (image) fd.set("image", image);

  const res = await fetch(`${NVR_BASE}/people`, { method: "POST", body: fd });
  if (!res.ok) throw new Error(`kuzatuv posti people yaratish: ${res.status}`);
  return res.json();
}

/** Tahrirlash — `PUT /people/{id}`. Rasm ixtiyoriy: berilsa yuz qayta o'qitiladi. */
export interface NvrPersonUpdateResult extends NvrPerson {
  /** Nechta ESKI kadr ismi yangilangan (`first_name`/`last_name` o'zgargan bo'lsa). */
  events_renamed?: number;
  /** `true` — qurilmaning O'Z bazasida ism ESKICHA qoldi (u ismni almashtirishga ruxsat bermaydi). */
  nvr_name_stale?: boolean;
  warning?: string;
}

/**
 * Tahrirlash — `PUT /people/{id}`.
 *
 * ⚠️ **JSON, `multipart/form-data` EMAS** — `POST` (yaratish) rasm bilan
 * kelgani uchun ko'p qismli, `PUT` esa faqat matn maydonlarini
 * o'zgartiradi va oddiy JSON kutadi (`FRONTEND.md`, o'lchandi
 * 2026-09-06: `multipart` bilan yuborilganda server **422** — "body
 * should be a valid dictionary" — qaytardi). Rasm YANGILASH bu yo'lda
 * UMUMAN YO'Q (hujjatda yo'q) — yangi rasm kerak bo'lsa odam o'chirilib
 * qaytadan qo'shiladi (`FRONTEND.md`ning o'z tavsiyasi).
 */
export async function updateNvrPerson(id: number, data: Partial<NvrPersonPayload>): Promise<NvrPersonUpdateResult> {
  const res = await fetch(`${NVR_BASE}/people/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`kuzatuv posti people tahrirlash: ${res.status}`);
  return res.json();
}

/**
 * O'chirish — `DELETE /people/{id}`. Ro'yxatdan HAM, kuzatuv postining
 * yuz bazasidan HAM o'chiradi.
 *
 * ⚠️ **`removed_from_nvr` TEKSHIRILISHI SHART.** `false` bo'lsa odam
 * ro'yxatdan ketgan, lekin yuzi qurilmada QOLGAN — kamera uni TANISHDA
 * DAVOM ETADI. Bu — jimgina o'tkazib yuborsa bo'ladigan xato emas,
 * xavfsizlik ma'nosi bor (o'chirilgan deb o'ylagan odam hali "tanilgan"
 * bo'lib chiqadi).
 */
export async function deleteNvrPerson(id: number): Promise<{ ok: boolean; removed_from_nvr: boolean; warning?: string }> {
  const res = await fetch(`${NVR_BASE}/people/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`kuzatuv posti people o'chirish: ${res.status}`);
  return res.json();
}

/**
 * Hodisani BUTUNLAY o'chirish — panel API `DELETE /api/events/{id}`.
 *
 * ⚠️ Ochiq API'da (`/api/v1`) butun hodisani o'chiradigan yo'l YO'Q —
 * u yerda faqat `DELETE /events/{id}/image` (RASMNI o'chiradi, hodisa
 * qoladi). O'sha yo'lning o'z hujjati butun hodisa uchun AYNAN shu panel
 * manzilini ko'rsatadi. O'lchandi (2026-09-14, mavjud bo'lmagan id bilan):
 * ikkala yo'l ham `404 "Hodisa topilmadi"` qaytardi — ya'ni yo'l bor va
 * proxy `DELETE`ni o'tkazadi.
 *
 * ⚠️ QAYTARIB BO'LMAYDI va hamma operator uchun o'chadi (yozuv serverda).
 * `404` — allaqachon o'chirilgan, maqsadga erishilgan deb qabul qilinadi.
 */
export async function deleteNvrEvent(id: number): Promise<void> {
  const res = await fetch(panelUrl(`/api/events/${id}`), { method: "DELETE" });
  if (!res.ok && res.status !== 404) throw new Error(`kuzatuv posti hodisa o'chirish: ${res.status}`);
}

/**
 * Hodisaning O'Z KADRIDAN yuz bazasiga qo'shish — `POST /events/{id}/enroll`
 * (`FRONTEND.md` 10-bo'lim, "Kadrdagi yuzni qo'shish").
 *
 * ⚠️ **BUNI `createNvrPerson()` + alohida rasm yuklashdan AFZAL ko'ring**
 * begona yuz uchun: bu yerda rasm ALLAQACHON hodisada bor, qayta
 * yuklanmaydi va yozuv YARATILGAN ZAHOTI o'sha `face_id`ning BARCHA eski
 * kadrlari ham yangi odam nomiga o'tadi (`createNvrPerson` buni qilmaydi
 * — u yangi, hodisasiz yozuv yaratadi va eski notanish tarix "Begona
 * shaxs" bo'lib qolaveradi).
 *
 * ⚠️ Faqat `student`/`teacher` — `NvrPersonRole` da uchinchi qiymat yo'q,
 * ya'ni "Xodim" uchun bu yo'l ishlamaydi (kuzatuv posti bunday toifani
 * bilmaydi).
 */
export async function enrollFaceFromEvent(
  eventId: number,
  data: { first_name: string; last_name?: string; role?: NvrPersonRole; note?: string; index?: 0 | 1 }
): Promise<NvrPerson> {
  const res = await fetch(`${NVR_BASE}/events/${eventId}/enroll`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      first_name: data.first_name,
      last_name: data.last_name,
      role: data.role ?? "student",
      note: data.note,
      index: data.index ?? 0,
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const detail = body && typeof body === "object" && "detail" in body ? String((body as { detail: unknown }).detail) : null;
    throw new Error(detail ?? `kuzatuv posti enroll: ${res.status}`);
  }
  return res.json();
}

/**
 * Notanish yuzni bazadagi odamga BOG'LASH — `POST /faces/{face_id}/assign`
 * (`FRONTEND.md` 10-bo'lim, "yangi").
 *
 * Ikki holat uchun: (1) odam rasmsiz qo'shilgan va kamerada "notanish"
 * bo'lib yuribdi, (2) model bitta odamni ikki guruhga bo'lib yuborgan.
 * `personId: null` — ADASHIB biriktirilgan bog'lanishni AJRATISH.
 *
 * ⚠️ `group=false` berilmasa BUTUN guruh (`face_ids[]`) biriktiriladi —
 * `FRONTEND.md`ning o'z tavsiyasi, aks holda "bog'ladim, lekin ba'zi
 * kadrlarda hali ham *Begona shaxs* turibdi" degan holat chiqadi.
 */
export async function assignFace(
  faceId: number,
  personId: number | null,
  opts: { group?: boolean } = {}
): Promise<{ ok: boolean; events: number; face_ids: number[]; person: { id: number; full_name: string; role: string } | null }> {
  const res = await fetch(`${NVR_BASE}/faces/${faceId}/assign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ person_id: personId, ...(opts.group === false ? { group: false } : {}) }),
  });
  if (!res.ok) throw new Error(`kuzatuv posti assign: ${res.status}`);
  return res.json();
}

export interface NvrVerifyResult {
  events: number;
  scope: "cluster" | "event";
}

/**
 * TANISH TO'G'RIMI — `POST /events/{id}/verify` (odam tasdiqlaydi/rad etadi).
 *
 * `correct:true` — bog'lanish MUSTAHKAMLANADI: yuz guruhi shu odamga
 * biriktiriladi, guruhdagi ismsiz kadrlarga ham ism qo'yiladi.
 * `correct:false` — kadr "tanilmagan"ga qaytadi VA shu yuz guruhi bilan
 * shu odam orasiga DOIMIY rad etish yoziladi — bir martalik tuzatish EMAS:
 * o'sha guruhdan kelgan yangi kadrlarga ham keyinchalik shu ism
 * qo'yilmaydi, qayta bog'lash (reconcile) buni tiklamaydi.
 *
 * `scope:"cluster"` — qoida BUTUN yuz guruhiga yozildi (`events` — nechta
 * kadr o'zgardi). `scope:"event"` — guruh hali hisoblanmagan, faqat shu
 * kadr tozalandi; chaqiruvchi buni "bir necha soniyadan keyin qayta
 * urinib ko'ring" deb ko'rsatishi kerak.
 */
export async function verifyEvent(eventId: number, correct: boolean): Promise<NvrVerifyResult> {
  const res = await fetch(`${NVR_BASE}/events/${eventId}/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ correct }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const detail = body && typeof body === "object" && "detail" in body ? String((body as { detail: unknown }).detail) : null;
    throw new Error(detail ?? `kuzatuv posti verify: ${res.status}`);
  }
  return res.json();
}

/* ═══════════════════════════════════════════════════════════════════════
   BAZADAGI SURAT — `GET /api/v1/people/{id}/photo`
   ═══════════════════════════════════════════════════════════════════════
   🔴 **ILGARIGI YO'L BUTUNLAY OLIB TASHLANDI** (2026-09-04). Biz
   qurilmaning XOM API'sidan (`/api/facelibs/{fdid}/persons`) har bir
   odamning `pic_url` ini olib, uni SSRF-himoyali relay
   (`app/nvr/facelib-image/route.ts`) orqali o'tkazardik. `pic_url` esa
   qurilmaning O'Z ichki IP'siga (`http://<kamera-qurilma-ip>:80/FDLib?...`)
   ishora qilardi — bizning serverimiz u tarmoqqa CHIQOLMAYDI.

   ⚠️ **SAYT AYNAN SHU SABAB QOTARDI** (o'lchandi 2026-09-04):
   har bir rasm so'rovi `<kamera-qurilma-ip>` ga ulanolmay **10.4 soniya** kutib
   turib `502` qaytarardi. Panjarada 48 kartochka bo'lsa — 48 ta shunday
   so'rov; brauzer bitta origin'ga bir vaqtda ~6 ulanish ochadi, ya'ni
   BOSHQA HAMMA so'rov (hodisalar, ro'yxatlar, rasmlar) shu osilgan
   so'rovlar ortida NAVBATDA turardi. Ustiga har bir osilgan so'rov
   Next serverida ham bitta ishlovchini 10 soniya band qilardi — "sayt
   qotib qoldi, ma'lumot sekin kelyapti" AYNAN shu edi.

   ✅ **TO'G'RI YO'L:** rasmni kuzatuv posti SERVERINING O'ZI beradi
   (`FRONTEND.md` 10-D: `<img src={/api/v1/people/${id}/photo} />`) —
   u qurilma bilan o'zi gaplashadi, biz esa faqat 7007-portga
   murojaat qilamiz. O'lchandi: `200 image/jpeg`, 27–640 ms. */

/** Odamning BAZADAGI (enrollment) surati — `<img src>` ga to'g'ridan
 *  qo'yiladi. Surati yo'q odamda server `404` beradi (`pid` bo'sh) —
 *  chaqiruvchi `onError` bilan bosh harflarga qaytishi kerak. */
export function nvrPersonPhotoUrl(personId: number): string {
  return `${NVR_BASE}/people/${personId}/photo`;
}

/* ═══════════════════════════════════════════════════════════════════════
   DAVOMAT — `GET /api/v1/attendance` (`FRONTEND.md`)
   ═══════════════════════════════════════════════════════════════════════
   ⚠️ **BU BACKEND `/api/v1/attendance` (7005) EMAS** — kuzatuv postining
   O'Z davomati (7007). Farqi hal qiluvchi: backend jadvalida amalda
   yozuv yo'q (o'lchandi: 2 ta, ikkalasi 2026-07-15), kuzatuv posti esa kamera
   odamni TANIGAN vaqtdan har kuni to'liq ro'yxat quradi — o'lchandi
   2026-09-04: **397** odam, 146 erta, 60 kech, 191 kelmagan.

   Holat qoidasi SERVERDA hisoblanadi (`settings`): `arrival_deadline`
   (08:30) dan oldin — `early`, keyin — `late`, `absent_after` (10:00)
   dan keyin ham ko'rinmasa — `absent`. Klientda QAYTA hisoblanmaydi.

   ⚠️ **`role` filtri faqat QATORLARNI kesadi, `summary` GLOBAL qoladi**
   (o'lchandi: `role=teacher` da ham `total:397`). Toifa kesimi shuning
   uchun qatorlardan KLIENTDA sanaladi.

   ⚠️ **`staff` (xodim) YO'Q** — kuzatuv posti faqat `student`/`teacher` biladi
   (`role=staff` bo'sh qaytaradi). Bu — API chegarasi, o'ylab
   topilmaydi. */

export type NvrAttendanceStatus = "early" | "late" | "absent" | "waiting";

export interface NvrAttendanceRow {
  person_id: number;
  full_name: string;
  role: NvrPersonRole;
  role_label: string;
  /** SINF shu maydonda (`10-A`, o'qituvchilarda `Uqituvchilar`). */
  note: string | null;
  gender?: string;
  pid?: string | null;
  /** BIRINCHI ko'rinish `HH:MM`; kelmaganda bo'sh satr. */
  time: string;
  /** O'sha kadr; kelmaganda `null`. */
  event_id: number | null;
  /** Panel yo'llari (`/api/events/{id}/thumb`) — `nvrPanelUrl()` bilan. */
  image_url: string | null;
  picture_url: string | null;
  video_url: string | null;
  library_photo_url: string | null;
  channel_id?: string;
  channel_name?: string;
  status: NvrAttendanceStatus;
  status_label: string;
}

export interface NvrAttendanceSummary {
  early: number;
  late: number;
  absent: number;
  waiting: number;
  total: number;
  present: number;
}

export interface NvrAttendanceSettings {
  /** `HH:MM` — shundan keyin kelgan "kech qoldi". */
  arrival_deadline: string;
  /** `HH:MM` — shundan keyin ham ko'rinmagan "kelmadi". */
  absent_after: string;
  /** `HH:MM` — kun boshlanishi; undan oldingi ko'rinishlar sanalmaydi. */
  day_start: string;
  /** Dam olish kunlari: `0`=dushanba … `6`=yakshanba, vergul bilan. */
  weekend: string;
}

export interface NvrAttendanceDay {
  date: string;
  settings: NvrAttendanceSettings;
  is_weekend: boolean;
  /** "kelmadi" vaqti o'tdimi — o'tmagan bo'lsa `absent` hali yakuniy emas. */
  deadline_passed: boolean;
  summary: NvrAttendanceSummary;
  rows: NvrAttendanceRow[];
}

export interface NvrClassRow extends NvrAttendanceSummary {
  class: string;
}

export interface NvrAttendanceClasses {
  date: string;
  settings: NvrAttendanceSettings;
  summary: NvrAttendanceSummary;
  classes: NvrClassRow[];
}

/** Bir kunlik davomat (`date` — `YYYY-MM-DD`). */
export async function getAttendance(
  date: string,
  q: { role?: NvrPersonRole; status?: NvrAttendanceStatus; search?: string } = {}
): Promise<NvrAttendanceDay> {
  const p = new URLSearchParams({ date });
  if (q.role) p.set("role", q.role);
  if (q.status) p.set("status", q.status);
  if (q.search) p.set("search", normalizeSearch(q.search));
  const res = await fetch(`${NVR_BASE}/attendance?${p}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`kuzatuv posti attendance: ${res.status}`);
  return res.json();
}

/**
 * **DAVR bo'yicha davomat — BITTA so'rov** (`GET /attendance/period`).
 *
 * 🔵 **2026-09-05 da topildi va ulandi.** kuzatuv posti hujjatida
 * (`http://<nvr>:7007/docs`) bu yo'l ALLAQACHON bor edi, lekin
 * frontend undan xabarsiz har kun uchun IKKITA so'rov yuborardi
 * (`/attendance/classes` + `/attendance?role=teacher`) — 30 kunlik
 * grafik uchun **60 ta HTTP so'rov**. O'lchandi: 7 kunlik davr uchun
 * bu endpoint **7.9 KB** va **1 ta** so'rov.
 *
 * Javob shakli (o'lchangan): `from`, `to`, `days`, `work_days`,
 * `total`/`students`/`teachers` (davr o'rtachalari) va **`by_day[]`** —
 * har kunda `total`/`students`/`teachers` kesimi + `is_weekend`.
 *
 * ⚠️ **`waiting` ham keladi** — kun tugamagan (yoki dam olish kuni)
 * paytda hamma shu holatda bo'ladi. Uni "kelmagan" deb sanash
 * NOTO'G'RI: dam olish kunida 642 kishi "kelmadi" bo'lib chiqardi.
 */
export interface NvrPeriodDay {
  date: string;
  is_weekend: boolean;
  total: NvrAttendanceSummary;
  students: NvrAttendanceSummary;
  teachers: NvrAttendanceSummary;
}

export interface NvrAttendancePeriod {
  from: string;
  to: string;
  /** Oraliqdagi KUNLAR soni (dam olish kunlari ham kiradi). */
  days: number;
  /** Ish kunlari — o'rtachalar shunga bo'linadi. */
  work_days: number;
  by_day: NvrPeriodDay[];
}

export async function getAttendancePeriod(from: string, to: string): Promise<NvrAttendancePeriod> {
  const res = await fetch(`${NVR_BASE}/attendance/period?date_from=${from}&date_to=${to}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`kuzatuv posti attendance/period: ${res.status}`);
  return res.json();
}

/**
 * Sinflar kesimi — **1.5 KB** (o'lchandi), to'liq ro'yxat esa 160 KB.
 * Davr bo'yicha kunma-kun yig'ish uchun AYNAN shu ishlatiladi: 30 kun
 * = 45 KB, to'liq ro'yxat bilan esa 4.8 MB bo'lardi.
 */
export async function getAttendanceClasses(date: string): Promise<NvrAttendanceClasses> {
  const res = await fetch(`${NVR_BASE}/attendance/classes?date=${date}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`kuzatuv posti attendance/classes: ${res.status}`);
  return res.json();
}

/**
 * ⚠️ **JAVOB O'RALGAN** (2026-09-09 da topildi va tuzatildi, JIDDIY xato).
 * Bu manzil `{arrival_deadline, absent_after, day_start, weekend}` ni
 * TO'G'RIDAN-TO'G'RI EMAS, `{"settings": {...}, "defaults": {...},
 * "statuses": [...]}` shaklida qaytaradi (jonli serverda o'lchandi,
 * ehtimol server yangilanishi bilan shakl o'zgargan). Kod ilgari butun
 * javobni `NvrAttendanceSettings` deb hisoblardi — `weekend` maydoni
 * shu sabab doim `undefined` bo'lardi.
 *
 * 🔴 **OQIBATI — KALENDARDA DUSHANBA "DAM OLISH KUNI" BO'LIB CHIQARDI**
 * (foydalanuvchi xabar qildi): `parseWeekend()` bo'sh qatorni
 * (`(undefined ?? "").split(",")` → `[""]`) sonlarga aylantirganda
 * `Number("")` JavaScript'da **`0`** beradi (`NaN` EMAS!) — shu "0"
 * dushanba indeksi bilan bir xil (`FaceHistoryModal.tsx`dagi
 * `(getDay()+6)%7` qoidasida 0=dushanba), ya'ni bo'sh/xato javob
 * TASODIFAN aynan dushanbani "dam olish kuni" qilib qo'yardi.
 */
export async function getAttendanceSettings(): Promise<NvrAttendanceSettings> {
  const res = await fetch(`${NVR_BASE}/attendance/settings`, { cache: "no-store" });
  if (!res.ok) throw new Error(`kuzatuv posti attendance/settings: ${res.status}`);
  const data = await res.json();
  return (data?.settings ?? data) as NvrAttendanceSettings;
}

/** Faqat o'zgartiriladiganini yuboring — server qolganini saqlab qoladi. */
export async function saveAttendanceSettings(
  data: Partial<NvrAttendanceSettings>
): Promise<NvrAttendanceSettings> {
  const res = await fetch(`${NVR_BASE}/attendance/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`kuzatuv posti attendance/settings: ${res.status}`);
  // ⚠️ `GET` bilan AYNI o'ram — yuqoridagi izohga qarang.
  const out = await res.json();
  return (out?.settings ?? out) as NvrAttendanceSettings;
}

/** `2026-08-05T11:36:18+05:00` → `05.08 11:36`. */
export function shortTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Ro'yxatdagi hodisa uchun bir qatorli tavsif (ism yoki nishon). */
export function detectSubject(e: NvrEvent): string | null {
  if (e.category === "face") {
    const d = tr().detect;
    return e.recognized ? (e.name ?? d.recognizedPerson) : d.unknownPerson;
  }
  return e.targets ?? null;
}

/** `2026-08-05T11:36:18+05:00` → `11:36:18`. */
export function nvrTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso.slice(11, 19) : d.toLocaleTimeString(tr().locale, { hour12: false });
}

/** Sana + vaqt (kartochka tagida). */
export function nvrDateTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString(tr().locale, { hour12: false });
}

/* ══════════════════════════════════════════════════════════════════════
   KAMERAGA TUSHGAN HAMMA ODAM — `GET /api/v1/faces`
   ══════════════════════════════════════════════════════════════════════
   `FRONTEND.md` 5-C. `/people` faqat QO'LDA qo'shilganlarni beradi, bu esa
   kamerada ko'ringan HAR BIR odamni — notanishini ham.

   ⚠️ NEGA MUHIM: ilgari "nechta odam o'tdi" degan son klientda
   hisoblanardi — kunning barcha hodisalari sahifama-sahifa o'qilib
   (11 ta so'rov), `face_id` lar to'plamga yig'ilardi. Server esa bir
   odamning bir NECHA `face_id` sini O'ZI birlashtiradi (`face_ids`),
   shuning uchun uning soni ANIQROQ: bugungi kun uchun klient **640**,
   server **620** bergan (o'lchandi 2026-09-02). Endi bitta so'rov. */

export interface NvrFaceCamera {
  channel: string;
  camera: string;
  count: number;
  first_seen: string;
  last_seen: string;
}

export interface NvrFaceRow {
  face_id: number;
  /** Shu odamga tegishli barcha raqamlar (server birlashtirgan). */
  face_ids: number[];
  /** Yuz bazasidagi yozuv (bo'lmasa `null`). */
  person: { id: number; full_name: string; role: string; role_label: string } | null;
  name: string;
  known: boolean;
  /** Nechta kadrda ko'ringan. */
  count: number;
  first_seen: string;
  last_seen: string;
  /** Rasm shu hodisadan olinadi — RASMI BOR eng oxirgi kadr. */
  last_event_id: number;
  /** `false` — bu odamning birorta ham rasmi qolmagan (`<img>` chizmang). */
  has_picture: boolean;
  camera_count: number;
  cameras: NvrFaceCamera[];
}

export interface NvrFacePage {
  faces: NvrFaceRow[];
  /** Nechta HAR XIL odam ko'ringan. */
  total: number;
  /** Shundan yuz bazasida bor. */
  known: number;
  unknown: number;
  limit: number;
  offset: number;
}

export interface NvrFacesQuery {
  limit?: number;
  offset?: number;
  /** `last_seen` (default), `first_seen`, `count`. */
  sort?: "last_seen" | "first_seen" | "count";
  /** `yes` — faqat tanishlar, `no` — faqat notanishlar. */
  known?: "yes" | "no";
  search?: string;
  date_from?: string;
  date_to?: string;
}

export async function listFaces(q: NvrFacesQuery = {}): Promise<NvrFacePage> {
  const p = new URLSearchParams({ limit: String(Math.min(q.limit ?? 50, NVR_MAX_LIMIT)) });
  if (q.offset) p.set("offset", String(q.offset));
  if (q.sort) p.set("sort", q.sort);
  if (q.known) p.set("known", q.known);
  if (q.search) p.set("search", normalizeSearch(q.search));
  if (q.date_from) p.set("date_from", q.date_from);
  if (q.date_to) p.set("date_to", q.date_to);

  const res = await fetch(`${NVR_BASE}/faces?${p}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`kuzatuv posti faces: ${res.status}`);
  return res.json();
}

/* ══════════════════════════════════════════════════════════════════════
   ODAM SANASH — kirdi / chiqdi / ichkarida (`FRONTEND.md` 10-A bo'lim)
   ══════════════════════════════════════════════════════════════════════
   ⚠️ Bu HODISA EMAS, O'LCHOV: to'rtta detektor kategoriyasiga (yuqoridagi
   `NvrCategory`) kirmaydi, `all` ga tushmaydi va rasm o'rniga raqam beradi.
   Shuning uchun butunlay alohida manzillarda (`/counting/...`) va alohida
   funksiyalarda — mavjud `listEvents()`/`subscribeNvr()` bilan ARALASHMAYDI.

   Jonli yangilanish ATAYLAB SSE/WS emas, oddiy so'rov: hujjatning o'zi ham
   shuni tavsiya qiladi ("qurilma daqiqada bir yuboradi — 30 soniyada bir
   yangilash yetarli"), React Query esa buni `refetchInterval` bilan qiladi
   (`useCounting.ts`). */

export interface CountingTotals {
  enter: number;
  exit: number;
  pass: number;
  reports: number;
}

export interface CountingRangeTotals extends CountingTotals {
  /** `enter − exit`, manfiy bo'lmaydi. */
  inside: number;
}

export interface CountingChannelStat extends CountingTotals {
  channel_id: string;
  channel_name: string;
}

export interface CountingHourStat extends CountingTotals {
  /** `"00"`…`"23"`. */
  hour: string;
}

export interface CountingDayStat extends CountingTotals {
  /** `YYYY-MM-DD`. */
  day: string;
}

export interface CountingStats {
  /** Tanlangan oraliq (sana berilmasa — BUTUN TARIX) bo'yicha jami. */
  enter: number;
  exit: number;
  pass: number;
  /** ⚠️ Tanlangan oraliq bo'yicha — "hozir ichkarida" uchun `today.inside` ishlating. */
  inside: number;
  reports: number;
  /** Bugungi kun — "hozir ichkarida nechta odam bor" aynan shundan. */
  today: CountingRangeTotals;
  /** Butun tarix, sana filtridan qat'i nazar. */
  all_time: CountingRangeTotals;
  by_channel: CountingChannelStat[];
  by_hour: CountingHourStat[];
  by_day: CountingDayStat[];
  last_report: string | null;
  /** Oxirgi 5 daqiqada hisobot kelganmi. */
  live: boolean;
}

export interface CountingQuery {
  date_from?: string;
  date_to?: string;
  /** Kanal raqami. */
  camera?: string;
}

export async function getCountingStats(q: CountingQuery = {}): Promise<CountingStats> {
  const p = new URLSearchParams();
  if (q.date_from) p.set("date_from", q.date_from);
  if (q.date_to) p.set("date_to", q.date_to);
  if (q.camera) p.set("camera", q.camera);

  const res = await fetch(`${NVR_BASE}/counting/stats?${p}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`kuzatuv posti counting/stats: ${res.status}`);
  return res.json();
}

/** Daqiqalik hisobotlar ro'yxati — bitta oraliq (`period`) bitta yozuv. */
export interface CountingEvent {
  id: number;
  category: "counting";
  camera: string;
  channel: string;
  /** Hisobot kelgan payt (`period.to` bilan deyarli bir xil). */
  time: string;
  /** Tayyor matn — «Odamlar sanog'i: 3 kirdi, 1 chiqdi». */
  label: string;
  /** Shu ORALIQdagi son — jami emas. */
  counting: { enter: number; exit: number; pass: number };
  period: { from: string; to: string };
  /** `true` — bu oraliqda hech kim o'tmagan. */
  idle: boolean;
  /** Sanoq hodisasida DOIM `null` — rasm yo'q. */
  image_url: null;
  image_count: 0;
}

export interface CountingEventsPage {
  category: "counting";
  events: CountingEvent[];
  total: number;
  limit: number;
  offset: number;
}

export async function listCountingEvents(
  q: CountingQuery & { limit?: number; offset?: number } = {}
): Promise<CountingEventsPage> {
  const p = new URLSearchParams({ limit: String(Math.min(q.limit ?? 20, NVR_MAX_LIMIT)) });
  if (q.offset) p.set("offset", String(q.offset));
  if (q.camera) p.set("camera", q.camera);
  if (q.date_from) p.set("date_from", q.date_from);
  if (q.date_to) p.set("date_to", q.date_to);

  const res = await fetch(`${NVR_BASE}/counting/events?${p}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`kuzatuv posti counting/events: ${res.status}`);
  return res.json();
}

export interface CountingCamera {
  id: string;
  name: string;
  count: number;
  last: string;
}

/** Sanoq yoqilgan kameralar — ro'yxat HISOBOTLAR TARIXIDAN olinadi
 *  (qurilmada bu sozlamani o'qiydigan ishonchli manzil yo'q). */
export async function listCountingCameras(): Promise<CountingCamera[]> {
  const res = await fetch(`${NVR_BASE}/counting/cameras`, { cache: "no-store" });
  if (!res.ok) throw new Error(`kuzatuv posti counting/cameras: ${res.status}`);
  const j = (await res.json()) as { cameras?: CountingCamera[] };
  return j.cameras ?? [];
}
