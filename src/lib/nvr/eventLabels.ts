import { tr } from "@/i18n";

/**
 * Backend `event_type` kodlari → o'zbekcha nomlar.
 *
 * Sahifa komponentidan alohida turadi: trevoga kuzatuvchisi (useAlarmWatcher)
 * ham shu nomlardan foydalanadi, lekin EventsPage'ni (recharts bilan birga)
 * import qilishi kerak emas.
 *
 * DIQQAT: `POST /events` faqat shu kodlarni qabul qiladi — o'zbekcha matn 400 beradi.
 */
export const EVENT_TYPE_LABELS: Record<string, string> = {
  fight: "Janjal aniqlandi",
  smoking: "Chekish aniqlandi",
  no_pass: "Ruxsatsiz kirish",
  unknown_person: "Notanish shaxs",
  other: "Boshqa hodisa",
};

/** Kod bo'yicha nom; noma'lum kod bo'lsa kodning o'zi qaytadi. */
export function eventTypeLabel(code: string): string {
  return EVENT_TYPE_LABELS[code] ?? code;
}

/**
 * Kuzatuv posti hodisasining KO'RINADIGAN nomi — LUG'ATDAN (uz/ru/en).
 *
 * Server `label` ni o'zbekcha matn bilan yuboradi ("Begona shaxs"), ya'ni
 * rus/ingliz tilida ekranda o'zbekcha so'z qolardi. Shuning uchun nom
 * KATEGORIYADAN olinadi; noma'lum kategoriyada serverning o'z matni qoladi.
 *
 * ⚠️ `tr()` — React'siz store (`i18n/store.ts`): komponent `useT()` bilan
 * qayta chizilganda bu funksiya ham yangi tilni qaytaradi (`detectSubject`
 * bilan AYNI naqsh).
 */
export function nvrEventLabel(e: { category: string; label: string; name?: string | null; recognized?: boolean }): string {
  const t = tr();
  const n = t.dashboard.ui.types.names;
  if (e.category === "face") return e.recognized ? (e.name ?? t.detect.recognizedPerson) : n.unknown_person;
  if (e.category === "gun") return n.weapon;
  if (e.category === "janjal") return n.fight;
  if (e.category === "smoking") return n.smoking;
  return e.label;
}
