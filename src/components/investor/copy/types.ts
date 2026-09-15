import type { DeckCopyBase } from "@/components/deck/types";

/**
 * INVESTOR TAQDIMOTI MATNINING TIPI.
 *
 * Taqdimot BESH BO'LIMGA bo'lingan:
 *   1. MAQSAD  — loyiha nima uchun va nega aynan hozir (qonun bilan birga)
 *   2. MUAMMO  — ta'limdagi haqiqiy og'riq; investorni qiziqtiradigan joy
 *   3. YECHIM  — AI qanday hal qiladi va qanday natija beradi
 *   4. NATIJA  — 179-maktabda HOZIR ishlab turgan tizim
 *   5. BOZOR   — hajm, raqobat va qamrovga qarab foyda
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
    /** Qolgan detektorlar ro'yxati */
    more: string[];
    moreTitle: string;
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

  /* ────────────────────── 5-BO'LIM · BOZOR ───────────────────── */

  market: {
    kicker: string;
    title: string;
    tamLabel: string;
    tamNote: string;
    segNames: string[];
    segCols: { inst: string; students: string; price: string; monthly: string };
    source: string;
  };

  /** Raqobatchilar va bizning ustunligimiz */
  rivals: {
    kicker: string;
    title: string;
    us: string;
    list: { name: string; note: string }[];
    rows: string[];
    legend: { yes: string; partial: string; no: string };
    /** Uchta asosiy ustunlik — matritsa ostida */
    edgeTitle: string;
    edges: string[];
    note: string;
  };

  /** Daromad va foyda — qamrovga qarab */
  profit: {
    kicker: string;
    title: string;
    cols: { share: string; inst: string; revenue: string; profit: string; margin: string };
    /** 1% qatorini ajratib ko'rsatadigan izoh */
    highlight: string;
    breakevenLabel: string;
    unitTitle: string;
    unitLabels: { arpu: string; margin: string; payback: string; ltv: string };
    note: string;
  };

  finale: {
    titleA: string;
    titleB: string;
    sub: string;
    points: string[];
    ctaTalk: string;
    ctaDeck: string;
    ctaSite: string;
    foot: string;
  };
};
