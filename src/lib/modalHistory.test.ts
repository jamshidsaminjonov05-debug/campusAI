import { beforeEach, describe, expect, it, vi } from "vitest";
import { MODAL_DEPTH_KEY, closeModalLayer, openModalLayer, resetModalLayers } from "./modalHistory";

/**
 * ⚠️ **HALI ISHGA TUSHIRILMAGAN** — `vitest.config.ts` izohiga qarang.
 *
 * ⚠️ **Faqat SINXRON qismi sinaladi** — `openModalLayer`/`closeModalLayer`
 * ning o'zi va ular `history`ga nima yozishi. Haqiqiy "◀ orqaga"
 * bosilganda ishga tushadigan `popstate` tinglovchisi (`onPopState`)
 * BU YERDA SINALMAYDI: brauzerlarda (va jsdom'da) `history.go()`dan
 * keyingi `popstate` ASINXRON keladi, aniq vaqti kafolatlanmagan — avtomatik
 * testda beqaror (flaky) bo'lardi. Bu qatlamlar-orasidagi xatti-harakat
 * (ustma-ust ochilgan oynalar bittalab yopilishi, X bilan yopilganda
 * "o'lik" yozuv qolmasligi) ishlab chiqish paytida qo'lda yozilgan Node
 * skriptlari bilan simulyatsiya qilinib tekshirilgan edi (2026-09-05/06,
 * suhbat tarixida) — bu yerda faqat REGRESSIYA uchun sinxron qism qoladi.
 */

beforeEach(() => {
  resetModalLayers();
  window.history.replaceState({ [MODAL_DEPTH_KEY]: 0 }, "", "/panel#kameralar");
});

describe("openModalLayer", () => {
  it("tarixga BITTA yozuv qo'shadi, manzilni O'ZGARTIRMAYDI", () => {
    const before = window.history.length;
    const hashBefore = window.location.hash;
    openModalLayer(() => {});
    expect(window.history.length).toBe(before + 1);
    expect(window.location.hash).toBe(hashBefore);
  });

  it("chuqurlikni history.state ga yozadi (ketma-ket ochilsa oshib boradi)", () => {
    openModalLayer(() => {});
    expect((window.history.state as Record<string, number>)[MODAL_DEPTH_KEY]).toBe(1);
    openModalLayer(() => {});
    expect((window.history.state as Record<string, number>)[MODAL_DEPTH_KEY]).toBe(2);
  });

  it("mavjud history.state maydonlarini SAQLAYDI (faqat chuqurlikni qo'shadi)", () => {
    window.history.replaceState({ [MODAL_DEPTH_KEY]: 0, boshqaMaydon: "qiymat" }, "", "/panel#kameralar");
    openModalLayer(() => {});
    expect((window.history.state as Record<string, unknown>).boshqaMaydon).toBe("qiymat");
  });
});

describe("closeModalLayer", () => {
  it("chuqurlik hali mos bo'lsa history.go(-1) chaqiradi", () => {
    const goSpy = vi.spyOn(window.history, "go");
    const id = openModalLayer(() => {});
    closeModalLayer(id);
    expect(goSpy).toHaveBeenCalledWith(-1);
    goSpy.mockRestore();
  });

  it("id noto'g'ri (topilmagan) bo'lsa hech narsa qilmaydi", () => {
    const goSpy = vi.spyOn(window.history, "go");
    closeModalLayer(999);
    expect(goSpy).not.toHaveBeenCalled();
    goSpy.mockRestore();
  });

  it("id=0 (SSR fallback) bilan chaqirilsa xavfsiz — hech narsa qilmaydi", () => {
    expect(() => closeModalLayer(0)).not.toThrow();
  });
});

describe("resetModalLayers", () => {
  it("tarixga TEGMAYDI, faqat ichki ro'yxatni bo'shatadi", () => {
    openModalLayer(() => {});
    const lenBefore = window.history.length;
    resetModalLayers();
    expect(window.history.length).toBe(lenBefore);
    // Endi qatlam yo'q — closeModalLayer eski id bilan chaqirilsa go() chaqirmaydi
    const goSpy = vi.spyOn(window.history, "go");
    closeModalLayer(1);
    expect(goSpy).not.toHaveBeenCalled();
    goSpy.mockRestore();
  });
});
