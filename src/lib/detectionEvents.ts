/**
 * Hodisalar uchun YAGONA MANBA.
 *
 * Nega kerak: HUD footer'idagi rozetka raqami, o'ng paneldagi ro'yxat va eski
 * Hodisalar bo'limidagi detal — uchalasi bir xil hodisalarni ko'rsatishi shart.
 * Ilgari rozetka raqamlari qo'lda yozilgan edi va hech qanday yozuvga
 * bog'lanmagandi ("6" yozilardi, lekin 6 ta hodisa yo'q edi).
 *
 * Backend hodisa bersa — o'sha ishlatiladi (`fromBackend`). Bo'sh bo'lsa
 * quyidagi DEMO to'plam ishlaydi: u modul yuklanganda BIR MARTA quriladi va
 * `EventsPage` ham shu ro'yxatni zaxira sifatida oladi — shuning uchun HUD'dan
 * bosilgan hodisaning id'si eski bo'limda ham topiladi.
 */
import type { AlarmEventOut } from "@/lib/api";
import { isPhoneEvent, type NvrEvent } from "@/lib/nvrApi";
import { resolveCampus } from "@/lib/cameraBinding";
import type { AlertEvent, AlertSeverity } from "@/lib/alertTypes";
import { CAMPUS_POINTS } from "@/config/campusPoints";
import { detectionIdByCode, type DetectionId } from "@/lib/detectionTypes";

export interface DetectionEvent {
  id: string;
  type: DetectionId;
  /** O'zbekcha nom — eski bo'limdagi `AlertEvent.title` bilan bir xil. */
  title: string;
  severity: AlertSeverity;
  campusId: string;
  campus: string;
  mahalla: string;
  camera: string;
  /**
   * kuzatuv posti kanal raqami — hodisa QAYSI kamerada sodir bo'lgani.
   *
   * ⚠️ Faqat kuzatuv postidan kelgan yozuvlarda bo'ladi. Xaritadagi trevoga nuqtasi
   * shu kanalning ANIQ joyiga qo'yiladi (`config/cameraPlacements.ts`) —
   * taxminiy taqsimlash o'rniga. Demo va backend yozuvlarida `undefined`.
   */
  channel?: string;
  /** HH:MM:SS */
  time: string;
  ts: number;
  lat: number;
  lng: number;
  /** Faqat begona shaxs uchun — takrorni shu bo'yicha aniqlaymiz. */
  personKey?: string;
  /** Avval ham aniqlangan (tarixda bor). */
  repeat?: boolean;
  participants?: number;
  /**
   * AI ishonch darajasi, foizda.
   *
   * Backend `/events` bu maydonni BERMAYDI (u yerda hodisa ko'pincha operator
   * qo'lida kiritiladi) — shuning uchun ixtiyoriy va real yozuvlarda `undefined`
   * bo'ladi, UI esa uni ko'rsatmaydi. Qiymat faqat DEMO oqimida bo'ladi.
   * Haqiqiy ishonch kuzatuv postida bor (`lib/nvrApi.ts` → `confidence`).
   */
  confidence?: number;
}

/** Detektor → hodisa sarlavhasi. Backend kodi bor turlar `eventLabels` bilan mos. */
export const DETECTION_TITLES: Record<DetectionId, string> = {
  fight: "Janjal aniqlandi",
  smoking: "Chekish aniqlandi",
  unknown_person: "Notanish shaxs",
  phone: "Telefonda gaplashish",
  weapon: "Qurol aniqlandi",
};

/**
 * Hodisa sahnasi — asosiy ko'rinish hodisa turiga qarab almashadi.
 *
 * Faqat janjalning haqiqiy videosi bor (`public/video/fight.mp4`), qolganlari
 * uchun stop-kadr rasmi ishlatiladi (`public/imges/`). Backend hodisa videosini
 * bera boshlasa — shu joyga `type:"video"` qo'yiladi, boshqa yerni o'zgartirish
 * kerak emas.
 *
 * Kalit — hodisa SARLAVHASI (`DETECTION_TITLES` va `EVENT_TYPE_LABELS` bir xil
 * matn beradi, shuning uchun real va demo yozuvlar birdek ishlaydi).
 */
export interface EventMedia {
  kind: "video" | "image";
  src: string;
  poster?: string;
}

const FALLBACK_MEDIA: EventMedia = { kind: "image", src: "/imges/incident-scene.webp" };

const EVENT_MEDIA: Record<string, EventMedia> = {
  "Janjal aniqlandi": { kind: "video", src: "/video/fight.mp4", poster: "/video/fight-poster.jpg" },
  Janjal: { kind: "video", src: "/video/fight.mp4", poster: "/video/fight-poster.jpg" },
  "Chekish aniqlandi": { kind: "image", src: "/imges/chekish.webp" },
  "Notanish shaxs": { kind: "image", src: "/imges/notanish.webp" },
  "Ruxsatsiz kirish": { kind: "image", src: "/imges/notanish.webp" },
  "Telefonda gaplashish": { kind: "image", src: "/imges/telefon.webp" },
  "Qurol aniqlandi": { kind: "image", src: "/imges/qurol.webp" },
};

/** Sarlavha bo'yicha sahna medisi; noma'lum tur — umumiy stop-kadr. */
export function mediaForTitle(title: string): EventMedia {
  return EVENT_MEDIA[title] ?? FALLBACK_MEDIA;
}

/** Ro'yxatdagi kichik nishoncha uchun rasm (videoda — poster). */
export function thumbFor(title: string): string {
  const m = mediaForTitle(title);
  return m.kind === "video" ? m.poster ?? m.src : m.src;
}

const SEVERITY_BY_TYPE: Record<DetectionId, AlertSeverity> = {
  weapon: "critical",
  fight: "critical",
  unknown_person: "high",
  smoking: "medium",
  phone: "low",
};

const pad = (n: number) => String(n).padStart(2, "0");
const hhmmss = (ts: number) => {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

/* ⚠️ **DEMO TO'PLAMI OLIB TASHLANDI** (2026-09-05): `buildDemoEvents()`
   modul yuklanganda 28 ta to'qilgan hodisa yasardi (`lcg` barqaror
   generatori bilan) va `DEMO_DETECTION_EVENTS` / `DEMO_ALERT_EVENTS`
   nomi ostida butun ilovaga tarqalardi. Oqim bo'sh bo'lsa endi BO'SH
   qoladi — panellar sababini o'zi yozadi. */

export function fromBackend(ev: AlarmEventOut): DetectionEvent | null {
  const type = detectionIdByCode(ev.event_type);
  if (!type) return null; // hali qo'llanmaydigan kod — oqimga qo'shmaymiz
  const key = ev.camera_id ?? ev.id;
  let sum = 0;
  for (let i = 0; i < key.length; i++) sum = (sum + key.charCodeAt(i)) % 9973;
  const campus = CAMPUS_POINTS[sum % CAMPUS_POINTS.length];
  const ts = new Date(ev.detected_at).getTime();
  return {
    id: ev.id,
    type,
    title: DETECTION_TITLES[type],
    severity: (ev.severity as AlertSeverity) ?? "medium",
    campusId: campus.id,
    campus: campus.name,
    mahalla: campus.mahalla,
    camera: ev.camera_id ?? "—",
    time: hhmmss(ts),
    ts,
    lat: campus.lat,
    lng: campus.lng,
    personKey: type === "unknown_person" ? ev.description?.trim() || ev.id : undefined,
    participants: ev.participants_count ?? undefined,
  };
}

/* ══════════════════════════════════════════════════════════════════════
   kuzatuv posti HODISASI → DetectionEvent  (ASOSIY, HAQIQIY manba)
   ══════════════════════════════════════════════════════════════════════
   Hodisalar HUD'i ilgari bizning `/events` backendimizdan (yoki demodan)
   o'qirdi. Haqiqiy aniqlanishlar esa kuzatuv postidan keladi — "Aniqlanganlar"
   bo'limi ko'rsatadigan AYNI oqim. Endi HUD ham shundan oziqlanadi, ya'ni
   ikkala bo'lim bir xil hodisani, bir xil vaqtda ko'rsatadi. */

/** kuzatuv posti kategoriyasi → UI detektori (mos turi bo'lmasa `null`). */
export function typeFromNvr(ev: NvrEvent): DetectionId | null {
  switch (ev.category) {
    case "gun":
      return "weapon";
    case "janjal":
      return "fight";
    /* Serverda BITTA kategoriya: "Telefonda gaplashish va chekish".
       Ajratish klient tomonda (`isPhoneEvent`, `lib/nvrApi.ts`). */
    case "smoking":
      return isPhoneEvent(ev) ? "phone" : "smoking";
    /* Tanilgan yuz TREVOGA emas — u kundalik o'tish. HUD faqat BEGONA
       shaxsni ogohlantirish sifatida ko'rsatadi. */
    case "face":
      return ev.recognized ? null : "unknown_person";
    default:
      return null;
  }
}

/**
 * kuzatuv posti hodisasi → HUD yozuvi.
 *
 * Kampus `resolveCampus()` orqali aniqlanadi; u topa olmasa
 * `NVR_DEFAULT_CAMPUS_ID` (= 179-maktab) qaytadi, ya'ni butun kuzatuv posti oqimi
 * o'sha muassasaga tegishli bo'ladi — hozir kuzatuvda faqat o'sha bor.
 */
export function fromNvr(ev: NvrEvent): DetectionEvent | null {
  const type = typeFromNvr(ev);
  if (!type) return null;
  const campus = resolveCampus(ev.camera, ev.channel);
  if (!campus) return null;
  const ts = new Date(ev.time).getTime();
  /* ⚠️ JIDDIYLIK — kuzatuv posti bayrog'iga qarab.
     Jadvalda `unknown_person` = "high", lekin yuz bazasi deyarli bo'sh
     bo'lgani uchun HAR O'TGAN ODAM "notanish" bo'ladi (o'lchandi: 1082
     qayddan 1080 tasi). Natijada Statistikada "Xavfli: 97 — jami oqimning
     100%" chiqardi, ya'ni ko'rsatkich hech qanday ma'no bermasdi.
     Endi: server `alert` bayrog'ini qo'ysa — trevoga; notanish yuzning
     o'zi esa "o'rta". Qurol/janjal avvalgidek jadvaldan. */
  const severity: AlertSeverity = ev.alert
    ? "critical"
    : type === "unknown_person"
      ? "medium"
      : SEVERITY_BY_TYPE[type];
  return {
    id: `nvr-${ev.id}`,
    type,
    title: DETECTION_TITLES[type],
    severity,
    campusId: campus.id,
    campus: campus.name,
    mahalla: campus.mahalla,
    camera: ev.camera,
    channel: ev.channel,
    time: hhmmss(ts),
    ts,
    lat: campus.lat,
    lng: campus.lng,
    /* Takroriy tashrifni `face_id` bo'yicha aniqlaymiz: bir xil yuz DOIM
       bir xil raqamni oladi (`FRONTEND.md` 5-B), odam bazada bo'lmasa ham. */
    personKey: type === "unknown_person" ? (ev.face_id != null ? `face-${ev.face_id}` : String(ev.id)) : undefined,
    confidence: ev.confidence ?? undefined,
  };
}

/** Eski Hodisalar bo'limi (`EventsPage`) kutadigan ko'rinish. */
export function toAlertEvent(e: DetectionEvent): AlertEvent {
  return {
    id: e.id,
    title: e.title,
    severity: e.severity,
    time: e.time,
    institute: e.campus,
    camera: e.camera,
    participants: e.participants,
  };
}
