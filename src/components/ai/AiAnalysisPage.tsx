"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Broadcast, Clock, ShieldWarning, UserFocus } from "@phosphor-icons/react";
import { Pistol } from "@/components/common/PistolIcon";
import { EventOpener, EventTypeCardsModal, TypePanel, V2TypePanel } from "./TypeCards";
import { AiNarrator } from "./AiNarrator";
import { NVR_COLOR } from "@/components/detections/DetectionCard";
import { AXIS, KpiTile, PanelLoader, StatPanel, TabPill, TOOLTIP, Y_AXIS_W, fmt } from "@/components/common/panels";
import { dayMonthLabel } from "@/lib/dateLabel";
import { DataBadge } from "@/components/dashboard/DataBadge";
import { ARRIVAL_PERIODS, localDay, periodRange, type ArrivalsOptions } from "@/hooks/useTodayArrivals";
import { useEventStats, useSeenPeople } from "@/hooks/useEventStats";
import { NVR_CATEGORIES, type NvrRealCategory } from "@/hooks/useEventCounts";
import { listEvents, liveInterval, type NvrEvent } from "@/lib/nvr/nvrApi";
import { useT } from "@/i18n";
import { EmptyState } from "@/components/common/EmptyState";

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
  /* 🔵 "TANILGAN ODAMLAR" (ilgari "Har xil odam", 2026-10-26, foydalanuvchi:
     "tanilgan odamlar deyishing kerak va aniq ma'lumot"). Manba —
     `/faces/stats/classes` (oraliqda TANILGAN shaxslar, takrorsiz). Eski
     `/faces` `total` hozir DOIM 0 qaytaradi — kartochka "0" bo'lib turardi. */
  const seen = useSeenPeople({ from: range.from, to: range.to });
  /* "Qurol va janjal" (2-versiya, ko'cha kameralari) — janjal/qurol panellari
     shu serverlardan. "Hammasi" oynasi va kadr tafsiloti — `TypeCards.tsx`. */
  const [v2Mode, setV2Mode] = useState(false);
  const [allType, setAllType] = useState<NvrRealCategory | null>(null);
  const [openEv, setOpenEv] = useState<NvrEvent | null>(null);

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
    refetchInterval: liveInterval(2 * 60_000, 5 * 60_000),
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
  const alarmTotal = stats.danger;
  const peak = stats.peakHour;
  const peakCount = stats.peakCount;

  /**
   * 🔵 QAYDLAR GRAFIGI (2026-10-26, foydalanuvchi: "oddiy odam tushunadigan
   * so'zlar; soat bo'lsa soat, kun bo'lsa oy bosh harflari; chap ustun
   * ko'rinmayapti; nomi soatlik zichlik emas"):
   *   · BIR KUN tanlansa — soatlar ("08:00"), sarlavha "Qaysi soatda…";
   *   · ko'p kunlik davr — KUNLAR ("22-okt", `dayMonthLabel`), sarlavha
   *     "Qaysi kuni…". Server `by_day` ni allaqachon beradi — yangi so'rov yo'q.
   * Chap o'q ilgari `margin.left = -20` bilan kesilgan edi (CLAUDE.md
   * "YAxis KENGLIGI — `Y_AXIS_W`" tuzog'i) — endi manfiy margin YO'Q.
   */
  const daily = range.from !== range.to && stats.byDay.length > 1;
  const series = useMemo(
    () =>
      daily
        ? stats.byDay.map((d) => {
            const [y, m, dd] = d.day.split("-").map(Number);
            return { key: d.day, label: dayMonthLabel(new Date(y, (m ?? 1) - 1, dd ?? 1), t), value: d.total };
          })
        : stats.hourly.map((v, h) => ({ key: String(h), label: `${String(h).padStart(2, "0")}:00`, value: v })),
    [daily, stats.byDay, stats.hourly, t]
  );
  const seriesPeak = useMemo(() => {
    let best = -1;
    series.forEach((r, i) => {
      if (r.value > 0 && (best < 0 || r.value > series[best].value)) best = i;
    });
    return best;
  }, [series]);


  /** Kadrni bosish — "Aniqlanganlar" da o'sha hodisa ochiladi. */

  const live = total > 0;

  /* SLAYDER YUKLANISH (2026-10-26, foydalanuvchi so'rovi) — Statistikadagi
     `PanelLoader` bilan AYNI: `/events/stats` sanasiz/uzun davrda 3–11 s
     (o'lchandi), shu vaqtda KPI'larda "0" va bo'sh diagrammalar turardi.
     Faqat BIRINCHI yuklanishda (`isLoading`); davr almashganda eski son
     qolib, yangisi fonda keladi. */
  const busy = stats.isLoading || shotsQ.isLoading;
  const loaderDays =
    periodId === "custom"
      ? Math.max(1, Math.round((new Date(customTo).getTime() - new Date(customFrom).getTime()) / 864e5) + 1)
      : (ARRIVAL_PERIODS.find((p) => p.id === periodId)?.days ?? 30);

  /* Ovozli tahlilchi uchun o'zbekcha davr nomi (TTS o'zbekcha o'qiydi) */
  const narratorPeriod =
    periodId === "custom"
      ? `${range.from} dan ${range.to} gacha`
      : periodId === "all"
        ? "Butun tarix"
        : periodId === "today"
          ? "Bugun"
          : `Oxirgi ${ARRIVAL_PERIODS.find((p) => p.id === periodId)?.days ?? ""} kun`;

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
          Sana oralig'i
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
        <button
          type="button"
          onClick={() => setV2Mode((v) => !v)}
          title={t.nvr.v2ButtonTitle}
          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition-colors ${
            v2Mode
              ? "border-fuchsia-400/50 bg-fuchsia-400/15 text-fuchsia-200"
              : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-fuchsia-400/30 hover:text-fuchsia-200"
          }`}
        >
          <Pistol size={14} weight={v2Mode ? "fill" : "regular"} />
          {t.nvr.v2Button}
        </button>
      </div>

      {busy ? (
        <PanelLoader days={loaderDays} allTime={periodId === "all"} className="hik-glass-blue min-h-[360px] flex-1 rounded-2xl" />
      ) : (
        <>
      {/* ── Asosiy ko'rsatkichlar — ENG YUQORIDA (2026-10-26), ostida tur bo'yicha kesim ── */}
      <div className="grid flex-none grid-cols-2 gap-2 xl:grid-cols-4">
        <KpiTile Icon={Broadcast} label="Aniqlangan qaydlar" value={n(total)} tone="#8FB8FF" />
        <KpiTile
          Icon={UserFocus}
          label="Aniqlangan shaxslar"
          value={seen.data ? n(seen.data.total.seen_people) : seen.isLoading ? "…" : "—"}
          hint={
            seen.data
              ? `${n(seen.data.students.seen_people)} ta o'quvchi • ${n(seen.data.teachers.seen_people)} ta o'qituvchi (bazaning ${Math.round(seen.data.total.coverage)}% i)`
              : seen.isLoading
                ? "sanalmoqda…"
                : "ma'lumot kelmadi"
          }
          tone="#22C55E"
        />
        <KpiTile
          Icon={ShieldWarning}
          label="Xavfli holatlar"
          value={n(alarmTotal)}
          hint={alarmTotal > 0 ? "janjal • qurol — ko'rib chiqish kerak" : "Favqulodda holatlar yo'q"}
          tone="#FB7185"
        />
        <KpiTile
          Icon={Clock}
          label="Eng gavjum soat"
          value={peak != null ? `${String(peak).padStart(2, "0")}:00` : "—"}
          hint={peak != null ? `${n(peakCount)} ta yozuv` : "ma'lumot yo'q"}
          tone="#F59E0B"
        />
      </div>

      {/* ── TUR BO'YICHA TAHLIL — KPI qatoridan keyin. Har panelda "Hammasi" →
          kartochkali oyna (sahifalash + 3…8 ustun slayderi). "Qurol va janjal"
          rejimida janjal/qurol panellari 2-versiya (ko'cha kameralari)
          serverlaridan (`TypeCards.tsx`, 2026-10-26). ── */}
      <div className="grid gap-3 xl:grid-cols-2">
        {byType
          .filter(({ id }) => !(v2Mode && (id === "janjal" || id === "gun")))
          .map(({ id, label, color, count, shots }) => (
            <TypePanel
              key={id}
              title={label}
              hint={count > 0 ? `${n(count)} ta qayd` : "Bu davrda aniqlanmadi"}
              color={color}
              count={count}
              shots={shots}
              onOpenShot={setOpenEv}
              onAll={() => setAllType(id)}
            />
          ))}
        {v2Mode && (
          <>
            <V2TypePanel kind="janjal" onOpenShot={setOpenEv} />
            <V2TypePanel kind="gun" onOpenShot={setOpenEv} />
          </>
        )}
      </div>
      {allType && (
        <EventTypeCardsModal
          title={t.detect.category[allType]}
          color={NVR_COLOR[allType] ?? "#8FB8FF"}
          tab={allType}
          from={range.from}
          to={range.to}
          onClose={() => setAllType(null)}
        />
      )}
      <EventOpener ev={openEv} onClose={() => setOpenEv(null)} onSelect={setOpenEv} />

      {/* ── Soatlik zichlik (maydonli chiziq). "Turlar ulushi" (Donut3D) va
          "Kameralar kesimi" 2026-10-26 da OLIB TASHLANDI (foydalanuvchi:
          "tur ulushi va kameralar kesimi kerak emas"). ── */}
      <div className="flex-none">
        <StatPanel
          title={daily ? "Kunlar kesimida qaydlar soni" : "Soatlar kesimida qaydlar soni"}
          hint={
            seriesPeak >= 0
              ? `eng ko'pi: ${series[seriesPeak].label} da — ${n(series[seriesPeak].value)} ta`
              : daily
                ? "kunlar bo'yicha"
                : "soatlar bo'yicha"
          }
          right={<DataBadge live={live} />}
          className="min-h-[240px]"
        >
          {seriesPeak < 0 ? (
            /* Davrda birorta qayd yo'q — bo'sh grafik o'rniga rasmli holat (balandlik grafik bilan teng) */
            <EmptyState className="h-[200px]" title="Qayd topilmadi" hint="Tanlangan davrda kameralar hech narsa yozmadi." />
          ) : (
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="ai-hour" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8FB8FF" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#8FB8FF" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  tick={AXIS}
                  tickLine={false}
                  axisLine={false}
                  interval={daily ? "preserveStartEnd" : 1}
                  minTickGap={daily ? 18 : 4}
                />
                <YAxis
                  tick={AXIS}
                  tickLine={false}
                  axisLine={false}
                  width={Y_AXIS_W}
                  allowDecimals={false}
                  tickFormatter={(v: number) => (v >= 10000 ? `${Math.round(v / 1000)}k` : String(v))}
                />
                <Tooltip
                  contentStyle={TOOLTIP}
                  labelFormatter={(label: string) => (daily ? label : `${label} – ${String((Number(label.slice(0, 2)) + 1) % 24).padStart(2, "0")}:00`)}
                  formatter={(v: number) => [`${n(v)} ta qayd`, "Kamera qaydlari"]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#8FB8FF"
                  strokeWidth={2}
                  fill="url(#ai-hour)"
                  /* Eng ko'p nuqta ko'zga tashlansin */
                  dot={(props: { cx?: number; cy?: number; index?: number }) =>
                    props.index === seriesPeak ? (
                      <circle key="peak" cx={props.cx} cy={props.cy} r={4} fill="#FB7185" stroke="#0B1220" strokeWidth={2} />
                    ) : (
                      <circle key={`d-${props.index}`} r={0} />
                    )
                  }
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          )}
        </StatPanel>

      </div>

        </>
      )}
      <AiNarrator
        ready={!stats.isLoading}
        summary={{
          periodLabel: narratorPeriod,
          total,
          recognized: seen.data?.total.seen_people ?? null,
          students: seen.data?.students.seen_people ?? null,
          teachers: seen.data?.teachers.seen_people ?? null,
          alarms: alarmTotal,
          peakHour: peak,
          peakCount,
          byType: byType.map((r) => ({ id: r.id, count: r.count })),
        }}
      />
    </div>
  );
}
