/**
 * Tile-server (tileserver-gl) RASTER qatlami — 3D kampusning asos tasviri.
 *
 * MapLibre vektor plitalarni `config/mapConfig.ts` orqali oladi; bu fayl esa
 * faqat Campus3D uchun: u `<img>` PNG ishlatadi (izometrik proyeksiyada
 * aylantiriladi), shuning uchun raster kerak.
 *
 * Manzil YAGONA REYESTRDAN keladi (`config/services.mjs` → `tiles`), bu yerda
 * qattiq yozilmaydi: proxy rejimida `/tiles`, to'g'ridan-to'g'ri rejimda
 * `http://<host>:8080`.
 *
 * DIQQAT: server ichki tarmoqda — Campus3D qatlamni AVVAL tekshiradi
 * (`probeTiles`), javob bermasa asos qatlamsiz (faqat 3D geometriya) chizadi.
 */
import { TILES_BASE } from "@/config/endpoints";

/** Uslub: `dark` — navy (panel palitrasi), `basic` — OSM Bright, `black` — qora. */
export type TileStyle = "dark" | "basic" | "black";

export const TILE_STYLE: TileStyle = "dark";

/** Mavzuga mos uslub: qorong'ida navy `dark`, yorug'da OSM Bright `basic`.
 *  Yorug' rejimda `dark` tayl 3D kampusni qop-qora dog'ga aylantirardi. */
export function tileStyleFor(theme: "dark" | "light"): TileStyle {
  return theme === "light" ? "basic" : "dark";
}

/** XYZ shabloni — `{z}/{x}/{y}` almashtiriladi. */
export function tileUrl(z: number, x: number, y: number, style: TileStyle = TILE_STYLE): string {
  return `${TILES_BASE}/styles/${style}/${z}/${x}/${y}.png`;
}

/** Tile o'lchami (tileserver-gl standarti). */
export const TILE_SIZE = 256;

/** Mercator: zoom 0 da 1 px = shuncha metr (ekvatorда). */
export const EARTH_MPP = 156543.03392;

/** Tile-server javob berayotganini bir marta tekshiradi (singleton). */
let probe: Promise<boolean> | null = null;
export function probeTiles(): Promise<boolean> {
  if (probe) return probe;
  probe = fetch(tileUrl(0, 0, 0), { method: "GET", cache: "force-cache" })
    .then((r) => r.ok)
    .catch(() => false);
  return probe;
}

/* ---------- Mercator yordamchilari ---------- */

/** lon/lat → kasrli tile koordinatasi (zoom `z`). */
export function lonLatToTile(lon: number, lat: number, z: number): [number, number] {
  const n = 2 ** z;
  const x = ((lon + 180) / 360) * n;
  const r = (lat * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n;
  return [x, y];
}

/** Berilgan zoomда 1 tile piksel necha metr (shu kenglikda). */
export function metersPerPixel(lat: number, z: number): number {
  return (EARTH_MPP * Math.cos((lat * Math.PI) / 180)) / 2 ** z;
}
