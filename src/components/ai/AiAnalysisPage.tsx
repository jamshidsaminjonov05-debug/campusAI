"use client";

import { useCallback, useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Broadcast, Clock, SecurityCamera, ShieldWarning, UserFocus, Warning } from "@phosphor-icons/react";
import { DetectionThumb } from "@/components/detections/DetectionThumb";
import { Donut3D } from "@/components/common/Donut3D";
import { AXIS, KpiTile, StatPanel, TabPill, TOOLTIP, fmt } from "@/components/common/panels";
import { DataBadge } from "@/components/dashboard/DataBadge";
import { ARRIVAL_PERIODS, localDay, periodRange, useArrivals, type ArrivalsOptions } from "@/hooks/useTodayArrivals";
import { useFaces } from "@/hooks/useFaces";
import { cameraPlaceLabel } from "@/config/cameraPlacements";
import { DETECTION_BY_ID, DETECTION_TYPES, type DetectionId } from "@/lib/detectionTypes";
import { fromNvr, type DetectionEvent } from "@/lib/detectionEvents";
import { buildAiSummary } from "@/lib/aiSummary";
import { isAlarm, nvrTime, type NvrEvent } from "@/lib/nvrApi";
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
 * ── IKKI MANBA ────────────────────────────────────────────────────────
 * · **Aniq statistika** — HAQIQIY kuzatuv posti oqimi (`useArrivals` + `useFaces`);
 * · **Namoyish** — `lib/aiDemo.ts` dagi BARQAROR to'plam (`lcg`), ya'ni
 *   tizim to'la ishlaganda ekran qanday ko'rinishini ko'rsatadi.
 *
 * ⚠️ Aniq rejimda hech narsa o'ylab topilmaydi: ma'lumot bo'lmasa qator
 * umuman chizilmaydi.
 *
 * ── DIAGRAMMALAR ──────────────────────────────────────────────────────
 * Soatlik zichlik — **maydonli chiziq** (kun oqimi uzluksiz), turlar
 * ulushi — **`Donut3D`** (Statistikadagi bilan AYNI diagramma turi —
 * ilgari radial halqa edi, ataylab "ajralib tursin" deb; amalda ikki xil
 * ko'rinish faqat chalkashtirardi), kameralar — **gorizontal ustunlar**
 * (nomlar uzun).
 *
 * ── DAVR ──────────────────────────────────────────────────────────────
 * `ARRIVAL_PERIODS` (Bugun / 7 kun / 30 kun / Hammasi) + **`Oraliq`** —
 * istalgan ikki sana. "Oraliq" SHU SAHIFAGA xos (umumiy ro'yxatga
 * qo'shilmagan): `ARRIVAL_PERIODS` ni Kameralar, Aniqlanganlar va Geo
 * ham ishlatadi, ularda esa sana maydonlari yo'q — ro'yxatga qo'shilsa
 * o'sha sahifalarda bosilib bo'lmaydigan tanlov paydo bo'lardi.
 */

/** `n` kun oldingi sana (`useStatPeriod` dagi bilan AYNI qoida). */
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - (n - 1));
  return localDay(d);
}

export function AiAnalysisPage() {
  const t = useT();
  const n = useCallback((v: number) => fmt(v, t.locale), [t.locale]);
  const [periodId, setPeriodId] = useState("today");
  /* "Oraliq" tanlangandagi sanalar. Default — oxirgi 14 kun, ya'ni tanlov
     bosilganda maydonlar bo'sh emas, tayyor oraliq bilan ochiladi. */
  const [customFrom, setCustomFrom] = useState(() => daysAgo(14));
  const [customTo, setCustomTo] = useState(() => localDay());

  /** Tanlangan oraliq. "Hammasi"da ikkala sana ham bo'sh (butun tarix). */
  const range = useMemo<ArrivalsOptions>(() => {
    if (periodId !== "custom") return periodRange(periodId);
    /* Sana maydoniga qo'lda ham yozish mumkin — tartib buzilsa almashtiramiz,
       aks holda `from > to` bo'lib server bo'sh ro'yxat qaytarardi. */
    const [from, to] = customFrom <= customTo ? [customFrom, customTo] : [customTo, customFrom];
    return { from, to };
  }, [periodId, customFrom, customTo]);

  const scope = useArrivals(range);
  /* ⚠️ `/faces` `date_from`/`date_to` KUTADI, `useArrivals` esa `from`/`to`
     bilan ishlaydi. Ilgari bu yerga `{...range}` shundoq uzatilardi va
     server notanish kalitlarni JIMGINA e'tiborsiz qoldirardi: "Har xil
     odam", "tanish/notanish" va "Kameralar kesimi" davrga QARAMASDAN
     butun tarixni ko'rsatardi (o'lchandi 2026-09-04: butun tarix 3 089,
     bir kunda esa 1 842), yonidagi "Aniqlangan qaydlar" esa davr bo'yicha
     edi — bitta qatorda ikki xil miqyos turardi. */
  const faces = useFaces({ date_from: range.from, date_to: range.to, limit: 100, sort: "count" });
  const setActivePage = useAppStore((s) => s.setActivePage);
  const setFocusedDetectionId = useAppStore((s) => s.setFocusedDetectionId);

  /** Xom kuzatuv posti yozuvlari → UI turlariga. */
  const events = useMemo<DetectionEvent[]>(
    () =>
      scope.raw
        .map(fromNvr)
        .filter((e): e is DetectionEvent => e !== null)
        .sort((a, b) => b.ts - a.ts),
    [scope.raw]
  );
  /* `buildAiSummary` faqat ANOMALIYALAR (bugun ↔ boshqa kunlar o'rtachasi)
     uchun — u ATAYLAB oqimning ENG SO'NGGI KUNIGA cheklanadi (o'z izohiga
     qarang). Soatlik zichlik/trevoga/eng gavjum soat esa pastda `periodStats`
     bilan — TANLANGAN DAVRNING HAMMASI bo'yicha (`events` — bir necha kunni
     qamrab olishi mumkin). */
  const summary = useMemo(() => buildAiSummary(events), [events]);

  /** Tur bo'yicha kesim — haqiqiy kadrlar bilan. */
  const byType = useMemo(() => {
    const raw = new Map<DetectionId, NvrEvent[]>();
    for (const ev of scope.raw) {
      const d = fromNvr(ev);
      if (!d) continue;
      const list = raw.get(d.type) ?? [];
      list.push(ev);
      raw.set(d.type, list);
    }
    return DETECTION_TYPES.map((d) => {
      const list = (raw.get(d.id) ?? []).sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      return {
        det: d,
        count: list.length,
        alarms: list.filter(isAlarm).length,
        shots: list.slice(0, 3),
        last: list[0] ?? null,
      };
    }).sort((a, b) => b.count - a.count);
  }, [scope.raw]);

  /* ── Ko'rsatkichlar — manbaga qarab ── */
  /**
   * Soatlik zichlik + trevoga + eng gavjum soat — TANLANGAN DAVRNING
   * HAMMASI bo'yicha.
   *
   * ⚠️ Ilgari bu qiymatlar `buildAiSummary().hourly/dangerous/peakHour`
   * dan olinardi — u FAQAT oqimdagi ENG SO'NGGI KUNni hisoblaydi ("bugun"
   * shartli — backendda hodisa bir oy oldingi sanada bo'lishi mumkin,
   * `lib/aiSummary.ts` izohiga qarang). Natijada "7 kun"/"30 kun"/"Hammasi"
   * tanlansa ham diagramma FAQAT eng so'nggi kunni ko'rsatardi — agar o'sha
   * kunda janjal (yoki boshqa tur) bo'lmasa, davr qanchalik uzun tanlansa
   * ham eski hodisalar diagrammaga umuman ta'sir qilmasdi.
   */
  const periodStats = useMemo(() => {
    const hourly = Array(24).fill(0) as number[];
    let dangerous = 0;
    for (const e of events) {
      hourly[new Date(e.ts).getHours()]++;
      if (e.severity === "critical" || e.severity === "high") dangerous++;
    }
    let peakHour: number | null = null;
    let peakCount = 0;
    hourly.forEach((v, h) => {
      if (v > peakCount) {
        peakCount = v;
        peakHour = h;
      }
    });
    return { hourly, dangerous, peakHour, peakCount };
  }, [events]);

  const total = events.length;
  const peopleTotal = faces.total;
  const knownTotal = faces.known;
  const alarmTotal = periodStats.dangerous;
  const peak = periodStats.peakHour;
  const peakCount = periodStats.peakCount;
  const hourly = periodStats.hourly;
  const channels = faces.byChannel;

  /** Soatlik zichlik — maydonli chiziq uchun. */
  const hourSeries = useMemo(
    () => hourly.map((v, h) => ({ hour: `${String(h).padStart(2, "0")}`, [t.chart.count]: v })),
    [hourly, t.chart.count]
  );

  /** Turlar ulushi — Statistikadagi bilan AYNI pie chart (`Donut3D`). */
  const typeShare = useMemo(
    () =>
      byType
        .filter((r) => r.count > 0)
        .map((r) => ({ label: r.det.label, value: r.count, color: r.det.color })),
    [byType]
  );

  /** Kameralar kesimi — gorizontal ustunlar. */
  const camSeries = useMemo(
    () =>
      channels.slice(0, 6).map((c) => ({
        name: cameraPlaceLabel(c.channel, c.camera),
        [t.chart.count]: c.people,
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
        text: `Eng ko'p aniqlangan tur — ${top.det.label}: ${n(top.count)} ta qayd (oqimning ${Math.round((top.count / total) * 100)}%).`,
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
        text: `${n(alarmTotal)} ta qayd TREVOGA deb belgilangan — ularni ko'rib chiqish kerak.`,
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
        text: `Eng ko'p ishlagan kamera — ${cameraPlaceLabel(busiest.channel, busiest.camera)} (#${busiest.channel}): ${n(busiest.people)} ta odam.`,
      });
    }
    for (const a of summary.anomalies) {
      const det = DETECTION_BY_ID.get(a.type);
      if (det) {
        out.push({ tone: "warn", text: `${det.label} odatdagidan ko'p: ${n(a.count)} ta (odatda ~${n(a.usual)}).` });
      }
    }
    return out;
  }, [total, byType, peak, peakCount, alarmTotal, peopleTotal, knownTotal, channels, summary.anomalies, n]);

  /** Kadrni bosish — "Aniqlanganlar" da o'sha hodisa ochiladi. */
  const openEvent = (id: number) => {
    setFocusedDetectionId(id);
    setActivePage("Aniqlanganlar");
  };

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
          {/* Qaysi oraliq o'qilayotgani DOIM ko'rinib tursin — "Hammasi"da
              sana filtri umuman yuborilmaydi (server tarixi bilan cheklanadi). */}
          <span title="Tanlangan oraliq">{range.from ? `${range.from} … ${range.to}` : "butun tarix"}</span>
          <span className="text-slate-700">·</span>
          {scope.isLoading ? "tahlil qilinmoqda…" : `${n(total)} qayd`}
          <DataBadge live={scope.raw.length > 0} />
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
          hint={alarmTotal > 0 ? "ko'rib chiqish kerak" : "trevoga yo'q"}
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
        <StatPanel title="Soatlik zichlik" hint="24 soat" right={<DataBadge live={scope.raw.length > 0} />} className="min-h-[240px]">
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

        <StatPanel title="Turlar ulushi" right={<DataBadge live={scope.raw.length > 0} />} className="min-h-[240px]">
          {typeShare.length === 0 ? (
            <p className="py-10 text-center text-[12px] text-slate-500">Bu davrda hodisa qayd etilmadi</p>
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
          hint="qaysi kameradan nechta odam o'tdi"
          right={<DataBadge live={scope.raw.length > 0} />}
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
        {byType.map(({ det, count, alarms, shots, last }) => (
          <StatPanel
            key={det.id}
            title={det.label}
            hint={count > 0 ? `${n(count)} ta qayd` : "bu davrda aniqlanmadi"}
            right={
              <span
                className="rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold"
                style={{ background: `${det.color}22`, color: det.color }}
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
                  {alarms > 0 && (
                    <span className="flex items-center gap-1 text-rose-300">
                      <Warning size={12} weight="fill" />
                      {n(alarms)} trevoga
                    </span>
                  )}
                </div>

                {/* Kadrlar — HAQIQIY (namoyish rasmi olib tashlandi) */}
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
