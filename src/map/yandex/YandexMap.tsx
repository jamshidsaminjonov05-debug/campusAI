"use client";

/* `any` — Yandex JS API 2.1 o'z tiplarini bermaydi (global `ymaps`),
   tip paketi ham o'rnatilmagan. */

import { memo, useEffect, useRef, useState } from "react";
import { WifiOff } from "lucide-react";
import { useScheme } from "@/theme";
import { getLang } from "@/i18n/store";
import { loadCampusAreas, type CampusArea, type LngLat } from "@/lib/campusAreas";
import { REGIONS_GEOJSON_URL, REGION_COLORS, UZ_CENTER, UZ_ZOOM } from "@/config/mapConfig";
import { YANDEX_MAPS_API_KEY } from "@/config/yandexMaps";
import { markerElement, type MapProps } from "@/map/maplibre/MapLibreMap";

/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  GLOBAL SAYT XARITASI — Yandex Maps JS API 2.1                    ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * 🔴 NEGA (2026-09-14, foydalanuvchi so'rovi): loyiha `campusai.uz` da
 * ochilganda ichki tayl serverga (`/tiles`) yetib bo'lmaydi — o'lchandi:
 * `https://campusai.uz/tiles/styles/dark/style.json` javobsiz qoldi,
 * `/map/style-light.json` esa `200`. Ya'ni MapLibre uslubni oladi-yu,
 * birorta plitani ololmaydi. Shu sabab global domen uchun xarita Yandex'dan.
 *
 * ⚠️ QAYSI XARITA — `config/yandexMaps.ts` `isYandexHost()` hal qiladi
 * (`MapLibreMap` o'rami). Lokal (localhost / ichki IP) — avvalgidek OFFLINE
 * MapLibre, bu fayl umuman yuklanmaydi ham, tashqi skript ham chaqirilmaydi.
 *
 * ⚠️ PROPLAR — `MapLibreMap` bilan AYNI (`MapProps`), chaqiruvchilar
 * o'zgarmaydi. Yandex 2.1 da BO'LMAGANLARI jim o'tkazib yuboriladi:
 * `initial3D`/`show3DToggle` (qiyalik yo'q), `autoRotate`, bino
 * ekstruziyasi/fasad/daraxtlar, `spotlightRegion`/`highlightCountry`
 * maskasi. Kampus hududi va binolari TEKIS poligon bo'lib chiziladi,
 * bosilishi (`onSelectCampus`/`onBuildingClick`) saqlanadi.
 *
 * ⚠️ MARKERLAR — `markerElement()` ning O'ZI (bitta DOM, bitta CSS
 * `.ymk*`) — `.ymk*` uslublari aslida Yandex davrida yozilgan edi.
 */

type Ym = any;

/** Skript bir marta yuklanadi — bir nechta xarita bitta `ymaps`ni ishlatadi. */
let ymapsPromise: Promise<Ym> | null = null;

function loadYmaps(): Promise<Ym> {
  if (ymapsPromise) return ymapsPromise;
  ymapsPromise = new Promise((resolve, reject) => {
    const w = window as any;
    if (w.ymaps?.ready) {
      w.ymaps.ready(() => resolve(w.ymaps), reject);
      return;
    }
    /* 2.1 tillari: ru_RU / en_US / uk_UA / tr_TR — o'zbekcha YO'Q,
       shuning uchun o'zbek interfeysida xarita yorliqlari ruscha. */
    const lang = getLang() === "en" ? "en_US" : "ru_RU";
    const key = YANDEX_MAPS_API_KEY ? `apikey=${encodeURIComponent(YANDEX_MAPS_API_KEY)}&` : "";
    const s = document.createElement("script");
    s.src = `https://api-maps.yandex.ru/2.1/?${key}lang=${lang}`;
    s.async = true;
    s.onload = () => {
      if (w.ymaps?.ready) w.ymaps.ready(() => resolve(w.ymaps), reject);
      else reject(new Error("Yandex xarita skripti yuklandi, lekin `ymaps` topilmadi"));
    };
    s.onerror = () => {
      // Keyingi urinish yangidan yuklay olsin (tarmoq vaqtincha uzilgan bo'lishi mumkin)
      ymapsPromise = null;
      reject(new Error("Yandex xarita skripti yuklanmadi (api-maps.yandex.ru)"));
    };
    document.head.appendChild(s);
  });
  return ymapsPromise;
}

const CONTROL_POS: Record<NonNullable<MapProps["controlPosition"]>, Record<string, number>> = {
  "top-right": { top: 10, right: 10 },
  "top-left": { top: 10, left: 10 },
  "bottom-right": { bottom: 40, right: 10 },
  "bottom-left": { bottom: 40, left: 10 },
};

/** [lng, lat] halqa → Yandex tartibi [lat, lng]. */
const toLatLng = (ring: LngLat[]) => ring.map(([lng, lat]) => [lat, lng]);

/** [lng, lat] nuqtalardan Yandex chegarasi `[[minLat,minLng],[maxLat,maxLng]]`. */
function boundsOf(points: LngLat[]): number[][] | null {
  if (points.length === 0) return null;
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
  for (const [lng, lat] of points) {
    if (lat < a) a = lat;
    if (lng < b) b = lng;
    if (lat > c) c = lat;
    if (lng > d) d = lng;
  }
  return [[a, b], [c, d]];
}

/** GeoJSON Polygon/MultiPolygon → poligonlar ro'yxati (har biri halqalar). */
function polygonsOf(geom: { type: string; coordinates: any }): LngLat[][][] {
  if (geom?.type === "Polygon") return [geom.coordinates];
  if (geom?.type === "MultiPolygon") return geom.coordinates;
  return [];
}

/**
 * Radar uchun `map.project([lng,lat])` o'rinbosari — kameraning xarita
 * KONTEYNERIGA nisbatan pikseli (MapLibre `project` bilan AYNI ma'no).
 */
function projector(map: Ym, box: HTMLElement) {
  return {
    project([lng, lat]: [number, number]) {
      const global = map.options.get("projection").toGlobalPixels([lat, lng], map.getZoom());
      const [px, py] = map.converter.globalToPage(global);
      const r = box.getBoundingClientRect();
      return { x: px - (r.left + window.scrollX), y: py - (r.top + window.scrollY) };
    },
  };
}

type OnReady = Parameters<NonNullable<MapProps["onMapReady"]>>[0];

export const YandexMap = memo(function YandexMap({
  center,
  zoom,
  markers = [],
  regions = false,
  selectedRegion = null,
  onSelectRegion,
  onMapClick,
  regionColors = null,
  regionFillOpacity = 0.22,
  campusAreas,
  selectedCampusId = null,
  onSelectCampus,
  onBuildingClick,
  fitCampusBounds = true,
  overviewFitsCountry = false,
  focus = null,
  dim = false,
  themeOverride,
  controls,
  controlPosition = "top-right",
  interactive = true,
  onMapReady,
  className,
}: MapProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Ym>(null);
  const ymRef = useRef<Ym>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const autoTheme = useScheme();
  const theme = themeOverride ?? autoTheme;

  /* Callback'lar REF orqali — chaqiruvchilar ularni odatda joyida yozadi
     (har renderda yangi havola), obyektlar esa qayta qurilmasin. */
  const cb = useRef({ onSelectRegion, onMapClick, onSelectCampus, onBuildingClick, onMapReady });
  cb.current = { onSelectRegion, onMapClick, onSelectCampus, onBuildingClick, onMapReady };
  const colorsRef = useRef(regionColors);
  colorsRef.current = regionColors;
  /* Kampus tanlangan bo'lsa viloyat kadri uni bosib ketmasin (MapLibreMap
     `campusPickedRef` bilan AYNI qoida). */
  const pickedRef = useRef(selectedCampusId);
  pickedRef.current = selectedCampusId;

  // Boshlang'ich ko'rinish va sozlamalar faqat mount'da o'qiladi
  const initial = useRef({
    center: center ?? UZ_CENTER,
    zoom: Math.round(zoom ?? UZ_ZOOM),
    controls: controls ?? ["zoomControl"],
    controlPosition,
    interactive,
  }).current;

  /* 1) Xaritani bir marta yaratamiz */
  useEffect(() => {
    let cancelled = false;
    let map: Ym = null;
    loadYmaps()
      .then((ym) => {
        if (cancelled || !boxRef.current) return;
        ymRef.current = ym;
        map = new ym.Map(
          boxRef.current,
          { center: initial.center, zoom: initial.zoom, controls: [] },
          { suppressMapOpenBlock: true, yandexMapDisablePoiInteractivity: true }
        );
        if (initial.controls.includes("zoomControl")) {
          map.controls.add("zoomControl", { size: "small", position: CONTROL_POS[initial.controlPosition] });
        }
        if (initial.controls.includes("fullscreenControl")) map.controls.add("fullscreenControl");
        if (!initial.interactive) {
          map.behaviors.disable(["drag", "scrollZoom", "dblClickZoom", "multiTouch", "rightMouseButtonMagnifier"]);
        }
        map.events.add("click", (e: Ym) => {
          const f = cb.current.onMapClick;
          if (!f) return;
          const [lat, lng] = e.get("coords");
          f({ lat, lng });
        });
        mapRef.current = map;
        setStatus("ready");
        cb.current.onMapReady?.(projector(map, boxRef.current) as unknown as OnReady);
      })
      .catch((err) => {
        if (cancelled) return;
        setErrorMsg(err instanceof Error ? err.message : String(err));
        setStatus("error");
      });
    return () => {
      cancelled = true;
      if (mapRef.current) cb.current.onMapReady?.(null);
      map?.destroy();
      mapRef.current = null;
    };
  }, [initial]);

  /* 2) Markerlar — `markerElement()` DOM'i Yandex HTML layout ichiga */
  useEffect(() => {
    const map = mapRef.current;
    const ym = ymRef.current;
    if (status !== "ready" || !map || !ym) return;
    const col = new ym.GeoObjectCollection();
    for (const m of markers) {
      const el = markerElement(m);
      const Layout: Ym = ym.templateLayoutFactory.createClass("<div></div>", {
        build(this: Ym) {
          Layout.superclass.build.call(this);
          this.getParentElement().appendChild(el);
        },
        clear(this: Ym) {
          el.remove();
          Layout.superclass.clear.call(this);
        },
      });
      /* Bosish maydoni: ustunli markerlarda (trevoga, kampus) belgi
         nuqtadan TEPADA turadi. */
      const lifted = m.kind === "alert" || m.kind === "campus";
      const pm = new ym.Placemark(
        [m.lat, m.lng],
        m.hintHtml ? { hintContent: m.hintHtml } : {},
        {
          iconLayout: Layout,
          iconShape: { type: "Circle", coordinates: [0, lifted ? -22 : 0], radius: 14 },
          draggable: !!m.draggable,
          zIndex: m.kind === "alert" ? 700 : m.selected ? 650 : 600,
        }
      );
      if (m.onClick) pm.events.add("click", () => m.onClick?.());
      if (m.draggable && m.onDragEnd) {
        pm.events.add("dragend", () => {
          const [lat, lng] = pm.geometry.getCoordinates();
          m.onDragEnd?.({ lat, lng });
        });
      }
      col.add(pm);
    }
    map.geoObjects.add(col);
    return () => {
      map.geoObjects.remove(col);
    };
  }, [markers, status]);

  /* 3) Kuzatuvdagi kampus hududlari va binolari — TEKIS poligonlar */
  const [areas, setAreas] = useState<CampusArea[]>([]);
  useEffect(() => {
    if (!campusAreas) return;
    let cancelled = false;
    loadCampusAreas()
      .then((a) => !cancelled && setAreas(a))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [campusAreas]);

  useEffect(() => {
    const map = mapRef.current;
    const ym = ymRef.current;
    if (status !== "ready" || !map || !ym || !campusAreas || areas.length === 0) return;
    const col = new ym.GeoObjectCollection();
    const shown = campusAreas === "selected" ? areas.filter((a) => a.id === selectedCampusId) : areas;
    for (const a of shown) {
      const sel = a.id === selectedCampusId;
      const zone = new ym.Polygon([toLatLng(a.ring)], { hintContent: a.name }, {
        fillColor: "#22c55e",
        fillOpacity: sel ? 0.32 : 0.18,
        strokeColor: sel ? "#22d3ee" : "#34d399",
        strokeWidth: sel ? 3 : 2,
        zIndex: 100,
      });
      zone.events.add("click", () => cb.current.onSelectCampus?.(a.id));
      col.add(zone);
      a.buildings.forEach((b, i) => {
        const bld = new ym.Polygon([toLatLng(b.ring)], b.name ? { hintContent: b.name } : {}, {
          fillColor: b.name ? "#f8fafc" : "#cbd5e1",
          fillOpacity: 0.85,
          strokeColor: "#475569",
          strokeWidth: 1,
          zIndex: 110,
        });
        /* Kalit `buildingsToGeoJson()` bilan AYNI: `${campusId}-${index}` */
        bld.events.add("click", () => {
          if (cb.current.onBuildingClick) cb.current.onBuildingClick(`${a.id}-${i}`);
          else cb.current.onSelectCampus?.(a.id);
        });
        col.add(bld);
      });
    }
    map.geoObjects.add(col);
    return () => {
      map.geoObjects.remove(col);
    };
  }, [status, campusAreas, areas, selectedCampusId]);

  /* 3b) Kadr: tanlangan kampus → uning chegarasi; "Umumiy" → respublika */
  useEffect(() => {
    const map = mapRef.current;
    if (status !== "ready" || !map || !campusAreas) return;
    if (selectedCampusId) {
      const a = areas.find((x) => x.id === selectedCampusId);
      const b = a && boundsOf(a.ring);
      if (b) map.setBounds(b, { checkZoomRange: true, zoomMargin: 40, duration: 600 });
    } else if (campusAreas !== "selected") {
      if (overviewFitsCountry) {
        map.setCenter(UZ_CENTER, Math.round(UZ_ZOOM), { duration: 600 });
      } else if (fitCampusBounds) {
        const b = boundsOf(areas.flatMap((a) => a.ring));
        if (b) map.setBounds(b, { checkZoomRange: true, zoomMargin: 40, duration: 600 });
      }
    }
  }, [status, areas, selectedCampusId, campusAreas, overviewFitsCountry, fitCampusBounds]);

  /* 4) Viloyat poligonlari */
  const [regionData, setRegionData] = useState<{ features: any[] } | null>(null);
  useEffect(() => {
    if (!regions) return;
    let cancelled = false;
    fetch(REGIONS_GEOJSON_URL)
      .then((r) => r.json())
      .then((j) => !cancelled && setRegionData(j))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [regions]);

  const colorsKey = regionColors ? Object.entries(regionColors).map(([k, v]) => `${k}=${v}`).join(",") : "";
  useEffect(() => {
    const map = mapRef.current;
    const ym = ymRef.current;
    if (status !== "ready" || !map || !ym || !regions || !regionData) return;
    const col = new ym.GeoObjectCollection();
    for (const f of regionData.features) {
      const name: string = f.properties?.region_name ?? "";
      const color = colorsRef.current?.[name] ?? REGION_COLORS[name] ?? "#2563eb";
      const sel = name === selectedRegion;
      for (const poly of polygonsOf(f.geometry)) {
        const p = new ym.Polygon(poly.map(toLatLng), { hintContent: name }, {
          fillColor: color,
          fillOpacity: sel ? Math.min(1, regionFillOpacity + 0.25) : regionFillOpacity,
          strokeColor: sel ? "#85E0FF" : "#ffffff",
          strokeOpacity: sel ? 0.9 : 0.35,
          strokeWidth: sel ? 2.5 : 1,
          zIndex: 50,
        });
        p.events.add("click", () => cb.current.onSelectRegion?.(name));
        col.add(p);
      }
    }
    map.geoObjects.add(col);
    return () => {
      map.geoObjects.remove(col);
    };
  }, [status, regions, regionData, selectedRegion, colorsKey, regionFillOpacity]);

  /* 4b) Tanlangan viloyatga kadr (kampus tanlangan bo'lsa — u ustun) */
  useEffect(() => {
    const map = mapRef.current;
    if (status !== "ready" || !map || !regionData || !selectedRegion || pickedRef.current) return;
    const f = regionData.features.find((x) => x.properties?.region_name === selectedRegion);
    const b = f && boundsOf(polygonsOf(f.geometry).flat(2));
    if (b) map.setBounds(b, { checkZoomRange: true, zoomMargin: 30, duration: 600 });
  }, [status, regionData, selectedRegion]);

  /* 5) Fokus — `nonce` AYNI nuqtaga qayta uchish uchun */
  const fLat = focus?.lat;
  const fLng = focus?.lng;
  const fZoom = focus?.zoom;
  const fNonce = focus?.nonce;
  useEffect(() => {
    const map = mapRef.current;
    if (status !== "ready" || !map || fLat == null || fLng == null) return;
    map.setCenter([fLat, fLng], Math.round(fZoom ?? map.getZoom()), { duration: 700 });
  }, [status, fLat, fLng, fZoom, fNonce]);

  return (
    <div
      className={`${className ?? "relative h-full w-full"} overflow-hidden ${theme === "dark" ? "ymap-dark" : ""}`}
    >
      <div ref={boxRef} className="absolute inset-0 h-full w-full" />
      {dim && <span className="mlmap-dim" />}

      {status === "loading" && (
        <div className="absolute inset-0 grid place-items-center bg-[#0a1120]">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500/40 border-t-blue-500" />
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 z-20 grid place-items-center bg-[#0a1120] p-4">
          <div className="flex max-w-[420px] flex-col items-center gap-2 text-center">
            <WifiOff size={28} className="text-amber-400" />
            <p className="text-[14px] font-bold text-slate-200">Xarita chizilmadi</p>
            {errorMsg && (
              <p className="max-h-24 overflow-auto rounded-lg bg-black/40 px-3 py-2 font-mono text-[10.5px] leading-snug text-amber-200">
                {errorMsg}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
