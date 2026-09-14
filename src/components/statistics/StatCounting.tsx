/**
 * Statistika → "Odamlar oqimi" tab: kamera belgilangan chiziqdan o'tgan
 * odamlarni sanaydi (`FRONTEND.md` 10-A bo'lim, `GET /counting/...`).
 *
 * ⚠️ Bu HODISA emas, O'LCHOV — boshqa toifalardagi kabi namoyish/aniq
 * rejim farqi YO'Q: server bergan raqam har doim haqiqiy, mock zaxirasi
 * yo'q (kuzatuv postining o'zida bunday tushuncha bor-yo'qligi qurilma sozlamasiga
 * bog'liq — hozircha faqat `D1` kamerasida yoqilgan).
 *
 * ⚠️ **Yuqori KPI qatori doim BUGUNGI kun** — davr filtri faqat pastdagi
 * "Qisqacha hisobot" va "Soatlar bo'yicha" bo'limlariga tegishli.
 * (`FRONTEND.md` "Uchta xato": "hozir ichkarida" uchun DOIM `today.inside`
 * ishlatiladi, tanlangan davr bo'yicha hisoblangan `inside` emas — aks
 * holda "30 kun" tanlansa eski qoldiq qo'shilib, ma'nosiz katta son
 * chiqadi.)
 *
 * ⚠️ **`exit` hech qachon sanalmasa** (kamera bir tomonlama sozlangan)
 * "ichkarida" ustuni `—` bilan almashtiriladi — aks holda `inside = enter`
 * bo'lib, "hamma ichkarida qoldi" degan yolg'on son ko'rinardi.
 */
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowsClockwise, ArrowsLeftRight, DoorOpen, SignIn, SignOut, Warning } from "@phosphor-icons/react";
import { useT } from "@/i18n";
import { nvrTime } from "@/lib/nvrApi";
import { cameraPlaceLabel } from "@/config/cameraPlacements";
import { localDay } from "@/hooks/useTodayArrivals";
import { EMPTY_COUNTING_STATS, useCountingCameras, useCountingEvents, useCountingStats } from "@/hooks/useCounting";
import { AXIS, KpiTile, StatPanel, TabPill, TOOLTIP, fmt, Y_AXIS_W } from "@/components/common/panels";

type Preset = "today" | "yesterday" | "d7" | "d30" | "custom";
const PRESETS: Exclude<Preset, "custom">[] = ["today", "yesterday", "d7", "d30"];

function rangeFor(preset: Preset, customFrom: string, customTo: string): { from?: string; to?: string } {
  const today = new Date();
  if (preset === "today") return { from: localDay(today), to: localDay(today) };
  if (preset === "yesterday") {
    const y = new Date(today);
    y.setDate(y.getDate() - 1);
    return { from: localDay(y), to: localDay(y) };
  }
  if (preset === "d7") {
    const from = new Date(today);
    from.setDate(from.getDate() - 6);
    return { from: localDay(from), to: localDay(today) };
  }
  if (preset === "d30") {
    const from = new Date(today);
    from.setDate(from.getDate() - 29);
    return { from: localDay(from), to: localDay(today) };
  }
  return { from: customFrom || undefined, to: customTo || undefined };
}

/** `"2026-09-03 08:35:07"` → mahalliy formatga o'giriladi (`Date` bo'sh joyni tushunmasligi mumkin). */
function fmtReportTime(raw: string | null, locale: string): string | null {
  if (!raw) return null;
  const d = new Date(raw.includes("T") ? raw : raw.replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? raw : d.toLocaleString(locale, { hour12: false });
}

export function StatCounting() {
  const t = useT();
  const c = t.stats.counting;
  const n = (v: number) => fmt(v, t.locale);

  const [preset, setPreset] = useState<Preset>("today");
  const [customFrom, setCustomFrom] = useState(() => localDay());
  const [customTo, setCustomTo] = useState(() => localDay());
  const [camera, setCamera] = useState("");

  const range = useMemo(() => rangeFor(preset, customFrom, customTo), [preset, customFrom, customTo]);
  const stats = useCountingStats({ ...range, camera: camera || undefined });
  const cameras = useCountingCameras();
  const events = useCountingEvents({ ...range, camera: camera || undefined, limit: 12 });

  const s = stats.data ?? EMPTY_COUNTING_STATS;
  /* Bo'sh (`idle`) hisobotlar ro'yxatga tushmaydi — yuqoridagi izohga qarang. */
  const recent = useMemo(
    () => (events.data?.events ?? []).filter((e) => !e.idle).slice(0, 8),
    [events.data]
  );
  const isTodaySelected = preset === "today";

  const hourly = useMemo(() => {
    const byHour = new Map(s.by_hour.map((h) => [h.hour, h]));
    return Array.from({ length: 24 }, (_, h) => {
      const key = String(h).padStart(2, "0");
      const row = byHour.get(key);
      return { hour: key, [c.kpi.enter]: row?.enter ?? 0, [c.kpi.exit]: row?.exit ?? 0 };
    });
  }, [s.by_hour, c.kpi.enter, c.kpi.exit]);

  const peak = useMemo(() => {
    let best: { hour: string; total: number } | null = null;
    for (const h of s.by_hour) {
      const total = h.enter + h.exit;
      if (total > 0 && (!best || total > best.total)) best = { hour: h.hour, total };
    }
    return best;
  }, [s.by_hour]);

  const lastReportLabel = fmtReportTime(s.last_report, t.locale);

  const summaryRows = [
    { label: c.rowToday, row: s.today, show: true },
    { label: c.rowSelected, row: { enter: s.enter, exit: s.exit, pass: s.pass, inside: s.inside, reports: s.reports }, show: !isTodaySelected },
    { label: c.rowAllTime, row: s.all_time, show: true },
  ];

  return (
    <div className="flex flex-col gap-3">

      {/* KPI — doim BUGUNGI kun, davr filtridan mustaqil */}
      <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
        <KpiTile Icon={SignIn} label={c.kpi.enter} value={n(s.today.enter)} hint={c.kpiHint.today} tone="#34D399" />
        <KpiTile Icon={SignOut} label={c.kpi.exit} value={n(s.today.exit)} hint={c.kpiHint.today} tone="#F59E0B" />
        <KpiTile Icon={ArrowsLeftRight} label={c.kpi.pass} value={n(s.today.pass)} hint={c.kpiHint.pass} tone="#85E0FF" />
        <KpiTile
          Icon={DoorOpen}
          label={c.kpi.inside}
          value={s.today.exit > 0 ? n(s.today.inside) : "—"}
          hint={c.kpiHint.inside}
          tone="#A78BFA"
        />
      </div>

      {!s.live && (
        <div className="hik-glass-blue flex items-center gap-2 rounded-xl border border-amber-400/25 px-3 py-2 text-[11px] text-amber-300/90">
          <Warning size={14} weight="fill" className="flex-none" />
          {c.liveWarning} {lastReportLabel ? c.lastReport(lastReportLabel) : c.noReportYet}
        </div>
      )}

      {/* Filtr */}
      <StatPanel title={c.filter} className="min-h-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <TabPill key={p} group="counting-period" active={preset === p} onClick={() => setPreset(p)}>
                {c.period[p]}
              </TabPill>
            ))}
          </div>

          <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
            {c.from}
            <input
              type="date"
              value={preset === "custom" ? customFrom : (range.from ?? "")}
              max={preset === "custom" ? customTo : undefined}
              onChange={(e) => {
                setPreset("custom");
                setCustomFrom(e.target.value);
              }}
              className="hik-input h-7 px-2 text-[11px] text-slate-200 [color-scheme:dark]"
            />
            {c.to}
            <input
              type="date"
              value={preset === "custom" ? customTo : (range.to ?? "")}
              min={preset === "custom" ? customFrom : undefined}
              onChange={(e) => {
                setPreset("custom");
                setCustomTo(e.target.value);
              }}
              className="hik-input h-7 px-2 text-[11px] text-slate-200 [color-scheme:dark]"
            />
          </span>

          <select
            value={camera}
            onChange={(e) => setCamera(e.target.value)}
            className="hik-input h-7 px-2 text-[11px] text-slate-200 [color-scheme:dark] [&_option]:bg-ink-panel [&_option]:text-slate-100"
          >
            <option value="">{c.allCameras}</option>
            {cameras.data?.map((cam) => (
              <option key={cam.id} value={cam.id}>
                {cam.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => stats.refetch()}
            className="hik-chip ml-auto flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] text-slate-300 transition-colors hover:text-ice-bright"
          >
            <ArrowsClockwise size={13} className={stats.isFetching ? "animate-spin" : undefined} />
            {c.refresh}
          </button>
        </div>
      </StatPanel>

      {/* Qisqacha hisobot */}
      <StatPanel title={c.summaryTitle} hint={lastReportLabel ? c.lastReport(lastReportLabel) : undefined}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-[11.5px]">
            <thead className="text-[9.5px] uppercase tracking-wide text-slate-500">
              <tr className="border-b border-white/[0.08]">
                <th className="px-2 py-1.5 text-left font-medium">{c.col.period}</th>
                <th className="px-2 py-1.5 text-right font-medium">{c.col.enter}</th>
                <th className="px-2 py-1.5 text-right font-medium">{c.col.exit}</th>
                <th className="px-2 py-1.5 text-right font-medium">{c.col.inside}</th>
                <th className="px-2 py-1.5 text-right font-medium">{c.col.reports}</th>
              </tr>
            </thead>
            <tbody>
              {summaryRows
                .filter((r) => r.show)
                .map((r) => (
                  <tr key={r.label} className="border-b border-white/[0.04]">
                    <td className="px-2 py-1.5 font-semibold text-slate-100">{r.label}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-emerald-300">{n(r.row.enter)}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-amber-300">{n(r.row.exit)}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-slate-300" title={r.row.exit === 0 ? c.noExitHint : undefined}>
                      {r.row.exit > 0 ? n(r.row.inside) : "—"}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono text-slate-500">{n(r.row.reports)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </StatPanel>

      {/* Soatlar bo'yicha */}
      <StatPanel
        title={c.hourlyTitle}
        hint={`${c.period[preset === "custom" ? "today" : preset]} · ${range.from ?? ""}${range.to && range.to !== range.from ? ` … ${range.to}` : ""}`}
        right={
          peak && (
            <span className="rounded-full border border-ice/30 bg-ice/[0.08] px-2 py-0.5 text-[9.5px] font-semibold text-ice-bright">
              {c.peakHint(peak.hour, peak.total)}
            </span>
          )
        }
        className="min-h-[220px]"
      >
        {cameras.data?.length === 0 && s.reports === 0 ? (
          <p className="py-8 text-center text-[11.5px] text-slate-500">{c.noCameraData}</p>
        ) : (
          <div className="h-[190px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourly} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="rgba(120,150,200,0.08)" vertical={false} />
                <XAxis dataKey="hour" tick={AXIS} tickLine={false} axisLine={false} interval={1} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} width={Y_AXIS_W} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar dataKey={c.kpi.enter} fill="#34D399" radius={[3, 3, 0, 0]} />
                <Bar dataKey={c.kpi.exit} fill="#F59E0B" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </StatPanel>

      {/* ── So'nggi hisobotlar ──
          ⚠️ `idle: true` bo'lganlari CHIQARILMAYDI: qurilma har daqiqada
          hisobot yuboradi va tunda ro'yxat "0 kirdi, 0 chiqdi" qatorlari
          bilan to'lib ketardi. */}
      {recent.length > 0 && (
        <StatPanel title={c.recentTitle} hint={c.recentHint} className="min-h-[120px]">
          <ul className="divide-y divide-white/[0.06]">
            {recent.map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-1.5 text-[11.5px]">
                <span className="w-[52px] flex-none font-mono text-slate-400">{nvrTime(e.time)}</span>
                <span className="min-w-0 flex-1 truncate text-slate-300">
                  {cameraPlaceLabel(e.channel, e.camera)}
                </span>
                <span className="flex-none font-mono text-emerald-300">+{e.counting.enter}</span>
                <span className="flex-none font-mono text-amber-300">−{e.counting.exit}</span>
              </li>
            ))}
          </ul>
        </StatPanel>
      )}
    </div>
  );
}
