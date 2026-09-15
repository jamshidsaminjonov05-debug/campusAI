"use client";

import Deck from "@/components/deck/Deck";
import type { DeckDefinition } from "@/components/deck/types";
import { INVESTOR_COPY, InvestorCopyContext, type InvestorCopy } from "./copy";
import { CurrencyProvider, CurrencySwitch } from "./currency";
import { NARRATION_AUDIO } from "./narrationAudio";
import I0Intro from "./slides/I0Intro";
import I1Purpose from "./slides/I1Purpose";
import I2Problem from "./slides/I2Problem";
import I3Threats from "./slides/I3Threats";
import I4Quality from "./slides/I4Quality";
import I5ParentsPain from "./slides/I5ParentsPain";
import I6HowItWorks from "./slides/I6HowItWorks";
import I7Detectors from "./slides/I7Detectors";
import I8Lesson from "./slides/I8Lesson";
import I9ParentsApp from "./slides/I9ParentsApp";
import I10Live from "./slides/I10Live";
import I11Results from "./slides/I11Results";
import I12Market from "./slides/I12Market";
import I13Rivals from "./slides/I13Rivals";
import I14Profit from "./slides/I14Profit";
import I15Finale from "./slides/I15Finale";

/**
 * CAMPUS AI — INVESTOR TAQDIMOTI (`/investor`).
 *
 * BESH BO'LIM, 16 SLAYD, ~5 DAQIQA:
 *
 *   1. MAQSAD  (0–1)    kirish · loyihaning maqsadi va qonun
 *   2. MUAMMO  (2–5)    manzara · xavfsizlik · dars sifati · ota-onalar
 *   3. YECHIM  (6–9)    qanday ishlaydi · detektorlar · dars tahlili · ilova
 *   4. NATIJA  (10–11)  179-maktab · nima o'zgardi
 *   5. BOZOR   (12–15)  hajm · raqobat · daromad va foyda · yakun
 *
 * ⚠️ TAQDIMOTDA PUL SO'RALMAYDI — investitsiya summasi, baholash va
 * ulush haqida slayd yo'q. Biznes ko'rsatiladi, xulosani investor
 * o'zi chiqaradi.
 *
 * Sahna, vaqt o'qi, ovoz va boshqaruv — umumiy dvijokda
 * (`@/components/deck`). Bu fayl faqat ta'rif beradi.
 *
 * ⚠️ Slayd tartibi `copy/<til>.ts` dagi `narration` massivining SHU
 * tartibiga bog'langan (`shell.slideTitles` ham shu tartibda).
 */
const INVESTOR_DECK: DeckDefinition<InvestorCopy> = {
  id: "investor",
  slides: [
    I0Intro,
    I1Purpose,
    I2Problem,
    I3Threats,
    I4Quality,
    I5ParentsPain,
    I6HowItWorks,
    I7Detectors,
    I8Lesson,
    I9ParentsApp,
    I10Live,
    I11Results,
    I12Market,
    I13Rivals,
    I14Profit,
    I15Finale,
  ],
  copies: INVESTOR_COPY,
  audio: NARRATION_AUDIO,
  context: InvestorCopyContext,
  Wrapper: CurrencyProvider,
  Controls: CurrencySwitch,
};

export default function InvestorPage() {
  return <Deck deck={INVESTOR_DECK} />;
}
