"use client";

import { useT } from "@/i18n";
import { memo, useEffect, useRef, useState } from "react";
import {
  FullscreenControl,
  Map as MlMap,
  Marker,
  NavigationControl,
  Popup,
  type GeoJSONSource,
  type LngLatBoundsLike,
  type MapMouseEvent,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { WifiOff } from "lucide-react";
import { YandexMap } from "@/map/yandex/YandexMap";
import { isYandexHost } from "@/config/yandexMaps";
import { useAppStore } from "@/store/useAppStore";
import { useScheme } from "@/theme";
import {
  areasBounds,
  areasToGeoJson,
  buildingLabelsToGeoJson,
  buildingsToGeoJson,
  facadeToGeoJson,
  loadCampusAreas,
  treesToGeoJson,
} from "@/lib/campusAreas";
import {
  MAP_MAX_ZOOM,
  MAP_STYLE_URL,
  mapStyleFor,
  REGIONS_GEOJSON_URL,
  REGION_COLORS,
  TILES_BASE,
  UZ_CENTER,
  UZ_ZOOM,
} from "@/config/mapConfig";

/**
 * Xarita nuqtasi (texnikum, hodisa yoki 3D yorliqli kampus).
 * DIQQAT: lat/lng oddiy tartibda beriladi — MapLibre ichkarida [lng, lat]
 * kutadi, almashtirishni SHU komponent qiladi.
 */
export interface YMarker {
  id: string;
  lat: number;
  lng: number;
  kind: "teknikum" | "event" | "campus" | "camera" | "alert" | "stat" | "dot";
  color: string;
  pulse?: boolean;
  hintHtml?: string;
  onClick?: () => void;
  /** `kind:"campus"` uchun — 3D yorliqdagi nom. */
  label?: string;
  /** Yorliqning ikkinchi qatori (mahalla). */
  sub?: string;
  /** Kampusda faol trevoga — yorliq qizarib pulsatsiya qiladi. */
  alert?: boolean;
  /** Sichqoncha olib borilganda chiqadigan oddiy matn (`title`). */
  tooltip?: string;
  /**
   * Sudrab surish mumkin (kamera joylashtirish rejimi).
   * Tugagach `onDragEnd` yangi koordinatani beradi.
   */
  draggable?: boolean;
  onDragEnd?: (at: { lat: number; lng: number }) => void;
  /**
   * `kind:"camera"` uchun — kamera QAYSI TOMONGA qaragan (gradus,
   * 0 = shimol, soat strelkasi bo'yicha).
   *
   * ⚠️ Berilmasa ko'rish konusi UMUMAN chizilmaydi. Yo'nalish
   * ma'lumoti kuzatuv postidan kelmaydi (`config/cameraPlacements.ts`
   * `cameraHeading()` izohiga qarang) — o'ylab topilmaydi.
   */
  heading?: number;
  /** Yo'nalish O'LCHANGAN emas, geometriyadan taxmin qilingan. */
  headingApprox?: boolean;
  /** Kamera holati — kichkina nuqta rangi. */
  status?: "online" | "offline" | "warning";
  /** PTZ (buriladigan) kamera — konus sekin chapga-o'ngga suriladi. */
  ptz?: boolean;
  /** Tanlangan — kamera yorqinroq, konus aniqroq ko'rinadi. */
  selected?: boolean;
}

export interface MapProps {
  center?: [number, number]; // [lat, lng]
  zoom?: number;
  markers?: YMarker[];
  regions?: boolean; // viloyat poligonlari (butun O'zbekiston)
  selectedRegion?: string | null;
  onSelectRegion?: (name: string) => void;
  /**
   * Xaritaning BO'SH joyiga bosilganda — kamera joylashtirish rejimi uchun.
   * Berilgan bo'lsa kursor "chorrahaga" aylanadi.
   */
  onMapClick?: (at: { lat: number; lng: number }) => void;
  /**
   * Viloyat ranglarini BEKOR QILADI: `{ "Toshkent shahri": "#ef4444", … }`.
   *
   * Geo Analitika shu orqali tanlangan ko'rsatkich (davomat / hodisalar /
   * kayfiyat / kameralar) bo'yicha hududlarni bo'yaydi. Berilmasa
   * `REGION_COLORS` (har viloyatga o'z rangi) ishlatiladi.
   */
  regionColors?: Record<string, string> | null;
  /** Viloyat to'ldirish shaffofligi — metrik ranglashda quyuqroq kerak. */
  regionFillOpacity?: number;
  /**
   * Kuzatuvdagi muassasalarning HAQIQIY hudud chegaralari, 3D ko'tarilgan.
   * Viloyat poligonlaridan (`regions`) MUSTAQIL — maqsad aynan butun
   * viloyat/shahar konturini chizmaslik.
   *
   *   `"all"`      — barchasi chiziladi, tanlangani ajratiladi (Geo Analitika)
   *   `"selected"` — FAQAT tanlangani; tanlanmagunicha hech narsa (Hodisalar HUD)
   */
  campusAreas?: "all" | "selected";
  selectedCampusId?: string | null;
  onSelectCampus?: (id: string) => void;
  /**
   * BITTA bino poligoni bosilganda (`app-campus-buildings`, ya'ni
   * kampus HOVLISI emas, bino KONTURI) — 2026-09-08, foydalanuvchi
   * so'rovi: "binoni bosganimizda... ichki ko'rinishini ko'rish mumkin
   * bo'lsin". Argument — `buildingsToGeoJson()` bergan `key`
   * (`"${campusId}-${buildingIndex}"`, `lib/campusAreas.ts`), chaqiruvchi
   * shundan bino massividagi indeksni topadi. Berilmasa binolar
   * bosilmaydigan — faqat hovli (`onSelectCampus`) ishlaydi, avvalgidek.
   */
  onBuildingClick?: (key: string) => void;
  /**
   * `campusAreas="all"` da xarita yuklanishda kadrni KAMPUSLARGA moslaydimi.
   *
   * Default `true` — kuzatuv joylariga ochiladi. Geo Analitika buni `false`
   * qiladi: u butun respublika statistikasini ko'rsatadi va 7 ta kampus
   * (hammasi Toshkentda) kadrni o'ziga tortsa, viloyat xaritasi ko'rinmay
   * qolardi.
   */
  fitCampusBounds?: boolean;
  /**
   * `campusAreas` berilganda ham SHAHAR 3D binolari (`building-3d`, tayl
   * ekstruziyasi) YOQIQ qolsinmi.
   *
   * Default (`false`/berilmagan) — ILGARIGIDEK bostiriladi (pastdagi
   * "3D REJIMDA KAMPUS BUZILARDI" izohiga qarang): tayl binosi va kampus
   * o'zining bino konturi BIR XIL joyda, turli balandlikda — z-fighting va
   * "kontur pierc" xatarli (Geo Analitika, Hodisalar HUD shu holatda
   * qoladi, ular ko'p kampusni bir vaqtda ko'rsatadi).
   *
   * `true` — Boshqaruv paneli (`Map3D.tsx`, foydalanuvchi so'rovi: "xarita
   * to'liq 3d bo'lishi kerak, hozir faqat muassasa 3d qolgani 2d"). Bu
   * yerda DOIM faqat BITTA kampus (yoki umuman yo'q — `overview`) ko'rinadi
   * va kadr shunga TOR yaqinlashtirilgan, ya'ni z-fighting xavfi FAQAT o'sha
   * bitta binoning o'zida — atrofdagi shahar esa endi 3D bo'lib, xarita
   * "yarim tekis" ko'rinmaydi.
   */
  forceCitySkyline3D?: boolean;
  /**
   * Muassasa tanlanmagan va `campusAreas !== "selected"` bo'lganda (masalan
   * "Umumiy xarita" tugmasi) kadr NIMAGA moslanadi.
   *
   * Default (`false`/berilmagan) — kuzatuvdagi HUDUDLAR (`areasBounds`)
   * bo'yicha, ya'ni faqat kuzatuv olib borilayotgan muassasalar
   * klasterining bounding box'i (Geo Analitikaning ilgaridan ishlatilib
   * kelinayotgan xatti-harakati — hozircha 7 tasi ham Toshkentda,
   * `fitCampusBounds` shu bilan bog'liq).
   *
   * `true` — Boshqaruv paneli (`Map3D.tsx`, foydalanuvchi so'rovi: "umumiy
   * xaritani bosganida butun o'zbekiston xaritasni chiqarishi kerak").
   * Muassasalar klasteri BITTA shahar (Toshkent) ichida bo'lgani uchun
   * `areasBounds` bilan fit qilinsa kadr ATIGI Toshkent atrofini
   * ko'rsatardi — "umumiy" ATAMASINING o'ziga zid. Bu holatda
   * `UZ_CENTER`/`UZ_ZOOM` (`config/mapConfig.ts`) ga to'g'ridan-to'g'ri
   * uchiladi — respublikaning HAQIQIY milliy kadri, muassasalar
   * qayerda joylashganidan qat'i nazar.
   */
  overviewFitsCountry?: boolean;
  /**
   * Kadrni shu nuqtaga olib borish.
   *
   * ⚠️ `nonce` — AYNI koordinataga QAYTA uchish uchun. Effekt deps'i
   * `lat/lng/zoom` dan iborat, shuning uchun bir xil nuqta ikkinchi marta
   * berilsa hech nima bo'lmasdi ("Umumiy" tugmasi: xarita respublika
   * ko'rinishiga qaytishi kerak, lekin koordinata o'zgarmagani uchun
   * kamera kampusda qolib ketardi).
   */
  focus?: { lat: number; lng: number; zoom?: number; nonce?: number } | null;
  /** O'zbekistondan tashqarini qoraytirish. */
  highlightCountry?: boolean;
  /** Faqat shu hudud yorug' qoladi — qolgani qorong'u maska. */
  spotlightRegion?: string | null;
  /** Qo'shimcha qoraytirish qatlami (HUD fon rejimi). */
  dim?: boolean;
  /**
   * Xarita uslubini mavzudan QAT'IY NAZAR belgilaydi.
   *
   * Hodisalar HUD'i — "katta ekran" (nazorat xonasi) ko'rinishi: ramka,
   * yoy va porlashlar qorong'i fon uchun chizilgan. Yorug' rejimda xarita
   * oqarib ketsa, qorong'i ramka ichida oq xarita — nomuvofiq ko'rinish
   * chiqadi. Shuning uchun u yerda xarita DOIM qorong'i qoladi.
   */
  themeOverride?: "dark" | "light";
  /** 3D (qiyalik) tugmasini ko'rsatish. */
  show3DToggle?: boolean;
  /** Xarita darhol qiya (3D) holatda ochilsin — ko'tarilgan hududlar ko'rinsin. */
  initial3D?: boolean;
  /** 3D tugmasi joyi — Tailwind klasslari. HUD'da ramka qavsi va yoysimon
   *  footer bor, shuning uchun joyni chaqiruvchi belgilaydi. */
  toggle3DClassName?: string;
  /** `[]` — hech qanday boshqaruv tugmasi chiqmaydi. */
  controls?: string[];
  /**
   * `zoomControl` (+/−) qayerda tursin. Default `"top-right"`.
   *
   * Geo Analitikada yuqori-o'ngda "Muassasalar" tugmasi va rang izohi bor —
   * u yerda +/− ular bilan ustma-ust tushardi, shuning uchun sahifa
   * `"bottom-right"` beradi.
   */
  controlPosition?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  /**
   * `false` — xarita sichqoncha/klaviaturaga UMUMAN javob bermaydi (sudrash,
   * zoom, aylantirish yo'q). Faqat MOUNT'da o'qiladi. Default `true`.
   * Boshqaruv paneli RADARI fonida ishlatiladi — u yerda xarita bezak,
   * bosish radar nuqtalariga tegishli.
   */
  interactive?: boolean;
  /**
   * Burchakni (bearing) doimiy sekin aylantirish, daraja/soniya. `0` — yo'q.
   * Tab yashirin bo'lsa yoki xarita boshqa animatsiyada bo'lsa (masalan,
   * kampusga `fitBounds`) to'xtab turadi; `prefers-reduced-motion` da
   * umuman ishlamaydi. Radar foni uchun (2026-09-11).
   */
  autoRotate?: number;
  /**
   * Xarita tayyor bo'lganda uning O'ZINI beradi (unmount'da `null`).
   *
   * ⚠️ **FAQAT PROYEKSIYA UCHUN** — chaqiruvchi xarita ustiga o'zining
   * qatlamini chizmoqchi bo'lganda (radar: kameraning EKRANDAGI joyini
   * bilish, `map.project([lng,lat])`). Xaritaning O'ZINI shu yo'l bilan
   * o'zgartirish (qatlam qo'shish, `setStyle`, marker yasash) MUMKIN
   * EMAS: bu komponent uslub almashganda hamma qatlamni qayta quradi
   * (`styleEpoch`) va tashqaridan qo'shilgani jim yo'qoladi. Yangi
   * imkoniyat kerak bo'lsa — SHU faylga prop qo'shiladi (loyiha
   * konvensiyasi).
   */
  onMapReady?: (map: MlMap | null) => void;
  className?: string;
}

type Status = "loading" | "ready" | "error";

/** Kampus yorlig'i nuqtadan shuncha piksel tepada turadi (CSS bilan mos). */
const LABEL_OFFSET = 26;

const SRC_REGIONS = "app-regions";
const SRC_CAMPUS = "app-campus-areas";
const SRC_CAMPUS_LBL = "app-campus-bld-label-src";
const SRC_CAMPUS_BLD = "app-campus-buildings";
const SRC_CAMPUS_TREE = "app-campus-trees-src";
const SRC_CAMPUS_FACADE = "app-campus-facade-src";
const SRC_MASK = "app-mask";
const SRC_ROUTE = "app-route";

/** Kampus hududi shuncha metrga "ko'tariladi" — yerdagi "maydoncha" bo'lib
 *  ko'rinsin (Campus3D dagi yashil hovli kabi), binolarni bekitmasin. */
const CAMPUS_EXTRUSION_H = 3;

/* Palitra — `Campus3D.tsx` bilan BIR XIL: hudud yashil hovli, ichidagi binolar
   ochiq kul-ko'k, chegara yorqin sian. Rang o'zgartirilsa ikkalasida birga. */
const CAMPUS_GROUND = "#2E7D5B";
const CAMPUS_EDGE = "#85E0FF";
const CAMPUS_BUILDING = "#7E97B4";
/** NOMI BOR bino — bu biz biladigan obyekt, shuning uchun ochroq va aniqroq. */
const CAMPUS_BUILDING_NAMED = "#96AECB";
/** Tom lentasi (parapet) — devordan ochroq, Campus3D dagi `BAND_CAMPUS` kabi. */
const CAMPUS_ROOF = "#A9BFD6";
const CAMPUS_ROOF_NAMED = "#CFE0F0";

/* ── 179-MAKTAB FASADI palitrasi (`facadeToGeoJson`) ──
   Yengil, teksturasiz: hammasi bitta `fill-extrusion` qatlamida,
   rang `kind` bo'yicha tanlanadi. */
const FACADE_PLINTH = "#39434F"; // qorong'i beton poydevor
const FACADE_BAND = "#7E93AB"; // qavatlararo lenta (fasaddan to'qroq)
const FACADE_CORNICE = "#B9CBDE"; // tom karnizi (fasaddan ochroq)
const FACADE_FRAME = "#1B2430"; // deraza romi — deyarli qora
const FACADE_GLASS = "#2E4E6E"; // to'q ko'k-kulrang shisha
/* Tom — ATAYLAB neytral KULRANG (fasadning ko'k-kulrangidan farqli):
   yuqoridan qaralganda tom bino tanasidan ajralib tursin. */
const FACADE_ROOF = "#8A9299"; // kulrang plita
const FACADE_ROOF_EDGE = "#4E555C"; // plita ostidagi to'q qirra (soya)

/** Parapet balandligi, metr — tomga aniq qirra beradi. */
const PARAPET_H = 1.1;

/** Devor/tom rangi — nomi bor binolar ajralib tursin.
 *  Tip `any`: MapLibre ifodalari uchun faylda qabul qilingan uslub
 *  (`regionColorExpression()` ham shunday). */
const wallColorExpr: any = ["case", ["!=", ["get", "name"], ""], CAMPUS_BUILDING_NAMED, CAMPUS_BUILDING];
const roofColorExpr: any = ["case", ["!=", ["get", "name"], ""], CAMPUS_ROOF_NAMED, CAMPUS_ROOF];

/** Kampus qatlamlari — filtr hammasiga birdek qo'llanadi. */
const CAMPUS_LAYERS = [
  "app-campus-3d",
  "app-campus-glow",
  "app-campus-line",
  "app-campus-bld-edge",
  "app-campus-buildings",
  "app-campus-roof",
  "app-campus-building-label",
  "app-campus-trees",
  "app-campus-facade",
] as const;

/**
 * Kampus qatlamlariga filtr — FAQAT MAVJUD bo'lganlariga.
 *
 * 🔴 **"Cannot filter non-existing layer" XATOSI** (2026-09-14,
 * foydalanuvchi konsoldan xabar qildi). `CAMPUS_LAYERS` — ro'yxat,
 * lekin qatlamlarning HAMMASI ham har doim qo'shilavermaydi: masalan
 * `app-campus-trees` yashil zona topilmasa (kampusda daraxt nuqtasi
 * chiqmasa) UMUMAN yaratilmaydi. Ro'yxat bo'ylab ko'r-ko'rona
 * `setFilter` chaqirilsa MapLibre xato hodisasini otadi, u esa
 * `map.on("error")` da "tile/source" naqshiga TUSHMAGANI uchun
 * xaritani `status: "error"` ga o'tkazib yuborardi — natijada xarita
 * o'rniga bo'sh ekran qolardi.
 */
function setCampusFilter(map: MlMap, filter: Parameters<MlMap["setFilter"]>[1]): void {
  for (const id of CAMPUS_LAYERS) {
    if (map.getLayer(id)) map.setFilter(id, filter);
  }
}


/**
 * **DARAXT IKONKASI — canvas'da chiziladi** (2026-09-05).
 *
 * ⚠️ Loyiha TO'LIQ OFFLINE: sprite yoki PNG yuklab bo'lmaydi, uslub
 * sprite'ida esa daraxt yo'q. Shuning uchun ikonka ishga tushganda
 * `<canvas>` da chizilib, `map.addImage()` bilan ro'yxatga qo'shiladi.
 *
 * Ikki tur: `k=0` — bargli (dumaloq shox), `k=1` — ignabargli (konus).
 * Ikkalasi ham yuqoridan yorug', pastdan qoramtir — qiya qaralganda
 * hajm taassuroti beradi (Yandex xaritasidagi kabi).
 *
 * `pixelRatio: 2` — ikonka retinada ham aniq chiqsin.
 */
function treeIcon(kind: 0 | 1): ImageData | null {
  if (typeof document === "undefined") return null;
  const S = 64;
  const c = document.createElement("canvas");
  c.width = S;
  c.height = S;
  const g = c.getContext("2d");
  if (!g) return null;

  /* Soya — daraxt "yerga tegib turgandek" ko'rinsin. */
  g.fillStyle = "rgba(0,0,0,0.22)";
  g.beginPath();
  g.ellipse(S / 2, S - 7, 13, 5, 0, 0, Math.PI * 2);
  g.fill();

  // Tana
  g.fillStyle = "#5B4630";
  g.fillRect(S / 2 - 3, S - 20, 6, 14);

  const crown = g.createLinearGradient(0, 8, 0, S - 14);
  if (kind === 0) {
    crown.addColorStop(0, "#8FD98A");
    crown.addColorStop(1, "#3E8C55");
    g.fillStyle = crown;
    /* Bargli — uchta ustma-ust doira (bitta doiradan tabiiyroq). */
    g.beginPath();
    g.arc(S / 2, 26, 17, 0, Math.PI * 2);
    g.arc(S / 2 - 11, 34, 12, 0, Math.PI * 2);
    g.arc(S / 2 + 11, 34, 12, 0, Math.PI * 2);
    g.fill();
  } else {
    crown.addColorStop(0, "#7FC98F");
    crown.addColorStop(1, "#2E7048");
    g.fillStyle = crown;
    /* Ignabargli — uchta konus qavat. */
    for (let i = 0; i < 3; i++) {
      const top = 6 + i * 12;
      const w = 11 + i * 5;
      g.beginPath();
      g.moveTo(S / 2, top);
      g.lineTo(S / 2 - w, top + 18);
      g.lineTo(S / 2 + w, top + 18);
      g.closePath();
      g.fill();
    }
  }

  return g.getImageData(0, 0, S, S);
}

/** Uslubdagi yagona shrift to'plami (`public/map/style-dark.json`). */
const MAP_FONT = ["Noto Sans Regular"];

/* ───────────────────── 3D binolar (`fill-extrusion`) ─────────────────────
   OpenMapTiles sxemasidagi `building` qatlami — `render_height` va
   `render_min_height` maydonlari tayl ichida tayyor keladi.

   V3 da bu uslub JSON'iga qo'shilardi (`mapStyle.ts` uslubni fetch qilib
   tahrirlaydi). V2 da uslub MapLibre'ga URL sifatida beriladi va
   same-origin'ga `transformRequest` keltiradi — shuning uchun qatlam uslub
   yuklangach RUNTIME da qo'shiladi. Natija bir xil, lekin V2 ning uslub
   yuklash yo'li (lokal `public/map/style-dark.json` yoki serverdagi uslub)
   o'zgarishsiz qoladi. */

/** Ekstruziya qatlamining id'si — 3D tugmasi shuni yoqib/o'chiradi. */
const BUILDING_3D_LAYER = "building-3d";
/** Uslubdagi tekis (2D) bino qatlami — 3D yoqilganda yashiriladi. */
const BUILDING_FLAT_LAYER = "building";
/** Tayllarda bino geometriyasi shu zoomdan boshlab bor. */
const BUILDING_3D_MINZOOM = 14;

/**
 * Shu zoomdan boshlab foydalanuvchi "shahar/kampus" ko'lamida deb hisoblanadi.
 *
 * 3D tugmasi kadrni faqat shu chegaradan yuqorida yaqinlashtiradi va buradi.
 * Pastroqda (respublika/viloyat ko'rinishi) kadr JOYIDA qoladi — aks holda
 * butun O'zbekiston ko'rinishi bir bosishda ko'chaga yaqinlashib ketardi.
 */
const NEAR_BUILDING_ZOOM = 12;

/** 3D kamera burchagi — "Smart Campus" izometrik ko'rinishiga eng yaqini. */
const PITCH_3D = 52;
const BEARING_3D = 42;

/**
 * Uslubdagi vektor manba nomi. Odatda `openmaptiles`, lekin serverdagi uslub
 * boshqacha nomlashi mumkin — shuning uchun topib olamiz.
 */
function vectorSourceId(map: MlMap): string | null {
  const sources = map.getStyle()?.sources ?? {};
  if (sources.openmaptiles) return "openmaptiles";
  for (const [id, src] of Object.entries(sources)) {
    if ((src as { type?: string }).type === "vector") return id;
  }
  return null;
}

/**
 * 3D binolar qatlamini uslubga qo'shadi (bir marta, yashirin holatda).
 *
 * DIQQAT — qatlam YORLIQLARDAN PASTGA qo'yiladi (`beforeId` = birinchi
 * `symbol`), aks holda ko'cha nomlari ekstruziya ostida ko'rinmay qoladi.
 *
 * Balandliklar OSM'dan: `height`/`building:levels` yozilmagan binoga server
 * default qiymat beradi, ya'ni 3D shahar TAXMINIY.
 */
function addBuilding3DLayer(map: MlMap): void {
  if (map.getLayer(BUILDING_3D_LAYER)) return;
  const source = vectorSourceId(map);
  if (!source) return;

  const layers = map.getStyle()?.layers ?? [];
  const firstSymbol = layers.find((l) => l.type === "symbol")?.id;

  map.addLayer(
    {
      id: BUILDING_3D_LAYER,
      type: "fill-extrusion",
      source,
      "source-layer": "building",
      minzoom: BUILDING_3D_MINZOOM,
      layout: { visibility: "none" },
      paint: {
        // Balandroq bino ochroq — tekis rangda hajm umuman ko'rinmaydi
        "fill-extrusion-color": [
          "interpolate",
          ["linear"],
          ["to-number", ["coalesce", ["get", "render_height"], 6]],
          0, "#18233D",
          12, "#22314F",
          30, "#2D4064",
          60, "#3A5079",
        ],
        "fill-extrusion-height": ["to-number", ["coalesce", ["get", "render_height"], 6]],
        "fill-extrusion-base": ["to-number", ["coalesce", ["get", "render_min_height"], 0]],
        "fill-extrusion-opacity": 0.92,
      },
    } as never,
    firstSymbol
  );
}

/**
 * 🔴 **`building-3d` ni KAMPUS qatlamlaridan PASTGA tushirish.**
 *
 * ⚠️ **MUAMMO** (foydalanuvchi xabar qildi, 2026-09-05): 2D da kampus
 * binosi to'g'ri ko'rinadi, 3D tugmasi bosilganda esa "buzilib ketadi"
 * — bino orasidan TO'Q KO'K xanjarlar chiqadi.
 *
 * **SABABI:** `building-3d` — vektor tayldagi OSM binolarining
 * ekstruziyasi. Kampus binolari o'sha OSM'da HAM bor, lekin
 * `mk-179.json` dagi konturlar boshqa manbadan (OSM + Microsoft ML)
 * va biroz FARQ qiladi. Ustiga kampus binolari `CAMPUS_EXTRUSION_H`
 * (3 m) dan boshlanadi, tayldagi bino esa NOLDAN — ya'ni ikkalasi
 * bir joyda, turli balandlikda va yaqin sirtlarda **z-fighting**
 * beradi, farq qilgan joyda esa tayl binosi kampus maydonchasini
 * TESHIB chiqadi.
 *
 * ⚠️ `addBuilding3DLayer()` `map.on("load")` da, kampus qatlamlari esa
 * `status === "ready"` dan KEYIN qo'shiladi — ikkalasi ham
 * `beforeId = firstSymbol` bilan, ya'ni kampus yuqorida turadi.
 * Lekin `fill-extrusion` uchun QATLAM TARTIBI yetarli emas: chuqurlik
 * buferi umumiy, shuning uchun tayl binosining kampusdan baland
 * qismi baribir ko'rinadi.
 *
 * **YECHIM:** kampus ko'rinayotganda tayl ekstruziyasi
 * O'CHIRILADI (`suppressed`). Shahar konteksti YO'QOLMAYDI — 3D
 * o'chganda qaytadi, va kampus ko'rinmaydigan sahifalarda
 * (`campusAreas` berilmagan) qatlam avvalgidek ishlaydi.
 */
function setBuilding3D(map: MlMap, on: boolean, suppressed = false): void {
  if (map.getLayer(BUILDING_3D_LAYER)) {
    map.setLayoutProperty(BUILDING_3D_LAYER, "visibility", on && !suppressed ? "visible" : "none");
  }
  /* Tekis bino qatlami 3D bilan birga chizilsa ekstruziya tagida "soya"
     bo'lib qoladi. Ekstruziya BOSTIRILGAN bo'lsa esa u KERAK — aks
     holda kampus atrofi butunlay bo'sh qolardi. */
  if (map.getLayer(BUILDING_FLAT_LAYER)) {
    map.setLayoutProperty(BUILDING_FLAT_LAYER, "visibility", on && !suppressed ? "none" : "visible");
  }
}

/** Dunyo to'rtburchagi — maska tashqi halqasi ([lng, lat]). */
const WORLD_RING: [number, number][] = [
  [-180, -85],
  [180, -85],
  [180, 85],
  [-180, 85],
  [-180, -85],
];

/**
 * Viloyat geojson'i (~170 KB) — BIR MARTA yuklanib, tahlil qilinadi.
 *
 * Uni uchta effekt ishlatadi (poligonlar, tanlangan viloyat fitBounds,
 * spotlight maskasi) va viloyat har almashtirilganda qaytadan `fetch` + `json()`
 * qilinardi — brauzer keshdan bersa ham 170 KB'ni har safar tahlil qilish
 * sezilarli. Modul darajasidagi promise buni yo'q qiladi.
 */
let regionsPromise: Promise<{ features?: any[] }> | null = null;

function loadRegions(): Promise<{ features?: any[] }> {
  regionsPromise ??= fetch(REGIONS_GEOJSON_URL)
    .then((r) => r.json())
    .catch((e) => {
      regionsPromise = null; // xato keshda qolmasin — keyingi urinish qayta so'raydi
      throw e;
    });
  return regionsPromise;
}

/** GeoJSON geometriyadan barcha tashqi halqalarni oladi ([lng, lat] saqlanadi). */
function outerRings(geometry: { type: string; coordinates: any }): [number, number][][] {
  const polys: any[] = geometry.type === "MultiPolygon" ? geometry.coordinates : [geometry.coordinates];
  return polys.map((p: any) => p[0] as [number, number][]);
}

function ringsBounds(rings: [number, number][][]): LngLatBoundsLike | null {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  for (const r of rings) {
    for (const [lng, lat] of r) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  }
  return Number.isFinite(minLng) ? [[minLng, minLat], [maxLng, maxLat]] : null;
}

/** Viloyat rangi — `match` ifodasi. `override` berilsa o'sha jadval ishlatiladi
 *  (Geo Analitika ko'rsatkich bo'yicha bo'yaydi), aks holda `REGION_COLORS`. */
function regionColorExpression(override?: Record<string, string> | null): any {
  const table = override && Object.keys(override).length > 0 ? override : REGION_COLORS;
  const cases: any[] = ["match", ["get", "region_name"]];
  for (const [name, color] of Object.entries(table)) cases.push(name, color);
  cases.push("#334155"); // default
  return cases;
}

/** Brauzerda WebGL bormi — MapLibre'siz, arzon tekshiruv. */
function hasWebgl(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Marker uchun DOM — CSS `.ymk*` klasslari YandexMap bilan bir xil qoladi. */
export function markerElement(m: YMarker): HTMLElement {
  const root = document.createElement("div");
  root.style.setProperty("--ymk", m.color);
  if (m.tooltip) root.title = m.tooltip;

  if (m.kind === "camera") {
    /* ── KUZATUV KAMERASI ──
       Uch qatlam: ko'rish KONUSI (agar yo'nalish ma'lum bo'lsa) →
       korpus + linza + kronshteyn → holat nuqtasi. `label` berilgan
       bo'lsa yonida HODISA SONI rozetkasi chiqadi.

       ⚠️ Hammasi DOM/CSS: MapLibre markerlari HTML elementlari, ya'ni
       bu yerda "low-poly model" — yengil inline SVG. Yangi bog'liqlik
       ham, kanvas ham kerak emas.

       ⚠️ Konus FAQAT `heading` berilganda chiziladi. Yo'nalish
       ma'lumoti kuzatuv postidan kelmaydi — o'ylab topilmaydi
       (`cameraHeading()` izohiga qarang). */
    root.className =
      "ymk ymk-cam" +
      (m.selected ? " is-selected" : "") +
      (m.status ? ` is-${m.status}` : "");

    const cone =
      typeof m.heading === "number"
        ? `<span class="ymk-cam-fov${m.ptz ? " is-ptz" : ""}" style="--cam-dir:${m.heading.toFixed(1)}deg"></span>`
        : "";

    root.innerHTML =
      cone +
      '<span class="ymk-cam-body">' +
      /* ⚠️ **IKONKA 2026-09-07 da ALMASHTIRILDI** (foydalanuvchi so'rovi:
         "kamera iconini o'zgartir, eng yaxshi mos icon qo'y"). Ilgari bu
         yerda Phosphor `SecurityCamera` (burchakdan qaralgan CCTV
         korpusi, ko'p detalli) turardi — 15×15 markerda mayda chiziqlari
         qorishib, "qora dog'" bo'lib ko'rinardi (ayniqsa Boshqaruv
         panelidagi to'q `#333` rangda). Endi — klassik KAMKORDER
         silueti (korpus to'rtburchagi + tomosha oynasi uchburchagi +
         linza nuqtasi): kamroq chiziq, istalgan rangda (och ko'k ham,
         to'q kulrang ham) aniq o'qiladi. Butun ilovada BITTA ikonka
         (Geo Analitika, Hodisalar HUD, Boshqaruv paneli) — rang esa har
         sahifaning O'ZI beradi (`m.color`), shakl umumiy. */
      '<svg viewBox="0 0 24 24" width="15" height="15" fill="#fcfffc" aria-hidden>' +
      '<rect x="2" y="6.4" width="12.6" height="10.2" rx="2.6" />' +
      '<circle cx="6.9" cy="11.5" r="3.15" fill="#172c66" fill-opacity="1" />' +
      '<path d="M15.7 10.1 21.3 6.8c.82-.49 1.86.1 1.86 1.06v8.28c0 .96-1.04 1.55-1.86 1.06l-5.6-3.3Z" />' +
      "</svg>" +
      '<i class="ymk-cam-led"></i>' +
      "</span>" +
      (m.label ? `<span class="ymk-cam-count">${m.label}</span>` : "");
  } else if (m.kind === "alert") {
    // Hodisa markeri — yerdagi nuqtadan ustun, tepasida ogohlantirish uchburchagi
    root.className = "ymk ymk-alert";
    root.innerHTML =
      '<span class="ymk-alert-base"></span>' +
      '<span class="ymk-alert-stem"></span>' +
      '<span class="ymk-alert-badge">' +
      '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden>' +
      '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>' +
      '<path d="M12 9v4"/><path d="M12 17h.01"/>' +
      "</svg></span>" +
      /* Ixtiyoriy SANOQ rozetkasi — "shu nuqtada nechta signal".
         Kamera markeridagi bilan AYNI sinf: uslub bir joyda tursin. */
      (m.label ? `<span class="ymk-cam-count">${m.label}</span>` : "");
  } else if (m.kind === "stat") {
    /* Raqamli nishon — hudud ustida "shuncha" degan quticha va pastga
       qaragan strelka. Xarita RANGI o'zgarmaydi: butun ma'no shu markerda. */
    root.className = "ymk ymk-stat";
    root.innerHTML =
      `<span class="ymk-stat-badge">${m.label ?? ""}</span>` +
      '<span class="ymk-stat-arrow"></span>';
  } else if (m.kind === "dot") {
    /* Kichik nuqta — muassasa joylashuvi. Yorliq YO'Q: respublika ko'lamida
       645 nom bir-birini bosib ketardi, nuqta esa faqat "shu yerda bor"
       degan ma'noni beradi. Tafsilot `title` (hover) da. */
    root.className = "ymk ymk-pin";
    root.innerHTML = '<span class="ymk-pin-dot"></span>';
  } else if (m.kind === "campus") {
    root.className = `ymk ymk-campus${m.alert ? " ymk-campus--alert" : ""}`;
    root.innerHTML =
      '<span class="ymk-campus-base"></span>' +
      '<span class="ymk-campus-stem"></span>' +
      '<div class="ymk-campus-card">' +
      `<b class="ymk-campus-name">${m.label ?? ""}</b>` +
      `<i class="ymk-campus-sub">${m.sub ?? ""}</i>` +
      "</div>";
  } else {
    root.className = "ymk";
    root.innerHTML = `<span class="ymk-dot${m.pulse ? " pulse" : ""}"></span>`;
  }
  return root;
}

/**
 * OFFLINE xarita — MapLibre GL + ichki tarmoqdagi TileServer GL.
 *
 * Barcha so'rovlar same-origin `/tiles/...` orqali ketadi: uslub ichidagi
 * mutlaq manzillar (`http://<tile-server>/...`) `transformRequest` da joriy
 * `TILES_BASE` ga qayta yoziladi, shuning uchun tile server manzili o'zgarsa
 * faqat `config/services.mjs` reyestridagi `tiles` yozuvi almashtiriladi.
 */
const MapLibreGlMap = memo(function MapLibreGlMap({
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
  forceCitySkyline3D = false,
  overviewFitsCountry = false,
  focus = null,
  highlightCountry = false,
  spotlightRegion = null,
  dim = false,
  themeOverride,
  show3DToggle = false,
  initial3D = false,
  toggle3DClassName = "left-3 top-3",
  controls,
  controlPosition = "top-right",
  interactive = true,
  autoRotate = 0,
  onMapReady,
  className,
}: MapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  /* ⚠️ REF orqali — chaqiruvchilar bu funksiyani odatda JOYIDA yozadi
     (`onMapReady={(m) => …}`), ya'ni har renderda YANGI havola bo'ladi.
     Effekt dep'iga to'g'ridan-to'g'ri qo'yilsa xarita har renderda qayta
     qurilardi (`useModalHistory` dagi bilan AYNI naqsh). */
  const onReadyRef = useRef(onMapReady);
  onReadyRef.current = onMapReady;
  const markersRef = useRef<Marker[]>([]);
  /** Kampus markerlari — yorliq to'qnashuvini hisoblash uchun. */
  const campusRef = useRef<{ el: HTMLElement; lng: number; lat: number }[]>([]);
  const popupRef = useRef<Popup | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  /** Ekranda ko'rsatiladigan HAQIQIY sabab (umumiy matn o'rniga). */
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [is3D, setIs3D] = useState(initial3D);
  /** Kampus qatlamlari qo'shildimi — ular ASINXRON yuklanadi, tanlov effekti
   *  shundan keyin ishlashi kerak (aks holda birinchi `fitBounds` yo'qoladi). */
  const [campusReady, setCampusReady] = useState(false);
  /**
   * Uslub avlodi. `map.setStyle()` BARCHA qatlam va manbalarni o'chiradi
   * (viloyatlar, kampuslar, maska, 3D binolar) — shuning uchun uslub
   * almashgach bu raqam oshiriladi va ularni qo'shadigan effektlar
   * qaytadan ishlaydi. Aks holda yorug' rejimga o'tganda xarita
   * "yalang'och" qolardi.
   */
  const [styleEpoch, setStyleEpoch] = useState(0);
  const autoTheme = useScheme();
  const tMap = useT().dashboard.ui.map;
  const theme = themeOverride ?? autoTheme;

  // Boshlang'ich ko'rinish faqat mount'da o'qiladi (keyin xarita qayta yaratilmaydi)
  const initialCenter = useRef(center ?? UZ_CENTER).current;
  const initialZoom = useRef(zoom ?? UZ_ZOOM).current;
  const initialControls = useRef(controls ?? ["zoomControl"]).current;
  // Xarita bir marta yaratiladi — boshqaruv joyi ham faqat mount'da o'qiladi
  const initialControlPos = useRef(controlPosition).current;
  // Xarita bir marta yaratiladi — boshlang'ich qiyalik ham faqat mount'da o'qiladi
  const initialPitched = useRef(initial3D).current;
  const initialStyle = useRef(mapStyleFor(theme)).current;
  // Interaktivlik MlMap konstruktorida beriladi — faqat mount'da o'qiladi
  const initialInteractive = useRef(interactive).current;

  const onSelectRef = useRef(onSelectRegion);
  onSelectRef.current = onSelectRegion;
  const onSelectCampusRef = useRef(onSelectCampus);
  onSelectCampusRef.current = onSelectCampus;
  const onBuildingClickRef = useRef(onBuildingClick);
  onBuildingClickRef.current = onBuildingClick;
  /* Qatlam BIR MARTA quriladi, keyin faqat `paint` yangilanadi — shuning uchun
     joriy rang jadvali ref'da (qatlam qurilish effekti unga bog'lanmasin). */
  const regionColorsRef = useRef(regionColors);
  regionColorsRef.current = regionColors;
  const regionOpacityRef = useRef(regionFillOpacity);
  regionOpacityRef.current = regionFillOpacity;
  /* Kampus qatlami ASINXRON yuklanadi — o'sha paytdagi qiymat kerak. */
  const fitCampusBoundsRef = useRef(fitCampusBounds);
  fitCampusBoundsRef.current = fitCampusBounds;
  /* Kampus ko'rsatilyaptimi — `setBuilding3D` tayl ekstruziyasini shunga
     qarab bostiradi (funksiya izohiga qarang). Ref, chunki u `map.on`
     ichidagi eski closure'dan ham o'qiladi. */
  const campusAreasRef = useRef(campusAreas);
  campusAreasRef.current = campusAreas;
  /** `forceCitySkyline3D` — xuddi shu sababdan REF (eski closure'dan ham
   *  o'qiladi, `setBuilding3D` chaqiruvchi joylarga qarang). */
  const forceCitySkyline3DRef = useRef(forceCitySkyline3D);
  forceCitySkyline3DRef.current = forceCitySkyline3D;
  /** `setBuilding3D`ning `suppressed` argumenti — kampus ko'rinib turibdi
   *  VA chaqiruvchi shahar 3D'sini majburlamagan bo'lsa TRUE. */
  const citySuppressed = () => !!campusAreasRef.current && !forceCitySkyline3DRef.current;
  /* Kampus TANLANGANmi — hudud effekti shuni tekshiradi (pastga qarang:
     "4) Tanlangan viloyat"). Ref, chunki qiymat effekt DEPS'iga kirsa
     effekt kampus almashganda ham qayta ishga tushib, kadrni viloyatga
     tortib ketardi. */
  const campusPickedRef = useRef<string | null>(selectedCampusId);
  campusPickedRef.current = selectedCampusId;
  /** Rang jadvali o'zgarganini aniqlash uchun barqaror kalit. */
  const regionColorsKey = regionColors ? Object.entries(regionColors).map(([k, v]) => `${k}=${v}`).join(",") : "";

  /* Avto-aylanish (`autoRotate`) — burchak har kadrda sekin o'zgaradi.
     `isMoving()` — kampusga uchish (`fitBounds`) paytida aralashmaymiz,
     aks holda uchish yarim yo'lda to'xtab qolardi. `dt` 100 ms bilan
     cheklangan: tab qaytganda burchak birdan "sakramasin". */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready" || !autoRotate) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(now - last, 100) / 1000;
      last = now;
      if (!document.hidden && !map.isMoving()) map.setBearing(map.getBearing() + autoRotate * dt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [status, autoRotate]);

  /* 1) Xaritani bir marta yaratamiz */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    let cancelled = false;

    // WebGL yo'q bo'lsa MapLibre umuman ishlamaydi (eski GPU, RDP sessiya,
    // brauzerda apparat tezlashtirish o'chirilgan) — buni ALOHIDA aytamiz,
    // aks holda "server javob bermadi" degan noto'g'ri xabar chiqardi.
    if (!hasWebgl()) {
      setErrorMsg("Brauzerda WebGL ishlamayapti — xarita chizilmaydi. Brauzer sozlamalarida apparat tezlashtirishni (hardware acceleration) yoqing yoki boshqa brauzerda oching.");
      setStatus("error");
      return;
    }

    let map: MlMap;
    try {
      map = new MlMap({
        container: containerRef.current,
        style: initialStyle,
        center: [initialCenter[1], initialCenter[0]], // [lat,lng] → [lng,lat]
        zoom: initialZoom,
        maxZoom: MAP_MAX_ZOOM,
        // 3D hududlar (fill-extrusion) faqat qiya ko'rinishda seziladi —
        // shuning uchun kerak bo'lsa xarita darhol qiya ochiladi
        pitch: initialPitched ? PITCH_3D : 0,
        bearing: initialPitched ? BEARING_3D : 0,
        attributionControl: false,
        interactive: initialInteractive,
        // Uslub ichidagi mutlaq tile-server manzillari → joriy manbaga
        transformRequest: (url: string) => ({
          url: url.replace(/^https?:\/\/[^/]+(?=\/(?:styles|data|fonts|sprites?)\/)/, TILES_BASE),
        }),
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setStatus("error");
      return;
    }
    mapRef.current = map;

    if (initialControls.includes("zoomControl")) {
      map.addControl(new NavigationControl({ showCompass: false }), initialControlPos);
    }
    if (initialControls.includes("fullscreenControl")) {
      map.addControl(new FullscreenControl(), initialControlPos);
    }

    map.on("load", () => {
      if (cancelled) return;
      // 3D binolar qatlami — uslub yuklangach qo'shiladi, yashirin turadi
      addBuilding3DLayer(map);
      /* `campusAreas` berilgan sahifada tayl ekstruziyasi kampus
         binolari bilan urishadi — o'chirib qo'yamiz (izohga qarang). */
      if (initialPitched) setBuilding3D(map, true, citySuppressed());
      setStatus("ready");
      /* Proyeksiya kerak bo'lgan chaqiruvchi (radar) xaritaning O'ZINI
         shu yerdan oladi — yuqoridagi `onMapReady` izohiga qarang. */
      onReadyRef.current?.(map);
    });
    map.on("error", (e: any) => {
      if (cancelled) return;
      const msg: string = e?.error?.message ?? String(e?.error ?? e ?? "");
      // DIQQAT: plita/manba xatolari O'TKINCHI — hudud chetidagi bo'sh plita
      // (204/404) ham shu hodisani chiqaradi. Ilgari ular butun xaritani
      // "server javob bermadi" ekrani bilan yopib qo'yardi.
      if (e?.sourceId || e?.tile || /tile|source/i.test(msg)) {
        console.warn("[xarita] plita xatosi (o'tkinchi):", msg);
        return;
      }
      console.error("[xarita] xato:", msg, e);
      setErrorMsg(msg);
      // Xarita allaqachon chizilgan bo'lsa — ekranni yopmaymiz
      setStatus((s) => (s === "ready" ? s : "error"));
    });

    // Konteyner o'lchami o'zgarsa (sidebar yig'ilishi, panel ochilishi)
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);

    return () => {
      cancelled = true;
      ro.disconnect();
      popupRef.current?.remove();
      popupRef.current = null;
      /* Chaqiruvchi xaritaga havolani tashlab yuborsin — `map.remove()`
         dan KEYIN uni ishlatish xatolik beradi. */
      onReadyRef.current?.(null);
      map.remove();
      mapRef.current = null;
    };
  }, [initialCenter, initialZoom, initialControls, initialControlPos, initialPitched, initialStyle, initialInteractive]);

  /* 2) Markerlar — to'liq qayta chizamiz (soni kichik) */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready") return;

    for (const mk of markersRef.current) mk.remove();
    markersRef.current = [];

    for (const m of markers) {
      const el = markerElement(m);
      if (m.onClick) {
        el.style.cursor = "pointer";
        el.addEventListener("click", (ev) => {
          ev.stopPropagation();
          m.onClick?.();
        });
      }
      if (m.hintHtml) {
        el.addEventListener("mouseenter", () => {
          popupRef.current?.remove();
          popupRef.current = new Popup({
            closeButton: false,
            closeOnClick: false,
            offset: m.kind === "campus" ? 44 : 14,
            className: "hik-map-popup",
          })
            .setLngLat([m.lng, m.lat])
            .setHTML(m.hintHtml!)
            .addTo(map);
        });
        el.addEventListener("mouseleave", () => {
          popupRef.current?.remove();
          popupRef.current = null;
        });
      }
      /* `draggable` — kamera joylashtirish rejimida markerni sudrab surish.
         MapLibre surish tugagach markerning YANGI koordinatasini beradi. */
      const marker = new Marker({ element: el, draggable: !!m.draggable })
        .setLngLat([m.lng, m.lat])
        .addTo(map);
      if (m.draggable && m.onDragEnd) {
        const cb = m.onDragEnd;
        marker.on("dragend", () => {
          const { lng, lat } = marker.getLngLat();
          cb({ lat, lng });
        });
      }
      markersRef.current.push(marker);
      if (m.kind === "campus") campusRef.current.push({ el, lng: m.lng, lat: m.lat });
    }

    /**
     * Yorliqlar TO'QNASHUVI — ekranda joy bo'lmasa nom yashiriladi, faqat
     * belgi (nuqta) qoladi. Kichiklashtirilganda yorliqlar bir-birini bosib
     * ketmasligi uchun shu kerak; MapLibre HTML markerlarni o'zi joylashtirmaydi.
     */
    const relayout = () => {
      const m0 = mapRef.current;
      if (!m0) return;
      const placed: { x1: number; y1: number; x2: number; y2: number }[] = [];
      // Ekran markaziga yaqinlari ustunroq — ular avval joy oladi
      const c = m0.getCanvas();
      const cx = c.clientWidth / 2;
      const cy = c.clientHeight / 2;
      const items = campusRef.current
        .map((it) => ({ ...it, p: m0.project([it.lng, it.lat]) }))
        .sort((a, b) => Math.hypot(a.p.x - cx, a.p.y - cy) - Math.hypot(b.p.x - cx, b.p.y - cy));

      for (const it of items) {
        const card = it.el.querySelector<HTMLElement>(".ymk-campus-card");
        if (!card) continue;
        // O'lchamni yashirilgan holatda ham bilish uchun vaqtincha ko'rsatamiz
        it.el.classList.remove("ymk-campus--nolabel");
        const w = card.offsetWidth || 150;
        const h = card.offsetHeight || 34;
        const box = {
          x1: it.p.x - w / 2 - 4,
          y1: it.p.y - LABEL_OFFSET - h - 4,
          x2: it.p.x + w / 2 + 4,
          y2: it.p.y - LABEL_OFFSET + 4,
        };
        const clash = placed.some((p) => box.x1 < p.x2 && box.x2 > p.x1 && box.y1 < p.y2 && box.y2 > p.y1);
        if (clash) it.el.classList.add("ymk-campus--nolabel");
        else placed.push(box);
      }
    };

    let raf = 0;
    const onMove = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(relayout);
    };
    relayout();
    map.on("move", onMove);
    map.on("zoom", onMove);

    return () => {
      cancelAnimationFrame(raf);
      map.off("move", onMove);
      map.off("zoom", onMove);
      for (const mk of markersRef.current) mk.remove();
      markersRef.current = [];
      campusRef.current = [];
    };
  }, [markers, status, styleEpoch]);

  /* 3) Viloyat poligonlari (Geo Analitika) */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready" || !regions) return;

    if (!map.getSource(SRC_REGIONS)) {
      map.addSource(SRC_REGIONS, { type: "geojson", data: REGIONS_GEOJSON_URL });
      map.addLayer({
        id: "app-regions-fill",
        type: "fill",
        source: SRC_REGIONS,
        paint: {
          "fill-color": regionColorExpression(regionColorsRef.current),
          "fill-opacity": regionOpacityRef.current,
        },
      });
      map.addLayer({
        id: "app-regions-line",
        type: "line",
        source: SRC_REGIONS,
        paint: { "line-color": "#8fb3ff", "line-width": 1, "line-opacity": 0.7 },
      });
      // Tanlangan viloyat — alohida yorqin qatlam (filtr bilan boshqariladi)
      map.addLayer({
        id: "app-regions-selected",
        type: "fill",
        source: SRC_REGIONS,
        paint: {
          "fill-color": regionColorExpression(regionColorsRef.current),
          "fill-opacity": Math.min(0.9, regionOpacityRef.current + 0.28),
        },
        filter: ["==", ["get", "region_name"], "___none___"],
      });
      map.addLayer({
        id: "app-regions-selected-line",
        type: "line",
        source: SRC_REGIONS,
        paint: { "line-color": "#60a5fa", "line-width": 3, "line-opacity": 0.95 },
        filter: ["==", ["get", "region_name"], "___none___"],
      });
    }

    const onClick = (e: MapMouseEvent) => {
      const f = map.queryRenderedFeatures(e.point, { layers: ["app-regions-fill"] })[0];
      const name = f?.properties?.region_name as string | undefined;
      if (name) onSelectRef.current?.(name);
    };
    const enter = () => (map.getCanvas().style.cursor = "pointer");
    const leave = () => (map.getCanvas().style.cursor = "");
    map.on("click", "app-regions-fill", onClick);
    map.on("mouseenter", "app-regions-fill", enter);
    map.on("mouseleave", "app-regions-fill", leave);

    return () => {
      map.off("click", "app-regions-fill", onClick);
      map.off("mouseenter", "app-regions-fill", enter);
      map.off("mouseleave", "app-regions-fill", leave);
    };
  }, [regions, status, styleEpoch]);

  /* 3a) Viloyat ranglari — ko'rsatkich almashganda qatlam QAYTA QURILMAYDI,
         faqat `paint` yangilanadi (qayta qurish `fitBounds` va tanlovni yo'qotardi). */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready" || !regions || !map.getLayer("app-regions-fill")) return;
    const expr = regionColorExpression(regionColors);
    map.setPaintProperty("app-regions-fill", "fill-color", expr);
    map.setPaintProperty("app-regions-fill", "fill-opacity", regionFillOpacity);
    if (map.getLayer("app-regions-selected")) {
      map.setPaintProperty("app-regions-selected", "fill-color", expr);
      map.setPaintProperty("app-regions-selected", "fill-opacity", Math.min(0.9, regionFillOpacity + 0.28));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionColorsKey, regionFillOpacity, regions, status, styleEpoch]);

  /* 3b) Kuzatuvdagi hududlar — HAQIQIY kampus chegaralari, 3D ko'tarilgan.
        Butun O'zbekiston/Toshkent poligoni ATAYLAB chizilmaydi (`regions`
        alohida prop) — bu yerda faqat kuzatuv olib borilayotgan joylar. */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready" || !campusAreas) return;
    let cancelled = false;

    loadCampusAreas()
      .then((areas) => {
        if (cancelled || !areas.length || map.getSource(SRC_CAMPUS)) return;
        map.addSource(SRC_CAMPUS, { type: "geojson", data: areasToGeoJson(areas) });
        map.addSource(SRC_CAMPUS_BLD, { type: "geojson", data: buildingsToGeoJson(areas) });
        /* Yorliqlar ALOHIDA nuqta manbasida — poligon manbasida katta bino
           ikki taylga tushib, nomi IKKI MARTA chizilardi. */
        map.addSource(SRC_CAMPUS_LBL, { type: "geojson", data: buildingLabelsToGeoJson(areas) });
        /* Daraxtlar — kampusning YASHIL hududiga (`treesToGeoJson`:
           kampus ichi − binolar − chetdagi yo'lak). */
        map.addSource(SRC_CAMPUS_TREE, { type: "geojson", data: treesToGeoJson(areas) });
        /* 179-maktab fasadi — protsedural derazalar/poydevor/lentalar.
           FAQAT `n === "179-maktab"` binosi uchun (`facadeToGeoJson`). */
        map.addSource(SRC_CAMPUS_FACADE, { type: "geojson", data: facadeToGeoJson(areas) });

        // Yorliqlardan PASTGA — aks holda ko'cha nomlari hudud ostida qoladi.
        // Ketma-ket qo'shilgani uchun tartib: hovli → chegara → binolar.
        const beforeId = (map.getStyle()?.layers ?? []).find((l) => l.type === "symbol")?.id;

        // 1) Hovli — yashil maydoncha (Campus3D dagi kampus hududi kabi)
        map.addLayer(
          {
            id: "app-campus-3d",
            type: "fill-extrusion",
            source: SRC_CAMPUS,
            paint: {
              "fill-extrusion-color": CAMPUS_GROUND,
              "fill-extrusion-height": CAMPUS_EXTRUSION_H,
              "fill-extrusion-base": 0,
              "fill-extrusion-opacity": 0.62,
            },
          },
          beforeId
        );
        // 2) Chegara — ikki chiziq: keng so'nik "nur" + ustidan ingichka yorqin
        map.addLayer(
          {
            id: "app-campus-glow",
            type: "line",
            source: SRC_CAMPUS,
            layout: { "line-join": "round" },
            paint: { "line-color": CAMPUS_EDGE, "line-width": 6, "line-opacity": 0.22, "line-blur": 3 },
          },
          beforeId
        );
        map.addLayer(
          {
            id: "app-campus-line",
            type: "line",
            source: SRC_CAMPUS,
            layout: { "line-join": "round" },
            paint: { "line-color": CAMPUS_EDGE, "line-width": 1.6, "line-opacity": 0.95 },
          },
          beforeId
        );
        // 3) Hudud binolari — HAQIQIY konturlar (OSM + ML), ochiq rangda
        //    ko'tariladi. Tayldagi qorong'i binolar ustidan chizilgani va
        //    konturi 0.6 m kattaroq bo'lgani uchun ular butunlay yopiladi.
        // 3a) Yerdagi kontur — bino poydevoriga aniq qirra beradi
        map.addLayer(
          {
            id: "app-campus-bld-edge",
            type: "line",
            source: SRC_CAMPUS_BLD,
            paint: { "line-color": "#5E7794", "line-width": 0.8, "line-opacity": 0.85 },
          },
          beforeId
        );
        // 3b) Bino tanasi — parapet uchun tepasidan `PARAPET_H` qoldiriladi.
        //     `fill-extrusion-vertical-gradient` (default) devor tagini
        //     qoraytiradi — tekis rangda hajm sezilmaydi.
        map.addLayer(
          {
            id: "app-campus-buildings",
            type: "fill-extrusion",
            source: SRC_CAMPUS_BLD,
            paint: {
              "fill-extrusion-color": wallColorExpr,
              /* DIQQAT — bino KAMPUS MAYDONCHASI USTIDAN boshlanadi
                 (`base = CAMPUS_EXTRUSION_H`), aks holda past binolar
                 maydoncha ichida qolib ko'rinmaydi: 179-maktabda 5 binodan
                 4 tasi 3.3 m, maydoncha esa 3 m — ular atigi 0.3 m chiqib
                 turardi. Endi har bino to'liq bo'yiga ko'tariladi. */
              "fill-extrusion-height": [
                "+",
                CAMPUS_EXTRUSION_H,
                ["max", 2, ["-", ["to-number", ["get", "h"]], PARAPET_H]],
              ],
              "fill-extrusion-base": CAMPUS_EXTRUSION_H,
              "fill-extrusion-opacity": 1,
            },
          },
          beforeId
        );
        // 3c) Tom lentasi (parapet) — devor ustidagi ochroq halqa. Aynan shu
        //     detal binoni "quti" emas, bino qilib ko'rsatadi (Campus3D dagidek).
        map.addLayer(
          {
            id: "app-campus-roof",
            type: "fill-extrusion",
            source: SRC_CAMPUS_BLD,
            paint: {
              "fill-extrusion-color": roofColorExpr,
              // Devor bilan bir xil siljish — parapet tom ustida qoladi
              "fill-extrusion-height": ["+", CAMPUS_EXTRUSION_H, ["to-number", ["get", "h"]], 0.2],
              "fill-extrusion-base": [
                "+",
                CAMPUS_EXTRUSION_H,
                ["max", 2, ["-", ["to-number", ["get", "h"]], PARAPET_H]],
              ],
              "fill-extrusion-opacity": 1,
              "fill-extrusion-vertical-gradient": false,
            },
          },
          beforeId
        );
        /* 3c-2) **179-MAKTAB FASADI** — deraza qatorlari, romlar,
           qavatlararo lentalar, qorong'i poydevor va tom karnizi.

           ⚠️ BITTA qatlam, BITTA manba: rang `kind` bo'yicha `match`
           ifodasi bilan tanlanadi, `base`/`height` esa har bo'lakning
           O'Z maydonidan. Ya'ni ~1000 bo'lak bo'lsa ham chizish
           chaqiruvi BITTA (o'lchandi: 496 deraza + 496 rom + 5 lenta).

           ⚠️ Kameralarga TEGMAYDI: bu alohida manba, klik ushlamaydi
           (`queryRenderedFeatures` faqat `app-campus-3d` bo'yicha
           ishlaydi) va marker qatlamlari o'z joyida qoladi. */
        map.addLayer(
          {
            id: "app-campus-facade",
            type: "fill-extrusion",
            source: SRC_CAMPUS_FACADE,
            minzoom: 15,
            paint: {
              "fill-extrusion-color": [
                "match",
                ["get", "kind"],
                "plinth",
                FACADE_PLINTH,
                "band",
                FACADE_BAND,
                "cornice",
                FACADE_CORNICE,
                "frame",
                FACADE_FRAME,
                "roof",
                FACADE_ROOF,
                "roofEdge",
                FACADE_ROOF_EDGE,
                FACADE_GLASS,
              ],
              /* Bino tanasi `CAMPUS_EXTRUSION_H` dan boshlanadi (hudud
                 maydonchasi ustida) — fasad ham AYNI siljish bilan,
                 aks holda derazalar yerga botib ketardi. */
              "fill-extrusion-base": ["+", CAMPUS_EXTRUSION_H, ["to-number", ["get", "base"]]],
              "fill-extrusion-height": ["+", CAMPUS_EXTRUSION_H, ["to-number", ["get", "height"]]],
              "fill-extrusion-opacity": 1,
              /* Shisha uchun gradient KERAK EMAS — panellar yupqa,
                 gradient ularni faqat qoraytirardi. */
              "fill-extrusion-vertical-gradient": false,
            },
          },
          beforeId
        );

        /* 3d) DARAXTLAR — hovlida.
           ⚠️ `beforeId`SIZ, ya'ni ekstruziyalardan KEYIN: MapLibre
           `symbol` qatlamini `fill-extrusion` bilan chuqurlik bo'yicha
           ARALASHTIRMAYDI, shuning uchun `beforeId` berilsa daraxtlar
           binolar ostida butunlay ko'rinmay qolardi.

           ⚠️ `symbol-sort-key` — KENGLIK bo'yicha: janubdagi (oldingi)
           daraxt keyin chiziladi va shimoldagisini to'g'ri to'sadi.
           Aks holda qiya ko'rinishda orqadagi daraxt oldingisining
           ustida turardi.

           ⚠️ `icon-allow-overlap` SHART — aks holda MapLibre zich
           joylashgan daraxtlarning ko'pini yashirib, hovli siyrak
           ko'rinardi. */
        for (const k of [0, 1] as const) {
          const img = treeIcon(k);
          const name = `campus-tree-${k}`;
          if (img && !map.hasImage(name)) map.addImage(name, img, { pixelRatio: 2 });
        }
        map.addLayer({
          id: "app-campus-trees",
          type: "symbol",
          source: SRC_CAMPUS_TREE,
          /* 15-zoomdan pastda daraxt nuqtaga aylanadi va faqat shovqin
             beradi — kampus baribir ko'rinmaydi. */
          minzoom: 15,
          layout: {
            "icon-image": ["case", ["==", ["get", "k"], 1], "campus-tree-1", "campus-tree-0"],
            "icon-anchor": "bottom",
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
            /* Zoom bilan o'sadi + har daraxtning O'Z o'lchami (`s`). */
            "icon-size": [
              "*",
              ["get", "s"],
              ["interpolate", ["linear"], ["zoom"], 15, 0.16, 17, 0.34, 19, 0.72],
            ],
            /* ⚠️ `symbol-z-order` BERILMAYDI: `"source"` bo'lsa
               `symbol-sort-key` E'TIBORGA OLINMAYDI (MapLibre qoidasi)
               va daraxtlar manba tartibida chizilib, orqadagisi
               oldingisini to'sardi. Default `"auto"` — sort-key bor
               bo'lsa aynan shundan foydalanadi. */
            "symbol-sort-key": ["-", ["get", "y"]],
          },
          paint: { "icon-opacity": ["interpolate", ["linear"], ["zoom"], 15, 0.55, 16.5, 1] },
        });

        // 4) Bino nomlari — `beforeId`SIZ, ya'ni hamma narsaning USTIDA
        //    (ekstruziya ostida qolmasin). Nomsiz binoda `text-field` bo'sh
        //    bo'ladi va MapLibre yorliqni umuman chizmaydi.
        map.addLayer({
          id: "app-campus-building-label",
          type: "symbol",
          source: SRC_CAMPUS_LBL,
          minzoom: 15,
          layout: {
            "text-field": ["get", "name"],
            "text-font": MAP_FONT,
            "text-size": 11,
            "text-max-width": 9,
            "text-padding": 4,
            // Bino ustida turadi; joy yetmasa MapLibre o'zi yashiradi
            "symbol-placement": "point",
          },
          paint: {
            "text-color": "#E6F3FF",
            "text-halo-color": "rgba(4,10,20,0.9)",
            "text-halo-width": 1.4,
          },
        });
        // `selected` rejimida boshida hech narsa ko'rinmasin — hudud faqat
        // yorliq bosilgandan keyin chiqadi
        if (campusAreas === "selected") {
          setCampusFilter(map, ["==", ["get", "id"], "___none___"]);
          setCampusReady(true);
          return;
        }
        // Kadr — faqat shu hududlar bo'yicha, ya'ni xarita butun mamlakatga
        // emas, kuzatuv joylariga ochiladi
        const b = areasBounds(areas);
        // maxZoom 15 — 3D binolar 14-zoomdan boshlanadi, undan pastda
        // hududlar bo'sh maydonchaga aylanib qoladi
        if (b && fitCampusBoundsRef.current) map.fitBounds(b, { padding: 90, duration: 0, maxZoom: 15 });
      })
      .catch(() => {
        /* kampus fayllari yo'q — xarita chegarasiz davom etadi */
      });

    const onClick = (e: MapMouseEvent) => {
      // Bino BINOLAR qatlami hovli qatlami ustida turadi — avval o'shani
      // tekshiramiz, aks holda bino bosilganda hovli (onSelectCampus)
      // ishga tushib qolardi.
      const bf = onBuildingClickRef.current
        ? map.queryRenderedFeatures(e.point, { layers: ["app-campus-buildings"] })[0]
        : undefined;
      const key = bf?.properties?.key as string | undefined;
      if (key) {
        onBuildingClickRef.current?.(key);
        return;
      }
      const f = map.queryRenderedFeatures(e.point, { layers: ["app-campus-3d"] })[0];
      const id = f?.properties?.id as string | undefined;
      if (id) onSelectCampusRef.current?.(id);
    };
    const enter = () => (map.getCanvas().style.cursor = "pointer");
    const leave = () => (map.getCanvas().style.cursor = "");
    map.on("click", "app-campus-3d", onClick);
    map.on("click", "app-campus-buildings", onClick);
    map.on("mouseenter", "app-campus-3d", enter);
    map.on("mouseleave", "app-campus-3d", leave);
    map.on("mouseenter", "app-campus-buildings", enter);
    map.on("mouseleave", "app-campus-buildings", leave);

    return () => {
      cancelled = true;
      map.off("click", "app-campus-3d", onClick);
      map.off("click", "app-campus-buildings", onClick);
      map.off("mouseenter", "app-campus-3d", enter);
      map.off("mouseleave", "app-campus-3d", leave);
      map.off("mouseenter", "app-campus-buildings", enter);
      map.off("mouseleave", "app-campus-buildings", leave);
    };
  }, [campusAreas, status, styleEpoch]);

  /* Xaritaga bosish — kamera joylashtirish rejimi. Qatlam hodisalaridan
     ALOHIDA: `onMapClick` xaritaning istalgan nuqtasida ishlaydi, hudud yoki
     kampus qatlamining ustida ham. */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !onMapClick) return;
    const onClick = (e: MapMouseEvent) => onMapClick({ lat: e.lngLat.lat, lng: e.lngLat.lng });
    map.on("click", onClick);
    // Kursor "nishonga olish" ko'rinishida — rejim yoqilgani bilinsin
    const prev = map.getCanvas().style.cursor;
    map.getCanvas().style.cursor = "crosshair";
    return () => {
      map.off("click", onClick);
      map.getCanvas().style.cursor = prev;
    };
  }, [onMapClick]);

  /* 3c) Tanlangan hudud — yorqinroq va balandroq + kadrga olish
        ⚠️ `campusAreas` prop DINAMIK almashishi ham mumkin (`Map3D.tsx`
        "Umumiy xarita" tugmasi — `selected` ↔ `all`). Sourcelar
        FAQAT BIR MARTA yaratiladi (3b'dagi `map.getSource(SRC_CAMPUS)`
        qo'riqlovchisi), ya'ni filtr/kadr almashtirish SHU effekt
        zimmasida — "all" rejimiga o'tilganda oldingi "selected" filtri
        TOZALANMASA faqat bitta kampus ko'rinib qolaverardi. */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready" || !campusAreas || !map.getLayer("app-campus-roof")) return;
    const key = selectedCampusId ?? "___none___";
    let cancelled = false;

    if (campusAreas === "selected") {
      // `selected` rejimida boshqa hududlar umuman chizilmaydi
      setCampusFilter(map, ["==", ["get", "id"], key]);
    } else {
      // `all` rejimida HAMMASI ko'rinadi — oldingi "selected" filtri bo'lsa
      // (masalan "Umumiy xarita" tugmasi bosilganda) tozalanadi.
      setCampusFilter(map, null);
    }

    // Tanlangan hudud to'yingroq va chegarasi qalinroq. Bino RANGI tanlovga
    // bog'liq EMAS — u nomga qarab beriladi (`wallColorExpr`), aks holda
    // tanlov almashganda butun kampus rangi sakrardi.
    map.setPaintProperty("app-campus-3d", "fill-extrusion-opacity", selectedCampusId ? 0.62 : 0.5);
    map.setPaintProperty("app-campus-line", "line-width", ["case", ["==", ["get", "id"], key], 2.4, 1.6]);

    if (selectedCampusId) {
      loadCampusAreas()
        .then((areas) => {
          const a = areas.find((x) => x.id === selectedCampusId);
          if (cancelled || !a) return;
          const b = areasBounds([a]);
          /* `maxZoom: 18` — kampus tanlanganda kadr HOVLI darajasiga tushadi.
             16 EDI: maktab hovlisi ekranning kichik bir bo'lagi bo'lib qolardi
             va kameralarni binolar ustiga joylashtirib bo'lmasdi. */
          if (b) map.fitBounds(b, { padding: 120, duration: 700, maxZoom: 18 });
        })
        .catch(() => {
          /* yuklanmadi — kadr o'zgarmaydi */
        });
    } else if (campusAreas !== "selected" && overviewFitsCountry) {
      // "Umumiy xarita" — HAQIQIY milliy kadr, muassasalar klasteridan
      // MUSTAQIL (izohga qarang: ular hammasi Toshkentda, `areasBounds`
      // bilan fit qilinsa "umumiy" atigi shahar bo'lib qolardi).
      map.flyTo({ center: [UZ_CENTER[1], UZ_CENTER[0]], zoom: UZ_ZOOM, duration: 700 });
    } else if (campusAreas !== "selected") {
      // Muassasa tanlanmagan va "all" rejimi — kadr BARCHA kuzatuvdagi
      // hududlarni qamrab olsin ("Umumiy xarita" tugmasi shu holatga tushadi).
      loadCampusAreas()
        .then((areas) => {
          if (cancelled) return;
          const b = areasBounds(areas);
          if (b) map.fitBounds(b, { padding: 90, duration: 700, maxZoom: 15 });
        })
        .catch(() => {
          /* yuklanmadi — kadr o'zgarmaydi */
        });
    }

    return () => {
      cancelled = true;
    };
  }, [selectedCampusId, campusAreas, status, campusReady, styleEpoch, overviewFitsCountry]);

  /* 4) Tanlangan viloyat — ajratish + fitBounds */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready" || !regions || !map.getLayer("app-regions-selected")) return;
    const key = selectedRegion ?? "___none___";
    map.setFilter("app-regions-selected", ["==", ["get", "region_name"], key]);
    /* ⚠️ Ikkinchi qatlam ALOHIDA tekshiriladi — birinchisi bor deb
       ikkinchisi ham bor deb o'ylash xato (yuqoridagi izohga qarang). */
    if (map.getLayer("app-regions-selected-line")) {
      map.setFilter("app-regions-selected-line", ["==", ["get", "region_name"], key]);
    }
    if (!selectedRegion) return;

    /* ⚠️ KAMPUS TANLANGAN BO'LSA KADR VILOYATGA OLINMAYDI.
       "Muassasalar → Xaritada ochish" bitta bosishda HAM kampusni, HAM
       uning viloyatini tanlaydi. Ikkala effekt ham `fitBounds` qilardi va
       ikkalasi ham ASINXRON (geojson/kampus fayli yuklangach) — kim
       keyin ulgursa o'sha yutardi. Amalda ko'pincha viloyat yutib,
       foydalanuvchi butun Toshkent ko'rinishida qolardi, kampusga esa
       umuman tushmasdi. Kampus — ANIQROQ tanlov, shuning uchun ustun. */
    if (campusPickedRef.current) return;

    let cancelled = false;
    loadRegions()
      .then((fc: { features?: any[] }) => {
        if (cancelled || campusPickedRef.current) return;
        const f = (fc.features ?? []).find((x) => x.properties?.region_name === selectedRegion);
        if (!f) return;
        const b = ringsBounds(outerRings(f.geometry));
        if (b) map.fitBounds(b, { padding: 60, duration: 600 });
      })
      .catch(() => {
        /* geojson yo'q — fitBounds'siz davom */
      });
    return () => {
      cancelled = true;
    };
  }, [selectedRegion, regions, status, styleEpoch]);

  /* 5) Spotlight / mamlakat maskasi — belgilangan hudud yorug', qolgani qorong'u */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready" || (!spotlightRegion && !highlightCountry)) return;
    let cancelled = false;

    loadRegions()
      .then((fc: { features?: any[] }) => {
        if (cancelled || !mapRef.current) return;
        const feats = spotlightRegion
          ? (fc.features ?? []).filter((f) => f.properties?.region_name === spotlightRegion)
          : (fc.features ?? []);
        if (feats.length === 0) return;

        // Bitta poligon: tashqi halqa — dunyo, ichki halqalar — "teshiklar"
        const holes = feats.flatMap((f) => outerRings(f.geometry));
        const mask = {
          type: "Feature" as const,
          properties: {},
          geometry: { type: "Polygon" as const, coordinates: [WORLD_RING, ...holes] },
        };
        const outline = {
          type: "FeatureCollection" as const,
          features: holes.map((ring) => ({
            type: "Feature" as const,
            properties: {},
            geometry: { type: "LineString" as const, coordinates: ring },
          })),
        };

        if (!map.getSource(SRC_MASK)) {
          map.addSource(SRC_MASK, { type: "geojson", data: mask });
          map.addSource(`${SRC_MASK}-line`, { type: "geojson", data: outline });
          map.addLayer({
            id: "app-mask-fill",
            type: "fill",
            source: SRC_MASK,
            paint: { "fill-color": "#03060E", "fill-opacity": spotlightRegion ? 0.82 : 0.94 },
          });
          map.addLayer({
            id: "app-mask-line",
            type: "line",
            source: `${SRC_MASK}-line`,
            paint: { "line-color": "#85E0FF", "line-width": 2, "line-opacity": 0.85 },
          });
        }

        // Ko'rinishni belgilangan hududga moslash (fokus berilmagan bo'lsa)
        if (!focus) {
          const b = ringsBounds(holes);
          if (b) map.fitBounds(b, { padding: 40, duration: 600 });
        }
      })
      .catch(() => {
        /* geojson yo'q — maskasiz davom */
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spotlightRegion, highlightCountry, status, styleEpoch]);

  /* 6) Fokuslash — hodisa/kampusga uchish */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready" || !focus) return;
    map.flyTo({ center: [focus.lng, focus.lat], zoom: focus.zoom ?? 12, duration: 900 });
  }, [focus?.lat, focus?.lng, focus?.zoom, focus?.nonce, status]); // eslint-disable-line react-hooks/exhaustive-deps

  /* 7) Ovozli buyruqlar (zoom / reset / marshrut) */
  const voiceMapAction = useAppStore((s) => s.voiceMapAction);
  const setVoiceMapAction = useAppStore((s) => s.setVoiceMapAction);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready" || !voiceMapAction) return;
    const v = voiceMapAction.value;

    if (v.type === "zoomIn") map.easeTo({ zoom: map.getZoom() + 1, duration: 400 });
    else if (v.type === "zoomOut") map.easeTo({ zoom: map.getZoom() - 1, duration: 400 });
    else if (v.type === "reset") map.flyTo({ center: [UZ_CENTER[1], UZ_CENTER[0]], zoom: UZ_ZOOM, duration: 700 });
    else if (v.type === "showRoute") drawRoute(v.coordinates);

    setVoiceMapAction(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceMapAction, status]);

  /** [lng,lat][] marshrutni chizadi + bounds. */
  function drawRoute(coords: [number, number][]) {
    const map = mapRef.current;
    if (!map || coords.length < 2) return;
    const data = {
      type: "Feature" as const,
      properties: {},
      geometry: { type: "LineString" as const, coordinates: coords },
    };
    const src = map.getSource(SRC_ROUTE) as GeoJSONSource | undefined;
    if (src) src.setData(data);
    else {
      map.addSource(SRC_ROUTE, { type: "geojson", data });
      map.addLayer({
        id: "app-route-line",
        type: "line",
        source: SRC_ROUTE,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#8EB7FF", "line-width": 5, "line-opacity": 0.9 },
      });
    }
    const b = ringsBounds([coords]);
    if (b) map.fitBounds(b, { padding: 60, duration: 700 });
  }

  /* 1b) Mavzu almashdi — xarita uslubi ham almashadi (qorong'i ↔ yorug').
         Kadr (markaz/zoom/burchak) O'ZGARMAYDI: `setStyle` faqat ko'rinishni
         almashtiradi, kamera holatiga tegmaydi. */
  const styleRef = useRef(initialStyle);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready") return;
    const next = mapStyleFor(theme);
    if (next === styleRef.current) return;
    styleRef.current = next;
    setCampusReady(false);
    map.setStyle(next);
    const onStyle = () => {
      addBuilding3DLayer(map);
      if (is3D) setBuilding3D(map, true, citySuppressed());
      // Qatlamlarni qayta quradigan effektlarni yurgizamiz
      setStyleEpoch((n) => n + 1);
    };
    map.once("styledata", onStyle);
    return () => {
      map.off("styledata", onStyle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, status]);

  /**
   * 3D rejim — `fill-extrusion` binolar + kamera qiyaligi.
   *
   * DIQQAT — kadr JOYIDA QOLADI. Ilgari 3D yoqilganda zoom majburan 15 ga
   * ko'tarilar va bearing 42° ga burilardi. Kampus ko'lamida bu to'g'ri
   * (shahar binolari 14-zoomdan boshlanadi), lekin RESPUBLIKA ko'lamida
   * (Geo Analitika, zoom ~5) butun O'zbekiston kadrdan uchib ketardi.
   *
   * Shuning uchun zoom/burilish faqat foydalanuvchi ALLAQACHON binolar
   * ko'rinadigan masshtabga yaqin bo'lganda (`>= NEAR_BUILDING_ZOOM`)
   * o'zgaradi. Uzoqdan qaralganda faqat qiyalik beriladi — u yerda baribir
   * viloyat va kampus hududlari ko'tariladi, shahar binolari emas.
   */
  function toggle3D() {
    const map = mapRef.current;
    if (!map) return;
    const next = !is3D;
    const z = map.getZoom();
    const nearBuildings = z >= NEAR_BUILDING_ZOOM;

    setBuilding3D(map, next, citySuppressed());
    map.easeTo({
      pitch: next ? PITCH_3D : 0,
      bearing: next && nearBuildings ? BEARING_3D : 0,
      zoom: next && nearBuildings ? Math.max(z, BUILDING_3D_MINZOOM + 1) : z,
      duration: 700,
    });
    setIs3D(next);
  }

  return (
    <div className={className ?? "relative h-full w-full"}>
      <div ref={containerRef} className="absolute inset-0 h-full w-full" />
      {dim && <span className="mlmap-dim" />}

      {show3DToggle && status === "ready" && (
        <button
          onClick={toggle3D}
          title={is3D ? tMap.to2D : tMap.to3D}
          className={`absolute z-30 grid h-9 w-11 place-items-center rounded-lg border text-[12px] font-extrabold backdrop-blur-xl transition-colors ${toggle3DClassName} ${
            is3D
              ? "border-ice/50 bg-ice/20 text-ice-bright"
              : "border-white/10 bg-[#0C1020]/80 text-slate-200 hover:text-white"
          }`}
        >
          {is3D ? "2D" : "3D"}
        </button>
      )}

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
            <p className="text-[11px] text-slate-400">
              Tile server: <b>{TILES_BASE}</b> · uslub: <b>{MAP_STYLE_URL}</b>
            </p>
          </div>
        </div>
      )}
    </div>
  );
});

/**
 * XARITA — host bo'yicha IKKI xil manba (2026-09-14, foydalanuvchi so'rovi).
 *
 *   · lokal (localhost, ichki IP `10.181…`) — OFFLINE MapLibre + ichki tayl
 *     server (yuqoridagi `MapLibreGlMap`, butun 3D kampus bilan);
 *   · global domen (`campusai.uz`) — Yandex (`map/yandex/YandexMap.tsx`):
 *     u yerdan ichki tayl serverga yetib bo'lmaydi.
 *
 * Tanlov `config/yandexMaps.ts` `isYandexHost()` da. Host sahifa davomida
 * o'zgarmaydi — shuning uchun faqat birinchi renderda o'qiladi.
 * Chaqiruvchilar (`Map3D`, `GeoMap`, HUD, radar) hech narsani bilmaydi.
 */
export const MapLibreMap = memo(function MapLibreMap(props: MapProps) {
  const [yandex] = useState(isYandexHost);
  return yandex ? <YandexMap {...props} /> : <MapLibreGlMap {...props} />;
});
