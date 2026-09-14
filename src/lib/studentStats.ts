/**
 * O'quvchilar statistikasi va monitoringi — davomat yozuvlaridan hisoblanadi.
 *
 * Manba HAQIQIY: `/persons` (guruh, kurs) va `/attendance` (kirish/chiqish,
 * emotsiya, vaqt). Hech qanday mock yo'q — backend bo'sh bo'lsa sonlar ham
 * nol bo'ladi va UI buni ochiq aytadi.
 *
 * Sof funksiya: React'ga bog'liq emas, shuning uchun natijani ko'z bilan
 * tekshirish ham, keyinchalik test yozish ham oson (`lib/aiSummary.ts` bilan
 * bir xil uslub).
 */
import type { AttendanceOut, PersonOut } from "@/lib/api";

/** Shu vaqtdan keyingi BIRINCHI kirish — kechikish. Maktab/texnikum tartibiga
 *  qarab o'zgaradi, shuning uchun bitta joyda turadi. */
export const LATE_AFTER_MIN = 9 * 60; // 09:00

/** Salbiy kayfiyat guruhi — backend `emotion_group` shu qiymatlarni beradi. */
const NEGATIVE = new Set(["negative", "salbiy"]);

export interface PersonBrief {
  id: string;
  name: string;
  group: string;
}

export interface StudentStats {
  /** Ro'yxatdagi jami (aktiv) o'quvchi. */
  total: number;
  /** Bugun kamida bir marta kirgan. */
  attended: number;
  /** Oxirgi hodisasi `entry` — hozir binoda. */
  inside: number;
  /** Bugun umuman kirmagan. */
  absent: number;
  /** Birinchi kirishi `LATE_AFTER_MIN` dan keyin bo'lgan. */
  late: number;
  /** Davomat foizi (`attended / total`). */
  rate: number;
  /** Soatlik kirish/chiqish — monitoring grafigi. */
  hourly: { hour: number; entry: number; exit: number }[];
  /** Guruh kesimida davomat. */
  groups: { name: string; total: number; attended: number; pct: number }[];
  /** Bugun kelmaganlar (ro'yxat — operator ko'rishi uchun). */
  absentees: PersonBrief[];
  /** Kechikkanlar — birinchi kirish vaqti bilan. */
  latecomers: (PersonBrief & { at: string })[];
  /** Bugun salbiy kayfiyat qayd etilganlar. */
  negative: (PersonBrief & { emotion: string })[];
  /** Davomat yozuvi umuman bormi (bo'lmasa UI "ma'lumot yo'q" deydi). */
  hasData: boolean;
}

const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

export const EMPTY_STUDENT_STATS: StudentStats = {
  total: 0,
  attended: 0,
  inside: 0,
  absent: 0,
  late: 0,
  rate: 0,
  hourly: Array.from({ length: 24 }, (_, hour) => ({ hour, entry: 0, exit: 0 })),
  groups: [],
  absentees: [],
  latecomers: [],
  negative: [],
  hasData: false,
};

/**
 * @param persons  Ro'yxatdagi o'quvchilar (bitta sahifa emas — to'liq ro'yxat).
 * @param records  Davomat yozuvlari; chaqiruvchi `date_from` bilan bugunga
 *                 cheklab beradi, bu yerda qo'shimcha filtr yo'q.
 */
export function buildStudentStats(persons: PersonOut[], records: AttendanceOut[]): StudentStats {
  if (persons.length === 0 && records.length === 0) return EMPTY_STUDENT_STATS;

  const hourly = Array.from({ length: 24 }, (_, hour) => ({ hour, entry: 0, exit: 0 }));

  /** person_id → bugungi yozuvlari (vaqt bo'yicha o'sish tartibida). */
  const byPerson = new Map<string, AttendanceOut[]>();
  for (const r of records) {
    const list = byPerson.get(r.person_id);
    if (list) list.push(r);
    else byPerson.set(r.person_id, [r]);

    const d = new Date(r.timestamp);
    const h = d.getHours();
    if (Number.isNaN(h)) continue;
    if (r.event_type === "exit") hourly[h].exit++;
    else hourly[h].entry++;
  }
  for (const list of byPerson.values()) {
    list.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  const brief = (p: PersonOut): PersonBrief => ({
    id: p.id,
    name: p.full_name,
    group: p.group_name ?? "—",
  });

  let attended = 0;
  let inside = 0;
  let late = 0;
  const absentees: PersonBrief[] = [];
  const latecomers: (PersonBrief & { at: string })[] = [];
  const negative: (PersonBrief & { emotion: string })[] = [];
  /** Guruh → [jami, kelgan]. */
  const groupMap = new Map<string, { total: number; attended: number }>();

  for (const p of persons) {
    const g = p.group_name ?? "—";
    const row = groupMap.get(g) ?? { total: 0, attended: 0 };
    row.total++;

    const list = byPerson.get(p.id);
    if (!list || list.length === 0) {
      absentees.push(brief(p));
      groupMap.set(g, row);
      continue;
    }

    attended++;
    row.attended++;
    groupMap.set(g, row);

    // Oxirgi hodisa `entry` bo'lsa — hozir ichkarida
    if (list[list.length - 1].event_type !== "exit") inside++;

    const firstEntry = list.find((r) => r.event_type !== "exit");
    if (firstEntry) {
      const d = new Date(firstEntry.timestamp);
      if (d.getHours() * 60 + d.getMinutes() > LATE_AFTER_MIN) {
        late++;
        latecomers.push({ ...brief(p), at: hhmm(d) });
      }
    }

    const neg = list.find((r) => r.emotion_group && NEGATIVE.has(r.emotion_group.toLowerCase()));
    if (neg) negative.push({ ...brief(p), emotion: neg.emotion_label ?? neg.emotion_group! });
  }

  const groups = [...groupMap.entries()]
    .map(([name, v]) => ({
      name,
      total: v.total,
      attended: v.attended,
      pct: v.total > 0 ? Math.round((v.attended / v.total) * 100) : 0,
    }))
    // Eng past davomat tepada — diqqat kerak bo'lgan guruh birinchi ko'rinsin
    .sort((a, b) => a.pct - b.pct || b.total - a.total);

  latecomers.sort((a, b) => a.at.localeCompare(b.at));

  return {
    total: persons.length,
    attended,
    inside,
    absent: persons.length - attended,
    late,
    rate: persons.length > 0 ? Math.round((attended / persons.length) * 100) : 0,
    hourly,
    groups,
    absentees,
    latecomers,
    negative,
    hasData: records.length > 0,
  };
}

/* ───────────────── Bir kunlik harakat: kirdi → qayerda → chiqdi ───────────────── */

export interface MovementPoint {
  id: string;
  ts: number;
  /** HH:MM */
  time: string;
  kind: "entry" | "exit" | "seen";
  /** Kamera nomi (topilmasa `null`). */
  camera: string | null;
  emotion: string | null;
  /** Oldingi nuqtadan beri o'tgan daqiqa; birinchisida `null`. */
  gapMin: number | null;
}

export interface MovementDay {
  points: MovementPoint[];
  /** Birinchi kirish (HH:MM) yoki `null`. */
  entryAt: string | null;
  /** Oxirgi chiqish (HH:MM) yoki `null` — hali chiqmagan. */
  exitAt: string | null;
  /** Ichkarida bo'lgan vaqt, daqiqa (chiqmagan bo'lsa — oxirgi ko'rinishgacha). */
  insideMin: number | null;
  /** Nechta turli kamerada ko'ringan. */
  cameras: number;
  /** Oxirgi yozuv `exit` emas — hali ichkarida. */
  stillInside: boolean;
}

export const EMPTY_MOVEMENT: MovementDay = {
  points: [],
  entryAt: null,
  exitAt: null,
  insideMin: null,
  cameras: 0,
  stillInside: false,
};

/**
 * Bir shaxsning bir kunlik harakati.
 *
 * @param records    O'sha shaxsning o'sha kundagi davomat yozuvlari.
 * @param cameraName `camera_id` → kamera nomi (`/cameras` dan). Topilmasa `null`.
 *
 * DIQQAT: "chiqdi" deb FAQAT oxirgi yozuv `exit` bo'lgandagina hisoblanadi.
 * Kun davomida kirib-chiqib yurgan bo'lsa oraliq `exit` lar ham nuqta sifatida
 * ko'rinadi, lekin kunning yakuniy holati oxirgi yozuv bilan aniqlanadi.
 */
export function buildMovement(
  records: AttendanceOut[],
  cameraName: (id: string | null) => string | null
): MovementDay {
  if (records.length === 0) return EMPTY_MOVEMENT;

  const sorted = [...records].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const points: MovementPoint[] = sorted.map((r, i) => {
    const d = new Date(r.timestamp);
    const ts = d.getTime();
    const prev = i > 0 ? new Date(sorted[i - 1].timestamp).getTime() : null;
    const isExit = r.event_type === "exit";
    return {
      id: r.id,
      ts,
      time: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
      kind: isExit ? "exit" : i === 0 ? "entry" : "seen",
      camera: cameraName(r.camera_id),
      emotion: r.emotion_label ?? r.emotion_group ?? null,
      gapMin: prev === null ? null : Math.max(0, Math.round((ts - prev) / 60_000)),
    };
  });

  const first = points[0];
  const last = points[points.length - 1];
  const stillInside = last.kind !== "exit";

  return {
    points,
    entryAt: first.kind === "exit" ? null : first.time,
    exitAt: stillInside ? null : last.time,
    insideMin: Math.max(0, Math.round((last.ts - first.ts) / 60_000)),
    cameras: new Set(sorted.map((r) => r.camera_id).filter(Boolean)).size,
    stillInside,
  };
}
