#!/usr/bin/env python3
"""
`public/geojson/viloyat_simplified.geojson` → taqdimot uchun tayyor SVG yo'llar.

Nega oldindan: taqdimot slaydida 120 KB geojson'ni yuklab, parse qilib,
proyeksiyalash ortiqcha — xarita shakli hech qachon o'zgarmaydi. Shuning
uchun bir marta hisoblab, TS moduliga yozib qo'yamiz.

Ishlatish:  python3 tools/build-uz-map.py
Natija:     src/components/presentation/uzMap.ts
"""
import json
import math
import os

SRC = os.path.join(os.path.dirname(__file__), "..", "public", "geojson", "viloyat_simplified.geojson")
OUT = os.path.join(os.path.dirname(__file__), "..", "src", "components", "presentation", "uzMap.ts")

W = 1000.0          # viewBox kengligi
PAD = 8.0           # chet bo'shlig'i
EPS = 0.7           # soddalashtirish chegarasi (SVG birligida)


def rings(geom):
    """MultiPolygon/Polygon → tashqi halqalar ro'yxati"""
    t = geom["type"]
    if t == "Polygon":
        return [geom["coordinates"][0]]
    if t == "MultiPolygon":
        return [poly[0] for poly in geom["coordinates"]]
    return []


def main():
    data = json.load(open(SRC, encoding="utf-8"))
    feats = data["features"]

    # ── chegaralar ──
    lons, lats = [], []
    for f in feats:
        for r in rings(f["geometry"]):
            for x, y in r:
                lons.append(x)
                lats.append(y)
    lon0, lon1 = min(lons), max(lons)
    lat0, lat1 = min(lats), max(lats)
    # equirectangular: uzunlik kengligi kenglikka qarab siqiladi
    k = math.cos(math.radians((lat0 + lat1) / 2))
    sw = (lon1 - lon0) * k
    sh = lat1 - lat0
    scale = (W - 2 * PAD) / sw
    H = round(sh * scale + 2 * PAD, 1)

    def project(x, y):
        return (
            (x - lon0) * k * scale + PAD,
            (lat1 - y) * scale + PAD,
        )

    def simplify(pts):
        """Qo'shni nuqtalar juda yaqin bo'lsa tashlab yuboramiz"""
        out = [pts[0]]
        for p in pts[1:]:
            if abs(p[0] - out[-1][0]) + abs(p[1] - out[-1][1]) >= EPS:
                out.append(p)
        return out

    regions = []
    for f in feats:
        name = f["properties"]["region_name"]
        parts = []
        best_area, cx, cy = 0.0, 0.0, 0.0
        for r in rings(f["geometry"]):
            pts = simplify([project(x, y) for x, y in r])
            if len(pts) < 4:
                continue
            d = "M" + "L".join(f"{x:.1f} {y:.1f}" for x, y in pts) + "Z"
            parts.append(d)
            # eng katta halqa markazi — yorliq shu yerga qo'yiladi
            a = abs(sum(pts[i][0] * pts[i - 1][1] - pts[i - 1][0] * pts[i][1] for i in range(len(pts)))) / 2
            if a > best_area:
                best_area = a
                cx = sum(p[0] for p in pts) / len(pts)
                cy = sum(p[1] for p in pts) / len(pts)
        regions.append({"name": name, "d": "".join(parts), "cx": round(cx, 1), "cy": round(cy, 1)})

    # Toshkent shahri viloyat ichida — yorlig'i ustma-ust tushmasin
    body = ",\n".join(
        "  { name: %s, cx: %s, cy: %s, d: %s }"
        % (json.dumps(r["name"], ensure_ascii=False), r["cx"], r["cy"], json.dumps(r["d"]))
        for r in regions
    )

    ts = f"""/**
 * O'zbekiston viloyatlari — SVG yo'llari.
 *
 * AVTOMATIK YARATILGAN: `python3 tools/build-uz-map.py`
 * Manba: `public/geojson/viloyat_simplified.geojson` (14 ta hudud).
 * Qo'lda tahrirlamang — skriptni qayta ishga tushiring.
 */

export type Region = {{ name: string; cx: number; cy: number; d: string }};

export const MAP_W = {W:.0f};
export const MAP_H = {H};

export const REGIONS: Region[] = [
{body},
];
"""
    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write(ts)
    print(f"{OUT} — {len(regions)} hudud, viewBox 0 0 {W:.0f} {H}, {os.path.getsize(OUT)} bayt")


if __name__ == "__main__":
    main()
