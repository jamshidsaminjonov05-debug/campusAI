import type { VoiceEntities } from "./VoiceEntityExtractor";

/**
 * VoiceCommandRegistry — barcha ovozli buyruqlar yagona konfiguratsiyada.
 * Yangi buyruq = shu ro'yxatga bitta yozuv (uzun if/else zanjiri YO'Q).
 * Predictor `keywords` bo'yicha fuzzy moslashtiradi, Executor `id` bo'yicha bajaradi.
 */

export type IntentId =
  | "nav.dashboard"
  | "nav.cameras"
  | "nav.students"
  | "nav.teachers"
  | "nav.geo"
  | "nav.events"
  | "nav.reports"
  | "nav.settings"
  | "search.person"
  | "camera.open"
  | "camera.first"
  | "camera.play"
  | "camera.pause"
  | "camera.fullscreen"
  | "events.filter"
  | "map.open"
  | "map.zoomIn"
  | "map.zoomOut"
  | "map.reset"
  | "map.route"
  | "map.place"
  | "attendance.today"
  | "attendance.absent"
  | "ai.today"
  | "ai.topEvents"
  | "ai.lowAttendance";

export type CommandCategory =
  | "Navigatsiya"
  | "Qidiruv"
  | "Kamera"
  | "Hodisa"
  | "Xarita"
  | "Davomat"
  | "AI tahlil";

export interface CommandDef {
  id: IntentId;
  title: string; // takliflar ro'yxatida ko'rsatiladigan nom
  category: CommandCategory;
  /** Fuzzy moslashtirish uchun ajratuvchi so'zlar (fe'llar emas, otlar). */
  keywords: string[];
  /** Shu birlik bo'lmasa buyruq bajarilmaydi (masalan search.person → personName). */
  requires?: keyof VoiceEntities;
  sample: string; // namuna ibora (overlay/help uchun)
}

export const COMMAND_REGISTRY: CommandDef[] = [
  // — Navigatsiya —
  { id: "nav.dashboard", title: "Boshqaruv paneli", category: "Navigatsiya", keywords: ["boshqaruv panel", "bosh sahifa", "dashboard", "asosiy"], sample: "Boshqaruv paneliga qayt" },
  { id: "nav.cameras", title: "Kameralar", category: "Navigatsiya", keywords: ["kamera", "kameralar"], sample: "Kameralarni och" },
  { id: "nav.students", title: "Talabalar", category: "Navigatsiya", keywords: ["talaba", "talabalar", "student"], sample: "Talabalarni och" },
  { id: "nav.teachers", title: "O'qituvchilar", category: "Navigatsiya", keywords: ["o'qituvchi", "o'qituvchilar", "muallim"], sample: "O'qituvchilarni och" },
  { id: "nav.geo", title: "Geo Analitika", category: "Navigatsiya", keywords: ["geo analitika", "analitika", "geo", "hudud statistika"], sample: "Geo analitikani och" },
  { id: "nav.events", title: "Hodisalar", category: "Navigatsiya", keywords: ["hodisa", "hodisalar", "trevoga"], sample: "Hodisalarni och" },
  { id: "nav.reports", title: "Hisobotlar", category: "Navigatsiya", keywords: ["hisobot", "hisobotlar"], sample: "Hisobotlarni och" },
  { id: "nav.settings", title: "Sozlamalar", category: "Navigatsiya", keywords: ["sozlama", "sozlamalar", "profil"], sample: "Sozlamalarni och" },

  // — Qidiruv —
  { id: "search.person", title: "Shaxsni qidirish", category: "Qidiruv", keywords: ["top", "qidir", "izla"], requires: "personName", sample: "Ali Valiyevni top" },

  // — Kamera —
  { id: "camera.open", title: "Kamerani ochish (raqam bo'yicha)", category: "Kamera", keywords: ["kamera"], requires: "cameraNumber", sample: "15-kamerani och" },
  { id: "camera.first", title: "Birinchi kamera", category: "Kamera", keywords: ["birinchi kamera"], sample: "Birinchi kamerani och" },
  { id: "camera.play", title: "Jonli efirni yoqish", category: "Kamera", keywords: ["jonli efir", "efirni yoq", "jonli"], sample: "Jonli efirni och" },
  { id: "camera.pause", title: "Jonli efirni to'xtatish", category: "Kamera", keywords: ["efirni to'xtat", "jonli efirni to'xtat"], sample: "Jonli efirni to'xtat" },
  { id: "camera.fullscreen", title: "To'liq ekran", category: "Kamera", keywords: ["to'liq ekran"], sample: "To'liq ekranga o't" },

  // — Hodisa filtri —
  { id: "events.filter", title: "Hodisalarni filtrlash", category: "Hodisa", keywords: ["janjal", "chekish", "ruxsatsiz", "notanish", "qurol", "telefon"], requires: "eventType", sample: "Janjallarni ko'rsat" },

  // — Xarita —
  { id: "map.open", title: "Xaritani ochish", category: "Xarita", keywords: ["xarita"], sample: "Xaritani och" },
  { id: "map.zoomIn", title: "Masshtabni kattalashtirish", category: "Xarita", keywords: ["kattalashtir", "yaqinlashtir", "masshtab katta"], sample: "Masshtabni kattalashtir" },
  { id: "map.zoomOut", title: "Masshtabni kichraytirish", category: "Xarita", keywords: ["kichraytir", "uzoqlashtir", "masshtab kichik"], sample: "Masshtabni kichraytir" },
  { id: "map.reset", title: "Xaritani markazga qaytarish", category: "Xarita", keywords: ["markazga qaytar", "markazga", "boshlang'ich ko'rinish"], sample: "Xaritani markazga qaytar" },
  { id: "map.route", title: "Marshrutni ko'rsatish", category: "Xarita", keywords: ["marshrut", "yo'nalish"], sample: "Marshrutni ko'rsat" },
  { id: "map.place", title: "Hudud/texnikumni ko'rsatish", category: "Xarita", keywords: ["viloyat", "hudud", "shahri", "texnikum"], requires: "placeQuery", sample: "Toshkent viloyatini ko'rsat" },

  // — Davomat —
  { id: "attendance.today", title: "Bugungi davomat", category: "Davomat", keywords: ["bugungi davomat", "davomat"], sample: "Bugungi davomatni ko'rsat" },
  { id: "attendance.absent", title: "Kelmaganlar", category: "Davomat", keywords: ["kelmagan", "yo'qlar", "nofaol"], sample: "Kelmaganlarni ko'rsat" },

  // — AI tahlil —
  { id: "ai.today", title: "Bugun nima bo'ldi?", category: "AI tahlil", keywords: ["bugun nima", "bugungi statistika", "nima sodir"], sample: "Bugun nima sodir bo'ldi?" },
  { id: "ai.topEvents", title: "Eng ko'p hodisa", category: "AI tahlil", keywords: ["eng ko'p hodisa", "ko'p hodisa qaysi"], sample: "Eng ko'p hodisa qaysi texnikumda?" },
  { id: "ai.lowAttendance", title: "Eng past davomat", category: "AI tahlil", keywords: ["eng past davomat", "past davomat qaysi"], sample: "Eng past davomat qaysi texnikumda?" },
];

export function getCommand(id: IntentId): CommandDef | undefined {
  return COMMAND_REGISTRY.find((c) => c.id === id);
}
