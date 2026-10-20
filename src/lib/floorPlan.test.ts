import { describe, expect, it } from "vitest";
import { buildFloorPlan, inside, orient, polyArea, type Pt } from "./floorPlan";

/** Tipik maktab qanoti: 60 x 17 m to'rtburchak (yo'lak + ikki yon xona sig'adi). */
const RECT: Pt[] = [
  [0, 0],
  [60, 0],
  [60, 17],
  [0, 17],
];

/** L shakli — kontur ichiga tushmaydigan xona qo'yilmasligini tekshirish uchun. */
const L_SHAPE: Pt[] = [
  [0, 0],
  [60, 0],
  [60, 17],
  [30, 17],
  [30, 34],
  [0, 34],
];

const PROGRAM = ["class", "class", "wc", "stairs", "lab", "office"] as const;

describe("buildFloorPlan", () => {
  it("yo'lak va ikki yon xonalarni quradi", () => {
    const p = buildFloorPlan(RECT, 60, 17, 2, [...PROGRAM]);
    expect(p.corridors.length).toBeGreaterThan(0);
    const rooms = p.rooms.filter((r) => r.kind !== "corridor");
    expect(rooms.length).toBeGreaterThan(4);
    // Yo'lakning ikki tomonida ham xona bo'lsin
    const c = p.corridors[0];
    expect(rooms.some((r) => r.y < c.y)).toBe(true);
    expect(rooms.some((r) => r.y > c.y)).toBe(true);
  });

  it("xonalar KONTUR ICHIDA qoladi (L shaklida ham)", () => {
    const p = buildFloorPlan(L_SHAPE, 60, 34, 1, [...PROGRAM]);
    for (const r of p.rooms) {
      if (r.kind === "corridor") continue;
      const corners: Pt[] = [
        [r.x + 0.1, r.y + 0.1],
        [r.x + r.w - 0.1, r.y + 0.1],
        [r.x + r.w - 0.1, r.y + r.h - 0.1],
        [r.x + 0.1, r.y + r.h - 0.1],
      ];
      for (const c of corners) expect(inside(c, L_SHAPE)).toBe(true);
    }
  });

  it("dastur tartibini xona turlariga qo'llaydi", () => {
    const p = buildFloorPlan(RECT, 60, 17, 3, [...PROGRAM]);
    const kinds = p.rooms.filter((r) => r.kind !== "corridor").map((r) => r.kind);
    expect(kinds[0]).toBe("class");
    // Ro'yxat tugasa oxirgi turi takrorlanadi, ya'ni notanish tur chiqmaydi
    for (const k of kinds) expect(PROGRAM).toContain(k);
  });

  it("faqat sinf/lab/kabinet raqamlanadi, sanuzel va zina — yo'q", () => {
    const p = buildFloorPlan(RECT, 60, 17, 4, [...PROGRAM]);
    for (const r of p.rooms) {
      if (r.kind === "wc" || r.kind === "stairs" || r.kind === "corridor" || r.kind === "hall") {
        expect(r.no).toBe("");
      } else {
        expect(r.no.startsWith("4")).toBe(true);
      }
    }
  });

  it("ro'yxat tugagach bir martalik xonalar TAKRORLANMAYDI", () => {
    // 60 x 34 m — dastur ro'yxatidan ancha ko'p xona sig'adi
    const p = buildFloorPlan(
      [
        [0, 0],
        [60, 0],
        [60, 34],
        [0, 34],
      ],
      60,
      34,
      2,
      [...PROGRAM]
    );
    const kinds = p.rooms.filter((r) => r.kind !== "corridor").map((r) => r.kind);
    expect(kinds.length).toBeGreaterThan(PROGRAM.length);
    expect(kinds.filter((k) => k === "wc").length).toBe(1);
    expect(kinds.filter((k) => k === "stairs").length).toBe(1);
    // Oxirgi tur (office) butun qavatni egallab ketmasin
    expect(kinds.filter((k) => k === "office").length).toBeLessThan(kinds.length / 2);
  });

  it("hajmlar to'g'ri: tag kamida 3 nuqta, balandlik musbat", () => {
    const p = buildFloorPlan(RECT, 60, 17, 2, [...PROGRAM]);
    expect(p.solids.length).toBeGreaterThan(40);
    for (const s of p.solids) {
      expect(s.base.length).toBeGreaterThanOrEqual(3);
      expect(s.z1).toBeGreaterThan(s.z0);
    }
    // Tashqi devorlarda kesim normali bo'lishi SHART (dollhouse kesimi)
    expect(p.solids.some((s) => s.tone === "wallOut" && s.cut)).toBe(true);
    // Eshik qanoti va deraza ham chiqsin
    expect(p.solids.some((s) => s.tone === "door")).toBe(true);
    expect(p.solids.some((s) => s.tone === "glass")).toBe(true);
  });

  it("evakuatsiya belgilari yo'lak uchlarida chiqadi", () => {
    const p = buildFloorPlan(RECT, 60, 17, 2, [...PROGRAM]);
    expect(p.markers.filter((m) => m.kind === "exit").length).toBeGreaterThanOrEqual(2);
    expect(p.markers.some((m) => m.kind === "extinguisher")).toBe(true);
  });
});

describe("orient / polyArea", () => {
  it("konturni asosiy o'qi bo'yicha to'g'rilaydi va yuzani saqlaydi", () => {
    const tilted: Pt[] = RECT.map(([x, y]) => {
      const a = Math.PI / 6;
      return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)] as Pt;
    });
    const o = orient(tilted);
    expect(o.w).toBeCloseTo(60, 1);
    expect(o.h).toBeCloseTo(17, 1);
    expect(polyArea(o.poly)).toBeCloseTo(polyArea(tilted), 1);
  });
});
