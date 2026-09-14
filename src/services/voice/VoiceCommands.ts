/**
 * Ovozli boshqaruv — buyruq tiplari, kalit so'zlar va foydalanuvchiga
 * o'qib beriladigan (TTS) javob matnlari. Faqat sof ma'lumot/tip — React'ga
 * bog'liq emas, shuning uchun VoiceParser va VoiceProvider ikkalasida ham
 * import qilinadi.
 */

/** App.tsx / Sidebar.tsx dagi activePage qiymatlari bilan bir xil bo'lishi shart. */
export type PageName =
  | "Boshqaruv paneli"
  | "Kameralar"
  | "Shaxslar"
  | "Geo Analitika"
  | "Hodisalar"
  | "Hisobotlar"
  | "Sozlamalar";

export type EventTypeCode =
  | "fight"
  | "smoking"
  | "no_pass"
  | "left_object"
  | "unknown_person"
  | "other";

export type PersonType = "student" | "teacher";

export type VoiceCommand =
  | { kind: "navigate"; page: PageName }
  | { kind: "searchPerson"; query: string; personType: PersonType }
  | { kind: "openCamera"; index: number }
  | { kind: "cameraControl"; action: "first" | "play" | "pause" | "fullscreen" }
  | { kind: "filterEvents"; eventType: EventTypeCode }
  | { kind: "flyToRegion"; query: string }
  | { kind: "focusTeknikum"; query: string }
  | { kind: "mapZoom"; direction: "in" | "out" }
  | { kind: "showRoute" }
  | { kind: "openMap" }
  | { kind: "unknown"; raw: string };

/** VoiceProvider bridge/pages iste'mol qiladigan buyruqlar (xarita, kamera, hodisa, qidiruv). */
export type VoiceMapAction =
  | { type: "zoomIn" }
  | { type: "zoomOut" }
  | { type: "reset" }
  | { type: "showRoute"; coordinates: [number, number][] };

export interface VoiceCameraCommand {
  selectIndex?: number;
  /** Nom yoki kanal bo'yicha tanlash — 3D kampusdagi kamera nuqtasi shuni
   *  yuboradi (kuzatuv posti kanal nomi ma'lum, ro'yxatdagi tartib raqami emas). */
  selectName?: string;
  action?: "play" | "pause" | "fullscreen";
}

export interface VoiceEventFilter {
  eventType: EventTypeCode | null;
}

export interface VoicePersonSearch {
  query: string;
  personType: PersonType;
}

/** Backend event_type kodi → tanish so'zlar (o'zbekcha + backend kodining o'zi). */
export const EVENT_TYPE_KEYWORDS: Record<EventTypeCode, string[]> = {
  fight: ["fight", "janjal"],
  smoking: ["smoking", "chekish"],
  no_pass: ["no_pass", "ruxsatsiz"],
  left_object: ["left_object", "qoldirilgan"],
  unknown_person: ["unknown_person", "notanish"],
  other: ["boshqa hodisa"],
};

export const PAGE_FEEDBACK: Record<PageName, string> = {
  "Boshqaruv paneli": "Bosh sahifaga qaytildi.",
  Kameralar: "Kameralar sahifasi ochildi.",
  Shaxslar: "Shaxslar bo'limi ochildi.",
  "Geo Analitika": "Geo analitika ochildi.",
  Hodisalar: "Hodisalar sahifasi ochildi.",
  Hisobotlar: "Davomat sahifasi ochildi.",
  Sozlamalar: "Sozlamalar ochildi.",
};

export const UNKNOWN_COMMAND_PHRASE = "Tushunarsiz buyruq.";
export const GENERIC_DONE_PHRASE = "Buyruq bajarildi.";

export const VOICE_ERROR = {
  micDenied: "Mikrofondan foydalanishga ruxsat bering.",
  // Ichki tarmoqda boshqa kompyuterdan `http://10.181.x.x:5173` bilan ochilsa
  // brauzer mikrofonni bermaydi (secure context talab). Yechim DEPLOY.md da.
  insecureContext: "Mikrofon faqat HTTPS yoki localhost'da ishlaydi. Serverga HTTPS sozlang yoki panelni server kompyuterida oching.",
  serviceOffline: "Ovoz xizmati ishlamayapti.",
  timeout: "Javob olinmadi.",
  emptyResult: "Ovoz tanilmadi.",
} as const;
