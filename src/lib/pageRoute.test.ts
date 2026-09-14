import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_PAGE, PAGE_SLUGS, initialPage, pageFromUrl, savePage, savedPage, writePageToUrl } from "./pageRoute";

/**
 * ⚠️ **HALI ISHGA TUSHIRILMAGAN** — `vitest.config.ts` izohiga qarang.
 */

beforeEach(() => {
  window.history.replaceState(null, "", "/panel");
  window.localStorage.clear();
});

describe("PAGE_SLUGS", () => {
  it("har bir slug FAQAT bitta bo'limga tegishli (takror yo'q)", () => {
    const slugs = Object.values(PAGE_SLUGS);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe("pageFromUrl", () => {
  it("hash bo'sh bo'lsa null qaytaradi", () => {
    expect(pageFromUrl()).toBeNull();
  });

  it("noma'lum slug uchun null qaytaradi", () => {
    window.history.replaceState(null, "", "/panel#notogri-slug");
    expect(pageFromUrl()).toBeNull();
  });

  it("to'g'ri slug uchun bo'lim nomini qaytaradi", () => {
    window.history.replaceState(null, "", "/panel#kameralar");
    expect(pageFromUrl()).toBe("Kameralar");
  });
});

describe("initialPage — tartib: URL > localStorage > default", () => {
  it("hech narsa bo'lmasa DEFAULT_PAGE", () => {
    expect(initialPage()).toBe(DEFAULT_PAGE);
  });

  it("faqat localStorage bo'lsa — o'shani oladi", () => {
    savePage("Statistika");
    expect(initialPage()).toBe("Statistika");
  });

  it("URL BOR bo'lsa — localStorage'dan USTUN turadi", () => {
    savePage("Statistika");
    window.history.replaceState(null, "", "/panel#kameralar");
    expect(initialPage()).toBe("Kameralar");
  });
});

describe("writePageToUrl", () => {
  it("noma'lum bo'lim uchun URL'ga TEGMAYDI", () => {
    writePageToUrl("Notogri Bolim");
    expect(window.location.hash).toBe("");
  });

  it("replace:true bilan tarixga YANGI yozuv QO'SHMAYDI", () => {
    const before = window.history.length;
    writePageToUrl("Kameralar", true);
    expect(window.history.length).toBe(before);
    expect(window.location.hash).toBe("#kameralar");
  });

  it("replace:false (standart) bilan tarixga yangi yozuv qo'shadi", () => {
    const before = window.history.length;
    writePageToUrl("Statistika");
    expect(window.history.length).toBe(before + 1);
  });
});

describe("savedPage", () => {
  it("localStorage'dagi NOTO'G'RI qiymatni rad etadi", () => {
    window.localStorage.setItem("campus-page", "Xato Qiymat");
    expect(savedPage()).toBeNull();
  });
});
