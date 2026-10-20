"use client";

import Deck from "@/components/deck/Deck";
import type { DeckDefinition } from "@/components/deck/types";
import { INVESTOR_COPY, InvestorCopyContext, type InvestorCopy } from "./copy";
import { NARRATION_AUDIO } from "./narrationAudio";
import I0Intro from "./slides/I0Intro";
import I1Purpose from "./slides/I1Purpose";
import I2Problem from "./slides/I2Problem";
import I3Threats from "./slides/I3Threats";
import I4Quality from "./slides/I4Quality";
import I5ParentsPain from "./slides/I5ParentsPain";
import I6HowItWorks from "./slides/I6HowItWorks";
import I7Detectors from "./slides/I7Detectors";
import IKnife from "./slides/IKnife";
import IAbandoned from "./slides/IAbandoned";
import IAttendance from "./slides/IAttendance";
import I8Lesson from "./slides/I8Lesson";
import I9ParentsApp from "./slides/I9ParentsApp";
import I10Live from "./slides/I10Live";
import I11Results from "./slides/I11Results";
import IOffer from "./slides/IOffer";
import I15Finale from "./slides/I15Finale";

/**
 * CAMPUS AI — INVESTOR TAQDIMOTI (`/investor`).
 *
 * BESH BO'LIM, 17 SLAYD, ~5 DAQIQA:
 *
 *   1. MAQSAD  (0–1)    kirish · loyihaning maqsadi va qonun
 *   2. MUAMMO  (2–5)    manzara · xavfsizlik · dars sifati · ota-onalar
 *   3. YECHIM  (6–12)   qanday ishlaydi · detektorlar · pichoq/qurol · qoldirilgan
 *                       buyum · davomat · dars tahlili · ilova
 *   4. NATIJA  (13–14)  179-maktab · nima o'zgardi
 *   5. YAKUN    (15)     yakun
 *
 * ⚠️ TAQDIMOTDA PUL YO'Q — na so'ralgan summa, na bozor hajmi, na daromad
 * va foyda hisobi. Valyuta tanlagich ham olib tashlangan.
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
    IKnife,
    IAbandoned,
    IAttendance,
    I8Lesson,
    I9ParentsApp,
    I10Live,
    I11Results,
    IOffer,
    I15Finale,
  ],
  copies: INVESTOR_COPY,
  audio: NARRATION_AUDIO,
  context: InvestorCopyContext,
};

export default function InvestorPage() {
  return <Deck deck={INVESTOR_DECK} />;
}
