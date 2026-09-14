"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Briefcase,
  CalendarBlank,
  CaretLeft,
  CaretRight,
  ChalkboardTeacher,
  Gear,
  Student,
} from "@phosphor-icons/react";
import { Donut3D, type DonutSlice } from "@/components/common/Donut3D";
import { StatPanel, TabPill, fmt } from "@/components/common/panels";
import { LibraryPhoto, classOrder } from "@/components/people/FaceDatabasePage";
import { useT } from "@/i18n";
import type { NvrAttendanceRow, NvrAttendanceStatus } from "@/lib/nvrApi";
import { attDay, type AttendanceDayPoint } from "@/hooks/useNvrAttendance";

/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  DAVOMAT — 3D HALQA + TOIFA/SINF CHUQURLASHUVI (2026-09-10)          ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * Foydalanuvchi so'rovi: "Toifalar kesimi" (statik jadval — O'quvchilar/
 * O'qituvchilar/Xodimlar qatorlari) BUTUNLAY olib tashlansin, o'rniga
 * TO'LIQ KENGLIKDA 3D halqa (Erta/Kech/Kelmagan) chizilsin. Bo'lak
 * bosilganda halqa KICHRAYADI va o'ngdan KARTA suziб kiradi
 * (`transformX` animatsiyasi): avval TOIFA kartochkalari (O'qituvchi/
 * Xodimlar/Sinflar), so'ng — agar "Sinflar" tanlansa — SARALANADIGAN
 * sinf kartochkalari, sinf bosilsa esa o'sha sinf o'quvchilarining
 * ro'yxati.
 *
 * ⚠️ **MANBA — `day`ning O'ZI, YANGI SO'ROV YO'Q.** `rows` chaqiruvchidan
 * keladi (`StatAttendance.tsx`da `att.rows` — "Ro'yxat" jadvali bilan
 * AYNI manba). Erta/Kech/Kelmagan — kun darajasidagi holat, davr
 * yig'indisida ma'nosiz bo'lardi (bitta odam necha kunda necha marta
 * sanaladi) — shuning uchun bu panel HAM "Ro'yxat" kabi FAQAT tanlangan
 * BITTA kun bo'yicha ishlaydi (`multiDay` bo'lsa ham).
 *
 * ⚠️ **"Xodimlar" — DOIM MANBASIZ.** kuzatuv posti `role`da faqat `student`/
 * `teacher` bor (`BACKEND.md` 4-band, shu faylning boshqa joylarida ham
 * qaytarilgan qoida) — kartochka bosilmaydi, sababi ochiq yoziladi.
 */

type RoleTile = "student" | "teacher" | null;
type ClassSort = "class-asc" | "class-desc" | "count";

const STATUS_TONE: Record<NvrAttendanceStatus, string> = {
  early: "#34D399",
  late: "#F59E0B",
  absent: "#FB7185",
  waiting: "#64748B",
};
const STATUS_LABEL: Record<NvrAttendanceStatus, string> = {
  early: "Erta keldi",
  late: "Kech qoldi",
  absent: "Kelmadi",
  waiting: "Kutilmoqda",
};

export function AttendanceDrilldown({
  rows,
  day,
  from,
  to,
  points,
  todayDone,
  onSelectDay,
  onOpenEvent,
  onOpenSettings,
}: {
  rows: NvrAttendanceRow[];
  day: string;
  /**
   * Sahifaning davr chegaralari — kalendar shu oraliqdan tashqariga
   * chiqmaydi. `from === to` bo'lsa (masalan "Bugun") kalendar UMUMAN
   * chizilmaydi — tanlaydigan boshqa kun yo'q.
   */
  from: string;
  to: string;
  /** Davr bo'yicha kunlik jamlanma — kalendar kunlarini bo'yash uchun
   *  (`useNvrAttendanceRange().points`, "Kunlar bo'yicha" jadvali bilan
   *  AYNI manba, qo'shimcha so'rov yo'q). */
  points: AttendanceDayPoint[];
  /**
   * BUGUNGI kun davomati YAKUNLANDIMI (`/attendance` → `deadline_passed`).
   *
   * ⚠️ Kalendarda bugungi katak SHUNGA qarab bo'yaladi: kun tugamagan
   * bo'lsa hali kelmaganlar "kelmadi" emas, ular yo'lda bo'lishi
   * mumkin — foiz past chiqib katak QIZIL bo'lardi (2026-09-14,
   * foydalanuvchi so'rovi: "kalendarni bugungi kun uchun to'g'rila").
   */
  todayDone: boolean;
  /** Kalendarda kun bosilsa — `StatAttendance.tsx`dagi `setDay`. */
  onSelectDay: (date: string) => void;
  /** Qator bosilsa — "Ro'yxat" jadvalidagi bilan AYNI dossiye (`EventDossier`). */
  onOpenEvent: (eventId: number) => void;
  /** "Davomat vaqtini o'zgartirish" — ilgari "Toifalar kesimi" sarlavhasida edi. */
  onOpenSettings: () => void;
}) {
  const t = useT();
  const n = (v: number) => fmt(v, t.locale);

  const [slice, setSlice] = useState<NvrAttendanceStatus | null>(null);
  const [roleTile, setRoleTile] = useState<RoleTile>(null);
  const [klass, setKlass] = useState<string | null>(null);
  const [classSort, setClassSort] = useState<ClassSort>("class-asc");
  /**
   * 🔵 KALENDAR ochiq/yopiq (2026-09-10, foydalanuvchi so'rovi):
   * bo'lak bosilganda kalendar kichrayib chap-yuqoridagi tugmaga
   * aylanadi, tugma bosilsa yana to'liq ko'rinishga qaytadi —
   * `slice`dan MUSTAQIL holat (drilldown ochiq turgan holda ham
   * kalendarni qayta ochish mumkin).
   */
  const [calendarOpen, setCalendarOpen] = useState(true);
  const showCalendar = from !== to;

  /* Kun almashsa (masalan kalendardan boshqa kun tanlansa) chuqurlashuv
     boshiga qaytadi — eski sinf/toifa yangi kunda ma'nosiz qolib
     ketmasin, kalendar ham qaytadan ochiladi (davr o'zgargan bo'lishi
     mumkin). */
  useEffect(() => {
    setSlice(null);
    setRoleTile(null);
    setKlass(null);
    setCalendarOpen(true);
  }, [day]);
  useEffect(() => setRoleTile(null), [slice]);
  useEffect(() => setKlass(null), [roleTile]);

  const counts = useMemo(() => {
    const c: Record<NvrAttendanceStatus, number> = { early: 0, late: 0, absent: 0, waiting: 0 };
    for (const r of rows) c[r.status]++;
    return c;
  }, [rows]);

  const pieData: DonutSlice[] = [
    { id: "early", label: STATUS_LABEL.early, value: counts.early, color: STATUS_TONE.early },
    { id: "late", label: STATUS_LABEL.late, value: counts.late, color: STATUS_TONE.late },
    { id: "absent", label: STATUS_LABEL.absent, value: counts.absent, color: STATUS_TONE.absent },
  ];
  const totalKnown = counts.early + counts.late + counts.absent;

  /** Tanlangan bo'lakka tegishli qatorlar — pastdagi HAMMA chuqurlashuv shundan. */
  const sliceRows = useMemo(() => (slice ? rows.filter((r) => r.status === slice) : []), [rows, slice]);

  const roleCounts = useMemo(() => {
    let student = 0;
    let teacher = 0;
    for (const r of sliceRows) {
      if (r.role === "student") student++;
      else if (r.role === "teacher") teacher++;
    }
    return { student, teacher };
  }, [sliceRows]);

  /** Sinf kartochkalari — nom + shu bo'lakdagi son, tanlangan tartibda. */
  const classRows = useMemo(() => {
    if (roleTile !== "student") return [];
    const map = new Map<string, number>();
    for (const r of sliceRows) {
      if (r.role !== "student") continue;
      const name = r.note ?? r.role_label;
      map.set(name, (map.get(name) ?? 0) + 1);
    }
    const list = [...map.entries()].map(([name, count]) => ({ name, count }));
    if (classSort === "class-asc") list.sort((a, b) => classOrder(a.name) - classOrder(b.name));
    else if (classSort === "class-desc") list.sort((a, b) => classOrder(b.name) - classOrder(a.name));
    else list.sort((a, b) => b.count - a.count);
    return list;
  }, [sliceRows, roleTile, classSort]);

  /** Rol bo'yicha ro'yxat — O'qituvchi tanlanganda (Xodim — manbasiz). */
  const roleRoster = useMemo(
    () => (roleTile === "teacher" ? sliceRows.filter((r) => r.role === "teacher") : []),
    [sliceRows, roleTile]
  );
  /** Tanlangan sinf ro'yxati. */
  const classRoster = useMemo(
    () => (klass ? sliceRows.filter((r) => r.role === "student" && (r.note ?? r.role_label) === klass) : []),
    [sliceRows, klass]
  );

  /* AnimatePresence `key` — chuqurlashuv darajasi o'zgarganda karta
     QAYTA suzib kirsin (o'tish sezilsin), shunchaki mazmun almashmasin
     (`MapDetailOverlay.tsx`dagi bilan AYNI naqsh). */
  const panelKey = slice == null ? "none" : `${slice}:${roleTile ?? ""}:${klass ?? ""}`;

  return (
    <StatPanel
      title="Bugungi holat"
      hint={`${day} · bo'lakni bosing`}
      right={
        <button
          type="button"
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 hover:bg-white/[0.08]"
        >
          <Gear size={13} />
          Davomat vaqtini o&apos;zgartirish
        </button>
      }
    >
      {totalKnown === 0 ? (
        <p className="py-10 text-center text-[12px] text-slate-500">Bu kun uchun davomat qaydi yo&apos;q.</p>
      ) : (
        <div className="flex flex-col items-center gap-5 md:flex-row md:items-center">
          {/* ── KALENDAR — chap tomonda, bo'lak tanlansa TUGMAGA aylanadi ── */}
          {showCalendar &&
            (calendarOpen ? (
              <AttendanceCalendarWidget
                from={from}
                to={to}
                day={day}
                points={points}
                todayDone={todayDone}
                onPick={onSelectDay}
              />
            ) : (
              <button
                type="button"
                onClick={() => setCalendarOpen(true)}
                className="flex flex-none items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-400/[0.06] px-2.5 py-1.5 text-[11px] font-semibold text-cyan-200 shadow-[0_0_12px_-4px_rgba(34,211,238,0.55)] transition-all hover:border-cyan-300/60 hover:bg-cyan-400/[0.12] hover:shadow-[0_0_16px_-2px_rgba(34,211,238,0.7)]"
              >
                <CalendarBlank size={13} />
                Kalendarni ko&apos;rish
              </button>
            ))}

          {/* ── HALQA — to'liq bo'sh joyni EGALLAYDI, bo'lak tanlansa
              kichrayadi (2026-09-10, foydalanuvchi so'rovi: "height bo'sh
              bo'lib qolyabdi ... pie chart kattaroq bo'lsin"). `flex-1` —
              qolgan butun kengliqni oladi, `Donut3D`ning ICHKI `maxWidth`
              (`size`) uni yuqoridan cheklaydi. */}
          <motion.div layout className="min-w-0 flex-1" transition={{ type: "spring", stiffness: 260, damping: 30 }}>
            <Donut3D
              data={pieData}
              size={slice ? 320 : showCalendar ? 720 : 860}
              format={n}
              caption="jami"
              onSelect={(s) => {
                setSlice(s.id as NvrAttendanceStatus);
                setCalendarOpen(false);
              }}
            />
          </motion.div>

          {/* ── KARTA — o'ngdan suzib kiradi ── */}
          <AnimatePresence mode="wait">
            {slice && (
              <motion.div
                key={panelKey}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 40 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="min-h-[320px] w-full min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3"
              >
                {/* Sarlavha qatori — orqaga tugmasi darajaga qarab */}
                <div className="mb-3 flex items-center gap-2">
                  {roleTile != null ? (
                    <button
                      type="button"
                      onClick={() => setRoleTile(null)}
                      className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 transition-colors hover:border-ice/30 hover:text-ice-bright"
                    >
                      <CaretLeft size={11} weight="bold" />
                      Toifalar
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSlice(null)}
                      className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 transition-colors hover:border-ice/30 hover:text-ice-bright"
                    >
                      <CaretLeft size={11} weight="bold" />
                      Halqa
                    </button>
                  )}
                  <span className="text-[12.5px] font-bold" style={{ color: STATUS_TONE[slice] }}>
                    {STATUS_LABEL[slice]}
                  </span>
                  <span className="font-mono text-[10.5px] text-slate-500">{n(sliceRows.length)} ta</span>
                  {klass && (
                    <>
                      <button
                        type="button"
                        onClick={() => setKlass(null)}
                        className="ml-2 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[10.5px] font-semibold text-slate-300 hover:text-ice-bright"
                      >
                        ◀ Sinflar
                      </button>
                      <span className="text-[11.5px] font-bold text-white">{klass}</span>
                    </>
                  )}
                </div>

                {/* ── DARAJA 1: TOIFA KARTOCHKALARI ── */}
                {roleTile == null && (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <RoleTileCard
                      Icon={ChalkboardTeacher}
                      label="O'qituvchi"
                      count={roleCounts.teacher}
                      tone="#A78BFA"
                      onPick={() => setRoleTile("teacher")}
                    />
                    <RoleTileCard Icon={Briefcase} label="Xodimlar" count={null} tone="#F59E0B" onPick={undefined} />
                    <RoleTileCard
                      Icon={Student}
                      label="Sinflar"
                      count={roleCounts.student}
                      tone="#34D399"
                      onPick={() => setRoleTile("student")}
                    />
                  </div>
                )}

                {/* ── DARAJA 2a: O'QITUVCHI RO'YXATI ── */}
                {roleTile === "teacher" && (
                  <div className="max-h-[420px] space-y-1 overflow-y-auto">
                    {roleRoster.length === 0 ? (
                      <p className="py-8 text-center text-[11.5px] text-slate-500">Bu bo&apos;lakda o&apos;qituvchi yo&apos;q.</p>
                    ) : (
                      roleRoster.map((r) => <DrilldownRow key={r.person_id} r={r} onOpen={() => r.event_id && onOpenEvent(r.event_id)} />)
                    )}
                  </div>
                )}

                {/* ── DARAJA 2b: SINF KARTOCHKALARI (saralanadigan) ── */}
                {roleTile === "student" && klass == null && (
                  <>
                    <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
                      <TabPill group="drill-class-sort" active={classSort === "class-asc"} onClick={() => setClassSort("class-asc")}>
                        Sinf ↑
                      </TabPill>
                      <TabPill group="drill-class-sort" active={classSort === "class-desc"} onClick={() => setClassSort("class-desc")}>
                        Sinf ↓
                      </TabPill>
                      <TabPill group="drill-class-sort" active={classSort === "count"} onClick={() => setClassSort("count")}>
                        Ko&apos;p → kam
                      </TabPill>
                    </div>
                    {classRows.length === 0 ? (
                      <p className="py-8 text-center text-[11.5px] text-slate-500">Bu bo&apos;lakda o&apos;quvchi yo&apos;q.</p>
                    ) : (
                      <div className="grid max-h-[380px] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
                        {classRows.map((c) => (
                          <DrillClassCard key={c.name} name={c.name} count={c.count} tone={STATUS_TONE[slice]} onPick={() => setKlass(c.name)} />
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* ── DARAJA 3: SINF O'QUVCHILARI ── */}
                {klass != null && (
                  <div className="max-h-[380px] space-y-1 overflow-y-auto">
                    {classRoster.map((r) => (
                      <DrilldownRow key={r.person_id} r={r} onOpen={() => r.event_id && onOpenEvent(r.event_id)} />
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </StatPanel>
  );
}

function RoleTileCard({
  Icon,
  label,
  count,
  tone,
  onPick,
}: {
  Icon: typeof Student;
  label: string;
  /** `null` — manba yo'q (Xodimlar — kuzatuv posti bu toifani bilmaydi). */
  count: number | null;
  tone: string;
  onPick: (() => void) | undefined;
}) {
  const disabled = onPick == null;
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={disabled}
      title={disabled ? "Kuzatuv postida «xodim» toifasi yo'q — faqat o'quvchi va o'qituvchi" : undefined}
      style={{ ["--c" as string]: tone }}
      className={`group flex flex-col items-start gap-1.5 rounded-xl border px-3.5 py-3 text-left transition-colors ${
        disabled
          ? "cursor-not-allowed border-white/[0.06] bg-white/[0.02] opacity-60"
          : "border-white/[0.08] bg-white/[0.03] hover:border-[color:var(--c)]/40 hover:bg-[color:var(--c)]/[0.08]"
      }`}
    >
      <span className="flex w-full items-center gap-2">
        <span className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-[color:var(--c)]/15 text-[color:var(--c)]">
          <Icon size={15} weight="duotone" />
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-white">{label}</span>
        {!disabled && <CaretRight size={12} className="flex-none text-slate-500 transition-colors group-hover:text-[color:var(--c)]" />}
      </span>
      <span className="font-mono text-[20px] font-bold leading-none text-[color:var(--c)]">{count ?? "—"}</span>
      {disabled && <span className="text-[9px] leading-snug text-slate-500">manba yo&apos;q</span>}
    </button>
  );
}

function DrillClassCard({ name, count, tone, onPick }: { name: string; count: number; tone: string; onPick: () => void }) {
  return (
    <button
      type="button"
      onClick={onPick}
      title={`${name} — o'quvchilar ro'yxati`}
      className="group flex flex-col gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-left transition-colors hover:border-white/20 hover:bg-white/[0.06]"
    >
      <span className="flex w-full items-center gap-1.5">
        <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-white">{name}</span>
        <CaretRight size={12} className="flex-none text-slate-500 transition-colors group-hover:text-ice-bright" />
      </span>
      <span className="font-mono text-[19px] font-extrabold leading-none" style={{ color: tone }}>
        {count}
      </span>
    </button>
  );
}

const pad2 = (v: number) => String(v).padStart(2, "0");

/** `"YYYY-MM"` → bir oy oldingi/keyingi `"YYYY-MM"`. */
function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

/** Davomat foizi bo'yicha rang — `TONE` (`StatAttendance.tsx`) bilan bir xil mantiq. */
function rateTone(rate: number | null): string {
  if (rate == null) return "#475569";
  if (rate >= 80) return "#34D399";
  if (rate >= 50) return "#F59E0B";
  return "#FB7185";
}

/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  KALENDAR — "Bugungi holat" chap tomonida, sana tanlash uchun         ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * Oy panjarasi `FaceHistoryModal.tsx`dagi `AttendanceCalendar` bilan BIR
 * XIL geometriya (`shiftMonth`/oy panjarasi qurilishi), lekin RANGI
 * boshqacha: u yerda BITTA shaxsning kunlik holati (keldi/kelmadi),
 * bu yerda esa BUTUN kunning davomat FOIZI (`AttendanceDayPoint`) — ikki
 * xil ma'no, shuning uchun umumiy komponent EMAS, alohida yozilgan.
 *
 * ⚠️ Oraliqdan (`from`/`to`) tashqaridagi kunlar bosilmaydi — kalendar
 * faqat SAHIFANING joriy davr tanloviga tegishli sanalarni ko'rsatadi.
 */
function AttendanceCalendarWidget({
  from,
  to,
  day,
  points,
  todayDone,
  onPick,
}: {
  from: string;
  to: string;
  day: string;
  points: AttendanceDayPoint[];
  /** Bugungi kun davomati yakunlandimi (`deadline_passed`). */
  todayDone: boolean;
  onPick: (date: string) => void;
}) {
  const t = useT();
  const firstMonth = from.slice(0, 7);
  const lastMonth = to.slice(0, 7);
  const [month, setMonth] = useState(lastMonth);
  /* Davr o'zgarsa (masalan "Hafta" → "Oy") ko'rsatilayotgan oy yangi
     chegaradan tashqarida qolib ketmasin. */
  const shown = month < firstMonth ? firstMonth : month > lastMonth ? lastMonth : month;

  const [y, m] = shown.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const firstWeekday = (new Date(y, m - 1, 1).getDay() + 6) % 7;
  const prevMonthDays = new Date(y, m - 1, 0).getDate();
  const canPrev = shown > firstMonth;
  const canNext = shown < lastMonth;

  const cells: { day: number; kind: "prev" | "cur" | "next" }[] = [
    ...Array.from({ length: firstWeekday }, (_, i) => ({ day: prevMonthDays - firstWeekday + i + 1, kind: "prev" as const })),
    ...Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, kind: "cur" as const })),
  ];
  const trail = (7 - (cells.length % 7)) % 7;
  for (let i = 0; i < trail; i++) cells.push({ day: i + 1, kind: "next" });

  const byDate = useMemo(() => new Map(points.map((p) => [p.date, p])), [points]);
  /* "Bugun" — SERVER zonasidan (`attDay`), brauzer soatidan emas. */
  const today = attDay();
  const monthLabel = t.chart.months[m - 1] ? `${t.chart.months[m - 1][0].toUpperCase()}${t.chart.months[m - 1].slice(1)}` : shown;

  const navBtn =
    "grid h-7 w-7 flex-none place-items-center rounded-full border border-cyan-400/35 bg-cyan-400/[0.08] text-cyan-300 " +
    "shadow-[0_0_10px_-3px_rgba(34,211,238,0.65)] transition-all hover:border-cyan-300/65 hover:bg-cyan-400/[0.16] " +
    "hover:shadow-[0_0_14px_-1px_rgba(34,211,238,0.85)] disabled:opacity-20 disabled:shadow-none disabled:hover:bg-cyan-400/[0.08]";

  /* 🔵 FUTURISTIK NEON KO'RINISH (2026-09-10, foydalanuvchi so'rovi:
     "kelendarni futuristik neon qilib designni yaxshilashimiz kerak").
     Qorong'i shisha fon + yuqori chegarada ingichka siyanit chiziq +
     har kun katagi o'z davomat rangida YENGIL PORLAYDI (`boxShadow`),
     tanlangan kun esa kuchliroq halqa bilan ajratiladi — oddiy tekis
     fon o'rniga "HUD panel" taassuroti. */
  return (
    <div className="relative w-full flex-none overflow-hidden rounded-2xl border border-cyan-400/25 bg-gradient-to-b from-[#0A1626] to-[#060A14] p-3.5 shadow-[0_0_28px_-8px_rgba(34,211,238,0.4),inset_0_1px_0_rgba(255,255,255,0.05)] md:w-[300px]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent" />
      <div className="mb-3 flex items-center justify-between">
        <button type="button" disabled={!canPrev} onClick={() => setMonth(shiftMonth(shown, -1))} title="Oldingi oy" className={navBtn}>
          <CaretLeft size={12} weight="bold" />
        </button>
        <p
          className="text-[12px] font-bold uppercase tracking-[0.14em] text-cyan-200"
          style={{ textShadow: "0 0 14px rgba(34,211,238,0.45)" }}
        >
          {monthLabel} <span className="text-slate-500">{y}</span>
        </p>
        <button type="button" disabled={!canNext} onClick={() => setMonth(shiftMonth(shown, 1))} title="Keyingi oy" className={navBtn}>
          <CaretRight size={12} weight="bold" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-1.5">
        {t.chart.weekdays.map((w) => (
          <span key={w} className="pb-1 text-center text-[8.5px] font-bold uppercase tracking-wide text-cyan-400/50">
            {w.slice(0, 2)}
          </span>
        ))}
        {cells.map(({ day: d, kind }, i) => {
          if (kind !== "cur") {
            return (
              <div key={`${kind}-${i}`} className="flex items-center justify-center">
                <span className="grid h-8 w-8 place-items-center font-mono text-[9.5px] text-slate-700/60">{d}</span>
              </div>
            );
          }
          const dateStr = `${shown}-${pad2(d)}`;
          const inRange = dateStr >= from && dateStr <= to;
          const p = byDate.get(dateStr);
          /* 🔵 **DAM OLISH KUNI — RANGSIZ** (2026-09-13, foydalanuvchi
             so'rovi: "yakshanba kungi davomatlarni ransiz qilib ularni
             umumiy hisobdan chiqarib tash"). O'sha kuni hamma `waiting`
             holatida turadi, ya'ni foiz DOIM `0%` chiqib katak QIZIL
             bo'lardi — go'yo butun maktab kelmagandek. Endi rang ham,
             foiz ham chizilmaydi: katak neytral kulrang.
             `is_weekend` — SERVER bergan sozlama (`/attendance/settings`
             dagi `weekend`), taxmin emas. */
          const weekend = p?.isWeekend ?? false;
          /* 🔵 **BUGUN — KUN TUGAMAGUNCHA BAHOLANMAYDI** (2026-09-14,
             foydalanuvchi so'rovi: "kalendarni bugungi kun uchun
             to'g'rila"). Kun o'rtasida hali kelmaganlar "kelmadi" emas —
             ular yo'lda bo'lishi mumkin, `absent_after` vaqti hali
             o'tmagan. Shunday paytda foiz past chiqib katak QIZIL
             bo'lardi, ya'ni "bugun davomat yomon" degan YOLG'ON xulosa
             ko'rinardi. Server `deadline_passed` bergandan keyin katak
             odatdagidek bo'yaladi. */
          const isToday = dateStr === today;
          const pending = isToday && !todayDone;
          const rate = !weekend && !pending && p && p.total > 0 ? Math.round((p.present / p.total) * 100) : null;
          const tone = rateTone(inRange && !weekend && !pending ? rate : null);
          const isSelected = dateStr === day;
          /* Rangsiz katak: oraliqdan tashqarida, dam olish kuni YOKI
             hali tugamagan bugungi kun. */
          const plain = !inRange || weekend || pending;
          return (
            <div key={dateStr} className="flex items-center justify-center">
              <button
                type="button"
                disabled={!inRange}
                onClick={() => onPick(dateStr)}
                title={
                  !inRange
                    ? undefined
                    : weekend
                      ? `${dateStr} — dam olish kuni`
                      : pending
                        ? `${dateStr} — bugun, kun hali tugamagan`
                        : rate != null
                          ? `${dateStr} — ${rate}% davomat`
                          : dateStr
                }
                className="grid h-8 w-8 place-items-center rounded-lg font-mono text-[10px] font-bold transition-all hover:brightness-125 disabled:cursor-default"
                style={{
                  color: !inRange ? "#334155" : weekend ? "#64748B" : pending ? "#93C5FD" : "#fff",
                  background: !inRange
                    ? "transparent"
                    : weekend
                      ? "rgba(255,255,255,0.035)"
                      : pending
                        ? "rgba(56,189,248,0.10)"
                        : `color-mix(in srgb, ${tone} 20%, #0B1220)`,
                  border: !inRange
                    ? "1px solid transparent"
                    : weekend
                      ? "1px solid rgba(255,255,255,0.08)"
                      : pending
                        ? "1px solid rgba(56,189,248,0.45)"
                        : `1px solid color-mix(in srgb, ${tone} 45%, transparent)`,
                  /* BUGUN doim ajralib turadi (tanlangan bo'lmasa ham) —
                     kalendarda "qaysi kun bugun" savoli birinchi. */
                  boxShadow: pending
                    ? isSelected
                      ? "0 0 0 1.5px #38BDF8, 0 0 16px 1px rgba(56,189,248,0.5)"
                      : "0 0 0 1px rgba(56,189,248,0.5)"
                    : plain
                      ? isSelected && inRange
                        ? "0 0 0 1.5px rgba(148,163,184,0.6)"
                        : undefined
                      : isSelected
                        ? `0 0 0 1.5px ${tone}, 0 0 16px 1px color-mix(in srgb, ${tone} 75%, transparent)`
                        : isToday
                          ? `0 0 0 1px #38BDF8, 0 0 8px -2px color-mix(in srgb, ${tone} 65%, transparent)`
                          : `0 0 8px -2px color-mix(in srgb, ${tone} 65%, transparent)`,
                }}
              >
                {d}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DrilldownRow({ r, onOpen }: { r: NvrAttendanceRow; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={r.event_id == null}
      title={r.event_id != null ? `${r.full_name} — hodisa ma'lumotlari` : r.full_name}
      className="flex w-full items-center gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-left transition-colors hover:border-ice/30 hover:bg-ice/[0.06] disabled:cursor-default disabled:hover:border-white/[0.06] disabled:hover:bg-white/[0.02]"
    >
      <LibraryPhoto
        personId={r.person_id}
        name={r.full_name}
        size={0}
        className="h-8 w-8 flex-none rounded-md object-cover ring-1 ring-white/10"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[11.5px] font-semibold text-slate-100">{r.full_name}</span>
        <span className="block truncate text-[9px] text-slate-500">{r.note ?? r.role_label}</span>
      </span>
      <span className="flex-none font-mono text-[10.5px] text-slate-400">{r.time || "—"}</span>
    </button>
  );
}
