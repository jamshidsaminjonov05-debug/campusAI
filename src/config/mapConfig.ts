/**
 * Xarita sozlamalari — TO'LIQ OFFLINE: MapLibre GL + ichki TileServer GL.
 *
 * DIQQAT: bu yerda TILE SERVER MANZILI YO'Q. U yagona reyestrda —
 * `config/services.mjs` (`tiles` yozuvi). Brauzer ishlatadigan ildizni
 * `src/config/endpoints.ts` hisoblaydi (proxy `/tiles` yoki to'g'ridan-to'g'ri).
 */
import { TILES_BASE } from "./endpoints";

export { TILES_BASE };

/**
 * Xarita uslubi — TILE SERVERNING O'Z USLUBI, ya'ni aynan
 * `http://<tile-server>/styles/dark/` ko'ruvchi sahifasidagi xarita.
 * Proxy orqali olinadi (`/tiles/styles/dark/style.json`).
 *
 * Uslubni almashtirish: `NEXT_PUBLIC_MAP_STYLE_URL` (yoki `basic` / `black`).
 *
 * TEZLIK ESLATMASI: serverdagi uslub 564 KB — ichida 544 KB inline GeoJSON
 * maska (`uz-mask`) bor va u har ochilishda tahlil qilinadi. Maskasiz,
 * 20 KB lik tayyor nusxa ham bor:
 *   NEXT_PUBLIC_MAP_STYLE_URL=/map/style-dark.json
 * (o'shanda O'zbekistondan tashqarini `MapLibreMap` o'zi qoraytiradi).
 */
export const MAP_STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? `${TILES_BASE}/styles/dark/style.json`;

/**
 * YORUG' rejim uslubi — tile serverdagi `basic` (OSM Bright) ning LOKAL
 * nusxasi (`public/map/style-light.json`, 50 KB).
 *
 * Serverdagi asli 594 KB: ichida 544 KB inline `uz-mask` bor va u har
 * ochilishda tahlil qilinadi. Qorong'i nusxa qanday tayyorlangan bo'lsa,
 * bu ham xuddi shunday — maskasiz (maskani `MapLibreMap` o'zi chizadi).
 *
 * Serverdagi uslubga qaytarish: `NEXT_PUBLIC_MAP_STYLE_URL_LIGHT`.
 */
export const MAP_STYLE_URL_LIGHT =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL_LIGHT ?? "/map/style-light.json";

/** Mavzuga mos uslub manzili. */
export const mapStyleFor = (theme: "dark" | "light") =>
  theme === "light" ? MAP_STYLE_URL_LIGHT : MAP_STYLE_URL;

/** O'zbekiston markazi va boshlang'ich masshtab. DIQQAT: [lat, lng] tartibida
 *  (MapLibre ichkarida [lng, lat] kutadi — komponent o'zi almashtiradi). */
export const UZ_CENTER: [number, number] = [41.3, 64.5];
export const UZ_ZOOM = 5.4;

/** Tile to'plami faqat O'zbekiston: [minLng, minLat, maxLng, maxLat] (index.json). */
export const UZ_BOUNDS: [number, number, number, number] = [55.9, 37.1, 73.2, 45.7];

/**
 * Xaritaning eng yaqin masshtabi.
 *
 * Vektor tile'lar 14-zoomgacha (`uzbekistan.json` → `maxzoom: 14`); undan
 * keyin MapLibre o'sha tayllarni O'ZI kattalashtiradi (overzoom) — yangi
 * so'rov yubormaydi, ya'ni 404 bo'lmaydi va geometriya (bino konturlari,
 * ko'chalar) vektor bo'lgani uchun aniq qoladi.
 *
 * 17 EDI va kampus ichida KAMERA JOYLASHTIRISH uchun yetmasdi: bitta
 * maktab hovlisiga 32 ta nuqtani qo'yish kerak, 17-zoomda esa butun kvartal
 * ko'rinadi. 21 — MapLibre uchun ham odatiy chegara.
 */
export const MAP_MAX_ZOOM = 21;

/** O'zbekiston viloyatlari GeoJSON — SODDALASHTIRILGAN (~170KB, ~10K nuqta).
 *  Asl `viloyat_4326.geojson` 34MB (~692K nuqta) — xaritani muzlatadi, ishlatmang!
 *  Soddalashtirilgan versiya `scratchpad/simplify.js` bilan yaratilgan. */
export const REGIONS_GEOJSON_URL = "/geojson/viloyat_simplified.geojson";

/** Viloyat poligonlari rangi — `region_name` xossasi boʻyicha (MapLibreMap).
 *  DIQQAT: `mockData.ts` hudud indekslarini shu obyekt TARTIBIGA bog'lagan. */
export const REGION_COLORS: Record<string, string> = {
  "Samarqand viloyati": "#1e40af",
  "Jizzax viloyati": "#1d4ed8",
  "Andijon viloyati": "#1e3a8a",
  "Qashqadaryo viloyati": "#172554",
  "Surxondaryo viloyati": "#0c4a6e",
  "Buxoro viloyati": "#075985",
  "Xorazm viloyati": "#0369a1",
  "Qoraqalpog‘iston Respublikasi": "#164e63",
  "Sirdaryo viloyati": "#312e81",
  "Farg‘ona viloyati": "#3730a3",
  "Namangan viloyati": "#25467a",
  "Navoiy viloyati": "#1e293b",
  "Toshkent shahri": "#2563eb",
  "Toshkent viloyati": "#155e75",
};
