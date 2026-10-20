"use client";

import { useLiveSync } from "@/hooks/useLiveSync";

/** Ko'rinmaydi — faqat jonli oqim (SSE) ↔ so'rovlar sinxronizatsiyasini ulaydi. */
export function LiveSync() {
  useLiveSync();
  return null;
}
