"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Donut3D } from "@/components/common/Donut3D";
import { AXIS, ClickableDot, StatPanel, TOOLTIP, fmt, Y_AXIS_W } from "@/components/common/panels";
import { DataBadge } from "@/components/dashboard/DataBadge";
import { localDay } from "@/hooks/useTodayArrivals";
import { NVR_CATEGORIES, type NvrRealCategory } from "@/hooks/useEventCounts";
import { useEventStats } from "@/hooks/useEventStats";
import { listEvents } from "@/lib/nvrApi";
import type { StatPeriod } from "@/hooks/useStatPeriod";
import { useT, type Messages } from "@/i18n";
import { dayMonthLabel } from "@/lib/dateLabel";
import type { StatDetailContent } from "./StatDetailDrawer";

/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  DAVR KESIMI — kunlik / haftalik / oylik / erkin oraliq              ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * Ikkita ko'rinish yonma-yon:
 *   · **chiziq** — davr bo'ylab aniqlanishlar dinamikasi;
 *   · **halqa (pie)** — hodisa turlari ulushi.
 *
 * 🔴 **"FAQAT OXIRGI 2-3 KUN CHIQARDI" — TOPILDI VA TUZATILDI**
 * (2026-09-13, foydalanuvchi skrinshot bilan: "Davr kesimida faqat
 * 3 kunlik natijasi chiqaryabdi, eski ma'lumotlari kelmayabdi").
 *
 * Ilgari ikkala grafik ham `useArrivals(range).raw` dan — ya'ni
 * oraliqning HAR BIR XOM hodisasidan — hisoblanardi. O'sha hook esa
 * xavfsizlik chegarasi bilan ishlaydi: `MAX_PAGES (30) × PAGE (100) =
 * 3 000` yozuv, hodisalar YANGISIDAN ESKISIGA keladi va jonli serverda
 * bir kunda ~2 200 qayd bor. Natijada 30 kun so'ralganda ham faqat
 * oxirgi ~1.5 kun o'qilardi, qolgan kunlar esa NOL bo'lib chizilardi —
 * go'yo o'sha kunlarda hech narsa bo'lmagandek.
 *
 * **Endi sonlar SERVERNING O'Z hisobidan — BITTA so'rov** (2026-09-15,
 * `GET /events/stats`, `hooks/useEventStats.ts`): chiziq `by_day` (yoki
 * "Bugun"da `by_hour`), halqa `by_category`. 2026-09-13 dan 15 gacha bu
 * yerda har KUNGA bitta `limit=1` so'rov (oyda 30 ta) + halqa uchun 4 ta +
 * "Bugun"da xom oqim skani bor edi.
 *
 * ⚠️ XOM hodisalar FAQAT nuqta BOSILGANDA, o'sha KUN uchun so'raladi
 * (`DayBreakdown`/`HourBreakdown`).
 *
 * ⚠️ **Halqa endi SERVER kategoriyalarini ko'rsatadi** (`DETECTION_TYPES`
 * emas): "Begona odam" faqat TANILMAGAN yuz, "Telefon" esa `smoking`
 * ichidan matn bo'yicha ajratiladi — ikkalasi ham hodisaning O'ZINI
 * ko'rishni talab qiladi, ya'ni yana o'sha 3 000 chegarasiga qaytarardi.
 * Server kategoriyasi esa aniq va oraliq uzunligidan mustaqil.
 *
 * 🔴 **CHUQURLASHUV — YAGONA UMUMIY PANELGA KO'CHDI** (2026-09-10,
 * foydalanuvchi so'rovi: "hammasiga alohida yon panel emas bitta yon
 * panel ochiladi"): nuqta/bo'lak bosilganda mazmun `StatOverview.tsx`
 * dagi `StatDetailDrawer` ga yuboriladi.
 */

/* ⚠️ Oy nomi LUG'ATDAN — `toLocaleDateString` brauzerda uz ICU
   ma'lumoti bo'lmasa "M09" qaytaradi (`lib/dateLabel.ts`). */

/** Halqa ranglari — server kategoriyalari uchun (`DETECTION_TYPES` bilan mos tusda). */
const CATEGORY_COLOR: Record<NvrRealCategory, string> = {
  face: "#8FB8FF",
  gun: "#e879f9",
  janjal: "#f43f5e",
  smoking: "#e2603a",
};

export function StatPeriodPanel({
  period,
  onOpenDetail,
}: {
  /** Sahifaning YAGONA davr tanlovi — bu panel o'z tanlovini yasamaydi. */
  period: StatPeriod;
  /** Nuqta/bo'lak bosilganda — umumiy o'ng panelga mazmun yuboradi. */
  onOpenDetail: (content: StatDetailContent) => void;
}) {
  const t = useT();
  const n = (v: number) => fmt(v, t.locale);

  const range = useMemo(() => ({ from: period.from, to: period.to }), [period.from, period.to]);

  /** "Bugun" — 1 kunlik nuqta chiziq chizolmaydi, SOAT kesimi mazmunli
   *  bo'ladi (`StatDensity.tsx`dagi AYNI izohga qarang). */
  const isToday = period.id === "today";

  /* ⚠️ XOM hodisalar FAQAT "Bugun"da kerak (soatlik taqsimot) — uzun
     oraliqda so'rov UMUMAN yuborilmaydi (yuqoridagi izohga qarang). */
  /* 🔴 2026-09-15: BARCHA sonlar BITTA so'rovdan — `GET /events/stats`.
     Ilgari: "Bugun"da xom oqim sahifalab (o'nlab so'rov), kunlik chiziq uchun
     HAR KUNGA bitta `limit=1` so'rov (oyda 30 ta), halqa uchun yana 4 ta.
     Server `by_day`/`by_hour`/`by_category` ni tayyor beradi. */
  const rs = useEventStats(range);
  /** Kunlik sonlar — SERVER hisobi, chegarasiz aniq. */
  const daily = useMemo(
    () => ({ byDate: new Map(rs.byDay.map((d) => [d.day, d.total])), total: rs.total, isLoading: rs.isLoading }),
    [rs.byDay, rs.total, rs.isLoading]
  );
  /** Kategoriya kesimi — SERVER hisobi (halqa uchun). */
  const cats = { totals: rs.byCategory, sum: rs.total, isLoading: rs.isLoading };

  /** Oraliqdagi kunlar ro'yxati. */
  const days = useMemo(() => {
    const out: Date[] = [];
    const a = new Date(`${range.from}T00:00:00`);
    const b = new Date(`${range.to}T00:00:00`);
    for (let d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) out.push(new Date(d));
    // Juda uzun oraliqda diagramma o'qilmaydi — 60 kun bilan cheklaymiz
    return out.slice(-60);
  }, [range]);

  /**
   * Chiziq ma'lumoti — kunlik aniqlanishlar (yoki "Bugun"da soatlik).
   *
   * `_key` — kun (`YYYY-MM-DD`) yoki soat (`"00"`..`"23"`) ISO kaliti,
   * KO'RINADIGAN `day` yorlig'idan ALOHIDA: nuqta bosilganda shu kalit
   * bilan kesim so'raladi, formatlangan yorliqdan (`"2-sen"`) qaytadan
   * sana chiqarish shart emas.
   */
  const series = useMemo(() => {
    if (isToday) {
      const hours = Array<number>(24).fill(0);
      rs.hourly.forEach((v, h) => (hours[h] = v));
      return hours.map((v, h) => ({
        day: `${String(h).padStart(2, "0")}:00`,
        [t.chart.count]: v,
        _key: String(h).padStart(2, "0"),
      }));
    }
    return days.map((d) => {
      const key = localDay(d);
      return {
        day: dayMonthLabel(d, t),
        [t.chart.count]: daily.byDate.get(key) ?? 0,
        _key: key,
      };
    });
    /* `t` TO'LIQ dep — `dayMonthLabel()` oy nomlarini lug'atdan oladi. */
  }, [rs.hourly, daily.byDate, days, t, isToday]);

  /** Davr yig'indisi — sarlavha yonida (chiziqni o'qishdan OLDIN javob). */
  const periodTotal = rs.total;

  /** `ClickableDot`ning `dot`/`activeDot` ikkalasi uchun HAM AYNI handler. */
  function onPointPick(payload: unknown) {
    const p = payload as { day: string; _key: string };
    openPointDetail(p._key, p.day);
  }

  /** Nuqta bosilganda — o'sha kun/soatning tur va kamera kesimi. */
  function openPointDetail(key: string, label: string) {
    onOpenDetail({
      key: `period-point:${key}`,
      title: `${label} — aniqlanishlar`,
      tone: "#8FB8FF",
      /* ⚠️ Kesim SHU YERDA hisoblanmaydi: uzun oraliqda xom hodisalar
         umuman o'qilmagan bo'ladi (yuqoridagi izoh). Kichik komponent
         o'sha KUNNING o'zini so'raydi — bitta kun chegaraga sig'adi. */
      body: isToday ? (
        <HourBreakdown hour={key} date={range.from} n={n} />
      ) : (
        <DayBreakdown date={key} n={n} />
      ),
    });
  }

  /**
   * Halqa — hodisa turlari ulushi (SERVER kategoriyalari, aniq sonlar).
   */
  const pie = useMemo(
    () =>
      NVR_CATEGORIES.map((c) => ({
        id: c,
        name: t.detect.category[c],
        value: cats.totals[c],
        color: CATEGORY_COLOR[c],
      })).filter((r) => r.value > 0),
    [cats.totals, t]
  );

  const pieTotal = cats.sum;

  /** Bo'lak bosilganda — o'sha kategoriyaning so'nggi qaydlari. */
  function openPieDetail(id: NvrRealCategory) {
    const info = pie.find((r) => r.id === id);
    if (!info) return;
    onOpenDetail({
      key: `period-pie:${id}`,
      title: `${info.name} — so'nggi qaydlar`,
      tone: info.color,
      body: (
        <CategoryBreakdown
          category={id}
          from={range.from}
          to={range.to}
          total={info.value}
          share={pieTotal > 0 ? (info.value / pieTotal) * 100 : 0}
          color={info.color}
          n={n}
          t={t}
        />
      ),
    });
  }

  const loading = rs.isLoading;

  return (
    /* ⚠️ Halqa ustuni KENGROQ: `Donut3D` yorliqlarni chiziqcha bilan
       TASHQARIDA chizadi va tor ustunda ular qirqilib ketardi. */
    <div className="grid gap-3 xl:grid-cols-[1fr_1fr]">
      <StatPanel
        title="Davr kesimi"
        hint={`${range.from} … ${range.to}`}
        right={<DataBadge live={periodTotal > 0} />}
        className="min-h-[260px]"
      >
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-[10.5px] uppercase tracking-wide text-slate-500">{period.label}</span>
          {/* Davr yig'indisi — grafikni o'qishdan OLDIN javob beradi. */}
          <span className="font-mono text-[12.5px] font-bold text-ice-bright">{n(periodTotal)}</span>
          <span className="-ml-1 text-[10.5px] text-slate-500">qayd</span>
          <span className="ml-auto font-mono text-[10.5px] text-slate-500">
            {isToday ? "24 soat" : `${days.length} kun`}
            {loading ? " · yuklanmoqda…" : ""}
          </span>
        </div>

        {/* ── Har bir nuqta BOSILADI — umumiy o'ng panelda shu kun/soat
            kesimi ochiladi (2026-09-10) ── */}
        <div className="h-[190px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="sp-det" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8FB8FF" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#8FB8FF" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              {/* Uzun oraliqda har kunning yorlig'i sig'maydi — recharts
                  o'zi siyraklashtirsin (`interval` berilmaydi). */}
              <XAxis dataKey="day" tick={AXIS} tickLine={false} axisLine={false} minTickGap={18} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} width={Y_AXIS_W} />
              <Tooltip contentStyle={TOOLTIP} />
              <Area
                type="monotone"
                dataKey={t.chart.count}
                stroke="#8FB8FF"
                strokeWidth={2}
                fill="url(#sp-det)"
                dot={<ClickableDot tone="#8FB8FF" onPick={onPointPick} />}
                /* ⚠️ `activeDot` ham `ClickableDot` — oddiy obyekt bo'lsa
                   HOVER paytidagi "aktiv" doira bosiladigan nuqtani
                   to'sib qo'yardi (`ClickableDot` izohiga qarang). */
                activeDot={<ClickableDot tone="#8FB8FF" r={5} onPick={onPointPick} />}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </StatPanel>

      {/* ── HALQA (pie) — hodisa turlari ulushi ── */}
      <StatPanel
        title="Hodisa turlari"
        hint={`aniqlanishlar oqimi · ${period.label}`}
        right={<DataBadge live={pieTotal > 0} />}
        className="min-h-[340px]"
      >
        {cats.isLoading ? (
          <p className="py-10 text-center text-[12px] text-slate-500">Yuklanmoqda…</p>
        ) : pieTotal === 0 ? (
          <p className="py-10 text-center text-[12px] text-slate-500">Bu davrda hodisa qayd etilmadi</p>
        ) : (
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <Donut3D
              data={pie.map((r) => ({ id: r.id, label: r.name, value: r.value, color: r.color }))}
              caption="jami qayd"
              size={420}
              format={n}
              onSelect={(s) => openPieDetail(s.id as NvrRealCategory)}
            />
          </div>
        )}
      </StatPanel>
    </div>
  );
}

/* ────────────────────────── Chuqurlashuv panellari ────────────────────── */

/** Tur/kamera kesimi jadvali — uchala chuqurlashuv uchun umumiy. */
function Breakdown({
  byCategory,
  byChannel,
  n,
}: {
  byCategory: { label: string; count: number }[];
  byChannel: { channel: string; camera: string; count: number }[];
  n: (v: number) => string;
}) {
  return (
    <>
      <div>
        <p className="mb-1 text-[9.5px] uppercase tracking-wide text-slate-500">Tur kesimi</p>
        <div className="space-y-1">
          {byCategory.map((c) => (
            <div key={c.label} className="flex items-center justify-between text-[11px]">
              <span className="truncate text-slate-300">{c.label}</span>
              <span className="font-mono text-slate-400">{n(c.count)}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1 text-[9.5px] uppercase tracking-wide text-slate-500">Kameralar</p>
        <div className="space-y-1">
          {byChannel.map((c) => (
            <div key={c.channel} className="flex items-center justify-between text-[11px]">
              <span className="truncate text-slate-300">{c.camera}</span>
              <span className="font-mono text-slate-400">{n(c.count)}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/** Xom yozuvlardan tur va kamera kesimini yig'adi. */
function groupEvents(events: { category_label: string; channel: string; camera: string }[]) {
  const byCat = new Map<string, number>();
  const byChan = new Map<string, { camera: string; count: number }>();
  for (const ev of events) {
    byCat.set(ev.category_label, (byCat.get(ev.category_label) ?? 0) + 1);
    const c = byChan.get(ev.channel) ?? { camera: ev.camera, count: 0 };
    c.count++;
    byChan.set(ev.channel, c);
  }
  return {
    byCategory: [...byCat.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count),
    byChannel: [...byChan.entries()]
      .map(([channel, v]) => ({ channel, camera: v.camera, count: v.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
  };
}

/**
 * "Bugun" ko'rinishida SOAT kesimi — FAQAT bosilganda o'sha kun so'raladi
 * (`DayBreakdown` bilan AYNI kalit, ya'ni ikkinchi marta so'ralmaydi).
 * ⚠️ Bir kunlik oyna `limit=500` — kun undan uzun bo'lsa soat kesimi oxirgi
 * 500 qayd bo'yicha hisoblanadi (umumiy soatlik son esa server hisobidan).
 */
function HourBreakdown({ hour, date, n }: { hour: string; date: string; n: (v: number) => string }) {
  const q = useQuery({
    queryKey: ["nvr-day-breakdown", date],
    queryFn: () => listEvents("all", { limit: 500, date_from: date, date_to: date }),
    staleTime: 60_000,
  });
  if (q.isLoading) return <p className="text-[11px] text-slate-500">Yuklanmoqda…</p>;
  const events = q.data?.events ?? [];
  const matches = events.filter((ev) => String(new Date(ev.time).getHours()).padStart(2, "0") === hour);
  const g = groupEvents(matches);
  return (
    <div className="space-y-3">
      <p className="font-mono text-[22px] font-bold leading-none text-white">
        {n(matches.length)}
        <span className="ml-1.5 text-[10.5px] font-normal text-slate-500">qayd</span>
      </p>
      {matches.length === 0 ? (
        <p className="text-[11px] text-slate-500">Bu kesimda qayd yo&apos;q.</p>
      ) : (
        <Breakdown {...g} n={n} />
      )}
    </div>
  );
}

/**
 * BITTA KUN kesimi — o'sha kunning o'zi so'raladi.
 *
 * ⚠️ Bir kunlik oqim chegaraga sig'adi (`limit=500`), shuning uchun bu
 * yerda xom yozuvlarni o'qish xavfsiz — muammo faqat UZUN oraliqda edi.
 * Aniq JAMI son baribir serverning `total` idan olinadi, ya'ni oqim
 * 500 dan oshsa ham yuqoridagi son to'g'ri qoladi.
 */
function DayBreakdown({ date, n }: { date: string; n: (v: number) => string }) {
  const q = useQuery({
    queryKey: ["nvr-day-breakdown", date],
    queryFn: () => listEvents("all", { limit: 500, date_from: date, date_to: date }),
    staleTime: 60_000,
  });

  if (q.isLoading) return <p className="text-[11px] text-slate-500">Yuklanmoqda…</p>;

  const events = q.data?.events ?? [];
  const total = q.data?.total ?? events.length;
  const g = groupEvents(events);
  return (
    <div className="space-y-3">
      <p className="font-mono text-[22px] font-bold leading-none text-white">
        {n(total)}
        <span className="ml-1.5 text-[10.5px] font-normal text-slate-500">qayd</span>
      </p>
      {total === 0 ? (
        <p className="text-[11px] text-slate-500">Bu kunda qayd yo&apos;q.</p>
      ) : (
        <>
          <Breakdown {...g} n={n} />
          {/* Oqim oynadan uzun bo'lsa — kesim SHU oynaga tegishli, JAMI
              son esa butun kunniki. Jim qirqilmaydi. */}
          {total > events.length && (
            <p className="text-[10px] leading-snug text-slate-500">
              Kesim oxirgi {n(events.length)} qayd bo&apos;yicha; jami — {n(total)}.
            </p>
          )}
        </>
      )}
    </div>
  );
}

/** Halqa bo'lagi bosilganda — o'sha kategoriyaning so'nggi qaydlari. */
function CategoryBreakdown({
  category,
  from,
  to,
  total,
  share,
  color,
  n,
  t,
}: {
  category: NvrRealCategory;
  from: string;
  to: string;
  total: number;
  share: number;
  color: string;
  n: (v: number) => string;
  t: Messages;
}) {
  const q = useQuery({
    queryKey: ["nvr-cat-latest", category, from, to],
    queryFn: () => listEvents(category, { limit: 8, date_from: from, date_to: to }),
    staleTime: 60_000,
  });
  const events = q.data?.events ?? [];
  return (
    <div className="space-y-3">
      <p className="font-mono text-[22px] font-bold leading-none" style={{ color }}>
        {n(total)}
        <span className="ml-1.5 text-[10.5px] font-normal text-slate-500">· {share.toFixed(1)}%</span>
      </p>
      <div className="max-h-[280px] space-y-1 overflow-y-auto">
        {q.isLoading ? (
          <p className="text-[11px] text-slate-500">Yuklanmoqda…</p>
        ) : events.length === 0 ? (
          <p className="text-[11px] text-slate-500">Qayd topilmadi.</p>
        ) : (
          events.map((ev) => (
            <div
              key={ev.id}
              className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-[11px]"
            >
              <span className="truncate text-slate-300">{ev.camera}</span>
              <span className="flex-none font-mono text-slate-500">{new Date(ev.time).toLocaleString(t.locale)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
