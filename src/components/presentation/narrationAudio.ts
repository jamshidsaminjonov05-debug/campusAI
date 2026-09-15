/**
 * Taqdimot ovozi — GENERATSIYA QILINGAN MANIFEST.
 *
 * Yangilash:  python3 tools/build-narration.py
 * Manba matn: `copy/uz.ts` va `copy/en.ts` dagi `narration`.
 * Fayllar:    `public/audio/taqdimot/<til>/slayd-NN.mp3`
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
    0: { file: "/audio/taqdimot/en/slayd-00.mp3", duration: 13.07, offsets: [0.25, 1.32, 8.89] },
    1: { file: "/audio/taqdimot/en/slayd-01.mp3", duration: 14.57, offsets: [0.25, 2.76, 7.27, 11.43] },
    2: { file: "/audio/taqdimot/en/slayd-02.mp3", duration: 51.94, offsets: [0.25, 4.14, 10.0, 15.63, 21.6, 30.27, 37.83, 48.93] },
    3: { file: "/audio/taqdimot/en/slayd-03.mp3", duration: 29.99, offsets: [0.25, 2.42, 5.8, 9.64, 13.63, 16.84, 19.59, 26.04] },
    4: { file: "/audio/taqdimot/en/slayd-04.mp3", duration: 24.27, offsets: [0.25, 3.18, 7.79, 13.27, 16.63] },
    5: { file: "/audio/taqdimot/en/slayd-05.mp3", duration: 70.16, offsets: [0.25, 5.4, 11.54, 19.11, 26.24, 37.96, 42.44, 52.15, 63.02] },
    6: { file: "/audio/taqdimot/en/slayd-06.mp3", duration: 17.08, offsets: [0.25, 2.35, 7.88, 11.74] },
    7: { file: "/audio/taqdimot/en/slayd-07.mp3", duration: 46.08, offsets: [0.25, 3.28, 11.66, 21.34, 29.36, 39.92] },
    8: { file: "/audio/taqdimot/en/slayd-08.mp3", duration: 46.81, offsets: [0.25, 4.9, 13.92, 22.49, 32.66, 41.9] },
    9: { file: "/audio/taqdimot/en/slayd-09.mp3", duration: 36.16, offsets: [0.25, 4.98, 11.99, 16.78, 23.69, 32.27] },
    10: { file: "/audio/taqdimot/en/slayd-10.mp3", duration: 21.67, offsets: [0.25, 2.12, 5.95, 9.26, 13.91, 18.04] },
    11: { file: "/audio/taqdimot/en/slayd-11.mp3", duration: 24.8, offsets: [0.25, 4.76, 11.21, 18.6] },
    12: { file: "/audio/taqdimot/en/slayd-12.mp3", duration: 22.69, offsets: [0.25, 2.89, 7.77, 11.77, 18.99] },
    13: { file: "/audio/taqdimot/en/slayd-13.mp3", duration: 21.67, offsets: [0.25, 5.23, 8.65, 12.3, 16.54] },
    14: { file: "/audio/taqdimot/en/slayd-14.mp3", duration: 52.2, offsets: [0.25, 1.87, 9.52, 18.7, 28.02, 35.78, 46.57] },
    15: { file: "/audio/taqdimot/en/slayd-15.mp3", duration: 8.56, offsets: [0.25, 1.96, 5.36] },
  },
  uz: {
    0: { file: "/audio/taqdimot/uz/slayd-00.mp3", duration: 14.36, offsets: [0.25, 1.67, 10.25] },
    1: { file: "/audio/taqdimot/uz/slayd-01.mp3", duration: 16.1, offsets: [0.25, 3.18, 8.17, 12.45] },
    2: { file: "/audio/taqdimot/uz/slayd-02.mp3", duration: 51.85, offsets: [0.25, 3.44, 9.26, 14.38, 20.37, 28.86, 35.96, 48.25] },
    3: { file: "/audio/taqdimot/uz/slayd-03.mp3", duration: 29.1, offsets: [0.25, 2.55, 5.58, 8.86, 13.08, 16.5, 20.01, 24.74] },
    4: { file: "/audio/taqdimot/uz/slayd-04.mp3", duration: 22.43, offsets: [0.25, 2.85, 7.53, 11.87, 14.82] },
    5: { file: "/audio/taqdimot/uz/slayd-05.mp3", duration: 69.85, offsets: [0.25, 5.04, 11.29, 18.2, 26.33, 38.58, 42.32, 53.07, 62.78] },
    6: { file: "/audio/taqdimot/uz/slayd-06.mp3", duration: 17.1, offsets: [0.25, 2.63, 7.38, 11.74] },
    7: { file: "/audio/taqdimot/uz/slayd-07.mp3", duration: 48.96, offsets: [0.25, 4.01, 12.46, 22.09, 30.62, 43.46] },
    8: { file: "/audio/taqdimot/uz/slayd-08.mp3", duration: 45.48, offsets: [0.25, 4.42, 11.88, 21.12, 32.08, 40.74] },
    9: { file: "/audio/taqdimot/uz/slayd-09.mp3", duration: 35.8, offsets: [0.25, 4.44, 11.95, 17.37, 25.58, 32.39] },
    10: { file: "/audio/taqdimot/uz/slayd-10.mp3", duration: 21.64, offsets: [0.25, 2.39, 6.43, 10.61, 14.7, 18.87] },
    11: { file: "/audio/taqdimot/uz/slayd-11.mp3", duration: 25.11, offsets: [0.25, 4.61, 11.61, 18.66] },
    12: { file: "/audio/taqdimot/uz/slayd-12.mp3", duration: 20.34, offsets: [0.25, 3.02, 7.28, 10.74, 16.92] },
    13: { file: "/audio/taqdimot/uz/slayd-13.mp3", duration: 19.41, offsets: [0.25, 4.18, 7.94, 11.58, 14.62] },
    14: { file: "/audio/taqdimot/uz/slayd-14.mp3", duration: 49.06, offsets: [0.25, 1.85, 10.42, 18.39, 26.51, 34.04, 44.15] },
    15: { file: "/audio/taqdimot/uz/slayd-15.mp3", duration: 7.19, offsets: [0.25, 1.44, 4.58] },
  },
};
