/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  O'ZBEKISTON OLIY TA'LIM MUASSASALARI — TAXMINIY KOORDINATALAR       ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * Geo Analitika xaritasidagi universitet nuqtalari shu ro'yxatdan.
 *
 * ── KOORDINATALAR QAYERDAN ────────────────────────────────────────────
 * Ochiq xarita ma'lumotlaridan QO'LDA ko'chirilgan va **TAXMINIY**
 * (aniqligi ~100–300 m: nuqta bosh binoning hovlisiga qo'yilgan, kampus
 * chegarasi emas). Shuning uchun har qatorda `approx: true` turadi va UI
 * buni ochiq yozadi — operator bu nuqtani o'lchangan joylashuv deb
 * o'ylamasin.
 *
 * ⚠️ **ISHLASH PAYTIDA HECH QANDAY TASHQI XIZMAT CHAQIRILMAYDI.**
 * Loyihaning OFFLINE qoidasi (CLAUDE.md): Google Maps yoki boshqa
 * geokodlash API'si na build'da, na brauzerda so'ralmaydi — ro'yxat
 * shu faylda STATIK turadi. Yangi muassasa = shu yerga bitta qator.
 *
 * ⚠️ **BU YERDA STATISTIKA YO'Q va BO'LMAYDI.** Bu obyektlar kuzatuvda
 * emas: kamerasi, davomati, hodisasi yo'q. Loyiha qoidasi — manbasi yo'q
 * son o'ylab topilmaydi, shuning uchun ular xaritada faqat JOY sifatida
 * (nuqta + nom) ko'rinadi. Kuzatuvdagi 7 obyekt esa alohida ro'yxatda
 * (`config/institutions.ts`) va ularning 3D kampus konturi bor.
 */

export interface University {
  id: string;
  name: string;
  /** Qisqa nom — marker tooltip'i va qidiruv natijasi uchun. */
  short: string;
  lat: number;
  lng: number;
  /** To'liq viloyat nomi — `REGION_COLORS` / geojson `region_name` bilan bir xil. */
  region: string;
  /** Koordinata taxminiy (hozircha HAMMASI shunday). */
  approx: true;
}

export const UNIVERSITIES: University[] = [
  /* ── Toshkent shahri ── */
  { id: "uni-tdtu", name: "Islom Karimov nomidagi Toshkent davlat texnika universiteti", short: "TDTU", lat: 41.3387, lng: 69.2345, region: "Toshkent shahri", approx: true },
  { id: "uni-tdiu", name: "Toshkent davlat iqtisodiyot universiteti", short: "TDIU", lat: 41.2857, lng: 69.2035, region: "Toshkent shahri", approx: true },
  { id: "uni-tdyu", name: "Toshkent davlat yuridik universiteti", short: "TDYU", lat: 41.3112, lng: 69.2796, region: "Toshkent shahri", approx: true },
  { id: "uni-tta", name: "Toshkent tibbiyot akademiyasi", short: "TTA", lat: 41.3449, lng: 69.2861, region: "Toshkent shahri", approx: true },
  { id: "uni-taqi", name: "Toshkent arxitektura-qurilish universiteti", short: "TAQI", lat: 41.3305, lng: 69.3341, region: "Toshkent shahri", approx: true },
  { id: "uni-tiqxmmi", name: "Toshkent irrigatsiya va qishloq xo'jaligini mexanizatsiyalash muhandislari instituti", short: "TIQXMMI", lat: 41.3262, lng: 69.3349, region: "Toshkent shahri", approx: true },
  { id: "uni-tdpu", name: "Nizomiy nomidagi Toshkent davlat pedagogika universiteti", short: "TDPU", lat: 41.2761, lng: 69.2112, region: "Toshkent shahri", approx: true },
  { id: "uni-jahon-tillari", name: "O'zbekiston davlat jahon tillari universiteti", short: "JTU", lat: 41.3331, lng: 69.2139, region: "Toshkent shahri", approx: true },
  { id: "uni-sharqshunoslik", name: "Toshkent davlat sharqshunoslik universiteti", short: "TDShU", lat: 41.3108, lng: 69.2788, region: "Toshkent shahri", approx: true },
  { id: "uni-ozbek-tili", name: "Alisher Navoiy nomidagi Toshkent davlat o'zbek tili va adabiyoti universiteti", short: "O'zTAU", lat: 41.3229, lng: 69.2651, region: "Toshkent shahri", approx: true },
  { id: "uni-kimyo", name: "Toshkent kimyo-texnologiya instituti", short: "TKTI", lat: 41.3352, lng: 69.2823, region: "Toshkent shahri", approx: true },
  { id: "uni-toqimachilik", name: "Toshkent to'qimachilik va yengil sanoat instituti", short: "TTYeSI", lat: 41.3231, lng: 69.2542, region: "Toshkent shahri", approx: true },
  { id: "uni-transport", name: "Toshkent davlat transport universiteti", short: "TDTrU", lat: 41.2831, lng: 69.2162, region: "Toshkent shahri", approx: true },
  { id: "uni-moliya", name: "Toshkent moliya instituti", short: "TMI", lat: 41.2901, lng: 69.2103, region: "Toshkent shahri", approx: true },
  { id: "uni-stomatologiya", name: "Toshkent davlat stomatologiya instituti", short: "TDSI", lat: 41.3261, lng: 69.2324, region: "Toshkent shahri", approx: true },
  { id: "uni-pediatriya", name: "Toshkent pediatriya tibbiyot instituti", short: "TPTI", lat: 41.2618, lng: 69.2210, region: "Toshkent shahri", approx: true },
  { id: "uni-sanat", name: "O'zbekiston davlat san'at va madaniyat instituti", short: "San'at instituti", lat: 41.3402, lng: 69.2271, region: "Toshkent shahri", approx: true },
  { id: "uni-konservatoriya", name: "O'zbekiston davlat konservatoriyasi", short: "Konservatoriya", lat: 41.3108, lng: 69.2402, region: "Toshkent shahri", approx: true },
  { id: "uni-agrar", name: "Toshkent davlat agrar universiteti", short: "TDAU", lat: 41.3583, lng: 69.3979, region: "Toshkent shahri", approx: true },
  { id: "uni-yangi-ozbekiston", name: "Yangi O'zbekiston universiteti", short: "Yangi O'zbekiston", lat: 41.3053, lng: 69.2872, region: "Toshkent shahri", approx: true },
  { id: "uni-westminster", name: "Toshkentdagi Xalqaro Vestminster universiteti", short: "WIUT", lat: 41.3118, lng: 69.2681, region: "Toshkent shahri", approx: true },
  { id: "uni-inha", name: "Toshkentdagi Inha universiteti", short: "Inha", lat: 41.3412, lng: 69.2869, region: "Toshkent shahri", approx: true },
  { id: "uni-turin", name: "Toshkentdagi Turin politexnika universiteti", short: "Turin", lat: 41.2541, lng: 69.1932, region: "Toshkent shahri", approx: true },
  { id: "uni-mdis", name: "MDIS Toshkent", short: "MDIS", lat: 41.3232, lng: 69.2281, region: "Toshkent shahri", approx: true },
  { id: "uni-amity", name: "Amity universiteti Toshkent", short: "Amity", lat: 41.2402, lng: 69.3301, region: "Toshkent shahri", approx: true },

  /* ── Toshkent viloyati ── */
  { id: "uni-chirchiq-pi", name: "Chirchiq davlat pedagogika universiteti", short: "ChDPU", lat: 41.4691, lng: 69.5802, region: "Toshkent viloyati", approx: true },
  { id: "uni-sport", name: "O'zbekiston davlat jismoniy tarbiya va sport universiteti", short: "Sport universiteti", lat: 41.4652, lng: 69.5771, region: "Toshkent viloyati", approx: true },
  { id: "uni-angren", name: "Angren universiteti", short: "Angren", lat: 41.0172, lng: 70.1442, region: "Toshkent viloyati", approx: true },

  /* ── Samarqand ── */
  { id: "uni-samdu", name: "Samarqand davlat universiteti", short: "SamDU", lat: 39.6548, lng: 66.9749, region: "Samarqand viloyati", approx: true },
  { id: "uni-samtu", name: "Samarqand davlat tibbiyot universiteti", short: "SamDTU", lat: 39.6561, lng: 66.9602, region: "Samarqand viloyati", approx: true },
  { id: "uni-samisi", name: "Samarqand iqtisodiyot va servis instituti", short: "SamISI", lat: 39.6722, lng: 66.9771, region: "Samarqand viloyati", approx: true },
  { id: "uni-samvmi", name: "Samarqand veterinariya meditsinasi universiteti", short: "SamVMU", lat: 39.6702, lng: 66.9402, region: "Samarqand viloyati", approx: true },
  { id: "uni-samdchti", name: "Samarqand davlat chet tillar instituti", short: "SamDChTI", lat: 39.6621, lng: 66.9521, region: "Samarqand viloyati", approx: true },

  /* ── Buxoro ── */
  { id: "uni-buxdu", name: "Buxoro davlat universiteti", short: "BuxDU", lat: 39.7691, lng: 64.4231, region: "Buxoro viloyati", approx: true },
  { id: "uni-buxdti", name: "Buxoro davlat tibbiyot instituti", short: "BuxDTI", lat: 39.7752, lng: 64.4272, region: "Buxoro viloyati", approx: true },
  { id: "uni-bmti", name: "Buxoro muhandislik-texnologiya instituti", short: "BMTI", lat: 39.7601, lng: 64.4451, region: "Buxoro viloyati", approx: true },

  /* ── Andijon ── */
  { id: "uni-andmi", name: "Andijon davlat universiteti", short: "AndDU", lat: 40.7831, lng: 72.3421, region: "Andijon viloyati", approx: true },
  { id: "uni-andti", name: "Andijon davlat tibbiyot instituti", short: "AndDTI", lat: 40.7772, lng: 72.3512, region: "Andijon viloyati", approx: true },
  { id: "uni-andqxi", name: "Andijon qishloq xo'jaligi va agrotexnologiyalar instituti", short: "AndQXAI", lat: 40.7421, lng: 72.2102, region: "Andijon viloyati", approx: true },
  { id: "uni-andmii", name: "Andijon mashinasozlik instituti", short: "AndMI", lat: 40.7802, lng: 72.3312, region: "Andijon viloyati", approx: true },

  /* ── Farg'ona ── */
  { id: "uni-fardu", name: "Farg'ona davlat universiteti", short: "FarDU", lat: 40.3831, lng: 71.7871, region: "Farg‘ona viloyati", approx: true },
  { id: "uni-farpi", name: "Farg'ona politexnika instituti", short: "FarPI", lat: 40.3762, lng: 71.7622, region: "Farg‘ona viloyati", approx: true },
  { id: "uni-qoqon-pi", name: "Qo'qon davlat pedagogika instituti", short: "QDPI", lat: 40.5281, lng: 70.9421, region: "Farg‘ona viloyati", approx: true },

  /* ── Namangan ── */
  { id: "uni-namdu", name: "Namangan davlat universiteti", short: "NamDU", lat: 40.9981, lng: 71.6721, region: "Namangan viloyati", approx: true },
  { id: "uni-nammti", name: "Namangan muhandislik-texnologiya instituti", short: "NamMTI", lat: 40.9931, lng: 71.6402, region: "Namangan viloyati", approx: true },
  { id: "uni-namqxi", name: "Namangan muhandislik-qurilish instituti", short: "NamMQI", lat: 41.0021, lng: 71.6552, region: "Namangan viloyati", approx: true },

  /* ── Qashqadaryo ── */
  { id: "uni-qarshi-du", name: "Qarshi davlat universiteti", short: "QarDU", lat: 38.8621, lng: 65.7931, region: "Qashqadaryo viloyati", approx: true },
  { id: "uni-qarshi-mii", name: "Qarshi muhandislik-iqtisodiyot instituti", short: "QarMII", lat: 38.8502, lng: 65.8002, region: "Qashqadaryo viloyati", approx: true },

  /* ── Surxondaryo ── */
  { id: "uni-termiz-du", name: "Termiz davlat universiteti", short: "TerDU", lat: 37.2271, lng: 67.2781, region: "Surxondaryo viloyati", approx: true },
  { id: "uni-denov", name: "Denov tadbirkorlik va pedagogika instituti", short: "Denov instituti", lat: 38.2702, lng: 67.8902, region: "Surxondaryo viloyati", approx: true },

  /* ── Sirdaryo ── */
  { id: "uni-guliston", name: "Guliston davlat universiteti", short: "GulDU", lat: 40.4891, lng: 68.7831, region: "Sirdaryo viloyati", approx: true },

  /* ── Jizzax ── */
  { id: "uni-jizzax-dpu", name: "Jizzax davlat pedagogika universiteti", short: "JDPU", lat: 40.1161, lng: 67.8421, region: "Jizzax viloyati", approx: true },
  { id: "uni-jizzax-pti", name: "Jizzax politexnika instituti", short: "JizPI", lat: 40.1252, lng: 67.8501, region: "Jizzax viloyati", approx: true },

  /* ── Navoiy ── */
  { id: "uni-navoiy-du", name: "Navoiy davlat universiteti", short: "NavDU", lat: 40.0932, lng: 65.3721, region: "Navoiy viloyati", approx: true },
  { id: "uni-navoiy-kti", name: "Navoiy davlat konchilik va texnologiyalar universiteti", short: "NavKTU", lat: 40.1021, lng: 65.3811, region: "Navoiy viloyati", approx: true },

  /* ── Xorazm ── */
  { id: "uni-urganch-du", name: "Urganch davlat universiteti", short: "UrDU", lat: 41.5491, lng: 60.6321, region: "Xorazm viloyati", approx: true },
  { id: "uni-mamun", name: "Xorazm Ma'mun akademiyasi (Xiva)", short: "Ma'mun akademiyasi", lat: 41.3781, lng: 60.3631, region: "Xorazm viloyati", approx: true },

  /* ── Qoraqalpog'iston ── */
  { id: "uni-qmu", name: "Berdaq nomidagi Qoraqalpoq davlat universiteti", short: "QDU", lat: 42.4601, lng: 59.6151, region: "Qoraqalpog‘iston Respublikasi", approx: true },
  { id: "uni-nukus-pi", name: "Ajiniyoz nomidagi Nukus davlat pedagogika instituti", short: "NDPI", lat: 42.4531, lng: 59.6071, region: "Qoraqalpog‘iston Respublikasi", approx: true },
  { id: "uni-nukus-ti", name: "Nukus filiali — Toshkent pediatriya tibbiyot instituti", short: "TPTI Nukus", lat: 42.4652, lng: 59.6202, region: "Qoraqalpog‘iston Respublikasi", approx: true },
];

export const universityById = (id: string | null | undefined): University | null =>
  UNIVERSITIES.find((u) => u.id === id) ?? null;

/** Viloyat kesimi — panel va qidiruvda "nechta oliy ta'lim muassasasi" uchun. */
export function universitiesOfRegion(region: string | null | undefined): University[] {
  if (!region) return UNIVERSITIES;
  return UNIVERSITIES.filter((u) => u.region === region);
}
