/**
 * INVESTOR TAQDIMOTINING MOLIYAVIY MODELI — YAGONA HAQIQAT MANBAI.
 *
 * Taqdimotdagi HAR BIR raqam shu fayldan chiqadi. Sabab oddiy: investor
 * slaydlarni taqqoslab o'qiydi va bir joyda "39 mlrd", boshqa joyda
 * "40 mlrd" ko'rsa, butun modelga ishonchi yo'qoladi.
 *
 * ⚠️ BU TAQDIMOTDA INVESTITSIYA SO'RALMAYDI. Unda baholash ham, ulush ham,
 * exit hisobi ham yo'q — faqat BIZNES: bozor qancha, qancha qamrasak
 * qancha daromad va SOF FOYDA bo'ladi. Investor xulosani o'zi chiqaradi.
 *
 * ⚠️ IKKI XIL RAQAM ARALASHMASLIGI KERAK:
 *   • manbadan olingan — Statistika qo'mitasi, qaror, ochiq matbuot;
 *   • bizning taxminimiz — tarif, marja, xarajat tuzilmasi.
 * Ekranda ikkalasi ham belgilanadi. Investor birinchi navbatda shuni so'raydi.
 *
 * Valyuta: ichkarida HAMMASI so'mda saqlanadi, dollar faqat ko'rsatishda
 * hisoblanadi (`usd()`). Shunda kurs o'zgarsa bitta konstanta yetadi.
 */

/* ─────────────────────────── valyuta ─────────────────────────── */

/**
 * So'm/dollar kursi. 2026-yil sentabr holatiga ~11 800 (Markaziy bank
 * va tijorat banklari oralig'i). Ekranda ochiq ko'rsatiladi.
 */
export const FX = 11_800;

export const usd = (som: number): number => som / FX;
export const toSom = (dollars: number): number => dollars * FX;

/* ───────────────────────── bozor: manba ──────────────────────── */

/**
 * O'zbekiston ta'lim tizimi, 2025/2026 o'quv yili boshiga.
 * Manba: Statistika qo'mitasi (2026-yil 31-mart e'loni).
 */
export type Segment = {
  key: "school" | "college" | "university";
  /** muassasalar soni */
  inst: number;
  /** o'quvchi/talaba soni */
  students: number;
  /** oylik tarif, so'm / o'quvchi */
  price: number;
  /** o'quvchilar soni taxminiymi */
  est?: boolean;
};

export const SEGMENTS: Segment[] = [
  { key: "school", inst: 11_118, students: 6_870_000, price: 5_000 },
  { key: "college", inst: 500, students: 300_000, price: 10_000, est: true },
  { key: "university", inst: 215, students: 1_540_000, price: 15_000 },
];

/** Qo'shimcha manba raqamlari */
export const MARKET = {
  teachers: 577_700,
  privateSchools: 551,
  privateSchoolsGrowth: 0.211,
  firstGraders: 725_300,
};

export const totalInst = (): number => SEGMENTS.reduce((s, x) => s + x.inst, 0);
export const totalStudents = (): number => SEGMENTS.reduce((s, x) => s + x.students, 0);

/** Segmentning to'liq qamrovdagi oylik daromadi, so'm */
export const segMonthly = (s: Segment): number => s.students * s.price;

/** Segmentning o'rtacha muassasasi oyiga qancha to'laydi, so'm */
export const segArpu = (s: Segment): number => segMonthly(s) / s.inst;

/** Segmentdagi o'rtacha muassasada nechta o'quvchi bor */
export const segSize = (s: Segment): number => s.students / s.inst;

/** TAM — barcha ta'lim muassasalari to'liq qamrovda, so'm / yil */
export const TAM_YEAR = SEGMENTS.reduce((s, x) => s + segMonthly(x), 0) * 12;

/* ───────────────────── mijoz iqtisodiyoti ────────────────────── */

/**
 * Mijozlar tarkibi — qamrovdagi muassasalar qaysi segmentdan.
 * Ataylab EHTIYOTKOR: OTM eng daromadli, lekin ularni ko'p deb
 * ko'rsatish modelni sun'iy ravishda chiroyli qilib yuborardi.
 */
export const MIX: Record<Segment["key"], number> = {
  school: 0.86,
  college: 0.10,
  university: 0.04,
};

/** Bitta o'rtacha mijozning oylik to'lovi (aralash tarkib bo'yicha), so'm */
export const ARPU_MONTH = SEGMENTS.reduce((s, x) => s + segArpu(x) * MIX[x.key], 0);

/** Bitta o'rtacha mijozdagi o'quvchilar soni */
export const AVG_STUDENTS = SEGMENTS.reduce((s, x) => s + segSize(x) * MIX[x.key], 0);

/** Bitta mijozning yillik to'lovi, so'm */
export const ACV = ARPU_MONTH * 12;

/**
 * Yalpi marja. Qolgan 28% — chekka server amortizatsiyasi, o'rnatish,
 * qo'llab-quvvatlash va model yangilanishi.
 */
export const GROSS_MARGIN = 0.72;

/** Bitta mijozni jalb qilish narxi (sotuv + pilot + o'rnatish), so'm */
export const CAC = toSom(2_400);

/** Yillik chiqib ketish. Qaror talabi va on-prem o'rnatish almashtirishni qiyinlashtiradi */
export const CHURN = 0.06;

/**
 * LTV — 5 YIL bilan CHEKLANGAN.
 *
 * 6% churn matematik jihatdan ~16 yillik umr beradi, lekin bunday uzoq
 * gorizontga asoslangan LTV investor uchun ishonchsiz.
 */
export const LTV_YEARS = 5;
export const LTV = ACV * GROSS_MARGIN * LTV_YEARS;
export const LTV_CAC = LTV / CAC;
/** Qoplanish muddati, oy */
export const PAYBACK_MONTHS = CAC / ((ACV * GROSS_MARGIN) / 12);

/* ──────────────────── operatsion xarajat ─────────────────────── */

/**
 * XARAJAT TUZILMASI — uch qismdan iborat.
 *
 * Bu modeldagi eng muhim qism: investor "qancha qamrasangiz qancha foyda"
 * degan savolga javob shu yerdan chiqadi.
 *
 *   `FIXED`     — qamrovga bog'liq BO'LMAGAN xarajat: yadro jamoasi
 *                 (muhandislar, model ishlanmasi), ofis, yuridik, infra.
 *                 O'zbekiston mehnat bozori narxlarida hisoblangan.
 *   `PER_INST`  — har bir yangi muassasaga qo'shiladigan xarajat:
 *                 mijozni yuritish, viloyat vakili, qo'shimcha qo'llab-quvvatlash.
 *   `REV_SHARE` — daromadga proporsional o'sadigan qism: sotuv, marketing,
 *                 boshqaruv qatlami. Usiz model masshtabda haddan tashqari
 *                 foydali ko'rinib qolardi va ishonchsiz bo'lardi.
 *
 * ⚠️ Server va qo'llab-quvvatlashning BIR QISMI allaqachon `GROSS_MARGIN`
 * ichida. Bu yerda ular QAYTA hisoblanmaydi.
 */
export const OPEX = {
  fixed: toSom(320_000),
  perInst: toSom(700),
  revShare: 0.15,
};

export const opexFor = (inst: number, revenue: number): number =>
  OPEX.fixed + OPEX.perInst * inst + revenue * OPEX.revShare;

/* ─────────────────── qamrovga qarab hisob ────────────────────── */

export type Coverage = {
  /** qamrov ulushi (0…1) — o'quvchilar soniga nisbatan */
  share: number;
  /** qamrab olingan o'quvchilar */
  students: number;
  /** shuncha o'quvchi nechta muassasaga to'g'ri keladi */
  inst: number;
  /** yillik daromad, so'm */
  revenue: number;
  /** yalpi foyda, so'm */
  gross: number;
  /** operatsion xarajat, so'm */
  opex: number;
  /** SOF FOYDA (EBITDA), so'm */
  profit: number;
  /** sof foyda marjasi */
  margin: number;
};

/**
 * Berilgan qamrov ulushida biznes qanday ko'rinishini hisoblaydi.
 *
 * Qamrov O'QUVCHILAR soniga nisbatan olinadi (muassasalar soniga emas):
 * universitetda 7 mingdan ortiq talaba, maktabda esa 600 ga yaqin o'quvchi
 * bor — muassasa bo'yicha foiz bozorni noto'g'ri ko'rsatardi.
 */
export function coverage(share: number): Coverage {
  const students = totalStudents() * share;
  const inst = Math.round(students / AVG_STUDENTS);
  const revenue = inst * ARPU_MONTH * 12;
  const gross = revenue * GROSS_MARGIN;
  const opex = opexFor(inst, revenue);
  const profit = gross - opex;
  return { share, students, inst, revenue, gross, opex, profit, margin: revenue > 0 ? profit / revenue : 0 };
}

/** Taqdimotda ko'rsatiladigan qamrov bosqichlari */
export const COVERAGE_STEPS = [0.01, 0.03, 0.05, 0.1, 0.25];

/** Nolga chiqish nuqtasi — foyda musbat bo'ladigan eng kichik qamrov */
export function breakEvenShare(): number {
  for (let s = 0.001; s <= 1; s += 0.001) {
    if (coverage(s).profit > 0) return s;
  }
  return 1;
}

/* ─────────────────── 179-maktab: real natija ─────────────────── */

/**
 * Hozir ISHLAB TURGAN muassasa. Bu raqamlar model emas — ular
 * taqdimotning yagona "o'lchangan" qismi.
 *
 * ⚠️ Panel ma'lumotidan yangilab turing (panel manzili — `.env`).
 */
export const LIVE_SCHOOL = {
  name: "179-maktab",
  city: "Toshkent",
  /** Aniqlangan hodisa turlari — real ishlayotgan detektorlar */
  detectors: ["Janjal", "Qurol", "Chekish", "Kechikish", "Davomat"],
};

/* ──────────────────────── formatlash ─────────────────────────── */

export type Currency = "uzs" | "usd";

const nf = (v: number, digits: number) =>
  v.toLocaleString("ru-RU", { minimumFractionDigits: digits, maximumFractionDigits: digits }).replace(/ /g, " ");

/** Pul summasi — tanlangan valyutada, birligi bilan */
export function money(soms: number, cur: Currency): { value: string; unit: string } {
  if (cur === "usd") {
    const v = usd(soms);
    if (Math.abs(v) >= 1_000_000) return { value: nf(v / 1_000_000, v >= 10_000_000 ? 0 : 1), unit: "mln $" };
    if (Math.abs(v) >= 1_000) return { value: nf(v / 1_000, 0), unit: "ming $" };
    return { value: nf(v, 0), unit: "$" };
  }
  if (Math.abs(soms) >= 1_000_000_000) return { value: nf(soms / 1_000_000_000, soms >= 100_000_000_000 ? 0 : 1), unit: "mlrd so'm" };
  if (Math.abs(soms) >= 1_000_000) return { value: nf(soms / 1_000_000, 1), unit: "mln so'm" };
  return { value: nf(soms, 0), unit: "so'm" };
}

/** Bitta qatorda: "145 mlrd so'm" */
export const moneyLine = (soms: number, cur: Currency): string => {
  const m = money(soms, cur);
  return `${m.value} ${m.unit}`;
};

/**
 * Bir QATORDAGI summalarni bitta birlikda ko'rsatadi.
 *
 * `money()` har bir qiymat uchun birlikni alohida tanlaydi va jadvalda
 * bu chalkashlik beradi: "+927 mln" bilan "+18,6 mlrd" yonma-yon turganda
 * ko'z ularni taqqoslay olmaydi. Shu yerda birlik eng katta qiymat (`ref`)
 * bo'yicha BIR MARTA tanlanadi va butun qatorga qo'llaniladi.
 */
export function moneyAt(soms: number, cur: Currency, ref: number): { value: string; unit: string } {
  const big = Math.abs(ref);
  if (cur === "usd") {
    const v = usd(soms);
    if (usd(big) >= 1_000_000) return { value: nf(v / 1_000_000, 2), unit: "mln $" };
    return { value: nf(v / 1_000, 0), unit: "ming $" };
  }
  if (big >= 1_000_000_000) return { value: nf(soms / 1_000_000_000, 1), unit: "mlrd so'm" };
  return { value: nf(soms / 1_000_000, 1), unit: "mln so'm" };
}

export const pct = (v: number, digits = 0): string => `${nf(v * 100, digits)}%`;

/** Sonni bo'shliq bilan ajratib yozadi: 11 118 */
export const num = (v: number): string => nf(v, 0);
