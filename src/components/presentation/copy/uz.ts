import type { ShowCopy } from "./types";

/**
 * TAQDIMOT MATNI — O'ZBEKCHA.
 *
 * OVOZ — TAQDIMOTCHI OVOZI: mahsulot BIZNING nomimizdan tanishtiriladi,
 * tizim uchinchi shaxsda tilga olinadi ("tizim aniqlaydi", "eko tizim
 * ko'rsatadi"). AI o'zi haqida gapirmaydi.
 *
 * ⚠️ OPERATOR YO'Q. Mahsulotda operator roli mavjud emas — hamma narsa
 * avtomatik. Kerakli joyda "mas'ul xodim", takroriy holatlarda esa
 * profilaktika inspektori, Milliy gvardiya va ichki ishlar organi tilga
 * olinadi.
 *
 * `narration` dagi `at` — REJALASHTIRILGAN vaqtlar. Ovoz fayllari
 * generatsiya qilinganda (`tools/build-narration.py`) ular o'lchangan
 * haqiqiy vaqtlarga almashadi (`narrationAudio.ts`), ya'ni bu yerdagi
 * sonlar faqat ovozsiz rejim uchun zaxira.
 */
export const UZ: ShowCopy = {
  lang: "uz",
  langLabel: "O'zbekcha",

  gate: {
    sub: "Ta'lim muassasalari uchun video-kuzatuv va monitoring eko tizimi",
    start: "Taqdimotni boshlash",
    note: "Ovoz bilan · to'liq ekranda tomosha qiling",
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
      "Muammo",
      "Qanday ishlaydi",
      "AI detektorlari",
      "Tezkor javob",
      "Tahdid zanjiri",
      "Davomat",
      "O'quvchi holati",
      "O'qituvchi va dars",
      "Ota-onalar ilovasi",
      "Nazorat paneli",
      "Qamrov va 3D kampus",
      "Xavfsizlik",
      "Afzalliklar",
      "Bozor va narx",
      "Yakun",
    ],
  },

  roadmap: "Keyingi bosqich",
  derived: "Hisoblangan ko'rsatkich",

  narration: [
    /* 0 — KIRISH */
    [
      { at: 0.0, text: "Assalomu alaykum." },
      { at: 2.0, text: "Sizga Campus AI eko tizimini tanishtiramiz. Bu — ta'lim muassasalari uchun sun'iy intellekt asosidagi xavfsizlik va monitoring yechimi." },
      { at: 9.5, text: "Bugun uning bir kunlik ishini boshidan oxirigacha ko'rsatamiz." },
    ],

    /* 1 — MUAMMO */
    [
      { at: 0.0, text: "Muassasangizda kameralar allaqachon bor." },
      { at: 3.4, text: "Lekin ular faqat yozadi. Yozuvni esa hodisa sodir bo'lgandan keyin ko'rasiz." },
      { at: 9.0, text: "Eng tajribali navbatchi ham bir vaqtda o'nlab ekranni kuzata olmaydi." },
      { at: 13.6, text: "Campus AI esa har bir kadrni, har soniyada ko'radi." },
    ],

    /* 2 — ICHKARIDA NIMA BO'LADI (mexanizm) */
    [
      { at: 0.0, text: "Endi eng muhim savol: tizim aynan qanday ishlaydi?" },
      { at: 4.0, text: "Birinchi bosqich. Mavjud kameraning oqimi kuzatuv postiga keladi. Yangi uskuna qo'shilmaydi." },
      { at: 10.5, text: "Ikkinchi bosqich. Oqim kadrlarga bo'linadi. Model videoni emas, aynan kadrni ko'radi." },
      { at: 16.5, text: "Uchinchi bosqich. Kompyuter ko'rish modeli kadrdagi har bir obyektga ramka va ishonch darajasini beradi." },
      { at: 23.5, text: "To'rtinchi bosqich. Bir odam kadrdan kadrga bitta raqam bilan kuzatiladi. Yuz vektori esa muassasa bazasidagi vektorlar bilan solishtiriladi." },
      { at: 32.0, text: "Beshinchi bosqich. Ishonch chegarasi, zona va vaqt bo'yicha saralash. Bitta o'tishdagi o'nlab kadr bitta hodisaga birlashadi." },
      { at: 40.0, text: "Oltinchi bosqich. Hodisa avtomatik qayd etiladi: panelda, ovozli signalda va ota-ona ilovasida paydo bo'ladi. Xavflilik darajasiga qarab mas'ul xodimga yoki tashqi xizmatlarga yo'naltiriladi." },
      { at: 47.5, text: "Va bularning hammasi muassasaning o'z serverida bajariladi." },
    ],

    /* 3 — DETEKTORLAR */
    [
      { at: 0.0, text: "Eko tizim nimalarni aniqlay oladi?" },
      { at: 3.4, text: "Yuz tanish. Tanilgan va notanish shaxslar." },
      { at: 8.5, text: "Qurol. Kadrda qurol paydo bo'lishi bilan trevoga." },
      { at: 14.0, text: "Jang va zo'ravonlik. Mushtlashuv avj olmasdan oldin ushlanadi." },
      { at: 20.0, text: "Chekish. Muassasa hududidagi qoidabuzarlik qayd etiladi." },
      { at: 25.0, text: "Telefonda gaplashish. Dars vaqtidagi intizom nazorati." },
      { at: 30.0, text: "Begona shaxs. Bazada yo'q odam hududga kirsa, tizim darhol xabar beradi." },
      { at: 35.0, text: "Va odamlar sanog'i. Belgilangan chiziqdan kim kirdi, kim chiqdi." },
    ],

    /* 4 — TEZKOR JAVOB */
    [
      { at: 0.0, text: "Hodisa yuz berdi. Endi vaqtni sanang." },
      { at: 3.4, text: "Bir soniyadan kamida model uni aniqlaydi va ishonch darajasini hisoblaydi." },
      { at: 8.6, text: "Ikkinchi soniyada u nazorat ekranida. Kadr, kamera va joyi bilan." },
      { at: 13.4, text: "O'n ikkinchi soniyada mas'ul xodim xabardor." },
      { at: 17.0, text: "Hodisa kartasi avtomatik shakllanadi: kadr, video, vaqt va joy. U mas'ul xodimga yuboriladi va arxivda saqlanadi." },
    ],

    /* 5 — TAHDID ZANJIRI (jang + qurol) */
    [
      { at: 0.0, text: "Endi eng muhim ikki stsenariyni batafsil ko'rib chiqamiz. Jang va qurol." },
      { at: 6.0, text: "Jang. Model ikki yoki undan ortiq shaxs o'rtasidagi keskin harakatni poza va harakat tezligi bo'yicha aniqlaydi." },
      { at: 14.0, text: "Kadr va hodisa videosi avtomatik saqlanadi. Panelda yuqori darajali trevoga, navbatchi ekranida ovozli signal." },
      { at: 22.0, text: "Xavfsizlik xodimiga bildirishnoma va xaritada kamera nuqtasi boradi. Tanilgan o'quvchining ota-onasiga ham xabar yuboriladi." },
      { at: 31.0, text: "Hodisa avtomatik jurnalga tushadi va shaxs tarixiga biriktiriladi. Takroriy janglar qaysi joyda va qaysi vaqtda bo'layotgani statistikada ko'rinadi. Holat takrorlansa, profilaktika inspektoriga yo'llanma shakllanadi." },
      { at: 44.0, text: "Qurol stsenariysi boshqacha. Bu yerda tasdiqlash kutilmaydi." },
      { at: 49.0, text: "Model kadrda qurolga o'xshash obyektni topishi bilan daraja darhol kritik bo'ladi. Sirena, barcha nazorat ekranlarida to'liq ekranli trevoga va kamera oqimining avtomatik ochilishi." },
      { at: 61.0, text: "Rahbariyat va mas'ul xodim bir vaqtda xabardor qilinadi. Tayyor hodisa kartasi — kadr, video, vaqt va joy — Milliy gvardiya va ichki ishlar organiga avtomatik yuboriladi." },
      { at: 72.0, text: "Signal noto'g'ri bo'lsa, mas'ul xodim uni belgilab qo'yadi va model chegarasi shu kamera uchun avtomatik sozlanadi." },
    ],

    /* 6 — DAVOMAT */
    [
      { at: 0.0, text: "Xavfsizlik — ishning faqat yarmi." },
      { at: 3.2, text: "O'quvchi eshikdan kirishi bilan tizim yuzini taniydi va davomatni o'zi yozadi." },
      { at: 9.0, text: "Vaqtida kelgan, kechikkan va kelmagan. Kunlik jadval o'zi quriladi." },
      { at: 14.2, text: "Qog'oz jurnal ham, navbatchi ham kerak emas. Kechikish chegarasini muassasa o'zi belgilaydi." },
    ],

    /* 7 — O'QUVCHI HOLATI */
    [
      { at: 0.0, text: "Davomat — bu faqat kelgan yoki kelmagan degani emas." },
      { at: 4.5, text: "Har bir tanishda kamera yuz ifodasini ham qayd etadi. Ijobiy, neytral yoki salbiy. Shundan kun davomidagi kayfiyat egri chizig'i quriladi." },
      { at: 14.5, text: "Dars kesimida e'tibor ko'rsatkichi hisoblanadi. Buni ochiq aytamiz: bu o'lchov emas, kayfiyat qaydlaridan chiqarilgan hisob. Tizimda diqqatni o'lchaydigan sensor yo'q." },
      { at: 26.0, text: "Agar yorliqda g'azab qayd etilsa yoki qisqa oraliqda ketma-ket salbiy kayfiyat kuzatilsa, tizim agressiya belgisini qo'yadi va sababini yozadi." },
      { at: 36.0, text: "Bola ustidan bosim bormi degan savolga tizim tashxis qo'ymaydi. U faqat belgilarni yig'adi: takroriy salbiy kayfiyat, jang hodisalarida ishtirok, davomatning keskin buzilishi, yolg'iz qolish vaqtining ortishi." },
      { at: 50.0, text: "Bu belgilar sinf rahbari va psixologga yo'naltiriladi. Qaror har doim odamda qoladi." },
    ],

    /* 8 — O'QITUVCHI VA DARS SIFATI */
    [
      { at: 0.0, text: "Muassasa rahbari uchun alohida bo'lim. O'qituvchi va xodimlar nazorati." },
      { at: 5.5, text: "Xodimlarning kelib-ketishi xuddi o'quvchiniki kabi yuz tanish orqali yoziladi. Kim darsga vaqtida kirdi, kim kirmadi — jadvalda ko'rinadi." },
      { at: 14.5, text: "Dars davomida sinfning umumiy kayfiyati va e'tibor ko'rsatkichi qayd etiladi. Qaysi darsda o'quvchilar diqqat bilan, qaysi darsda bee'tiborlik qilgani solishtiriladi." },
      { at: 25.0, text: "Keyingi bosqichda o'qituvchi nutqini tahlil qilish moduli qo'shiladi. Nutq matnga o'giriladi va dars sifati baholanadi: gapirish ulushi, savol berish chastotasi, sukunat oralig'i, mavzudan chetga chiqish." },
      { at: 39.0, text: "Natijada rahbar quruq ball emas, aniq tavsiya oladi. Masalan: uchinchi darsda e'tibor pasaygan, savol-javob ulushini oshirish tavsiya etiladi." },
      { at: 50.0, text: "Maqsad — nazorat qilish emas, o'qituvchiga o'z darsini tashqaridan ko'rsatish." },
    ],

    /* 9 — OTA-ONALAR ILOVASI */
    [
      { at: 0.0, text: "Maktab eko tizim bilan panelda ishlaydi. Ota-ona esa — telefonida." },
      { at: 5.5, text: "Farzand eshikdan o'tishi bilan kirish va chiqish vaqti ilovada paydo bo'ladi. Qaysi kamera va necha soat ichkarida bo'lgani bilan." },
      { at: 13.5, text: "Oylik davomat darajasi, bugungi darslar, o'qituvchi va xona raqami — bitta ekranda." },
      { at: 20.0, text: "Kun davomidagi kayfiyat va dars kesimidagi e'tibor ham shu yerda. Qaysi fanda bola faolroq, qaysi fanda so'ngani ota-onaga ko'rinadi." },
      { at: 29.0, text: "Chekish, jang yoki kechikish aniqlansa, xabar darhol keladi. Kamera tasviri, aniqlik darajasi, vaqt va joy bilan." },
      { at: 38.0, text: "Bir nechta farzand bo'lsa, hammasi bitta hisobda turadi." },
    ],

    /* 10 — NAZORAT PANELI */
    [
      { at: 0.0, text: "Butun nazorat — bitta panelda." },
      { at: 2.8, text: "Boshqaruv paneli: bugungi davomat, jonli xarita, oxirgi kirishlar." },
      { at: 7.6, text: "Ogohlantirishlar. Faqat tasdiqlanmagan hodisalar navbati." },
      { at: 11.8, text: "Aniqlanganlar. Butun arxiv: kadr, video va shaxs tarixi." },
      { at: 16.4, text: "Kameralar, statistika, hisobotlar va sozlamalar. Hammasi shu yerda." },
      { at: 21.0, text: "Uch tilda: o'zbek, rus va ingliz." },
    ],

    /* 11 — QAMROV */
    [
      { at: 0.0, text: "Eko tizim bitta binoda emas, butun respublikada ishlashga mo'ljallangan." },
      { at: 5.0, text: "Va u ta'limning barcha bosqichini qamrab oladi: maktabgacha ta'lim, maktab, kollej va texnikum, hamda oliy ta'lim." },
      { at: 14.0, text: "O'n to'rt hudud, minglab kamera nuqtasi — yagona jonli xaritada. Har bir kamera aniq joyi va ko'rish yo'nalishi bilan turadi." },
      { at: 24.0, text: "Trevoga o'zi kelgan kamera ustida yonadi. Kampus esa uch o'lchamda, qavatma-qavat ko'rsatiladi." },
    ],

    /* 12 — XAVFSIZLIK */
    [
      { at: 0.0, text: "Endi eng muhimi — sizning ma'lumotlaringiz." },
      { at: 3.4, text: "Tizim muassasaning o'z serverida ishlaydi va internetga chiqmaydi." },
      { at: 8.4, text: "Xarita, shriftlar, yuz bazasi. Hammasi ichkarida." },
      { at: 12.4, text: "Rasm va videoni faqat tizimga kirgan foydalanuvchi ko'radi. Kirish kalitlari serverda qoladi, brauzerga chiqmaydi." },
      { at: 19.0, text: "Tizimga faqat administrator yaratgan hisoblar kiradi." },
    ],

    /* 13 — AFZALLIKLAR */
    [
      { at: 0.0, text: "Oddiy videokuzatuv o'tmishni yozadi. Campus AI hozirni ko'radi." },
      { at: 5.0, text: "Qo'shimcha navbatchi yollamasdan, xavfsizlik darajasi ortadi." },
      { at: 9.6, text: "Yangi kamera sotib olmasdan, mavjudlari aqlli bo'ladi." },
      { at: 14.0, text: "Qog'ozsiz davomat, tayyor statistika, hisobotlar." },
      { at: 18.0, text: "Va eng qimmati — vaqt. Hodisa avj olmasdan oldingi o'sha soniyalar." },
    ],

    /* 14 — BOZOR VA DAROMAD */
    [
      { at: 0.0, text: "Endi raqamlar haqida." },
      { at: 2.5, text: "Statistika qo'mitasi ma'lumotiga ko'ra, respublikada o'n bir ming bir yuz o'n sakkizta maktab va olti million sakkiz yuz yetmish ming o'quvchi bor." },
      { at: 13.0, text: "Kollej va texnikumlar — besh yuzdan ortiq muassasa. Oliy ta'limda ikki yuz o'n beshta muassasa va bir million besh yuz o'ttiz besh ming talaba." },
      { at: 24.0, text: "Model oddiy: oylik abonent to'lovi, bitta o'quvchi hisobidan. Maktab uchun besh ming so'm, kollej uchun o'n ming, oliy ta'lim uchun o'n besh ming so'm." },
      { at: 37.0, text: "Uchta segment birgalikda to'liq qamrovda oyiga oltmish milliard so'mdan ortiq, yiliga yetti yuz yigirma besh milliard so'mlik bozorni beradi." },
      { at: 49.0, text: "Qamrovga qarab: bir foiz — yiliga yetti milliard so'm. Besh foiz — o'ttiz olti milliard. O'n foiz — yetmish ikki milliard. Yigirma besh foiz — bir yuz sakson bir milliard so'm." },
      { at: 66.0, text: "Hozir bitta maktabda jonli sinov ishlayapti. Keyingi qadam — hudud darajasidagi qamrov." },
    ],

    /* 15 — YAKUN */
    [
      { at: 0.0, text: "Campus AI." },
      { at: 2.0, text: "Kameralaringiz bor edi. Endi ularda ko'z bor." },
      { at: 6.5, text: "Savollaringizni kutamiz. Rahmat." },
    ],
  ],

  intro: {
    sub: "Ta'lim muassasalari xavfsizligi — sun'iy intellekt nazoratida",
    stats: ["texnikum qamrovi", "hudud — yagona xaritada", "uzluksiz monitoring", "AI detektori"],
  },

  problem: {
    kicker: "Muammo",
    title: "Kameralar bor. Idrok yo'q.",
    points: [
      { lead: "Faqat arxiv.", text: "Yozuv bor, lekin uni hodisadan keyin, kimdir qidirganda ochasiz." },
      { lead: "Inson chegarasi.", text: "Bir navbatchi o'nlab oqimni bir vaqtda kuzata olmaydi — charchaydi, chalg'iydi." },
      { lead: "Kechikkan xabar.", text: "Jang tugaganda kelgan ogohlantirishning qiymati nolga teng." },
    ],
    quote: "«Eng tajribali navbatchi ham bir vaqtda o'nlab ekranni kuzata olmaydi.»",
    hudAi: "AI tahlil qilmoqda",
    hudRec: "Faqat yozilmoqda",
    channels: "12 / 12 KANAL",
    footer: "Har bir kadr · har soniya · to'xtovsiz",
  },

  pipeline: {
    kicker: "Ichkarida nima bo'ladi",
    title: "Kadr qanday qilib hodisaga aylanadi",
    steps: [
      {
        title: "Oqim",
        text: "Muassasadagi IP-kameraning oqimi kuzatuv postiga keladi. Kamera almashtirilmaydi, yangi uskuna qo'shilmaydi.",
        meta: "RTSP · mavjud kameralar",
      },
      {
        title: "Kadrlar",
        text: "Oqim sekundiga bir necha kadrga bo'linadi. Model butun videoni emas, aynan kadrni ko'radi.",
        meta: "≈ 5 kadr / soniya",
      },
      {
        title: "Model",
        text: "Kompyuter ko'rish modeli kadrdagi har bir obyektni topadi va unga ramka hamda ishonch darajasini beradi.",
        meta: "ramka + 0.00 … 1.00",
      },
      {
        title: "Kuzatuv",
        text: "Bir odam kadrdan kadrga bitta raqam bilan kuzatiladi. Yuz vektori muassasa bazasidagi vektorlar bilan solishtiriladi.",
        meta: "bitta odam — bitta ID",
      },
      {
        title: "Filtr",
        text: "Ishonch chegarasi, zona va vaqt bo'yicha saralash. Bitta o'tishdagi o'nlab kadr BITTA hodisaga birlashadi.",
        meta: "takrorsizlash",
      },
      {
        title: "Hodisa",
        text: "Panelda ogohlantirish, ovozli signal va ota-ona ilovasiga xabar. Darajasiga qarab mas'ul xodimga yoki tashqi xizmatlarga yo'naltiriladi.",
        meta: "avtomatik yo'naltirish",
      },
    ],
    note: "Kadr ham, yuz vektori ham muassasa serveridan tashqariga chiqmaydi.",
  },

  detectors: {
    kicker: "AI detektorlari",
    title: "Campus AI nimalarni aniqlaydi",
    dets: [
      { name: "Yuz tanish", note: "Tanilgan va notanish shaxslar", label: "Shaxs tanildi", cam: "KAM-01 · Asosiy kirish" },
      { name: "Qurol", note: "Kadrda qurol paydo bo'lishi bilan trevoga", label: "Qurol aniqlandi", cam: "KAM-04 · Markaziy yo'lak" },
      { name: "Jang va zo'ravonlik", note: "Mushtlashuv avj olmasdan oldin", label: "Jang aniqlandi", cam: "KAM-07 · Hovli" },
      { name: "Chekish", note: "Ichki qoidabuzarlik qayd etiladi", label: "Chekish aniqlandi", cam: "KAM-01 · Hovli" },
      { name: "Telefonda gaplashish", note: "Dars vaqtidagi intizom nazorati", label: "Telefon aniqlandi", cam: "KAM-09 · 204-xona" },
      { name: "Begona shaxs", note: "Bazada yo'q odam hududga kirsa", label: "Notanish shaxs", cam: "KAM-02 · Darvoza" },
      { name: "Odamlar sanog'i", note: "Chiziqdan kirgan va chiqqanlar", label: "Kirdi 128 · Chiqdi 94", cam: "KAM-01 · Asosiy kirish" },
    ],
    live: "Jonli",
    idle: "Modellar yuklanmoqda…",
    real: "Haqiqiy yozuv",
    own: "Ramkani model chizgan",
    footer: "Har bir hodisa kadr, vaqt va kamera bilan qayd etiladi — tizim uni o'zi mas'ul xodimga yo'naltiradi.",
    stamp: "14.09.2026 · 09:12:04",
  },

  response: {
    kicker: "Tezkor javob",
    title: "Hodisadan javobgacha — 12 soniya",
    since: "Hodisadan beri",
    seconds: "SONIYA",
    active: "Faol trevoga",
    confirmed: "Hodisa qayd etildi",
    dossier: "Hodisa kartasida: butun kadr, nishon ramkasi, hodisa videosi va shaxsning qaysi kamerada, qachon ko'ringani.",
    clip: "Hodisa videosi · KAM-01",
    steps: [
      { title: "Hodisa sodir bo'ldi", text: "Kamera kadrini odatdagidek uzatmoqda" },
      { title: "AI aniqladi", text: "Model nishonni topdi va ishonch darajasini hisobladi — 0.88" },
      { title: "Nazorat ekranida", text: "Kadr, kamera nomi va xaritadagi joyi bilan ogohlantirish" },
      { title: "Mas'ul xodim xabardor", text: "Bildirishnoma qo'ng'irog'i, ovozli signal va ota-ona ilovasi" },
      { title: "Hodisa kartasi", text: "Kadr, video, vaqt va joy avtomatik biriktiriladi va arxivga tushadi" },
    ],
  },

  threats: {
    kicker: "Xavfsizlik zanjiri",
    title: "Tahdid aniqlangandan keyin nima bo'ladi",
    fight: {
      name: "Jang va zo'ravonlik",
      level: "Yuqori daraja",
      conf: "ishonch 0.88",
      steps: [
        { title: "Aniqlash", text: "Model ikki va undan ortiq shaxs o'rtasidagi keskin harakatni poza va harakat tezligi bo'yicha topadi" },
        { title: "Dalil saqlanadi", text: "Kadr va hodisa videosi avtomatik yoziladi, kamera hamda vaqt bilan biriktiriladi" },
        { title: "Trevoga", text: "Panelda yuqori darajali ogohlantirish, navbatchi ekranida ovozli signal" },
        { title: "Xabar", text: "Xavfsizlik xodimiga bildirishnoma, xaritada kamera nuqtasi; tanilgan o'quvchining ota-onasiga xabar" },
        { title: "Jurnal va tarix", text: "Hodisa avtomatik jurnalga tushadi va shaxs tarixiga biriktiriladi" },
        { title: "Profilaktika", text: "Takroriy janglar statistikada ko'rinadi; holat takrorlansa profilaktika inspektoriga yo'llanma shakllanadi" },
      ],
    },
    weapon: {
      name: "Qurol",
      level: "Kritik daraja",
      conf: "ishonch 0.86",
      steps: [
        { title: "Aniqlash", text: "Model kadrda qurolga o'xshash obyektni topadi — tasdiqlash KUTILMAYDI" },
        { title: "Sirena", text: "Ovozli signal va barcha nazorat ekranlarida to'liq ekranli trevoga" },
        { title: "Oqim ochiladi", text: "Kamera jonli oqimi avtomatik ochiladi, yozuv o'chirilmaydigan qilib belgilanadi" },
        { title: "Bir vaqtda xabar", text: "Mas'ul xodim va muassasa rahbariyati bir vaqtning o'zida xabardor qilinadi" },
        { title: "Tashqi xizmatlar", text: "Kadr, video, vaqt va joy — Milliy gvardiya va ichki ishlar organiga avtomatik yuboriladi" },
        { title: "Noto'g'ri signal", text: "Mas'ul xodim belgilab qo'ysa, model chegarasi aynan shu kamera uchun avtomatik sozlanadi" },
      ],
    },
    note: "Daraja hodisaning turiga bog'liq: jang — muassasa ichida hal qilinadi, qurol — darhol tashqi xizmatlarga.",
  },

  attendance: {
    kicker: "Kundalik ish",
    title: "Davomat o'zi yoziladi — qog'ozsiz",
    searching: "Yuz qidirilmoqda…",
    person: "A. Rahimov · 0.96",
    cam: "KAM-01 · Asosiy kirish",
    recorded: "Davomat yozildi",
    recordedMeta: " · 08:42 · vaqtida",
    recordedNote: "Qo'l bilan bir belgi ham qo'yilmadi.",
    tiles: ["Vaqtida keldi", "Kechikdi", "Kelmadi", "Sababli"],
    weekTitle: "Haftalik davomat dinamikasi",
    weekDays: ["Du", "Se", "Ch", "Pa", "Ju", "Sh"],
    chips: ["Kechikish chegarasi — paneldan sozlanadi", "O'quvchi · o'qituvchi · xodim — alohida", "CSV eksport"],
  },

  wellbeing: {
    kicker: "O'quvchi holati",
    title: "Kelgan-kelmagandan ko'ra ko'proq narsa",
    dayTitle: "Kun davomidagi kayfiyat",
    lessonsTitle: "Dars kesimida e'tibor",
    moods: ["Ijobiy", "Neytral", "Salbiy"],
    attention: "E'tibor",
    flagTitle: "Agressiya belgisi · 11:20",
    flagText: "Qisqa oraliqda ketma-ket salbiy kayfiyat qayd etilgan.",
    flagReason: "Sabab har doim yoziladi — belgi «qora quti» emas.",
    signalsTitle: "Bosim belgilari — tashxis emas, signal",
    signals: [
      { title: "Takroriy salbiy kayfiyat", text: "Bir necha kun ketma-ket salbiy qaydlar ustunlik qilsa, sinf rahbariga ko'rsatiladi." },
      { title: "Hodisalarda ishtirok", text: "Jang yoki chekish hodisalarida bir xil shaxsning qayta-qayta uchrashi." },
      { title: "Davomatning buzilishi", text: "Kechikish va kelmaslikning keskin ortishi — kayfiyat pasayishi bilan bir vaqtda." },
      { title: "Yolg'iz qolish", text: "Tanaffusda guruhdan uzoqda, bir xil burchakda ko'rinish vaqtining ortishi." },
    ],
    note: "Tizim tashxis qo'ymaydi va baho bermaydi. U belgilarni yig'ib, sinf rahbari va psixologga yo'naltiradi — qaror odamda qoladi.",
  },

  teachers: {
    kicker: "Rahbariyat uchun",
    title: "O'qituvchi va dars sifati nazorati",
    items: [
      { title: "Xodimlar davomati", text: "O'qituvchi va xodimlarning kelib-ketishi yuz tanish orqali yoziladi — qaysi darsga vaqtida kirgani jadvalda ko'rinadi." },
      { title: "Darsdagi holat", text: "Dars davomida sinfning umumiy kayfiyati va e'tibor ko'rsatkichi qayd etiladi." },
      { title: "Darslar solishtiriladi", text: "Qaysi darsda o'quvchilar diqqat bilan, qaysi darsda bee'tiborlik qilgani bir jadvalda." },
      { title: "Nutq tahlili", text: "O'qituvchi nutqi matnga o'giriladi va dars sifati baholanadi: gapirish ulushi, savol chastotasi, sukunat, mavzudan chetga chiqish." },
    ],
    metricsTitle: "Dars kartasi · 3-dars · Kimyo",
    metrics: [
      { label: "O'qituvchi gapirish ulushi", value: "78%" },
      { label: "Savol berish chastotasi", value: "4 / 40 daq" },
      { label: "Sinf e'tibori", value: "61%" },
      { label: "Salbiy kayfiyat ulushi", value: "18%" },
    ],
    adviceTitle: "Tizim tavsiyasi",
    advice: [
      "3-darsning 20-daqiqasidan keyin e'tibor 61% gacha tushgan.",
      "Savol-javob ulushini oshirish tavsiya etiladi — sinf 12 daqiqa davomida faqat tinglagan.",
      "1- va 2-darsda e'tibor 84% — o'sha darslardagi format namuna sifatida olinishi mumkin.",
    ],
    note: "Maqsad — o'qituvchini nazorat qilish emas, unga o'z darsini tashqaridan ko'rsatish.",
  },

  coverage: {
    kicker: "Qamrov",
    title: "Bitta bino emas — butun respublika",
    segments: [
      { num: "38 058", label: "Maktabgacha ta'lim" },
      { num: "11 118", label: "Maktab" },
      { num: "500+", label: "Kollej va texnikum" },
      { num: "215", label: "Oliy ta'lim" },
    ],
    segmentsNote: "Manba: Statistika qo'mitasi (2025/2026). Kollej va texnikum — vazirliklar ro'yxatlari bo'yicha taxminiy.",
    meta: "14 hudud · 1 280+ kamera nuqtasi",
    alert: "Trevoga · Toshkent shahri · KAM-07",
    campusTitle: "3D kampus — qavatma-qavat",
    campusNote: "Kamera aniq joyi va ko'rish yo'nalishi bilan turadi. Trevoga o'zi kelgan kamera ustida yonadi.",
    regions: {
      "Toshkent shahri": "Toshkent",
      "Samarqand viloyati": "Samarqand",
      "Farg‘ona viloyati": "Farg'ona",
      "Qoraqalpog‘iston Respublikasi": "Qoraqalpog'iston",
      "Buxoro viloyati": "Buxoro",
    },
  },

  control: {
    kicker: "Nazorat",
    title: "Butun boshqaruv — bitta panelda",
    items: [
      { title: "Boshqaruv paneli", text: "Umumiy holat, jonli xarita va 3D kampus" },
      { title: "Ogohlantirishlar", text: "Yangi hodisalar navbati — hali ko'rib chiqilmaganlar" },
      { title: "Aniqlanganlar", text: "Butun arxiv: kadr, video va shaxs tarixi" },
      { title: "Hodisalar", text: "Xavfli hodisalar va ularning videolari" },
      { title: "Kameralar", text: "Jonli oqim va kamera holati" },
      { title: "Shaxslar", text: "O'quvchilar, o'qituvchilar va xodimlar" },
      { title: "Statistika", text: "Davomat va hodisalar kesimi" },
      { title: "AI tahlil", text: "O'lchangan xulosa — o'ylab topilgan son yo'q" },
      { title: "Geo Analitika", text: "Hududlar bo'yicha tahlil" },
      { title: "Muassasalar", text: "Hududlar va muassasalar kesimi" },
      { title: "Hisobotlar", text: "Davomat hisobotlari va CSV eksport" },
      { title: "Sozlamalar", text: "Kechikish chegarasi, kameralar, hisoblar" },
    ],
    chips: [
      "O'zbek · Русский · English",
      "Qorong'i va yorug' mavzu",
      "Ovozli buyruqlar — «Boshqaruv paneliga qayt»",
      "Global qidiruv · bildirishnoma qo'ng'irog'i · ovozli signal",
    ],
  },

  parents: {
    kicker: "Ota-onalar uchun",
    title: "Ota-ona farzandini telefonida ko'radi",
    shots: ["Bosh sahifa", "Ogohlantirish", "Hodisa tafsiloti"],
    items: [
      { title: "Kirdi–chiqdi vaqti", text: "Farzand eshikdan o'tishi bilan ikkala vaqt ilovada. Qaysi kamera va necha soat ichkarida bo'lgani bilan." },
      { title: "Davomat darajasi", text: "Oylik foiz: kelgan, kechikkan va kelmagan kunlar alohida ko'rsatiladi." },
      { title: "Kayfiyat va e'tibor", text: "Kun davomidagi kayfiyat, dars kesimidagi e'tibor — qaysi fanda bola faolroq, qaysi fanda so'ngani ko'rinadi." },
      { title: "Bugungi darslar", text: "Jadval, fan, o'qituvchi va xona raqami — bosh sahifaning o'zida." },
      { title: "Ogohlantirish — darhol", text: "Chekish, jang yoki kechikish aniqlansa, xabar shu zahoti: kamera tasviri, vaqt, joy va aniqlik darajasi bilan." },
      { title: "Bir nechta farzand", text: "Bitta hisobda — har biri alohida kartochkada, almashtirish bir bosishda." },
    ],
    chips: ["Kamera tasviri bilan", "Aniqlik darajasi ko'rsatiladi", "Xabarlar tarixi saqlanadi", "Android · iOS"],
  },

  security: {
    kicker: "Maxfiylik",
    title: "Ma'lumotlaringiz muassasadan chiqmaydi",
    left: [
      { title: "Ichki server", text: "Tizim muassasaning o'z serverida ishlaydi — bulut yo'q." },
      { title: "Internetga chiqmaydi", text: "Xarita, shriftlar va modellar ham ichkarida. Tashqi xizmatga murojaat yo'q." },
      { title: "Yuz bazasi ichkarida", text: "Biometrik ma'lumot muassasa tarmog'idan tashqariga chiqmaydi." },
    ],
    right: [
      { title: "Yopiq media", text: "Rasm va videoni faqat tizimga kirgan foydalanuvchi ko'ra oladi." },
      { title: "Kalitlar serverda", text: "Kirish kalitlari brauzerga umuman chiqmaydi." },
      { title: "Hisoblar nazoratda", text: "Faqat administrator yaratgan hisoblar kiradi; har kim o'z vakolatini ko'radi." },
    ],
    chips: ["To'liq oflayn ishlaydi", "Ma'lumot muassasa serverida", "Tashqi xizmatlarga so'rov yo'q"],
  },

  advantages: {
    kicker: "Afzalliklar",
    title: "Oddiy videokuzatuv o'tmishni yozadi. Campus AI hozirni ko'radi.",
    colWas: "Bugungi holat",
    colNow: "Campus AI bilan",
    rows: [
      { was: "Kameralar yozadi, lekin hech kim ko'rmaydi", now: "Har bir kadr real vaqtda tahlil qilinadi" },
      { was: "Xavfsizlik navbatchilar soniga bog'liq", now: "Qo'shimcha xodimsiz — 24/7 uzluksiz nazorat" },
      { was: "Yangi tizim = yangi uskuna xarajati", now: "Mavjud IP-kameralar shundayligicha ulanadi" },
      { was: "Davomat qog'oz jurnalda, qo'lda", now: "Yuz tanish orqali avtomatik, CSV hisobot bilan" },
      { was: "Ota-ona faqat kechqurun so'rab biladi", now: "Kirdi-chiqdi, kayfiyat va ogohlantirish — telefonda" },
      { was: "Dars sifati faqat ochiq darsda baholanadi", now: "Har bir dars kesimida e'tibor va tavsiya" },
    ],
    gains: [
      { num: "12 s", label: "hodisadan mas'ul xodimgacha" },
      { num: "6", label: "parallel ishlaydigan AI detektori" },
      { num: "0", label: "qo'lda yoziladigan davomat belgisi" },
      { num: "0", label: "tashqi serverga chiqadigan bayt" },
    ],
  },

  pricing: {
    kicker: "Bozor va daromad",
    title: "Oylik abonent to'lovi — muassasa darajasiga qarab",
    tiersTitle: "Uchta segment · bitta model",
    tiers: [
      {
        name: "Maktablar",
        who: "Umumta'lim",
        price: "5 000",
        unit: "so'm / o'quvchi / oyiga",
        inst: "11 118 muassasa",
        students: "6,87 mln o'quvchi",
        monthly: "34,4 mlrd so'm / oy",
      },
      {
        name: "Kollej va texnikum",
        who: "Professional ta'lim",
        price: "10 000",
        unit: "so'm / o'quvchi / oyiga",
        inst: "500+ muassasa",
        students: "~300 ming o'quvchi*",
        monthly: "3,0 mlrd so'm / oy",
      },
      {
        name: "Oliy ta'lim muassasalari",
        who: "Universitet va institutlar",
        price: "15 000",
        unit: "so'm / talaba / oyiga",
        inst: "215 muassasa",
        students: "1,54 mln talaba",
        monthly: "23,0 mlrd so'm / oy",
      },
    ],
    note: "* Kollej va texnikum o'quvchilari soni — qabul parametrlaridan hisoblangan taxminiy raqam; qolganlari Statistika qo'mitasi ma'lumoti.",
    totalTitle: "To'liq qamrovda",
    totalMonthly: "60,4 mlrd",
    totalYearly: "725 mlrd",
    totalUnit: { month: "so'm / oyiga", year: "so'm / yiliga" },
    chartTitle: "Qamrovga qarab yillik daromad",
    chart: [
      { pct: 1, label: "1% qamrov", yearly: "7,2 mlrd", monthly: "0,6 mlrd / oy" },
      { pct: 5, label: "5% qamrov", yearly: "36,2 mlrd", monthly: "3,0 mlrd / oy" },
      { pct: 10, label: "10% qamrov", yearly: "72,5 mlrd", monthly: "6,0 mlrd / oy" },
      { pct: 25, label: "25% qamrov", yearly: "181 mlrd", monthly: "15,1 mlrd / oy" },
    ],
    chartNote: "Hisob model bo'yicha: o'quvchilar soni × tarif. O'lchangan daromad emas.",
    source: "Manba: O'zbekiston Statistika qo'mitasi, 2025/2026 o'quv yili",
  },

  finale: {
    titleA: "Kameralaringiz bor edi.",
    titleB: "Endi ularda idrok bor.",
    sub: "Campus AI — ta'lim muassasalari uchun video-kuzatuv va monitoring eko tizimi",
    ctaPanel: "Panelga kirish",
    ctaOrder: "Buyurtma berish",
    ctaProduct: "Mahsulot sahifasi",
    foot: "Ichki tarmoqda, internetsiz ishlaydi",
  },
};
