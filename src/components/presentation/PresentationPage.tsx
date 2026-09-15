"use client";

import Deck from "@/components/deck/Deck";
import type { DeckDefinition } from "@/components/deck/types";
import { SHOW_COPY, ShowCopyContext, type ShowCopy } from "./copy";
import { NARRATION_AUDIO } from "./narrationAudio";
import S0Intro from "./slides/S0Intro";
import S1Problem from "./slides/S1Problem";
import S2Pipeline from "./slides/S2Pipeline";
import S3Detectors from "./slides/S3Detectors";
import S4Response from "./slides/S4Response";
import S5Threats from "./slides/S5Threats";
import S6Attendance from "./slides/S6Attendance";
import S7Wellbeing from "./slides/S7Wellbeing";
import S8Teachers from "./slides/S8Teachers";
import S9Parents from "./slides/S9Parents";
import S10Control from "./slides/S10Control";
import S11Coverage from "./slides/S11Coverage";
import S12Security from "./slides/S12Security";
import S13Advantages from "./slides/S13Advantages";
import S14Pricing from "./slides/S14Pricing";
import S15Finale from "./slides/S15Finale";

/**
 * CAMPUS AI — MAHSULOT TAQDIMOTI (`/taqdimot`).
 *
 * Bu fayl faqat TA'RIF: slaydlar tartibi, matn va ovoz manbai. Sahna,
 * vaqt o'qi, ovoz va boshqaruv `@/components/deck` dagi umumiy dvijokda —
 * u investor taqdimoti (`/investor`) bilan bo'lishiladi.
 *
 * ⚠️ Slayd tartibi `copy/<til>.ts` dagi `narration` massivining SHU
 * tartibiga bog'langan — bittasini o'zgartirsangiz, ikkinchisini ham
 * o'zgartiring (`shell.slideTitles` ham shu tartibda).
 */
const PRODUCT_DECK: DeckDefinition<ShowCopy> = {
  id: "product",
  slides: [
    S0Intro,
    S1Problem,
    S2Pipeline,
    S3Detectors,
    S4Response,
    S5Threats,
    S6Attendance,
    S7Wellbeing,
    S8Teachers,
    S9Parents,
    S10Control,
    S11Coverage,
    S12Security,
    S13Advantages,
    S14Pricing,
    S15Finale,
  ],
  copies: SHOW_COPY,
  audio: NARRATION_AUDIO,
  context: ShowCopyContext,
};

export default function PresentationPage() {
  return <Deck deck={PRODUCT_DECK} />;
}
