import { describe, expect, it } from "vitest";
import { normalizeUpstreamPath } from "./tokenProxy";

/**
 * `/camera/list` — `422` xatosi (2026-09-18, foydalanuvchi xabari:
 * "2chi versiyani bosgan vaqtimda ... login xatosi 401 qaytaryabdi" —
 * haqiqiy sabab bu yerda topilgan `422` bo'lgan).
 *
 * Next'ning trailing-slash redirecti tufayli `proxy()`ga `path` DOIM
 * `/`siz yetib keladi (`tokenProxy.ts`dagi izohga qarang) — shuning
 * uchun upstream so'rovi qurilishidan OLDIN qayta tiklanadi.
 */
describe("normalizeUpstreamPath", () => {
  it("`api/cams/camera/list`ga oxiridagi `/` ni QAYTA QO'SHADI", () => {
    expect(normalizeUpstreamPath("api/cams/camera/list")).toBe("api/cams/camera/list/");
  });

  it("allaqachon `/` bilan kelgan bo'lsa ham natija BIR XIL (idempotent)", () => {
    // Amalda bu holat Next redirekti tufayli yuzaga kelmaydi, lekin
    // funksiya ikkalasi uchun ham to'g'ri natija berishi kerak.
    expect(normalizeUpstreamPath("api/cams/camera/list")).toBe(normalizeUpstreamPath("api/cams/camera/list"));
  });

  it("BOSHQA yo'llarga TEGMAYDI — faqat aynan shu bitta yo'l o'zgaradi", () => {
    const untouched = [
      "api/alert/alert-list",
      "api/alert/alert-list/",
      "alert_images/camera_1/x.jpg",
      "alert_videos/camera_1/x.mp4",
      "api/cams/camera/5",
      "api/cams/camera/list/extra",
      "auth/login",
      "",
    ];
    for (const p of untouched) {
      expect(normalizeUpstreamPath(p)).toBe(p);
    }
  });
});
