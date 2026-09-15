"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Broadcast, Clock, SignIn, UsersThree } from "@phosphor-icons/react";
import { AXIS, StatPanel, TOOLTIP, TabPill, fmt } from "@/components/common/panels";
import { DataBadge } from "@/components/dashboard/DataBadge";
import { useArrivals } from "@/hooks/useTodayArrivals";
import { useEventStats } from "@/hooks/useEventStats";
import { useNvrAttendanceRows } from "@/hooks/useNvrAttendance";
import { useCountingStats } from "@/hooks/useCounting";
import type { StatPeriod } from "@/hooks/useStatPeriod";
import { useT } from "@/i18n";
import type { StatDetailContent } from "./StatDetailDrawer";

/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  KUN DAVOMIDAGI ZICHLIK — soat bo'yicha, DAVR kesimida               ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * "Kun davomida qachon gavjum bo'ladi" degan savolga javob. To'rtta
 * O'LCHOV bir xil o'qda: hodisalar, odamlar, davomat va odam sanog'i.
 * Davr — sahifaning YAGONA tanlovi (Bugun / 3 kun / Hafta / Oy / Oraliq).
 *
 * ── ⚠️ ENG MUHIM TUZOQ: "TAKRORSIZ" NIMAGA NISBATAN ──────────────────
 * Ilgari bu grafik `useArrivals().byHour` dan o'qirdi. U esa odamni
 * BUTUN ORALIQ bo'yicha takrorsiz sanaydi va uni **birinchi marta
 * ko'ringan** soatiga yozadi. Bir kun uchun bu to'g'ri, lekin:
 *
 *   · "30 kun" tanlansa — har kuni kelib turgan o'quvchi grafikda
 *     ATIGI BIR MARTA, birinchi kelgan kunidagi soatda ko'rinardi;
 *   · natijada oylik grafik kunlik grafikdan PAST chiqardi va
 *     "oyda 620 odam" degan ma'nosiz son ko'rsatilardi.
 *
 * To'g'ri o'lchov — **kunlik takrorsizlik**: har KUN uchun odam bir
 * marta sanaladi (o'sha kuni birinchi ko'ringan soatida), keyin kunlar
 * qo'shiladi. Shunda "oy" = 30 kunlik oqim bo'ladi va kunlik o'rtacha
 * ma'noga ega bo'ladi.
 *
 * ── SONLAR QANDAY O'QILADI ────────────────────────────────────────────
 * · **Jami** — butun oraliq bo'yicha;
 * · **Kunlik o'rtacha** — jami ÷ oraliqdagi kunlar (davrlarni
 *   TAQQOSLASH uchun yagona to'g'ri son);
 * · **Ustunlar** — oraliqdagi HAMMA kunning shu soatidagi yig'indisi.
 *
 * ⚠️ Hech narsa o'ylab topilmaydi: manba bo'sh bo'lsa grafik o'rniga
 * SABABI yoziladi (davomat qaydi yo'q, sanash kamerasi yoqilmagan…).
 *
 * 🔴 **"DAVOMAT" O'LCHOVI — MANBA kuzatuv posti, BACKEND EMAS** (2026-09-10,
 * foydalanuvchi xabar qildi: "davomat bosilganda ishlamayabdi").
 * Ilgari bu o'lchov backend `/api/v1/attendance`dan o'qirdi — o'sha
 * jadval AMALDA BO'SH (jami 2 ta yozuv, ikkalasi 2026-07-15), shuning
 * uchun tugma bosilsa doim "qayd yo'q" ko'rinardi. Endi
 * `useNvrAttendanceRows().byHour` (`hooks/useNvrAttendance.ts`,
 * `StatPeopleNvr.tsx`dagi "Kelish soatlari" bilan AYNI hisoblangan
 * qator) — o'sha yerda kuzatuv postining O'Z davomati bor.
 *
 * 🔵 **"BUGUN"DA — USTUN EMAS, CHIZIQ** (2026-09-10, foydalanuvchi
 * so'rovi). Sabab: "Davomat dinamikasi" (kun kesimi, `StatOverview.tsx`)
 * "Bugun" tanlanganda BITTA kunlik nuqtaga tushadi — chiziq chizish
 * uchun kamida 2 nuqta kerak, ya'ni o'sha grafikda hech qanday chiziq
 * ko'rinmaydi (SVG'ning o'zi bitta nuqtali `<Area>`/`<Line>`ni chizmaydi).
 * Shu SOAT kesimi esa "Bugun"da ham DOIM 24 nuqtaga ega (kun ichidagi
 * har bir soat) — ya'ni aynan shu yerda chiziq mazmunli. Boshqa
 * davrlarda (3 kun/Hafta/Oy/Oraliq) bu yer USTUN bo'lib qolaveradi —
 * ko'p kunlik yig'indi ustunlarda o'qilishi osonroq, "Davomat
 * dinamikasi" o'zi allaqachon ko'p nuqtali chiziq beradi.
 */

type Measure = "events" | "people" | "attendance" | "counting";

/** `YYYY-MM-DD` — mahalliy sana (soat mintaqasi siljitmasin). */
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const EMPTY_24 = () => Array<number>(24).fill(0);

export function StatDensity({
  period,
  onOpenDetail,
}: {
  period: StatPeriod;
  /** Soat bosilganda — umumiy o'ng panelga mazmun yuboradi (`StatDetailDrawer`). */
  onOpenDetail: (content: StatDetailContent) => void;
}) {
  const t = useT();
  const n = (v: number) => fmt(v, t.locale);
  const [measure, setMeasure] = useState<Measure>("events");

  const range = useMemo(() => ({ from: period.from, to: period.to }), [period.from, period.to]);

  /* Uchala manba ham SHARTSIZ so'raladi — hooklar soni qat'iy bo'lishi
     kerak. Ikkitasi baribir sahifada allaqachon olingan (React Query
     bir xil kalitni takror so'ramaydi): `useArrivals` — StatPeriodPanel. */
  /* 🔴 2026-09-15: "Hodisalar" o'lchovi SERVER hisobidan (`/events/stats` `by_hour`,
     bitta so'rov). XOM oqim faqat "Odamlar" o'lchovi TANLANGANDA o'qiladi —
     kunlik takrorsiz `face_id` ni server sanamaydi. Ilgari xom oqim HAR DOIM
     sahifalab tortilardi (bir necha o'nlab so'rov, daqiqada bir). */
  const evStats = useEventStats(range);
  const arrivals = useArrivals({ ...range, enabled: measure === "people" });
  /**
   * 🔴 **"DAVOMAT" O'LCHOVI TOPILDI VA TUZATILDI** (2026-09-10,
   * foydalanuvchi xabar qildi: "nega davomat bosilganda ishlamayabdi").
   * Ilgari `useAllAttendance()` — BACKEND `/api/v1/attendance` (7005)
   * dan o'qirdi. O'sha jadval amalda BO'SH (o'lchandi: jami 2 ta yozuv,
   * ikkalasi 2026-07-15) — shuning uchun "Davomat" bosilganda grafik
   * HAR DOIM "Bu oraliqda davomat qaydi yo'q" deb turardi, garchi
   * kuzatuv postida (kuzatuv posti) yuzlab haqiqiy davomat qaydi bo'lsa ham.
   * Endi manba kuzatuv posti (`useNvrAttendanceRows().byHour` — "Kelish
   * soatlari" panelida ALLAQACHON ishlatiladigan HISOBLANGAN qator,
   * `StatPeopleNvr.tsx`dagi bilan AYNI infratuzilma).
   *
   * `enabled` — FAQAT shu o'lchov TANLANGANDA so'raladi (bu hook
   * kun × rol bo'yicha to'liq ro'yxat tortadi, role=student'da bir
   * kun ~146 KB — bekorga yuklanmasin).
   */
  const nvrAttendance = useNvrAttendanceRows(range.from, range.to, undefined, measure === "attendance");
  const counting = useCountingStats({ date_from: range.from, date_to: range.to });

  /** Oraliqdagi kunlar soni — kunlik o'rtacha shunga bo'linadi. */
  const days = Math.max(1, period.days);

  const series = useMemo(() => {
    const hours = EMPTY_24();

    if (measure === "events") {
      /* XOM hodisalar — kamera nechta qayd bergani. */
      evStats.hourly.forEach((v, h) => (hours[h] = v));
    } else if (measure === "people") {
      /* ⚠️ KUNLIK takrorsizlik (yuqoridagi izoh): kalit = kun + face_id,
         soat esa o'sha KUNI birinchi ko'ringan payt. */
      const firstOfDay = new Map<string, number>();
      for (const e of arrivals.raw) {
        if (typeof e.face_id !== "number") continue;
        const d = new Date(e.time);
        const key = `${dayKey(d)}|${e.face_id}`;
        const ts = d.getTime();
        const prev = firstOfDay.get(key);
        if (prev === undefined || ts < prev) firstOfDay.set(key, ts);
      }
      for (const ts of firstOfDay.values()) hours[new Date(ts).getHours()]++;
    } else if (measure === "attendance") {
      for (const b of nvrAttendance.byHour) hours[b.hour] = b.total;
    } else {
      for (const h of counting.data?.by_hour ?? []) {
        const idx = Number(h.hour);
        if (Number.isFinite(idx) && idx >= 0 && idx < 24) hours[idx] += h.enter + h.exit;
      }
    }

    return hours;
  }, [measure, evStats.hourly, arrivals.raw, nvrAttendance.byHour, counting.data]);

  const stats = useMemo(() => {
    const total = series.reduce((s, v) => s + v, 0);
    let peak = -1;
    let quiet = -1;
    series.forEach((v, h) => {
      if (peak < 0 || v > series[peak]) peak = h;
      /* Eng tinch soat — FAQAT harakat bo'lgan soatlar orasidan: tunda
         nol bo'lishi tabiiy va u hech narsani anglatmaydi. */
      if (v > 0 && (quiet < 0 || v < series[quiet])) quiet = h;
    });
    return {
      total,
      perDay: total / days,
      peak: total > 0 ? peak : null,
      peakValue: peak >= 0 ? series[peak] : 0,
      quiet: quiet >= 0 ? quiet : null,
      quietValue: quiet >= 0 ? series[quiet] : 0,
      /* Nechta soatda umuman harakat bo'lgan — "faol soatlar" */
      activeHours: series.filter((v) => v > 0).length,
    };
  }, [series, days]);

  const chart = useMemo(
    () => series.map((v, h) => ({ hour: String(h).padStart(2, "0"), [t.chart.count]: v })),
    [series, t.chart.count]
  );

  const MEASURES: { id: Measure; label: string; Icon: typeof Clock; tone: string }[] = [
    { id: "events", label: "Hodisalar", Icon: Broadcast, tone: "#8FB8FF" },
    { id: "people", label: "Odamlar", Icon: UsersThree, tone: "#34D399" },
    { id: "attendance", label: "Davomat", Icon: SignIn, tone: "#F59E0B" },
    { id: "counting", label: "Odam sanog'i", Icon: Clock, tone: "#A78BFA" },
  ];
  const current = MEASURES.find((m) => m.id === measure) ?? MEASURES[0];
  /** "Bugun" — bitta kun, ya'ni chiziq mazmunli (yuqoridagi izohga qarang). */
  const isToday = period.id === "today";

  /**
   * Soat bosilganda — umumiy o'ng panelga mazmun yuboradi.
   * "Hodisalar"/"Odamlar" o'lchovida — shu soatdagi kamera kesimi (davr
   * bo'yicha yig'indi, `arrivals.raw` ALLAQACHON xotirada). Boshqa ikki
   * o'lchov (Davomat/Odam sanog'i) uchun soatlik xom qatorlar yo'q,
   * shuning uchun faqat SON ko'rsatiladi — o'ylab topilmaydi.
   */
  function openHourDetail(hour: string, value: number) {
    let channels: { channel: string; camera: string; count: number }[] = [];
    if (measure === "people") {
      /* Soatlik KAMERA kesimini server bermaydi — faqat xom oqim bor o'lchovda. */
      const h = Number(hour);
      const matches = arrivals.raw.filter((ev) => new Date(ev.time).getHours() === h);
      const byChan = new Map<string, { camera: string; count: number }>();
      for (const ev of matches) {
        const c = byChan.get(ev.channel) ?? { camera: ev.camera, count: 0 };
        c.count++;
        byChan.set(ev.channel, c);
      }
      channels = [...byChan.entries()]
        .map(([channel, v]) => ({ channel, camera: v.camera, count: v.count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);
    }

    onOpenDetail({
      key: `density-hour:${measure}:${hour}`,
      title: `${hour}:00 — ${current.label}`,
      tone: current.tone,
      body: (
        <div className="space-y-3">
          <p className="font-mono text-[22px] font-bold leading-none" style={{ color: current.tone }}>
            {n(value)}
            <span className="ml-1.5 text-[10.5px] font-normal text-slate-500">· kuniga ~{n(Math.round(value / days))}</span>
          </p>
          {channels.length > 0 && (
            <div>
              <p className="mb-1 text-[9.5px] uppercase tracking-wide text-slate-500">Kameralar</p>
              <div className="space-y-1">
                {channels.map((c) => (
                  <div key={c.channel} className="flex items-center justify-between text-[11px]">
                    <span className="truncate text-slate-300">{c.camera}</span>
                    <span className="font-mono text-slate-400">{n(c.count)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ),
    });
  }

  /** `DensityDot`ning `dot`/`activeDot` ikkalasi uchun HAM AYNI handler. */
  function onLinePointPick(payload: unknown) {
    const p = payload as { hour: string; [k: string]: unknown };
    openHourDetail(p.hour, Number(p[t.chart.count] ?? 0));
  }

  const loading =
    measure === "events" ? evStats.isLoading
    : measure === "people" ? arrivals.isLoading
    : measure === "attendance" ? nvrAttendance.isLoading
    : counting.isLoading;

  /** Bo'sh bo'lsa — SABABI (o'ylab topilgan son emas). */
  const emptyReason =
    measure === "attendance"
      ? "Bu oraliqda davomat qaydi yo'q — dam olish kuni yoki kamera hali hech kimni tanimagan."
      : measure === "counting"
        ? "Sanash hisoboti yo'q — odam sanash faqat shu funksiya yoqilgan kamerada ishlaydi."
        : "Bu oraliqda qayd yo'q.";

  return (
    <StatPanel
      title="Kun davomidagi zichlik"
      hint={`${period.label} · ${days} kun · soat kesimida`}
      right={
        <div className="flex items-center gap-2">
          <span className="hidden font-mono text-[10px] text-slate-500 sm:inline">
            {n(Math.round(stats.total))} · kuniga ~{n(Math.round(stats.perDay))}
          </span>
          <DataBadge live />
        </div>
      }
      className="min-h-[300px]"
    >
      {/* O'LCHOV tanlovi — to'rttasi ham bitta o'qda solishtiriladi */}
      <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
        {MEASURES.map((m) => (
          <TabPill
            key={m.id}
            group="stat-density"
            active={measure === m.id}
            onClick={() => setMeasure(m.id)}
            Icon={m.Icon}
            iconSize={13}
          >
            {m.label}
          </TabPill>
        ))}
      </div>

      {/* Qisqa xulosa — grafikni o'qishdan OLDIN javob beradi */}
      <div className="mb-2.5 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Cell4 label="Jami" value={n(Math.round(stats.total))} hint={`${days} kun`} tone={current.tone} />
        <Cell4
          label="Kunlik o'rtacha"
          value={n(Math.round(stats.perDay))}
          hint="davrlarni taqqoslash uchun"
          tone={current.tone}
        />
        <Cell4
          label="Eng gavjum soat"
          value={stats.peak != null ? `${String(stats.peak).padStart(2, "0")}:00` : "—"}
          hint={stats.peak != null ? `${n(stats.peakValue)} ta` : "ma'lumot yo'q"}
          tone="#FB7185"
        />
        <Cell4
          label="Faol soatlar"
          value={`${stats.activeHours}/24`}
          hint={stats.quiet != null ? `eng tinchi ${String(stats.quiet).padStart(2, "0")}:00` : "—"}
          tone="#85E0FF"
        />
      </div>

      {loading ? (
        <div className="grid h-[190px] place-items-center">
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-ice/40 border-t-ice" />
        </div>
      ) : stats.total === 0 ? (
        <p className="px-2 py-14 text-center text-[11.5px] leading-snug text-slate-500">{emptyReason}</p>
      ) : (
        /* ── Har bir soat BOSILADI — umumiy o'ng panelda shu soatning
            kesimi ochiladi (2026-09-10, foydalanuvchi so'rovi) ── */
        <div className="h-[190px]">
          <ResponsiveContainer width="100%" height="100%">
            {isToday ? (
              /* "Bugun" — CHIZIQ (yuqoridagi "BUGUN"DA — USTUN EMAS,
                 CHIZIQ" izohiga qarang): 24 soatlik nuqta bor, chiziq
                 mazmunli. Cho'qqi nuqtasi katta/qizil bo'lib ajratiladi
                 — ustundagi bilan AYNI mantiq, faqat `Cell` o'rniga
                 maxsus `dot`. */
              <LineChart data={chart} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="rgba(120,150,200,0.08)" vertical={false} />
                <XAxis dataKey="hour" tick={AXIS} tickLine={false} axisLine={false} interval={0} />
                <YAxis
                  tick={AXIS}
                  tickLine={false}
                  axisLine={false}
                  width={38}
                  allowDecimals={false}
                  tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
                />
                <Tooltip contentStyle={TOOLTIP} cursor={{ stroke: "rgba(255,255,255,0.14)" }} />
                <Line
                  type="monotone"
                  dataKey={t.chart.count}
                  stroke={current.tone}
                  strokeWidth={2}
                  dot={<DensityDot peakIndex={stats.peak} tone={current.tone} onPick={onLinePointPick} />}
                  /* ⚠️ `activeDot` ham `onPick` bilan — oddiy obyekt bo'lsa
                     HOVER paytidagi "aktiv" doira bosiladigan nuqtani
                     to'sib qo'yardi (`ClickableDot` izohiga qarang,
                     `common/panels.tsx`). */
                  activeDot={<DensityDot peakIndex={stats.peak} tone={current.tone} onPick={onLinePointPick} active />}
                />
              </LineChart>
            ) : (
              <BarChart data={chart} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="rgba(120,150,200,0.08)" vertical={false} />
                <XAxis dataKey="hour" tick={AXIS} tickLine={false} axisLine={false} interval={0} />
                <YAxis
                  tick={AXIS}
                  tickLine={false}
                  axisLine={false}
                  width={38}
                  allowDecimals={false}
                  tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
                />
                <Tooltip contentStyle={TOOLTIP} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Bar dataKey={t.chart.count} radius={[3, 3, 0, 0]} cursor="pointer">
                  {/* Cho'qqi ustuni ajratiladi — ko'z darhol unga tushadi */}
                  {chart.map((row, i) => (
                    <Cell
                      key={i}
                      fill={i === stats.peak ? "#FB7185" : current.tone}
                      onClick={() => openHourDetail(row.hour, series[i])}
                    />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      <p className="mt-2 text-[9.5px] leading-snug text-slate-500">
        {measure === "people"
          ? "Odam KUNIGA bir marta sanaladi (o'sha kuni birinchi ko'ringan soatida), keyin kunlar qo'shiladi."
          : measure === "events"
            ? "Kameradan kelgan HAR BIR qayd sanaladi — bitta odam bir necha qayd berishi mumkin."
            : measure === "attendance"
              ? "Kuzatuv postining o'z davomati (kuzatuv posti) — birinchi ko'ringan soatida sanaladi."
              : "Sanash kamerasining kirdi + chiqdi hisobotlari."}
      </p>
    </StatPanel>
  );
}

/**
 * "Bugun" chizig'idagi nuqta — cho'qqi soati kattaroq/qizil bo'lib
 * ajratiladi (ustundagi `Cell` mantiqi bilan AYNI). `dot` propiga
 * ELEMENT sifatida beriladi — recharts uni har nuqta uchun
 * `cx`/`cy`/`index` bilan klonlaydi.
 */
function DensityDot(props: {
  cx?: number;
  cy?: number;
  index?: number;
  payload?: unknown;
  peakIndex: number | null;
  tone: string;
  onPick: (payload: unknown) => void;
  /** `activeDot` chaqiruvida — ko'rinadigan doira biroz kattaroq bo'ladi. */
  active?: boolean;
}) {
  const { cx, cy, index, payload, peakIndex, tone, onPick, active } = props;
  if (cx == null || cy == null) return null;
  const isPeak = index === peakIndex;
  const r = (isPeak ? 4.5 : 2.5) + (active ? 1.5 : 0);
  return (
    <g style={{ cursor: "pointer" }} onClick={() => onPick(payload)}>
      <circle cx={cx} cy={cy} r={Math.max(9, r + 4)} fill="transparent" />
      <circle cx={cx} cy={cy} r={r} fill={isPeak ? "#FB7185" : tone} stroke="none" />
    </g>
  );
}

/** Kichik ko'rsatkich katagi — panel ichida, KpiTile dan yengilroq. */
function Cell4({ label, value, hint, tone }: { label: string; value: string; hint: string; tone: string }) {
  return (
    <div className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-2.5 py-1.5">
      <p className="text-[9px] uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="font-mono text-[15px] font-bold leading-tight" style={{ color: tone }}>
        {value}
      </p>
      <p className="truncate text-[9.5px] text-slate-500">{hint}</p>
    </div>
  );
}
