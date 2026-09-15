"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Broadcast, Clock, SecurityCamera, ShieldWarning, UserFocus } from "@phosphor-icons/react";
import { DetectionThumb } from "@/components/detections/DetectionThumb";
import { NVR_COLOR } from "@/components/detections/DetectionCard";
import { Donut3D } from "@/components/common/Donut3D";
import { AXIS, KpiTile, StatPanel, TabPill, TOOLTIP, fmt } from "@/components/common/panels";
import { DataBadge } from "@/components/dashboard/DataBadge";
import { ARRIVAL_PERIODS, localDay, periodRange, type ArrivalsOptions } from "@/hooks/useTodayArrivals";
import { useEventStats, useFacesCount } from "@/hooks/useEventStats";
import { NVR_CATEGORIES, type NvrRealCategory } from "@/hooks/useEventCounts";
import { cameraPlaceLabel } from "@/config/cameraPlacements";
import { listEvents, nvrTime, type NvrEvent } from "@/lib/nvrApi";
import { useAppStore } from "@/store/useAppStore";
import { useT } from "@/i18n";

/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  AI TAHLIL — "kamera nimani ko'rdi va bu nimani anglatadi"           ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * Bo'lim SAVOLGA javob beradi, ro'yxat ko'rsatmaydi: qaysi tur qancha
 * aniqlandi, qaysi soatda zichlik oshdi, qaysi kamera ko'p ishladi va
 * nimaga e'tibor berish kerak.
 *
 * ── MANBA (2026-09-15 dan) ────────────────────────────────────────────
 * 🔴 Ilgari `useArrivals(range)` tanlangan davrni XOM holda 100 tadan
 * sahifalab o'qirdi ("Hammasi"da 30+3 = 33 so'rov, daqiqada bir) va
 * baribir 3 000 yozuvda to'xtab, uzun davrda faqat oxirgi ~1 kunni
 * hisoblardi. Endi:
 * · **sonlar** — `GET /events/stats` (server bazada sanaydi, bitta so'rov);
 * · **shaxslar** — `GET /faces?limit=1` (`total`/`known`);
 * · **kadrlar** — har kategoriyaning OXIRGI 3 tasi (`limit=3`, 4 ta mitti
 *   so'rov). Qolgani kerak bo'lsa — "Aniqlanganlar" (sahifalash bilan).
 *
 * ⚠️ Turlar — SERVER kategoriyalari (Shaxsni aniqlash / Janjal /
 * Chekish-telefon / Qurol): "Begona odam"/"Telefon" ajratmasini server
 * bermaydi. "Trevoga" — janjal + qurol ("Aniqlanganlar" dagi "Xavf
 * signali" bilan AYNI ta'rif).
 *
 * ⚠️ Hech narsa o'ylab topilmaydi: ma'lumot bo'lmasa qator chizilmaydi.
 *
 * ── DAVR ──────────────────────────────────────────────────────────────
 * `ARRIVAL_PERIODS` (Bugun / 7 kun / 30 kun / Hammasi) + **`Oraliq`** —
 * istalgan ikki sana. "Oraliq" SHU SAHIFAGA xos (umumiy ro'yxatga
 * qo'shilmagan): `ARRIVAL_PERIODS` ni Kameralar, Aniqlanganlar va Geo
 * ham ishlatadi, ularda esa sana maydonlari yo'q.
 */

/** `n` kun oldingi sana (`useStatPeriod` dagi bilan AYNI qoida). */
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - (n - 1));
  return localDay(d);
}

/** Kategoriya kartochkasida ko'rsatiladigan oxirgi kadrlar soni. */
const SHOTS = 3;

export function AiAnalysisPage() {
  const t = useT();
  const n = useCallback((v: number) => fmt(v, t.locale), [t.locale]);
  const [periodId, setPeriodId] = useState("today");
  /* "Oraliq" tanlangandagi sanalar. Default — oxirgi 14 kun. */
  const [customFrom, setCustomFrom] = useState(() => daysAgo(14));
  const [customTo, setCustomTo] = useState(() => localDay());

  /** Tanlangan oraliq. "Hammasi"da ikkala sana ham bo'sh (butun tarix). */
  const range = useMemo<ArrivalsOptions>(() => {
    if (periodId !== "custom") return periodRange(periodId);
    /* Sana maydoniga qo'lda ham yozish mumkin — tartib buzilsa almashtiramiz,
       aks holda `from > to` bo'lib server bo'sh javob qaytarardi. */
    const [from, to] = customFrom <= customTo ? [customFrom, customTo] : [customTo, customFrom];
    return { from, to };
  }, [periodId, customFrom, customTo]);

  /** Sonlar — server hisobi (bitta so'rov). */
  const stats = useEventStats({ from: range.from, to: range.to });
  /** Har xil odamlar — server birlashtirgan sanoq. */
  const faces = useFacesCount({ from: range.from, to: range.to });
  const setActivePage = useAppStore((s) => s.setActivePage);
  const setFocusedDetectionId = useAppStore((s) => s.setFocusedDetectionId);

  /** Har kategoriyaning OXIRGI kadrlari — ro'yxat emas, faqat ko'rinadigani. */
  const shotsQ = useQuery({
    queryKey: ["ai-latest-shots", range.from ?? "", range.to ?? ""],
    queryFn: async (): Promise<Record<NvrRealCategory, NvrEvent[]>> => {
      const pages = await Promise.all(
        NVR_CATEGORIES.map((c) =>
          listEvents(c, { limit: SHOTS, date_from: range.from, date_to: range.to }).catch(() => null)
        )
      );
      return Object.fromEntries(NVR_CATEGORIES.map((c, i) => [c, pages[i]?.events ?? []])) as Record<
        NvrRealCategory,
        NvrEvent[]
      >;
    },
    staleTime: 45_000,
    refetchInterval: 60_000,
  });

  /** Tur bo'yicha kesim — server sonlari + haqiqiy kadrlar. */
  const byType = useMemo(
    () =>
      NVR_CATEGORIES.map((c) => {
        const shots = shotsQ.data?.[c] ?? [];
        return {
          id: c,
          label: t.detect.category[c],
          color: NVR_COLOR[c] ?? "#8FB8FF",
          count: stats.byCategory[c],
          shots,
          last: shots[0] ?? null,
        };
      }).sort((a, b) => b.count - a.count),
    [stats.byCategory, shotsQ.data, t]
  );

  const total = stats.total;
  const peopleTotal = faces.total;
  const knownTotal = faces.known;
  const alarmTotal = stats.danger;
  const peak = stats.peakHour;
  const peakCount = stats.peakCount;
  const channels = stats.byChannel;

  /** Soatlik zichlik — maydonli chiziq uchun. */
  const hourSeries = useMemo(
    () => stats.hourly.map((v, h) => ({ hour: `${String(h).padStart(2, "0")}`, [t.chart.count]: v })),
    [stats.hourly, t.chart.count]
  );

  /** Turlar ulushi — Statistikadagi bilan AYNI pie chart (`Donut3D`). */
  const typeShare = useMemo(
    () => byType.filter((r) => r.count > 0).map((r) => ({ label: r.label, value: r.count, color: r.color })),
    [byType]
  );

  /** Kameralar kesimi — gorizontal ustunlar (server `by_channel` — qaydlar soni). */
  const camSeries = useMemo(
    () =>
      channels.slice(0, 6).map((c) => ({
        name: cameraPlaceLabel(c.channel, c.camera),
        [t.chart.count]: c.total,
      })),
    [channels, t.chart.count]
  );

  /** XULOSA JUMLALARI — faqat mavjud sonlardan. */
  const insights = useMemo(() => {
    const out: { tone: "info" | "warn" | "alarm"; text: string }[] = [];
    if (total === 0) return out;

    const top = byType[0];
    if (top && top.count > 0) {
      out.push({
        tone: "info",
        text: `Eng ko'p aniqlangan tur — ${top.label}: ${n(top.count)} ta qayd (oqimning ${Math.round((top.count / total) * 100)}%).`,
      });
    }
    if (peak != null) {
      out.push({
        tone: "info",
        text: `Zichlik ${String(peak).padStart(2, "0")}:00 da eng yuqori — ${n(peakCount)} ta qayd.`,
      });
    }
    if (alarmTotal > 0) {
      out.push({
        tone: "alarm",
        text: `${n(alarmTotal)} ta janjal/qurol qaydi bor — ularni ko'rib chiqish kerak.`,
      });
    }
    if (peopleTotal > 0) {
      out.push({
        tone: knownTotal === 0 ? "warn" : "info",
        text:
          knownTotal === 0
            ? `${n(peopleTotal)} ta har xil odam o'tdi, ammo hech biri yuz bazasida yo'q — baza to'ldirilmagan.`
            : `${n(peopleTotal)} ta har xil odam o'tdi, shundan ${n(knownTotal)} tasi bazadan tanildi.`,
      });
    }
    const busiest = channels[0];
    if (busiest) {
      out.push({
        tone: "info",
        text: `Eng ko'p ishlagan kamera — ${cameraPlaceLabel(busiest.channel, busiest.camera)} (#${busiest.channel}): ${n(busiest.total)} ta qayd.`,
      });
    }
    for (const a of stats.anomalies) {
      out.push({
        tone: "warn",
        text: `${t.detect.category[a.category]} odatdagidan ko'p: ${n(a.count)} ta (odatda ~${n(a.usual)}).`,
      });
    }
    return out;
  }, [total, byType, peak, peakCount, alarmTotal, peopleTotal, knownTotal, channels, stats.anomalies, n, t]);

  /** Kadrni bosish — "Aniqlanganlar" da o'sha hodisa ochiladi. */
  const openEvent = (id: number) => {
    setFocusedDetectionId(id);
    setActivePage("Aniqlanganlar");
  };

  const live = total > 0;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto">
      {/* ── Davr tanlovi ── */}
      <div className="flex flex-none flex-wrap items-center gap-1.5">
        {ARRIVAL_PERIODS.map((p) => (
          <TabPill key={p.id} group="ai-period" active={periodId === p.id} onClick={() => setPeriodId(p.id)}>
            {p.label}
          </TabPill>
        ))}
        {/* Istalgan ikki sana orasidagi kesim */}
        <TabPill group="ai-period" active={periodId === "custom"} onClick={() => setPeriodId("custom")}>
          Oraliq
        </TabPill>
        {periodId === "custom" && (
          <span className="flex items-center gap-1">
            <input
              type="date"
              value={customFrom}
              max={customTo}
              onChange={(e) => setCustomFrom(e.target.value)}
              title="Boshlanish sanasi"
              className="hik-input h-7 px-2 text-[11px] text-slate-200 [color-scheme:dark]"
            />
            <span className="text-slate-500">—</span>
            <input
              type="date"
              value={customTo}
              min={customFrom}
              onChange={(e) => setCustomTo(e.target.value)}
              title="Tugash sanasi"
              className="hik-input h-7 px-2 text-[11px] text-slate-200 [color-scheme:dark]"
            />
          </span>
        )}
        <span className="ml-auto flex items-center gap-2 font-mono text-[10.5px] text-slate-500">
          {/* Qaysi oraliq o'qilayotgani DOIM ko'rinib tursin */}
          <span title="Tanlangan oraliq">{range.from ? `${range.from} … ${range.to}` : "butun tarix"}</span>
          <span className="text-slate-700">·</span>
          {stats.isLoading ? "tahlil qilinmoqda…" : `${n(total)} qayd`}
          <DataBadge live={live} />
        </span>
      </div>

      {/* ── Asosiy ko'rsatkichlar ── */}
      <div className="grid flex-none grid-cols-2 gap-2 xl:grid-cols-4">
        <KpiTile Icon={Broadcast} label="Aniqlangan qaydlar" value={n(total)} tone="#8FB8FF" />
        <KpiTile
          Icon={UserFocus}
          label="Har xil odam"
          value={n(peopleTotal)}
          hint={`${n(knownTotal)} tanish · ${n(Math.max(0, peopleTotal - knownTotal))} notanish`}
          tone="#22C55E"
        />
        <KpiTile
          Icon={ShieldWarning}
          label="Trevoga"
          value={n(alarmTotal)}
          hint={alarmTotal > 0 ? "janjal · qurol — ko'rib chiqish kerak" : "trevoga yo'q"}
          tone="#FB7185"
        />
        <KpiTile
          Icon={Clock}
          label="Eng gavjum soat"
          value={peak != null ? `${String(peak).padStart(2, "0")}:00` : "—"}
          hint={peak != null ? `${n(peakCount)} ta qayd` : "ma'lumot yo'q"}
          tone="#F59E0B"
        />
      </div>

      {/* ── AI xulosasi ── */}
      {insights.length > 0 && (
        <StatPanel title="AI xulosasi" hint="o'lchangan sonlardan" className="flex-none">
          <ul className="space-y-1.5">
            {insights.map((i) => (
              <li key={i.text} className="flex items-start gap-2 text-[12px] leading-snug">
                <span
                  className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full"
                  style={{ background: i.tone === "alarm" ? "#FB7185" : i.tone === "warn" ? "#F59E0B" : "#8FB8FF" }}
                />
                <span className="text-slate-300">{i.text}</span>
              </li>
            ))}
          </ul>
        </StatPanel>
      )}

      {/* ── Soatlik zichlik (maydonli chiziq) + turlar ulushi (Donut3D) ── */}
      <div className="grid flex-none gap-3 xl:grid-cols-[1.5fr_1fr]">
        <StatPanel title="Soatlik zichlik" hint="24 soat" right={<DataBadge live={live} />} className="min-h-[240px]">
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourSeries} margin={{ top: 8, right: 10, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="ai-hour" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8FB8FF" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#8FB8FF" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="hour" tick={AXIS} tickLine={false} axisLine={false} interval={1} />
                <YAxis tick={AXIS} tickLine={false} axisLine={false} width={38} />
                <Tooltip contentStyle={TOOLTIP} />
                <Area
                  type="monotone"
                  dataKey={t.chart.count}
                  stroke="#8FB8FF"
                  strokeWidth={2}
                  fill="url(#ai-hour)"
                  /* Cho'qqi nuqtasi ko'zga tashlansin */
                  dot={(props: { cx?: number; cy?: number; index?: number }) =>
                    props.index === peak ? (
                      <circle key="peak" cx={props.cx} cy={props.cy} r={4} fill="#FB7185" stroke="#0B1220" strokeWidth={2} />
                    ) : (
                      <circle key={`d-${props.index}`} r={0} />
                    )
                  }
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </StatPanel>

        <StatPanel title="Turlar ulushi" right={<DataBadge live={live} />} className="min-h-[240px]">
          {typeShare.length === 0 ? (
            <p className="py-10 text-center text-[12px] text-slate-500">
              {stats.isLoading ? "Yuklanmoqda…" : "Bu davrda hodisa qayd etilmadi"}
            </p>
          ) : (
            <div className="flex min-h-0 flex-1 items-center justify-center">
              <Donut3D data={typeShare} caption="jami qayd" size={260} format={n} />
            </div>
          )}
        </StatPanel>
      </div>

      {/* ── Kameralar kesimi — gorizontal ustunlar ── */}
      {camSeries.length > 0 && (
        <StatPanel
          title="Kameralar kesimi"
          hint="qaysi kameradan nechta qayd keldi"
          right={<DataBadge live={live} />}
          className="min-h-[200px] flex-none"
        >
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={camSeries} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 4 }}>
                <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} />
                {/* Nomlar uzun — gorizontal joylashuv shuning uchun */}
                <YAxis type="category" dataKey="name" tick={AXIS} tickLine={false} axisLine={false} width={132} />
                <Tooltip contentStyle={TOOLTIP} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar dataKey={t.chart.count} fill="#22C55E" radius={[0, 4, 4, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </StatPanel>
      )}

      {/* ── TUR BO'YICHA TAHLIL ── */}
      <div className="grid gap-3 xl:grid-cols-2">
        {byType.map(({ id, label, color, count, shots, last }) => (
          <StatPanel
            key={id}
            title={label}
            hint={count > 0 ? `${n(count)} ta qayd` : "bu davrda aniqlanmadi"}
            right={
              <span
                className="rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold"
                style={{ background: `${color}22`, color }}
              >
                {n(count)}
              </span>
            }
          >
            {count === 0 ? (
              <p className="py-3 text-[11.5px] text-slate-500">Tanlangan davrda bu turdagi hodisa qayd etilmadi.</p>
            ) : (
              <>
                <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock size={12} weight="duotone" />
                    oxirgisi {last ? nvrTime(last.time) : "—"}
                  </span>
                  <span className="flex items-center gap-1">
                    <SecurityCamera size={12} weight="duotone" />
                    {last ? cameraPlaceLabel(last.channel, last.camera) : "—"}
                  </span>
                </div>

                {/* Kadrlar — HAQIQIY, faqat oxirgi `SHOTS` tasi */}
                <div className="grid grid-cols-3 gap-1.5">
                  {shots.map((ev) => (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => openEvent(ev.id)}
                      title={`${ev.label} · ${nvrTime(ev.time)} — ochish`}
                      className="group relative overflow-hidden rounded-lg border border-white/[0.1] transition-colors hover:border-white/30"
                    >
                      <DetectionThumb id={ev.id} className="aspect-[4/3] w-full" alt="" />
                      <span className="absolute inset-x-0 bottom-0 bg-black/70 py-0.5 text-center font-mono text-[9px] text-slate-200">
                        {nvrTime(ev.time)}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </StatPanel>
        ))}
      </div>
    </div>
  );
}
