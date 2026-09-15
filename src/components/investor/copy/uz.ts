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
      "Dars tahlili",
      "Ota-ona ilovasi",
      "179-maktab",
      "Natijalar",
      "Bozor hajmi",
      "Raqobat",
      "Daromad va foyda",
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
      { at: 2.5, text: "Maktab hovlisidagi jang, hududga kirgan qurolli shaxs, o'quvchining chekishi, yong'inning boshlanishi." },
      { at: 11.5, text: "Bularning hammasi kameraga tushadi, lekin hech kim real vaqtda ko'rmaydi." },
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
      { at: 2.0, text: "Qurol aniqlandi — ishonch to'qson bir foiz. Chekish aniqlandi. Maktab hovlisida jang aniqlandi." },
      { at: 11.5, text: "Bular demo emas. Bular ishlab turgan tizimning haqiqiy qaydlari." },
    ],

    /* 8 — DARS TAHLILI */
    [
      { at: 0.0, text: "Tizim darsni ham tahlil qiladi." },
      { at: 3.0, text: "O'qituvchining dars o'tish faolligi, o'quvchining e'tibori va chalg'ishi — telefon, begona suhbat." },
      { at: 12.0, text: "Davomat esa yuz bo'yicha avtomatik yoziladi. Qog'oz jurnal kerak emas." },
    ],

    /* 9 — OTA-ONA ILOVASI */
    [
      { at: 0.0, text: "Ota-ona esa buni telefonida ko'radi." },
      { at: 3.0, text: "Farzandi kirgan va chiqqan vaqt, davomat foizi, bugungi darslar, va hodisa bo'lsa — kadr bilan bildirishnoma." },
      { at: 13.0, text: "Bu maktab bilan oila o'rtasidagi birinchi ishonchli aloqa." },
    ],

    /* 10 — 179-MAKTAB */
    [
      { at: 0.0, text: "Endi eng muhimi. Bu tizim hozir ishlab turibdi." },
      { at: 4.5, text: "Toshkentdagi bir yetmish to'qqizinchi maktabda janjal, qurol, chekish va davomat detektorlari faol." },
      { at: 13.5, text: "Ekranda ko'rgan kadrlaringiz o'sha maktabdan olingan." },
    ],

    /* 11 — NATIJALAR */
    [
      { at: 0.0, text: "Natija nima berdi?" },
      { at: 2.0, text: "Hodisa soniyalar ichida aniqlanadi, qo'lda hisobot yozish yo'qoladi, har bir holat kadr bilan hujjatlashtiriladi." },
      { at: 11.5, text: "Eng muhimi — ota-ona birinchi marta real vaqtda xabardor bo'ladi." },
    ],

    /* 12 — BOZOR HAJMI */
    [
      { at: 0.0, text: "Bozorga o'tamiz." },
      { at: 1.8, text: "To'liq qamrovda O'zbekiston ta'lim tizimi yiliga yetti yuz yigirma besh milliard so'mlik bozor beradi." },
      { at: 10.5, text: "Bu oltmish bir million dollar. Hisob muassasa va o'quvchi sonidan chiqarilgan." },
    ],

    /* 13 — RAQOBAT */
    [
      { at: 0.0, text: "Raqobatchilar bor, lekin ular boshqa maydonda." },
      { at: 4.0, text: "Global platformalar o'n barobar qimmat va bulutda ishlaydi. Uskuna vendorlarida ta'lim stsenariysi yo'q." },
      { at: 13.0, text: "Mahalliy serverda, o'zbek tilida, ta'limga ixtisoslashgan yechim faqat bizda." },
    ],

    /* 14 — DAROMAD VA FOYDA */
    [
      { at: 0.0, text: "Endi eng qiziq savol: qancha foyda?" },
      { at: 3.0, text: "Nolga chiqish nuqtasi bozorning bir foizidan ham past. Bu atigi to'qson muassasa." },
      { at: 10.5, text: "Besh foiz qamrovda yillik daromad qirq besh milliard, sof foyda esa o'n yetti milliard so'mdan ortiq." },
    ],

    /* 15 — YAKUN */
    [
      { at: 0.0, text: "Xulosa uchta." },
      { at: 1.8, text: "Talabni davlat yaratdi va muddat ikki ming yigirma yettinchi yil. Mahsulot tayyor va maktabda ishlayapti." },
      { at: 11.0, text: "Bozor bo'sh. Savollaringizga javob berishga tayyormiz." },
    ],
  ],

  /* ──────────────────────────── slayd matnlari ─────────────────────────── */

  intro: {
    titleA: "Kameralar bor.",
    titleB: "Idrok yo'q.",
    sub: "Campus AI — ta'lim muassasalari uchun sun'iy intellekt asosidagi eko tizimi",
    stats: ["muassasa bozorda", "o'quvchi va talaba", "yillik bozor hajmi", "maktabda ishlab turibdi"],
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
    title: "Hodisa bo'ladi — lekin uni hech kim real vaqtda ko'rmaydi",
    items: [
      { name: "Jang va zo'ravonlik", text: "Hovlida, yo'lakda, tanaffusda. Avj olgandan keyin bilinadi.", cost: "Jarohat · sud · obro'" },
      { name: "Qurolli shaxs", text: "Hududga qurol bilan kirgan odam. Sekundlar hal qiladi.", cost: "Hayot xavfi" },
      { name: "Chekish", text: "Hudud chetidagi burchaklar. Takrorlanadi, hujjatlashtirilmaydi.", cost: "Sog'liq · intizom" },
      { name: "Yong'in", text: "Tutun va olovning boshlanishi. Datchik ishlaguncha vaqt ketadi.", cost: "Mol-mulk · evakuatsiya" },
    ],
    unwatched: "hech kim ko'rmadi",
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
    note: "Mahsulotning to'liq ishlashi alohida taqdimotda: /taqdimot",
  },

  detectors: {
    kicker: "Yechim · detektorlar",
    title: "Bular demo emas — ishlab turgan tizimning qaydlari",
    cases: [
      { name: "Qurol aniqlandi", cam: "Moon darvoza", when: "15-09-2026 · 11:30", conf: "0.91" },
      { name: "Chekish aniqlandi", cam: "Camera 01", when: "14-09-2026 · 12:15", conf: "0.52" },
      { name: "Janjal aniqlandi", cam: "IP PTZ Camera", when: "09-09-2026 · 18:58", conf: "yuqori" },
    ],
    moreTitle: "Boshqa detektorlar",
    more: ["Yuz tanish", "Begona shaxs", "Yong'in va tutun", "Telefon bilan chalg'ish", "Odamlar sanog'i", "Kechikish"],
    note: "Ishonch darajasi har bir kadrda hisoblanadi va hodisa kartasida saqlanadi.",
  },

  lesson: {
    kicker: "Yechim · dars tahlili",
    title: "Xavfsizlikdan tashqari — ta'lim sifati",
    teacherTitle: "O'qituvchi kesimida",
    teacher: [
      "Dars davomidagi faollik va harakat dinamikasi",
      "Sinf bilan ishlash vaqti va darsning tuzilishi",
      "Davomiylik va dars boshlanish intizomi",
    ],
    studentTitle: "O'quvchi kesimida",
    student: [
      "Darsdagi e'tibor darajasi",
      "Telefon bilan chalg'ish holatlari",
      "Darsga aloqasi bo'lmagan suhbatlar",
      "Kayfiyat va holat dinamikasi",
    ],
    faceTitle: "Yuz bo'yicha tanish",
    faceText: "Davomat avtomatik yoziladi: kirish, chiqish, kechikish. Qog'oz jurnal kerak emas.",
    frameNote: "Dars vaqtida telefon aniqlandi · Camera 01",
    note: "E'tibor ko'rsatkichi — hisoblangan qiymat, sensor o'lchovi emas. Buni ochiq aytamiz.",
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
      { type: "Qurol", when: "15 Sentabr, 11:30", cam: "Moon darvoza", conf: "0.91" },
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
    kicker: "Real natija",
    title: "Nima o'zgardi",
    gains: [
      { num: "soniyalar", label: "Hodisani aniqlash", note: "Ilgari — yozuvni keyin ko'rish" },
      { num: "avtomatik", label: "Hodisa hujjati", note: "Kadr, video, vaqt, joy" },
      { num: "real vaqt", label: "Ota-ona xabardorligi", note: "Ilgari — kechqurun, og'zaki" },
      { num: "0", label: "Yangi kamera", note: "Mavjud uskuna ishlatiladi" },
    ],
    verdict: "Muassasa allaqachon to'lagan uskuna birinchi marta natija bera boshladi.",
    note: "⚠️ Bu slayd kengaytirilishi kerak: pilot muddati, aniqlangan hodisalar soni va aniqlik foizi haqiqiy panel ma'lumoti bilan to'ldirilsin.",
  },

  market: {
    kicker: "Bozor hajmi",
    title: "Pastdan yuqoriga hisob — muassasa va o'quvchi soni bo'yicha",
    tamLabel: "Butun ta'lim tizimi, to'liq qamrovda",
    tamNote: "Yillik takrorlanuvchi daromad",
    segNames: ["Umumta'lim maktablari", "Kollej va texnikumlar", "Oliy ta'lim muassasalari"],
    segCols: { inst: "muassasa", students: "o'quvchi", price: "tarif / oyiga", monthly: "to'liq qamrovda / oy" },
    source: "Muassasa va o'quvchi soni — Statistika qo'mitasi, 2025/2026 o'quv yili. Tarif va daromad — model bo'yicha hisob.",
  },

  rivals: {
    kicker: "Raqobat",
    title: "Ular boshqa maydonda o'ynaydi",
    us: "Campus AI",
    list: [
      { name: "Global platformalar", note: "Verkada, Avigilon" },
      { name: "Uskuna vendorlari", note: "Hikvision, Dahua" },
      { name: "Mahalliy integratorlar", note: "SKUD, CCTV" },
    ],
    rows: [
      "Muassasa serverida (on-prem)",
      "Internetsiz ishlaydi",
      "O'zbek tilida interfeys va ovoz",
      "Ta'limga ixtisoslashgan detektorlar",
      "Dars va o'quvchi e'tibori tahlili",
      "Ota-onalar ilovasi",
      "2026-yil qaroriga moslik",
      "Mavjud kameraga ulanadi",
      "O'quvchiga hisoblangan tarif",
    ],
    legend: { yes: "bor", partial: "qisman", no: "yo'q" },
    edgeTitle: "Uchta hal qiluvchi ustunlik",
    edges: [
      "Narx toifasi 10× past — global platformalar bitta kamera uchun yiliga 199–1 799 $ litsenziya oladi",
      "Mahalliy ma'lumotda o'qitilgan modellar va o'zbek tili",
      "Qaror talab qilgan hisobotni tayyor holda beradi",
    ],
    note: "Raqobatchilar imkoniyatlari ochiq manbalar asosida baholangan.",
  },

  profit: {
    kicker: "Daromad va foyda",
    title: "Bozorning bir foizida ham foyda bor",
    cols: { share: "Qamrov", inst: "Muassasa", revenue: "Yillik daromad", profit: "Sof foyda", margin: "Marja" },
    highlight: "Bir foiz qamrov — bu atigi yuzga yaqin muassasa.",
    breakevenLabel: "Nolga chiqish nuqtasi",
    unitTitle: "Bitta mijoz",
    unitLabels: {
      arpu: "O'rtacha oylik to'lov",
      margin: "Yalpi marja",
      payback: "Qoplanish",
      ltv: "LTV / CAC",
    },
    note: "Xarajat uch qismdan: doimiy jamoa, har muassasaga qo'shiladigan xizmat va daromadga proporsional sotuv. Model bo'yicha hisob.",
  },

  finale: {
    titleA: "Talabni davlat yaratdi.",
    titleB: "Mahsulot ishlab turibdi.",
    sub: "Campus AI — ta'lim muassasalari uchun video-kuzatuv va monitoring eko tizimi",
    points: [
      "Qonun majburiyati — muddati 2027-yil",
      "Mahsulot tayyor va 179-maktabda ishlayapti",
      "Ta'limga ixtisoslashgan mahalliy raqobatchi yo'q",
    ],
    ctaTalk: "Bog'lanish",
    ctaDeck: "Mahsulot taqdimoti",
    ctaSite: "Sayt",
    foot: "Bozor raqamlari — Statistika qo'mitasi · daromad hisobi — model bo'yicha",
  },
};
