"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Briefcase,
  CaretLeft,
  CaretRight,
  ChalkboardTeacher,
  Gear,
  Info,
  MagnifyingGlass,
  Student,
  X,
} from "@phosphor-icons/react";
import { Donut3D, type DonutSlice } from "@/components/common/Donut3D";
import { StatPanel, fmt } from "@/components/common/panels";
import { LibraryPhoto, classOrder } from "@/components/people/FaceDatabasePage";
import { useT } from "@/i18n";
import type { NvrAttendanceRow, NvrAttendanceStatus } from "@/lib/nvr/nvrApi";
import { attDay, type AttendanceDayPoint } from "@/hooks/useNvrAttendance";
import { dayMonthLongLabel, weekdayLongLabel } from "@/lib/dateLabel";
import { EmptyState } from "@/components/common/EmptyState";

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
 * 🔴 **2026-10-24 — QAYTA QURILDI (UX tahlili).** Yuqoridagi "bo'lak
 * bosilmaguncha o'ng tomon bo'sh" oqimi bekor: o'ngda DOIM SINFLAR JADVALI
 * (o'qituvchilar guruhi tepada, har qatorda jami/erta/kech/kelmadi/
 * davomat %), halqa bo'lagi bosilsa jadval shu holat bo'yicha FILTRLANADI
 * (soni + sinf ichidagi ulushi), qator bosilsa — ro'yxat. Toifa/sinf
 * KARTOCHKALARI (`RoleTileCard`/`DrillClassCard`) o'chirildi. Halqa endi
 * TEKIS (`Donut3D` `flat` default). Kalendar DOIM ochiq, ostida davr va
 * rang izohi. Sarlavha — bitta qator ("Tanlangan sana: 24-oktabr 2026
 * (Shanba)"), takror sana/ISO yo'q.
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

type ClassSort = "class-asc" | "class-desc" | "count" | "rate";

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
  rows: countedRows,
  rawRows,
  excludedPrimary = 0,
  day,
  from,
  to,
  points,
  todayDone,
  onSelectDay,
  onOpenEvent,
  onOpenSettings,
  showCalendar: showCalendarProp = true,
  below,
}: {
  rows: NvrAttendanceRow[];
  /** Qoida qo'llanMAGAN to'liq ro'yxat — "1–4-sinflarni ham ko'rsatish" uchun. */
  rawRows?: NvrAttendanceRow[];
  /** Shanba kuni qoida bilan chiqarilgan 1–4-sinf o'quvchilari soni. */
  excludedPrimary?: number;
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
  /** Kalendar shu panel ICHIDA chizilsinmi (default). `false` — chaqiruvchi uni
   *  boshqa joyda (`AttendanceCalendarWidget`) chizadi — 2026-10-24, Davomat
   *  tabida bo'sh joy ko'p edi: kalendar pastga, "Kunlik davomat" yoniga tushdi. */
  showCalendar?: boolean;
  /** Halqa OSTIGA qo'yiladigan blok (Davomat tabi: `DailyAttendancePanel embedded`). */
  below?: ReactNode;
}) {
  const t = useT();
  const d = t.stats.drill;
  const n = (v: number) => fmt(v, t.locale);

  /* ── HOLAT ──
     `slice` — halqada tanlangan holat (null — hammasi);
     `group` — o'ng jadvalda tanlangan qator (sinf nomi yoki `TEACHERS`),
     tanlansa jadval o'rnida RO'YXAT chiqadi. */
  const [slice, setSlice] = useState<NvrAttendanceStatus | null>(null);
  const [group, setGroup] = useState<string | null>(null);
  const [sort, setSort] = useState<ClassSort>("class-asc");
  const [search, setSearch] = useState("");
  /* 🔵 1–4-SINFLAR SHANBA (2026-10-24): hookda ular hisobdan CHIQARILGAN
     (`lib/nvr/attendanceRules.ts`); bu yerda faqat KO'RSATISH tanlovi —
     belgilansa jadval/ro'yxatda ko'rinadi, lekin halqa/KPI/jami o'zgarmaydi
     (izoh ochiq yoziladi). */
  const [showPrimary, setShowPrimary] = useState(false);
  const rows = showPrimary && rawRows ? rawRows : countedRows;
  const showCalendar = from !== to && showCalendarProp;

  /* Kun almashsa chuqurlashuv boshiga qaytadi — eski sinf/holat yangi
     kunda ma'nosiz qolib ketmasin. */
  useEffect(() => {
    setSlice(null);
    setGroup(null);
  }, [day]);

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

  /**
   * 🔵 **O'NG TOMON DOIM TO'LDIRILGAN (2026-10-24, UX tahlili 1-band).**
   * Ilgari halqa bo'lagi bosilmaguncha o'ng yarim ekran BO'SH turardi
   * ("bo'lakni bosing"). Endi SAHIFA OCHILISHI BILAN o'ngda SINFLAR
   * JADVALI: har sinf (va o'qituvchilar guruhi) uchun jami / erta / kech /
   * kelmadi / davomat %. Halqa bo'lagi bosilsa AYNI jadval shu holat
   * bo'yicha FILTRLANADI (soni + sinf ichidagi ulushi), qator bosilsa —
   * o'sha guruhning ro'yxati. Manba — o'sha `rows`, qo'shimcha so'rov yo'q.
   */
  const groups = useMemo(() => {
    const map = new Map<string, GroupStat>();
    const bump = (key: string, label: string, kind: GroupStat["kind"], r: NvrAttendanceRow) => {
      let g = map.get(key);
      if (!g) {
        g = { key, label, kind, total: 0, early: 0, late: 0, absent: 0, waiting: 0 };
        map.set(key, g);
      }
      g.total++;
      g[r.status]++;
    };
    for (const r of rows) {
      if (r.role === "teacher") bump(TEACHERS, d.teachers, "teacher", r);
      else bump(r.note ?? r.role_label, r.note ?? r.role_label, "class", r);
    }
    const list = [...map.values()];
    const inSlice = (g: GroupStat) => (slice ? g[slice] : g.total);
    const rate = (g: GroupStat) => (g.total ? (g.early + g.late) / g.total : 0);
    const byClass = (a: GroupStat, b: GroupStat) => classOrder(a.label) - classOrder(b.label);
    if (sort === "class-asc") list.sort(byClass);
    else if (sort === "class-desc") list.sort((a, b) => byClass(b, a));
    else if (sort === "rate") list.sort((a, b) => rate(a) - rate(b) || byClass(a, b));
    else list.sort((a, b) => (slice ? inSlice(b) - inSlice(a) : b.absent - a.absent) || byClass(a, b));
    /* O'qituvchilar DOIM tepada — sinf emas, alohida toifa */
    const teachers = list.filter((g) => g.kind === "teacher");
    const out = [...teachers, ...list.filter((g) => g.kind !== "teacher")];
    const q = search.trim().toLowerCase();
    return q ? out.filter((g) => g.label.toLowerCase().includes(q)) : out;
  }, [rows, slice, sort, search, d.teachers]);

  /** Tanlangan guruh + holat bo'yicha ro'yxat. */
  const roster = useMemo(() => {
    if (group == null) return [];
    return rows.filter((r) => {
      if (slice && r.status !== slice) return false;
      return group === TEACHERS ? r.role === "teacher" : r.role !== "teacher" && (r.note ?? r.role_label) === group;
    });
  }, [rows, group, slice]);
  const sliceTotal = slice ? counts[slice] : rows.length;
  const groupLabel = group === TEACHERS ? d.teachers : group;

  /** Qaydsiz kunda "qaytish" manzili — davrdagi qaydi bor OXIRGI ish kuni
   *  (yo'q bo'lsa davr oxiri). Tanlangan kunning o'zi bo'lsa tugma chiqmaydi. */
  const dayPoint = points.find((p) => p.date === day);
  const backTarget = useMemo(() => {
    const worked = points
      .filter((p) => !p.isWeekend && p.early + p.late + p.absent > 0)
      .map((p) => p.date)
      .sort();
    const target = worked[worked.length - 1] ?? to;
    return target && target !== day ? target : null;
  }, [points, to, day]);

  const panelKey = `${slice ?? "all"}:${group ?? ""}`;
  /* Panel sarlavhasi uchun — tanlangan kun bugunmi (server soati bo'yicha). */
  const isTodayDay = day === attDay();
  const dayDate = useMemo(() => new Date(`${day}T00:00:00`), [day]);
  const dayText = `${dayMonthLongLabel(dayDate, t)} ${dayDate.getFullYear()} (${weekdayLongLabel(dayDate, t)})`;

  return (
    <StatPanel
      /* 2026-10-24 (UX tahlili 2-band): sarlavha BITTA toza qator —
         "Tanlangan sana: 24-oktabr 2026 (Shanba)"; bugun bo'lsa tepadagi
         `TodayStateHeading` allaqachon aytgan, bu yerda takrorlanmaydi.
         ISO sana faqat `title`da. */
      title={isTodayDay ? t.stats.todayState.label : t.stats.todayState.selectedDate}
      hint={isTodayDay ? d.filterHint : `${dayText} · ${d.filterHint}`}
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
      {/* ⚠️ Qaydsiz kunda (dam olish kuni, kamera hech kimni tanimagan) ham
          KALENDAR va QAYTISH tugmasi qoladi (2026-10-19, foydalanuvchi
          so'rovi). Ilgari bo'sh xabar butun panelni — kalendarni ham —
          almashtirib yuborardi va boshqa kunni tanlashning yo'li qolmasdi. */}
      {/* TARTIB (2026-10-24, "bo'sh joylari ko'p ... yuqoriga dumaloq grafikaga
          qo'shib"): CHAP ustun — [kalendar | halqa] qatori, ostida `below`
          ("Kunlik davomat", embedded); O'NG ustun — sinflar jadvali. */}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(380px,540px)]">
        <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-col items-stretch gap-4 md:flex-row md:items-start">
          {/* ── KALENDAR — chap tomonda, davr va rang izohi bilan ── */}
          {showCalendar && (
            <AttendanceCalendarWidget
              from={from}
              to={to}
              day={day}
              points={points}
              todayDone={todayDone}
              onPick={onSelectDay}
            />
          )}

          {/* ── HALQA — o'rtada, o'ng jadval doim ko'rinib turgani uchun
              o'rtacha o'lcham (ilgari 720–860 px, bo'lak bosilmaguncha
              butun joyni olardi). */}
          {totalKnown === 0 ? (
            <div className="flex min-h-[320px] min-w-0 flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-10 text-center">
              <p className="text-[13px] font-semibold text-slate-300">
                {dayPoint?.isWeekend ? "Dam olish kuni — davomat olinmaydi." : "Bu kun uchun davomat qaydi yo'q."}
              </p>
              <p className="max-w-sm text-[11.5px] leading-snug text-slate-500">
                {showCalendar
                  ? "Kalendardan boshqa kunni tanlang yoki oxirgi ish kuniga qayting."
                  : "Boshqa kunni ko'rish uchun yuqoridagi davr tanlovidan Hafta yoki Oy ni tanlang."}
              </p>
              {backTarget && (
                <button
                  type="button"
                  onClick={() => onSelectDay(backTarget)}
                  className="flex items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-400/[0.06] px-3 py-1.5 text-[11.5px] font-semibold text-cyan-200 transition-colors hover:border-cyan-300/60 hover:bg-cyan-400/[0.12]"
                >
                  <CaretLeft size={12} weight="bold" />
                  Oxirgi ish kuniga qaytish ({backTarget})
                </button>
              )}
            </div>
          ) : (
          <div className="flex min-w-0 flex-1 flex-col items-center justify-center">
            {/* 1–4-sinf shanba izohi — HALQA OLDIDA, qisqa matn (2026-10-26,
                foydalanuvchi: "pie chart oldiga qo'y, qisqaroq so'z bilan").
                Ilgari o'ng ustunda, saralash qatori ostida edi — halqa
                sonidan nega 261 kishi kam ekani halqaning o'zida ko'rinmasdi. */}
            {excludedPrimary > 0 && (
              <div className="mb-2 flex w-full flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-amber-400/25 bg-amber-400/[0.07] px-2.5 py-1.5 text-[10.5px] text-amber-200/90">
                <span className="flex items-center gap-1.5">
                  <Info size={12} weight="bold" className="flex-none" />
                  {d.primaryNote(n(excludedPrimary))}
                </span>
                {rawRows && (
                  <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-slate-300">
                    <input type="checkbox" checked={showPrimary} onChange={(e) => setShowPrimary(e.target.checked)} className="accent-amber-400" />
                    {d.showPrimary}
                  </label>
                )}
              </div>
            )}
            <Donut3D
              data={pieData}
              size={showCalendar ? 440 : 520}
              ring={0.26}
              format={n}
              caption="jami"
              onSelect={(s) => {
                const id = s.id as NvrAttendanceStatus;
                /* Bir xil bo'lak qayta bosilsa filtr bekor bo'ladi */
                setSlice((cur) => (cur === id ? null : id));
                setGroup(null);
              }}
            />
            {slice && (
              <button
                type="button"
                onClick={() => {
                  setSlice(null);
                  setGroup(null);
                }}
                className="mt-1 flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold"
                style={{ borderColor: `${STATUS_TONE[slice]}66`, color: STATUS_TONE[slice] }}
              >
                {STATUS_LABEL[slice]} · {n(counts[slice])}
                <span className="text-slate-500">×</span>
              </button>
            )}
          </div>
          )}
        </div>
        {below}
        </div>

          {/* ── O'NG JADVAL / RO'YXAT — DOIM ko'rinadi ──
              🔴 `AnimatePresence mode="wait"` OLIB TASHLANDI (2026-10-24,
              foydalanuvchi: "yashil/sariq bossam ishlamaydi, qizil bossam
              keyin chiqadi"). `mode="wait"` yangi panelni ESKISINING chiqish
              animatsiyasi tugaguncha ushlab turadi; bo'lak tez-tez
              almashganda (yoki chiqish bir sababdan tugamaganda) yangi panel
              UMUMAN chizilmay qolardi — faqat navbatdagi kalit almashuvi
              (sort/boshqa bo'lak) uni "uyg'otardi". Endi panel `key` bilan
              shunchaki QAYTA MOUNT bo'ladi va kirish animatsiyasi o'ynaydi —
              chiqish animatsiyasi yo'q, kutish ham yo'q. */}
            <motion.div
              key={panelKey}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="min-h-[320px] w-full min-w-0 flex-[1.3] rounded-xl border border-white/[0.08] bg-white/[0.03] p-3 lg:max-w-[560px]"
            >
              {/* Sarlavha qatori */}
              <div className="mb-2.5 flex flex-wrap items-center gap-2">
                {group != null && (
                  <button
                    type="button"
                    onClick={() => setGroup(null)}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 transition-colors hover:border-ice/30 hover:text-ice-bright"
                  >
                    <CaretLeft size={11} weight="bold" />
                    {d.classesTitle}
                  </button>
                )}
                <span className="text-[12.5px] font-bold text-white">{group != null ? groupLabel : d.classesTitle}</span>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{
                    color: slice ? STATUS_TONE[slice] : "#94A3B8",
                    background: slice ? `${STATUS_TONE[slice]}22` : "rgba(255,255,255,0.06)",
                  }}
                >
                  {slice ? STATUS_LABEL[slice] : d.all} · {n(group != null ? roster.length : sliceTotal)}
                </span>
              </div>
              {/* Qidiruv + SARALASH (select) — 2026-10-24, foydalanuvchi: "sortlarni
                  select qilishing kerak va qidirish". Ilgari to'rtta pilyula edi. */}
              {group == null && (
                <div className="mb-2.5 flex flex-wrap items-center gap-2">
                  <label className="hik-input flex h-8 min-w-[160px] flex-1 items-center gap-1.5 px-2.5 text-[11.5px]">
                    <MagnifyingGlass size={12} className="flex-none text-slate-500" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={d.search}
                      className="w-full bg-transparent text-slate-200 outline-none placeholder:text-slate-500"
                    />
                    {search && (
                      <button type="button" onClick={() => setSearch("")} className="text-slate-500 hover:text-slate-200">
                        <X size={11} />
                      </button>
                    )}
                  </label>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as ClassSort)}
                    title={d.sortLabel}
                    className="hik-input h-8 px-2.5 text-[11.5px] [color-scheme:dark] [&_option]:bg-ink-panel [&_option]:text-slate-100"
                  >
                    <option value="class-asc">{d.sortClass} ↑</option>
                    <option value="class-desc">{d.sortClass} ↓</option>
                    <option value="count">{slice ? d.sortCount : d.sortAbsent}</option>
                    {!slice && <option value="rate">{d.sortRate}</option>}
                  </select>
                </div>
              )}
              {/* ── JADVAL ──
                  🔵 2026-10-26, foydalanuvchi: "scroll qilma, to'liq hammasi
                  chiqishi kerak" — `max-h-[440px] overflow-y-auto` OLIB
                  TASHLANDI: barcha sinf qatorlari bir yo'la ko'rinadi, panel
                  o'z balandligida o'sadi (sahifa o'zi scroll bo'ladi).
                  `sticky` sarlavha ham olib tashlandi — ichki scroll yo'q,
                  sahifa scrollida u viewport tepasiga yopishib qolardi. */}
              {group == null && (
                <div>
                  <table className="w-full border-separate border-spacing-y-1 text-[11.5px]">
                    <thead className="bg-[#0B1220]/95 text-[9.5px] uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-2 py-1 text-left font-bold">{d.klass}</th>
                        <th className="px-2 py-1 text-right font-bold">{d.total}</th>
                        {slice ? (
                          <>
                            <th className="px-2 py-1 text-right font-bold" style={{ color: STATUS_TONE[slice] }}>
                              {d.count}
                            </th>
                            <th className="px-2 py-1 text-right font-bold" title={d.shareHint}>
                              {d.share}
                            </th>
                          </>
                        ) : (
                          <>
                            <th className="px-2 py-1 text-right font-bold" style={{ color: STATUS_TONE.early }}>{d.early}</th>
                            <th className="px-2 py-1 text-right font-bold" style={{ color: STATUS_TONE.late }}>{d.late}</th>
                            <th className="px-2 py-1 text-right font-bold" style={{ color: STATUS_TONE.absent }}>{d.absent}</th>
                            <th className="w-[96px] px-2 py-1 text-right font-bold">{d.rate}</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {groups.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-500"><EmptyState compact title={d.noRows} /></td>
                        </tr>
                      )}
                      {groups.map((g) => {
                        const inSlice = slice ? g[slice] : g.total;
                        const pct = g.total ? Math.round(((g.early + g.late) / g.total) * 100) : 0;
                        const share = g.total ? Math.round((inSlice / g.total) * 100) : 0;
                        return (
                          <tr
                            key={g.key}
                            onClick={() => inSlice > 0 && setGroup(g.key)}
                            className={`group/row ${inSlice > 0 ? "cursor-pointer" : "opacity-45"}`}
                            title={inSlice > 0 ? `${g.label} — ro'yxat` : undefined}
                          >
                            <td className="rounded-l-lg bg-white/[0.025] px-2 py-1.5 font-semibold text-slate-100 transition-colors group-hover/row:bg-white/[0.06]">
                              <span className="flex items-center gap-1.5">
                                {g.kind === "teacher" ? (
                                  <ChalkboardTeacher size={13} weight="duotone" className="text-violet-300" />
                                ) : (
                                  <Student size={13} weight="duotone" className="text-emerald-300" />
                                )}
                                {g.label}
                              </span>
                            </td>
                            <td className="bg-white/[0.025] px-2 py-1.5 text-right font-mono text-slate-300 group-hover/row:bg-white/[0.06]">{n(g.total)}</td>
                            {slice ? (
                              <>
                                <td className="bg-white/[0.025] px-2 py-1.5 text-right font-mono font-bold group-hover/row:bg-white/[0.06]" style={{ color: STATUS_TONE[slice] }}>
                                  {n(inSlice)}
                                </td>
                                <td className="rounded-r-lg bg-white/[0.025] px-2 py-1.5 text-right group-hover/row:bg-white/[0.06]">
                                  <ShareBar pct={share} tone={STATUS_TONE[slice]} />
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="bg-white/[0.025] px-2 py-1.5 text-right font-mono text-emerald-300 group-hover/row:bg-white/[0.06]">{n(g.early)}</td>
                                <td className="bg-white/[0.025] px-2 py-1.5 text-right font-mono text-amber-300 group-hover/row:bg-white/[0.06]">{n(g.late)}</td>
                                <td className="bg-white/[0.025] px-2 py-1.5 text-right font-mono text-rose-300 group-hover/row:bg-white/[0.06]">{n(g.absent)}</td>
                                <td className="rounded-r-lg bg-white/[0.025] px-2 py-1.5 text-right group-hover/row:bg-white/[0.06]">
                                  <ShareBar pct={pct} tone={rateTone(pct)} />
                                </td>
                              </>
                            )}
                          </tr>
                        );
                      })}
                      {/* Xodimlar — manba yo'q, ochiq yoziladi (son o'ylab topilmaydi) */}
                      <tr className="opacity-60" title={d.staffNone}>
                        <td className="rounded-l-lg bg-white/[0.02] px-2 py-1.5 text-slate-400">
                          <span className="flex items-center gap-1.5">
                            <Briefcase size={13} weight="duotone" className="text-amber-300/70" />
                            {d.staff}
                          </span>
                        </td>
                        <td colSpan={5} className="rounded-r-lg bg-white/[0.02] px-2 py-1.5 text-right text-[10px] text-slate-500">
                          {t.dashboard.ui.noSource}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* ── RO'YXAT (guruh tanlanganda) ── */}
              {group != null && (
                <div className="max-h-[440px] space-y-1 overflow-y-auto">
                  {roster.length === 0 ? (
                    <EmptyState className="py-8" title={d.emptyRoster} />
                  ) : (
                    roster.map((r) => <DrilldownRow key={r.person_id} r={r} onOpen={() => r.event_id && onOpenEvent(r.event_id)} />)
                  )}
                </div>
              )}
            </motion.div>
        </div>
    </StatPanel>
  );
}

/** O'qituvchilar guruhining kaliti (sinf nomi bilan to'qnashmasin). */
const TEACHERS = "__teachers__";

interface GroupStat {
  key: string;
  label: string;
  kind: "class" | "teacher";
  total: number;
  early: number;
  late: number;
  absent: number;
  waiting: number;
}

/** Foiz + ingichka chiziq — jadval katagida. */
function ShareBar({ pct, tone }: { pct: number; tone: string }) {
  return (
    <span className="inline-flex items-center justify-end gap-1.5">
      <span className="h-1 w-10 overflow-hidden rounded-full bg-white/[0.08]">
        <span className="block h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: tone }} />
      </span>
      <span className="w-8 font-mono text-[10.5px] font-bold" style={{ color: tone }}>
        {pct}%
      </span>
    </span>
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
export function AttendanceCalendarWidget({
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
    <div className="relative w-full flex-none overflow-hidden rounded-2xl border border-cyan-400/25 bg-gradient-to-b from-[#0A1626] to-[#060A14] p-4 shadow-[0_0_28px_-8px_rgba(34,211,238,0.4),inset_0_1px_0_rgba(255,255,255,0.05)] md:w-[360px]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent" />
      <div className="mb-3 flex items-center justify-between">
        <button type="button" disabled={!canPrev} onClick={() => setMonth(shiftMonth(shown, -1))} title="Oldingi oy" className={navBtn}>
          <CaretLeft size={12} weight="bold" />
        </button>
        <p
          className="text-[13.5px] font-bold uppercase tracking-[0.14em] text-cyan-200"
          style={{ textShadow: "0 0 14px rgba(34,211,238,0.45)" }}
        >
          {monthLabel} <span className="text-slate-500">{y}</span>
        </p>
        <button type="button" disabled={!canNext} onClick={() => setMonth(shiftMonth(shown, 1))} title="Keyingi oy" className={navBtn}>
          <CaretRight size={12} weight="bold" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-2">
        {t.chart.weekdays.map((w) => (
          <span key={w} className="pb-1 text-center text-[10px] font-bold uppercase tracking-wide text-cyan-400/50">
            {w.slice(0, 2)}
          </span>
        ))}
        {cells.map(({ day: d, kind }, i) => {
          if (kind !== "cur") {
            return (
              <div key={`${kind}-${i}`} className="flex items-center justify-center">
                <span className="grid h-10 w-10 place-items-center font-mono text-[11px] text-slate-700/60">{d}</span>
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
                className="grid h-10 w-10 place-items-center rounded-lg font-mono text-[12px] font-bold transition-all hover:brightness-125 disabled:cursor-default"
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
                  /* 🔵 TANLANGAN KUN — IKKI QAVATLI OQ HALQA + kattalashgan katak
                     (2026-10-24, foydalanuvchi: "tanlangan sana sezilmayabdi").
                     Ilgari tanlov katakning O'Z rangidagi (sariq/qizil/ko'k)
                     halqa edi — davomat rangi va "bugun" halqasi bilan
                     qorishib, ko'zga tashlanmasdi. Endi tanlov rangdan
                     MUSTAQIL: oq halqa (qorong'i oraliq bilan) har qanday
                     katakda bir xil ko'rinadi, ustiga katak 12% kattaroq va
                     ostida kichik oq nuqta. BUGUN avvalgidek ko'k halqa bilan
                     ajralib turadi (tanlanmagan bo'lsa ham). */
                  boxShadow: isSelected && inRange
                    ? `0 0 0 2px #0B1220, 0 0 0 4px #F1F5F9, 0 0 18px 3px ${pending ? "rgba(56,189,248,0.45)" : plain ? "rgba(241,245,249,0.25)" : `color-mix(in srgb, ${tone} 70%, transparent)`}`
                    : pending
                      ? "0 0 0 1px rgba(56,189,248,0.5)"
                      : plain
                        ? undefined
                        : isToday
                          ? `0 0 0 1px #38BDF8, 0 0 8px -2px color-mix(in srgb, ${tone} 65%, transparent)`
                          : `0 0 8px -2px color-mix(in srgb, ${tone} 65%, transparent)`,
                  transform: isSelected && inRange ? "scale(1.12)" : undefined,
                  zIndex: isSelected ? 1 : undefined,
                  position: "relative",
                }}
              >
                {d}
                {isSelected && inRange && (
                  <span aria-hidden className="absolute -bottom-[7px] left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-slate-100 shadow-[0_0_6px_rgba(241,245,249,0.9)]" />
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* ── DAVR + RANG IZOHI (2026-10-24, UX tahlili 2-band: "sariq va
          qizg'ish ranglar nimani bildiradi?"). Belgilangan kataklar —
          sahifaning davr tanlovi (masalan "Hafta"), rang — o'sha kunning
          davomat foizi; tanlangan kun halqa bilan. */}
      <div className="mt-3 border-t border-cyan-400/15 pt-2.5" title={t.stats.drill.calLegendTitle}>
        <p className="mb-1.5 font-mono text-[10.5px] text-cyan-300/70">{t.stats.drill.calRange(from, to)}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-400">
          {(
            [
              [rateTone(90), t.stats.drill.calLegend.good],
              [rateTone(60), t.stats.drill.calLegend.mid],
              [rateTone(10), t.stats.drill.calLegend.low],
            ] as const
          ).map(([tone, label]) => (
            <span key={label} className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: `color-mix(in srgb, ${tone} 35%, #0B1220)`, boxShadow: `0 0 0 1px ${tone}99` }} />
              {label}
            </span>
          ))}
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-sky-400/20" style={{ boxShadow: "0 0 0 1px rgba(56,189,248,0.6)" }} />
            {t.stats.drill.calLegend.pending}
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-white/[0.06]" style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.15)" }} />
            {t.stats.drill.calLegend.weekend}
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-white/[0.06]" style={{ boxShadow: "0 0 0 1px #0B1220, 0 0 0 2px #F1F5F9" }} />
            {t.stats.drill.calLegend.selected}
          </span>
        </div>
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
