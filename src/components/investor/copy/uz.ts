import type { InvestorCopy } from "./types";

/**
 * INVESTOR TAQDIMOTI MATNI — O'ZBEKCHA.
 *
 * ⚠️ OVOZ 5 DAQIQAGA MO'LJALLANGAN: 16 slayd × ~18 sekund. Har slaydda
 * UCHTA qisqa bo'lak. Yangi jumla qo'shsangiz boshqasini qisqartiring —
 * aks holda taqdimot belgilangan vaqtdan chiqib ketadi. Tekshirish:
 *     python3 tools/export-script.py --deck investor
 *
 * ⚠️ SLAYD MATNIDA RAQAM YO'Q — sonlar `model.ts` dan hisoblanadi.
 * Istisno: qaror sanasi va REAL hodisa qaydlari (kamera, vaqt, ishonch) —
 * ular o'lchangan ma'lumot, model emas.
 *
 * ⚠️ OVOZ MATNIDA raqamlar SO'Z BILAN yozilgan: TTS "725" ni to'g'ri
 * o'qiy olmaydi. Modelni o'zgartirsangiz shu qatorlarni ham yangilang.
 */
export const UZ: InvestorCopy = {
  lang: "uz",
  langLabel: "O'zbekcha",

  gate: {
    sub: "Ta'lim muassasalarida sun'iy intellekt: muammo, yechim va hozir ishlab turgan natija",
    start: "Taqdimotni boshlash",
    note: "5 daqiqa · ovoz bilan · to'liq ekranda",
  },

  shell: {
    prev: "Oldingi slayd",
    next: "Keyingi slayd",
    auto: "Avto",
    captions: "Subtitr",
    exit: "Chiqish",
    pause: "Pauza",
    resume: "Davom etish",
    sound: "Ovoz",
    hint: "→ keyingi · Space pauza · M ovoz · A avto · S subtitr",
    paused: "PAUZA",
    slideTitles: [
      "Kirish",
      "Maqsad",
      "Ta'limdagi manzara",
      "Xavfsizlik",
      "Dars sifati",
      "Ota-onalar",
      "Qanday ishlaydi",
      "Detektorlar",
      "Qurol",
      "Qoldirilgan buyum",
      "Davomat",
      "Dars tahlili",
      "Ota-ona ilovasi",
      "179-maktab",
      "Natijalar",
      "Biz nima beramiz",
      "Yakun",
    ],
  },

  assumed: "model bo'yicha hisob",
  measured: "o'lchangan",
  currencyHint: "Valyuta",
  fxNote: "Kurs: 1 $ = {rate} so'm",

  /* ─────────────────────────── ovoz ssenariysi ─────────────────────────── */

  narration: [
    /* 0 — KIRISH */
    [
      { at: 0.0, text: "Assalomu alaykum." },
      { at: 1.8, text: "Campus AI — ta'lim muassasalari uchun sun'iy intellekt asosidagi eko tizimi." },
      { at: 9.0, text: "Besh daqiqada muammo, yechim, hozir ishlab turgan natija va bozorni ko'rib chiqamiz." },
    ],

    /* 1 — MAQSAD */
    [
      { at: 0.0, text: "Loyiha qonun bilan uzviy bog'liq." },
      { at: 3.5, text: "Ikki ming yigirma oltinchi yil o'ttiz birinchi iyulda Vazirlar Mahkamasi barcha ta'lim muassasalari uchun xavfsizlik talablarini majburiy qildi." },
      { at: 13.5, text: "Qarorda qurolli hujum va shubhali shaxsni aniqlash talab qilinadi. Bu aynan Campus AI ning o'zi." },
    ],

    /* 2 — TA'LIMDAGI MANZARA */
    [
      { at: 0.0, text: "O'zbekistonda o'n bir mingdan ortiq maktab, besh yuz kollej va ikki yuz o'n beshta oliy ta'lim muassasasi bor." },
      { at: 9.0, text: "Ularning aksariyatida kamera o'rnatilgan, lekin kamera faqat yozadi." },
      { at: 14.5, text: "Yozuvni hodisa sodir bo'lgandan keyin ko'rasiz. Ya'ni kamera bor, lekin unda idrok yo'q." },
    ],

    /* 3 — XAVFSIZLIK */
    [
      { at: 0.0, text: "Birinchi muammo — xavfsizlik." },
      { at: 2.5, text: "Maktab hovlisidagi jang, hududga kirgan qurolli shaxs, o'quvchining chekishi, sinfda qoldirilgan shubhali sumka." },
      { at: 11.5, text: "Bularning hammasi kameraga tushadi, lekin ularni real vaqtda aniqlab, tegishli mas'ulga yuboradigan tizim yo'q." },
    ],

    /* 4 — DARS SIFATI */
    [
      { at: 0.0, text: "Ikkinchi muammo — dars sifati." },
      { at: 3.0, text: "O'qituvchi darsni qanday o'tyapti, o'quvchi e'tibori qayerda, kim telefon bilan band, kim darsga aloqasi yo'q suhbatda." },
      { at: 12.5, text: "Direktorda bu savollarga obyektiv javob yo'q. Faqat taxmin bor." },
    ],

    /* 5 — OTA-ONALAR */
    [
      { at: 0.0, text: "Uchinchi muammo — ota-onalar." },
      { at: 2.8, text: "Farzand maktabga kirdimi, qachon chiqdi, darsda bo'ldimi, hodisaga aralashdimi." },
      { at: 10.5, text: "Ota-ona buni kechqurun, faqat bolaning o'z gapidan biladi. Boshqa ishonchli manba yo'q." },
    ],

    /* 6 — QANDAY ISHLAYDI */
    [
      { at: 0.0, text: "Yechim mavjud kameraning ustiga qo'yiladi." },
      { at: 3.5, text: "Oqim kadrlarga bo'linadi, ko'rish modellari obyektni aniqlaydi, o'nlab kadr bitta hodisaga birlashadi." },
      { at: 12.5, text: "Hammasi muassasaning o'z serverida. Internet uzilsa ham to'xtamaydi, video tashqariga chiqmaydi." },
    ],

    /* 7 — DETEKTORLAR */
    [
      { at: 0.0, text: "Mana real kadrlar." },
      { at: 2.0, text: "Qurollangan shaxs aniqlandi. Chekish aniqlandi. Maktab hovlisida jang aniqlandi." },
      { at: 11.5, text: "Bular demo emas. Bular ishlab turgan tizimning haqiqiy qaydlari." },
    ],

    /* 8 — QUROL */
    [
      { at: 0.0, text: "Endi eng yuqori ustuvorlikdagi trevoga — qurol." },
      { at: 3.0, text: "Model hududga qurol bilan kirgan shaxsni shakli va konteksti bo'yicha kadrga tushishi bilanoq taniydi." },
      { at: 10.0, text: "Signal bir vaqtda navbatchi, direktor va kerak bo'lsa IIB inspektoriga boradi." },
    ],

    /* 9 — QOLDIRILGAN BUYUM */
    [
      { at: 0.0, text: "Keyingisi — qoldirilgan buyum." },
      { at: 2.5, text: "Sinfda sumka egasidan ajralib, oltmish soniyadan ortiq harakatsiz qolsa — trevoga beriladi." },
      { at: 9.0, text: "Shundan keyin tizim egasini qidiradi: sumka bilan oxirgi ko'ringan shaxsning kadri boshqa kameralardan izlanadi." },
      { at: 15.5, text: "Shu shaxs xonada, yo'lakda, chiqish eshigida va maktab hovlisida topiladi — uning yo'li kadrma-kadr ko'rinadi." },
      { at: 22.0, text: "Evakuatsiya qarori tez qabul qilinadi." },
    ],

    /* 10 — DAVOMAT */
    [
      { at: 0.0, text: "Davomat — tizimning eng kuchli tomonlaridan biri." },
      { at: 3.0, text: "Avval kirishdagi kamera har o'quvchini yuzidan taniydi: yigirma sakkiz o'quvchidan yigirma beshtasi yuz orqali o'tgan, uchtasi o'tmagan — ular maktabga kelmagan." },
      { at: 9.0, text: "Keyin sinf kamerasi xonadagilarni sanaydi: birinchi darsda yigirma besh o'quvchi o'tirgan." },
      { at: 15.5, text: "Oxirgi dars tugashida esa yigirma sakkiztadan faqat o'n yettitasi qolgan." },
      { at: 20.5, text: "Jami o'n bir o'quvchi darsda yo'q — tizim buni avtomatik hisoblab beradi." },
    ],

    /* 11 — DARS TAHLILI */
    [
      { at: 0.0, text: "Tizim darsni ham tahlil qiladi." },
      { at: 2.8, text: "Kamera o'qituvchining faolligini, o'quvchilarning e'tiborini va telefon bilan chalg'ishini ko'radi." },
      { at: 9.5, text: "Ovoz tahlili o'qituvchining gaplarini eshitadi va aytilgan har gap darsga oidmi yoki yo'qmi, shuni aniqlaydi." },
      { at: 17.0, text: "Kamera va ovoz birga o'qituvchining dars o'tishini baholaydi." },
      { at: 22.5, text: "Natijada o'qituvchining dars o'tish salohiyatiga baho beriladi va o'qituvchilar reytingi shakllanadi." },
    ],

    /* 12 — OTA-ONA ILOVASI */
    [
      { at: 0.0, text: "Ota-ona esa buni telefonida ko'radi." },
      { at: 3.0, text: "Farzandi kirgan va chiqqan vaqt, davomat foizi, bugungi darslar, va hodisa bo'lsa — kadr bilan bildirishnoma." },
      { at: 13.0, text: "Bu maktab bilan oila o'rtasidagi birinchi ishonchli aloqa." },
    ],

    /* 13 — 179-MAKTAB */
    [
      { at: 0.0, text: "Endi eng muhimi. Bu tizim hozir ishlab turibdi." },
      { at: 4.5, text: "Toshkentdagi bir yetmish to'qqizinchi maktabda janjal, chekish va davomat detektorlari faol." },
      { at: 13.5, text: "Ekranda ko'rgan kadrlaringiz o'sha maktabdan olingan." },
    ],

    /* 14 — NATIJALAR */
    [
      { at: 0.0, text: "Natija nima beradi?" },
      { at: 2.0, text: "Hodisa soniyalar ichida aniqlanadi, qo'lda hisobot yozish yo'qoladi, har bir holat kadr bilan hujjatlashtiriladi." },
      { at: 11.5, text: "Eng muhimi — muassasa direktori va mas'ul xodimlar real vaqtda xabardor bo'ladi." },
    ],

    /* 15 — BIZ NIMA BERAMIZ */
    [
      { at: 0.0, text: "Xo'sh, biz muassasaga nima beramiz?" },
      { at: 2.5, text: "Birinchi o'rinda — davomat. Yo'qlama face ID orqali, dars boshida ham, dars oxirida ham. Tizim xonadagi o'quvchilarni sanaydi va maktabga kelgan, lekin darsga kirmagan yoki darsdan chiqib ketganlarni avtomatik chiqaradi." },
      { at: 8.5, text: "Ikkinchi — o'qituvchilar reytingi: dars o'tish sifatiga qarab o'qituvchilar ketma-ket baholanadi." },
      { at: 15.0, text: "Uchinchi — xavfsizlik: qurol, janjal, chekish va qoldirilgan buyum real vaqtda aniqlanadi va mas'ulga yuboriladi." },
    ],

    /* 16 — YAKUN */
    [
      { at: 0.0, text: "Xulosa ikkita." },
      { at: 1.8, text: "Talabni davlat yaratdi va muddat ikki ming yigirma yettinchi yil. Mahsulot tayyor va maktabda ishlayapti." },
      { at: 11.0, text: "Savollaringizga javob berishga tayyormiz." },
    ],
  ],

  /* ──────────────────────────── slayd matnlari ─────────────────────────── */

  intro: {
    titleA: "Kameralar bor.",
    titleB: "Idrok yo'q.",
    sub: "Campus AI — ta'lim muassasalari uchun sun'iy intellekt asosidagi eko tizimi",
    stats: ["muassasa bozorda", "o'quvchi va talaba", "maktabda ishlab turibdi"],
  },

  purpose: {
    kicker: "Loyihaning maqsadi",
    title: "Qonun bilan uzviy bog'liq yechim",
    goals: [
      "Ta'lim muassasasini real vaqtda xavfsizroq qilish",
      "Direktorga dars sifati bo'yicha obyektiv ko'rsatkich berish",
      "Ota-onaga farzandi haqida ishonchli ma'lumot berish",
    ],
    decreeLabel: "Vazirlar Mahkamasi qarori",
    decreeDate: "2026-yil 31-iyul",
    decreeTitle: "Ta'lim muassasalari xavfsizligi tizimini takomillashtirish to'g'risida",
    requires: [
      "Kirishni nazorat qilish — identifikatsiya va elektron jurnal",
      "Videokuzatuv — perimetr, kirish, yo'lak, oshxona, maydon",
      "Xavfsizlik xonasi va favqulodda ogohlantirish tizimi",
      "Yozuvni kamida bir oy saqlash",
    ],
    signalTitle: "Qaror ikki xil signalni majburiy qildi",
    signalOne: "Qurolli hujum · shubhali shaxs · shubhali buyum",
    signalTwo: "Yong'in · avariya · tabiiy favqulodda holat",
    signalNote: "Birinchi signal — kompyuter ko'rish masalasi. Uni odam emas, model yechadi.",
    timelineTitle: "Joriy etish jadvali",
    timeline: [
      { year: "2026", text: "Qo'riqlov postlari tashkil etiladi" },
      { year: "2027", text: "Postlar jihozlanadi, videokameralar integratsiya qilinadi" },
    ],
    punch: "Qonun talabni yaratdi. Uni qondiradigan dasturiy qatlam bozorda hali yo'q.",
    source: "Manba: Vazirlar Mahkamasi qarori, 2026-yil 31-iyul · gazeta.uz, 2026-yil 3-avgust",
  },

  problem: {
    kicker: "Muammo · manzara",
    title: "Infratuzilma bor — lekin u faqat arxiv",
    segNames: ["Umumta'lim maktablari", "Kollej va texnikumlar", "Oliy ta'lim muassasalari"],
    segNotes: [
      "Eng katta segment, eng yosh auditoriya",
      "O'smirlar, intizom eng murakkab davr",
      "Katta hudud, ko'p kirish nuqtasi",
    ],
    pains: [
      {
        title: "Kamera yozadi, ko'rmaydi",
        text: "Eng tajribali navbatchi ham o'nlab ekranni bir vaqtda kuzata olmaydi.",
      },
      {
        title: "Hodisa qayd etilmaydi",
        text: "Og'zaki xabar, qo'lda hisobot, kech reaksiya. Statistika to'planmaydi.",
      },
      {
        title: "Qaror ma'lumotga asoslanmaydi",
        text: "Direktor ham, vazirlik ham taxmin bilan ishlaydi — o'lchov yo'q.",
      },
    ],
    verdict: "Muassasa uskunaga pul sarfladi, natijaga emas.",
  },

  threats: {
    kicker: "Muammo · xavfsizlik",
    title: "Hodisa bo'ladi — lekin uni real vaqtda aniqlab, mas'ulga yetkazadigan tizim yo'q",
    items: [
      { name: "Jang va zo'ravonlik", text: "Hovlida, yo'lakda, tanaffusda. Avj olgandan keyin bilinadi.", cost: "Jarohat · sud · obro'" },
      { name: "Qurolli shaxs", text: "Hududga qurol bilan kirgan odam. Sekundlar hal qiladi.", cost: "Hayot xavfi" },
      { name: "Chekish", text: "Hudud chetidagi burchaklar. Takrorlanadi, hujjatlashtirilmaydi.", cost: "Sog'liq · intizom" },
      { name: "Qoldirilgan buyum", text: "Sinfda yoki yo'lakda egasiz qolgan sumka. Uni hech kim payqamaydi.", cost: "Hayot xavfi · evakuatsiya" },
    ],
    unwatched: "mas'ulga yuborilmadi",
    verdict: "Qaror aynan shu hodisalarni aniqlashni talab qiladi — lekin uni bajaradigan dastur yo'q.",
  },

  quality: {
    kicker: "Muammo · dars sifati",
    title: "Direktorda obyektiv ko'rsatkich yo'q",
    items: [
      {
        title: "Dars qanday o'tyapti",
        text: "O'qituvchining faolligi, sinf bilan ishlashi, darsning tuzilishi — hech qayerda qayd etilmaydi.",
      },
      {
        title: "O'quvchi e'tibori",
        text: "Kim darsni tinglayapti, kim yo'q. Bahodan oldin buni ko'rish imkoni yo'q.",
      },
      {
        title: "Telefon bilan chalg'ish",
        text: "Dars davomida telefondan foydalanish — eng keng tarqalgan, eng kam qayd etiladigan holat.",
      },
      {
        title: "Darsga aloqasiz suhbat",
        text: "Sinfdagi begona suhbatlar darsning sifatini pasaytiradi, lekin o'lchanmaydi.",
      },
    ],
    verdict: "Ta'lim sifatini boshqarish uchun avval uni o'lchash kerak.",
  },

  parentsPain: {
    kicker: "Muammo · ota-onalar",
    title: "Oila farzandi haqida real vaqtda hech narsa bilmaydi",
    gaps: [
      { title: "Kirdimi, chiqdimi", text: "Maktabga yetib bordimi va qachon chiqdi — ishonchli tasdiq yo'q." },
      { title: "Darsda bo'ldimi", text: "Davomat qog'ozda, kechqurun, ba'zan umuman yetib bormaydi." },
      { title: "Hodisa bo'ldimi", text: "Janjal yoki chekish holati oilaga ko'pincha umuman aytilmaydi." },
    ],
    quote: "Ota-ona farzandi haqidagi ma'lumotni faqat bolaning o'z gapidan oladi.",
    verdict: "Maktab bilan oila o'rtasida ishonchli aloqa yo'q.",
  },

  howItWorks: {
    kicker: "Yechim",
    title: "Mavjud kamerani idrokli qiladigan dasturiy qatlam",
    steps: [
      { title: "Kadr olish", text: "Mavjud kamera oqimi. Yangi uskuna qo'shilmaydi." },
      { title: "Ko'rish modellari", text: "Obyekt, harakat va yuz vektori aniqlanadi." },
      { title: "Hodisalar tahlili", text: "O'nlab kadr bitta hodisaga birlashadi." },
      { title: "Darajalash", text: "Xavflilik darajasi beriladi, kim xabardor bo'lishi aniqlanadi." },
      { title: "Panel va ilova", text: "Direktor, xodim va ota-ona o'ziga tegishlisini ko'radi." },
    ],
    keysTitle: "Uchta qaror",
    keys: [
      "Muassasaning O'Z serverida — video tashqariga chiqmaydi",
      "Internetsiz ishlaydi — uzilish tizimni to'xtatmaydi",
      "Uskuna sotmaymiz — obuna sotamiz",
    ],
    note: "",
  },

  detectors: {
    kicker: "Yechim · detektorlar",
    title: "Bular demo emas — ishlab turgan tizimning qaydlari",
    cases: [
      { name: "Qurollangan shaxs", cam: "2-FAYE KUCHA", when: "10-10-2026 · 12:37", conf: "" },
      { name: "Chekish aniqlandi", cam: "Camera 01", when: "14-09-2026 · 12:15", conf: "0.52" },
      { name: "Janjal aniqlandi", cam: "IP PTZ Camera", when: "09-09-2026 · 18:58", conf: "yuqori" },
      { name: "Telefonda gaplashish", cam: "Camera 01", when: "20-10-2026 · 13:05", conf: "" },
    ],
    allTitle: "Tizim aniqlaydi",
    all: [
      "Janjal",
      "Qurollangan shaxs",
      "Pichoq va sovuq qurol",
      "Agressiv harakat",
      "Chekish",
      "Telefon",
      "Qoldirilgan buyum",
      "Xonadagi o'quvchilar sanog'i",
      "Davomat (yuz + xona)",
      "Dars sifati va ovoz tahlili",
    ],
    moreTitle: "Boshqa detektorlar",
    more: ["Yuz tanish", "Begona shaxs", "Yong'in va tutun", "Kechikish"],
    note: "Ishonch darajasi har bir kadrda hisoblanadi va hodisa kartasida saqlanadi.",
  },

  knife: {
    kicker: "Texnologiya",
    title: "Qurolni aniqlash",
    sub: "Eng yuqori ustuvorlikdagi trevoga — bir soniya ham kechikmaydi",
    live: "Jonli",
    cam: "2-FAYE KUCHA",
    when: "10.10.2026 · 12:37",
    alertTitle: "Qurollangan shaxs aniqlandi — 2-FAYE KUCHA",
    alertText: "Muassasa hududi · ustuvorlik: YUQORI · navbatchi va direktorga yuborildi",
    sections: [
      {
        title: "Qanday ishlaydi",
        text: "Obyekt aniqlash modeli (YOLO oilasi) kadrdagi qo'lda ushlangan xavfli predmetlarni — qurol, uzun metall buyum — shakli va konteksti bo'yicha tanib oladi. Model aynan ta'lim muassasasi sharoiti uchun — yo'lak, hovli, oshxona, sport zali — qayta sozlanadi.",
      },
      {
        title: "Natija",
        text: "Qurol ishlatilgunicha emas — kadrga tushishi bilanoq choralar ko'riladi.",
      },
      {
        title: "Ustuvorlik va mas'uliyat",
        text: "Signal bir vaqtda navbatchi, direktor va xavfsizlik xodimiga, kerak bo'lsa IIB inspektoriga yuboriladi. Har bir signal video kadr bilan keladi.",
      },
    ],
    footer: "Campus AI xavfsizlik yadrosi",
  },

  abandoned: {
    kicker: "Texnologiya",
    title: "Qoldirilgan buyumni aniqlash",
    sub: "Terrorizmga qarshi xalqaro standart chora",
    live: "Jonli",
    cam: "CAM 08 — 204-sinf xonasi",
    when: "20.10.2026 · 14:15:33",
    alertTitle: "Qoldirilgan buyum — CAM 08",
    alertText: "204-sinf xonasi · 60 soniyadan ortiq harakatsiz · xavfsizlik xodimiga yuborildi",
    search: {
      title: "Egasini qidirish",
      queryLabel: "Qidiruv kadri",
      scanning: "Arxiv kameralaridan qidirilmoqda…",
      found: "Topildi",
      archiveLabel: "Arxiv kadri · 204-sinf xonasi",
      ownerFound: "Sumka egasi topildi",
      steps: [
        { place: "Sinf xonasi", text: "Sumka bilan partada" },
        { place: "Yo'lak", text: "Yo'lakdan o'tmoqda" },
        { place: "Chiqish", text: "Binodan chiqib ketmoqda" },
        { place: "Maktab hovlisi", text: "Hovlidan kirib kelgan" },
      ],
      result: "Tizim shu shaxsni boshqa kameralardan topib, uning yo'lini kadrlar bilan ko'rsatadi.",
    },
    sections: [
      {
        title: "Qanday ishlaydi",
        text: "AI doimiy fon modelini yuritadi va kadrda yangi paydo bo'lgan statik obyektni — sumka, paket, quti — qayd qiladi. Agar obyekt egasidan ajralsa va belgilangan vaqt (masalan, 60 soniya) davomida harakatsiz qolsa — trevoga beriladi.",
      },
      {
        title: "Natija",
        text: "Tizim buyumni kim qoldirganini arxiv kadrida ko'rsatadi — evakuatsiya qarori tez qabul qilinadi.",
      },
      {
        title: "Qayerda muhim",
        text: "Asosiy kirish, yo'laklar, akt zali, oshxona, sport zali, sinf xonalari — olomon to'planadigan barcha joylar. Shubhali buyum uzoq vaqt e'tibordan chetda qolmaydi.",
      },
    ],
    footer: "Campus AI xavfsizlik yadrosi",
  },

  attendance: {
    kicker: "Yechim · davomat",
    title: "Davomat — to'liq real, ikki manbaning solishtirishi",
    sub: "Maktabda bor, lekin darsda yo'q o'quvchi — tizim buni o'zi topadi",
    flow: [
      { title: "Kirishda yuz orqali", text: "Kirishdagi kamera har o'quvchini yuzidan taniydi: 28 tadan 25 tasi yuz orqali o'tgan, 3 tasi o'tmagan — kelmagan.", tag: "Camera 01 · kirish" },
      { title: "Birinchi dars", text: "Sinf kamerasi xonadagi o'quvchilarni sanaydi: 28 tadan 25 tasi o'tirgan.", tag: "Sinf kamerasi" },
      { title: "Oxirgi dars tugashida", text: "Xuddi shu sinfda 28 tadan atigi 17 tasi qolgan.", tag: "Sinf kamerasi" },
    ],
    resultLabel: "o'quvchi darsdan yo'qolgan",
    alertTitle: "Sinf davomati ogohlantirishi",
    alertText: "Birinchi darsda 28 tadan 25 tasi o'tirgan edi, oxirgi dars tugashida 17 tasi qoldi. Jami 11 o'quvchi darsda yo'q: 3 tasi kelmagan, 8 tasi chiqib ketgan. Tizim buni avtomatik hisoblaydi.",
    points: [
      "Xonadagi o'quvchilar soni real vaqtda hisoblanadi",
      "Yuz orqali o'tganlar bilan darsdagilar avtomatik solishtiriladi",
      "Necha o'quvchi darsda emasligi avtomatik hisoblanadi",
      "Qog'oz jurnal va qo'lda belgilash kerak emas",
    ],
    note: "Kadrlar real sinf kamerasidan, 20.10.2026. 11 = 28 − 17: 3 tasi kirishda yuz orqali o'tmagan (kelmagan), 8 tasi kun davomida chiqib ketgan.",
  },

  lesson: {
    kicker: "Yechim · dars tahlili",
    title: "Xavfsizlikdan tashqari — ta'lim sifati",
    teacherTitle: "O'qituvchi kesimida",
    teacher: [
      "Dars davomidagi faollik va harakat dinamikasi",
      "Sinf bilan ishlash vaqti va darsning tuzilishi",
      "Davomiylik va dars boshlanish intizomi",
      "Dars jarayonini ovoz bo'yicha tahlil qilish",
    ],
    studentTitle: "O'quvchi kesimida",
    student: [
      "Darsdagi e'tibor darajasi",
      "Telefon bilan chalg'ish holatlari",
      "Agressiv harakat va darsga aloqasi bo'lmagan suhbatlar",
      "Kayfiyat va holat dinamikasi",
    ],
    faceTitle: "Yuz bo'yicha tanish",
    faceText: "Davomat avtomatik yoziladi: kirish, chiqish, kechikish. Qog'oz jurnal kerak emas.",
    frameNote: "Dars vaqtida telefon aniqlandi · Camera 01",
    note: "E'tibor ko'rsatkichi va dars bahosi — hisoblangan qiymat, sensor o'lchovi emas. Ovoz tahlili va reyting misoli namunaviy. Buni ochiq aytamiz.",
    rank: {
      title: "O'qituvchilar reytingi",
      rows: [
        { name: "Rahimova N.", value: 91 },
        { name: "Yusupov A.", value: 84 },
        { name: "Karimova D.", value: 79 },
      ],
    },
    card: { role: "O'qituvchi", name: "Karimova Dilnoza", subject: "Ingliz tili · 5-B sinf", scoreLabel: "Umumiy ball" },
    camTitle: "Kamera tahlili",
    camChips: ["O'qituvchi faol", "Sinf e'tibori", "Telefon aniqlandi"],
    voice: {
      title: "Ovoz tahlili",
      status: "Dars ovozi tahlil qilinmoqda",
      lines: [
        { who: "O'qituvchi", text: "Bugun biz hozirgi zamon sifatlarini takrorlaymiz.", onTopic: true },
        { who: "Sinfdan", text: "Kecha futbol ko'rdingmi?", onTopic: false },
        { who: "O'qituvchi", text: "Keling, misolni birgalikda yechib ko'ramiz.", onTopic: true },
      ],
      onLabel: "Darsga oid",
      offLabel: "Darsga oid emas",
      scoreTitle: "Dars o'tishi bahosi",
      scores: [
        { label: "Mavzuga muvofiqlik", value: 86 },
        { label: "Tushuntirish va savol-javob", value: 78 },
        { label: "Sinf e'tibori", value: 72 },
      ],
      verdict: "Dars o'tish sifati baholandi",
    },
  },

  parentsApp: {
    kicker: "Yechim · ota-onalar",
    title: "Oila birinchi marta real vaqtda xabardor",
    shots: ["Bosh sahifa va davomat", "Hodisa bildirishnomasi", "Hodisa kartasi — kadr bilan"],
    items: [
      { title: "Kirish va chiqish vaqti", text: "Farzand qachon keldi va qachon ketdi — kamera tasdig'i bilan." },
      { title: "Davomat foizi", text: "Oylik ko'rsatkich: kelgan, kechikkan, kelmagan kunlar." },
      { title: "Hodisa bildirishnomasi", text: "Janjal, chekish yoki kechikish — kadr va vaqt bilan darhol." },
      { title: "Bugungi darslar", text: "Jadval, o'qituvchi va xona — bir ekranda." },
    ],
    note: "Bir nechta farzand bitta hisobga ulanadi.",
  },

  live: {
    kicker: "Real natija",
    title: "Tizim hozir ishlab turibdi",
    badge: "Jonli",
    sameDay: "Uchala kadr — bir kunda",
    frames: [
      { label: "Chekish", cam: "Camera 01", when: "14-09 · 12:19" },
      { label: "Janjal", cam: "Camera 01", when: "14-09 · 14:22" },
      { label: "Kirish nazorati", cam: "Camera 01", when: "14-09 · 14:52" },
    ],
    events: [
      { type: "Chekish", when: "14 Sentabr, 12:15", cam: "Camera 01", conf: "52%" },
      { type: "Janjal", when: "9 Sentabr, 18:58", cam: "IP PTZ Camera", conf: "yuqori" },
      { type: "Kechikish", when: "11 Sentabr, 10:44", cam: "Camera 01", conf: "100%" },
    ],
    factsTitle: "Faol detektorlar",
    facts: [
      { label: "Muassasa", value: "179-maktab, Toshkent" },
      { label: "Rejim", value: "Kunduzi, uzluksiz" },
      { label: "Ota-ona ilovasi", value: "Ishga tushirilgan" },
      { label: "Server", value: "Muassasa ichida" },
    ],
    note: "Yuqoridagi kadrlar va bildirishnomalar aynan shu maktabdan olingan.",
  },

  results: {
    kicker: "Natija",
    title: "Nima beradi",
    gains: [
      { num: "soniyalar", label: "Hodisani aniqlash", note: "Ilgari — yozuvni keyin ko'rish" },
      { num: "avtomatik", label: "Hodisa hujjati", note: "Kadr, video, vaqt, joy" },
      { num: "real vaqt", label: "Direktor va mas'ul xodimlar xabardorligi", note: "Ilgari — kech, og'zaki" },
      { num: "0", label: "Yangi kamera", note: "Mavjud uskuna ishlatiladi" },
    ],
    verdict: "Muassasa allaqachon to'lagan uskuna birinchi marta natija bera boshladi.",
    note: "",
  },

  offer: {
    kicker: "Biz nima beramiz",
    title: "Uchta asosiy qiymat",
    items: [
      {
        title: "Davomat",
        points: [
          "Face ID yo'qlamasi: dars boshida va dars oxirida",
          "Xonadagi o'quvchilar soni har darsda sanaladi",
          "Maktabga kelgan, lekin darsga kirmagan yoki chiqib ketganlar avtomatik chiqadi",
          "Qog'oz jurnal kerak emas",
        ],
      },
      { title: "Reyting", points: [] },
      {
        title: "Xavfsizlik",
        points: [
          "Qurol, janjal, chekish, qoldirilgan buyum",
          "Real vaqtda aniqlash",
          "Direktor va mas'ul xodimga darhol xabar",
        ],
      },
    ],
    stats: { start: "Dars boshida xonada", end: "Dars oxirida xonada", gone: "Kelgan, lekin darsda yo'q" },
    rank: {
      caption: "O'qituvchilar reytingi",
      rows: [
        { name: "Rahimova N.", subject: "Matematika", value: 91 },
        { name: "Yusupov A.", subject: "Fizika", value: 84 },
        { name: "Karimova D.", subject: "Ingliz tili", value: 79 },
        { name: "Saidov B.", subject: "Tarix", value: 73 },
      ],
    },
    note: "Reyting misoli namunaviy. Hammasi muassasaning o'z serverida, mavjud kameralar ustida ishlaydi.",
  },

  finale: {
    titleA: "Talabni davlat yaratdi.",
    titleB: "Mahsulot ishlab turibdi.",
    sub: "Campus AI — ta'lim muassasalari uchun video-kuzatuv va monitoring eko tizimi",
    points: [
      "Qonun majburiyati — muddati 2027-yil",
      "Mahsulot tayyor va 179-maktabda ishlayapti",
    ],
    ctaTalk: "Bog'lanish",
    ctaSite: "Sayt",
    foot: "Campus AI · ta'lim muassasalari uchun sun'iy intellekt",
  },
};
