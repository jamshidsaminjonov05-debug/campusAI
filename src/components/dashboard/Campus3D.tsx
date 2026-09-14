import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ChevronRight, Layers, Minus, Plus, RotateCcw, X } from "lucide-react";
/* Kamera ikonkasi — "Aniqlanganlar" KPI qatoridagi bilan AYNI. */
import { SecurityCamera } from "@phosphor-icons/react";
import { TILE_SIZE, lonLatToTile, metersPerPixel, probeTiles, tileStyleFor, tileUrl, type TileStyle } from "@/config/tileConfig";
import { useDetectionCameras, useDetections } from "@/hooks/useDetections";
import { useNvrChannels } from "@/hooks/useNvrChannels";
import { placementFor } from "@/config/cameraPlacements";
import { detectSubject, isAlarm, type NvrEvent } from "@/lib/nvrApi";
import { DEFAULT_INSTITUTION_ID, INSTITUTIONS } from "@/config/institutions";
import { useAppStore } from "@/store/useAppStore";
import { CameraQuickView } from "@/components/cameras/CameraQuickView";
import { EventDossier } from "@/components/detections/EventDossier";
import { useT } from "@/i18n";
import { useScheme } from "@/theme";
import { DetectionThumb } from "@/components/detections/DetectionThumb";
import { Pill } from "@/components/common/Panel";
import { BuildingInterior } from "./BuildingInterior";

/**
 * Kampusning 3D ko'rinishi — binolar HAQIQIY konturlar (ODbL): OpenStreetMap
 * + Microsoft ML footprints, `tools/campus3d/build.mjs` yasaydi.
 *
 * Har texnikumga bitta fayl: `public/geojson/campus/<id>.json`. Header'dagi
 * select `selectedTeknikum`ni o'zgartiradi → shu yerda fayl qayta yuklanadi.
 * Koordinatalar metrlarda, origin = `center` ([lat, lng]).
 *
 * Chizish: izometrik proyeksiya (plan burilishi + vertikal siqish), har bino
 * uchun ko'rinadigan devor yuzalari + qavat chiziqlari + parapet + tom.
 * WebGL/tashqi 3D kutubxona YO'Q — toza SVG.
 *
 * Kamera sichqoncha bilan boshqariladi: surish — ko'chirish, Shift/o'ng tugma
 * bilan surish — aylantirish va qiyalik, g'ildirak — masshtab.
 */

type Pt = [number, number];

interface CampusData {
  name: string;
  region: string;
  source: string;
  /** Kampus markazi — Yandex tartibida [lat, lng]; metr koordinatalar shu nuqtadan. */
  center: [number, number];
  campus: Pt[];
  /** `ml:1` — kontur Microsoft ML datasetidan, balandlik yuza bo'yicha TAXMIN
   *  (OSM'da bu binolar chizilmagan — `tools/campus3d/add-ml-buildings.mjs`). */
  buildings: { p: Pt[]; h: number; c: 0 | 1; n?: string; ml?: 1 }[];
  roads: { p: Pt[]; w: number }[];
  greens: { p: Pt[]; k: string }[];
}

/* ---------- Kamera va proyeksiya ---------- */
const DEFAULT_ROT = 34; // plan burilishi, gradus
const DEFAULT_TILT = 0.58; // vertikal siqish (1 = tepadan, 0 = yon tomondan)
const MIN_TILT = 0.18;
const MAX_TILT = 0.95;
const H_SCALE = 1.15; // 1 metr balandlik = necha birlik ekranda

/** Burilish/qiyalik shu qadamlarga yaxlitlanadi — surishда qayta hisob kamayadi. */
const ROT_STEP = 2;
const TILT_STEP = 0.02;

/** Mercator: zoom 0 da 1 px = 156543.03392·cos(lat) metr. */
const EARTH_MPP = 156543.03392;

/** Metr ↔ daraja (kampus markazi atrofidagi tekis yaqinlashish). */
const M_PER_DEG_LAT = 111320;

/**
 * Asos qatlam manbai: ichki tile-server yoki o'chirilgan.
 *
 * V3 da uchinchi variant — Yandex sun'iy yo'ldoshi — bor edi; bu loyiha
 * TO'LIQ OFFLINE, tashqi skript/xarita ishlatilmaydi (CLAUDE.md), shuning
 * uchun faqat `/tiles` qoldi.
 */
type BaseMode = "tiles" | "off";

/** Har bir muassasaning 3D kampusi alohida fayl (`public/geojson/campus/`). */
const campusUrl = (campus: string) => `/geojson/campus/${campus}.json`;
/** Header'da 3D kampusi bor muassasa tanlanmaganda ko'rsatiladigani. */
/**
 * Kamera nuqtasining yer sathidan balandligi (metr).
 *
 * ⚠️ Bino tomiga emas, USTUNGA qo'yiladi: koordinatasi aniq kamera
 * binoning ichida ham, hovlida ham bo'lishi mumkin — tom balandligiga
 * bog'lash uni noto'g'ri joyga ko'tarardi.
 */
const CAM_POLE_H = 6;

const DEFAULT_CAMPUS =
  INSTITUTIONS.find((i) => i.id === DEFAULT_INSTITUTION_ID)?.campus ?? INSTITUTIONS[0].campus;

interface Cam {
  cos: number;
  sin: number;
  tilt: number;
}

/** Yer nuqtasi (metr) → ekran birliklari; `h` — balandlik metrda. */
function project(x: number, y: number, h: number, c: Cam): Pt {
  return [x * c.cos - y * c.sin, (x * c.sin + y * c.cos) * c.tilt - h * H_SCALE];
}

const path = (pts: Pt[]) => `M${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join("L")}Z`;
const line = (pts: Pt[]) => `M${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join("L")}`;

/** Ekran koordinatasidagi shoelace — devor ko'rinishini aniqlash uchun. */
function signedArea(p: Pt[]): number {
  let s = 0;
  for (let i = 0; i < p.length; i++) {
    const [x1, y1] = p[i];
    const [x2, y2] = p[(i + 1) % p.length];
    s += x1 * y2 - x2 * y1;
  }
  return s / 2;
}

function centroid(p: Pt[]): Pt {
  let x = 0;
  let y = 0;
  for (const [a, b] of p) {
    x += a;
    y += b;
  }
  return [x / p.length, y / p.length];
}

/* ---------- Ranglar — MAVZUGA qarab ikki palitra ----------------------------
   Ilgari bu yerda faqat qorong'i qiymatlar turardi va yorug' rejimda butun
   3D kampus qop-qora dog' bo'lib qolardi. Endi palitra `useTheme()` bo'yicha
   tanlanadi; geometriya, proyeksiya va boshqa hamma narsa BIR XIL qoladi.

   Yorug' variant "arxitektura chizmasi" mantig'ida: och kulrang-ko'k shahar,
   yashil kampus maydonchasi, ko'k qirralar. Trevoga ranglari (qizil/sariq)
   IKKALA rejimda ham bir xil — ular ma'no tashiydi, bezak emas. */
export interface C3dPalette {
  ground: string;
  green: string;
  greenBase: string;
  greenEdge: string;
  road: string;
  roofCity: string;
  wallCityA: string;
  wallCityB: string;
  bandCity: string;
  edgeCity: string;
  roofCampus: string;
  wallCampusA: string;
  wallCampusB: string;
  bandCampus: string;
  edgeCampus: string;
  floorsCampus: string;
  floorsCity: string;
  areaFill: string;
  areaStroke: string;
  areaDash: string;
  areaShadow: string;
  /** Tayl qatlami ustidagi vinetka (chetlarni yumshatadi). */
  vignette: string;
  /** Taylsiz rejimdagi fon nuri. */
  glowFrom: string;
  glowTo: string;
  alarmOpacity: number;
  /** Marker ustuni tagidagi belgining ichki rangi. */
  markerFill: string;
}

const DARK_PAL: C3dPalette = {
  ground: "#061523",
  green: "#123A2B",
  greenBase: "rgba(30,107,74,0.35)",
  greenEdge: "#1E6B4A",
  road: "#0F2438",
  roofCity: "#16283C",
  wallCityA: "#0E1E2E",
  wallCityB: "#132638",
  bandCity: "#20374E",
  edgeCity: "rgba(77,227,255,0.22)",
  roofCampus: "#2E7D5B",
  wallCampusA: "#2A4159",
  wallCampusB: "#415E7C",
  bandCampus: "#6F8CA8",
  edgeCampus: "rgba(133,224,255,0.85)",
  floorsCampus: "rgba(190,225,255,0.32)",
  floorsCity: "rgba(120,180,220,0.16)",
  areaFill: "rgba(77,227,255,0.07)",
  areaStroke: "rgba(77,227,255,0.75)",
  areaDash: "rgba(255,255,255,0.35)",
  areaShadow: "drop-shadow(0 0 4px rgba(77,227,255,0.6))",
  vignette: "radial-gradient(75% 65% at 50% 45%, rgba(6,21,35,0) 0%, rgba(6,21,35,0.9) 100%)",
  glowFrom: "#0E4E6E",
  glowTo: "#061523",
  alarmOpacity: 1,
  markerFill: "rgba(10,10,20,0.6)",
};

const LIGHT_PAL: C3dPalette = {
  ground: "#E9EEF6",
  green: "#CBE6D3",
  greenBase: "rgba(99,169,127,0.28)",
  greenEdge: "#5FA47C",
  road: "#D3DCE9",
  roofCity: "#D8E0EC",
  wallCityA: "#BCC8D9",
  wallCityB: "#CFD9E7",
  bandCity: "#AEBBCD",
  edgeCity: "rgba(31,74,122,0.20)",
  roofCampus: "#6FBF95",
  wallCampusA: "#AABDD3",
  wallCampusB: "#C7D5E5",
  bandCampus: "#90A4BC",
  edgeCampus: "rgba(13,110,164,0.75)",
  floorsCampus: "rgba(30,64,102,0.30)",
  floorsCity: "rgba(30,64,102,0.14)",
  areaFill: "rgba(13,148,196,0.10)",
  areaStroke: "rgba(9,120,170,0.85)",
  areaDash: "rgba(15,27,46,0.35)",
  areaShadow: "drop-shadow(0 0 4px rgba(9,120,170,0.35))",
  vignette: "radial-gradient(75% 65% at 50% 45%, rgba(233,238,246,0) 0%, rgba(233,238,246,0.85) 100%)",
  glowFrom: "#9CC6E6",
  glowTo: "#E9EEF6",
  alarmOpacity: 0.7,
  markerFill: "rgba(255,255,255,0.75)",
};

export const C3D_PALETTE: Record<"dark" | "light", C3dPalette> = { dark: DARK_PAL, light: LIGHT_PAL };


const FLOOR_H = 3.3; // bir qavat balandligi, metr
const PARAPET = 0.8; // tom parapeti, metr

/** Kamera/hodisa markeri va ichki reja faqat SHU yuzadan katta binolarga —
 *  kampusda shiypon/garaj kabi kichik qurilmalar ham bor, ular kuzatilmaydi. */
const MIN_HOST_AREA = 400; // m²

const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/* ══════════════════════════════════════════════════════════════════════
   179-MAKTAB FASADI — protsedural derazalar (2026-09-05)
   ══════════════════════════════════════════════════════════════════════

   ⚠️ FAQAT SHU BINO. Moslik NOM bo'yicha (`b.n`), indeks bo'yicha EMAS:
   `mk-179.json` OSM'dan qayta yig'ilsa binolar tartibi o'zgaradi, nom
   esa qo'lda yozilgan va saqlanadi.

   ⚠️ Deraza koordinatalari QO'LDA yozilmaydi — mavjud kontur o'qilib,
   har qirraning uzunligi va yo'nalishi bo'yicha hisoblanadi. Kontur
   yoki balandlik o'zgarsa fasad O'ZI moslashadi.

   ⚠️ Faqat KO'RINADIGAN devorlarga chiziladi (orqa yuzalar allaqachon
   chetlab o'tiladi) — ko'rinmas element ham chizish narxini oshiradi. */
const FACADE_NAME = "179-maktab";
/** Deraza o'lchami, metr. */
const F_WIN_W = 1.3;
const F_WIN_H = 1.6;
/** Qavat polidan deraza pastki qirrasigacha, metr. */
const F_SILL = 0.95;
/** Derazalar qadami va burchakdan chekinish, metr. */
const F_STEP = 2.7;
const F_MARGIN = 1.4;
/** Poydevor balandligi, metr. */
const F_PLINTH = 1.05;

/** Fasad ranglari — mavzuga qarab (`C3D_PALETTE` bilan bir naqsh). */
interface FacadePal {
  glass: string;
  frame: string;
  plinth: string;
  ledge: string;
  /** Tom plitasining ustki yuzasi — neytral kulrang. */
  roof: string;
  /** Plitaning yon qirrasi — ustki yuzadan to'qroq (qalinlik ko'rinsin). */
  roofSide: string;
}
/* ── TOM PLITASI (2026-09-05) ── Devordan chetga chiqadi, qalinligi bor. */
const F_ROOF_OVER = 0.5; // chetga chiqishi, metr
const F_ROOF_SLAB = 0.42; // plita qalinligi
const F_ROOF_LIFT = 0.06; // devor tepasidan tirqish

const FACADE_PAL: Record<"dark" | "light", FacadePal> = {
  dark: { glass: "#16293D", frame: "#0B131E", plinth: "#1B2836", ledge: "#5A7392", roof: "#8A9299", roofSide: "#4E555C" },
  light: { glass: "#5C7C9E", frame: "#33414F", plinth: "#8393A5", ledge: "#DCE6F1", roof: "#B7BEC5", roofSide: "#78818A" },
};

interface Prepared {
  key: string;
  index: number; // manba massividagi o'rni — ichki ko'rinishni ochish uchun
  depth: number;
  campus: boolean;
  host: boolean; // ichki reja/kamera qo'yishga arziydigan kampus binosi
  roof: Pt[];
  walls: { d: string; fill: string }[];
  bands: string[]; // tom parapeti — devordan ochroq lenta
  floors: string; // qavat/deraza chiziqlari (bitta path)
  /** 179-maktab fasadi — deraza romlari (bitta path, `fill-rule` bilan). */
  frames?: string;
  /** 179-maktab fasadi — shisha (romlar ichida). */
  glass?: string;
  /** Qorong'i poydevor — ko'rinadigan devorlarning pastki lentasi. */
  plinth?: string;
  /** Qavatlararo yengil chiqiq (ledge). */
  ledges?: string;
  /** Ko'tarilgan KULRANG tom plitasining ustki yuzasi. */
  roofSlab?: string;
  /** Plitaning ko'rinadigan yon qirralari (qalinlik). */
  roofSide?: string;
  edge: string;
  roofFill: string;
  name?: string;
  anchor: Pt; // tom markazi — marker shu yerga qo'yiladi
}

/**
 * Binolarni proyeksiya qilib, chizishga tayyor holga keltiramiz.
 * Har bino: ko'rinadigan devorlar + qavat chiziqlari + tom parapeti + tom —
 * shu tafsilotlar tekis "quti" emas, haqiqiy bino taassurotini beradi.
 */
function prepare(buildings: CampusData["buildings"], c: Cam, pal: C3dPalette): Prepared[] {
  const out: Prepared[] = [];

  buildings.forEach((b, i) => {
    let base = b.p.map(([x, y]) => project(x, y, 0, c));
    let top = b.p.map(([x, y]) => project(x, y, b.h, c));
    let cap = b.p.map(([x, y]) => project(x, y, b.h + PARAPET, c));
    /* ⚠️ **METR massivi ham BIRGA teskari qilinadi.** `base`/`top`/`cap`
       teskari qilinganda `b.p` o'z tartibida qolsa `b.p[k]` boshqa
       qirraga to'g'ri kelardi — fasad deraza sonini NOTO'G'RI qirra
       uzunligidan hisoblardi (179-maktab konturida 12 nuqta bor, ya'ni
       xato sezilarli bo'lardi). */
    let poly = b.p;
    if (signedArea(base) < 0) {
      base = [...base].reverse();
      top = [...top].reverse();
      cap = [...cap].reverse();
      poly = [...b.p].reverse();
    }

    const levels = Math.max(1, Math.round(b.h / FLOOR_H));
    const walls: { d: string; fill: string }[] = [];
    const bands: string[] = [];
    const floorSegs: string[] = [];
    /* 179-maktab fasadi — faqat SHU bino uchun to'ldiriladi. */
    const isFacade = b.n === FACADE_NAME;
    const glassSegs: string[] = [];
    const frameSegs: string[] = [];
    const plinthSegs: string[] = [];
    const ledgeSegs: string[] = [];

    for (let k = 0; k < base.length; k++) {
      const n = (k + 1) % base.length;
      const a = base[k];
      const cc0 = base[n];
      if (cc0[0] >= a[0]) continue; // orqa yuza — ko'rinmaydi

      const at = top[k];
      const ct = top[n];
      const ac = cap[k];
      const cc = cap[n];
      const dx = Math.abs(cc0[0] - a[0]);
      const dy = Math.abs(cc0[1] - a[1]);
      const bright = dx > dy; // yorug'lik burchagi: keng yuza ochroq

      walls.push({
        d: path([a, cc0, ct, at]),
        fill: b.c ? (bright ? pal.wallCampusB : pal.wallCampusA) : bright ? pal.wallCityB : pal.wallCityA,
      });
      bands.push(path([at, ct, cc, ac]));

      // Qavat/deraza chiziqlari — eng qimmat qism (bino boshiga o'nlab segment)
      // va kamera har burilganda qayta hisoblanadi. Shuning uchun faqat kampus
      // binolari va baland shahar binolarida chizamiz: past uylarда bu detal
      // baribir ko'rinmaydi, lekin atrofda yuzlab bino bo'ladi.
      /* ── 179-MAKTAB FASADI ──
         Devor to'rtburchagi `a → cc0 → ct → at` bilan berilgan:
         `a→cc0` — poldagi qirra, `a→at` — vertikal. Deraza joyi shu
         ikki o'q bo'yicha ULUSH (0..1) sifatida hisoblanadi, ya'ni
         proyeksiya avtomatik to'g'ri chiqadi — burchak yoki kamera
         o'zgarsa ham. */
      if (isFacade) {
        const wallLenM = Math.hypot(poly[k][0] - poly[n][0], poly[k][1] - poly[n][1]);
        const usable = wallLenM - F_MARGIN * 2;
        if (usable > F_WIN_W) {
          const cols = Math.max(1, Math.floor(usable / F_STEP) + 1);
          const gapM = cols > 1 ? usable / (cols - 1) : 0;
          /* Devorning pastki/ustki nuqtalari orasidagi ULUSH — metrni
             0..1 ga o'tkazish uchun (devor balandligi `b.h`). */
          const vy = (m: number) => m / b.h;

          for (let f = 0; f < levels; f++) {
            const sillM = f * FLOOR_H + F_SILL + (f === 0 ? F_PLINTH * 0.4 : 0);
            const t0 = vy(sillM);
            const t1 = vy(sillM + F_WIN_H);
            if (t1 >= 1) break; // parapetga tegib ketmasin

            for (let w = 0; w < cols; w++) {
              const cM = F_MARGIN + (cols > 1 ? w * gapM : usable / 2);
              const u0 = (cM - F_WIN_W / 2) / wallLenM;
              const u1 = (cM + F_WIN_W / 2) / wallLenM;
              if (u0 < 0 || u1 > 1) continue;

              /* To'rtburchakning to'rt uchi — pastki qirradan ustkisiga
                 chiziqli aralashtirish (`lerp`) bilan. */
              const bl = lerp(lerp(a, cc0, u0), lerp(at, ct, u0), t0);
              const br = lerp(lerp(a, cc0, u1), lerp(at, ct, u1), t0);
              const tr = lerp(lerp(a, cc0, u1), lerp(at, ct, u1), t1);
              const tl = lerp(lerp(a, cc0, u0), lerp(at, ct, u0), t1);
              glassSegs.push(path([bl, br, tr, tl]));

              /* Rom — deraza atrofida 0.18 m kengroq. */
              const pu = 0.18 / wallLenM;
              const pv = vy(0.18);
              const fbl = lerp(lerp(a, cc0, u0 - pu), lerp(at, ct, u0 - pu), t0 - pv);
              const fbr = lerp(lerp(a, cc0, u1 + pu), lerp(at, ct, u1 + pu), t0 - pv);
              const ftr = lerp(lerp(a, cc0, u1 + pu), lerp(at, ct, u1 + pu), t1 + pv);
              const ftl = lerp(lerp(a, cc0, u0 - pu), lerp(at, ct, u0 - pu), t1 + pv);
              frameSegs.push(path([fbl, fbr, ftr, ftl]));
            }
          }

          /* Poydevor — devorning pastki lentasi (qorong'i beton). */
          const pt = F_PLINTH / b.h;
          plinthSegs.push(path([a, cc0, lerp(cc0, ct, pt), lerp(a, at, pt)]));

          /* Qavatlararo chiqiq — yupqa yorug' lenta. */
          for (let f = 1; f < levels; f++) {
            const y0 = vy(f * FLOOR_H - 0.14);
            const y1 = vy(f * FLOOR_H + 0.14);
            ledgeSegs.push(
              path([lerp(a, at, y0), lerp(cc0, ct, y0), lerp(cc0, ct, y1), lerp(a, at, y1)])
            );
          }
        }
      }

      const len = Math.hypot(cc0[0] - a[0], cc0[1] - a[1]);
      /* Fasad chizilgan binoda umumiy "deraza chiziqlari" TAKRORLANMAYDI —
         u yerda haqiqiy derazalar bor. */
      if (!isFacade && (b.c === 1 || b.h >= 10) && len > 8) {
        for (let f = 1; f < levels; f++) {
          const t = f / levels;
          floorSegs.push(line([lerp(a, at, t), lerp(cc0, ct, t)]));
        }
        // Vertikal deraza bo'linmalari — har ~5 metrda
        const cols = Math.min(10, Math.floor(len / 5));
        for (let v = 1; v < cols; v++) {
          const t = v / cols;
          floorSegs.push(line([lerp(a, cc0, t), lerp(at, ct, t)]));
        }
      }
    }

    /* ── TOM PLITASI ── Kontur `F_ROOF_OVER` metrga kengaytirilib,
       devor tepasidan `F_ROOF_LIFT` yuqorida ikki sathda proyeksiya
       qilinadi: pastki (`slabLo`) va ustki (`slabHi`). Ustki yuza —
       plitaning o'zi, ular orasidagi yon yuzalar — QALINLIK.

       ⚠️ Kengaytirish METR fazosida (`poly`), ekranda emas: proyeksiya
       perspektiv bo'lgani uchun ekranda surish noto'g'ri chiqardi. */
    let roofSlab: string | undefined;
    let roofSideD: string | undefined;
    if (isFacade) {
      const cxm = poly.reduce((t, q) => t + q[0], 0) / poly.length;
      const cym = poly.reduce((t, q) => t + q[1], 0) / poly.length;
      /* Markazdan tashqariga surish — kontur qavariq bo'lgani uchun
         yetarli va o'z-o'zini kesib o'tmaydi. */
      const grown = poly.map(([x, y]) => {
        const dx = x - cxm;
        const dy = y - cym;
        const L = Math.hypot(dx, dy) || 1;
        return [x + (dx / L) * F_ROOF_OVER, y + (dy / L) * F_ROOF_OVER] as [number, number];
      });
      /* ⚠️ Plita PARAPET ustida boshlanadi (`b.h + PARAPET`): bino
         tomining o'zi shu balandlikda chiziladi (`cap`), plita undan
         PAST bo'lsa ostida qolib ko'rinmasdi. */
      const yLo = b.h + PARAPET + F_ROOF_LIFT;
      const yHi = yLo + F_ROOF_SLAB;
      let lo = grown.map(([x, y]) => project(x, y, yLo, c));
      let hi = grown.map(([x, y]) => project(x, y, yHi, c));
      if (signedArea(lo) < 0) {
        lo = [...lo].reverse();
        hi = [...hi].reverse();
      }
      const sides: string[] = [];
      for (let k2 = 0; k2 < lo.length; k2++) {
        const n2 = (k2 + 1) % lo.length;
        // Orqa qirra ko'rinmaydi — chizilmaydi
        if (lo[n2][0] >= lo[k2][0]) continue;
        sides.push(path([lo[k2], lo[n2], hi[n2], hi[k2]]));
      }
      roofSideD = sides.length ? sides.join("") : undefined;
      roofSlab = path(hi);
    }

    out.push({
      key: `b${i}`,
      index: i,
      depth: Math.max(...base.map((p) => p[1])),
      campus: b.c === 1,
      host: b.c === 1 && Math.abs(signedArea(b.p)) >= MIN_HOST_AREA,
      roof: cap,
      walls,
      bands,
      floors: floorSegs.join(""),
      /* Bo'sh satr emas, `undefined` — render shartida `&&` ishlatiladi. */
      frames: frameSegs.length ? frameSegs.join("") : undefined,
      glass: glassSegs.length ? glassSegs.join("") : undefined,
      plinth: plinthSegs.length ? plinthSegs.join("") : undefined,
      ledges: ledgeSegs.length ? ledgeSegs.join("") : undefined,
      roofSlab,
      roofSide: roofSideD,
      edge: b.c ? pal.edgeCampus : pal.edgeCity,
      roofFill: b.c ? pal.roofCampus : pal.roofCity,
      name: b.n,
      anchor: centroid(cap),
    });
  });

  return out.sort((a, b) => a.depth - b.depth);
}

/**
 * Lokal tile-server qatlami — 3D binolar bilan AYNAN bir tekislikda.
 *
 * Konteyner `transform: scaleY(tilt) rotate(rot)` bilan buriladi (bu bizning
 * `project()` formulamizning o'zi), ichida tayllar **metr** koordinatasida
 * joylashadi. Shuning uchun bino poydevorlari xaritadagi o'z konturlariga
 * tushadi — kamera qanday burilsa ham.
 */
function TileLayer({
  center,
  scale,
  rotDeg,
  tilt,
  ox,
  oy,
  box,
  style,
}: {
  center: [number, number];
  scale: number;
  rotDeg: number;
  tilt: number;
  ox: number;
  oy: number;
  box: { w: number; h: number };
  /** Tayl uslubi — mavzuga qarab (`tileStyleFor`). */
  style: TileStyle;
}) {
  const [lat0, lon0] = center;

  const tiles = useMemo(() => {
    if (!scale || !box.w || !box.h) return { z: 0, list: [] as { key: string; url: string; l: number; t: number; w: number; h: number }[] };

    const rad = (rotDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const mLon = M_PER_DEG_LAT * Math.cos((lat0 * Math.PI) / 180);

    // Ekran burchaklarini metr tekisligiga qaytaramiz (proyeksiyaning teskarisi)
    const inv = (sx: number, sy: number): Pt => {
      const px = (sx - ox) / scale;
      const q = (sy - oy) / scale / tilt;
      return [px * cos + q * sin, -px * sin + q * cos];
    };
    const corners = [inv(0, 0), inv(box.w, 0), inv(0, box.h), inv(box.w, box.h)];
    const margin = 60; // metr — chetlarda bo'sh joy qolmasin
    const minX = Math.min(...corners.map((p) => p[0])) - margin;
    const maxX = Math.max(...corners.map((p) => p[0])) + margin;
    const minY = Math.min(...corners.map((p) => p[1])) - margin;
    const maxY = Math.max(...corners.map((p) => p[1])) + margin;

    // Tile piksel ≈ ekran piksel bo'ladigan zoom
    const z = Math.max(10, Math.min(19, Math.round(Math.log2(EARTH_MPP * Math.cos((lat0 * Math.PI) / 180) * scale))));
    const n = 2 ** z;

    const toLonLat = (x: number, y: number): [number, number] => [lon0 + x / mLon, lat0 - y / M_PER_DEG_LAT];
    const [x1] = lonLatToTile(toLonLat(minX, 0)[0], lat0, z);
    const [x2] = lonLatToTile(toLonLat(maxX, 0)[0], lat0, z);
    const [, y1] = lonLatToTile(lon0, toLonLat(0, minY)[1], z);
    const [, y2] = lonLatToTile(lon0, toLonLat(0, maxY)[1], z);

    const tx0 = Math.floor(Math.min(x1, x2));
    const tx1 = Math.floor(Math.max(x1, x2));
    const ty0 = Math.floor(Math.min(y1, y2));
    const ty1 = Math.floor(Math.max(y1, y2));

    // Xotira/tarmoqni ehtiyot qilamiz — 12x12 dan oshsa zoom baribir mos emas
    if ((tx1 - tx0 + 1) * (ty1 - ty0 + 1) > 200) return { z, list: [] };

    const tileM = TILE_SIZE * metersPerPixel(lat0, z);
    const [fx, fy] = lonLatToTile(lon0, lat0, z);

    const list = [];
    for (let tx = tx0; tx <= tx1; tx++) {
      for (let ty = ty0; ty <= ty1; ty++) {
        if (tx < 0 || ty < 0 || tx >= n || ty >= n) continue;
        list.push({
          key: `${z}/${tx}/${ty}`,
          url: tileUrl(z, tx, ty, style),
          l: (tx - fx) * tileM * scale,
          t: (ty - fy) * tileM * scale,
          w: tileM * scale,
          h: tileM * scale,
        });
      }
    }
    return { z, list };
  }, [lat0, lon0, scale, rotDeg, tilt, ox, oy, box.w, box.h, style]);

  return (
    <div
      className="absolute"
      style={{
        left: ox,
        top: oy,
        width: 0,
        height: 0,
        transform: `scaleY(${tilt}) rotate(${rotDeg}deg)`,
        transformOrigin: "0 0",
      }}
    >
      {tiles.list.map((t) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={t.key}
          src={t.url}
          alt=""
          draggable={false}
          className="absolute max-w-none"
          style={{ left: t.l, top: t.t, width: t.w + 0.5, height: t.h + 0.5 }}
        />
      ))}
    </div>
  );
}

/**
 * Kampus ustida ko'rsatiladigan trevoga — aniqlash API hodisasidan olinadi
 * (mock YO'Q). Hodisada koordinata bo'lmagani uchun u kampus binolariga
 * taqsimlanadi: maqsad — operator qaysi binoda nima bo'layotganini ko'rsin.
 */
interface CampusAlert {
  id: number;
  title: string;
  alarm: boolean;
  time: string;
  subject: string;
  camera: string;
  /** kuzatuv posti kanali — trevoga AYNI shu kamera ustida chiziladi. */
  channel?: string;
}

const ALERT_COLOR = { alarm: "#EF4444", normal: "#F59E0B" } as const;


interface Placed {
  alert: CampusAlert;
  at: Pt; // metrdagi joylashuv (yer)
  height: number; // marker ustuni balandligi
}

export interface Campus3DProps {
  /**
   * `true` bo'lsa kampus yuklanishi bilan ASOSIY (eng katta) binoning ichki
   * ko'rinishi o'zi ochiladi — Hodisalar HUD'ida yozuvga bosilganda darhol
   * "3D bino holati"ga o'tish uchun.
   */
  autoInterior?: boolean;
  /** Ichki ko'rinish yopilganda — chaqiruvchi o'z holatini tozalasin. */
  onInteriorClose?: () => void;
  /** Tashqi ramka klassi (HUD'da `nexa-card` kerak emas). */
  className?: string;
}

export function Campus3D({ autoInterior = false, onInteriorClose, className = "nexa-card" }: Campus3DProps = {}) {
  const t = useT();
  /* Mavzu palitrasi — yorug' rejimda kampus ham oqaradi (`C3D_PALETTE`).
     Geometriya o'zgarmaydi, faqat ranglar almashadi. */
  const theme = useScheme();
  const pal = C3D_PALETTE[theme];
  /* 179-maktab fasadi ranglari — mavzuga ergashadi. */
  const fpal = FACADE_PAL[theme];
  const [data, setData] = useState<CampusData | null>(null);
  const [failed, setFailed] = useState(false);
  // Asos qatlam: lokal tile-server tekshirilgunicha "off"
  const [base, setBase] = useState<BaseMode>("off");
  useEffect(() => {
    let alive = true;
    probeTiles().then((ok) => alive && setBase(ok ? "tiles" : "off"));
    return () => {
      alive = false;
    };
  }, []);
  const showBase = base !== "off";

  // Kamera holati — sichqoncha bilan boshqariladi
  const [rotDeg, setRotDeg] = useState(DEFAULT_ROT);
  const [tilt, setTilt] = useState(DEFAULT_TILT);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<"pan" | "orbit" | null>(null);
  // Ichki ko'rinish ochilgan bino (data.buildings dagi indeks)
  const [interiorIdx, setInteriorIdx] = useState<number | null>(null);
  /** Marker bosilganda ochiladigan kichik kartochka (hodisa id). */
  const [openId, setOpenId] = useState<number | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  const cam: Cam = useMemo(
    () => ({ cos: Math.cos((rotDeg * Math.PI) / 180), sin: Math.sin((rotDeg * Math.PI) / 180), tilt }),
    [rotDeg, tilt]
  );

  // Header'dagi tanlov → shu texnikumning kampusi. 3D fayli bo'lmagan
  // texnikum tanlansa namuna kampus ko'rsatiladi (sarlavha ostida ogohlantirish).
  const selectedTeknikum = useAppStore((s) => s.selectedTeknikum);
  /* Kamera oqimi SHU sahnada ochiladi (`CameraQuickView`). */
  const [camChannel, setCamChannel] = useState<string | null>(null);
  /* Hodisa dossiyesi ham SHU sahnada — bo'lim almashmaydi. */
  const [dossierId, setDossierId] = useState<number | null>(null);
  const selectedTk = useMemo(
    () => INSTITUTIONS.find((t) => t.id === selectedTeknikum) ?? null,
    [selectedTeknikum]
  );
  /* 3D kampus fayli YO'Q muassasa tanlansa namuna kampus ko'rsatiladi va
     sarlavha ostida ogohlantirish chiqadi.
     ⚠️ Ilgari nom `mockData.TEXNIKUMS` dan qidirilardi (645 generatsiya
     qilingan texnikum) — o'sha fayl o'chirildi. Endi ro'yxat bitta:
     `config/institutions.ts`, ya'ni bu holat faqat eski/noma'lum id
     saqlanib qolganda yuz beradi. */
  const missing3D = selectedTeknikum != null && selectedTk == null;
  const missingName = "";
  const campusId = selectedTk?.campus ?? DEFAULT_CAMPUS;

  // Statik ma'lumot — bundle'ni shishirmaslik uchun public'dan olinadi
  useEffect(() => {
    let alive = true;
    setData(null);
    setFailed(false);
    fetch(campusUrl(campusId))
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: CampusData) => alive && setData(d))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [campusId]);

  // Kampus almashsa kamera va ochiq oynalar boshlang'ich holatga qaytadi —
  // aks holda oldingi kampusning burchagi/zoomi yangisiga mos kelmaydi.
  useEffect(() => {
    setRotDeg(DEFAULT_ROT);
    setTilt(DEFAULT_TILT);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setInteriorIdx(null);
    setOpenId(null);
  }, [campusId]);

  /**
   * `autoInterior` — ASOSIY binoni o'zi ochadi.
   *
   * Aniqlash hodisasida bino ma'lumoti YO'Q (faqat kanal nomi), shuning uchun
   * "asosiy bino" = kampus chegarasi ichidagi eng katta yuzali bino: o'quv
   * korpusi amalda doim shu bo'ladi va kameralar ham o'sha yerda.
   */
  useEffect(() => {
    if (!autoInterior || !data) return;
    let best = -1;
    let bestArea = MIN_HOST_AREA;
    data.buildings.forEach((b, i) => {
      if (b.c !== 1) return;
      const area = Math.abs(signedArea(b.p));
      if (area > bestArea) {
        bestArea = area;
        best = i;
      }
    });
    if (best >= 0) setInteriorIdx(best);
  }, [autoInterior, data]);

  // Konteyner o'lchami — SVG va HTML qatlamlar bitta transformdan foydalanadi
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const r = e.contentRect;
      setBox({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const prepared = useMemo(() => (data ? prepare(data.buildings, cam, pal) : []), [data, cam, pal]);

  /**
   * Masshtab BURILISHDAN QAT'I NAZAR bir xil bo'lishi kerak, aks holda
   * aylantirganda kadr "nafas oladi". Shuning uchun kampusning origin'dan
   * eng uzoq nuqtasi (radius) bo'yicha hisoblaymiz — to'liq hudud sig'adi.
   */
  const fit = useMemo(() => {
    let r = 60;
    let maxH = 12;
    if (data) {
      for (const [x, y] of data.campus) r = Math.max(r, Math.hypot(x, y));
      for (const b of data.buildings) {
        if (!b.c) continue;
        maxH = Math.max(maxH, b.h);
        for (const [x, y] of b.p) r = Math.max(r, Math.hypot(x, y));
      }
    }
    return { r, maxH };
  }, [data]);

  const pad = 34;
  const spanX = fit.r * 2 + pad * 2;
  const spanY = fit.r * 2 * tilt + fit.maxH * H_SCALE + pad * 2;
  const scale = box.w && box.h ? Math.min(box.w / spanX, box.h / spanY) * zoom : 0;
  // Origin ekran markazida (+ foydalanuvchi ko'chirgan masofa)
  const ox = box.w / 2 + pan.x;
  const oy = box.h / 2 + fit.maxH * H_SCALE * scale * 0.25 + pan.y;
  const toPx = useCallback((p: Pt) => ({ left: ox + p[0] * scale, top: oy + p[1] * scale }), [ox, oy, scale]);

  /* ---------- Sichqoncha bilan boshqarish ---------- */
  const drag = useRef({ x: 0, y: 0, rot: 0, tilt: 0, panX: 0, panY: 0 });

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return; // markerlar/tugmalar
    const orbit = e.button === 2 || e.shiftKey;
    setDragging(orbit ? "orbit" : "pan");
    drag.current = { x: e.clientX, y: e.clientY, rot: rotDeg, tilt, panX: pan.x, panY: pan.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    if (dragging === "orbit") {
      setRotDeg(Math.round((drag.current.rot + dx * 0.35) / ROT_STEP) * ROT_STEP);
      const t = drag.current.tilt + dy * 0.0035;
      setTilt(Math.round(Math.min(MAX_TILT, Math.max(MIN_TILT, t)) / TILT_STEP) * TILT_STEP);
    } else {
      setPan({ x: drag.current.panX + dx, y: drag.current.panY + dy });
    }
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!dragging) return;
    setDragging(null);
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
  };

  // G'ildirak — masshtab. `passive:false` kerak, shuning uchun qo'lda ulanadi.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom((z) => Math.min(6, Math.max(0.5, z * (e.deltaY > 0 ? 0.9 : 1.111))));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const resetView = () => {
    setRotDeg(DEFAULT_ROT);
    setTilt(DEFAULT_TILT);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const { cameras: nvrCameras } = useDetectionCameras();
  const { channels: nvrChannels } = useNvrChannels();

  /**
   * Kanal → METR koordinata.
   *
   * ⚠️ Kameralar endi HAQIQIY joyiga qo'yiladi. Ilgari nuqtalar faqat
   * geometriyadan olinardi (bino konturining birinchi va o'rta cho'qqisi)
   * va kanallar ularga TARTIB bilan taqsimlanardi — ya'ni "31-kanal"
   * xaritada bir joyda, 3D kampusda butunlay boshqa joyda ko'rinardi.
   *
   * `config/cameraPlacements.ts` lat/lng beradi; bu yerda u metrga
   * o'giriladi (`toLonLat()` ning TESKARISI, `lib/campusAreas.ts`):
   * `y` janubga o'sadi, shuning uchun kenglikdan AYIRILADI.
   */
  const camPoints = useMemo(() => {
    if (!data) return [];
    const [lat0, lon0] = data.center;
    const mLon = M_PER_DEG_LAT * Math.cos((lat0 * Math.PI) / 180);
    const out: { ch: string; at: Pt }[] = [];
    for (const c of nvrChannels) {
      const at = placementFor(c.id);
      if (!at) continue;
      out.push({
        ch: String(c.id),
        at: [(at.lng - lon0) * mLon, (lat0 - at.lat) * M_PER_DEG_LAT] as Pt,
      });
    }
    return out;
  }, [data, nvrChannels]);

  // Trevogalar — kuzatuv posti aniqlash API'sidan (bo'sh bo'lsa marker chiqmaydi)
  const { events: detections } = useDetections({ category: "all", limit: 6 });
  /* Oqim qanday kelsa shundayligicha — kuzatuv posti tarmoqda bitta va uning
     hamma kanali kuzatuvdagi kampusga tegishli
     (`config/nvrCameras.ts` `NVR_DEFAULT_CAMPUS_ID`). Ikkinchi kuzatuv posti
     qo'shilganda bu yerga kampus filtri qaytariladi. */
  const alerts: CampusAlert[] = useMemo(
    () =>
      detections
        .slice(0, 4)
        .map((ev: NvrEvent) => ({
          id: ev.id,
          title: ev.label,
          alarm: isAlarm(ev),
          time: new Date(ev.time).toLocaleString(t.locale),
          subject: detectSubject(ev) ?? t.detect.category[ev.category],
          camera: ev.camera,
          channel: ev.channel,
        })),
    [detections, t]
  );

  /**
   * Hodisa aniqlangan joy — kampus binolarining tomiga biriktiriladi
   * ("alert aniqlangan joyda chiqib turadi"). Metr koordinatada saqlanadi,
   * shuning uchun kamera burilganda ham binoda qoladi.
   */
  const placed: Placed[] = useMemo(() => {
    /* ⚠️ Hodisa O'ZI kelgan KAMERA ustida turadi — kanal koordinatasi
       bo'lsa (`camPoints`). Xaritadagi bilan AYNI qoida: "qaysi kamera
       oldida hodisa bo'lsa, alert shu joyda". Koordinata topilmasa
       avvalgidek binoga taqsimlanadi. */
    const byCh = new Map(camPoints.map((p) => [p.ch, p.at]));
    const exactPlaced = alerts
      .filter((a) => a.channel && byCh.has(a.channel))
      .map((a) => ({ alert: a, at: byCh.get(a.channel as string)!, height: CAM_POLE_H + 10 }));

    const restAlerts = alerts.filter((a) => !a.channel || !byCh.has(a.channel));
    const hosts = data?.buildings.filter((b) => b.c === 1 && Math.abs(signedArea(b.p)) >= MIN_HOST_AREA) ?? [];
    if (!hosts.length) return exactPlaced;
    return [...exactPlaced, ...restAlerts.map((a, i) => {
      const host = hosts[i % hosts.length];
      const cen = centroid(host.p);
      const corner = host.p[((Math.floor(i / hosts.length) * 2 + 1) % host.p.length + host.p.length) % host.p.length];
      return {
        alert: a,
        at: [(cen[0] + corner[0]) / 2, (cen[1] + corner[1]) / 2] as Pt,
        height: host.h + 12,
      };
    })];
  }, [alerts, data, camPoints]);

  const open = placed.find((pl) => pl.alert.id === openId) ?? null;

  /**
   * Kamera nuqtalari — kampus binolari tomida.
   *
   * Nuqtaning JOYI geometriyadan (binolar konturi), lekin har biriga HAQIQIY
   * kuzatuv posti kanali biriktiriladi: aniqlash API'si koordinata bermaydi, shuning
   * uchun kanallar mavjud nuqtalarga tartib bilan taqsimlanadi. Bosilganda
   * o'sha kameraning oqimi ochiladi (`selectName` — kanal nomi).
   */
  const cams = useMemo(() => {
    const byCh = new Map(nvrCameras.map((c) => [c.channel, c]));
    /* 1) Koordinatasi BOR kanallar — o'z joyida (bino balandligisiz,
          yer sathidan bir oz yuqorida turadi). */
    const placedCams = camPoints.map((p) => ({
      at: project(p.at[0], p.at[1], CAM_POLE_H, cam),
      cam: byCh.get(p.ch) ?? { channel: p.ch, name: `${p.ch}-kanal`, count: 0, people: 0, last: "" },
      exact: true,
    }));

    /* 2) Koordinatasi YO'Q kanallar — avvalgidek binolarga taqsimlanadi. */
    const placedSet = new Set(camPoints.map((p) => p.ch));
    const rest = nvrCameras.filter((c) => !placedSet.has(c.channel));
    const spots = (data?.buildings ?? [])
      .filter((b) => b.c === 1 && Math.abs(signedArea(b.p)) >= MIN_HOST_AREA)
      .flatMap((b) => [b.p[0], b.p[Math.floor(b.p.length / 2)]].map((p) => project(p[0], p[1], b.h + PARAPET, cam)));
    const spread = rest.map((c, i) => ({ at: spots[i % Math.max(1, spots.length)], cam: c, exact: false }));

    return [...placedCams, ...spread.filter((s) => s.at)];
  }, [data, cam, nvrCameras, camPoints]);

  return (
    <div
      ref={wrapRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onContextMenu={(e) => e.preventDefault()}
      /* `c3d-root` — yorug' rejim qoidalari SHU sahna ichida ishlaydi
         (`index.css`): sahna oqargach ustidagi yorliqlar ham qorayishi kerak,
         lekin bu o'zgarish boshqa qorong'i sahnalarga (kamera kadri, rasm)
         tegmasligi shart. */
      className={`c3d-root ${className} relative h-full min-h-0 touch-none select-none overflow-hidden ${
        dragging === "orbit" ? "cursor-grabbing" : dragging === "pan" ? "cursor-move" : "cursor-grab"
      }`}
    >
      {/* Sarlavha bloki — Figma'dagi markaziy nom */}
      <div className="pointer-events-none absolute inset-x-0 top-2 z-20 text-center">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.4em] text-ice-cyan/70">
          {t.campus3d.kicker}
        </p>
        <h2
          className="text-[19px] font-extrabold tracking-[0.1em] text-white"
          /* Sian nur faqat qorong'ida — oq fonda u iflos dog' bo'lib ko'rinadi */
          style={{
            textShadow:
              theme === "light" ? "0 1px 2px rgba(255,255,255,0.9)" : "0 0 20px rgba(77,227,255,0.7)",
          }}
        >
          {data?.name ?? t.campus3d.fallbackName}
        </h2>
        <p className="text-[9.5px] tracking-wide text-white/40">
          {data ? t.campus3d.source(data.region) : t.common.loading}
        </p>
        {missing3D && (
          <p className="mt-0.5 text-[9.5px] font-semibold tracking-wide text-amber-400/80">
            {t.campus3d.missing3D(missingName)}
          </p>
        )}
      </div>

      {failed && (
        <p className="absolute inset-0 grid place-items-center text-[11px] text-slate-500">
          {t.campus3d.loadFailed}
        </p>
      )}

      {/* Kampusning haqiqiy xaritasi — 3D bilan bir xil proyeksiyada.
          Manba faqat ichki tile-server (`dark` uslubi — HUD bilan bir xil navy);
          u javob bermasa qatlam butunlay o'chadi (tashqi xarita YO'Q). */}
      {showBase && scale > 0 && data && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ background: pal.ground }}>
          <TileLayer
            center={data.center}
            scale={scale}
            rotDeg={rotDeg}
            tilt={tilt}
            ox={ox}
            oy={oy}
            box={box}
            style={tileStyleFor(theme)}
          />
          <div
            className="absolute inset-0"
            style={{ background: pal.vignette }}
          />
        </div>
      )}

      <svg className="absolute inset-0 h-full w-full" style={{ background: showBase ? "transparent" : pal.ground }}>
        <defs>
          <radialGradient id="c3dAlarm" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FF2D55" stopOpacity="0.42" />
            <stop offset="65%" stopColor="#FF2D55" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#FF2D55" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="c3dGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={pal.glowFrom} stopOpacity="0.75" />
            <stop offset="100%" stopColor={pal.glowTo} stopOpacity="0" />
          </radialGradient>
        </defs>

        {!showBase && <rect x={0} y={0} width="100%" height="100%" fill="url(#c3dGlow)" opacity={0.55} />}

        {scale > 0 && (
          <g transform={`translate(${ox},${oy}) scale(${scale})`}>
            {/* Kampus hududi — universitetning to'liq chegarasi */}
            {data && data.campus.length > 2 && (
              <>
                <path
                  d={path(data.campus.map(([x, y]) => project(x, y, 0, cam)))}
                  fill={pal.areaFill}
                  stroke={pal.areaStroke}
                  strokeWidth={1.4}
                  strokeLinejoin="round"
                  style={{ filter: pal.areaShadow }}
                />
                <path
                  d={path(data.campus.map(([x, y]) => project(x, y, 0, cam)))}
                  fill="none"
                  stroke={pal.areaDash}
                  strokeWidth={0.4}
                  strokeDasharray="5 4"
                />
              </>
            )}

            {/* Yo'llar — faqat sun'iy yo'ldosh o'chirilganda (aks holda ikkilanadi) */}
            {!showBase &&
              data?.roads.map((r, i) => (
                <path
                  key={`r${i}`}
                  d={line(r.p.map(([x, y]) => project(x, y, 0, cam)))}
                  stroke={pal.road}
                  strokeWidth={r.w * tilt}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
              ))}

            {data?.greens.map((g, i) => (
              <path
                key={`g${i}`}
                d={path(g.p.map(([x, y]) => project(x, y, 0, cam)))}
                fill={showBase ? pal.greenBase : pal.green}
                stroke={pal.greenEdge}
                strokeWidth={0.5}
              />
            ))}

            {/* Binolar — orqadan oldinga (painter's algorithm).
                Devor → qavat/deraza chiziqlari → parapet lentasi → tom. */}
            {prepared.map((b) => (
              <g key={b.key}>
                {b.walls.map((w, i) => (
                  <path key={i} d={w.d} fill={w.fill} stroke={b.edge} strokeWidth={0.28} />
                ))}
                {b.floors && (
                  <path
                    d={b.floors}
                    fill="none"
                    stroke={b.campus ? pal.floorsCampus : pal.floorsCity}
                    strokeWidth={0.22}
                  />
                )}
                {/* ── 179-MAKTAB FASADI ──
                    Tartib MUHIM: poydevor → qavat chiqig'i → rom →
                    shisha. Har biri oldingisining ustiga tushadi, ya'ni
                    rom deraza atrofida ramka bo'lib ko'rinadi. */}
                {b.plinth && <path d={b.plinth} fill={fpal.plinth} stroke="none" />}
                {b.ledges && <path d={b.ledges} fill={fpal.ledge} stroke="none" opacity={0.65} />}
                {b.frames && <path d={b.frames} fill={fpal.frame} stroke="none" />}
                {b.glass && <path d={b.glass} fill={fpal.glass} stroke="none" />}
                {b.bands.map((d, i) => (
                  <path key={`p${i}`} d={d} fill={b.campus ? pal.bandCampus : pal.bandCity} stroke="none" />
                ))}
                <path
                  d={path(b.roof)}
                  fill={b.roofFill}
                  stroke={b.edge}
                  strokeWidth={b.campus ? 0.6 : 0.3}
                  // Kampus binosiga bosilsa ichki ko'rinish (qavatlar) ochiladi
                  onClick={b.host ? () => setInteriorIdx(b.index) : undefined}
                  style={b.host ? { cursor: "pointer" } : undefined}
                >
                  {b.host && <title>{t.campus3d.buildingInterior(b.name ?? t.campus3d.building)}</title>}
                </path>

                {/* ── KO'TARILGAN TOM PLITASI (179-maktab) ──
                    ⚠️ Bino tomidan (`b.roof`, parapet sathi) KEYIN
                    chiziladi: SVG'da keyingi element ustiga tushadi,
                    aks holda parapet plitani berkitardi.
                    Tartib: yon qirralar (qalinlik) → ustki yuza. */}
                {b.roofSide && <path d={b.roofSide} fill={fpal.roofSide} stroke="none" />}
                {b.roofSlab && (
                  <path d={b.roofSlab} fill={fpal.roof} stroke={fpal.roofSide} strokeWidth={0.3} />
                )}
              </g>
            ))}

            {/* Ochiq hodisa atrofidagi radius — qayerda sodir bo'lganini ko'rsatadi */}
            {open && (
              <ellipse
                cx={project(open.at[0], open.at[1], 0, cam)[0]}
                cy={project(open.at[0], open.at[1], 0, cam)[1]}
                rx={95}
                ry={95 * tilt}
                fill="url(#c3dAlarm)"
                opacity={pal.alarmOpacity}
                className="c3d-pulse"
              />
            )}
          </g>
        )}
      </svg>

      {/* Kamera nuqtalari — bosilsa O'SHA kameraning oqimi ochiladi.
          DIQQAT: ilgari bu `pointer-events-none` edi va bosish tagidagi bino
          tomiga o'tib ketardi, ya'ni kamerani bosganda bino ichki ko'rinishi
          ochilardi. Endi tugma — bino tomiga bosish alohida qoladi. */}
      {scale > 0 &&
        cams.map((c, i) => (
          <button
            key={`cam${i}`}
            type="button"
            title={c.cam ? `${c.cam.name} · ${t.common.channel} ${c.cam.channel}` : t.common.camera}
            onClick={(e) => {
              e.stopPropagation();
              if (!c.cam) return;
              /* Bo'lim ALMASHMAYDI — oqim 3D kampus USTIDA ochiladi va
                 yopilganda foydalanuvchi shu sahnada qoladi. */
              setCamChannel(String(c.cam.channel));
            }}
            /* ⚠️ Ikonka "Aniqlanganlar" KPI qatoridagi bilan AYNI
               (`SecurityCamera`, `cam-kpi-chip`) — butun panelda kamera
               bitta belgi bilan tanilsin. Ilgari bu yerda `Video`
               (videokamera) turardi, KPI'da esa kuzatuv kamerasi. */
            className={`absolute z-10 grid h-[18px] w-[18px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-lg text-white transition-transform ${
              c.cam ? "cursor-pointer hover:scale-125" : "pointer-events-none"
            }`}
            style={{
              ...toPx(c.at),
              background: "#22D3EE",
              boxShadow: "0 6px 16px -8px #22D3EE",
            }}
          >
            <SecurityCamera size={11} weight="fill" />
          </button>
        ))}

      {/* Hodisa markerlari — aniqlangan joyda turadi */}
      {scale > 0 &&
        placed.map((p) => {
          const base = project(p.at[0], p.at[1], 0, cam);
          const top = project(p.at[0], p.at[1], p.height, cam);
          const color = p.alert.alarm ? ALERT_COLOR.alarm : ALERT_COLOR.normal;
          return (
            <button
              key={p.alert.id}
              onClick={() => setOpenId(openId === p.alert.id ? null : p.alert.id)}
              title={`${p.alert.title} \u00b7 ${p.alert.camera}`}
              className="absolute z-20 w-6 -translate-x-1/2"
              style={{ ...toPx(top), height: Math.max(6, (base[1] - top[1]) * scale) }}
            >
              <span
                className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2"
                style={{ background: color, opacity: 0.85 }}
              />
              <span
                className="absolute bottom-0 left-1/2 h-1.5 w-1.5 -translate-x-1/2 translate-y-1/2 rounded-full"
                style={{ background: color, boxShadow: `0 0 8px ${color}` }}
              />
              <span
                className={`absolute left-1/2 top-0 grid h-6 w-6 -translate-x-1/2 -translate-y-1/2 place-items-center ${
                  openId === p.alert.id ? "" : "c3d-blink"
                }`}
                style={{ filter: `drop-shadow(0 0 8px ${color})` }}
              >
                <AlertTriangle size={22} strokeWidth={2.2} style={{ color }} fill={pal.markerFill} />
              </span>
            </button>
          );
        })}

      {/* Kamera boshqaruvi (Figma: pastki o'ng burchak) */}
      <div className="absolute bottom-3 right-3 z-30 flex flex-col gap-1.5">
        <MapBtn
          title={base === "tiles" ? t.campus3d.layerTiles : t.campus3d.layerOff}
          onClick={() => setBase((b) => (b === "off" ? "tiles" : "off"))}
          active={showBase}
        >
          <Layers size={13} />
        </MapBtn>
        <MapBtn title={t.common.resetView} onClick={resetView}><RotateCcw size={13} /></MapBtn>
        <MapBtn title={t.common.zoomIn} onClick={() => setZoom((z) => Math.min(6, z * 1.25))}><Plus size={13} /></MapBtn>
        <MapBtn title={t.common.zoomOut} onClick={() => setZoom((z) => Math.max(0.5, z / 1.25))}><Minus size={13} /></MapBtn>
      </div>

      {/* Boshqaruv izohi + kamera holati */}
      <div className="pointer-events-none absolute bottom-3 left-1/2 z-30 -translate-x-1/2 rounded-sm border border-ice-cyan/25 bg-[#06192c]/80 px-2.5 py-1 text-[9px] tracking-wide text-ice-cyan/70 backdrop-blur-sm">
        {t.campus3d.controlsHint}
        <span className="ml-2 font-mono text-white/60">
          {((rotDeg % 360) + 360) % 360}° · {Math.round(zoom * 100)}%
        </span>
      </div>

      {/* Marker kartochkasi — bosilsa hodisa DOSSIYESI shu yerda ochiladi.
          ⚠️ Ilgari `setActivePage("Aniqlanganlar")` chaqirilardi va
          foydalanuvchi 3D kampusdan chiqib ketardi (qavat, kamera va
          kamera burchagi tanlovi yo'qolardi). */}
      <AnimatePresence>
        {open && scale > 0 && (
          <AlertCard
            key={open.alert.id}
            alert={open.alert}
            onOpen={() => setDossierId(Number(open.alert.id))}
            onClose={() => setOpenId(null)}
            style={toPx(project(open.at[0], open.at[1], open.height, cam))}
          />
        )}
      </AnimatePresence>

      {/* Bino ichki ko'rinishi — qavatlar, xonalar, kameralar */}
      <AnimatePresence>
        {interiorIdx != null && data?.buildings[interiorIdx] && (
          <BuildingInterior
            building={data.buildings[interiorIdx]}
            campusName={data.name}
            onClose={() => {
              setInteriorIdx(null);
              onInteriorClose?.();
            }}
          />
        )}
      </AnimatePresence>

      {/* Kamera oqimi — 3D kampus USTIDA, bo'lim almashmasdan. */}
      <CameraQuickView channel={camChannel} onClose={() => setCamChannel(null)} />

      {/* Hodisa dossiyesi — "Aniqlanganlar" dagi bilan AYNI oyna. */}
      <EventDossier eventId={dossierId} onClose={() => setDossierId(null)} />
    </div>
  );
}

function MapBtn({
  children,
  title,
  onClick,
  active,
}: {
  children: ReactNode;
  title: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      /* `c3d-btn` — yorug' rejim uchun ilgak (`index.css`) */
      className={`c3d-btn grid h-7 w-7 place-items-center rounded-[2px] border transition-colors hover:bg-ice-cyan/30 hover:text-white ${
        active
          ? "is-on border-ice-cyan bg-ice-cyan/30 text-white"
          : "border-ice-cyan/40 bg-ice-cyan/15 text-ice-cyan"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Marker kartochkasi — hodisa qayerda sodir bo'lganini joyida ko'rsatadi.
 *
 * Kartochkaning O'ZI bosiladi: bosilsa Aniqlanganlar sahifasi ochilib, aynan
 * shu hodisa tanlanadi. Ya'ni marker → qisqa ko'rinish → to'liq tafsilot.
 * Yopish tugmasi kartochka ichidagi tugmadan TASHQARIDA turadi (bir tugma
 * ichida ikkinchisi yaroqsiz HTML).
 */
function AlertCard({
  alert,
  onOpen,
  onClose,
  style,
}: {
  alert: CampusAlert;
  onOpen: () => void;
  onClose: () => void;
  style: { left: number; top: number };
}) {
  const t = useT();
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="absolute z-40 w-[248px] overflow-hidden rounded-md border border-white/12 bg-[#0B1220]/95 shadow-xl backdrop-blur"
      style={{ left: style.left + 18, top: style.top + 10 }}
    >
      <button onClick={onOpen} className="block w-full text-left" title={t.campus3d.openEvent}>
        <DetectionThumb id={alert.id} eager className="aspect-video w-full bg-black/40" alt={alert.title} />

        <div className="space-y-1.5 p-2.5">
          <div className="flex items-center gap-1.5">
            <AlertTriangle
              size={13}
              className="flex-none"
              style={{ color: alert.alarm ? ALERT_COLOR.alarm : ALERT_COLOR.normal }}
            />
            <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-slate-100">{alert.title}</span>
            {alert.alarm && <Pill tone="red">{t.common.dangerous}</Pill>}
          </div>

          <dl className="space-y-0.5 text-[10.5px]">
            <CardRow label={t.common.details} value={alert.subject} />
            <CardRow label={t.common.camera} value={alert.camera} />
            <CardRow label={t.common.time} value={alert.time} mono />
          </dl>

          <p className="flex items-center gap-1 pt-0.5 text-[10.5px] font-medium text-cyan-300">
            {t.campus3d.more}
            <ChevronRight size={12} />
          </p>
        </div>
      </button>

      <button
        onClick={onClose}
        title={t.common.close}
        className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded bg-black/60 text-slate-300 transition-colors hover:text-white"
      >
        <X size={12} />
      </button>
    </motion.div>
  );
}

function CardRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="flex-none text-slate-500">{label}:</dt>
      <dd className={`min-w-0 flex-1 truncate text-right text-slate-200 ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}
