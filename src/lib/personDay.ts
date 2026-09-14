/**
 * HAR BIR o'quvchi/o'qituvchining bir kunlik kesimi — *nima qilgani va
 * holati*: qachon kirdi, qayerlarda ko'rindi, qancha ichkarida bo'ldi,
 * qachon chiqdi, kayfiyati qanday edi, agressiya belgisi bormi.
 *
 * Bu yerda YANGI qoida yo'q — mavjud uchta manba bitta qatorga yig'iladi:
 *   · `buildMovement()`  (`lib/studentStats.ts`) — kirish/chiqish/ko'rinish,
 *   · `buildMoodDay()`   (`lib/moodTimeline.ts`) — kayfiyat, e'tibor, agressiya,
 *   · `parseCameraName()` (`lib/cameraNaming.ts`) — kamera nomidan joy.
 * Shu sababli profil paneli (`PersonMovement`/`PersonMood`) va statistika
 * jadvali bir xil o'quvchi uchun bir xil xulosa beradi.
 *
 * ⚠️ "E'tibor" — HOSILA ko'rsatkich (kayfiyat aralashmasidan), o'lchov emas.
 * Talqin qoidasi `lib/moodTimeline.ts` da tushuntirilgan.
 *
 * Sof funksiya: React'ga bog'liq emas.
 */
import type { AttendanceOut, PersonOut } from "@/lib/api";
import { LATE_AFTER_MIN, buildMovement } from "@/lib/studentStats";
import { buildMoodDay } from "@/lib/moodTimeline";
import { parseCameraName, placeLabel } from "@/lib/cameraNaming";
import { tr } from "@/i18n/store";

export interface PersonDay {
  id: string;
  name: string;
  group: string;
  /** Bugun kamida bir marta qayd etilgan. */
  present: boolean;
  /** Birinchi kirish (HH:MM) — kelmagan bo'lsa `null`. */
  entryAt: string | null;
  /** Oxirgi chiqish (HH:MM) — hali ichkarida bo'lsa `null`. */
  exitAt: string | null;
  /** Ichkarida bo'lgan vaqt, daqiqa. */
  insideMin: number;
  stillInside: boolean;
  /** Birinchi kirish `LATE_AFTER_MIN` dan keyin. */
  late: boolean;
  /** Necha DAQIQA kechikkan (kechikmagan bo'lsa `0`). */
  lateMin: number;
  /** Nechta turli kamerada ko'ringan. */
  cameras: number;
  /** Ko'ringan joylar — kamera nomidan ("1-qavat · yo'lak"), takrorsiz. */
  places: string[];
  /** Oxirgi ko'rinish vaqti (HH:MM). */
  lastSeenAt: string | null;
  /** Kun davomidagi qaydlar soni. */
  records: number;
  positive: number;
  neutral: number;
  negative: number;
  /** 0..100 — hosila. Kayfiyat qaydi bo'lmasa `null`. */
  attention: number | null;
  aggressive: boolean;
  aggressiveAt: string | null;
}

/**
 * Kamera nomidan o'qiladigan joy: "2-qavat · yo'lak".
 * Matn LUG'ATDAN (`tr()` — React'siz kontekst), shuning uchun til
 * almashtirilganda chaqiruvchi memo'ni `t.locale` bilan yangilashi kerak.
 */
export function placeOf(camera: string | null): string | null {
  if (!camera) return null;
  const p = parseCameraName(camera);
  const d = tr().interior;
  const parts = [
    p.floor !== null ? d.floorShort(p.floor) : null,
    p.block ? d.blockShort(p.block) : null,
    placeLabel(p.kind),
  ];
  return parts.filter(Boolean).join(" · ");
}

/** `HH:MM` → kun boshidan daqiqa (kechikishni aniqlash uchun). */
const minutesOf = (hhmm: string): number => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/**
 * @param persons    Ro'yxatdagi shaxslar (to'liq ro'yxat).
 * @param records    O'sha KUNDAGI barcha davomat yozuvlari (chaqiruvchi kesib beradi).
 * @param cameraName `camera_id` → kamera nomi.
 */
export function buildPersonDays(
  persons: PersonOut[],
  records: AttendanceOut[],
  cameraName: (id: string | null) => string | null
): PersonDay[] {
  // Bir marta guruhlaymiz — har bir shaxs uchun ro'yxatni qayta filtrlash
  // 500 shaxsda kvadratik bo'lib ketardi
  const byPerson = new Map<string, AttendanceOut[]>();
  for (const r of records) {
    const list = byPerson.get(r.person_id);
    if (list) list.push(r);
    else byPerson.set(r.person_id, [r]);
  }

  return persons.map((p) => {
    const own = byPerson.get(p.id) ?? [];
    const move = buildMovement(own, cameraName);
    const mood = buildMoodDay(own);

    const places: string[] = [];
    for (const pt of move.points) {
      const place = placeOf(pt.camera);
      if (place && !places.includes(place)) places.push(place);
    }

    const hasMood = mood.hasData;
    return {
      id: p.id,
      name: p.full_name,
      group: p.group_name ?? p.person_type,
      present: own.length > 0,
      entryAt: move.entryAt,
      exitAt: move.exitAt,
      insideMin: move.insideMin ?? 0,
      stillInside: own.length > 0 && move.stillInside,
      late: move.entryAt !== null && minutesOf(move.entryAt) >= LATE_AFTER_MIN,
      // Kechikish DAQIQASI — jadvalda "09:14 (+14 daq)" ko'rinishida
      lateMin: move.entryAt !== null ? Math.max(0, minutesOf(move.entryAt) - LATE_AFTER_MIN) : 0,
      cameras: move.cameras,
      places,
      lastSeenAt: move.points.length > 0 ? move.points[move.points.length - 1].time : null,
      records: own.length,
      positive: mood.positive,
      neutral: mood.neutral,
      negative: mood.negative,
      attention: hasMood ? mood.attention : null,
      aggressive: mood.aggressive,
      aggressiveAt: mood.aggressiveAt,
    };
  });
}

export interface PeopleDayTotals {
  total: number;
  present: number;
  absent: number;
  inside: number;
  late: number;
  aggressive: number;
  /** Kelganlar bo'yicha o'rtacha ichkaridagi vaqt (daqiqa). */
  avgInsideMin: number;
  /** Kayfiyat qaydi BOR shaxslar bo'yicha o'rtacha e'tibor (hosila). */
  avgAttention: number | null;
}

export function summarizePersonDays(days: PersonDay[]): PeopleDayTotals {
  const present = days.filter((d) => d.present);
  const withMood = days.filter((d) => d.attention !== null);
  return {
    total: days.length,
    present: present.length,
    absent: days.length - present.length,
    inside: days.filter((d) => d.stillInside).length,
    late: days.filter((d) => d.late).length,
    aggressive: days.filter((d) => d.aggressive).length,
    avgInsideMin:
      present.length > 0 ? Math.round(present.reduce((s, d) => s + d.insideMin, 0) / present.length) : 0,
    avgAttention:
      withMood.length > 0
        ? Math.round(withMood.reduce((s, d) => s + (d.attention ?? 0), 0) / withMood.length)
        : null,
  };
}
