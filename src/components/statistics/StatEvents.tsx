/**
 * Statistika → **Hodisalar** tabi.
 *
 * 🔴 **MANBA — `GET /events/stats` + SAHIFALANGAN ro'yxat** (2026-09-15,
 * foydalanuvchi so'rovi: "umumiy ma'lumotni chiqarib, keragini
 * pagination bilan chiqarib beraverasan").
 *
 * Ilgari tab `useArrivals({from,to})` bilan tanlangan davrni XOM holda
 * 100 tadan sahifalab o'qirdi (30+3 so'rovgacha, daqiqada bir), ustiga
 * `StatisticsPage` zaxira uchun BUGUNNI ham alohida skanerlardi. Sonlar
 * baribir 3 000 yozuvda to'xtab, uzun davrda ~1 kunni ko'rsatardi.
 *
 * Endi:
 * · **KPI, soatlik zichlik, kunlar, turlar, kameralar** — server bazada
 *   sanagan sonlar (bitta so'rov, bir necha KB);
 * · "So'nggi hodisalar" jadvali va CSV eksporti 2026-10-26 da OLIB TASHLANDI.
 *
 * ⚠️ Turlar — SERVER kategoriyalari. "Jiddiylik" (kritik/yuqori/o'rta)
 * klient tushunchasi edi va har hodisani ko'rishni talab qilardi —
 * uning o'rniga "Turlari bo'yicha" halqasi. "Xavfli" — janjal + qurol
 * ("Aniqlanganlar" dagi "Xavf signali" bilan AYNI ta'rif).
 *
 * ⚠️ Davr — sahifaning YAGONA tanlovi (`StatisticsPage` → `useStatPeriod`).
 */
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
/* Phosphor duotone: signal — AI oqimi, qalqon — xavfli hodisa, soat — pik
   soat, sirena — eng ko'p uchragan tur. */
import { Broadcast, Clock, ShieldWarning, Siren } from "@phosphor-icons/react";
import { useT } from "@/i18n";
import { dayMonthLabel, dayMonthLongLabel } from "@/lib/dateLabel";
import { useEventStats } from "@/hooks/useEventStats";
import { NVR_CATEGORIES, type NvrRealCategory } from "@/hooks/useEventCounts";
import type { StatPeriod } from "@/hooks/useStatPeriod";
import { cameraPlaceLabel } from "@/config/cameraPlacements";
import { NVR_COLOR } from "@/components/detections/DetectionCard";
import { DonutChart } from "@/components/dashboard/DashPanel";
import { DataBadge } from "@/components/dashboard/DataBadge";
import { AXIS, KpiTile, PanelLoader, StatPanel, TOOLTIP, fmt, Y_AXIS_W } from "@/components/common/panels";
import { EmptyState } from "@/components/common/EmptyState";


/** `YYYY-MM-DD` → mahalliy yarim tun (vaqt zonasi siljimasin). */
const dayDate = (day: string) => new Date(`${day}T00:00:00`);

export function StatEvents({ period }: { period: StatPeriod }) {
  const t = useT();
  const n = (v: number) => fmt(v, t.locale);

  /** Sonlar — server hisobi, bitta so'rov. */
  const s = useEventStats({ from: period.from, to: period.to });
  const live = s.total > 0;

  const lastDay = s.byDay[s.byDay.length - 1] ?? null;
  const lastDayLabel = lastDay ? dayMonthLongLabel(dayDate(lastDay.day), t) : "—";
  const peakLabel = s.peakHour === null ? "—" : `${String(s.peakHour).padStart(2, "0")}:00`;

  const topType = useMemo<NvrRealCategory | null>(() => {
    let best: NvrRealCategory | null = null;
    for (const c of NVR_CATEGORIES) if (s.byCategory[c] > (best ? s.byCategory[best] : 0)) best = c;
    return best;
  }, [s.byCategory]);

  const hourly = useMemo(
    () =>
      s.hourly.map((count, hour) => ({
        hour: String(hour).padStart(2, "0"),
        [t.chart.count]: count,
        peak: hour === s.peakHour,
      })),
    [s.hourly, s.peakHour, t.chart.count]
  );

  /* Kunlar — hodisa bo'lgan kunlar, diagramma o'qilishi uchun 60 tagacha. */
  const daily = useMemo(
    () =>
      s.byDay.slice(-60).map((d) => ({
        day: dayMonthLabel(dayDate(d.day), t),
        [t.chart.count]: d.total,
        [t.common.dangerous]: d.janjal + d.gun,
      })),
    /* `t` TO'LIQ dep — `dayMonthLabel()` lug'atning oy nomlaridan foydalanadi. */
    [s.byDay, t]
  );

  const segments = useMemo(
    () =>
      NVR_CATEGORIES.filter((c) => s.byCategory[c] > 0).map((c) => ({
        label: t.detect.category[c],
        value: s.byCategory[c],
        color: NVR_COLOR[c] ?? "#8FB8FF",
      })),
    [s.byCategory, t]
  );

  const cameras = s.byChannel.slice(0, 8);

  /* 🔴 "So'nggi hodisalar" jadvali (va uning CSV eksporti) OLIB TASHLANDI
     (2026-10-26, foydalanuvchi: "bu kerak emas") — bir xil "Shaxsni aniqlash ·
     Kirish posti" qatorlari hech narsa bermasdi; har hodisani ko'rish uchun
     "Aniqlanganlar" bo'limi bor. */

  return (
    <div className="flex flex-col gap-3">
      {/* ── Asosiy ko'rsatkichlar ──
          Yuklanish — "Umumiy" tabidagi slayder (2026-10-23); ilgari `0` turardi. */}
      {s.isLoading ? (
        <PanelLoader days={period.days} allTime={period.id === "all"} className="h-[74px] rounded-xl" />
      ) : (
      <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
        <KpiTile
          Icon={Broadcast}
          label={t.stats.kpi.detections}
          value={n(s.total)}
          hint={lastDay ? t.stats.hint.dayTotal(n(lastDay.total), lastDayLabel) : undefined}
          tone="#8FB8FF"
        />
        <KpiTile
          Icon={ShieldWarning}
          label={t.common.dangerous}
          value={n(s.danger)}
          hint={t.stats.hint.dangerousShare(s.total > 0 ? Math.round((s.danger / s.total) * 100) : 0)}
          tone="#FB7185"
        />
        <KpiTile
          Icon={Clock}
          label={t.stats.kpi.peak}
          value={peakLabel}
          hint={t.stats.hint.peakCount(s.peakCount)}
          tone="#F59E0B"
        />
        <KpiTile
          Icon={Siren}
          label={t.stats.kpi.topType}
          value={topType ? t.detect.category[topType] : "—"}
          hint={t.stats.hint.cameraCount(s.byChannel.length)}
          tone="#A78BFA"
        />
      </div>
      )}

      {s.anomalies.length > 0 && (
        <div className="hik-glass-blue flex flex-wrap items-center gap-2 rounded-xl px-3 py-2">
          <span className="text-[10px] uppercase tracking-wider text-rose-300/80">{t.stats.anomalyTitle}</span>
          {s.anomalies.map((a) => (
            <span key={a.category} className="rounded-full bg-rose-500/12 px-2 py-0.5 text-[10.5px] text-rose-200">
              {t.stats.anomaly(t.detect.category[a.category], a.count, String(a.usual))}
            </span>
          ))}
        </div>
      )}

      {/* ── Soatlik zichlik + kunlik dinamika ── */}
      <div className="grid gap-3 xl:grid-cols-2">
        <StatPanel
          title={t.stats.panel.density}
          hint={t.stats.panel.densityHint(period.label)}
          right={<DataBadge live={live} />}
          className="min-h-[210px]"
        >
          {s.isLoading ? (
            <PanelLoader days={period.days} allTime={period.id === "all"} className="h-[170px]" />
          ) : (
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
          )}
        </StatPanel>

        <StatPanel
          title={t.stats.panel.daily}
          hint={t.stats.panel.dailyHint}
          right={<DataBadge live={live} />}
          className="min-h-[210px]"
          delay={0.04}
        >
          {s.isLoading ? (
            <PanelLoader days={period.days} allTime={period.id === "all"} className="h-[170px]" />
          ) : daily.length === 0 ? (
            <EmptyState compact className="py-6" title={t.stats.emptyEvents} />
          ) : (
            <div className="h-[170px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={daily} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="rgba(120,150,200,0.08)" vertical={false} />
                  <XAxis dataKey="day" tick={AXIS} tickLine={false} axisLine={false} minTickGap={12} />
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

      {/* ── Turlar + kameralar ── */}
      <div className="grid gap-3 xl:grid-cols-[1fr_1.4fr]">
        <StatPanel title={t.dashboard.byCategory} className="min-h-[180px]" delay={0.08}>
          {s.isLoading ? (
            <PanelLoader days={period.days} allTime={period.id === "all"} className="h-[120px]" />
          ) : segments.length === 0 ? (
            <EmptyState compact className="py-6" title={t.stats.emptyEvents} />
          ) : (
            <DonutChart size={104} total={s.total} caption={t.stats.kpi.detections} segments={segments} />
          )}
        </StatPanel>

        <StatPanel title={t.stats.panel.cameraTop} hint={t.stats.panel.cameraTopHint} className="min-h-[180px]" delay={0.12}>
          {s.isLoading ? (
            <PanelLoader days={period.days} allTime={period.id === "all"} className="h-[120px]" />
          ) : cameras.length === 0 ? (
            <EmptyState compact className="py-6" title={t.stats.emptyEvents} />
          ) : (
            <ul className="space-y-1.5">
              {cameras.map((c) => (
                <li key={c.channel} className="flex items-center gap-2.5">
                  <span className="w-40 flex-none truncate text-[11.5px] text-slate-200" title={`#${c.channel}`}>
                    {cameraPlaceLabel(c.channel, c.camera)}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
                    <div className="h-full rounded-full bg-ice/70" style={{ width: `${(c.total / cameras[0].total) * 100}%` }} />
                  </div>
                  <span className="w-12 flex-none text-right font-mono text-[11px] text-slate-400">{n(c.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </StatPanel>
      </div>
    </div>
  );
}
