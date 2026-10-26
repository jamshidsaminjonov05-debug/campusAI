import type { DeckCopyBase } from "@/components/deck/types";

/**
 * INVESTOR TAQDIMOTI MATNINING TIPI.
 *
 * Taqdimot BESH BO'LIMGA bo'lingan:
 *   1. MAQSAD  — loyiha nima uchun va nega aynan hozir (qonun bilan birga)
 *   2. MUAMMO  — ta'limdagi haqiqiy og'riq; investorni qiziqtiradigan joy
 *   3. YECHIM  — AI qanday hal qiladi va qanday natija beradi
 *   4. NATIJA  — 179-maktabda HOZIR ishlab turgan tizim
 *   5. YAKUN
 *
 * ⚠️ BU TAQDIMOTDA PUL SO'RALMAYDI. Investitsiya summasi, baholash va
 * ulush haqida bo'lim YO'Q — biznes ko'rsatiladi, xulosani investor o'zi
 * chiqaradi.
 *
 * ⚠️ MATNDA RAQAM YOZILMAYDI — barcha sonlar `model.ts` dan hisoblanadi.
 * Istisno: tarixiy faktlar (qaror sanasi) va real hodisa qaydlari
 * (kamera nomi, aniqlangan vaqt) — ular o'lchangan ma'lumot.
 *
 * ⚠️ OVOZ 5 DAQIQAGA MO'LJALLANGAN. Har slaydda 3 ta qisqa bo'lak,
 * jami ~18 sekund. Yangi jumla qo'shsangiz boshqasini qisqartiring.
 */

export type TitleText = { title: string; text: string };

/**
 * Bitta xavf turi uchun to'liq slayd: real kadr + "qanday ishlaydi" +
 * natija. Pichoq va qoldirilgan buyum slaydlari shu shaklda
 * (`slides/ThreatCase.tsx`).
 */
export type ThreatCaseCopy = {
  kicker: string;
  title: string;
  /** Sarlavha ostidagi bir qatorli izoh */
  sub: string;
  /** Kadr ustidagi belgi ("Jonli") */
  live: string;
  /** Kadr ustidagi kamera va vaqt */
  cam: string;
  when: string;
  /** Kadr ostidagi trevoga sarlavhasi va izohi */
  alertTitle: string;
  alertText: string;
  /** O'ng ustundagi bloklar: qanday ishlaydi · natija · ustuvorlik/joy */
  sections: TitleText[];
  /** Egasini qidirish (qoldirilgan buyum slaydi) */
  search?: {
    title: string;
    queryLabel: string;
    scanning: string;
    found: string;
    /** Arxiv kadri modali: yorliq va "shaxs topildi" belgisi */
    archiveLabel: string;
    ownerFound: string;
    steps: { place: string; text: string }[];
    result: string;
  };
  /** Ikkinchi kadr (masalan pichoqdan keyin qurol) — ixtiyoriy */
  extra?: { cam: string; when: string; alertTitle: string; alertText: string };
  /** Eng pastdagi tamg'a */
  footer: string;
};

export type InvestorCopy = DeckCopyBase & {
  /** "model bo'yicha hisob" — taxminiy raqam yonidagi belgi */
  assumed: string;
  /** "o'lchangan" — real ma'lumot yonidagi belgi */
  measured: string;
  currencyHint: string;
  /** Kurs izohi, `{rate}` o'rniga kurs qo'yiladi */
  fxNote: string;

  /* ───────────────────── 1-BO'LIM · MAQSAD ───────────────────── */

  intro: {
    titleA: string;
    titleB: string;
    sub: string;
    /** To'rtta raqam ostidagi izohlar — raqamlar modeldan */
    stats: string[];
  };

  /** Loyihaning maqsadi: qonun bilan birga yaratilgani */
  purpose: {
    kicker: string;
    title: string;
    /** Bizning maqsadimiz — uch jumla */
    goals: string[];
    decreeLabel: string;
    decreeDate: string;
    decreeTitle: string;
    /** Qaror majburiy qilgan narsalar */
    requires: string[];
    signalTitle: string;
    signalOne: string;
    signalTwo: string;
    signalNote: string;
    timelineTitle: string;
    timeline: { year: string; text: string }[];
    punch: string;
    source: string;
  };

  /* ───────────────────── 2-BO'LIM · MUAMMO ───────────────────── */

  /** Ta'limdagi umumiy manzara — uch segment */
  problem: {
    kicker: string;
    title: string;
    /** Segment nomlari — `model.ts` dagi tartibda */
    segNames: string[];
    segNotes: string[];
    pains: TitleText[];
    verdict: string;
  };

  /** Xavfsizlik muammolari — jang, qurol, chekish, yong'in */
  threats: {
    kicker: string;
    title: string;
    items: { name: string; text: string; cost: string }[];
    /** Ramkasiz kadr ustidagi belgi — "hech kim ko'rmadi" */
    unwatched: string;
    verdict: string;
  };

  /** Ta'lim sifati — dars, o'qituvchi, e'tibor, chalg'ish */
  quality: {
    kicker: string;
    title: string;
    items: TitleText[];
    verdict: string;
  };

  /** Ota-ona muammosi */
  parentsPain: {
    kicker: string;
    title: string;
    gaps: TitleText[];
    quote: string;
    verdict: string;
  };

  /* ───────────────────── 3-BO'LIM · YECHIM ───────────────────── */

  howItWorks: {
    kicker: string;
    title: string;
    steps: { title: string; text: string }[];
    keysTitle: string;
    keys: string[];
    note: string;
  };

  /** Detektorlar — REAL kadrlar bilan */
  detectors: {
    kicker: string;
    title: string;
    /** Real hodisa kartalari: nima aniqlangan, qaysi kamerada, qachon */
    cases: { name: string; cam: string; when: string; conf: string }[];
    /** Barcha aniqlanadigan holatlar — kartalar ostida to'liq ro'yxat */
    allTitle: string;
    all: string[];
    /** Qolgan detektorlar ro'yxati */
    more: string[];
    moreTitle: string;
    note: string;
  };

  /** Pichoq va qurolni aniqlash — real kadr bilan */
  knife: ThreatCaseCopy;

  /** Qoldirilgan buyumni aniqlash — real kadr bilan */
  abandoned: ThreatCaseCopy;

  /** Davomat: kirishdagi yuz + birinchi va oxirgi darsdagi xona sanog'i */
  attendance: {
    kicker: string;
    title: string;
    sub: string;
    /** Uchta real kadr: [kirish, birinchi dars, oxirgi dars] */
    flow: { title: string; text: string; tag: string }[];
    /** Yakuniy son ostidagi yorliq: "darsdan yo'qolgan" */
    resultLabel: string;
    /** Ogohlantirish xabari: sarlavha va matn */
    alertTitle: string;
    alertText: string;
    points: string[];
    /** Hisob izohi: 11 qanday chiqqani */
    note: string;
  };

  /** Dars tahlili va o'quvchi e'tibori */
  lesson: {
    kicker: string;
    title: string;
    teacherTitle: string;
    teacher: string[];
    studentTitle: string;
    student: string[];
    /** Yuz tanish bloki */
    faceTitle: string;
    faceText: string;
    /** Sinf kadri ostidagi yorliq — aniqlangan holat */
    frameNote: string;
    note: string;
    /** Kamera tahlili: sarlavha va aniqlangan belgilar */
    /** O'qituvchilar reytingi (namunaviy) */
    rank: { title: string; rows: { name: string; value: number }[] };
    /** Baholangan o'qituvchi kartasi (namunaviy) */
    card: { role: string; name: string; subject: string; scoreLabel: string };
    camTitle: string;
    camChips: string[];
    /** Ovoz tahlili */
    voice: {
      title: string;
      status: string;
      lines: { who: string; text: string; onTopic: boolean }[];
      onLabel: string;
      offLabel: string;
      scoreTitle: string;
      scores: { label: string; value: number }[];
      verdict: string;
    };
  };

  /** Ota-onalar ilovasi — real ekran rasmlari */
  parentsApp: {
    kicker: string;
    title: string;
    /** Ekran rasmlari ostidagi izohlar */
    shots: string[];
    items: TitleText[];
    note: string;
  };

  /* ───────────────────── 4-BO'LIM · NATIJA ───────────────────── */

  /** 179-maktab — hozir ishlab turibdi */
  live: {
    kicker: string;
    title: string;
    badge: string;
    /** "bir kunning hodisalari" belgisi — kadrlarning eng kuchli tomoni */
    sameDay: string;
    /** Uchta real kadr — yorliq, kamera, vaqt */
    frames: { label: string; cam: string; when: string }[];
    /** Real hodisa qaydlari — ilovadan olingan */
    events: { type: string; when: string; cam: string; conf: string }[];
    factsTitle: string;
    facts: { label: string; value: string }[];
    note: string;
  };

  /** Erishilgan natijalar */
  results: {
    kicker: string;
    title: string;
    gains: { num: string; label: string; note: string }[];
    verdict: string;
    note: string;
  };

  /** "Biz nima beramiz" — uchta asosiy qiymat */
  offer: {
    kicker: string;
    title: string;
    items: { title: string; points: string[] }[];
    /** Reyting kartasi: o'qituvchilar (rasm `oqituvchi-N.webp`, bo'lmasa bosh harflar) */
    stats: { start: string; end: string; gone: string };
    rank: { caption: string; rows: { name: string; subject: string; value: number }[] };
    note: string;
  };

  finale: {
    titleA: string;
    titleB: string;
    sub: string;
    points: string[];
    ctaTalk: string;
    ctaSite: string;
    foot: string;
  };
};
