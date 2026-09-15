"use client";

import { createContext, useContext } from "react";
import { EN } from "./en";
import { UZ } from "./uz";
import type { ShowCopy } from "./types";
import type { DeckLang } from "@/components/deck/types";

export type { ShowCopy, ShowLang, CueCopy } from "./types";

export const SHOW_COPY: Record<DeckLang, ShowCopy> = { uz: UZ, en: EN };

/**
 * Mahsulot taqdimotining matni. Ilovaning umumiy `I18nProvider` idan
 * ATAYLAB ajratilgan: taqdimot uch tilli emas (rus tili yo'q) va uning
 * matni sayt matnidan mustaqil o'zgaradi — shou ssenariysi tarjima emas,
 * qayta yozilgan.
 */
export const ShowCopyContext = createContext<ShowCopy>(UZ);

export const useCopy = (): ShowCopy => useContext(ShowCopyContext);
