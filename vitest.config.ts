import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Vitest — birinchi test infratuzilmasi (2026-09-06 da qo'shildi).
 *
 * ⚠️ **`jsdom`** kerak: `lib/modalHistory.ts` va `lib/pageRoute.ts`
 * `window.history`/`window.location` bilan ishlaydi. Sof mantiq
 * (`lib/statistics.ts`, `lib/aiSummary.ts`) uchun bu ortiqcha, lekin
 * ikkita muhitni alohida boshqarish (Node + jsdom) hozircha ortiqcha
 * murakkablik — loyiha kattalashsa ajratiladi.
 *
 * `@/` alias — `tsconfig.json` dagi bilan AYNI (`src/`), aks holda
 * testlar import qila olmasdi.
 */
export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
