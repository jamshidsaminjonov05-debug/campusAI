/**
 * Taqdimot ovozi — GENERATSIYA QILINGAN MANIFEST.
 *
 * Yangilash:  python3 tools/build-narration.py --deck investor
 * Manba matn: `copy/uz.ts` va `copy/en.ts` dagi `narration`.
 * Fayllar:    `public/audio/investor/<til>/slayd-NN.mp3`
 *
 * `offsets` — har bir bo'lakning FAYL ICHIDAGI o'lchangan boshlanish
 * vaqti. Subtitr va slayd bosqichlari shu vaqtlarga qarab ishlaydi,
 * shuning uchun ovoz bilan animatsiya soniyagacha mos tushadi.
 *
 * Manifest bo'sh bo'lsa taqdimot OVOZSIZ ishlaydi: `copy` dagi
 * rejalashtirilgan vaqtlar ishlatiladi, AI orbi esa sintetik nutq
 * konvertiga qarab jonlanadi. Ya'ni ovoz yo'qligi hech narsani buzmaydi.
 *
 * ⚠️ QO'LDA TAHRIRLAMANG — skriptni qayta ishga tushiring.
 */

export type AudioSegment = {
  /** `public/` ichidagi manzil */
  file: string;
  /** to'liq uzunlik, sekund */
  duration: number;
  /** har bo'lakning boshlanish vaqti, sekund */
  offsets: number[];
};

export const NARRATION_AUDIO: Record<string, Record<number, AudioSegment>> = {
  en: {
    0: { file: "/audio/investor/en/slayd-00.mp3", duration: 11.87, offsets: [0.25, 1.44, 6.59] },
    1: { file: "/audio/investor/en/slayd-01.mp3", duration: 17.64, offsets: [0.25, 2.86, 10.92] },
    2: { file: "/audio/investor/en/slayd-02.mp3", duration: 15.08, offsets: [0.25, 6.52, 10.17] },
    3: { file: "/audio/investor/en/slayd-03.mp3", duration: 10.79, offsets: [0.25, 2.31, 7.25] },
    4: { file: "/audio/investor/en/slayd-04.mp3", duration: 12.86, offsets: [0.25, 2.66, 8.45] },
    5: { file: "/audio/investor/en/slayd-05.mp3", duration: 12.48, offsets: [0.25, 2.3, 7.42] },
    6: { file: "/audio/investor/en/slayd-06.mp3", duration: 15.74, offsets: [0.25, 3.32, 9.64] },
    7: { file: "/audio/investor/en/slayd-07.mp3", duration: 12.6, offsets: [0.25, 1.93, 8.18] },
    8: { file: "/audio/investor/en/slayd-08.mp3", duration: 14.65, offsets: [0.25, 3.29, 9.93] },
    9: { file: "/audio/investor/en/slayd-09.mp3", duration: 12.93, offsets: [0.25, 2.83, 8.78] },
    10: { file: "/audio/investor/en/slayd-10.mp3", duration: 12.91, offsets: [0.25, 3.8, 9.74] },
    11: { file: "/audio/investor/en/slayd-11.mp3", duration: 12.01, offsets: [0.25, 1.62, 7.51] },
    12: { file: "/audio/investor/en/slayd-12.mp3", duration: 12.07, offsets: [0.25, 1.55, 7.61] },
    13: { file: "/audio/investor/en/slayd-13.mp3", duration: 14.63, offsets: [0.25, 3.53, 9.78] },
    14: { file: "/audio/investor/en/slayd-14.mp3", duration: 14.43, offsets: [0.25, 2.67, 7.98] },
    15: { file: "/audio/investor/en/slayd-15.mp3", duration: 11.16, offsets: [0.25, 1.85, 7.8] },
  },
  uz: {
    0: { file: "/audio/investor/uz/slayd-00.mp3", duration: 11.15, offsets: [0.25, 1.67, 6.44] },
    1: { file: "/audio/investor/uz/slayd-01.mp3", duration: 16.82, offsets: [0.25, 2.6, 10.75] },
    2: { file: "/audio/investor/uz/slayd-02.mp3", duration: 16.34, offsets: [0.25, 6.14, 10.95] },
    3: { file: "/audio/investor/uz/slayd-03.mp3", duration: 12.86, offsets: [0.25, 2.47, 8.1] },
    4: { file: "/audio/investor/uz/slayd-04.mp3", duration: 14.01, offsets: [0.25, 2.51, 9.53] },
    5: { file: "/audio/investor/uz/slayd-05.mp3", duration: 12.01, offsets: [0.25, 2.35, 6.99] },
    6: { file: "/audio/investor/uz/slayd-06.mp3", duration: 14.44, offsets: [0.25, 2.95, 8.32] },
    7: { file: "/audio/investor/uz/slayd-07.mp3", duration: 11.82, offsets: [0.25, 1.87, 7.43] },
    8: { file: "/audio/investor/uz/slayd-08.mp3", duration: 12.89, offsets: [0.25, 2.65, 8.13] },
    9: { file: "/audio/investor/uz/slayd-09.mp3", duration: 13.23, offsets: [0.25, 2.59, 9.64] },
    10: { file: "/audio/investor/uz/slayd-10.mp3", duration: 12.64, offsets: [0.25, 3.33, 8.96] },
    11: { file: "/audio/investor/uz/slayd-11.mp3", duration: 11.6, offsets: [0.25, 1.67, 7.81] },
    12: { file: "/audio/investor/uz/slayd-12.mp3", duration: 11.77, offsets: [0.25, 1.67, 7.2] },
    13: { file: "/audio/investor/uz/slayd-13.mp3", duration: 14.07, offsets: [0.25, 3.35, 9.43] },
    14: { file: "/audio/investor/uz/slayd-14.mp3", duration: 13.96, offsets: [0.25, 2.72, 8.13] },
    15: { file: "/audio/investor/uz/slayd-15.mp3", duration: 11.07, offsets: [0.25, 1.5, 7.4] },
  },
};
