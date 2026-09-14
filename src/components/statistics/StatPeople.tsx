/**
 * Statistika → **O'qituvchilar / Talabalar / Xodimlar** tab: **kun davomida
 * kim nima qildi va holati qanday edi**.
 *
 * ⚠️ Toifa endi TASHQARIDAN keladi (`personType` propi) — ilgari bu yerda
 * o'z ichki tugmasi bor edi ("Hammasi/Talabalar/O'qituvchilar/Xodimlar"),
 * lekin Statistika sahifasining yuqori tab qatorida bitta umumiy "Shaxslar"
 * bo'limi turardi. Endi uchala toifa TO'G'RIDAN-TO'G'RI yuqori tab —
 * "Hammasi" tanlovi olib tashlandi, ichki tugma qatori shu sahifa
 * darajasiga ko'chdi (`StatisticsPage.tsx`).
 *
 * Manba HAQIQIY va YAGONA hookdan — `useStudentDay(personType, date)`
 * (`/persons` + o'sha kundagi `/attendance`). Zaxira qoidasi ham o'sha yerda:
 * backend bo'sh bo'lsa DEMO to'plam ko'rsatiladi va `live:false` qaytadi.
 * Bu yerda hech qanday yangi mock YO'Q.
 *
 * Hisob mantiqi komponentda emas:
 *   · `lib/studentStats.ts` — kunlik jamlanma (kelgan/kechikkan/guruhlar),
 *   · `lib/personDay.ts`    — har bir shaxsning kun kesimi (kirdi → joylar →
 *     chiqdi + kayfiyat/agressiya),
 *   · `lib/moodTimeline.ts` — dars kesimidagi e'tibor (`buildGroupMood`).
 *
 * Tanlangan shaxs uchun mavjud profil panellari QAYTA ISHLATILADI
 * (`PersonMovement`, `PersonMood`) — ular ham o'sha hookdan o'qiydi, ya'ni
 * qo'shimcha so'rov paydo bo'lmaydi va xulosa ikki joyda bir xil chiqadi.
 */
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Clock, DoorOpen, DownloadSimple, SignIn, Student, UserMinus, Warning } from "@phosphor-icons/react";
import { useT } from "@/i18n";
import type { PersonType } from "@/lib/api";
import { useStudentDay } from "@/hooks/useStudentDay";
import type { StatPeriod } from "@/hooks/useStatPeriod";
import { buildStudentStats, LATE_AFTER_MIN } from "@/lib/studentStats";
import { buildPersonDays, summarizePersonDays, type PersonDay } from "@/lib/personDay";
import { buildGroupMood } from "@/lib/moodTimeline";
import { slotTime } from "@/config/lessons";
import { csvName, downloadCsv, sortRows, toCsv, type SortDir } from "@/lib/statistics";
import { DataBadge } from "@/components/dashboard/DataBadge";
import { PersonMovement } from "@/components/people/PersonMovement";
import { PersonMood } from "@/components/people/PersonMood";
import { AXIS, CellBar, KpiTile, StatPanel, TOOLTIP, Th, rateTone } from "@/components/common/panels";
import { Pagination } from "@/components/common/Pagination";

type SortKey = "name" | "group" | "entryAt" | "exitAt" | "insideMin" | "cameras" | "attention";
/** Ro'yxat filtri — operator ko'pincha "muammoli"larni qidiradi. */
type Focus = "all" | "absent" | "late" | "aggressive" | "inside";

/** Shundan past e'tibor — jadval katagi sariq (PersonMood bilan bir xil chegara). */
/** Jadvalda bir sahifada nechta qator (hisob-kitob BUTUN ro'yxat bo'yicha). */
const ROWS_PER_PAGE = 25;

const LOW_ATTENTION = 55;

export function StatPeople({
  query,
  period,
  personType,
  onSelectType,
}: {
  query: string;
  period: StatPeriod;
  /** Qaysi toifa ko'rsatilyapti — endi YUQORI tab (`StatisticsPage.tsx`) belgilaydi. */
  personType: PersonType;
  /** Taqqoslash diagrammasida boshqa toifa bosilsa — o'sha tabga o'tkazadi. */
  onSelectType?: (id: PersonType) => void;
}) {
  const t = useT();
  /* Sana — sahifaning YAGONA davr tanlovidan (oxirgi kuni). Kun kesimi
     bitta kun uchun ma'noga ega, shuning uchun oraliqning OXIRI olinadi. */
  const date = period.to;
  const [focus, setFocus] = useState<Focus>("all");
  const [sort, setSort] = useState<SortKey>("name");
  const [dir, setDir] = useState<SortDir>("asc");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  /* Uchala toifa ham SHARTSIZ so'raladi (hooklar soni qat'iy bo'lishi
     kerak). `/attendance` so'rovi uchalasida bir xil kalitga tushadi —
     React Query uni bir marta oladi. Bu shu bilan bir qatorda taqqoslash
     diagrammasi (`byType`) uchun ham kerak — faqat TANLANGAN toifa emas,
     uchalasi ham ko'rsatiladi. */
  const student = useStudentDay("student", date);
  const teacher = useStudentDay("teacher", date);
  const staff = useStudentDay("staff", date);

  /** Joriy tab — bitta toifa (endi "Hammasi" yo'q). */
  const src = useMemo(() => {
    if (personType === "teacher") return teacher;
    if (personType === "staff") return staff;
    return student;
  }, [personType, student, teacher, staff]);

  /** Toifa kesimi — taqqoslash diagrammasi shundan chiziladi. */
  const byType = useMemo(
    () =>
      (
        [
          { id: "student" as PersonType, label: t.stats.people.typeStudent, src: student, color: "#34D399" },
          { id: "teacher" as PersonType, label: t.stats.people.typeTeacher, src: teacher, color: "#85E0FF" },
          { id: "staff" as PersonType, label: t.stats.people.typeStaff, src: staff, color: "#F59E0B" },
        ]
      ).map((r) => {
        const s = buildStudentStats(r.src.persons, r.src.records);
        return { ...r, total: s.total, present: s.attended, late: s.late, absent: s.absent, rate: s.rate };
      }),
    [student, teacher, staff, t.stats.people.typeStudent, t.stats.people.typeTeacher, t.stats.people.typeStaff]
  );

  const stats = useMemo(() => buildStudentStats(src.persons, src.records), [src.persons, src.records]);
  /* `t.locale` dep sifatida kerak: joy nomi (`placeOf`) lug'atdan olinadi va
     til almashganda qayta hisoblanishi shart. */
  const days = useMemo(
    () => buildPersonDays(src.persons, src.records, src.cameraName),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [src.persons, src.records, src.cameraName, t.locale]
  );
  const totals = useMemo(() => summarizePersonDays(days), [days]);
  const groupMood = useMemo(() => buildGroupMood(src.records), [src.records]);

  const onSort = (key: SortKey) => {
    if (key === sort) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSort(key);
      setDir(key === "name" || key === "group" ? "asc" : "desc");
    }
  };

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = days.filter((d) => {
      if (focus === "absent" && d.present) return false;
      if (focus === "late" && !d.late) return false;
      if (focus === "aggressive" && !d.aggressive) return false;
      if (focus === "inside" && !d.stillInside) return false;
      if (!q) return true;
      return d.name.toLowerCase().includes(q) || d.group.toLowerCase().includes(q);
    });
    return sortRows(filtered, sort, dir, t.locale);
  }, [days, focus, query, sort, dir, t.locale]);

  /* ⚠️ **JADVAL SAHIFALANADI.** Ilgari `rows` TO'LIQ chizilardi — backend
     bo'sh bo'lgani uchun bu sezilmasdi. 1 000 o'quvchida esa bitta
     ekranga 1 000 ta `<tr>` (~9 000 DOM tugun) tushardi va har saralash,
     har qidiruv harfida qaytadan chizilardi. Hisob-kitob (KPI, diagramma,
     CSV) avvalgidek BUTUN ro'yxat bo'yicha — faqat ko'rinadigan qism
     kesiladi. */
  const totalPages = Math.max(1, Math.ceil(rows.length / ROWS_PER_PAGE));
  const pageRows = useMemo(
    () => rows.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE),
    [rows, page]
  );
  /* Filtr/saralash/toifa o'zgarsa 7-sahifada osilib qolmaslik uchun */
  useEffect(() => {
    setPage(1);
  }, [focus, query, sort, dir, personType]);

  const selected = useMemo(
    () => src.persons.find((p) => p.id === selectedId) ?? null,
    [src.persons, selectedId]
  );

  const hourly = useMemo(
    () =>
      stats.hourly.map((h) => ({
        hour: String(h.hour).padStart(2, "0"),
        [t.people.entry]: h.entry,
        [t.people.exit]: h.exit,
      })),
    [stats.hourly, t.people.entry, t.people.exit]
  );

  const lessons = useMemo(
    () =>
      groupMood.lessons.map((l) => ({
        name: t.people.mood.lessonN(l.slot.n),
        time: `${slotTime(l.slot.from)}–${slotTime(l.slot.to)}`,
        attention: l.attention,
        negative: l.negative,
        total: l.total,
      })),
    [groupMood.lessons, t.people.mood]
  );

  const dur = (min: number) => t.people.movement.duration(Math.floor(min / 60), min % 60);
  const lateLabel = `${String(Math.floor(LATE_AFTER_MIN / 60)).padStart(2, "0")}:${String(LATE_AFTER_MIN % 60).padStart(2, "0")}`;

  const exportCsv = () => {
    const csv = toCsv(
      [
        t.stats.people.col.name,
        t.stats.people.col.group,
        t.stats.people.col.entry,
        t.stats.people.col.exit,
        t.stats.people.col.inside,
        t.stats.people.col.cameras,
        t.stats.people.col.places,
        t.people.mood.attention,
        t.stats.people.col.state,
      ],
      rows.map((d) => [
        d.name,
        d.group,
        d.entryAt ?? "",
        d.exitAt ?? "",
        d.insideMin,
        d.cameras,
        d.places.join(" | "),
        d.attention ?? "",
        stateLabel(d, t),
      ])
    );
    downloadCsv(csvName(`statistika-shaxslar-${personType}`), csv);
  };

  const focusTabs: { id: Focus; label: string; count: number }[] = [
    { id: "all", label: t.common.all, count: days.length },
    { id: "inside", label: t.people.kpi.inside, count: totals.inside },
    { id: "late", label: t.people.tabLate, count: totals.late },
    { id: "absent", label: t.people.tabAbsent, count: totals.absent },
    { id: "aggressive", label: t.people.tabAggressive, count: totals.aggressive },
  ];

  /** Umumiy diagramma uchun ustunlar (uch toifa yonma-yon). */
  const chart = useMemo(
    () => byType.map((r) => ({ name: r.label, Kelgan: r.present, Kechikkan: r.late, Kelmagan: r.absent })),
    [byType]
  );
  /** Tanlangan toifaning yorlig'i — diagrammani filtrlash uchun. */
  const typeLabel = byType.find((r) => r.id === personType)?.label ?? "";

  return (
    <div className="flex flex-col gap-3">
      {/* ── Qaysi kun ── ("Kim" — endi yuqori tab, StatisticsPage.tsx) */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-slate-500">
          {t.people.movement.dateLabel} <b className="font-mono text-slate-300">{date}</b>
        </span>

        <DataBadge live={src.live} />
        {!src.live && <span className="text-[10.5px] text-slate-500">{t.people.demoHint}</span>}
      </div>

      {/* ── Kun ko'rsatkichlari ── */}
      <div className="grid grid-cols-4 gap-2 xl:grid-cols-6">
        <KpiTile Icon={Student} label={t.people.kpi.total} value={stats.total} tone="#8FB8FF" />
        <KpiTile
          Icon={SignIn}
          label={t.people.kpi.attended}
          value={stats.attended}
          hint={`${stats.rate}%`}
          tone="#34D399"
        />
        <KpiTile Icon={DoorOpen} label={t.people.kpi.inside} value={totals.inside} tone="#85E0FF" />
        <KpiTile Icon={UserMinus} label={t.people.kpi.absent} value={totals.absent} tone="#FB7185" />
        <KpiTile
          Icon={Clock}
          label={t.people.kpi.late}
          value={totals.late}
          hint={t.people.lateAfter(lateLabel)}
          tone="#F59E0B"
        />
        
        <KpiTile
          Icon={Warning}
          label={t.people.tabAggressive}
          value={totals.aggressive}
          hint={totals.avgAttention !== null ? t.stats.people.avgAttention(totals.avgAttention) : undefined}
          tone="#F43F5E"
        />
      </div>

      {/* ── UCH TOIFA — TAQQOSLASH DIAGRAMMASI ──
          Joriy tab bitta ustun bo'lib ko'rsatiladi; pastdagi yorliqlarga
          bosilsa (agar `onSelectType` berilgan bo'lsa) boshqa toifa tabiga
          o'tiladi — Statistika sahifasining yuqori tab qatoriga qaraydi. */}
      <StatPanel
        title="Kelganlar / Kechikkanlar / Kelmaganlar"
        hint={`${period.label} · ${date}`}
        right={<DataBadge live={src.live} />}
        className="min-h-[190px]"
      >
        <div className="h-[150px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chart.filter((c) => c.name === typeLabel)}
              margin={{ top: 6, right: 8, bottom: 0, left: 0 }}
            >
              <CartesianGrid stroke="rgba(120,150,200,0.08)" vertical={false} />
              <XAxis dataKey="name" tick={AXIS} tickLine={false} axisLine={false} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} width={34} />
              <Tooltip contentStyle={TOOLTIP} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar dataKey="Kelgan" fill="#34D399" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Kechikkan" fill="#F59E0B" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Kelmagan" fill="#FB7185" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Toifa yorliqlari — boshqa ikkitasi qanday turganini ko'rsatadi;
            bosilsa (agar mumkin bo'lsa) o'sha toifa tabiga o'tkazadi. */}
        <ul className="mt-1.5 flex flex-wrap gap-2 border-t border-white/10 pt-1.5">
          {byType.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => onSelectType?.(r.id)}
                disabled={!onSelectType}
                className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-[10.5px] transition-colors ${
                  personType === r.id ? "bg-white/[0.1] text-slate-100" : "text-slate-400"
                } ${onSelectType ? "hover:text-slate-200" : "cursor-default"}`}
              >
                <span className="h-2 w-2 rounded-sm" style={{ background: r.color }} />
                {r.label}
                <b className="font-mono text-slate-200">{r.present}</b>
                <i className="not-italic text-slate-600">/ {r.total}</i>
              </button>
            </li>
          ))}
        </ul>
      </StatPanel>

      {!stats.hasData && (
        <div className="hik-glass-blue rounded-2xl px-4 py-3">
          <p className="text-[12px] font-semibold text-amber-300/90">{t.people.noData}</p>
          <p className="mt-1 text-[11px] leading-snug text-slate-400">{t.people.noDataHint}</p>
        </div>
      )}

      {/* ── Kun ritmi: kirish/chiqish va dars kesimi ── */}
      <div className="grid gap-3 xl:grid-cols-2">
        <StatPanel title={t.people.hourlyTitle} className="min-h-[210px]">
          <div className="h-[170px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourly} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="rgba(120,150,200,0.08)" vertical={false} />
                <XAxis dataKey="hour" tick={AXIS} tickLine={false} axisLine={false} interval={1} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} width={30} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar dataKey={t.people.entry} fill="#34D399" radius={[3, 3, 0, 0]} />
                <Bar dataKey={t.people.exit} fill="#F59E0B" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </StatPanel>

        <StatPanel
          title={t.people.mood.byLesson}
          hint={t.stats.people.lessonsHint}
          className="min-h-[210px]"
          delay={0.04}
        >
          {lessons.length === 0 ? (
            <p className="py-6 text-center text-[11.5px] text-slate-500">{t.people.mood.noLessons}</p>
          ) : (
            <div className="h-[170px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lessons} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="rgba(120,150,200,0.08)" vertical={false} />
                  <XAxis dataKey="name" tick={AXIS} tickLine={false} axisLine={false} interval={0} />
                  <YAxis tick={AXIS} tickLine={false} axisLine={false} width={30} domain={[0, 100]} />
                  <Tooltip contentStyle={TOOLTIP} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                  {/* Past e'tibor qizil — qaysi darsda muammo borligi darrov ko'rinsin */}
                  <Bar dataKey="attention" name={t.people.mood.attention} radius={[3, 3, 0, 0]}>
                    {lessons.map((l) => (
                      <Cell key={l.name} fill={rateTone(l.attention)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <p className="mt-1 text-[9.5px] leading-snug text-slate-600">{t.people.mood.derivedHint}</p>
        </StatPanel>
      </div>

     

      {/* ── Kun kesimi: har bir shaxs ── */}
      <StatPanel
        title={t.stats.people.table}
        hint={t.stats.people.tableHint}
        right={
          <span className="flex items-center gap-2">
            <DataBadge live={src.live} />
            <button
              type="button"
              onClick={exportCsv}
              title={t.stats.exportHint}
              className="hik-chip px-2 py-1 text-[10px] text-slate-300 transition-colors hover:text-ice-bright"
            >
              <DownloadSimple size={12} weight="bold" />
              {t.stats.exportCsv}
            </button>
          </span>
        }
        delay={0.12}
      >
        <div className="mb-2 flex flex-wrap gap-1.5">
          {focusTabs.map((x) => (
            <button
              key={x.id}
              type="button"
              onClick={() => setFocus(x.id)}
              className={`rounded-lg px-2 py-1 text-[10.5px] font-semibold transition-colors ${
                focus === x.id
                  ? "border border-ice/40 bg-ice/[0.12] text-ice-bright"
                  : "border border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              {x.label} <b className="font-mono">{x.count}</b>
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-[11.5px]">
            <thead className="text-[9.5px] uppercase tracking-wide text-slate-500">
              <tr className="border-b border-white/[0.08]">
                <Th id="name" label={t.stats.people.col.name} sort={sort} dir={dir} onSort={onSort} align="left" hint={t.stats.sortHint} />
                <Th id="group" label={t.stats.people.col.group} sort={sort} dir={dir} onSort={onSort} align="left" />
                <Th id="entryAt" label={t.stats.people.col.entry} sort={sort} dir={dir} onSort={onSort} />
                <Th id="exitAt" label={t.stats.people.col.exit} sort={sort} dir={dir} onSort={onSort} />
                <Th id="insideMin" label={t.stats.people.col.inside} sort={sort} dir={dir} onSort={onSort} />
                <Th id="cameras" label={t.stats.people.col.cameras} sort={sort} dir={dir} onSort={onSort} />
                <th className="px-2 py-1.5 text-left font-medium">{t.stats.people.col.places}</th>
                <Th id="attention" label={t.people.mood.attention} sort={sort} dir={dir} onSort={onSort} />
                <th className="px-2 py-1.5 text-right font-medium">{t.stats.people.col.state}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-slate-500">
                    {t.stats.nothing}
                  </td>
                </tr>
              )}
              {pageRows.map((d) => (
                <tr
                  key={d.id}
                  onClick={() => setSelectedId(d.id)}
                  title={t.stats.people.rowHint}
                  className={`cursor-pointer border-b border-white/[0.04] transition-colors hover:bg-white/[0.04] ${
                    selectedId === d.id ? "bg-ice/[0.07]" : ""
                  } ${d.present ? "" : "opacity-60"}`}
                >
                  <td className="max-w-[200px] truncate px-2 py-1.5 font-semibold text-slate-100">{d.name}</td>
                  <td className="px-2 py-1.5 text-slate-400">{d.group}</td>
                  <td className={`px-2 py-1.5 text-right font-mono ${d.late ? "text-amber-300" : "text-slate-300"}`}>
                    {d.entryAt ?? "—"}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono text-slate-400">
                    {d.exitAt ?? (d.stillInside ? t.people.movement.stillInside : "—")}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono text-slate-400">
                    {d.present ? dur(d.insideMin) : "—"}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono text-slate-400">{d.cameras || "—"}</td>
                  {/* Joylar zanjiri — " → " bilan: joy nomining o'zida " · "
                      bor ("1-qavat · yo'lak"), bir xil ajratuvchi ishlatilsa
                      qayer qayerda tugagani bilinmay qolardi */}
                  <td className="max-w-[240px] truncate px-2 py-1.5 text-slate-400" title={d.places.join(" → ")}>
                    {d.places.length > 0 ? d.places.join(" → ") : "—"}
                  </td>
                  <td className="px-2 py-1.5">
                    {d.attention === null ? (
                      <p className="text-right text-[10px] text-slate-600">{t.stats.people.noMood}</p>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <span
                          className="font-mono"
                          style={{ color: d.attention < LOW_ATTENTION ? "#F59E0B" : "#34D399" }}
                        >
                          {d.attention}%
                        </span>
                        <CellBar pct={d.attention} tone={rateTone(d.attention)} />
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <StateBadge day={d} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="mt-auto border-t border-slate-700/30 px-3">
            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={setPage}
              prevLabel={t.detections.prev}
              nextLabel={t.detections.next}
              ariaLabel={`${page} / ${totalPages}`}
            />
          </div>
        )}
      </StatPanel>

      {/* ── Tanlangan shaxs: kunlik harakat + kayfiyat (mavjud panellar) ── */}
      {selected ? (
        <div className="grid gap-3 xl:grid-cols-2">
          {/* `key={date}` — sana o'zgarsa panel yangi kun bilan qayta ochiladi */}
          <PersonMovement key={`mv-${date}`} person={selected} date={date} />
          <PersonMood key={`md-${date}`} person={selected} date={date} />
        </div>
      ) : (
        <StatPanel title={t.stats.people.detail} delay={0.16}>
          <p className="py-4 text-center text-[11.5px] text-slate-500">{t.stats.people.pick}</p>
        </StatPanel>
      )}
    </div>
  );
}

/* ──────────────────────────── Yordamchi bo'laklar ──────────────────────────── */

type Dict = ReturnType<typeof useT>;

/** Kun yakuniy holati — CSV va nishoncha uchun YAGONA qoida. */
function stateLabel(d: PersonDay, t: Dict): string {
  if (!d.present) return t.people.tabAbsent;
  if (d.aggressive) return t.people.tabAggressive;
  if (d.late) return t.people.tabLate;
  return d.stillInside ? t.people.kpi.inside : t.people.movement.exit;
}

function StateBadge({ day }: { day: PersonDay }) {
  const t = useT();
  const tone = !day.present
    ? "#FB7185"
    : day.aggressive
      ? "#F43F5E"
      : day.late
        ? "#F59E0B"
        : day.stillInside
          ? "#34D399"
          : "#8FB8FF";
  return (
    <span
      style={{ ["--c" as string]: tone }}
      className="inline-flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--c)_45%,transparent)] bg-[color-mix(in_srgb,var(--c)_12%,transparent)] px-1.5 py-0.5 text-[9px] font-semibold text-[color:var(--c)]"
      title={day.aggressive && day.aggressiveAt ? t.people.mood.aggressive(day.aggressiveAt) : undefined}
    >
      {day.aggressive && <Warning size={10} weight="fill" />}
      {stateLabel(day, t)}
    </span>
  );
}
