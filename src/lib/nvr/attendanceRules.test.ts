import { describe, expect, it } from "vitest";
import { classGrade, excludedFromAttendance, isPrimaryOffDay, isSaturday, subtractSummary } from "./attendanceRules";
import type { NvrAttendanceRow } from "./nvrApi";

const row = (role: NvrAttendanceRow["role"], note: string | null): NvrAttendanceRow =>
  ({ person_id: 1, full_name: "x", role, role_label: "", note, time: "", event_id: null, image_url: null, picture_url: null, video_url: null, library_photo_url: null, status: "absent", status_label: "" }) as NvrAttendanceRow;

describe("1–4-sinflar shanba qoidasi", () => {
  it("sinf raqami `note`dan", () => {
    expect(classGrade("1-A")).toBe(1);
    expect(classGrade("10-V")).toBe(10);
    expect(classGrade("Uqituvchilar")).toBeNull();
    expect(classGrade(null)).toBeNull();
  });
  it("shanba — mahalliy sana bo'yicha", () => {
    expect(isSaturday("2026-10-24")).toBe(true);
    expect(isSaturday("2026-10-23")).toBe(false);
  });
  it("faqat 1–4-sinf va faqat shanba", () => {
    expect(isPrimaryOffDay("2026-10-24", "3-B")).toBe(true);
    expect(isPrimaryOffDay("2026-10-24", "5-A")).toBe(false);
    expect(isPrimaryOffDay("2026-10-23", "3-B")).toBe(false);
    expect(isPrimaryOffDay("2026-10-24", "10-A")).toBe(false); // 10 ≠ 1
  });
  it("o'qituvchi qatori hech qachon chiqarilmaydi", () => {
    expect(excludedFromAttendance(row("teacher", "1-A"), "2026-10-24")).toBe(false);
    expect(excludedFromAttendance(row("student", "1-A"), "2026-10-24")).toBe(true);
  });
  it("ayirma manfiyga tushmaydi", () => {
    const a = { early: 1, late: 1, absent: 5, waiting: 0, total: 7, present: 2 };
    const b = { early: 0, late: 0, absent: 6, waiting: 0, total: 6, present: 0 };
    expect(subtractSummary(a, b)).toEqual({ early: 1, late: 1, absent: 0, waiting: 0, total: 1, present: 2 });
  });
});
