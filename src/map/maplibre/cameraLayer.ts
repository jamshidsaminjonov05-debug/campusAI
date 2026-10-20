import type { GeoJSONSource, Map as MlMap } from "maplibre-gl";

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
  const S = 56; // 28 px @2x — soya/porlash uchun joy bilan
  const cv = document.createElement("canvas");
  cv.width = S;
  cv.height = S;
  const g = cv.getContext("2d");
  if (!g) return null;

  const w = 40;
  const h = 36;
  const x = (S - w) / 2;
  const y = (S - h) / 2;
  const r = 10;

  const body = () => {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  };

  // Porlash (tanlanganda ko'k, aks holda so'nik kulrang)
  g.save();
  g.shadowColor = c.selected ? "rgba(5,5,190,0.95)" : "rgba(118,119,119,0.55)";
  g.shadowBlur = c.selected ? 12 : 8;
  g.fillStyle = "rgba(31,83,40,0.37)";
  body();
  g.fill();
  g.restore();

  // Rang chizig'i — chaqiruvchi bergan `color` yo'qolib ketmasin
  g.strokeStyle = c.color;
  g.globalAlpha = 0.9;
  g.lineWidth = 2;
  body();
  g.stroke();
  g.globalAlpha = 1;

  // Kamkorder silueti (24×24 viewBox → 30 px maydonga, DOM'dagi path bilan bir xil)
  const k = 30 / 24;
  g.save();
  g.translate((S - 30) / 2, (S - 30) / 2);
  g.scale(k, k);
  g.fillStyle = "#fcfffc";
  g.beginPath();
  g.roundRect(2, 6.4, 12.6, 10.2, 2.6);
  g.fill();
  g.fillStyle = "#172c66";
  g.beginPath();
  g.arc(6.9, 11.5, 3.15, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#fcfffc";
  const p = new Path2D("M15.7 10.1 21.3 6.8c.82-.49 1.86.1 1.86 1.06v8.28c0 .96-1.04 1.55-1.86 1.06l-5.6-3.3Z");
  g.fill(p);
  g.restore();

  // Holat nuqtasi (LED) — yuqori-o'ng burchak
  g.fillStyle = LED[c.status ?? "online"] ?? LED.online;
  g.beginPath();
  g.arc(x + w - 2, y + 2, 5, 0, Math.PI * 2);
  g.fill();

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
      "text-offset": [1.15, -1.05],
      "text-allow-overlap": true,
      "text-ignore-placement": true,
    },
    paint: {
      "text-color": "#ffffff",
      "text-halo-color": "#f43f5e",
      "text-halo-width": 4,
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
