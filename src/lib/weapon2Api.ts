/**
 * Qurol/janjal aniqlash — 2-VERSIYA (lokal) klienti.
 *
 * Manzil DOIM same-origin `/weapon2/...` (`app/weapon2/[...path]/route.ts`):
 * u login/parolni SERVER tomonda saqlaydi va tokenni o'zi yangilab turadi —
 * brauzer bu haqda hech narsa bilmaydi, faqat panel sessiyasi (cookie) orqali
 * kiradi. Server manzili/login: `config/services.mjs` → `weapon2` yozuvi
 * (`.env.local`da `WEAPON2_ORIGIN`/`WEAPON2_USERNAME`/`WEAPON2_PASSWORD`).
 *
 * ⚠️ Bu — kuzatuv postidan (`nvrApi.ts`) BUTUNLAY BOSHQA server: o'zimizning lokal
 * o'qitilgan modelimiz. Hozircha (2026-09-09 da tekshirildi, `/openapi.json`
 * va jonli javob) faqat **qurol** signalini beradi — hodisa yozuvida
 * tur/kategoriya maydoni YO'Q, sarlavhaning o'zi ham "Qurol Aniqlash
 * Tizimi". "Janjal" turi kelajakda qo'shilsa (server javobiga tur maydoni
 * kelsa), shu faylga bitta moslashtirish yetarli — frontendning qolgan
 * qismi (kartochka, filtr) o'zgarmaydi.
 */
import { WEAPON2_BASE } from "@/config/endpoints";
import { nvrDateTime, nvrTime, type NvrEvent } from "@/lib/nvrApi";

/** Serverdan kelgan xom yozuv (`AlertModel`, `/openapi.json`da tekshirilgan). */
export interface Weapon2Alert {
  id: number;
  camera_id: number;
  /** Origin ILDIZIGA nisbatan yo'l, masalan `alert_images/camera_.../x.jpg`. */
  image_path: string;
  video_path: string;
  is_read: boolean;
  /** 0..1 */
  confidence: number;
  /** Vaqt zonasiz mahalliy ISO (`2026-09-09T10:51:08.121015`). */
  detected_at: string;
}

export interface Weapon2Camera {
  id: number;
  name: string;
  location: string;
  enabled: boolean;
  /** Server o'zi hisoblab beradi — kamera bo'yicha jamlanma (qo'shimcha so'rovsiz). */
  accepted: number;
  ignored: number;
}

/** `GET /api/alert/alerts-total/` — butun tarix bo'yicha jamlanma. */
export interface Weapon2Totals {
  total_accepted: number;
  total_ignored: number;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${WEAPON2_BASE}/${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`2-versiya ${path}: ${res.status}`);
  return res.json();
}

/**
 * Sahifalangan hodisalar ro'yxati — yangidan eskiga (server tartibi).
 *
 * ⚠️ Server parametri **`page_size`**, `size` EMAS (`/openapi.json`da
 * tekshirilgan) — noto'g'ri nom bilan so'ralsa server uni jim
 * e'tiborsiz qoldirib standart `20` ga tushardi.
 */
export async function listWeapon2Alerts(page = 1, pageSize = 24): Promise<{ data: Weapon2Alert[]; total: number }> {
  return get(`api/alert/alert-list/?page=${page}&page_size=${pageSize}`);
}

/** Kameralar — `camera_id` ni odam o'qiydigan nom/joylashuvga aylantirish uchun.
 *  Har birida `accepted`/`ignored` ALLAQACHON hisoblangan — kamera kesimi
 *  uchun qo'shimcha so'rov kerak emas ("Statistika" oynasi shundan o'qiydi). */
export async function listWeapon2Cameras(): Promise<Weapon2Camera[]> {
  return get(`api/cams/camera/list/`);
}

/** Butun tarix bo'yicha qabul qilingan/e'tiborsiz qoldirilgan jami. */
export async function getWeapon2Totals(): Promise<Weapon2Totals> {
  return get(`api/alert/alerts-total/`);
}

/**
 * Oxirgi `days` kunlik jami soni (`GET /api/alert/alert-statistics/`).
 *
 * ⚠️ `page_size=1` ATAYLAB — bu yerda faqat `.total` kerak, ro'yxatning
 * o'zi emas (bitta qatorli so'rov eng arzoni).
 */
export async function getWeapon2RecentCount(days: number): Promise<number> {
  const res = await get<{ total: number }>(`api/alert/alert-statistics/?days=${days}&page=1&page_size=1`);
  return res.total;
}

/** Rasm — to'g'ridan-to'g'ri `<img src>` ga qo'yiladi (statik, oqim bilan). */
export function weapon2ImageUrl(imagePath: string): string {
  return `${WEAPON2_BASE}/${imagePath}`;
}

/** Video — to'g'ridan-to'g'ri `<video src>` ga qo'yiladi (`Range` qo'llab-quvvatlanadi). */
export function weapon2VideoUrl(videoPath: string): string {
  return `${WEAPON2_BASE}/${videoPath}`;
}

/** Vaqt/sana — kuzatuv posti bilan BIR XIL formatlagich (numeric, lokaldan mustaqil). */
export { nvrDateTime as weapon2DateTime, nvrTime as weapon2Time };

/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  2-VERSIYA → NvrEvent MOSLASHTIRGICHI                                 ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * 2026-09-09, foydalanuvchi so'rovi (aniqlashtirish): "IKKI XIL SAHIFA
 * YARATISHING SHART EMAS ... 2-versiya bosilganda TO'LIQ Aniqlanganlar
 * sahifasi ikkinchi versiya uchun bo'ladi ... kelmasa 0 qoyib
 * ketaverasan". Ya'ni alohida `WeaponV2Panel` UI qurish O'RNIGA — bitta
 * "Aniqlanganlar" sahifasi (kartochkalar, dossiye, KPI) 2-versiya
 * yoqilganda MANBASINI shu tomonga o'zgartiradi.
 *
 * Bu funksiya bitta `Weapon2Alert`ni `NvrEvent` shakliga o'giradi —
 * shunda `DetectionCard`/`DetectionModal`/`EventDossier` kabi MAVJUD
 * (o'zgartirilmagan) komponentlar uni to'g'ridan-to'g'ri chizadi.
 *
 * ⚠️ **NEGA ISHLAYDI — `image_url`/`video_url` ALLAQACHON to'liq proxy
 * yo'li.** `nvrImageUrl()`/`nvrEventVideoUrl()` (`nvrApi.ts`) hodisaning
 * `image_url`/`video_url` maydonini ALLAQACHON ustuvor o'qiydi (faqat
 * bo'lmasa `id`dan kuzatuv posti yo'lini quradi) — `toProxyPath()` esa endi
 * `/api/v1` bilan boshlanmagan (demak — allaqachon tayyor) yo'lni
 * O'ZGARTIRMASDAN qaytaradi (`nvrApi.ts`dagi izohga qarang). Ya'ni
 * `weapon2ImageUrl()`/`weapon2VideoUrl()` (`/weapon2/...`) shu yerga
 * qo'yilsa, mavjud rasm/video komponentlari QAYTA YOZILMASDAN ishlaydi.
 *
 * ⚠️ **BOSHQA MAYDONLAR — SHUNCHAKI "0"/BO'SH** (foydalanuvchi so'rovi:
 * "kelmasa 0 qoyib ketaverasan"). Yuz/sinf/nishon ramkasi kabi 2-versiya
 * BERMAYDIGAN narsa — `null`/`[]`/`false`, o'ylab topilmaydi.
 */
export function weapon2ToNvrEvent(a: Weapon2Alert, cameraLabel: string): NvrEvent {
  return {
    id: a.id,
    category: "gun",
    category_label: "Qurol",
    label: "Qurol",
    time: a.detected_at,
    camera: cameraLabel,
    channel: String(a.camera_id),
    confidence: Math.round(a.confidence * 100),
    image_url: weapon2ImageUrl(a.image_path),
    image_count: 1,
    image: null,
    picture_lost: false,
    name: null,
    recognized: false,
    face_library: null,
    attributes: null,
    face_id: null,
    targets: "Qurol",
    boxes: [],
    // Qurol — ATAYLAB doim trevoga (`isAlarm()`/`detectionLevel()` shundan o'qiydi).
    alert: true,
    video_url: weapon2VideoUrl(a.video_path),
    // Video statik fayl — kuzatuv postidagidek "aylantirilmoqda" kutish bosqichi yo'q.
    video_ready: true,
    person: null,
    verdict: "",
  };
}
