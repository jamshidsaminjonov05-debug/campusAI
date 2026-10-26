import type { GeoJSONSource, Map as MlMap } from "maplibre-gl";
import { tr } from "@/i18n/store";

/**
 * KUZATUV KAMERALARI — MapLibre QATLAMI (DOM marker o'rniga, 2026-09-25).
 *
 * Ilgari har kamera `maplibregl.Marker` (DOM element + SVG + CSS animatsiya)
 * edi. Xarita har kadrda (surish, 3D aylantirish) HAR BIR markerning
 * `transform` ini qayta yozardi: 32 kamera = 32 ta DOM yozuvi + qayta
 * joylashtirish, ustiga PTZ konuslarining cheksiz CSS animatsiyasi. Endi
 * hammasi GPU'da, xarita chizishining o'z o'tishida:
 *
 *   · `app-cam-fov`  — ko'rish KONUSI (`fill`, yerga yotqizilgan sektor)
 *   · `app-cam-sym`  — korpus ikonkasi (`symbol`) + hodisa soni rozetkasi
 *
 * ⚠️ Nima yo'qoldi: PTZ konusining chapga-o'ngga suzishi (CSS animatsiya
 * edi) — u xarita kadrini doimiy "iflos" qilib turardi. Konus endi
 * `heading` bo'yicha qotgan; PTZ kamera baribir `ptz` bayrog'i bilan
 * (kelajakda kerak bo'lsa) ajratiladi.
 *
 * ⚠️ `draggable` (kamera joylashtirish rejimi) markerlar bu qatlamga
 * KIRMAYDI — sudrash DOM markerning imkoniyati; ular avvalgidek
 * `MapLibreMap` dagi DOM yo'lida qoladi.
 */

export const CAM_SRC = "app-cam-src";
export const CAM_FOV_SRC = "app-cam-fov-src";
export const CAM_FOV_LAYER = "app-cam-fov";
export const CAM_SYM_LAYER = "app-cam-sym";

/** Konus uzunligi (metr) va ochilish burchagi — DOM konusidagi 60° bilan bir xil. */
const FOV_DEG = 60;
const FOV_RADIUS_M = 22;

/** Qatlam uchun kamera ma'lumoti (`YMarker` ning kerakli qismi). */
export interface CamPoint {
  id: string;
  lat: number;
  lng: number;
  color: string;
  status?: "online" | "offline" | "warning";
  selected?: boolean;
  heading?: number;
  label?: string;
}

const LED: Record<string, string> = {
  online: "#34d399",
  warning: "#f59e0b",
  offline: "#ef4444",
};

const esc = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * KAMERA KARTASI — belgi ustiga kelganda chiqadigan popup (2026-10-23,
 * foydalanuvchi: "#28 · 316° (taxminiy)" oddiy matn edi, dizaynga mos emas).
 * Uchala xarita sahifasi (Boshqaruv paneli, Geo Analitika, Hodisalar HUD)
 * SHU funksiyadan — ko'rinish bir xil. Uslub: `index.css` `.hik-cam-tip*`.
 * Matn LUG'ATDAN (`tr()` — React'siz), ya'ni til almashsa karta ham almashadi.
 */
export function cameraHintHtml(c: {
  channel: string | number;
  /** Odam o'qiydigan joy (`cameraPlaceLabel`). */
  place: string;
  status?: "online" | "offline" | "warning";
  /** Ko'rish yo'nalishi (gradus) — bo'lmasa qator chizilmaydi. */
  deg?: number;
  approx?: boolean;
  /** Hodisa soni (HUD) — 0 bo'lsa chizilmaydi. */
  events?: number;
}): string {
  const t = tr();
  const st = c.status ?? "online";
  const stText = st === "offline" ? t.common.offline : t.common.online;
  const rows: string[] = [];
  if (typeof c.deg === "number") {
    rows.push(
      `<div class="hik-cam-tip-row"><span class="hik-cam-tip-k">${esc(t.cameraTip.heading)}</span>` +
        `<span class="hik-cam-tip-v"><i class="hik-cam-tip-compass" style="transform:rotate(${Math.round(c.deg)}deg)"></i>${Math.round(c.deg)}°` +
        (c.approx ? `<em class="hik-cam-tip-approx">${esc(t.cameraTip.approx)}</em>` : "") +
        `</span></div>`
    );
  }
  if (c.events && c.events > 0) {
    rows.push(`<div class="hik-cam-tip-row hik-cam-tip-events">${esc(t.cameraTip.events(c.events))}</div>`);
  }
  return (
    `<div class="hik-cam-tip">` +
    `<div class="hik-cam-tip-head">` +
    `<span class="hik-cam-tip-ic"><svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><rect x="2" y="6.4" width="12.6" height="10.2" rx="2.6"/><path d="M15.7 10.1 21.3 6.8c.82-.49 1.86.1 1.86 1.06v8.28c0 .96-1.04 1.55-1.86 1.06l-5.6-3.3Z"/></svg></span>` +
    `<span class="hik-cam-tip-title">${esc(c.place)}</span>` +
    `<span class="hik-cam-tip-ch">#${esc(String(c.channel))}</span>` +
    `</div>` +
    `<div class="hik-cam-tip-row"><span class="hik-cam-tip-dot is-${st}"></span><span class="hik-cam-tip-v">${esc(stText)}</span></div>` +
    rows.join("") +
    `</div>`
  );
}

/** Ikonka nomi — rang/holat/tanlov birikmasiga bitta rasm. */
export function camIconName(c: Pick<CamPoint, "color" | "status" | "selected">): string {
  return `cam-ic-${c.color.replace(/[^0-9a-z]/gi, "")}-${c.status ?? "x"}-${c.selected ? 1 : 0}`;
}

/**
 * Kamera ikonkasi — canvas'da chiziladi (loyiha OFFLINE: sprite yo'q, xuddi
 * `treeIcon` kabi). Ko'rinishi DOM markerdagi bilan bir xil: yarim shaffof
 * korpus, oq kamkorder siluet, burchakda holat nuqtasi (LED).
 */
function drawCamIcon(c: CamPoint): ImageData | null {
  if (typeof document === "undefined") return null;
  /* 🔵 FOYDALANUVCHI NAMUNASI BO'YICHA (2026-10-23, IKKINCHI rasm bilan:
     "back gradient, icon white"): KO'K GRADIENT yumaloq kvadrat (yuqori-chap
     och ko'k → pastki-o'ng to'q ko'k), ichida OQ kamkorder silueti — boshqa
     hech narsa. Ilgari (shu kunning birinchi namunasi) to'q navy fon + cyan
     siluet edi. Holat chirog'i FAQAT muammo bo'lganda (oflayn — qizil,
     ogohlantirish — sariq) pastki-o'ng burchakda; tanlangan kamera — cyan
     porlash va halqa. */
  const S = 60; // 30 px @2x — porlash uchun joy bilan
  const cv = document.createElement("canvas");
  cv.width = S;
  cv.height = S;
  const g = cv.getContext("2d");
  if (!g) return null;

  const w = 40;
  const h = 40;
  const x = (S - w) / 2;
  const y = (S - h) / 2;
  const r = 10;
  const body = () => {
    g.beginPath();
    g.roundRect(x, y, w, h, r);
  };

  // Korpus — ko'k gradient (namunadagi kabi), yengil soya (tanlanganda cyan porlash)
  const grad = g.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, "#5b9dff");
  grad.addColorStop(0.55, "#2f6fe8");
  grad.addColorStop(1, "#1d4ed8");
  g.save();
  g.shadowColor = c.selected ? "rgba(34,211,238,0.95)" : "rgba(0,0,0,0.5)";
  g.shadowBlur = c.selected ? 14 : 6;
  g.shadowOffsetY = c.selected ? 0 : 2;
  g.fillStyle = grad;
  body();
  g.fill();
  g.restore();

  // Chegara — yengil oq yaltirash; tanlanganda cyan
  g.strokeStyle = c.selected ? "#22d3ee" : "rgba(255,255,255,0.35)";
  g.lineWidth = c.selected ? 2.5 : 1.25;
  body();
  g.stroke();

  // Kamkorder — OQ (24×24 viewBox → 24 px), markazda
  const size = 24;
  const k = size / 24;
  g.save();
  g.translate((S - size) / 2, (S - size) / 2);
  g.scale(k, k);
  g.fillStyle = "#ffffff";
  g.beginPath();
  g.roundRect(1.6, 6, 13.4, 11.2, 2.8);
  g.fill();
  g.fill(new Path2D("M16.4 9.9 21.6 6.9c.82-.49 1.86.1 1.86 1.06v7.3c0 .96-1.04 1.55-1.86 1.06l-5.2-3Z"));
  g.restore();

  // Holat — faqat muammo bo'lsa (onlayn kamera namunadagidek toza qoladi)
  const st = c.status ?? "online";
  if (st !== "online") {
    const led = LED[st] ?? LED.offline;
    g.save();
    g.shadowColor = led;
    g.shadowBlur = 6;
    g.fillStyle = led;
    g.beginPath();
    g.arc(x + w - 6, y + h - 6, 3.6, 0, Math.PI * 2);
    g.fill();
    g.restore();
    g.strokeStyle = "#ffffff";
    g.lineWidth = 1.5;
    g.beginPath();
    g.arc(x + w - 6, y + h - 6, 3.6, 0, Math.PI * 2);
    g.stroke();
  }

  return g.getImageData(0, 0, S, S);
}

/** Ko'rish konusi — kamera markazidan `heading` bo'ylab sektor (metrdan gradusga). */
function fovRing(lng: number, lat: number, heading: number): [number, number][] {
  const dLat = 1 / 111_320;
  const dLng = 1 / (111_320 * Math.cos((lat * Math.PI) / 180));
  const ring: [number, number][] = [[lng, lat]];
  const STEPS = 8;
  for (let i = 0; i <= STEPS; i++) {
    const a = ((heading - FOV_DEG / 2 + (FOV_DEG * i) / STEPS) * Math.PI) / 180;
    ring.push([lng + Math.sin(a) * FOV_RADIUS_M * dLng, lat + Math.cos(a) * FOV_RADIUS_M * dLat]);
  }
  ring.push([lng, lat]);
  return ring;
}

/**
 * Qatlamlarni (yo'q bo'lsa) yaratadi va ma'lumotni yangilaydi.
 * `map.setStyle()` dan keyin ham xavfsiz — manba/rasm/qatlam yo'q bo'lsa qayta qo'shiladi.
 */
export function syncCameraLayers(map: MlMap, cams: CamPoint[], font: string[]): void {
  // 1) Ikonkalar — faqat kerakli birikmalar
  for (const c of cams) {
    const name = camIconName(c);
    if (map.hasImage(name)) continue;
    const img = drawCamIcon(c);
    if (img) map.addImage(name, img, { pixelRatio: 2 });
  }

  // 2) Ma'lumot
  const points: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: cams.map((c) => ({
      type: "Feature",
      properties: {
        id: c.id,
        icon: camIconName(c),
        label: c.label ?? "",
        sel: c.selected ? 1 : 0,
      },
      geometry: { type: "Point", coordinates: [c.lng, c.lat] },
    })),
  };
  const fov: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: cams
      .filter((c) => typeof c.heading === "number")
      .map((c) => ({
        type: "Feature",
        properties: {
          // tanlangan — aniqroq, o'chiq kamera — deyarli ko'rinmas (DOM'dagi qoida)
          a: c.status === "offline" ? 0.05 : c.selected ? 0.34 : 0.16,
        },
        geometry: { type: "Polygon", coordinates: [fovRing(c.lng, c.lat, c.heading as number)] },
      })),
  };

  const src = map.getSource(CAM_SRC) as GeoJSONSource | undefined;
  if (src) {
    src.setData(points);
    (map.getSource(CAM_FOV_SRC) as GeoJSONSource | undefined)?.setData(fov);
    return;
  }

  map.addSource(CAM_SRC, { type: "geojson", data: points });
  map.addSource(CAM_FOV_SRC, { type: "geojson", data: fov });

  map.addLayer({
    id: CAM_FOV_LAYER,
    type: "fill",
    source: CAM_FOV_SRC,
    minzoom: 15,
    paint: { "fill-color": "#85E0FF", "fill-opacity": ["get", "a"], "fill-antialias": false },
  });
  map.addLayer({
    id: CAM_SYM_LAYER,
    type: "symbol",
    source: CAM_SRC,
    layout: {
      "icon-image": ["get", "icon"],
      "icon-size": ["case", ["==", ["get", "sel"], 1], 1.22, 1],
      "icon-allow-overlap": true,
      "icon-ignore-placement": true,
      "text-field": ["get", "label"],
      "text-font": font,
      "text-size": 10,
      "text-offset": [1.3, -1.15],
      "text-allow-overlap": true,
      "text-ignore-placement": true,
    },
    paint: {
      /* Hodisa soni rozetkasi — ilgari pushti halo edi (dizaynga yot);
         endi to'q fon + oq raqam, ikonka bilan bir uslubda. */
      "text-color": "#ffffff",
      "text-halo-color": "#0b1220",
      "text-halo-width": 3,
    },
  });
}

/** Nuqtada kamera bormi — kampus/bino/xarita bosish ishlovchilari shuni tekshiradi. */
export function cameraIdAt(map: MlMap, point: { x: number; y: number }): string | undefined {
  if (!map.getLayer(CAM_SYM_LAYER)) return undefined;
  const f = map.queryRenderedFeatures([point.x, point.y] as [number, number], { layers: [CAM_SYM_LAYER] })[0];
  return f?.properties?.id as string | undefined;
}

/** Qatlamlarni olib tashlaydi (kameralar qolmaganda). */
export function removeCameraLayers(map: MlMap): void {
  for (const id of [CAM_SYM_LAYER, CAM_FOV_LAYER]) if (map.getLayer(id)) map.removeLayer(id);
  for (const id of [CAM_SRC, CAM_FOV_SRC]) if (map.getSource(id)) map.removeSource(id);
}
