/**
 * Viloyat poligonlarini SODDALASHTIRADI (Ramer–Douglas–Peucker).
 *
 * NEGA kerak: asl `viloyat_4326*.geojson` ~35 MB va ~346K nuqta — MapLibre uni
 * har ochilishda tahlil qiladi va xarita muzlaydi. Xaritaga faqat
 * soddalashtirilgan nusxa beriladi (`REGIONS_GEOJSON_URL`).
 *
 * Tashqi kutubxona ISHLATILMAYDI (loyiha offline) — RDP shu yerda yozilgan.
 *
 * Ishlatish:
 *   node tools/simplify-regions.mjs "public/geojson/viloyat_4326 (1).geojson"
 *
 * Natija: `public/geojson/viloyat_simplified.geojson`
 */
import { readFileSync, writeFileSync } from "node:fs";

/** Chegara aniqligi, GRADUSDA. ~0.002° ≈ 200 m — viloyat ko'lamida ko'z ilg'amaydi. */
const TOLERANCE = 0.002;
/** Shundan kichik halqalar tashlanadi (mayda orolchalar, kv. gradus). */
const MIN_RING_AREA = 1e-5;

/** Nuqtaning [a,b] kesmasidan kvadrat masofasi. */
function sqSegDist(p, a, b) {
  let x = a[0];
  let y = a[1];
  let dx = b[0] - x;
  let dy = b[1] - y;
  if (dx !== 0 || dy !== 0) {
    const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = b[0];
      y = b[1];
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }
  dx = p[0] - x;
  dy = p[1] - y;
  return dx * dx + dy * dy;
}

/** RDP — rekursiyasiz (chuqur halqalarda stek to'lib ketmasin). */
function rdp(points, tol) {
  if (points.length < 3) return points.slice();
  const sqTol = tol * tol;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];

  while (stack.length) {
    const [first, last] = stack.pop();
    let maxSq = 0;
    let index = -1;
    for (let i = first + 1; i < last; i++) {
      const d = sqSegDist(points[i], points[first], points[last]);
      if (d > maxSq) {
        maxSq = d;
        index = i;
      }
    }
    if (maxSq > sqTol && index > 0) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }

  const out = [];
  for (let i = 0; i < points.length; i++) if (keep[i]) out.push(points[i]);
  return out;
}

/** Halqa yuzi (shoelace) — mayda orolchalarni tashlash uchun. */
function ringArea(ring) {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  }
  return Math.abs(a / 2);
}

/** Koordinatani 5 xonagacha yaxlitlaydi (~1 m) — fayl hajmi 2x kichrayadi. */
const round5 = (p) => [Math.round(p[0] * 1e5) / 1e5, Math.round(p[1] * 1e5) / 1e5];

function simplifyRing(ring) {
  if (ringArea(ring) < MIN_RING_AREA) return null;
  let out = rdp(ring, TOLERANCE).map(round5);
  // Poligon halqasi YOPIQ bo'lishi SHART va kamida 4 nuqta kerak
  if (out.length < 4) return null;
  const [f, l] = [out[0], out[out.length - 1]];
  if (f[0] !== l[0] || f[1] !== l[1]) out.push(f);
  return out;
}

function simplifyPolygon(poly) {
  const rings = poly.map(simplifyRing).filter(Boolean);
  // Tashqi halqa yo'qolsa butun poligon tashlanadi
  return rings.length ? rings : null;
}

function simplifyGeometry(geom) {
  if (geom.type === "Polygon") {
    const p = simplifyPolygon(geom.coordinates);
    return p ? { type: "Polygon", coordinates: p } : null;
  }
  if (geom.type === "MultiPolygon") {
    const polys = geom.coordinates.map(simplifyPolygon).filter(Boolean);
    return polys.length ? { type: "MultiPolygon", coordinates: polys } : null;
  }
  return null;
}

const src = process.argv[2];
if (!src) {
  console.error("Ishlatish: node tools/simplify-regions.mjs <manba.geojson>");
  process.exit(1);
}
const OUT = "public/geojson/viloyat_simplified.geojson";

const raw = JSON.parse(readFileSync(src, "utf8"));
const countPoints = (fc) => {
  let n = 0;
  const walk = (c) => (typeof c[0] === "number" ? n++ : c.forEach(walk));
  for (const f of fc.features) walk(f.geometry.coordinates);
  return n;
};

const before = countPoints(raw);
const features = [];
for (const f of raw.features) {
  const geometry = simplifyGeometry(f.geometry);
  if (!geometry) continue;
  const name = f.properties?.region_name;
  if (!name) {
    console.warn("  ⚠ region_name yo'q, o'tkazib yuborildi:", JSON.stringify(f.properties).slice(0, 80));
    continue;
  }
  // FAQAT `region_name` saqlanadi — xarita boshqa maydonni ishlatmaydi
  features.push({ type: "Feature", properties: { region_name: name }, geometry });
}

const out = { type: "FeatureCollection", features };
writeFileSync(OUT, JSON.stringify(out));

const after = countPoints(out);
const kb = (n) => `${Math.round(n / 1024)} KB`;
console.log(`  Manba:   ${src}`);
console.log(`  Nuqta:   ${before.toLocaleString()} → ${after.toLocaleString()}`);
console.log(`  Hajm:    ${kb(readFileSync(src).length)} → ${kb(readFileSync(OUT).length)}`);
console.log(`  Viloyat: ${features.length} ta`);
console.log(`  Natija:  ${OUT}`);
