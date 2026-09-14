/**
 * Kuzatuvdagi muassasalarning HAQIQIY hudud chegaralari — Geo Analitika
 * xaritasi uchun.
 *
 * Manba `public/geojson/campus/<campus>.json` (Campus3D ham shuni o'qiydi):
 * koordinatalar METRDA, origin = `center` (`[lat, lng]`). Xaritaga qo'yish
 * uchun ular lng/lat ga qaytariladi — Campus3D dagi `toLonLat()` ning AYNAN
 * o'zi (tekis yaqinlashish, kampus o'lchamida xatolik sezilmaydi).
 *
 * Nega viloyat poligonlari emas: Geo Analitika endi butun O'zbekiston yoki
 * butun Toshkent shahri konturini chizmaydi — faqat kuzatuv olib borilayotgan
 * hududlar ko'rinadi.
 */
import { INSTITUTIONS } from "@/config/institutions";

/** Metr ↔ daraja (kampus markazi atrofidagi tekis yaqinlashish). */
const M_PER_DEG_LAT = 111320;

/** Kontur shuncha metrga kengaytiriladi (`inflate` izohiga qarang). */
const BUILDING_PAD = 0.6;

type MPt = [number, number];
/** [lng, lat] — MapLibre tartibi. */
export type LngLat = [number, number];

interface CampusFile {
  name: string;
  region: string;
  /** [lat, lng] — metr koordinatalar shu nuqtadan. */
  center: [number, number];
  campus: MPt[];
  /** `c:1` — kampus chegarasi ichidagi bino; `h` — balandlik, metr;
   *  `n` — nomi (OSM'dan yoki qo'lda yozilgan). */
  buildings?: { p: MPt[]; h: number; c: 0 | 1; n?: string }[];
}

/** Kampus hududidagi bino — chegara halqasi [lng, lat], balandligi va nomi. */
export interface CampusBuilding {
  ring: LngLat[];
  h: number;
  /** Bino nomi — bo'lsa xaritada yorliq bo'lib chiqadi. */
  name?: string;
  /**
   * Fasad (deraza/tom/poydevor) qo'shiladimi — `FACADE_MIN_AREA_M2`dan
   * katta yuzali binolarga (2026-09-08 dan, `facadeToGeoJson()`
   * izohiga qarang). Bir joyda hisoblanadi (`toArea()`), boshqa
   * chaqiruvchilar (masalan bino bosilganda ICHKI ko'rinishni ochish —
   * `Map3D.tsx`) qayta hisoblamasdan shu bayroqdan foydalanadi.
   */
  hasFacade: boolean;
  /**
   * XOM (metr fazosidagi) bino yozuvi — `BuildingInterior.tsx` shu
   * shaklni kutadi (`{p, h, n}`, `mk-179.json`dagi bilan AYNI). `ring`
   * (yuqorida) xaritaga chizish uchun lng/lat'ga o'girilgan va
   * `BUILDING_PAD` bilan kengaytirilgan — ICHKI reja esa ASL konturdan
   * qurilishi kerak, shuning uchun ikkalasi ALOHIDA saqlanadi.
   */
  raw: { p: [number, number][]; h: number; n?: string };
}

export interface CampusArea {
  /** Muassasa id'si (`edu-…`) — tanlash shu bo'yicha. */
  id: string;
  name: string;
  short: string;
  region: string;
  /** Chegara halqasi, [lng, lat]. */
  ring: LngLat[];
  /** Hudud yuzasi, m² (yorliqda ko'rsatiladi). */
  area: number;
  /** Yorliq qo'yiladigan nuqta, [lng, lat]. */
  center: LngLat;
  /** Hudud ICHIDAGI binolar (`c:1`) — xaritada ochiq rangda ko'tariladi. */
  buildings: CampusBuilding[];
}

/**
 * Bino konturini markazidan `pad` metrga KENGAYTIRADI.
 *
 * NEGA KERAK: xaritada shu bino tayl qatlamida ham bor va ikkalasi bir xil
 * joyda ekstruziya qilinsa devor yuzalari ustma-ust tushib "z-fighting"
 * (miltillash) beradi. Yarim metr kattaroq kontur tayldagisini butunlay
 * o'rab oladi — ekranda faqat bittasi, ochiq rangdagisi ko'rinadi.
 *
 * Markazdan masshtablash — L/E shaklidagi binoda taxminiy, lekin xato
 * santimetrlarda va ko'zga tashlanmaydi.
 */
function inflate(p: MPt[], pad: number): MPt[] {
  const [cx, cy] = centroid(p);
  return p.map(([x, y]) => {
    const dx = x - cx;
    const dy = y - cy;
    const r = Math.hypot(dx, dy);
    if (r < 0.001) return [x, y] as MPt;
    const k = (r + pad) / r;
    return [cx + dx * k, cy + dy * k] as MPt;
  });
}

/** Shoelace — metr koordinatada, ya'ni natija to'g'ridan-to'g'ri m². */
function polyArea(p: MPt[]): number {
  let s = 0;
  for (let i = 0; i < p.length; i++) {
    const [x1, y1] = p[i];
    const [x2, y2] = p[(i + 1) % p.length];
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s / 2);
}

function centroid(p: MPt[]): MPt {
  let x = 0;
  let y = 0;
  for (const [a, b] of p) {
    x += a;
    y += b;
  }
  return [x / p.length, y / p.length];
}

/** Kampus faylini bitta `CampusArea` ga aylantiradi. */
function toArea(id: string, short: string, file: CampusFile): CampusArea | null {
  if (!Array.isArray(file.campus) || file.campus.length < 3) return null;

  const [lat0, lng0] = file.center;
  const mLng = M_PER_DEG_LAT * Math.cos((lat0 * Math.PI) / 180);
  // DIQQAT: `y` janubga qarab o'sadi — shuning uchun kenglikdan AYIRILADI
  const toLngLat = ([x, y]: MPt): LngLat => [lng0 + x / mLng, lat0 - y / M_PER_DEG_LAT];

  const ring = file.campus.map(toLngLat);
  // GeoJSON poligoni yopiq bo'lishi kerak
  const [fx, fy] = ring[0];
  const [lx, ly] = ring[ring.length - 1];
  if (fx !== lx || fy !== ly) ring.push([fx, fy]);

  // Hudud ichidagi BARCHA binolar. Mayda qurilmalarni ham chizamiz — aks
  // holda ular tayl qatlamidagi qorong'i holida qolib, hudud ichi ola-chipor
  // bo'lib ko'rinadi.
  const buildings: CampusBuilding[] = (file.buildings ?? [])
    .filter((b) => b.c === 1 && b.p.length >= 3)
    .map((b) => {
      const r = inflate(b.p, BUILDING_PAD).map(toLngLat);
      r.push(r[0]);
      const h = Math.max(3, b.h);
      return {
        ring: r,
        h,
        name: b.n,
        /* `polyArea(b.p)` — XOM (metr) konturning o'zi, `FACADE_MIN_AREA_M2`
           izohiga qarang (`facadeToGeoJson()` shu bayroqni qayta
           hisoblamasdan ishlatadi). */
        hasFacade: polyArea(b.p) >= FACADE_MIN_AREA_M2,
        raw: { p: b.p, h, n: b.n },
      };
    });

  return {
    id,
    name: file.name,
    short,
    region: file.region,
    ring,
    area: Math.round(polyArea(file.campus)),
    center: toLngLat(centroid(file.campus)),
    buildings,
  };
}

/**
 * Barcha kuzatuvdagi hududlar — BIR MARTA yuklanadi (modul darajasidagi
 * promise). Bitta fayl ochilmasa u tashlab ketiladi, qolganlari chiziladi.
 */
let areasPromise: Promise<CampusArea[]> | null = null;

export function loadCampusAreas(): Promise<CampusArea[]> {
  areasPromise ??= Promise.all(
    INSTITUTIONS.map((inst) =>
      fetch(`/geojson/campus/${inst.campus}.json`)
        .then((r) => (r.ok ? (r.json() as Promise<CampusFile>) : Promise.reject(new Error(String(r.status)))))
        .then((file) => toArea(inst.id, inst.short, file))
        .catch(() => null)
    )
  )
    .then((list) => list.filter((a): a is CampusArea => a !== null))
    .catch((e) => {
      areasPromise = null; // xato keshda qolmasin
      throw e;
    });
  return areasPromise;
}

/** MapLibre manbasi uchun tayyor FeatureCollection. */
export function areasToGeoJson(areas: CampusArea[]) {
  return {
    type: "FeatureCollection" as const,
    features: areas.map((a) => ({
      type: "Feature" as const,
      properties: { id: a.id, name: a.name, short: a.short, area: a.area },
      geometry: { type: "Polygon" as const, coordinates: [a.ring] },
    })),
  };
}

/** Hudud ICHIDAGI binolar — alohida manba (ochiq rangda ko'tariladi). */
export function buildingsToGeoJson(areas: CampusArea[]) {
  return {
    type: "FeatureCollection" as const,
    features: areas.flatMap((a) =>
      a.buildings.map((b, i) => ({
        type: "Feature" as const,
        // `name` bo'sh bo'lsa MapLibre yorliqni o'zi chizmaydi
        properties: { id: a.id, h: b.h, key: `${a.id}-${i}`, name: b.name ?? "" },
        geometry: { type: "Polygon" as const, coordinates: [b.ring] },
      }))
    ),
  };
}

/**
 * Bino ichidagi ENG "chuqur" nuqta — yorliq shu yerga qo'yiladi.
 *
 * ⚠️ Oddiy CENTROID yaramaydi: U yoki H shaklidagi binoda u poligondan
 * TASHQARIDA qoladi (179-maktab o'quv korpusi — aynan shunday, 12 nuqtali
 * U shakl). Shuning uchun bbox ustidan qo'pol panjara yuriladi va ichkarida
 * turgan, chetlardan eng uzoq nuqta tanlanadi ("pole of inaccessibility"
 * ning soddalashtirilgan varianti — 6 ta bino uchun yetarli).
 */
function labelAnchor(ring: LngLat[]): LngLat {
  const xs = ring.map((q) => q[0]);
  const ys = ring.map((q) => q[1]);
  const [x0, x1] = [Math.min(...xs), Math.max(...xs)];
  const [y0, y1] = [Math.min(...ys), Math.max(...ys)];

  const inside = (x: number, y: number): boolean => {
    let c = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  /** Nuqtadan eng yaqin qirragacha masofa (daraja) — chuqurlik o'lchovi. */
  const depth = (x: number, y: number): number => {
    let best = Infinity;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [ax, ay] = ring[j];
      const [bx, by] = ring[i];
      const dx = bx - ax;
      const dy = by - ay;
      const L = dx * dx + dy * dy;
      const t = L === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L));
      best = Math.min(best, Math.hypot(x - (ax + t * dx), y - (ay + t * dy)));
    }
    return best;
  };

  const N = 16;
  let bestPt: LngLat = [(x0 + x1) / 2, (y0 + y1) / 2];
  let bestDepth = -1;
  for (let i = 1; i < N; i++) {
    for (let j = 1; j < N; j++) {
      const x = x0 + ((x1 - x0) * i) / N;
      const y = y0 + ((y1 - y0) * j) / N;
      if (!inside(x, y)) continue;
      const dd = depth(x, y);
      if (dd > bestDepth) {
        bestDepth = dd;
        bestPt = [x, y];
      }
    }
  }
  return bestPt;
}

/**
 * Bino YORLIQLARI — alohida NUQTA manbasi.
 *
 * ⚠️ NEGA poligon manbasidan emas: MapLibre GeoJSON'ni TAYLLARGA bo'ladi va
 * katta bino ikki taylga tushsa, har bir bo'lakka ALOHIDA yorliq chizadi —
 * ekranda bitta bino ikki marta nomlanardi (179-maktab o'quv korpusi, 78×55 m,
 * o'lchandi). Nuqta manbasida har bino uchun ATIGI BITTA feature bor,
 * shuning uchun yorliq ham bitta.
 */
export function buildingLabelsToGeoJson(areas: CampusArea[]) {
  return {
    type: "FeatureCollection" as const,
    features: areas.flatMap((a) =>
      a.buildings
        .filter((b) => !!b.name)
        .map((b, i) => ({
          type: "Feature" as const,
          properties: { id: a.id, key: `${a.id}-lbl-${i}`, name: b.name ?? "" },
          geometry: { type: "Point" as const, coordinates: labelAnchor(b.ring) },
        }))
    ),
  };
}

/**
 * Hudud binolarining markazlari — KATTA binodan boshlab tartiblangan.
 *
 * Kamera va hodisa markerlari shu nuqtalarga taqsimlanadi: aniqlash API
 * hodisada ham, kanalda ham KOORDINATA BERMAYDI (faqat kamera nomi), shuning
 * uchun ularni binolarga bog'laymiz — operator qaysi binoda nima
 * bo'layotganini ko'rsin. Koordinata paydo bo'lsa shu funksiya o'rniga
 * to'g'ridan-to'g'ri o'sha qiymat ishlatiladi.
 */
export function buildingAnchors(area: CampusArea): { lng: number; lat: number; h: number }[] {
  return area.buildings
    .map((b) => {
      let lng = 0;
      let lat = 0;
      // Oxirgi nuqta birinchisining nusxasi (yopiq halqa) — hisobga olinmaydi
      const n = b.ring.length - 1;
      for (let i = 0; i < n; i++) {
        lng += b.ring[i][0];
        lat += b.ring[i][1];
      }
      return { lng: lng / n, lat: lat / n, h: b.h, size: ringArea(b.ring) };
    })
    .sort((a, b) => b.size - a.size)
    .map(({ lng, lat, h }) => ({ lng, lat, h }));
}

/** Halqa yuzasi (daraja²) — faqat TARTIBLASH uchun, o'lchov birligi muhim emas. */
function ringArea(r: LngLat[]): number {
  let s = 0;
  for (let i = 0; i < r.length - 1; i++) {
    s += r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1];
  }
  return Math.abs(s / 2);
}

/** Barcha hududlarni qamrab oladigan to'rtburchak — `fitBounds` uchun. */
export function areasBounds(areas: CampusArea[]): [[number, number], [number, number]] | null {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;
  for (const a of areas) {
    for (const [lng, lat] of a.ring) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  }
  return Number.isFinite(minLng) ? [[minLng, minLat], [maxLng, maxLat]] : null;
}

/* ══════════════════════════════════════════════════════════════════════
   DARAXTLAR — kampusning YASHIL hududiga (2026-09-05)
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Kampus hovlisiga daraxt nuqtalarini "ekadi".
 *
 * Manba GeoJSON'da yashil zona ALOHIDA belgilanmagan — faqat kampus
 * halqasi va binolar bor. Shuning uchun "yashil hudud" =
 * **kampus ichi − binolar − chetdagi yo'lak**, ya'ni ayirma bilan
 * topiladi.
 *
 * ── QOIDALAR ──────────────────────────────────────────────────────────
 * · **Panjara + siljish** (grid + jitter), tasodifiy sochish EMAS:
 *   sof tasodifda daraxtlar to'da-to'da bo'lib qolardi va oraliqlar
 *   bo'sh qolardi.
 * · **Generator BARQAROR** (`lcg`, urug' — kampus id'si): har renderda
 *   daraxtlar AYNI joyda turadi. Aks holda xarita har qayta chizilganda
 *   butun o'rmon "sakrardi".
 * · **Bino ustiga ekilmaydi** — kontur `BUILD_PAD` metrga kengaytirilib
 *   tekshiriladi (tom chetidagi daraxt binoga yopishib ko'rinardi).
 * · **Chegaradan `EDGE_PAD` metr ichkarida** — aks holda daraxt
 *   ko'chaga chiqib qolardi.
 */

/** Daraxtlar orasidagi o'rtacha masofa, metr. */
const TREE_STEP = 9;
/** Panjaradan siljish, metr — qator bo'lib tizilib qolmasin. */
const TREE_JITTER = 3.4;
/** Binodan saqlanish masofasi, metr. */
const BUILD_PAD = 3.5;
/** Kampus chegarasidan ichkarilash, metr. */
const EDGE_PAD = 4;
/** Bitta kampusdagi daraxt chegarasi — xarita sekinlashmasin. */
const MAX_TREES = 420;

/** Barqaror psevdo-tasodif (LCG) — bir xil urug' doim bir xil natija. */
function lcg(seed: number) {
  let s = seed >>> 0 || 1;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}

/** Matndan barqaror urug'. */
function seedOf(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Nuqta halqa ichidami — nur tashlash (ray casting). */
function inRing(ring: LngLat[], lng: number, lat: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Nuqtadan halqagacha eng qisqa masofa, METRDA (taxminiy, kampus o'lchamida yetarli). */
function distToRing(ring: LngLat[], lng: number, lat: number, mPerDegLng: number): number {
  let best = Infinity;
  for (let i = 0; i < ring.length - 1; i++) {
    const ax = (ring[i][0] - lng) * mPerDegLng;
    const ay = (ring[i][1] - lat) * M_PER_DEG_LAT;
    const bx = (ring[i + 1][0] - lng) * mPerDegLng;
    const by = (ring[i + 1][1] - lat) * M_PER_DEG_LAT;
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 > 0 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2)) : 0;
    const px = ax + dx * t;
    const py = ay + dy * t;
    const d = Math.hypot(px, py);
    if (d < best) best = d;
  }
  return best;
}

/**
 * Daraxtlar — MapLibre `symbol` qatlami uchun nuqta to'plami.
 *
 * Har nuqtada: `s` — o'lcham koeffitsienti (0.75…1.25, bir xil
 * o'lchamdagi daraxtlar sun'iy ko'rinadi), `k` — tur (0 yoki 1:
 * bargli / ignabargli), `y` — kenglik (chizish tartibi uchun: oldingi
 * daraxt keyin chizilsin).
 */
export function treesToGeoJson(areas: CampusArea[]) {
  const features: {
    type: "Feature";
    properties: { id: string; s: number; k: number; y: number };
    geometry: { type: "Point"; coordinates: LngLat };
  }[] = [];

  for (const a of areas) {
    const rnd = lcg(seedOf(a.id));
    /* Kampus markazidagi uzunlik darajasi — metrga o'tkazish uchun. */
    const midLat = a.center[1];
    const mPerDegLng = M_PER_DEG_LAT * Math.cos((midLat * Math.PI) / 180);
    const stepLng = TREE_STEP / mPerDegLng;
    const stepLat = TREE_STEP / M_PER_DEG_LAT;

    let minLng = Infinity;
    let maxLng = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;
    for (const [lng, lat] of a.ring) {
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }

    let planted = 0;
    for (let lat = minLat; lat <= maxLat && planted < MAX_TREES; lat += stepLat) {
      for (let lng = minLng; lng <= maxLng && planted < MAX_TREES; lng += stepLng) {
        const jx = ((rnd() - 0.5) * 2 * TREE_JITTER) / mPerDegLng;
        const jy = ((rnd() - 0.5) * 2 * TREE_JITTER) / M_PER_DEG_LAT;
        const x = lng + jx;
        const y = lat + jy;

        if (!inRing(a.ring, x, y)) continue;
        if (distToRing(a.ring, x, y, mPerDegLng) < EDGE_PAD) continue;
        /* Bino ustiga (va yonига `BUILD_PAD` metrga) ekilmaydi. */
        let blocked = false;
        for (const b of a.buildings) {
          if (inRing(b.ring, x, y) || distToRing(b.ring, x, y, mPerDegLng) < BUILD_PAD) {
            blocked = true;
            break;
          }
        }
        if (blocked) continue;

        features.push({
          type: "Feature",
          properties: { id: a.id, s: 0.75 + rnd() * 0.5, k: rnd() < 0.62 ? 0 : 1, y },
          geometry: { type: "Point", coordinates: [x, y] },
        });
        planted++;
      }
    }
  }

  return { type: "FeatureCollection" as const, features };
}

/* ══════════════════════════════════════════════════════════════════════
   179-MAKTAB FASADI — protsedural derazalar (2026-09-05)
   ══════════════════════════════════════════════════════════════════════ */

/**
 * Fasad qo'shiladigan YAGONA bino.
 *
 * ⚠️ Moslik **NOM bo'yicha** (`CampusBuilding.name`), indeks yoki
 * koordinata bo'yicha EMAS: `public/geojson/campus/mk-179.json` OSM'dan
 * qayta yig'ilsa binolar tartibi o'zgaradi, nom esa qo'lda yozilgan va
 * saqlanadi (`tools/campus3d/add-ml-buildings.mjs` uni qayta yozmaydi).
 *
 * O'lchandi (2026-09-05): o'sha faylda `n === "179-maktab"` bo'lgan
 * BITTA bino bor — `c:1`, `h:13.2 m`, yuzasi 2398 m², 12 nuqta.
 *
 * ⚠️ **2026-09-08 dan bu maydon ENDI YAGONA MEZON EMAS** — pastdagi
 * `FACADE_MIN_AREA_M2` izohiga qarang (foydalanuvchi so'rovi: "huddi
 * shu ikki binoni ham... bino shakliga keltirib qo'y"). Konstanta O'ZI
 * saqlanadi — kod boshqa joyda import qilishi mumkin.
 */
export const FACADE_BUILDING_NAME = "179-maktab";

/**
 * Fasad qo'shiladigan MINIMAL yuza, m² (2026-09-08, foydalanuvchi
 * so'rovi bilan kengaytirildi — ilgari FAQAT `FACADE_BUILDING_NAME`
 * bo'yicha bitta bino edi).
 *
 * ⚠️ **NOM bo'yicha emas, YUZA bo'yicha — ko'pchilik "haqiqiy" bino
 * NOMSIZ.** `mk-179.json`da kampus ICHIDAGI (`c:1`, ya'ni
 * `CampusArea.buildings` — bu massiv ALLAQACHON shu filtr bilan
 * yuklanadi, `toArea()`ga qarang) BOR-YO'G'I 6 ta bino bor, faqat
 * IKKITASI nomlangan ("179-maktab", "Kirish posti"). Indeks BARQAROR
 * EMAS (yuqoridagi izoh), shuning uchun qolgan nomsiz binolarni
 * ajratishning yagona ishonchli yo'li — o'lcham. O'lchandi
 * (2026-09-08), kampus ICHIDAGI binolar yuzasi:
 *
 * | Bino | Nomi | Yuza (m²) |
 * |---|---|---|
 * | 179-maktab | bor | 2398 |
 * | (nomsiz, katta korpus) | yo'q | 718 |
 * | Kirish posti | bor | 196 |
 * | (nomsiz, kichik qurilma) | yo'q | 144 |
 * | (nomsiz, mayda) | yo'q | 18 |
 * | (nomsiz, mayda) | yo'q | 17 |
 *
 * Oxirgi ikkitasi (~17–18 m² — taxminan 4×4 m, transformator yoki
 * axlat qutisi kattaligida) chetlab o'tiladi: ular haqiqiy "bino" emas,
 * ML konturidagi mayda qurilma bo'lishi ehtimoli katta. `100 m²`
 * chegarasi qolgan to'rttasini (shundan foydalanuvchi ikkitasini
 * skrinshotda ko'rsatgan edi) ushlab, shu ikkitasini chetlab o'tadi.
 */
const FACADE_MIN_AREA_M2 = 100;

/** Bir qavat balandligi, metr (`Campus3D` dagi `FLOOR_H` bilan bir xil). */
const FACADE_FLOOR_H = 3.3;
/** Poydevor balandligi. */
const PLINTH_H = 1.05;
/** Deraza o'lchami va joylashuvi, metr. */
const WIN_W = 1.25;
const WIN_H = 1.55;
/** Qavat polidan derazaning pastki qirrasigacha. */
const WIN_SILL = 0.95;
/** Derazalar orasidagi qadam (markazdan markazgacha). */
const WIN_STEP = 2.7;
/** Burchakdan chekinish — deraza qirraga yopishmasin. */
const WIN_MARGIN = 1.3;
/** Rom deraza atrofida shuncha metrga kattaroq. */
const FRAME_PAD = 0.16;
/** Devordan tashqariga chiqish (relyef) — deraza va lentalar uchun. */
const OUT_GLASS = 0.1;
const OUT_FRAME = 0.05;
const OUT_BAND = 0.22;
/** Qavatlararo lenta balandligi. */
const BAND_H = 0.28;

/** Fasad bo'lagining turi — rangni MapLibre `match` ifodasi tanlaydi. */
export type FacadeKind = "plinth" | "band" | "cornice" | "frame" | "glass" | "roof" | "roofEdge";

/* ── TOM PLITASI (2026-09-05, foydalanuvchi so'rovi) ──
   Tom yupqa tekislik emas: devordan chetga CHIQADI, ko'rinadigan
   QALINLIGI bor va devor tepasidan bir oz YUQORIDA turadi. */
/** Tomning devordan chiqishi (overhang), metr. */
const ROOF_OVERHANG = 0.5;
/** Tom plitasining qalinligi, metr. */
const ROOF_SLAB = 0.42;
/** Plita ostidagi to'q qirra (soya lentasi), metr. */
const ROOF_EDGE_H = 0.18;
/** Devor tepasidan tomgacha bo'lgan tirqish — tom "ko'tarilgan" ko'rinsin.
 *  ⚠️ `MapLibreMap` bino tomiga PARAPET qo'shadi (`+0.2 m`), shuning
 *  uchun plita undan yuqorida boshlanishi kerak — aks holda parapet
 *  ostida qolib ko'rinmasdi. */
const ROOF_LIFT = 0.32;

interface FacadeProps {
  id: string;
  kind: FacadeKind;
  /** Ekstruziya pastki va ustki chegarasi, metr (yer sathidan). */
  base: number;
  height: number;
}

/** Qirraning TASHQI normali (birlik vektor, metr fazosida). */
function edgeNormal(a: LngLat, b: LngLat, mPerDegLng: number): [number, number] {
  const dx = (b[0] - a[0]) * mPerDegLng;
  const dy = (b[1] - a[1]) * M_PER_DEG_LAT;
  const len = Math.hypot(dx, dy) || 1;
  return [dy / len, -dx / len];
}

/** Halqa soat strelkasiga teskarimi (yuza belgisi bo'yicha). */
function ringIsCCW(ring: LngLat[]): boolean {
  let s = 0;
  for (let i = 0; i < ring.length - 1; i++) s += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  return s > 0;
}

/** Halqani tashqariga `m` metrga kengaytirish (uchlar bo'ylab normal). */
function offsetRing(ring: LngLat[], m: number, mPerDegLng: number, ccw: boolean): LngLat[] {
  const n = ring.length - 1; // oxirgi nuqta birinchisining nusxasi
  const sign = ccw ? 1 : -1;
  const out: LngLat[] = [];
  for (let i = 0; i < n; i++) {
    const prev = ring[(i - 1 + n) % n];
    const cur = ring[i];
    const next = ring[(i + 1) % n];
    /* Ikki qo'shni qirra normalining o'rtachasi — uchdagi yo'nalish. */
    const nA = edgeNormal(prev, cur, mPerDegLng);
    const nB = edgeNormal(cur, next, mPerDegLng);
    let nx = (nA[0] + nB[0]) * sign;
    let ny = (nA[1] + nB[1]) * sign;
    const len = Math.hypot(nx, ny) || 1;
    nx /= len;
    ny /= len;
    out.push([cur[0] + (nx * m) / mPerDegLng, cur[1] + (ny * m) / M_PER_DEG_LAT]);
  }
  out.push(out[0]);
  return out;
}

/** Yupqa "plastina" — markaz, qirra yo'nalishi va tashqi normal bo'yicha. */
function panel(
  cxLng: number,
  cyLat: number,
  dir: [number, number],
  nor: [number, number],
  halfW: number,
  out: number,
  mPerDegLng: number
): LngLat[] {
  const p = (sw: number, so: number): LngLat => [
    cxLng + (dir[0] * sw + nor[0] * so) / mPerDegLng,
    cyLat + (dir[1] * sw + nor[1] * so) / M_PER_DEG_LAT,
  ];
  const a = p(-halfW, 0);
  const b = p(halfW, 0);
  const c = p(halfW, out);
  const d = p(-halfW, out);
  return [a, b, c, d, a];
}

/**
 * **179-maktab fasadi** — protsedural deraza qatorlari, romlar,
 * qavatlararo lentalar, qorong'i poydevor va tom karnizi.
 *
 * ── QANDAY ISHLAYDI ───────────────────────────────────────────────────
 * Koordinatalar QO'LDA yozilmaydi. Binoning MAVJUD konturi o'qiladi va
 * har bir tashqi qirra uchun:
 *   1. boshi va oxiri olinadi,
 *   2. uzunligi hisoblanadi,
 *   3. yo'nalishi va TASHQI normali topiladi,
 *   4. nechta deraza sig'ishi hisoblanadi (`WIN_STEP`, burchakdan
 *      `WIN_MARGIN` chekinib),
 *   5. derazalar teng oraliqda qo'yiladi va normal bo'ylab tashqariga
 *      chiqariladi (relyef),
 *   6. shu ish HAR QAVAT uchun takrorlanadi (`h / FACADE_FLOOR_H`).
 *
 * Ya'ni bino konturi yoki balandligi o'zgarsa fasad O'ZI moslashadi.
 *
 * ⚠️ **Faqat YETARLICHA KATTA binolar** — `FACADE_MIN_AREA_M2` izohiga
 * qarang (2026-09-08 dan: ilgari FAQAT `FACADE_BUILDING_NAME` bo'yicha
 * bitta bino edi, endi shu chegaradan katta HAMMA bino).
 *
 * ⚠️ Natija BITTA `FeatureCollection`: MapLibre uni bitta
 * `fill-extrusion` qatlamida chizadi (rang `kind` bo'yicha `match`),
 * ya'ni butun fasad — **bitta chizish chaqiruvi**, nechta bino bo'lishidan
 * qat'i nazar.
 */
export function facadeToGeoJson(areas: CampusArea[]) {
  const features: {
    type: "Feature";
    properties: FacadeProps;
    geometry: { type: "Polygon"; coordinates: LngLat[][] };
  }[] = [];

  const add = (ring: LngLat[], properties: FacadeProps) =>
    features.push({ type: "Feature", properties, geometry: { type: "Polygon", coordinates: [ring] } });

  for (const a of areas) {
    const mPerDegLng = M_PER_DEG_LAT * Math.cos((a.center[1] * Math.PI) / 180);
    /* Yuza ALLAQACHON hisoblangan (`toArea()` → `hasFacade`) — qayta
       hisoblanmaydi, faqat filtrlanadi. */
    const targets = a.buildings.filter((b) => b.hasFacade);

    for (const target of targets) {
      const ring = target.ring;
      const ccw = ringIsCCW(ring);
      /** Tashqi normal — halqa yo'nalishiga qarab belgisi almashadi. */
      const outward = (p0: LngLat, p1: LngLat): [number, number] => {
        const [nx, ny] = edgeNormal(p0, p1, mPerDegLng);
        return ccw ? [nx, ny] : [-nx, -ny];
      };

      const floors = Math.max(1, Math.round(target.h / FACADE_FLOOR_H));

      /* ── 1) POYDEVOR — qorong'i beton, konturdan biroz kengroq ── */
      add(offsetRing(ring, 0.28, mPerDegLng, ccw), { id: a.id, kind: "plinth", base: 0, height: PLINTH_H });

      /* ── 2) QAVATLARARO LENTALAR + tom karnizi ── */
      for (let f = 1; f < floors; f++) {
        const y = f * FACADE_FLOOR_H;
        add(offsetRing(ring, OUT_BAND, mPerDegLng, ccw), {
          id: a.id,
          kind: "band",
          base: y - BAND_H / 2,
          height: y + BAND_H / 2,
        });
      }
      add(offsetRing(ring, 0.4, mPerDegLng, ccw), {
        id: a.id,
        kind: "cornice",
        base: target.h - 0.55,
        height: target.h - 0.05,
      });

      /* ── TOM ── Devor tepasidan `ROOF_LIFT` yuqorida boshlanadi, konturdan
         `ROOF_OVERHANG` metr chetga chiqadi. Ikki qatlam:
           · `roofEdge` — plita ostidagi TO'Q qirra (soya),
           · `roof`     — kulrang plitaning o'zi.
         Shu ikkisi tomni tekis "qopqoq" emas, QALINLIGI bor plita qilib
         ko'rsatadi (foydalanuvchi so'rovidagi asosiy talab). */
      const roofRing = offsetRing(ring, ROOF_OVERHANG, mPerDegLng, ccw);
      const roofBase = target.h + ROOF_LIFT;
      add(roofRing, { id: a.id, kind: "roofEdge", base: roofBase, height: roofBase + ROOF_EDGE_H });
      add(roofRing, {
        id: a.id,
        kind: "roof",
        base: roofBase + ROOF_EDGE_H,
        height: roofBase + ROOF_EDGE_H + ROOF_SLAB,
      });

      /* ── 3) DERAZALAR — har qirra, har qavat ── */
      for (let i = 0; i < ring.length - 1; i++) {
        const p0 = ring[i];
        const p1 = ring[i + 1];
        const dxm = (p1[0] - p0[0]) * mPerDegLng;
        const dym = (p1[1] - p0[1]) * M_PER_DEG_LAT;
        const wallLen = Math.hypot(dxm, dym);
        /* Qisqa qirra (burchak kesimi) — deraza sig'maydi. */
        if (wallLen < WIN_MARGIN * 2 + WIN_W) continue;

        const dir: [number, number] = [dxm / wallLen, dym / wallLen];
        const nor = outward(p0, p1);
        const usable = wallLen - WIN_MARGIN * 2;
        const count = Math.max(1, Math.floor(usable / WIN_STEP) + 1);
        const gap = count > 1 ? usable / (count - 1) : 0;

        for (let f = 0; f < floors; f++) {
          /* Birinchi qavat poydevordan yuqorida boshlanadi. */
          const sill = f * FACADE_FLOOR_H + WIN_SILL + (f === 0 ? PLINTH_H * 0.35 : 0);
          for (let w = 0; w < count; w++) {
            const t = WIN_MARGIN + (count > 1 ? w * gap : usable / 2);
            const cxLng = p0[0] + (dir[0] * t) / mPerDegLng;
            const cyLat = p0[1] + (dir[1] * t) / M_PER_DEG_LAT;

            /* Rom — derazadan kattaroq va devorga yaqinroq. */
            add(panel(cxLng, cyLat, dir, nor, WIN_W / 2 + FRAME_PAD, OUT_FRAME, mPerDegLng), {
              id: a.id,
              kind: "frame",
              base: sill - FRAME_PAD,
              height: sill + WIN_H + FRAME_PAD,
            });
            /* Shisha — romdan tashqariroq (chuqurlik taassuroti). */
            add(panel(cxLng, cyLat, dir, nor, WIN_W / 2, OUT_GLASS, mPerDegLng), {
              id: a.id,
              kind: "glass",
              base: sill,
              height: sill + WIN_H,
            });
          }
        }
      }
    }
  }

  return { type: "FeatureCollection" as const, features };
}
