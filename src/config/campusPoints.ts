/**
 * Xaritadagi KUZATUVDAGI KAMPUSLAR — Hodisalar HUD'i shu ro'yxatni chizadi.
 *
 * Ro'yxat `src/config/institutions.ts` dan OLINADI, ya'ni yagona manba
 * bitta: header'dagi select, Geo Analitika hududlari, 3D kampus va HUD
 * markerlari — hammasi bir xil 7 ta muassasa. Ilgari bu yerda alohida
 * namuna ro'yxat (10 ta "cp-0X") turardi va u boshqa hech qayerdagi
 * ma'lumot bilan bog'lanmasdi.
 *
 * Kampus chegarasi (hudud poligoni) bu faylda EMAS — u
 * `public/geojson/campus/<campus>.json` da, `src/lib/campusAreas.ts` o'qiydi.
 */
import { INSTITUTIONS } from "./institutions";

export interface CampusPoint {
  /** Muassasa id'si (`edu-…`) — hodisa oqimi ham shu id bilan bog'lanadi. */
  id: string;
  /** Xarita yorlig'ida katta harflar bilan chiqadigan nom (qisqa nom). */
  name: string;
  /** Yorliqning ikkinchi qatori. */
  mahalla: string;
  /** Hover popup'ida ko'rinadi. */
  district: string;
  lat: number;
  lng: number;
  cameras?: number;
}

/** Yorug' qoladigan hudud (geojson `region_name` bilan bir xil yozilishi shart). */
export const CAMPUS_FOCUS_REGION = "Toshkent shahri";

/** Boshlang'ich ko'rinish — tile server ko'ruvchisidagi bilan bir xil nuqta
 *  (`/styles/dark/#11.93/41.32666/69.25659`). DIQQAT: [lat, lng]. */
export const CAMPUS_CENTER: [number, number] = [41.32666, 69.25659];
export const CAMPUS_ZOOM = 11.93;

/**
 * Kuzatuvdagi kampuslar.
 *
 * `mahalla`/`district` uchun O'YLAB TOPILGAN nom yozilmaydi — bizda faqat
 * hudud (`region`) aniq ma'lum. Mahalla kesimi kerak bo'lsa avval
 * `institutions.ts` ga haqiqiy qiymat qo'shiladi.
 */
export const CAMPUS_POINTS: CampusPoint[] = INSTITUTIONS.map((i) => ({
  id: i.id,
  name: i.short,
  mahalla: i.region,
  district: i.region,
  lat: i.lat,
  lng: i.lng,
}));

/** id → kampus (alert oqimi shu orqali joyni topadi). */
export const CAMPUS_BY_ID = new Map(CAMPUS_POINTS.map((c) => [c.id, c]));
