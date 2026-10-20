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
    3: { file: "/audio/investor/en/slayd-03.mp3", duration: 14.89, offsets: [0.25, 2.16, 8.43] },
    4: { file: "/audio/investor/en/slayd-04.mp3", duration: 12.86, offsets: [0.25, 2.66, 8.45] },
    5: { file: "/audio/investor/en/slayd-05.mp3", duration: 12.48, offsets: [0.25, 2.3, 7.42] },
    6: { file: "/audio/investor/en/slayd-06.mp3", duration: 15.74, offsets: [0.25, 3.32, 9.64] },
    7: { file: "/audio/investor/en/slayd-07.mp3", duration: 11.35, offsets: [0.25, 2.08, 7.04] },
    8: { file: "/audio/investor/en/slayd-08.mp3", duration: 15.11, offsets: [0.25, 2.96, 9.39] },
    9: { file: "/audio/investor/en/slayd-09.mp3", duration: 24.19, offsets: [0.25, 2.34, 8.64, 14.77, 21.29] },
    10: { file: "/audio/investor/en/slayd-10.mp3", duration: 25.43, offsets: [0.25, 3.17, 11.79, 16.76, 20.69] },
    11: { file: "/audio/investor/en/slayd-11.mp3", duration: 22.65, offsets: [0.25, 3.16, 7.95, 13.74, 17.27] },
    12: { file: "/audio/investor/en/slayd-12.mp3", duration: 12.92, offsets: [0.25, 2.7, 9.03] },
    13: { file: "/audio/investor/en/slayd-13.mp3", duration: 12.61, offsets: [0.25, 3.83, 9.38] },
    14: { file: "/audio/investor/en/slayd-14.mp3", duration: 13.31, offsets: [0.25, 1.86, 8.02] },
    15: { file: "/audio/investor/en/slayd-15.mp3", duration: 26.6, offsets: [0.25, 2.43, 14.09, 19.28] },
    16: { file: "/audio/investor/en/slayd-16.mp3", duration: 9.9, offsets: [0.25, 1.97, 7.84] },
  },
  uz: {
    0: { file: "/audio/investor/uz/slayd-00.mp3", duration: 11.15, offsets: [0.25, 1.67, 6.44] },
    1: { file: "/audio/investor/uz/slayd-01.mp3", duration: 16.82, offsets: [0.25, 2.6, 10.75] },
    2: { file: "/audio/investor/uz/slayd-02.mp3", duration: 16.34, offsets: [0.25, 6.14, 10.95] },
    3: { file: "/audio/investor/uz/slayd-03.mp3", duration: 15.6, offsets: [0.25, 2.47, 8.66] },
    4: { file: "/audio/investor/uz/slayd-04.mp3", duration: 14.01, offsets: [0.25, 2.51, 9.53] },
    5: { file: "/audio/investor/uz/slayd-05.mp3", duration: 12.01, offsets: [0.25, 2.35, 6.99] },
    6: { file: "/audio/investor/uz/slayd-06.mp3", duration: 14.44, offsets: [0.25, 2.95, 8.32] },
    7: { file: "/audio/investor/uz/slayd-07.mp3", duration: 11.45, offsets: [0.25, 1.87, 7.06] },
    8: { file: "/audio/investor/uz/slayd-08.mp3", duration: 14.77, offsets: [0.25, 3.71, 9.82] },
    9: { file: "/audio/investor/uz/slayd-09.mp3", duration: 24.1, offsets: [0.25, 2.25, 7.7, 13.82, 21.28] },
    10: { file: "/audio/investor/uz/slayd-10.mp3", duration: 26.24, offsets: [0.25, 3.17, 12.07, 17.36, 22.02] },
    11: { file: "/audio/investor/uz/slayd-11.mp3", duration: 24.95, offsets: [0.25, 2.65, 8.12, 15.21, 19.07] },
    12: { file: "/audio/investor/uz/slayd-12.mp3", duration: 13.23, offsets: [0.25, 2.59, 9.64] },
    13: { file: "/audio/investor/uz/slayd-13.mp3", duration: 12.56, offsets: [0.25, 3.33, 8.88] },
    14: { file: "/audio/investor/uz/slayd-14.mp3", duration: 12.67, offsets: [0.25, 1.8, 7.94] },
    15: { file: "/audio/investor/uz/slayd-15.mp3", duration: 29.3, offsets: [0.25, 2.48, 15.85, 21.74] },
    16: { file: "/audio/investor/uz/slayd-16.mp3", duration: 10.32, offsets: [0.25, 1.52, 7.42] },
  },
};
