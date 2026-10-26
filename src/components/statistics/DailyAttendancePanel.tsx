"use client";

import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Briefcase, ChalkboardTeacher, ChartLine, Check, CheckCircle, Lock, Rows, Student, XCircle } from "@phosphor-icons/react";
import { AXIS, ClickableDot, PanelLoader, StatPanel, TOOLTIP, TOOLTIP_ITEM, TOOLTIP_LABEL, Y_AXIS_W, fmt } from "@/components/common/panels";
import { DateRangePicker } from "@/components/common/DateRangePicker";
import { useAttendanceBoard } from "@/hooks/useAttendanceBoard";
import { attDay, useNvrAttendance, useNvrAttendanceRange } from "@/hooks/useNvrAttendance";
import { useStudentLabel } from "@/hooks/useStudentLabel";
import { STAT_PERIODS, useStatPeriod, type StatPeriod, type StatPeriodId } from "@/hooks/useStatPeriod";
import { localDay } from "@/hooks/useTodayArrivals";
import { dayMonthLabel, weekdayLabel, weekdayLongLabel } from "@/lib/dateLabel";
import { useT } from "@/i18n";
import type { StatDetailContent } from "./StatDetailDrawer";
import { EmptyState } from "@/components/common/EmptyState";

/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  KUNLIK DAVOMAT — "Maktabga necha kishi keldi?"                       ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * BITTA panel, IKKI ko'rinish, foydalanuvchi o'zi tanlaydi (2026-10-24,
 * foydalanuvchi: "shu ikki ko'rinishni ham qo'yib option beramiz ... to'lqin
 * o'rniga to'g'ri chiziq keskin qayrilishlar bilan ... umumiy page'da va
 * davomat page'ida ham"):
 *   · **Qatorlar** — har kun bitta qator: nom, yashil to'ldiriluvchi chiziq,
 *     [✅ keldi] [❌ kelmadi] [foiz] (dizayner tahlili, o'sha kuni);
 *   · **Grafik** — toifalar bo'yicha davomat foizi chizig'i, `type="linear"`
 *     (TO'G'RI kesmalar, silliq spline EMAS), har tugunda DOIMIY yorliq
 *     "84% (509 ta)", Y o'qi `0%…100%`, ✓ katakchali yorliqlar.
 * Tanlov `localStorage`da (`hik-att-view`) — ikkala sahifada bir xil.
 *
 * 🔴 **GRAFIK BO'SH CHIQARDI — TUZATILDI** (o'sha kuni, foydalanuvchi
 * skrinshoti): `ResponsiveContainer height="100%"` ota-elementning ANIQ
 * balandligini talab qiladi; Davomat tabida panel `flex-col` ichida (balandlik
 * `auto`) turadi, `flex-1` esa 0 ga tushib grafik ko'rinmasdi. Endi grafik
 * o'rami QAT'IY balandlikda (`h-[280px]`) — ikkala sahifada ham chiziladi.
 *
 * 🔵 **O'Z DAVR TANLOVI** (foydalanuvchi so'rovi: "blok yuqorisida Hafta / Oy /
 * Butun tarix / Sana oralig'i"): default — SAHIFA DAVRI (yagona tanlov
 * saqlanadi, `useStatPeriod` izohi); operator shu blokda boshqa davrni
 * tanlasa faqat shu panel o'zgaradi (`useStatPeriod` ikkinchi nusxasi).
 *
 * Manba — `useNvrAttendanceRange().workPoints` (dam olish kunlari va 1–4-sinf
 * shanba qoidasi ALLAQACHON qo'llangan), "Bugun"da `useNvrAttendance(to).rows`
 * dan SOAT bo'yicha yig'ilib boruvchi kelganlar. Ikkala sahifa (Umumiy,
 * Davomat) AYNI komponent — ikki xil son chiqmaydi.
 */

/* 🔵 2026-10-26 — STANDART "GRAFIK" (foydalanuvchi: "hamma grafiklarda default
   grafik turishi kerak"). Kalit "-2": eski kalitda tanlov saqlangan bo'lsa
   ham hamma bir marta grafikdan boshlaydi, keyingi tanlov saqlanadi. */
const VIEW_KEY = "hik-att-view2";
type AttView = "rows" | "chart";
type AttType = "student" | "teacher";
/** Blok ichidagi davr pilyulalari (sahifa tanlovidan tashqari) */
const LOCAL_PERIODS: StatPeriodId[] = ["week", "month", "all", "custom"];

/** Toifa tugmalari — ranglar Shaxslar bo'limidagi bilan AYNI. */
const ATT_TYPES = [
  { id: "student", color: "#34D399", Icon: Student, supported: true },
  { id: "teacher", color: "#85E0FF", Icon: ChalkboardTeacher, supported: true },
  /* Xodimlar — kuzatuv posti bu toifani bilmaydi (manba yo'q), tugma o'chiq */
  { id: "staff", color: "#F59E0B", Icon: Briefcase, supported: false },
] as const;

function readView(): AttView {
  if (typeof window === "undefined") return "chart";
  try {
    return window.localStorage.getItem(VIEW_KEY) === "rows" ? "rows" : "chart";
  } catch {
    return "chart";
  }
}

/** Tugun yorlig'i — "84% (509 ta)", o'quvchi chiziq USTIDA, o'qituvchi OSTIDA
 *  (ikki chiziq ustma-ust tushganda yorliqlar qorishmasin). */
function NodeLabel(props: { x?: number; y?: number; value?: number; index?: number; color: string; counts: number[]; below?: boolean; unit: string }) {
  const { x, y, value, index, color, counts, below, unit } = props;
  if (x == null || y == null || value == null || index == null) return null;
  const cnt = counts[index];
  const text = `${value}%${cnt != null ? ` (${cnt} ${unit})` : ""}`;
  const w = text.length * 5.6 + 10;
  const ty = below ? y + 12 : y - 20;
  return (
    <g style={{ pointerEvents: "none" }}>
      <rect x={x - w / 2} y={ty - 1} width={w} height={14} rx={4} fill="#0B1220" fillOpacity={0.9} stroke={color} strokeOpacity={0.45} />
      <text x={x} y={ty + 9.5} textAnchor="middle" fontSize={9} fontWeight={700} fill={color} fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace">
        {text}
      </text>
    </g>
  );
}

export function DailyAttendancePanel({
  period: pagePeriod,
  onOpenDetail,
  onPickDay,
  className = "",
  delay,
  embedded = false,
}: {
  period: Pick<StatPeriod, "id" | "from" | "to" | "label" | "days" | "resolving">;
  /** Qator/nuqta bosilganda — umumiy o'ng panel (`StatDetailDrawer`). */
  onOpenDetail?: (c: StatDetailContent) => void;
  /** Kun bosilganda — chaqiruvchi o'sha kunni TANLAYDI (Davomat tabi: halqa +
   *  sinflar jadvali shu kunga o'tadi). Soat nuqtalarida chaqirilmaydi. */
  onPickDay?: (date: string) => void;
  className?: string;
  delay?: number;
  /** Boshqa panel ichida, o'z `StatPanel` ramkasisiz (Davomat tabi). */
  embedded?: boolean;
}) {
  const t = useT();
  const P = t.stats.panel;
  const n = (v: number) => fmt(v, t.locale);
  const student = useStudentLabel();
  const board = useAttendanceBoard();
  const cat = (type: AttType) => board.categories.find((c) => c.type === type) ?? { total: 0, present: 0 };

  /* ── DAVR: sahifa davri (default) yoki blokning o'z tanlovi ── */
  const local = useStatPeriod("week");
  const [follow, setFollow] = useState(true);
  const period = follow ? pagePeriod : local;

  const [view, setView] = useState<AttView>("chart");
  useEffect(() => setView(readView()), []);
  const pickView = (v: AttView) => {
    setView(v);
    try {
      window.localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* private rejim — xotirada qoladi */
    }
  };

  const [attType, setAttType] = useState<AttType>("student");
  /** Grafikda yashirilgan toifalar (✓ katakcha) */
  const [hidden, setHidden] = useState<ReadonlySet<AttType>>(() => new Set());
  const toggleHidden = (id: AttType) =>
    setHidden((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const todayAtt = useNvrAttendance(period.to);
  const attRange = useNvrAttendanceRange(period.from, period.to);
  const isToday = period.id === "today";
  const todayKey = attDay();

  /** "Bugun" — har toifa uchun soat bo'yicha YIG'ILIB boruvchi kelganlar. */
  const hourly = useMemo(() => {
    const perHour: Record<AttType, number[]> = { student: Array(24).fill(0), teacher: Array(24).fill(0) };
    for (const r of todayAtt.rows) {
      if (!r.time || (r.role !== "student" && r.role !== "teacher")) continue;
      const h = Number(r.time.split(":")[0]);
      if (Number.isFinite(h) && h >= 0 && h < 24) perHour[r.role][h]++;
    }
    const any = (h: number) => perHour.student[h] + perHour.teacher[h] > 0;
    let first = -1;
    let last = -1;
    for (let h = 0; h < 24; h++) if (any(h)) { if (first < 0) first = h; last = h; }
    if (first < 0) return [];
    const cum: Record<AttType, number> = { student: 0, teacher: 0 };
    const out: { h: number; present: Record<AttType, number> }[] = [];
    for (let h = first; h <= last; h++) {
      cum.student += perHour.student[h];
      cum.teacher += perHour.teacher[h];
      out.push({ h, present: { ...cum } });
    }
    return out;
  }, [todayAtt.rows]);

  const label2 = (h: number) => `${String(h).padStart(2, "0")}:00`;
  const points = useMemo(() => attRange.workPoints.slice(-60), [attRange.workPoints]);

  /** QATORLAR ko'rinishi — tanlangan toifa */
  const rows = useMemo(() => {
    if (isToday) {
      const total = cat(attType).total;
      return hourly.map((x) => {
        const present = x.present[attType];
        return {
          key: `${todayKey}:${label2(x.h)}`,
          label: label2(x.h),
          present,
          absent: Math.max(0, total - present),
          total,
          pct: total > 0 ? Math.round((present / total) * 100) : 0,
          isToday: false,
        };
      });
    }
    return points.map((p) => {
      const s = p[attType];
      const d = new Date(`${p.date}T00:00:00`);
      return {
        key: p.date,
        label: points.length > 8 ? dayMonthLabel(d, t) : `${weekdayLongLabel(d, t)} · ${dayMonthLabel(d, t)}`,
        present: s.present,
        absent: s.absent,
        total: s.total,
        pct: s.total > 0 ? Math.round((s.present / s.total) * 100) : 0,
        isToday: p.date === todayKey,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isToday, attType, hourly, points, t, board.categories, todayKey]);

  /** GRAFIK ko'rinishi — ikkala toifa foizi (+ soni yorliq uchun), bitta o'q */
  const series = useMemo(() => {
    const pct = (p: number, tot: number) => (tot > 0 ? Math.round((p / tot) * 100) : 0);
    if (isToday) {
      const tot = { student: cat("student").total, teacher: cat("teacher").total };
      return hourly.map((x) => ({
        day: label2(x.h),
        _key: `${todayKey}:${label2(x.h)}`,
        student: pct(x.present.student, tot.student),
        teacher: pct(x.present.teacher, tot.teacher),
        student_n: x.present.student,
        teacher_n: x.present.teacher,
      }));
    }
    return points.map((p) => {
      const d = new Date(`${p.date}T00:00:00`);
      return {
        day: points.length > 8 ? dayMonthLabel(d, t) : `${weekdayLabel(d, t)} ${dayMonthLabel(d, t)}`,
        _key: p.date,
        student: pct(p.student.present, p.student.total),
        teacher: pct(p.teacher.present, p.teacher.total),
        student_n: p.student.present,
        teacher_n: p.teacher.present,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isToday, hourly, points, t, board.categories, todayKey]);

  const loading = period.resolving || (isToday ? todayAtt.isLoading : attRange.isLoading);
  const typeLabel = (id: string) => (id === "student" ? student.plural : id === "teacher" ? t.board.type.teacher : t.board.type.staff);

  /** Kun/soat bosilganda — chaqiruvchiga kun TANLATILADI va/yoki o'ng panelda ikkala toifa. */
  function openDay(key: string, label: string) {
    const isHour = key.includes(":");
    if (!isHour && onPickDay) onPickDay(key);
    if (!onOpenDetail) return;
    const p = isHour ? null : attRange.points.find((x) => x.date === key);
    const hour = isHour ? hourly.find((x) => `${todayKey}:${label2(x.h)}` === key) : null;
    onOpenDetail({
      key: `att-day:${key}`,
      title: `${label} — ${P.dailyAtt.toLowerCase()}`,
      tone: "#8FB8FF",
      body: (
        <div className="space-y-1.5">
          {ATT_TYPES.filter((x) => x.supported).map((x) => {
            const id = x.id as AttType;
            const present = p ? p[id].present : hour ? hour.present[id] : null;
            const total = p ? p[id].total : hour ? cat(id).total : null;
            const pct = present != null && total ? Math.round((present / total) * 100) : null;
            return (
              <div key={x.id} className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5">
                <span className="flex items-center gap-1.5 truncate text-[11px] text-slate-300">
                  <span className="h-2 w-2 flex-none rounded-full" style={{ background: x.color }} />
                  {typeLabel(x.id)}
                </span>
                <span className="flex-none font-mono text-[12px] font-bold" style={{ color: x.color }}>
                  {present == null ? "—" : `${n(present)}${total ? ` / ${n(total)} · ${pct}%` : ""}`}
                </span>
              </div>
            );
          })}
        </div>
      ),
    });
  }
  function onPointPick(payload: unknown) {
    const p = payload as { day: string; _key: string };
    if (p?._key) openDay(p._key, p.day);
  }
  const clickable = Boolean(onOpenDetail || onPickDay);

  const viewBtn = (id: AttView, Icon: typeof Rows, label: string) => (
    <button
      type="button"
      onClick={() => pickView(id)}
      aria-pressed={view === id}
      className={`flex items-center gap-1 rounded-md px-2 py-1 text-[10.5px] font-semibold transition-colors ${
        view === id ? "bg-ice/20 text-white" : "text-slate-400 hover:text-slate-200"
      }`}
    >
      <Icon size={12} weight={view === id ? "fill" : "regular"} />
      {label}
    </button>
  );

  const periodBtn = (active: boolean, label: string, onClick: () => void) => (
    <button
      key={label}
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-md px-2.5 py-1 text-[10.5px] font-semibold transition-colors ${
        active ? "bg-gradient-to-r from-[#22d3ee] to-[#818cf8] text-white" : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-200"
      }`}
    >
      {label}
    </button>
  );

  /* KO'RINISH TANLOVI — Qatorlar / Grafik */
  const viewToggle = (
    <div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-black/25 p-0.5">
      {viewBtn("rows", Rows, P.viewRows)}
      {viewBtn("chart", ChartLine, P.viewChart)}
    </div>
  );

  const body = (
    <>
      {/* ── DAVR (blokning o'zi): Sahifa davri · Hafta · Oy · Butun tarix · Oraliq ── */}
      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-0.5 rounded-lg border border-white/10 bg-black/25 p-0.5">
          {periodBtn(follow, P.followPage, () => setFollow(true))}
          {STAT_PERIODS.filter((p) => LOCAL_PERIODS.includes(p.id)).map((p) =>
            periodBtn(!follow && local.id === p.id, p.label, () => {
              setFollow(false);
              local.setId(p.id);
            })
          )}
        </div>
        {!follow && local.id === "custom" && (
          <DateRangePicker
            from={local.from}
            to={local.to}
            max={localDay()}
            onChange={(f, t2) => {
              local.setFrom(f);
              local.setTo(t2);
            }}
          />
        )}
        <span className="font-mono text-[10px] text-slate-500">
          {period.from} … {period.to}
        </span>
      </div>

      {/* ── TOIFA: qatorlarda BITTA (radio), grafikda ✓ KATAKCHALAR (bir nechta) ── */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-500">{P.pick}</span>
        {ATT_TYPES.map((x) => {
          const id = x.id as AttType | "staff";
          const total = id === "staff" ? null : cat(id).total;
          const active = x.supported && (view === "rows" ? attType === id : !hidden.has(id as AttType));
          return (
            <button
              key={x.id}
              type="button"
              onClick={x.supported ? () => (view === "rows" ? setAttType(id as AttType) : toggleHidden(id as AttType)) : undefined}
              disabled={!x.supported}
              aria-pressed={active}
              title={!x.supported ? P.staffNoSource : undefined}
              style={{ ["--c" as string]: x.color }}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11.5px] font-semibold transition-all ${
                !x.supported
                  ? "cursor-not-allowed border-white/[0.08] bg-white/[0.02] text-slate-600"
                  : active
                    ? "border-[color:var(--c)]/70 bg-[color:var(--c)]/[0.14] text-white shadow-[0_0_14px_-4px_var(--c)]"
                    : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/25 hover:text-slate-200"
              }`}
            >
              {!x.supported ? (
                <Lock size={12} weight="bold" />
              ) : view === "chart" ? (
                <span
                  aria-hidden
                  className={`grid h-3.5 w-3.5 flex-none place-items-center rounded-[4px] border ${active ? "border-transparent" : "border-white/25"}`}
                  style={active ? { background: x.color } : undefined}
                >
                  {active && <Check size={10} weight="bold" className="text-[#08101F]" />}
                </span>
              ) : (
                <x.Icon size={13} weight="duotone" />
              )}
              {typeLabel(x.id)}
              <span className={`font-mono text-[10.5px] ${active ? "text-white/80" : "text-slate-500"}`}>
                {total == null ? "—" : `(${n(total)})`}
              </span>
            </button>
          );
        })}
      </div>

      {/* ⚠️ QAT'IY balandlik — `ResponsiveContainer` `flex-1`da nolga tushardi (yuqoridagi izoh) */}
      <div className={`relative ${view === "chart" ? "h-[280px]" : "min-h-[180px]"}`}>
        {loading && <PanelLoader days={period.days} allTime={period.id === "all"} className="absolute inset-0 z-10" />}
        {!loading && rows.length === 0 ? (
          <EmptyState className="h-full min-h-[180px]" title={P.noAttData} />
        ) : view === "chart" ? (
          /* ── GRAFIK: to'g'ri kesmalar (`linear`), foiz o'qi, tugun yorliqlari ── */
          <ResponsiveContainer width="100%" height="100%" className={loading ? "invisible" : ""}>
            <AreaChart data={series} margin={{ top: 26, right: 56, bottom: 0, left: 0 }}>
              <defs>
                {ATT_TYPES.filter((x) => x.supported).map((x) => (
                  <linearGradient key={x.id} id={`datt-${x.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={x.color} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={x.color} stopOpacity={0.02} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid stroke="rgba(120,150,200,0.08)" vertical={false} />
              <XAxis dataKey="day" tick={AXIS} tickLine={false} axisLine={false} interval={series.length > 8 ? "preserveStartEnd" : 0} minTickGap={16} />
              <YAxis
                tick={AXIS}
                tickLine={false}
                axisLine={false}
                width={Y_AXIS_W}
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip contentStyle={TOOLTIP} itemStyle={TOOLTIP_ITEM} labelStyle={TOOLTIP_LABEL} formatter={(v: number, name: string) => [`${v}%`, typeLabel(name)]} />
              {ATT_TYPES.filter((x) => x.supported).map((x) =>
                hidden.has(x.id as AttType) ? null : (
                  <Area
                    key={x.id}
                    /* ⚠️ `linear` — TO'G'RI chiziq, keskin qayrilish (foydalanuvchi so'rovi) */
                    type="linear"
                    dataKey={x.id}
                    stroke={x.color}
                    strokeWidth={2}
                    fill={`url(#datt-${x.id})`}
                    isAnimationActive={false}
                    dot={<ClickableDot tone={x.color} onPick={onPointPick} />}
                    activeDot={<ClickableDot tone={x.color} r={4.5} onPick={onPointPick} />}
                    /* DOIMIY tugun yorlig'i: "84% (509 ta)" — 14 tadan ko'p nuqtada
                       sig'maydi, u holda faqat tooltip */
                    label={
                      series.length <= 14 ? (
                        <NodeLabel
                          color={x.color}
                          counts={series.map((s) => s[`${x.id}_n` as "student_n" | "teacher_n"])}
                          below={x.id === "teacher"}
                          unit={t.stats.panel.countOf("").trim()}
                        />
                      ) : undefined
                    }
                  />
                )
              )}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          /* ── QATORLAR: 4 ustunli tekis jadval ── */
          <div className={`max-h-[440px] overflow-y-auto pr-1 ${loading ? "invisible" : ""}`}>
            {isToday && <p className="pb-1 text-[10px] uppercase tracking-wide text-slate-500">{P.hourlyAtt}</p>}
            <div className="space-y-1.5">
              {rows.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => openDay(r.key, r.label)}
                  title={P.ofTotal(n(r.present), n(r.total))}
                  className={`grid w-full grid-cols-[minmax(96px,150px)_1fr_auto] items-center gap-x-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-left transition-colors ${
                    clickable ? "hover:border-emerald-400/35 hover:bg-white/[0.05]" : "cursor-default"
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate text-[12px] font-semibold text-slate-100">{r.label}</span>
                    {r.isToday && (
                      <span className="flex-none rounded-full border border-emerald-400/35 bg-emerald-400/[0.12] px-1.5 py-px text-[8.5px] font-bold uppercase tracking-wide text-emerald-300">
                        {P.todayTag}
                      </span>
                    )}
                  </span>
                  <span className="h-3.5 overflow-hidden rounded-full bg-slate-700/60 ring-1 ring-white/[0.06]">
                    <span
                      className="block h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_0_12px_-2px_rgba(52,211,153,0.9)] transition-[width] duration-500"
                      style={{ width: `${Math.min(100, r.total > 0 ? r.pct : 0)}%` }}
                    />
                  </span>
                  <span className="grid grid-cols-[auto_auto_52px] items-center gap-1.5">
                    <span className="flex items-center gap-1 rounded-md border border-emerald-400/30 bg-emerald-400/[0.1] px-2 py-1 font-mono text-[10.5px] font-bold text-emerald-300">
                      <CheckCircle size={11} weight="fill" />
                      {P.came(n(r.present))}
                    </span>
                    <span className="flex items-center gap-1 rounded-md border border-rose-400/25 bg-rose-400/[0.08] px-2 py-1 font-mono text-[10.5px] font-bold text-rose-300">
                      <XCircle size={11} weight="fill" />
                      {P.absent(n(r.absent))}
                    </span>
                    <span className="rounded-md bg-white/[0.06] px-1.5 py-1 text-center font-mono text-[12px] font-extrabold text-white">
                      {r.total > 0 ? `${r.pct}%` : "—"}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );

  /* EMBEDDED — boshqa panel ICHIDA (Davomat tabi: halqa ostida), o'z ramkasisiz,
     faqat ingichka sarlavha qatori (2026-10-24, "yuqoriga dumaloq grafikaga qo'shib"). */
  if (embedded) {
    return (
      <div className={`flex flex-col border-t border-white/[0.07] pt-3 ${className}`}>
        <div className="mb-2.5 flex flex-wrap items-center gap-2">
          <span className="text-[10.5px] font-bold uppercase tracking-wider text-ice-cyan/80">{P.dailyAtt}</span>
          <span className="text-[10.5px] text-slate-500">{P.dailyAttHint}</span>
          <div className="ml-auto">{viewToggle}</div>
        </div>
        {body}
      </div>
    );
  }
  return (
    <StatPanel
      title={P.dailyAtt}
      hint={`${P.dailyAttHint} · ${period.label}`}
      right={viewToggle}
      className={`min-h-[260px] ${className}`}
      bodyClass="flex flex-col"
      delay={delay}
    >
      {body}
    </StatPanel>
  );
}
