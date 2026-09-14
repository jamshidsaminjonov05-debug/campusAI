import { describe, expect, it } from "vitest";
import { sortRows, sumInstitutions, sumRegions } from "./statistics";
import type { InstitutionRow, RegionRow } from "@/lib/institutionRows";

/**
 * ⚠️ **BU FAYL HALI ISHGA TUSHIRILMAGAN** (2026-09-06 da yozilgan).
 * Dev server ishlab turgani uchun `npm install` ni CLAUDE.md qoidasiga
 * ko'ra bajarilmadi (silent webpack cache buzilishi xavfi) — `vitest`
 * `node_modules`da hali yo'q. Dev'ni to'xtatib `npm install && npm test`
 * bilan tekshiring.
 */

function region(overrides: Partial<RegionRow> = {}): RegionRow {
  return {
    institutes: 1,
    students: 100,
    teachers: 10,
    activeCameras: 5,
    cameras: 5,
    alerts: 0,
    attendance: 90,
    ...overrides,
  } as RegionRow;
}

function institution(overrides: Partial<InstitutionRow> = {}): InstitutionRow {
  return {
    id: "edu-1",
    students: 100,
    teachers: 10,
    cameras: 5,
    activeCameras: 5,
    alerts: 0,
    attendance: 90,
    ...overrides,
  } as InstitutionRow;
}

describe("sumRegions", () => {
  it("oddiy o'rtacha EMAS — talabalar soniga VAZNLANGAN o'rtacha qaytaradi", () => {
    // Kichik hudud (10 talaba, 100% davomat) katta hududni (1000 talaba, 50%) tenglashtirmasligi kerak
    const small = region({ students: 10, attendance: 100 });
    const big = region({ students: 1000, attendance: 50 });
    const t = sumRegions([small, big]);

    // Oddiy o'rtacha (100+50)/2=75 EMAS — vaznlangani 50 ga juda yaqin bo'lishi kerak
    expect(t.attendance).toBeLessThan(60);
    expect(t.students).toBe(1010);
    expect(t.institutes).toBe(2);
  });

  it("bo'sh ro'yxatda `null` qaytaradi — nol EMAS (manba yo'qligi bilinsin)", () => {
    /* ⚠️ Ilgari bu yerda `0` kutilardi. Mock olib tashlangach qoida
       o'zgardi: `0` HAQIQIY nol, manba yo'qligi esa `null`. */
    const t = sumRegions([]);
    expect(t.students).toBeNull();
    expect(t.attendance).toBeNull();
  });

  it("jami sonlar to'g'ri qo'shiladi", () => {
    const t = sumRegions([region({ alerts: 3 }), region({ alerts: 7 })]);
    expect(t.alerts).toBe(10);
    expect(t.activeCameras).toBe(10);
  });
});

describe("sumInstitutions", () => {
  it("talabalar soniga vaznlangan davomat — sumRegions bilan AYNI mantiq", () => {
    const small = institution({ students: 10, attendance: 100 });
    const big = institution({ students: 1000, attendance: 50 });
    const t = sumInstitutions([small, big]);
    expect(t.attendance).toBeLessThan(60);
  });

  it("count — ro'yxat uzunligi", () => {
    const t = sumInstitutions([institution(), institution(), institution()]);
    expect(t.count).toBe(3);
  });
});

describe("sortRows", () => {
  const rows = [{ name: "Yusupova", value: 30 }, { name: "Aliyev", value: 10 }, { name: "Botirov", value: 20 }];

  it("sonni asc/desc bo'yicha to'g'ri saralaydi", () => {
    const asc = sortRows(rows, "value", "asc", "uz");
    expect(asc.map((r) => r.value)).toEqual([10, 20, 30]);
    const desc = sortRows(rows, "value", "desc", "uz");
    expect(desc.map((r) => r.value)).toEqual([30, 20, 10]);
  });

  it("matnni localeCompare bilan saralaydi (o'zbekcha harflar)", () => {
    const asc = sortRows(rows, "name", "asc", "uz");
    expect(asc.map((r) => r.name)).toEqual(["Aliyev", "Botirov", "Yusupova"]);
  });

  it("asl massivni O'ZGARTIRMAYDI (yangi nusxa qaytaradi)", () => {
    const original = [...rows];
    sortRows(rows, "value", "asc", "uz");
    expect(rows).toEqual(original);
  });
});
