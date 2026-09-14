/**
 * Statistika → "Hodisalar" tab: aniqlanishlar oqimining kesimlari.
 *
 * ── DAVR TANLOVI ──────────────────────────────────────────────────────
 * ⚠️ Ilgari bu tab `useDetectionFeed()` bergan ro'yxatni to'g'ridan-to'g'ri
 * ko'rsatardi, u esa faqat BUGUNGI kunni skanerlaydi — "Kunlar bo'yicha"
 * diagrammasida bitta nuqta turardi va eski qaydlar umuman ko'rinmasdi.
 * Holbuki serverda ular BOR (o'lchandi 2026-09-02: jami **2054** qayd,
 * eng eskisi **2026-08-25**; kunlar bo'yicha 27-avgust 58, 28-avgust 330,
 * 29-avgust 392, 31-avgust 47, 2-sentabr 1226 — 26 va 30-avgustda esa
 * yozuv yo'q).
 *
 * Endi tabda **Bugun / 7 kun / 30 kun / Hammasi** tanlovi bor va sonlar
 * shu oraliqning HAMMASIDAN hisoblanadi (`useArrivals` sahifama-sahifa
 * o'qiydi). Demo rejimida (kuzatuv posti bo'sh) chaqiruvchi bergan propslar
 * ishlatiladi — o'sha yerda davr tanlovining ma'nosi yo'q.
 *
 * DIQQAT — muassasa kesimi ATAYLAB YO'Q: backend hodisasida joylashuv yo'q va
 * `fromBackend()` kampusni kamera id hashidan tanlaydi (soxta). Shuning uchun
 * bu yerda faqat HAQIQIY maydonlar: vaqt, tur, kamera, jiddiylik.
 */
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
/* Phosphor duotone: signal — AI oqimi, qalqon — xavfli hodisa, soat — pik
   soat, sirena — eng ko'p uchragan tur. */
import { Broadcast, Clock, DownloadSimple, ShieldWarning, Siren } from "@phosphor-icons/react";
import { useT } from "@/i18n";
import { dayMonthLabel, dayMonthLongLabel } from "@/lib/dateLabel";
import { fromNvr, type DetectionEvent } from "@/lib/detectionEvents";
import type { AiSummary } from "@/lib/aiSummary";
import { buildEventStats, csvName, downloadCsv, toCsv, type EventStats } from "@/lib/statistics";
import { buildAiSummary } from "@/lib/aiSummary";
import { useArrivals } from "@/hooks/useTodayArrivals";
import type { StatPeriod } from "@/hooks/useStatPeriod";
import { SEVERITY_COLOR } from "@/lib/alertTypes";
import { DonutChart } from "@/components/dashboard/DashPanel";
import { DataBadge } from "@/components/dashboard/DataBadge";
import { AXIS, KpiTile, StatPanel, TOOLTIP, fmt, Y_AXIS_W } from "@/components/common/panels";

/** Ro'yxatda ko'rsatiladigan so'nggi hodisalar soni (CSV'ga hammasi tushadi). */
const RECENT_LIMIT = 30;

/* ⚠️ MAHALLIY DAVR TANLOVI OLIB TASHLANDI — endi sahifaning YAGONA
   tanlovi ishlatiladi (`StatisticsPage` → `useStatPeriod`). Ilgari bu
   tabda o'z pilyulalari bor edi va sahifadagi boshqa kesimlar bilan
   turli davr ochiq qolib, sonlar bir-biriga zid ko'rinardi. */

export function StatEvents({
  events: propEvents,
  stats: propStats,
  summary: propSummary,
  period,
}: {
  events: DetectionEvent[];
  stats: EventStats;
  summary: AiSummary;
  /** Sahifaning YAGONA davr tanlovi (`StatisticsPage`). */
  period: StatPeriod;
}) {
  const t = useT();
  const n = (v: number) => fmt(v, t.locale);

  /* Tanlangan oraliqning HAMMASI — sahifama-sahifa o'qiladi. */
  const scope = useArrivals({ from: period.from, to: period.to });

  /**
   * Oraliqdagi hodisalar — FAQAT haqiqiy kuzatuv posti oqimi.
   *
   * ⚠️ **NAMOYISH OQIMI OLIB TASHLANDI** (2026-09-05): ilgari
   * `demoEventStream()` oraliqning har kuniga ~90 ta TO'QILGAN qayd
   * yasardi (kunlik shakl va kamera nomlari bilan) — jadval to'la
   * ko'rinardi-yu, birorta qatori haqiqiy emas edi. Oqim bo'sh bo'lsa
   * jadval ham bo'sh qoladi va sababi yoziladi.
   */
  const events = useMemo(() => {
    const mapped = scope.raw
      .map(fromNvr)
      .filter((e): e is DetectionEvent => e !== null)
      .sort((a, b) => b.ts - a.ts);
    return mapped.length > 0 ? mapped : propEvents;
  }, [scope.raw, propEvents]);

  const usingNvr = scope.raw.length > 0;
  /* Diagramma uchun necha kunlik ustun kerak: "Bugun" da 1, aks holda
     tanlangan oraliq (Hammasi — 60, serverda undan eski yozuv yo'q). */
  const stats = useMemo(
    () => (usingNvr ? buildEventStats(events, Math.min(period.days, 60)) : propStats),
    [usingNvr, events, period.days, propStats]
  );
  const summary = useMemo(
    () => (usingNvr ? buildAiSummary(events) : propSummary),
    [usingNvr, events, propSummary]
  );

  const hourly = useMemo(
    () =>
      summary.hourly.map((count, hour) => ({
        hour: String(hour).padStart(2, "0"),
        [t.chart.count]: count,
        peak: hour === summary.peakHour,
      })),
    [summary.hourly, summary.peakHour, t.chart.count]
  );

  const daily = useMemo(
    () =>
      stats.byDay.map((d) => ({
        day: dayMonthLabel(d.date, t),
        [t.chart.count]: d.count,
        [t.common.dangerous]: d.dangerous,
      })),
    /* `t` TO'LIQ dep — `dayMonthLabel()` lug'atning oy nomlaridan
       ham foydalanadi, faqat `t.locale` yetmaydi. */
    [stats.byDay, t]
  );

  const recent = useMemo(() => events.slice(0, RECENT_LIMIT), [events]);

  const exportCsv = () => {
    const csv = toCsv(
      [t.stats.col.date, t.stats.col.time, t.stats.col.type, t.stats.col.camera, t.stats.col.severity, t.common.confidence],
      events.map((e) => [
        new Date(e.ts).toLocaleDateString(t.locale),
        e.time,
        t.ai.types[e.type],
        e.camera,
        t.stats.severity[e.severity],
        e.confidence ?? "",
      ])
    );
    downloadCsv(csvName("statistika-hodisalar"), csv);
  };

  const summaryDay = summary.day
    ? dayMonthLongLabel(summary.day, t)
    : "—";
  const peakLabel = summary.peakHour === null ? "—" : `${String(summary.peakHour).padStart(2, "0")}:00`;

  return (
    <div className="flex flex-col gap-3">
      {/* ── AI xulosasi ── */}
      <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
        <KpiTile
          Icon={Broadcast}
          label={t.stats.kpi.detections}
          value={n(stats.total)}
          hint={t.stats.hint.dayTotal(n(summary.total), summaryDay)}
          tone="#8FB8FF"
        />
        <KpiTile
          Icon={ShieldWarning}
          label={t.common.dangerous}
          value={n(stats.dangerous)}
          hint={t.stats.hint.dangerousShare(stats.total > 0 ? Math.round((stats.dangerous / stats.total) * 100) : 0)}
          tone="#FB7185"
        />
        <KpiTile
          Icon={Clock}
          label={t.stats.kpi.peak}
          value={peakLabel}
          hint={t.stats.hint.peakCount(summary.peakCount)}
          tone="#F59E0B"
        />
        <KpiTile
          Icon={Siren}
          label={t.stats.kpi.topType}
          value={summary.topType ? t.ai.types[summary.topType] : "—"}
          hint={t.stats.hint.cameraCount(stats.byCamera.length)}
          tone="#A78BFA"
        />
      </div>

      {summary.anomalies.length > 0 && (
        <div className="hik-glass-blue flex flex-wrap items-center gap-2 rounded-xl px-3 py-2">
          <span className="text-[10px] uppercase tracking-wider text-rose-300/80">{t.stats.anomalyTitle}</span>
          {summary.anomalies.map((a) => (
            <span key={a.type} className="rounded-full bg-rose-500/12 px-2 py-0.5 text-[10.5px] text-rose-200">
              {t.stats.anomaly(t.ai.types[a.type], a.count, String(a.usual))}
            </span>
          ))}
        </div>
      )}

      {/* ── Soatlik zichlik + kunlik dinamika ── */}
      <div className="grid gap-3 xl:grid-cols-2">
        <StatPanel
          title={t.stats.panel.density}
          hint={t.stats.panel.densityHint(summaryDay)}
          right={<DataBadge live={usingNvr} />}
          className="min-h-[210px]"
        >
          <div className="h-[170px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourly} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="rgba(120,150,200,0.08)" vertical={false} />
                <XAxis dataKey="hour" tick={AXIS} tickLine={false} axisLine={false} interval={1} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} width={Y_AXIS_W} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                {/* Eng gavjum soat qizil — konsoldagi timeline bilan bir xil qoida */}
                <Bar dataKey={t.chart.count} radius={[3, 3, 0, 0]} fill="#8FB8FF">
                  {hourly.map((h) => (
                    <Cell key={h.hour} fill={h.peak ? "#F43F5E" : "#8FB8FF"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </StatPanel>

        <StatPanel
          title={t.stats.panel.daily}
          hint={t.stats.panel.dailyHint}
          right={<DataBadge live={usingNvr} />}
          className="min-h-[210px]"
          delay={0.04}
        >
          {daily.length === 0 ? (
            <p className="py-6 text-center text-[11.5px] text-slate-500">{t.stats.emptyEvents}</p>
          ) : (
            <div className="h-[170px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={daily} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="rgba(120,150,200,0.08)" vertical={false} />
                  <XAxis dataKey="day" tick={AXIS} tickLine={false} axisLine={false} interval={0} />
                  <YAxis tick={AXIS} tickLine={false} axisLine={false} width={Y_AXIS_W} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP} />
                  <Line type="monotone" dataKey={t.chart.count} stroke="#8FB8FF" strokeWidth={2} dot={{ r: 2.5 }} />
                  <Line type="monotone" dataKey={t.common.dangerous} stroke="#FB7185" strokeWidth={2} dot={{ r: 2.5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </StatPanel>
      </div>

      {/* ── Jiddiylik + kameralar ── */}
      <div className="grid gap-3 xl:grid-cols-[1fr_1.4fr]">
        <StatPanel title={t.stats.panel.severity} className="min-h-[180px]" delay={0.08}>
          {stats.bySeverity.length === 0 ? (
            <p className="py-6 text-center text-[11.5px] text-slate-500">{t.stats.emptyEvents}</p>
          ) : (
            <DonutChart
              size={104}
              total={stats.total}
              caption={t.stats.kpi.detections}
              segments={stats.bySeverity.map((s) => ({
                label: t.stats.severity[s.key],
                value: s.count,
                color: SEVERITY_COLOR[s.key],
              }))}
            />
          )}
        </StatPanel>

        <StatPanel title={t.stats.panel.cameraTop} hint={t.stats.panel.cameraTopHint} className="min-h-[180px]" delay={0.12}>
          {stats.byCamera.length === 0 ? (
            <p className="py-6 text-center text-[11.5px] text-slate-500">{t.stats.emptyEvents}</p>
          ) : (
            <ul className="space-y-1.5">
              {stats.byCamera.map((c) => (
                <li key={c.camera} className="flex items-center gap-2.5">
                  <span className="w-40 flex-none truncate text-[11.5px] text-slate-200">{c.camera}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
                    <div
                      className="h-full rounded-full bg-ice/70"
                      style={{ width: `${(c.count / stats.byCamera[0].count) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 flex-none text-right font-mono text-[11px] text-slate-400">{c.count}</span>
                </li>
              ))}
            </ul>
          )}
        </StatPanel>
      </div>

      {/* ── So'nggi hodisalar jadvali ── */}
      <StatPanel
        title={t.stats.panel.recent}
        hint={t.stats.panel.recentHint(RECENT_LIMIT)}
        right={
          <span className="flex items-center gap-2">
            <DataBadge live={usingNvr} />
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
        delay={0.16}
        bodyClass="overflow-x-auto"
      >
        <table className="w-full min-w-[620px] border-collapse text-[11.5px]">
          <thead className="text-[9.5px] uppercase tracking-wide text-slate-500">
            <tr className="border-b border-white/[0.08]">
              <th className="px-2 py-1.5 text-left font-medium">{t.stats.col.time}</th>
              <th className="px-2 py-1.5 text-left font-medium">{t.stats.col.type}</th>
              <th className="px-2 py-1.5 text-left font-medium">{t.stats.col.camera}</th>
              <th className="px-2 py-1.5 text-right font-medium">{t.stats.col.severity}</th>
              <th className="px-2 py-1.5 text-right font-medium">{t.common.confidence}</th>
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-500">
                  {t.stats.emptyEvents}
                </td>
              </tr>
            )}
            {recent.map((e) => (
              <tr key={e.id} className="border-b border-white/[0.04]">
                <td className="px-2 py-1.5 font-mono text-slate-400">{e.time}</td>
                <td className="px-2 py-1.5 text-slate-100">{t.ai.types[e.type]}</td>
                <td className="max-w-[220px] truncate px-2 py-1.5 text-slate-400">{e.camera}</td>
                <td className="px-2 py-1.5 text-right">
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold"
                    style={{
                      color: SEVERITY_COLOR[e.severity],
                      background: `color-mix(in srgb, ${SEVERITY_COLOR[e.severity]} 14%, transparent)`,
                    }}
                  >
                    {t.stats.severity[e.severity]}
                  </span>
                </td>
                {/* Backend `/events` ishonch darajasini BERMAYDI — bo'sh chiziqcha */}
                <td className="px-2 py-1.5 text-right font-mono text-slate-400">
                  {e.confidence === undefined ? "—" : `${e.confidence}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </StatPanel>
    </div>
  );
}
