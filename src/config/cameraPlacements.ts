/**
 * Kameralarning XARITADAGI JOYI — kuzatuv posti kanal raqami → koordinata.
 *
 * NEGA kerak: aniqlash API'si (`FRONTEND.md`) na hodisada, na kanalda
 * koordinata bermaydi — faqat kanal nomi bor. Shuning uchun Hodisalar HUD'i
 * kameralarni kampus BINOLARIGA taqsimlab ko'rsatadi (`buildingAnchors()`),
 * ya'ni joy TAXMINIY.
 *
 * Shu jadvalga yozilgan kanal esa xaritada AYNAN o'sha nuqtada turadi.
 * Jadvalda yo'q kanallar avvalgidek taqsimlanadi — ya'ni ro'yxatni
 * bosqichma-bosqich to'ldirsa bo'ladi, hech narsa buzilmaydi.
 *
 * ── QANDAY TO'LDIRILADI ────────────────────────────────────────────────
 * Hodisalar bo'limidagi **📍 joylashtirish rejimi** orqali: kanal tanlanadi,
 * xaritaga bosiladi, marker sudrab aniqlashtiriladi. So'ng paneldagi
 * "Kodga ko'chirish" tugmasi shu fayl uchun tayyor matn beradi.
 *
 * Qo'lda kiritish ham mumkin — masalan obyekt rejasidan olingan aniq
 * koordinata bo'lsa.
 *
 * DIQQAT: kalit — kanal RAQAMI matn ko'rinishida (`"12"`), chunki kuzatuv posti
 * hodisada `channel` ni matn qilib qaytaradi.
 */

import { overrideFor } from "@/lib/cameraPlacementStore";
import { parseCameraName, placeLabel } from "@/lib/cameraNaming";

export interface CameraPlacement {
  lat: number;
  lng: number;
  /** Qaysi muassasa (`institutions.ts` `id`) — ixtiyoriy, tekshiruv uchun. */
  campusId?: string;
  /** Odam o'qiydigan izoh: "A-blok, sharqiy kirish". */
  note?: string;
  /**
   * Kamera QAYSI TOMONGA qaragan — gradusda, **shimoldan soat
   * strelkasi bo'yicha** (0 = shimol, 90 = sharq).
   *
   * ⚠️ **BU MA'LUMOT HOZIRCHA HECH QAYERDAN KELMAYDI.** kuzatuv posti ham,
   * backend ham kanal yo'nalishini bermaydi (o'lchandi: `/channels`
   * javobida bunday maydon yo'q). Jadvalda to'ldirilmagan kanal uchun
   * yo'nalish GEOMETRIYADAN taxmin qilinadi — kamera kampus
   * markaziga qaragan deb hisoblanadi (`cameraHeading()`), va UI buni
   * OCHIQ belgilaydi ("taxminiy").
   *
   * Aniq burchak ma'lum bo'lsa shu yerga yoziladi — hech narsa
   * o'zgartirmasdan, jadvalga bitta son qo'shiladi.
   */
  heading?: number;
}

/**
 * Kanal → joy.
 *
 * 179-maktabning 26 ta kanali joylashtirish rejimi orqali xaritada QO'LDA
 * belgilangan (2026-09-02). Qolgan 6 tasi (4, 5, 8, 11, 13, 16) hali
 * jadvalda yo'q — ular avvalgidek binolarga taqsimlanadi.
 */
export const CAMERA_PLACEMENTS: Record<string, CameraPlacement> = {
  "1": { lat: 41.295234934963986, lng: 69.20862385028363, campusId: "edu-mk-179" },
  "2": { lat: 41.29534834121631, lng: 69.20835156871954, campusId: "edu-mk-179" },
  "3": { lat: 41.29556789159594, lng: 69.20719688845222, campusId: "edu-mk-179" },
  "6": { lat: 41.295566119979895, lng: 69.20728285822037, campusId: "edu-mk-179" },
  "7": { lat: 41.2953368866948, lng: 69.2077585121144, campusId: "edu-mk-179" },
  "9": { lat: 41.29564783967669, lng: 69.20727728218836, campusId: "edu-mk-179" },
  "10": { lat: 41.29526496679631, lng: 69.2077041267624, campusId: "edu-mk-179" },
  "12": { lat: 41.29578234403698, lng: 69.20721086102535, campusId: "edu-mk-179" },
  "14": { lat: 41.296004749647096, lng: 69.20829310617717, campusId: "edu-mk-179" },
  "15": { lat: 41.295305126757995, lng: 69.20718489865041, campusId: "edu-mk-179" },
  "17": { lat: 41.29541806542025, lng: 69.20718918693916, campusId: "edu-mk-179" },
  "18": { lat: 41.29560354818145, lng: 69.20772467678256, campusId: "edu-mk-179" },
  "19": { lat: 41.29557597710138, lng: 69.20742303316521, campusId: "edu-mk-179" },
  "20": { lat: 41.295577475393884, lng: 69.20879898333877, campusId: "edu-mk-179" },
  "21": { lat: 41.295764818528085, lng: 69.2074230332095, campusId: "edu-mk-179" },
  "22": { lat: 41.29523274371064, lng: 69.20742247386667, campusId: "edu-mk-179" },
  "23": { lat: 41.29521861827055, lng: 69.20767877718708, campusId: "edu-mk-179" },
  "24": { lat: 41.29598781018939, lng: 69.20723189594116, campusId: "edu-mk-179" },
  "25": { lat: 41.29519628485451, lng: 69.20812267943964, campusId: "edu-mk-179" },
  "26": { lat: 41.295998794142264, lng: 69.20881825839649, campusId: "edu-mk-179" },
  "27": { lat: 41.29599407022607, lng: 69.20766142826042, campusId: "edu-mk-179" },
  "28": { lat: 41.29526328507964, lng: 69.20836841104384, campusId: "edu-mk-179" },
  "29": { lat: 41.29564890189323, lng: 69.20720212908975, campusId: "edu-mk-179" },
  "30": { lat: 41.29526843809228, lng: 69.2072029631567, campusId: "edu-mk-179" },
  /* 31 — KIRISH POSTI. `public/geojson/campus/mk-179.json` dagi
     "Kirish posti" binosi AYNI shu nuqtaga markazlangan. */
  "31": { lat: 41.295264008089816, lng: 69.2086363381, campusId: "edu-mk-179", note: "Kirish posti" },
  "32": { lat: 41.295268229358015, lng: 69.20859560412754, campusId: "edu-mk-179", note: "Kirish posti yonida" },
};

/**
 * Kanal uchun aniq joy (yo'q bo'lsa `null` — chaqiruvchi taqsimlashga tushadi).
 *
 * ⚠️ AVVAL ish vaqtidagi qatlamga qaraladi (`lib/cameraPlacementStore.ts` —
 * operator xaritada qo'lda qo'ygan joylar), keyin quyidagi jadvalga.
 * Qatlamda `null` tursa — operator kamerani ATAYLAB olib tashlagan, shuning
 * uchun koddagi qiymat ham qo'llanilmaydi.
 */
export function placementFor(channel: string | number): CameraPlacement | null {
  const manual = overrideFor(channel);
  if (manual !== undefined) return manual;
  return CAMERA_PLACEMENTS[String(channel)] ?? null;
}

/** Koddagi jadvalda bormi — o'chirishda `null` yozish kerakligini bildiradi. */
export const hasStaticPlacement = (channel: string | number): boolean =>
  CAMERA_PLACEMENTS[String(channel)] !== undefined;

/** Nechta kanal joylashtirilgan — diagnostika/hisobot uchun. */
export const PLACED_COUNT = Object.keys(CAMERA_PLACEMENTS).length;

/**
 * Kanalning ODAM O'QIYDIGAN joyi.
 *
 * ⚠️ NEGA KERAK: kuzatuv posti o'ttizdan ortiq kanalni bir xil **"Camera 01"** deb
 * ataydi (o'lchandi) — ro'yxatlarda "Camera 01" ustma-ust chiqib, qaysi
 * kirishdan o'tilgani bilinmasdi. Kanal haqida BOR ma'lumot esa shu
 * yerda: joylashtirish jadvalidagi `note` ("Kirish posti"). Nom mazmunli
 * bo'lsa (`1-etaj 1-LIFT`) undan qavat/joy turi ajratiladi
 * (`lib/cameraNaming.ts`).
 *
 * Hech narsa topilmasa kanal RAQAMI qaytadi — takrorlanadigan "Camera 01"
 * dan foydaliroq.
 */
export function cameraPlaceLabel(channel: string | number, cameraName?: string | null): string {
  /* ⚠️ Ish vaqtidagi qatlamda (operator xaritada qo'lda surgan joy)
     `note` BO'LMAYDI — u faqat koordinata yozadi. Shuning uchun izoh
     KODDAGI jadvaldan ham qidiriladi, aks holda "Kirish posti" o'rniga
     quruq "31-kanal" chiqib qolardi. */
  const note = placementFor(channel)?.note ?? CAMERA_PLACEMENTS[String(channel)]?.note;
  if (note) return note;

  const name = (cameraName ?? "").trim();
  if (name && !/^camera\s*\d+$/i.test(name)) {
    const p = parseCameraName(name);
    const parts = [
      p.floor != null ? `${p.floor}-qavat` : null,
      p.kind !== "room" ? placeLabel(p.kind) : null,
      p.block ? `${p.block}-blok` : null,
    ].filter(Boolean);
    if (parts.length > 0) return parts.join(" · ");
    return name;
  }
  return `${channel}-kanal`;
}

/**
 * Kamera yo'nalishi — gradusda (0 = shimol, soat strelkasi bo'yicha).
 *
 * ⚠️ **Jadvalda `heading` bo'lmasa TAXMIN qilinadi**: kamera kuzatuv
 * obyektining MARKAZIGA qaragan deb hisoblanadi. Perimetr kameralari
 * uchun bu odatda to'g'ri, lekin bu O'LCHANGAN qiymat EMAS — chaqiruvchi
 * `approx` bayrog'ini oladi va UI uni ochiq ko'rsatadi.
 *
 * Manba paydo bo'lsa (kuzatuv posti yoki backend kanal yo'nalishini bersa) faqat
 * shu funksiya o'zgaradi.
 */
export function cameraHeading(
  channel: string | number | null | undefined,
  center: { lat: number; lng: number } | null
): { deg: number; approx: boolean } | null {
  if (channel == null) return null;
  const at = placementFor(channel);
  if (!at) return null;
  if (typeof at.heading === "number") return { deg: at.heading, approx: false };
  if (!center) return null;
  /* Kameradan markazga vektor → shimoldan soat strelkasi bo'yicha burchak.
     `lng` farqi kenglikka qarab qisqaradi (`cos`), aks holda burchak
     Toshkent kengligida ~25% xato bo'lardi. */
  const k = Math.cos((at.lat * Math.PI) / 180);
  const dx = (center.lng - at.lng) * k;
  const dy = center.lat - at.lat;
  if (dx === 0 && dy === 0) return null;
  const deg = (Math.atan2(dx, dy) * 180) / Math.PI;
  return { deg: (deg + 360) % 360, approx: true };
}
