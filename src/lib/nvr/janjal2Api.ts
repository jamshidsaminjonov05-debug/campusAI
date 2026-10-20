/**
 * Janjal aniqlash — 2-VERSIYA (lokal) klienti.
 *
 * Manzil DOIM same-origin `/janjal2/...` (`app/janjal2/[...path]/route.ts`):
 * u login/parolni SERVER tomonda saqlaydi va tokenni o'zi yangilab turadi —
 * brauzer bu haqda hech narsa bilmaydi, faqat panel sessiyasi (cookie) orqali
 * kiradi. Server manzili/login: `config/services.mjs` → `janjal2` yozuvi
 * (`.env.local`da `JANJAL2_ORIGIN`/`JANJAL2_USERNAME`/`JANJAL2_PASSWORD`).
 *
 * ⚠️ Bu — `weapon2Api.ts` (qurol) bilan AYNI shakldagi, lekin BUTUNLAY BOSHQA
 * server: "Jangni Aniqlash Tizimi API" (`/openapi.json`da tekshirilgan,
 * 2026-09-17). Javob shakli (`AlertModel`, `{data, total}`, `page`/`page_size`)
 * qurol API'siniki bilan bir xil, faqat hodisa turi — JANJAL.
 */
import { JANJAL2_BASE } from "@/config/endpoints";
import { ApiError } from "@/lib/api";
import { nvrDateTime, nvrTime, type NvrEvent } from "@/lib/nvr/nvrApi";

/** Serverdan kelgan xom yozuv (`AlertModel`, `/openapi.json`da tekshirilgan). */
export interface Janjal2Alert {
  id: number;
  camera_id: number;
  /** Origin ILDIZIGA nisbatan yo'l, masalan `alert_images/camera_.../x.jpg`. */
  image_path: string;
  video_path: string;
  is_read: boolean;
  /** 0..1 */
  confidence: number;
  /** Vaqt zonasiz mahalliy ISO (`2026-09-17T06:20:07.565286`). */
  detected_at: string;
}

export interface Janjal2Camera {
  id: number;
  name: string;
  location: string;
  enabled: boolean;
  /** Server o'zi hisoblab beradi — kamera bo'yicha jamlanma (qo'shimcha so'rovsiz). */
  accepted: number;
  ignored: number;
}

/**
 * ⚠️ **`ApiError` bilan tashlanadi, oddiy `Error` bilan EMAS** (2026-09-18,
 * foydalanuvchi xabar qildi: "nimaga janjalga yana proxy bilan so'rov
 * jo'natyabsan"). Sabab: markaziy `queryClient.ts` `retry`si `error
 * instanceof ApiError && status 4xx` bo'lsa QAYTA SO'RAMAYDI — oddiy
 * `Error` esa bu tekshiruvdan o'tmaydi (`instanceof ApiError` doim
 * `false`), ya'ni React Query HAR safar (401/422 kabi DOIM bir xil
 * natija beradigan xatoda ham) 2 marta QAYTA urinardi — "yana-yana
 * so'rov" aynan shu edi. `status` bo'lgach, faqat haqiqiy tarmoq/5xx
 * xatosida (proxy `502` — upstream'ga ulanib bo'lmadi) qayta uriniladi.
 */
async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${JANJAL2_BASE}/${path}`, { cache: "no-store" });
  if (!res.ok) throw new ApiError(res.status, `2-versiya (janjal) ${path}: ${res.status}`);
  return res.json();
}

/**
 * Sahifalangan hodisalar ro'yxati — yangidan eskiga (server tartibi).
 *
 * ⚠️ Server parametri **`page_size`**, `size` EMAS (`/openapi.json`da
 * tekshirilgan, `weapon2Api.ts` bilan AYNI tuzoq).
 */
export async function listJanjal2Alerts(page = 1, pageSize = 24): Promise<{ data: Janjal2Alert[]; total: number }> {
  return get(`api/alert/alert-list/?page=${page}&page_size=${pageSize}`);
}

/** Kameralar — `camera_id` ni odam o'qiydigan nom/joylashuvga aylantirish uchun. */
export async function listJanjal2Cameras(): Promise<Janjal2Camera[]> {
  return get(`api/cams/camera/list/`);
}

/** Rasm — to'g'ridan-to'g'ri `<img src>` ga qo'yiladi (statik, oqim bilan). */
export function janjal2ImageUrl(imagePath: string): string {
  return `${JANJAL2_BASE}/${imagePath}`;
}

/** Video — to'g'ridan-to'g'ri `<video src>` ga qo'yiladi (`Range` qo'llab-quvvatlanadi). */
export function janjal2VideoUrl(videoPath: string): string {
  return `${JANJAL2_BASE}/${videoPath}`;
}

/** Vaqt/sana — kuzatuv posti bilan BIR XIL formatlagich (numeric, lokaldan mustaqil). */
export { nvrDateTime as janjal2DateTime, nvrTime as janjal2Time };

/**
 * `Janjal2Alert` → `NvrEvent` moslashtirgichi — `weapon2ToNvrEvent()` bilan
 * AYNI naqsh (`weapon2Api.ts`dagi izohga qarang): shunda `DetectionCard`/
 * `DetectionModal`/`EventDossier` kabi MAVJUD komponentlar buni to'g'ridan-
 * to'g'ri chizadi, qayta yozilmaydi.
 *
 * ⚠️ 2-versiyada YO'Q maydonlar (yuz, sinf, nishon ramkasi) — shunchaki
 * bo'sh/`null` ("kelmasa 0 qoyib ketaverasan").
 */
export function janjal2ToNvrEvent(a: Janjal2Alert, cameraLabel: string): NvrEvent {
  return {
    id: a.id,
    category: "janjal",
    category_label: "Janjal",
    label: "Janjal",
    time: a.detected_at,
    camera: cameraLabel,
    channel: String(a.camera_id),
    confidence: Math.round(a.confidence * 100),
    image_url: janjal2ImageUrl(a.image_path),
    image_count: 1,
    image: null,
    picture_lost: false,
    name: null,
    recognized: false,
    face_library: null,
    attributes: null,
    face_id: null,
    targets: "Janjal",
    boxes: [],
    // Janjal — ATAYLAB doim trevoga (`isDangerEvent()`/`detectionLevel()` shundan o'qiydi).
    alert: true,
    video_url: janjal2VideoUrl(a.video_path),
    // Video statik fayl — kuzatuv postidagidek "aylantirilmoqda" kutish bosqichi yo'q.
    video_ready: true,
    person: null,
    verdict: "",
  };
}
