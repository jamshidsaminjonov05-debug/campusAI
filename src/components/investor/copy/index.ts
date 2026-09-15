"use client";

import { createContext, useContext } from "react";
import { EN } from "./en";
import { UZ } from "./uz";
import type { InvestorCopy } from "./types";
import type { DeckLang } from "@/components/deck/types";

export type { InvestorCopy } from "./types";

export const INVESTOR_COPY: Record<DeckLang, InvestorCopy> = { uz: UZ, en: EN };

/**
 * Investor taqdimotining matni. Mahsulot taqdimotidan ALOHIDA kontekst:
 * ikkalasi bir vaqtda ochilishi mumkin (bitta brauzerda ikki ilova), va
 * ularning matni bir-biriga aralashmasligi kerak.
 */
export const InvestorCopyContext = createContext<InvestorCopy>(UZ);

export const useCopy = (): InvestorCopy => useContext(InvestorCopyContext);
