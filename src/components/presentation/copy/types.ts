/**
 * Taqdimot matnining TIPI — o'zbekcha va inglizcha nusxalar shu shaklga
 * to'liq amal qiladi, shuning uchun bir tilda qo'shilgan qator ikkinchisida
 * unutilib qolmaydi (TypeScript darhol xato beradi).
 *
 * Ovoz matni (`narration`) ham shu yerda: `tools/build-narration.py` aynan
 * shu qatorlarni TTS xizmatiga yuboradi.
 *
 * ⚠️ OVOZ — TAQDIMOTCHI OVOZI. Matn birinchi shaxsda AI nomidan
 * gapirmaydi ("men ko'raman" emas): mahsulotni BIZ tanishtiramiz, tizim esa
 * uchinchi shaxsda tilga olinadi. Yangi qator qo'shganda shu ohangni
 * saqlang.
 *
 * ⚠️ Kalitlar SLAYD RAQAMI emas, MA'NOSI bo'yicha nomlangan (`pipeline`,
 * `parents`…). Slayd tartibi `PresentationPage.tsx` dagi massiv bilan
 * belgilanadi — yangi slayd qo'shilsa, bu yerda hech narsa raqamlanmaydi.
 */

import type { DeckCopyBase } from "@/components/deck/types";

export type { DeckLang as ShowLang, CueCopy } from "@/components/deck/types";

export type Pair = { lead: string; text: string };
export type TitleText = { title: string; text: string };

/** Bosqichli ro'yxat: raqam + sarlavha + izoh */
export type Step = { title: string; text: string };

/**
 * `DeckCopyBase` — dvijok biladigan qism (til, qobiq matni, boshlash
 * ekrani, ovoz ssenariysi). Qolgani shu taqdimotning o'ziniki.
 */
export type ShowCopy = DeckCopyBase & {
  /** Ishlab chiqilayotgan (hali joriy etilmagan) bo'lim belgisi */
  roadmap: string;
  /** Hisoblangan, o'lchanmagan ko'rsatkich belgisi */
  derived: string;

  intro: {
    sub: string;
    stats: string[];
  };

  problem: {
    kicker: string;
    title: string;
    points: Pair[];
    quote: string;
    hudAi: string;
    hudRec: string;
    channels: string;
    footer: string;
  };

  /** "Ichkarida nima bo'ladi" — kadrdan hodisagacha bo'lgan yo'l */
  pipeline: {
    kicker: string;
    title: string;
    steps: { title: string; text: string; meta: string }[];
    note: string;
  };

  detectors: {
    kicker: string;
    title: string;
    dets: { name: string; note: string; label: string; cam: string }[];
    live: string;
    idle: string;
    real: string;
    own: string;
    footer: string;
    stamp: string;
  };

  response: {
    kicker: string;
    title: string;
    since: string;
    seconds: string;
    active: string;
    confirmed: string;
    dossier: string;
    clip: string;
    steps: TitleText[];
  };

  /** Janjal va qurol: aniqlashdan keyingi zanjir */
  threats: {
    kicker: string;
    title: string;
    fight: { name: string; level: string; conf: string; steps: Step[] };
    weapon: { name: string; level: string; conf: string; steps: Step[] };
    note: string;
  };

  attendance: {
    kicker: string;
    title: string;
    searching: string;
    person: string;
    cam: string;
    recorded: string;
    recordedMeta: string;
    recordedNote: string;
    tiles: string[];
    weekTitle: string;
    weekDays: string[];
    chips: string[];
  };

  /** O'quvchining holati: kayfiyat, e'tibor, agressiya belgisi */
  wellbeing: {
    kicker: string;
    title: string;
    dayTitle: string;
    lessonsTitle: string;
    moods: string[];
    attention: string;
    flagTitle: string;
    flagText: string;
    flagReason: string;
    signalsTitle: string;
    signals: TitleText[];
    note: string;
  };

  /** Direktor uchun: o'qituvchi va dars sifati */
  teachers: {
    kicker: string;
    title: string;
    items: TitleText[];
    metricsTitle: string;
    metrics: { label: string; value: string }[];
    adviceTitle: string;
    advice: string[];
    note: string;
  };

  coverage: {
    kicker: string;
    title: string;
    /** Ta'lim bosqichlari — platforma qamrab oladigan segmentlar */
    segments: { num: string; label: string }[];
    segmentsNote: string;
    meta: string;
    alert: string;
    campusTitle: string;
    campusNote: string;
    /** Xaritadagi yorliqlar — kalit geojson'dagi hudud nomi */
    regions: Record<string, string>;
  };

  control: {
    kicker: string;
    title: string;
    items: TitleText[];
    chips: string[];
  };

  /** Ota-onalar uchun mobil ilova */
  parents: {
    kicker: string;
    title: string;
    shots: string[];
    items: TitleText[];
    chips: string[];
  };

  security: {
    kicker: string;
    title: string;
    left: TitleText[];
    right: TitleText[];
    chips: string[];
  };

  advantages: {
    kicker: string;
    title: string;
    colWas: string;
    colNow: string;
    rows: { was: string; now: string }[];
    gains: { num: string; label: string }[];
  };

  /** Bozor va daromad — investor uchun */
  pricing: {
    kicker: string;
    title: string;
    tiersTitle: string;
    /** Uchta segment — har biri ALOHIDA QATOR, o'z rangi bilan */
    tiers: {
      name: string;
      who: string;
      price: string;
      unit: string;
      inst: string;
      students: string;
      monthly: string;
    }[];
    note: string;
    totalTitle: string;
    totalMonthly: string;
    totalYearly: string;
    totalUnit: { month: string; year: string };
    chartTitle: string;
    /** Qamrov stsenariylari — diagramma */
    chart: { pct: number; label: string; yearly: string; monthly: string }[];
    chartNote: string;
    source: string;
  };

  finale: {
    titleA: string;
    titleB: string;
    sub: string;
    ctaPanel: string;
    ctaOrder: string;
    ctaProduct: string;
    foot: string;
  };
};
