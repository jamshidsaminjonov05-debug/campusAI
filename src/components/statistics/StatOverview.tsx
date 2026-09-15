/**
 * Statistika → "Umumiy" tab: respublika miqyosidagi asosiy ko'rsatkichlar.
 *
 * Sonlar ikki manbadan keladi va ULAR ARALASHTIRILMAYDI:
 *   · talaba/o'qituvchi/kamera/davomat — `useDashboardData()` (backend yoki mock),
 *   · aniqlanishlar — hodisalar oqimi (`useDetectionFeed`).
 * Har bir panel o'z manbasining JONLI/DEMO yorlig'ini ko'rsatadi.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
/* Phosphor duotone — ma'noga qarab: kuzatuv kamerasi (fotoapparat emas),
   o'qituvchi — doska oldida, davomat — belgilangan kalendar. */
import {
  Briefcase,
  Buildings,
  CalendarCheck,
  ChalkboardTeacher,
  Student,
  UserFocus,
} from "@phosphor-icons/react";
import { useT } from "@/i18n";
import type { PersonType } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";
import type { DashboardView } from "@/hooks/useDashboardData";
import { Donut3D } from "@/components/common/Donut3D";
import { DataBadge } from "@/components/dashboard/DataBadge";
import { AXIS, ClickableDot, KpiTile, StatPanel, TOOLTIP, fmt, rateTone, Y_AXIS_W } from "@/components/common/panels";
import { localDay } from "@/hooks/useTodayArrivals";
import { useEventStats, useFacesCount } from "@/hooks/useEventStats";
import { useAttendanceBoard } from "@/hooks/useAttendanceBoard";
import { useNvrAttendance } from "@/hooks/useNvrAttendance";
import { useWeeklyByType } from "@/hooks/useWeeklyByType";
import { TodayArrivalsModal } from "@/components/people/TodayArrivalsModal";
import { Missing, Val } from "@/components/common/Missing";
import { dayMonthLabel } from "@/lib/dateLabel";
import { useStudentLabel } from "@/hooks/useStudentLabel";
import { StatPeriodPanel } from "./StatPeriodPanel";
import { StatDensity } from "./StatDensity";
import { StatDetailDrawer, type StatDetailContent } from "./StatDetailDrawer";
import type { StatPeriod } from "@/hooks/useStatPeriod";

export function StatOverview({
  dash,
  period,
  onSelectType,
}: {
  dash: DashboardView;
  /** Sahifaning YAGONA davr tanlovi. */
  period: StatPeriod;
  /** O'qituvchi/Talabalar/Xodimlar kartochkasi bosilganda — o'sha tabga o'tkazadi. */
  onSelectType?: (id: PersonType) => void;
}) {
  const t = useT();
  const n = (v: number) => fmt(v, t.locale);
  const setActivePage = useAppStore((s) => s.setActivePage);
  const setInstitutionsTab = useAppStore((s) => s.setInstitutionsTab);

  /* "Bugun kelganlar" KPI'si — ATAYLAB BUGUNGI kun (kartochka nomi shunday
     va u davrga ergashmasligi kerak). */
  /* 🔴 2026-09-15: xom skan o'rniga server hisobi — odamlar `/faces` `total`,
     qaydlar `/events/stats` `total` (`hooks/useEventStats.ts`). */
  const today = localDay();
  const dayStats = useEventStats({ from: today, to: today });
  const dayFaces = useFacesCount({ from: today, to: today });
  const [showArrivals, setShowArrivals] = useState(false);

  /**
   * "Xodimlar" va "Bugungi davomat" — `useAttendanceBoard()` dan.
   *
   * ⚠️ Respublika miqyosida XODIM SONI HECH QAYERDA YO'Q — `mockData`/
   * `geoAggregate` faqat talaba/o'qituvchi/kamera/muassasa kuzatadi.
   * Shuning uchun bu ikkala ko'rsatkich kuzatuvdagi (Chilonzor 179-maktab)
   * HAQIQIY sonidan olinadi. `useAttendanceBoard()` allaqachon
   * namoyish/aniq rejimlarni to'g'ri ajratadi (`useStudentDay` orqali:
   * aniq rejimda faqat backend, namoyishda mock zaxira) — bu yerda
   * qo'shimcha shart YOZILMAYDI, hook o'zi hal qiladi.
   */
  const board = useAttendanceBoard();
  /* "O'quvchilar" ↔ "Talabalar" — muassasa turiga qarab (`useStudentLabel`). */
  const student = useStudentLabel();
  const cat = (type: "teacher" | "staff" | "student") =>
    board.categories.find((c) => c.type === type) ?? { total: 0, present: 0, absent: 0, late: 0, rate: 0 };
  const staffCat = cat("staff");
  /* Xodim toifasini MANBA qo'llab-quvvatlaydimi (`useAttendanceBoard`). */
  const staffSupported = board.categories.find((c) => c.type === "staff")?.supported ?? false;

  /**
   * 🔴 **KPI SONLARI — kuzatuv posti DAVOMATIDAN.**
   *
   * Backend `/statistics/dashboard` amalda bo'sh (o'lchandi: 2 o'quvchi,
   * 1 o'qituvchi, davomat 0%), kuzatuv postida esa **361 o'quvchi va
   * 36 o'qituvchi** bor. Shuning uchun manba — `useAttendanceBoard()`.
   *
   * ⚠️ Ilgari bu yerda ikkinchi shox bor edi (namoyish rejimi:
   * `dash.*` — respublika mock yig'indisi). Mock butunlay olib
   * tashlanganidan keyin u kerak emas.
   */
  const kpi = useMemo(() => {
    const teacher = cat("teacher");
    const student = cat("student");
    return {
      teachers: teacher.total,
      students: student.total,
      studentsPresent: student.present,
      rate: board.totals.rate,
      absent: board.totals.absent,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board.categories, board.totals]);

  /* Toifa kesimidagi HAQIQIY haftalik davomat (`/persons` + `/attendance`).
     Faqat aniq rejimda chiziladi — namoyishda backend bo'sh bo'lgani uchun
     uchala chiziq ham nolda yotib qolardi. */
  const realWeekly = useWeeklyByType(period.from, period.to);

  /* Haftalik davomat — UCH TOIFA uchun ALOHIDA chiziq.
     ⚠️ Ilgari bitta umumiy chiziq bor edi va u kimning davomati ekani
     noaniq qolardi; qiymatlar yaqin bo'lgani uchun grafik tekis
     ko'rinardi. Endi o'quvchi/o'qituvchi/xodim ajratilgan.

     Yorliq LUG'ATDAN (`dayIndex`) — aks holda brauzer inglizcha
     qisqartma qaytaradi (`useDashboardData` izohiga qarang). */

  /**
   * Kunma-kun toifa kesimi — HAQIQIY davomatdan (`useWeeklyByType`).
   *
   * ⚠️ **NAMOYISH QATORI OLIB TASHLANDI** (2026-09-05): ilgari
   * backend `trend` faqat umumiy foizni bergani uchun uchala toifa
   * `Math.sin` bilan SUN'IY ajratilardi — ya'ni grafikdagi uch chiziq
   * to'qilgan edi. Qayd bo'lmagan kun endi NOL bo'lib qoladi.
   */
  const dailySeries = useMemo(
    () =>
      realWeekly.days.map((d) => ({
        day:
          realWeekly.days.length > 8
            ? dayMonthLabel(new Date(`${d.key}T00:00:00`), t)
            : t.chart.weekdays[d.dayIndex],
        [student.plural]: d.student,
        [t.board.type.teacher]: d.teacher,
        [t.board.type.staff]: d.staff,
      })),
    /* `t` TO'LIQ dep — `dayMonthLabel()` oy nomlarini lug'atdan oladi. */
    [realWeekly.days, t, student.plural]
  );

  /**
   * 🔵 **"BUGUN"DA — SOAT KESIMIDA** (2026-09-10, foydalanuvchi so'rovi).
   * Sabab: "Bugun" tanlanganda `dailySeries` BITTA kunlik nuqtaga
   * tushadi — chiziq chizish uchun kamida 2 nuqta kerak
   * (`StatDensity.tsx`dagi AYNI izohga qarang). Shu SOAT kesimi esa
   * DOIM 24 nuqtaga ega. Manba — `useNvrAttendance(period.to)`:
   * `period.to === attDay()` bo'lgani uchun (id="today"da) bu
   * `useAttendanceBoard()`ning ICHKI so'rovi bilan BIR XIL React Query
   * keshiga tushadi — qo'shimcha tarmoq so'rovi YO'Q.
   */
  const todayAtt = useNvrAttendance(period.to);
  const hourlySeries = useMemo(() => {
    const buckets: Record<string, number>[] = Array.from({ length: 24 }, () => ({
      [student.plural]: 0,
      [t.board.type.teacher]: 0,
      [t.board.type.staff]: 0,
    }));
    for (const r of todayAtt.rows) {
      if (!r.time) continue; // kelmagan — vaqti yo'q
      const h = Number(r.time.split(":")[0]);
      if (!Number.isFinite(h) || h < 0 || h > 23) continue;
      /* kuzatuv posti `role`da faqat student/teacher bor — xodim doim 0 qoladi
         (qolgan bo'limlardagi bilan AYNI cheklov). */
      const key = r.role === "teacher" ? t.board.type.teacher : student.plural;
      buckets[h][key] = (buckets[h][key] ?? 0) + 1;
    }
    return buckets.map((b, h) => ({ day: `${String(h).padStart(2, "0")}:00`, ...b }));
  }, [todayAtt.rows, student.plural, t]);

  const weekly = period.id === "today" ? hourlySeries : dailySeries;

  /** Chiziq ranglari — Shaxslar bo'limidagi toifa ranglari bilan AYNI. */
  const LINES = useMemo(
    () => [
      { key: student.plural, color: "#34D399" },
      { key: t.board.type.teacher, color: "#85E0FF" },
      { key: t.board.type.staff, color: "#F59E0B" },
    ],
    [t.board.type, student.plural]
  );

  /* ⚠️ **"Yetakchi hududlar" paneli OLIB TASHLANDI** (2026-09-05):
     u `REGION_ROWS` — 14 viloyat uchun GENERATSIYA qilingan trevoga
     sonlaridan qurilardi. Backend hudud kesimini bermaydi, kuzatuv esa
     bitta obyektda — "yetakchi hududlar" ro'yxati to'liq to'qilgan edi. */

  /* Bir o'qituvchiga necha o'quvchi. Manbalardan biri yo'q bo'lsa `null`
     (qizil belgi) — nol ko'rsatish yolg'on bo'lardi. */
  const perTeacher =
    dash.teachers.total !== null && dash.teachers.total > 0 && dash.students.total !== null
      ? Math.round(dash.students.total / dash.teachers.total)
      : null;
  const moodPct =
    dash.emotions.total > 0 ? Math.round((dash.emotions.positive / dash.emotions.total) * 100) : 0;

  /**
   * "O'rtacha davomat" kartochkasi bosilganda — pastdagi "Davomat
   * dinamikasi" paneliga suziladi (`StatPeriodPanel` + shu grafik allaqachon
   * SAHIFANING YAGONA davr tanlovi — Bugun/3 kun/Hafta/Oy/Oraliq — bo'yicha
   * ishlaydi, ya'ni "aniq vaqt taqsimoti" allaqachon bor edi, faqat
   * kartochkaning o'zi unga olib bormasdi).
   */
  /**
   * Grafikda FAQAT bitta toifa — yuqoridagi yorliq bosilganda.
   *
   * `null` — uchalasi ham chizilади. Yorliq (recharts `Legend`) bosilsa
   * o'sha toifa YAKKA qoladi, qayta bosilsa hammasi qaytadi: uch chiziq
   * ustma-ust tushganda bittasini ajratib ko'rish uchun.
   */
  const [onlyLine, setOnlyLine] = useState<string | null>(null);
  /* Til almashsa yorliq kaliti ham o'zgaradi — eski tanlov osilib
     qolmasin (aks holda grafik bo'sh ko'rinardi). */
  useEffect(() => {
    setOnlyLine(null);
  }, [t.board.type]);

  /**
   * ── YAGONA O'NG PANEL (2026-09-10, foydalanuvchi so'rovi) ──
   * "Davomat dinamikasi", "Kayfiyat taqsimoti" (shu fayl) va
   * "Davr kesimi"/"Kun davomidagi zichlik" (`StatPeriodPanel`/
   * `StatDensity`, `onOpenDetail` propi orqali) — HAMMASI shu BITTA
   * `StatDetailDrawer`ga mazmun yuboradi. Ilgari har biri O'Z ICHIDA
   * kichik karta ochib, chartni siqardi — endi chartlar to'liq
   * kenglikda qoladi, panel esa sahifa ustida suzadi.
   */
  const [detail, setDetail] = useState<StatDetailContent | null>(null);
  const openDetail = (c: StatDetailContent) => setDetail((cur) => (cur?.key === c.key ? null : c));
  useEffect(() => setDetail(null), [period.from, period.to, period.id]);

  /** "Davomat dinamikasi" nuqtasi bosilganda — o'sha kun/soatning toifa kesimi. */
  function openAttPointDetail(payload: unknown) {
    const p = payload as Record<string, string | number>;
    openDetail({
      key: `att-point:${p.day}`,
      title: `${p.day} — davomat`,
      tone: "#8FB8FF",
      body: (
        <div className="space-y-1.5">
          {LINES.map((ln) => (
            <div key={ln.key} className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5">
              <span className="flex items-center gap-1.5 truncate text-[11px] text-slate-300">
                <span className="h-2 w-2 flex-none rounded-full" style={{ background: ln.color }} />
                {ln.key}
              </span>
              <span className="flex-none font-mono text-[12px] font-bold" style={{ color: ln.color }}>
                {n(Number(p[ln.key] ?? 0))}
              </span>
            </div>
          ))}
        </div>
      ),
    });
  }

  const weeklyRef = useRef<HTMLDivElement>(null);
  const [highlightWeekly, setHighlightWeekly] = useState(false);
  const openWeekly = () => {
    weeklyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setHighlightWeekly(true);
    setTimeout(() => setHighlightWeekly(false), 1400);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* ── Asosiy ko'rsatkichlar ──
          Tartib: Muassasalar → O'qituvchilar → Xodimlar → Talabalar →
          O'rtacha davomat →  Bugun kelganlar →
          Bugungi davomat. Har biri o'z manbasidan (izohlariga qarang);
          "aniq statistika" tugmasi ta'sir qiladigan kartochkalar (Xodimlar,
          Bugungi davomat va yuqoridagi respublika sonlari) HECH NARSANI
          O'YLAB TOPMAYDI — manba bo'lmasa nol chiqadi. */}
      <div className="grid grid-cols-4 gap-2 xl:grid-cols-6">
        <KpiTile
          Icon={Buildings}
          label={t.stats.kpi.institutes}
          value={n(dash.institutes)}
          tone="#8FB8FF"
          /* ⚠️ "Muassasalar" bo'limi O'Z standarti bilan (Muassasalar
             kesimi) ochilardi; kartochka esa UMUMIY manzarani so'raydi —
             shuning uchun HUDUDLAR kesimi ochiladi. */
          onClick={() => {
            setInstitutionsTab("regions");
            setActivePage("Muassasalar");
          }}
          title={t.stats.hint.openInstitutions}
        />
        <KpiTile
          Icon={ChalkboardTeacher}
          label={t.stats.kpi.teachers}
          value={n(kpi.teachers)}
          hint={perTeacher === null ? undefined : t.stats.hint.perTeacher(perTeacher)}
          tone="#A78BFA"
          onClick={onSelectType ? () => onSelectType("teacher") : undefined}
          title={t.stats.hint.openTab(t.stats.people.typeTeacher)}
        />
        {/* ⚠️ **XODIMLAR — MANBA YO'Q.** kuzatuv posti `role` da faqat
            `student`/`teacher` bor, backend `/persons?person_type=staff`
            esa bo'sh. `0` "xodim yo'q" degani emas, shuning uchun QIZIL
            belgi ko'rsatiladi (`BACKEND.md` 4-band). */}
        <KpiTile
          Icon={Briefcase}
          label={t.stats.kpi.staff}
          value={staffSupported ? n(staffCat.total) : <Missing source="kuzatuv posti /attendance · role=staff" />}
          hint={staffSupported ? t.stats.hint.present(n(staffCat.present)) : undefined}
          tone="#F59E0B"
          onClick={onSelectType ? () => onSelectType("staff") : undefined}
          title={t.stats.hint.openTab(t.stats.people.typeStaff)}
        />
        <KpiTile
          Icon={Student}
          label={student.plural}
          value={n(kpi.students)}
          hint={t.stats.hint.present(n(kpi.studentsPresent))}
          tone="#34D399"
          onClick={onSelectType ? () => onSelectType("student") : undefined}
          title={t.stats.hint.openTab(student.plural)}
        />
        <KpiTile
          Icon={CalendarCheck}
          label={t.stats.kpi.attendance}
          value={`${kpi.rate}%`}
          hint={t.stats.hint.absent(n(kpi.absent))}
          tone="#22D3EE"
          onClick={openWeekly}
          title={t.stats.hint.openWeekly}
        />

        {/* ── BUGUN KELGANLAR ──
            Yagona HAQIQIY manba — kuzatuv posti yuz hodisalari (kunning HAMMASI
            o'qiladi). Backend bu sonni BERMAYDI: o'lchandi — `/persons`
            da 3 ta yozuv, `/attendance?date=<bugun>` esa 2026-07-15 dagi
            ikkita eski qatorni qaytaradi (sana filtri ishlamaydi). Shuning
            uchun kartochka `DataBadge` siz, lekin son REAL. */}
        <button
          type="button"
          onClick={() => setShowArrivals(true)}
          title="Bugun kelganlar ro'yxatini ochish"
          className="text-left"
        >
          <KpiTile
            Icon={UserFocus}
            label={t.stats.kpi.arrivalsToday}
            value={n(dayFaces.total)}
            hint={
              dayFaces.isLoading || dayStats.isLoading
                ? "sanalmoqda…"
                : `${n(dayStats.total)} qayd`
            }
            tone="#22C55E"
          />
        </button>
       
      </div>
      {showArrivals && (
        <TodayArrivalsModal onClose={() => setShowArrivals(false)} />
      )}

      {/* ── DAVR KESIMI: kunlik / haftalik / oylik / oraliq + halqa ── */}
      <StatPeriodPanel period={period} onOpenDetail={openDetail} />

      {/* ── Davomat dinamikasi + kayfiyat ── */}
      <div className="grid gap-3 xl:grid-cols-[1.5fr_1fr]">
        {/* `ref` — "O'rtacha davomat" kartochkasi bosilganda shu yerga
            suziladi (`openWeekly`); `StatPanel` o'zi ref forward qilmaydi,
            shuning uchun tashqi o'rovchi kerak. Qisqa highlight — foydalanuvchi
            "aynan shu panelga o'tdim" deb bilsin. */}
        <div
          ref={weeklyRef}
          className={`rounded-2xl transition-shadow duration-500 ${
            highlightWeekly ? "shadow-[0_0_0_2px_rgba(133,224,255,0.55)]" : ""
          }`}
        >
        <StatPanel
          /* ⚠️ Sarlavha endi "haftalik" emas: oraliq tepadagi YAGONA davr
             tanlovidan keladi (`useStatPeriod`). */
          title={t.stats.panel.weekly}
          hint={period.label}
          right={<DataBadge live={dash.live} />}
          className="min-h-[220px]"
          delay={0.04}
        >
          {/* ── FUTURISTIK yorliq tugmalari — recharts `Legend` O'RNIGA
              (2026-09-10, foydalanuvchi so'rovi). Ilgari `<Legend>`
              recharts SVG QATLAMIDA edi va hover paytida chiqadigan
              `<Tooltip>` uni QOPLAB, bosib bo'lmay qolardi ("hover
              chiqqan joyida bosib bo'lmayabdi"). Endi bular ODDIY HTML
              tugma — chartning USTIDA, butunlay boshqa qatlamda,
              gradient+blur bilan — hech qachon tooltip tomonidan
              berkitilmaydi. */}
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {LINES.map((l) => {
              const active = onlyLine === l.key;
              const dimmed = onlyLine != null && !active;
              return (
                <button
                  key={l.key}
                  type="button"
                  onClick={() => setOnlyLine((cur) => (cur === l.key ? null : l.key))}
                  title={active ? t.stats.panel.legendAll : t.stats.panel.legendOnly(l.key)}
                  style={{ ["--c" as string]: l.color }}
                  className={`relative flex items-center gap-1.5 overflow-hidden rounded-full border px-3 py-1.5 text-[11px] font-semibold backdrop-blur-md transition-all duration-300 ${
                    active
                      ? "border-[color:var(--c)]/70 text-white shadow-[0_0_18px_-3px_var(--c)]"
                      : dimmed
                        ? "border-white/[0.06] text-slate-600 opacity-50"
                        : "border-white/10 text-slate-300 hover:border-[color:var(--c)]/45 hover:text-white hover:shadow-[0_0_12px_-4px_var(--c)]"
                  }`}
                >
                  {active && (
                    <span
                      aria-hidden
                      className="absolute inset-0 -z-10"
                      style={{
                        background: `linear-gradient(120deg, color-mix(in srgb, var(--c) 45%, transparent), color-mix(in srgb, var(--c) 10%, transparent) 70%)`,
                      }}
                    />
                  )}
                  <span className="h-2 w-2 flex-none rounded-full" style={{ background: l.color, boxShadow: `0 0 6px ${l.color}` }} />
                  {l.key}
                </button>
              );
            })}
          </div>

          {/* ── Istalgan nuqta BOSILADI — umumiy o'ng panelda shu
              kun/soatning toifa kesimi ochiladi (2026-09-10) ── */}
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weekly} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <defs>
                  {LINES.map((l, i) => (
                    <linearGradient key={l.key} id={`stat-att-${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={l.color} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={l.color} stopOpacity={0.02} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid stroke="rgba(120,150,200,0.08)" vertical={false} />
                {/* interval={0} — aks holda recharts birinchi/oxirgi kunni yashiradi */}
                <XAxis
                  dataKey="day"
                  tick={AXIS}
                  tickLine={false}
                  axisLine={false}
                  /* Qisqa oraliqda HAMMA kun ko'rsatiladi, uzunida
                     recharts o'zi siyraklashtiradi. */
                  interval={weekly.length > 8 ? "preserveStartEnd" : 0}
                  minTickGap={16}
                />
                {/* ⚠️ Aniq rejimda o'q NOLDAN: qiymatlar past (yoki 0)
                    bo'lishi mumkin, `60..100` oralig'ida ular umuman
                    ko'rinmay qolardi. */}
                <YAxis
                  tick={AXIS}
                  tickLine={false}
                  axisLine={false}
                  width={Y_AXIS_W}
                  domain={[0, 100]}
                />
                <Tooltip contentStyle={TOOLTIP} />
                {/* ⚠️ `map` dan chiqarib tashlamaymiz, `null` qaytaramiz —
                    gradient id'lari (`stat-att-${i}`) INDEKSGA bog'langan,
                    ro'yxat qisqarsa ranglar almashib ketardi. */}
                {LINES.map((l, i) =>
                  onlyLine && onlyLine !== l.key ? null : (
                    <Area
                      key={l.key}
                      type="monotone"
                      dataKey={l.key}
                      stroke={l.color}
                      strokeWidth={2}
                      fill={`url(#stat-att-${i})`}
                      dot={<ClickableDot tone={l.color} onPick={openAttPointDetail} />}
                      /* ⚠️ `activeDot` ham `ClickableDot` — oddiy `{r,fill}`
                         obyekt bo'lsa, HOVER paytida chiqadigan "aktiv"
                         doira aynan bosilmoqchi bo'lingan nuqtani to'sib
                         qo'yardi (yuqoridagi `ClickableDot` izohiga qarang). */
                      activeDot={<ClickableDot tone={l.color} r={4.5} onPick={openAttPointDetail} />}
                    />
                  )
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </StatPanel>
        </div>

        <StatPanel
          title={t.stats.panel.emotion}
          right={<DataBadge live={dash.live} />}
          className="min-h-[220px]"
          delay={0.08}
        >
          <div className="flex h-full flex-col justify-center gap-3">
            {/* ⚠️ Qayd bo'lmasa halqa chizilmaydi va SABABI yoziladi:
                serverda kayfiyat moduli yo'q (`ultralytics`) — o'lchandi,
                `/statistics/emotions/daily` 30 kunda 0 ta qayd beradi.
                🔵 Shu bilan birga panel HAR IKKI holatda ham bosiladi
                (2026-09-10, foydalanuvchi so'rovi) — ma'lumot bo'lmasa
                ham SABAB shu "sidebar" ko'rinishida ochiladi, boshqa
                diagrammalar bilan BIR XIL naqsh. */}
            <div className="flex justify-center">
              {dash.emotions.total > 0 ? (
                /* Hodisa turlari bilan AYNI ko'rinish — hover'da bo'lak
                   kattalashadi va markazda o'sha toifa yoziladi. */
                <Donut3D
                  data={[
                    { label: t.chart.positive, value: dash.emotions.positive, color: "#34D399" },
                    { label: t.chart.neutral, value: dash.emotions.neutral, color: "#8FB8FF" },
                    { label: t.chart.negative, value: dash.emotions.negative, color: "#FB7185" },
                  ]}
                  caption={`${moodPct}% ${t.stats.panel.positiveShort}`}
                  size={320}
                  format={n}
                  onSelect={(s) =>
                    openDetail({
                      key: `mood:${s.label}`,
                      title: s.label,
                      tone: s.color,
                      body: (
                        <div className="space-y-2">
                          <p className="font-mono text-[22px] font-bold leading-none" style={{ color: s.color }}>
                            {n(s.value)}
                            <span className="ml-1.5 text-[10.5px] font-normal text-slate-500">
                              · {((s.value / Math.max(1, dash.emotions.total)) * 100).toFixed(1)}%
                            </span>
                          </p>
                          <p className="text-[10.5px] text-slate-500">{dash.emotions.total} ta qayddan.</p>
                        </div>
                      ),
                    })
                  }
                />
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    openDetail({
                      key: "mood-empty",
                      title: "Kayfiyat ma'lumoti",
                      tone: "#F59E0B",
                      body: (
                        <p className="text-[11px] leading-snug text-slate-400">
                          Backend&apos;da kayfiyat tahlili moduli (<code>ultralytics</code>) o&apos;rnatilmagan —
                          <code>/statistics/emotions/daily</code> hozircha 0 ta qayd qaytaradi. Modul ishga tushgach bu
                          panel o&apos;zi haqiqiy sonlar bilan to&apos;ladi.
                        </p>
                      ),
                    })
                  }
                  className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-3 text-center transition-colors hover:border-amber-400/30 hover:bg-amber-400/[0.05]"
                >
                  <p className="text-[11.5px] font-semibold text-amber-300/90">Kayfiyat ma&apos;lumoti yo&apos;q</p>
                  <p className="mt-1 text-[10.5px] leading-snug text-slate-500">
                    Serverda kayfiyat tahlili moduli o&apos;rnatilmagan.
                  </p>
                </button>
              )}
            </div>
            <div className="dv-slot">
              <p className="text-[9px] uppercase tracking-[0.16em] text-ice-cyan/60">{t.stats.panel.cameras}</p>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${dash.cameras.rate ?? 0}%`,
                      background: rateTone(dash.cameras.rate ?? 0),
                    }}
                  />
                </div>
                <span className="flex-none font-mono text-[11px] text-slate-300">
                  <Val v={dash.cameras.rate} source="/statistics/dashboard · kuzatuv posti /channels" format={(v) => `${v}%`} />
                </span>
              </div>
              <p className="mt-1 text-[9.5px] text-slate-500">
                {dash.cameras.active === null || dash.cameras.total === null ? (
                  <Missing source="kuzatuv posti /channels" />
                ) : (
                  t.stats.hint.cameras(n(dash.cameras.active), n(dash.cameras.total))
                )}
              </p>
            </div>
          </div>
        </StatPanel>
      </div>

      {/* ── Kun davomidagi zichlik — soat kesimida ──
          🔴 TOPILDI VA TUZATILDI (2026-09-10): `StatDensity.tsx`
          to'liq yozilgan va hujjatlashtirilgan edi, lekin shu slot
          BO'SH qolib ketgan — komponent hech qayerdan chaqirilmagan
          (repo bo'ylab tekshirildi, boshqa import yo'q). Foydalanuvchi
          "Bugun bosilganda davr kesimida chiziq chizilmaydi" deb
          xabar berganda aynan shu tuzilgan-lekin-ulanmagan panel
          topildi va qaytarildi. */}
      <StatDensity period={period} onOpenDetail={openDetail} />

      {/* ⚠️ IKKINCHI "Hodisa turlari" paneli OLIB TASHLANDI — yuqoridagi
          "Davr kesimi" qatorida halqa diagramma AYNI shu kesimni
          ko'rsatadi (son va foiz bilan). Ikkalasi bir xil sarlavha
          ostida turli son chiqarib, chalkashtirardi. */}

      {/* ⚠️ **"Yetakchi hududlar" paneli OLIB TASHLANDI** (2026-09-05) —
          u 14 viloyat uchun GENERATSIYA qilingan trevoga sonlaridan
          qurilardi. Backend hudud kesimini bermaydi. */}

      {/* ── YAGONA O'NG PANEL — yuqoridagi barcha diagrammalar shunga
          mazmun yuboradi (`onOpenDetail`/`openDetail`, yuqoridagi izohga
          qarang). `fixed` bo'lgani uchun DOM'dagi joyi ahamiyatsiz. */}
      <StatDetailDrawer detail={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
