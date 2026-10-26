
# -*- coding: utf-8 -*-
# =====================================================================
#  179-MAKTAB (Chilonzor) — 3D model generatori (Blender bpy)
#  Kontur va koordinatalar: public/geojson/campus/mk-179.json
#  (metrlarda, origin = "center" [lat,lng]; json'da X — sharq, Y — JANUB!).
#  Blender'da Y — SHIMOL, shuning uchun json'dagi y o'qilgach ishorasi
#  almashtiriladi (`build()` dagi `flip`). glTF eksportida Blender o'qlari
#  avtomatik Y-yuqori ga o'giriladi.
#  Fasad uslubi — foydalanuvchi yuborgan fotolardan: kulrang devor,
#  sariq diagonal uchburchak grafikasi, derazalar tepasida sariq panellar,
#  oq-kulrang kirish soyaboni, "179-MAKTAB" darvozasi va qorovulxona.
# =====================================================================
import bpy, bmesh, math, json, os, random
from mathutils import Vector, Matrix

PROJECT = r"D:\loyihalar\compus V3"
JSON_PATH = os.path.join(PROJECT, "public", "geojson", "campus", "mk-179.json")
FLOOR_H = 3.3
M = {}
COLL = {"c": None}

# ---------------------------- Materiallar ----------------------------
def mat(name, rgb, rough=0.6, metal=0.0, trans=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name); m.use_nodes = True
    b = [n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"][0]
    b.inputs["Base Color"].default_value = (*rgb, 1); b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if trans: b.inputs["Transmission Weight"].default_value = trans
    m.diffuse_color = (*rgb, 1); return m

def materials():
    # Ranglar Google Earth suratiga moslangan (2026-10-23) — linear qiymatlar,
    # qavsda sRGB: devor #cac9c4, maktab tomi #a9abab, bir qavatli tom #8b8e90,
    # yordamchi/qorovulxona tomi #b9b9b7. `public/models/mk-179.glb` ham shu
    # ranglarda (JSON chunk bevosita yangilangan), qayta eksportda mos tushadi.
    M["wall"]    = mat("Devor_kulrang", (0.60, 0.59, 0.56), 0.85)
    M["dark"]    = mat("Toq_kulrang", (0.17, 0.18, 0.20), 0.6)
    M["yellow"]  = mat("Sariq_grafika", (0.93, 0.76, 0.16), 0.6)
    M["white"]   = mat("Oq", (0.92, 0.92, 0.91), 0.5)
    M["frame"]   = mat("PVX_rom", (0.95, 0.95, 0.95), 0.35)
    M["glass"]   = mat("Oyna", (0.25, 0.32, 0.38), 0.04, 0.7)
    M["roof"]    = mat("Tom_plita", (0.40, 0.41, 0.41), 0.8)
    M["roof_dk"] = mat("Tom_kulrang_toq", (0.26, 0.27, 0.28), 0.8)   # bir qavatli bino tomi
    M["roof_lt"] = mat("Tom_kulrang_och", (0.48, 0.48, 0.47), 0.8)   # yordamchi binolar, qorovulxona
    M["plinth"]  = mat("Tsokol", (0.30, 0.30, 0.31), 0.7)
    M["brown"]   = mat("Yogoch_jigar", (0.36, 0.20, 0.11), 0.55)
    M["gold"]    = mat("Oltin_harf", (0.85, 0.66, 0.30), 0.25, 1.0)
    M["metal"]   = mat("Metall_darvoza", (0.30, 0.31, 0.32), 0.4, 0.8)
    M["steel"]   = mat("Zanglamas", (0.8, 0.8, 0.82), 0.2, 1.0)
    M["redbase"] = mat("Qizil_tsokol", (0.42, 0.16, 0.12), 0.7)
    M["pave"]    = mat("Bruschatka", (0.72, 0.70, 0.66), 0.8)
    M["asphalt"] = mat("Asfalt", (0.18, 0.18, 0.19), 0.85)
    M["grass"]   = mat("Maysa", (0.20, 0.36, 0.11), 0.9)
    M["leaf"]    = mat("Barg", (0.14, 0.32, 0.09), 0.8)
    M["bark"]    = mat("Tana", (0.28, 0.22, 0.16), 0.9)
    M["context"] = mat("Qoshni_binolar", (0.78, 0.78, 0.77), 0.9)

# ---------------------------- Yordamchilar ----------------------------
def _link(o, parent=None):
    COLL["c"].objects.link(o)
    if parent is not None: o.parent = parent

def signed_area(p):
    return 0.5 * sum(p[i][0]*p[(i+1) % len(p)][1] - p[(i+1) % len(p)][0]*p[i][1] for i in range(len(p)))

def ccw(p):
    p = [tuple(q) for q in p]
    if len(p) > 1 and p[0] == p[-1]: p = p[:-1]
    return p if signed_area(p) > 0 else p[::-1]

def offset_poly(p, d):
    """Ortogonalga yaqin konturni d metrga tashqariga surish (bisektor bo'yicha)."""
    n = len(p); out = []
    for i in range(n):
        a, b, c = Vector(p[i-1]), Vector(p[i]), Vector(p[(i+1) % n])
        e1 = (b - a).normalized(); e2 = (c - b).normalized()
        n1 = Vector((e1.y, -e1.x)); n2 = Vector((e2.y, -e2.x))
        k = 1.0 + n1.dot(n2)
        out.append(tuple(b + (n1 + n2) * (d / k)) if k > 1e-3 else tuple(b + n1 * d))
    return out

def prism(name, p, z0, z1, m, parent=None):
    """Kontur bo'yicha vertikal prizma (devor tanasi, poydevor, tom)."""
    p = ccw(p); bm = bmesh.new()
    bot = [bm.verts.new((x, y, z0)) for x, y in p]; top = [bm.verts.new((x, y, z1)) for x, y in p]
    bm.faces.new(bot[::-1]); bm.faces.new(top)
    for i in range(len(p)):
        j = (i + 1) % len(p); bm.faces.new((bot[i], bot[j], top[j], top[i]))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); me.materials.append(m); _link(o, parent); return o

class MB:
    """Ko'p qutilarni bitta mesh'ga yig'uvchi (deraza, panjara — tez va yengil)."""
    def __init__(s): s.bm = bmesh.new()
    def box(s, c, ang, sx, sy, sz, rx=0.0):
        mtx = Matrix.Translation(c) @ Matrix.Rotation(ang, 4, "Z") @ Matrix.Rotation(rx, 4, "Y") @ Matrix.Diagonal((sx, sy, sz, 1))
        bmesh.ops.create_cube(s.bm, size=1.0, matrix=mtx)
    def aabb(s, x0, y0, z0, x1, y1, z1):
        x0, x1 = sorted((x0, x1)); y0, y1 = sorted((y0, y1)); z0, z1 = sorted((z0, z1))
        s.box(Vector(((x0+x1)/2, (y0+y1)/2, (z0+z1)/2)), 0.0, x1-x0, y1-y0, z1-z0)
    def poly(s, pts3):
        v = [s.bm.verts.new(q) for q in pts3]; s.bm.faces.new(v)
    def done(s, name, m, parent=None):
        if not s.bm.verts: s.bm.free(); return None
        me = bpy.data.meshes.new(name); s.bm.to_mesh(me); s.bm.free()
        o = bpy.data.objects.new(name, me); me.materials.append(m); _link(o, parent); return o

def B(name, x0, y0, z0, x1, y1, z1, m, parent=None):
    mb = MB(); mb.aabb(x0, y0, z0, x1, y1, z1); return mb.done(name, m, parent)

def C(name, cx, cy, z0, r, h, m, parent=None, seg=24, r2=None):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=h,
                          matrix=Matrix.Translation((cx, cy, z0 + h/2)))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for f in me.polygons: f.use_smooth = True
    o = bpy.data.objects.new(name, me); me.materials.append(m); _link(o, parent); return o

def S(name, cx, cy, cz, r, m, parent=None, sz=1.0):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=r,
                              matrix=Matrix.Translation((cx, cy, cz)) @ Matrix.Diagonal((1, 1, sz, 1)))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for f in me.polygons: f.use_smooth = True
    o = bpy.data.objects.new(name, me); me.materials.append(m); _link(o, parent); return o

def text_mesh(name, body, size, loc, rot, m, extrude=0.03, align="CENTER"):
    """Matn — glTF eksporti uchun darhol MESH ga aylantiriladi."""
    cu = bpy.data.curves.new(name, "FONT"); cu.body = body; cu.size = size
    cu.align_x = align; cu.align_y = "CENTER"; cu.extrude = extrude
    t = bpy.data.objects.new(name, cu); COLL["c"].objects.link(t)
    t.location = loc; t.rotation_euler = rot
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(t.evaluated_get(dg))
    o = bpy.data.objects.new(name, me); o.matrix_world = t.matrix_world.copy()
    me.materials.clear(); me.materials.append(m); COLL["c"].objects.link(o)
    bpy.data.objects.remove(t, do_unlink=True); bpy.data.curves.remove(cu)
    o.name = name
    return o

def lattice(mb, a0, a1, z0, z1, place, step=0.32, ang=math.radians(55)):
    """Darvozadagi qiya naqsh: to'rtburchak ichiga kesilgan ikki yo'nalishli chiviqlar."""
    for sgn in (1, -1):
        d = (math.cos(ang) * sgn, math.sin(ang))
        span = (a1 - a0) + (z1 - z0) * 2
        k = -span
        while k < span:
            # chiziq: (a0 + k, z0) + t*d  — to'rtburchakka qirqish (Liang–Barsky)
            px, pz = a0 + k, z0; t0, t1 = -1e9, 1e9; ok = True
            for pv, dv, lo, hi in ((px, d[0], a0, a1), (pz, d[1], z0, z1)):
                if abs(dv) < 1e-9:
                    if pv < lo or pv > hi: ok = False
                else:
                    ta, tb = (lo - pv) / dv, (hi - pv) / dv
                    t0, t1 = max(t0, min(ta, tb)), min(t1, max(ta, tb))
            if ok and t1 - t0 > 0.05:
                ca, cz = px + d[0]*(t0+t1)/2, pz + d[1]*(t0+t1)/2
                place(mb, ca, cz, t1 - t0, math.atan2(d[1], d[0]))
            k += step

# ---------------------------- 179-maktab binosi ----------------------------
def edges(p):
    for i in range(len(p)):
        a, b = Vector(p[i]), Vector(p[(i+1) % len(p)])
        L = (b - a).length
        if L < 0.5: continue
        u = (b - a) / L; n = Vector((u.y, -u.x))          # CCW kontur → tashqi normal
        yield i, a, b, u, n, L

def school(p_raw, h, parent):
    p = ccw(p_raw)
    floors = int(round(h / FLOOR_H))
    prism("Maktab_devor", p, 0.0, h, M["wall"], parent)
    prism("Maktab_tsokol", offset_poly(p, 0.06), 0.0, 0.7, M["plinth"], parent)
    prism("Maktab_parapet", offset_poly(p, 0.05), h, h + 0.6, M["wall"], parent)
    prism("Maktab_parapet_qopqoq", offset_poly(p, 0.12), h + 0.6, h + 0.75, M["dark"], parent)
    prism("Maktab_tom", offset_poly(p, -0.3), h + 0.05, h + 0.35, M["roof"], parent)
    fr, gl, ye, dk = MB(), MB(), MB(), MB()
    # Kirish — SHARQIY ichki hovliga qaragan fasad: o'rta korpusning sharq
    # yuzi (x≈-5.45, y -30.75..-14.75). 2026-10-21: avval janubiy qanotning
    # shimoliy yuzida (x 12..28) edi, keyin g'arb yuziga, so'ng foydalanuvchi
    # so'rovi bilan shu (teskari) tomonga ko'chirildi.
    ENT_FX, ent_y = -5.45, (-30.75, -14.75)
    for i, a, b, u, n, L in edges(p):
        ang = math.atan2(u.y, u.x)
        # qavatlararo to'q kulrang lenta (1-qavat tepasida)
        c = (a + b) / 2 + n * 0.03
        dk.box(Vector((c.x, c.y, FLOOR_H + 0.05)), ang, L, 0.06, 0.18)
        step, margin = 3.2, 1.8
        cnt = int((L - 2*margin) // step) + 1
        if L < 4.0 or cnt < 1: continue
        st = (L - (cnt - 1) * step) / 2
        for k in range(cnt):
            t = st + k * step; q = a + u * t
            for f in range(floors):
                if f == 0 and abs(n.x - 1) < 0.1 and abs(q.x - ENT_FX) < 1.0 and ent_y[0] - 1 < q.y < ent_y[1] + 1: continue
                z0 = f * FLOOR_H + 0.95; hh, w = 1.75, 1.5
                def at(dt, dn, dz, sx, sy, sz, mb):
                    cc = q + u * dt + n * dn; mb.box(Vector((cc.x, cc.y, z0 + dz)), ang, sx, sy, sz)
                at(0, 0.005, hh/2, w, 0.03, hh, gl)
                for dz, sz in ((0.035, 0.07), (hh - 0.035, 0.07)): at(0, 0.035, dz, w, 0.07, sz, fr)
                for dt in (-w/2 + 0.035, w/2 - 0.035, -w/6, w/6): at(dt, 0.035, hh/2, 0.07, 0.07, hh, fr)
                at(0, 0.08, -0.03, w + 0.1, 0.16, 0.05, fr)                  # tokcha
                at(0, 0.02, hh + 0.42, w, 0.04, 0.5, ye)                      # derazalar tepasidagi sariq panel
    fr.done("Maktab_romlar", M["frame"], parent); gl.done("Maktab_oynalar", M["glass"], parent)
    ye.done("Maktab_sariq_panellar", M["yellow"], parent); dk.done("Maktab_lentalar", M["dark"], parent)

def facade_graphics(p_raw, h, parent):
    """Kirish tepasidagi katta sariq/to'q uchburchaklar va "179" raqami (fotodagidek)."""
    p = ccw(p_raw)
    # janubiy qanotning hovliga (shimolga) qaragan uzun qirrasi (y≈-35)
    best = max((e for e in edges(p) if abs(e[4].y - 1) < 0.1 and e[1].y < -30), key=lambda e: e[5])
    i, a, b, u, n, L = best
    def P(x, z, off):
        # x — dunyo X, qirra ustidagi nuqta
        t = (x - a.x) / u.x; q = a + u * t + n * off
        return (q.x, q.y, z)
    ye, dk = MB(), MB()
    z_lo, z_hi = 2 * FLOOR_H + 0.25, h - 0.15
    tris = [("y", 8, 20, 14, "up"), ("d", 14, 26, 20, "down"), ("y", 20, 32, 26, "up"), ("d", 26, 36, 31, "down")]
    for kind, x0, x1, xm, dirn in tris:
        mb = ye if kind == "y" else dk
        if dirn == "up": pts = [P(x0, z_lo, 0.025), P(x1, z_lo, 0.025), P(xm, z_hi, 0.025)]
        else:            pts = [P(x0, z_hi, 0.03), P(xm, z_lo, 0.03), P(x1, z_hi, 0.03)]
        if n.y < 0: pts = pts[::-1]
        mb.poly(pts)
    ye.done("Grafika_sariq", M["yellow"], parent); dk.done("Grafika_toq", M["dark"], parent)
    q = a + u * ((39.0 - a.x) / u.x) + n * 0.05
    text_mesh("Devor_179", "179", 3.2, (q.x, q.y, 2 * FLOOR_H + 1.7), (math.radians(90), 0, math.radians(180)), M["dark"], 0.04)

def entrance(p_raw, parent):
    """Sharqiy ichki hovlidagi asosiy kirish: soyabon, ustunlar, vitraj, sariq eshik, zina, pandus."""
    p = ccw(p_raw)
    # o'rta korpusning sharqqa qaragan qirrasi (normal +X, x≈-5.45, y -34.8..-10.7)
    e = max((e for e in edges(p) if abs(e[4].x - 1) < 0.1 and -10 < e[1].x < 0), key=lambda e: e[5])
    xf = (e[1].x + e[2].x) / 2
    yc = (e[1].y + e[2].y) / 2                                              # fasad markazi (≈ -22.75)
    # Quyidagi o'lchamlar LOKAL freymda yozilgan (fasad -Y ga qaragan, markaz x=20).
    # +90° burilgan Empty lokal -Y ni dunyoda +X (sharqiy hovli) ga, lokal X ni
    # +Y ga o'giradi: lokal x=20 → dunyo y=yc.
    E = bpy.data.objects.new("Kirish_asos", None); E.location = (xf, yc - 20.0, 0); E.rotation_euler = (0, 0, math.pi / 2)
    _link(E, parent); parent = E
    y0 = 0.0
    xa, xb = 12.0, 28.0
    B("Kirish_maydoncha", xa - 1, y0 - 4.2, 0, xb + 1, y0, 0.45, M["pave"], parent)
    for k, dy in enumerate((0.35, 0.7, 1.05)):
        B("Zina", xa + 1, y0 - 4.2 - dy, 0, xb - 6, y0 - 4.2, 0.45 - 0.15 * (k + 1) + 0.15, M["pave"], parent)
    ramp = B("Pandus", 0, 0, 0, 6.0, 1.6, 0.15, M["pave"], parent)
    ramp.location = (xb - 3.0, y0 - 5.0, 0.18); ramp.rotation_euler = (0, math.radians(4.3), 0)
    mb = MB()
    for yy in (y0 - 4.3, y0 - 5.8):
        for xx in (xb - 5.8, xb - 3.0, xb - 0.2):
            mb.aabb(xx - 0.025, yy - 0.025, 0.1, xx + 0.025, yy + 0.025, 1.1 + (xb - xx) * 0.0)
        mb.aabb(xb - 5.9, yy - 0.025, 1.05, xb - 0.1, yy + 0.025, 1.1)
    mb.done("Perilalar", M["steel"], parent)
    # vitraj va eshik
    gl, fr = MB(), MB()
    gl.aabb(xa + 0.3, y0 - 0.02, 0.45, xb - 0.3, y0 - 0.005, 3.0)
    x = xa + 0.3
    while x <= xb - 0.29:
        fr.aabb(x - 0.04, y0 - 0.08, 0.45, x + 0.04, y0, 3.0); x += 1.2
    for zz in (0.45, 2.3, 3.0): fr.aabb(xa + 0.3, y0 - 0.08, zz - 0.04, xb - 0.3, y0, zz + 0.04)
    gl.done("Kirish_vitraj", M["glass"], parent); fr.done("Kirish_romlar", M["dark"], parent)
    yl = MB()
    for (x0, x1, z0, z1) in ((19.1, 19.2, 0.45, 2.75), (20.8, 20.9, 0.45, 2.75), (19.1, 20.9, 2.65, 2.75)):
        yl.aabb(x0, y0 - 0.12, z0, x1, y0, z1)
    yl.done("Eshik_sariq_rom", M["yellow"], parent)
    # soyabon, ustunlar
    B("Soyabon", xa - 0.5, y0 - 3.6, 3.25, xb + 0.5, y0, 3.45, M["white"], parent)
    B("Soyabon_fassiya", xa - 0.5, y0 - 3.7, 2.95, xb + 0.5, y0 - 3.45, 3.75, M["white"], parent)
    B("Toq_lenta", xa - 2.0, y0 - 0.12, 3.75, xb + 2.0, y0, 4.5, M["dark"], parent)
    col = MB(); ring = MB()
    for xx in (xa + 0.2, 16.4, 23.6, xb - 0.2):
        col.aabb(xx - 0.25, y0 - 3.45, 0.45, xx + 0.25, y0 - 2.95, 3.25)
        ring.aabb(xx - 0.27, y0 - 3.47, 2.3, xx + 0.27, y0 - 2.93, 2.42)
    col.done("Ustunlar", M["white"], parent); ring.done("Ustun_halqalar", M["dark"], parent)
    B("Banner", 14.0, y0 - 3.72, 3.8, 18.0, y0 - 3.68, 4.4, M["white"], parent)
    # ⚠️ Oq kiosk olib tashlandi: yangi joyda u shimoliy korpus devoriga
    # kirib qolardi (g'arbiy hovli eni ~24 m).

def gate(parent):
    """Darvoza: "179-MAKTAB" peshtoqi, oq ustunlar jigarrang chiziqlar bilan, qiya naqshli darvoza.
    Ko'cha — janubda (-Y). Fotodagidek: tashqaridan qaraganda qorovulxona O'NGDA (sharqda),
    darvoza chapda (g'arbda)."""
    y1, y0 = -49.0, -49.9                       # y0 — ko'cha tomondagi yuz
    # qorovulxona (json: "Kirish posti" x 62.27..70.27, y 43.91..48.91 → Y -48.91..-43.91)
    B("Qorovulxona", 62.27, -48.91, 0, 70.27, -43.91, 3.2, M["white"], parent)
    B("Qorovulxona_tsokol", 62.2, -48.97, 0, 70.35, -43.85, 0.4, M["plinth"], parent)
    B("Qorovulxona_tom", 62.0, -49.1, 3.2, 70.5, -43.7, 3.45, M["roof_lt"], parent)
    B("Qorovulxona_oyna", 63.2, -48.95, 1.0, 69.2, -48.92, 2.7, M["glass"], parent)
    B("Qorovulxona_oyna_rom", 63.1, -48.99, 0.93, 69.3, -48.9, 1.0, M["frame"], parent)
    wh, br = MB(), MB()
    for (x0, x1, stripes) in ((61.4, 62.3, True), (59.3, 59.9, False), (53.9, 54.8, True)):
        wh.aabb(x0, y0, 0, x1, y1, 3.1)
        if stripes:
            for dx in (0.12, 0.34, 0.56, 0.78):
                xx = x0 + dx * (x1 - x0) / 0.9
                br.aabb(xx - 0.05, y0 - 0.04, 0.25, xx + 0.05, y0, 3.1)
                br.aabb(xx - 0.05, y1, 0.25, xx + 0.05, y1 + 0.04, 3.1)
        br.aabb(x0 - 0.02, y0 - 0.02, 0, x1 + 0.02, y1 + 0.02, 0.3)
    wh.aabb(53.9, y0, 3.1, 62.3, y1, 4.2); br.aabb(53.8, y0 - 0.1, 4.2, 62.4, y1 + 0.1, 4.35)
    br.aabb(53.9, y0 + 0.1, 3.0, 62.3, y1 - 0.1, 3.1)
    wh.done("Darvoza_oq", M["white"], parent); br.done("Darvoza_jigarrang", M["brown"], parent)
    text_mesh("Darvoza_yozuv", "179-MAKTAB", 0.72, (58.1, y0 - 0.03, 3.62), (math.radians(90), 0, 0), M["gold"], 0.05)
    mt = MB()
    def bar(mb, ca, cz, length, a):
        mb.box(Vector((ca, -49.45, cz)), 0.0, length, 0.03, 0.03, rx=-a)
    for (a0, a1) in ((54.85, 57.05), (57.1, 59.25), (59.95, 61.35)):
        for (b0, b1, z0, z1) in ((a0, a1, 0.05, 0.12), (a0, a1, 2.5, 2.57), (a0, a0 + 0.07, 0.05, 2.57), (a1 - 0.07, a1, 0.05, 2.57)):
            mt.aabb(b0, -49.5, z0, b1, -49.4, z1)
        lattice(mt, a0 + 0.07, a1 - 0.07, 0.12, 2.5, bar)
    mt.done("Darvoza_metall", M["metal"], parent)

def fence(pts, parent, gap=None):
    """Qora metall panjara, qizil-jigarrang poydevor ustida."""
    base, bars = MB(), MB()
    for i in range(len(pts) - 1):
        a, b = Vector(pts[i]), Vector(pts[i+1]); L = (b - a).length
        if L < 0.1: continue
        u = (b - a) / L; ang = math.atan2(u.y, u.x); c = (a + b) / 2
        base.box(Vector((c.x, c.y, 0.25)), ang, L + 0.3, 0.35, 0.5)
        for z in (0.62, 1.9): bars.box(Vector((c.x, c.y, z)), ang, L, 0.05, 0.05)
        n = int(L / 0.16)
        for k in range(n + 1):
            q = a + u * (k * L / max(n, 1)); bars.box(Vector((q.x, q.y, 1.25)), ang, 0.02, 0.02, 1.5)
        for k in range(int(L / 3.0) + 1):
            q = a + u * (k * L / max(int(L / 3.0), 1)); bars.box(Vector((q.x, q.y, 1.0)), ang, 0.08, 0.08, 1.1)
    base.done("Panjara_poydevor", M["redbase"], parent); bars.done("Panjara", M["metal"], parent)

def tree(parent, x, y, kind, s=1.0):
    C("Tana", x, y, 0, 0.14 * s, 3.2 * s, M["bark"], parent, 8)
    if kind == "terak":            # terak — baland, ingichka
        S("Barg", x, y, 7.5 * s, 1.6 * s, M["leaf"], parent, sz=3.2)
    else:
        for dx, dy, dz, r in ((0, 0, 4.2, 2.0), (0.9, 0.4, 5.0, 1.5), (-0.8, -0.3, 5.2, 1.5)):
            S("Barg", x + dx * s, y + dy * s, dz * s, r * s, M["leaf"], parent)

def build(context=True):
    sc0 = bpy.context.scene
    for cn in ("MK179_kampus", "MK179_atrof"):
        c = bpy.data.collections.get(cn)
        if c:
            for o in list(c.all_objects): bpy.data.objects.remove(o, do_unlink=True)
            bpy.data.collections.remove(c)
    for cam_name in ("Kamera_Darvoza", "Kamera_Kirish", "Kamera_Havo", "Quyosh"):
        o = bpy.data.objects.get(cam_name)
        if o: bpy.data.objects.remove(o, do_unlink=True)
    try: bpy.data.orphans_purge(do_recursive=True)     # eski mesh'lar — nomlarda .001 qolmasin
    except Exception: pass
    materials()
    sc = bpy.context.scene
    for nm in ("Cube", "Light", "Camera"):
        o = bpy.data.objects.get(nm)
        if o: bpy.data.objects.remove(o, do_unlink=True)
    for cn in ("MK179_kampus", "MK179_atrof"):
        c = bpy.data.collections.get(cn)
        if c:
            for o in list(c.all_objects): bpy.data.objects.remove(o, do_unlink=True)
            bpy.data.collections.remove(c)
    data = json.load(open(JSON_PATH, encoding="utf-8"))
    # json'da Y janubga o'sadi (campusAreas.ts: lat0 - y/111320) → Blender'da shimol = +Y
    flip = lambda pts: [[q[0], -q[1]] for q in pts]
    data["campus"] = flip(data["campus"])
    for b in data["buildings"]: b["p"] = flip(b["p"])
    for r in data.get("roads", []): r["p"] = flip(r["p"])
    kampus = bpy.data.collections.new("MK179_kampus"); sc.collection.children.link(kampus)
    atrof = bpy.data.collections.new("MK179_atrof"); sc.collection.children.link(atrof)
    COLL["c"] = kampus
    root = bpy.data.objects.new("MK179_asos", None); _link(root)
    campus = ccw(data["campus"])

    # --- hovli qoplamasi va maysalar ---
    prism("Hovli_bruschatka", campus, -0.05, 0.03, M["pave"], root)
    for (x0, y0, x1, y1) in ((45, 30, 78, 35), (-50, -40, -38, 32), (45, -30, 78, -5), (-2, 12, 25, 30)):
        B("Maysa", x0, y0, 0.03, x1, y1, 0.07, M["grass"], root)

    blds = data["buildings"]
    for b in blds:
        if b.get("c") != 1: continue
        if b.get("n") == "179-maktab":
            school(b["p"], b["h"], root); facade_graphics(b["p"], b["h"], root); entrance(b["p"], root)
        elif b.get("n") == "Kirish posti":
            gate(root)
        elif b.get("ml"):
            prism("Yordamchi_bino", b["p"], 0, b["h"], M["white"], root)
            prism("Yordamchi_bino_tom", offset_poly(ccw(b["p"]), 0.15), b["h"], b["h"] + 0.15, M["roof_lt"], root)
        else:  # 1 qavatli bino (sport zali / oshxona) — maktab uslubida
            p = ccw(b["p"])
            prism("Bir_qavatli_bino", p, 0, b["h"] + 1.2, M["wall"], root)
            prism("Bir_qavatli_tsokol", offset_poly(p, 0.05), 0, 0.6, M["plinth"], root)
            prism("Bir_qavatli_sariq_lenta", offset_poly(p, 0.03), b["h"] - 0.2, b["h"] + 0.4, M["yellow"], root)
            prism("Bir_qavatli_tom", offset_poly(p, 0.2), b["h"] + 1.2, b["h"] + 1.4, M["roof_dk"], root)

    # --- panjara (darvoza va qorovulxona oralig'i ochiq) ---
    fence([(70.3, -49.45), (80.2, -49.45), (80.8, 37.0), (-52.9, 33.9), (-55.3, -47.4), (53.9, -49.45)], root)

    # --- daraxtlar: panjara bo'ylab teraklar, hovlida bargli daraxtlar ---
    rnd = random.Random(179)
    for x in range(-48, 50, 7): tree(root, x + rnd.uniform(-1, 1), -51.8, "terak", rnd.uniform(0.9, 1.1))
    for y in range(-44, 32, 7): tree(root, 77.5, y + rnd.uniform(-1, 1), "terak", rnd.uniform(0.9, 1.1))
    for (x, y) in ((50, -12), (60, -22), (70, -8), (55, 5), (68, 20), (5, -20), (30, -25), (-45, -20), (-45, 20), (10, 25)):
        tree(root, x, y, "bargli", rnd.uniform(0.9, 1.2))

    # --- atrof-muhit: ko'chalar va qo'shni binolar (json'dan, 220 m radiusda) ---
    COLL["c"] = atrof
    B("Yer", -260, -260, -0.25, 260, 260, -0.06, M["grass"], None)
    rd = MB()
    for r in data.get("roads", []):
        pts = r["p"]; w = r.get("w", 4)
        for i in range(len(pts) - 1):
            a, b = Vector(pts[i]), Vector(pts[i+1])
            if max(a.length, b.length) > 320: continue
            L = (b - a).length
            if L < 0.1: continue
            c = (a + b) / 2; rd.box(Vector((c.x, c.y, -0.04)), math.atan2(b.y - a.y, b.x - a.x), L + w * 0.5, w, 0.04)
    rd.done("Kochalar", M["asphalt"])
    for b in blds:
        if b.get("c") == 1: continue
        cx = sum(q[0] for q in b["p"]) / len(b["p"]); cy = sum(q[1] for q in b["p"]) / len(b["p"])
        if math.hypot(cx, cy) > 230: continue
        prism("Qoshni_bino", b["p"], 0, b["h"], M["context"], None)

    # --- kameralar, yorug'lik, render ---
    COLL["c"] = kampus
    def cam(name, loc, tgt, lens):
        cd = bpy.data.cameras.new(name); cd.lens = lens; cd.clip_end = 2000
        o = bpy.data.objects.new(name, cd); sc.collection.objects.link(o); o.location = loc
        d = Vector(tgt) - Vector(loc); hz = math.hypot(d.x, d.y)
        o.rotation_euler = (math.radians(90) + math.atan2(d.z, hz), 0, math.atan2(d.y, d.x) - math.radians(90))
        return o
    c1 = cam("Kamera_Darvoza", (57.6, -60.0, 1.7), (58.1, -49.4, 2.4), 24)
    cam("Kamera_Kirish", (13.0, -25.0, 1.7), (-5.45, -22.75, 4.2), 20)
    cam("Kamera_Havo", (-95.0, 120.0, 95.0), (12.0, -8.0, 0.0), 30)
    sc.camera = c1
    sc.render.engine = "CYCLES"; sc.cycles.samples = 128
    try: sc.cycles.use_denoising = True
    except Exception: pass
    sc.render.resolution_x, sc.render.resolution_y = 1600, 1000
    try:
        pr = bpy.context.preferences.addons["cycles"].preferences
        for dev in ("OPTIX", "CUDA", "HIP", "METAL", "ONEAPI"):
            try:
                pr.compute_device_type = dev; pr.get_devices()
                if any(d.type == dev for d in pr.devices):
                    for d in pr.devices: d.use = True
                    sc.cycles.device = "GPU"; break
            except Exception: continue
    except Exception: pass
    w = sc.world or bpy.data.worlds.new("World"); sc.world = w; w.use_nodes = True
    nt = w.node_tree; nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputWorld"); sky = nt.nodes.new("ShaderNodeTexSky")
    for st in ("NISHITA", "MULTIPLE_SCATTERING", "SINGLE_SCATTERING"):
        try: sky.sky_type = st; break
        except Exception: pass
    for attr, val in (("sun_disc", False), ("sun_elevation", math.radians(50))):
        try: setattr(sky, attr, val)
        except Exception: pass
    bg = nt.nodes.new("ShaderNodeBackground"); bg.inputs["Strength"].default_value = 0.12
    nt.links.new(sky.outputs["Color"], bg.inputs["Color"]); nt.links.new(bg.outputs["Background"], out.inputs["Surface"])
    ld = bpy.data.lights.new("Quyosh", "SUN"); ld.energy = 3.2; ld.angle = math.radians(3); ld.color = (1.0, 0.96, 0.9)
    sun = bpy.data.objects.new("Quyosh", ld); sc.collection.objects.link(sun)
    sun.rotation_euler = (math.radians(45), 0, math.radians(-30))
    sc.view_settings.exposure = -1.0
    try: sc.view_settings.look = "AgX - Medium High Contrast"
    except Exception: pass
    return {"kampus": len(kampus.all_objects), "atrof": len(atrof.all_objects)}

def render(path, cam, samples=128, pct=100):
    """Kamera bo'yicha quyosh yo'nalishi: darvoza (shimolga qaragan) va kirish (janubga) ikkalasi ham yoritilsin."""
    sc = bpy.context.scene; sc.camera = bpy.data.objects[cam]
    sun = bpy.data.objects.get("Quyosh")
    if sun: sun.rotation_euler = (math.radians(45), 0, math.radians(-30 if cam == "Kamera_Darvoza" else -120))
    sc.cycles.samples = samples; sc.render.resolution_percentage = pct; sc.render.filepath = path
    bpy.ops.render.render(write_still=True); return path

def export_glb(path):
    """Faqat kampus binolari, darvoza va panjara — atrof-muhitsiz.
    Daraxt, maysa va hovli bruschatkasi EKSPORT QILINMAYDI: veb-xaritada hovli
    (`app-campus-3d`) va daraxtlar (`app-campus-trees`) o'zi chiziladi —
    model ustidan yopib qo'ysa daraxt ikonkalari ko'rinmay qolardi.
    Origin = json 'center' (Blender 0,0)."""
    bpy.ops.object.select_all(action="DESELECT")
    skip = ("Tana", "Barg", "Maysa", "Hovli_bruschatka")
    for o in bpy.data.collections["MK179_kampus"].all_objects:
        if o.type == "MESH" and not o.name.startswith(skip): o.select_set(True)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_apply=True)
    return path
