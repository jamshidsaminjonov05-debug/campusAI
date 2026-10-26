import { describe, expect, it } from "vitest";
import { suggestRoute } from "./routeSuggest";

describe("suggestRoute", () => {
  it("panel nomidagi xatolar", () => {
    expect(suggestRoute("/panelcha")).toBe("/panel");
    expect(suggestRoute("/panell")).toBe("/panel");
    expect(suggestRoute("/pane")).toBe("/panel");
    expect(suggestRoute("/pnael")).toBe("/panel");
    expect(suggestRoute("/PANEL/")).toBe("/panel");
  });

  it("panel bo'limlari", () => {
    expect(suggestRoute("/panel/kamerlar")).toBe("/panel#kameralar");
    expect(suggestRoute("/kameralar")).toBe("/panel#kameralar");
    expect(suggestRoute("/statistka")).toBe("/panel#statistika");
    expect(suggestRoute("/panel/nimadir-boshqa")).toBe("/panel");
  });

  it("sayt sahifalari", () => {
    expect(suggestRoute("/narxlr")).toBe("/narxlar");
    expect(suggestRoute("/mahsulott")).toBe("/mahsulot");
  });

  it("hech narsaga o'xshamasa — null", () => {
    expect(suggestRoute("/xyzqwe")).toBeNull();
    expect(suggestRoute("/")).toBeNull();
  });
});
