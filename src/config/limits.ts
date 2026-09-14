/**
 * Ro'yxat chegaralari — YAGONA joy.
 *
 * NEGA: chegaralar ilgari kod bo'ylab sochilgan edi (`limit: 30`,
 * `limit: 50`, `limit: 100`, `slice(0, 400)`). Ma'lumot ko'payganda ortiqchasi
 * HECH QANDAY OGOHLANTIRISHSIZ tushib qolardi — operator to'liq ro'yxatni
 * ko'ryapman deb o'ylardi.
 *
 * QOIDA: ro'yxat chegaraga yetgan bo'lsa, UI buni AYTISHI shart
 * (`TruncationNotice` komponenti).
 */

export const LIMITS = {
  /** Trevoga kuzatuvchisi va yon paneldagi hodisalar. */
  alarmFeed: 30,
  /** Hodisalar sahifasidagi ro'yxat. */
  eventList: 50,
  /** kuzatuv posti aniqlashlari — jonli oqim buferi. */
  detectionFeed: 100,
  /** Bino ichidagi hodisalar (3D kampus). */
  buildingEvents: 100,
  /** Geo drill-down jadvali. */
  geoDrillRows: 400,
  /** Shaxslar sahifasi — bir sahifadagi qator. */
  peoplePage: 10,
} as const;

/** Ro'yxat chegaraga yetganmi (ya'ni ko'rsatilmagan yozuv bo'lishi mumkin). */
export function isTruncated(shown: number, limit: number): boolean {
  return shown >= limit;
}
