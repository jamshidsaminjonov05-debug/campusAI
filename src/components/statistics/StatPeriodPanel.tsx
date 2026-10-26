"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, BoxingGlove, Cigarette, DeviceMobile } from "@phosphor-icons/react";
import { Pistol } from "@/components/common/PistolIcon";
import { GifIcon } from "@/components/common/GifIcon";
import { NVR_COLOR } from "@/components/detections/DetectionCard";
import { useSmokingSplit } from "@/hooks/useSmokingSplit";
import { AXIS, PanelLoader, Skeleton, StatPanel, TOOLTIP, TOOLTIP_ITEM, TOOLTIP_LABEL, fmt, Y_AXIS_W } from "@/components/common/panels";
import { localDay } from "@/hooks/useTodayArrivals";
import type { NvrRealCategory } from "@/hooks/useEventCounts";
import { useEventStats } from "@/hooks/useEventStats";
import type { StatPeriod } from "@/hooks/useStatPeriod";
import { useT } from "@/i18n";
import { dayMonthLabel, weekdayLabel } from "@/lib/dateLabel";
import { ViolationListModal, type ViolationKind } from "./ViolationListModal";
import { EventTypeCardsModal } from "@/components/ai/TypeCards";


/** "Aniqlanganlar" tablaridagi AYNI animatsiyali ikonkalar (`public/icons/gif/detect/`). */
const DET_GIF = (name: string) => `/icons/gif/detect/${name}.gif`;

/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  DAVR KESIMI — kunlik / haftalik / oylik / erkin oraliq              ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * Ikkita ko'rinish yonma-yon:
 *   · **chiziq** — davr bo'ylab aniqlanishlar dinamikasi;
 *   · **halqa (pie)** — hodisa turlari ulushi.
 *
 * 🔴 **2026-10-24 — ODDIY FOYDALANUVCHI UCHUN QAYTA QURILDI** (UX tahlili,
 * "huddi shuni eski dizayn va ranglarga moslab"): chiziq → **USTUNLI** grafik
 * ("Kamera qaydlari", har ustun tepasida son), halqa → **4 QOIDABUZARLIK
 * KARTOCHKASI** ("Janjal holati — 2 ta [Ko'rish]"), yuz tanish ro'yxatda
 * YO'Q. Pastdagi "chiziq/halqa" izohlari TARIXIY; chuqurlashuv (`*Breakdown`)
 * komponentlari o'zgarmagan.
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
 * (2026-10-26: kesim ro'yxati olib tashlandi — sarlavhada faqat son nishoni).
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

export function StatPeriodPanel({
  period,
}: {
  /** Sahifaning YAGONA davr tanlovi — bu panel o'z tanlovini yasamaydi. */
  period: StatPeriod;
}) {
  const t = useT();
  const P = t.stats.panel;
  const n = (v: number) => fmt(v, t.locale);

  const range = useMemo(() => ({ from: period.from, to: period.to }), [period.from, period.to]);

  /** "Bugun" — 1 kunlik nuqta chiziq chizolmaydi, SOAT kesimi mazmunli
   *  bo'ladi (`StatDensity.tsx`dagi AYNI izohga qarang). */
  const isToday = period.id === "today";

  /* 🔴 2026-09-15: BARCHA sonlar BITTA so'rovdan — `GET /events/stats`.
     Server `by_day`/`by_hour`/`by_category` ni tayyor beradi. */
  const rs = useEventStats(range);
  /** Kunlik sonlar — SERVER hisobi, chegarasiz aniq. */
  const daily = useMemo(
    () => ({ byDate: new Map(rs.byDay.map((d) => [d.day, d.total])), total: rs.total, isLoading: rs.isLoading }),
    [rs.byDay, rs.total, rs.isLoading]
  );
  /** Chekish / telefon — klientda ajratiladi (`useSmokingSplit`). */
  const split = useSmokingSplit(range.from, range.to);

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
   * USTUNLI grafik ma'lumoti (2026-10-24, UX tahlili: "egri chiziq birja
   * grafigiga o'xshaydi" — endi har kun bitta ustun, tepasida aniq son).
   *
   * `_key` — kun (`YYYY-MM-DD`) yoki soat (`"00"`..`"23"`) ISO kaliti,
   * ko'rinadigan `day` yorlig'idan ALOHIDA: ustun bosilganda shu kalit bilan
   * kesim so'raladi. `_label` — ustun tepasidagi son: 12 tagacha ustunda
   * hammasida, ko'proq bo'lsa (oy, soatlar) faqat ENG KATTASIDA — aks holda
   * yorliqlar bir-birining ustiga tushib o'qilmasdi.
   */
  const series = useMemo(() => {
    const rows = isToday
      ? Array.from({ length: 24 }, (_, h) => ({
          day: `${String(h).padStart(2, "0")}:00`,
          value: rs.hourly[h] ?? 0,
          _key: String(h).padStart(2, "0"),
        }))
      : days.map((d) => {
          const key = localDay(d);
          return {
            day: days.length <= 8 ? `${weekdayLabel(d, t)} ${dayMonthLabel(d, t)}` : dayMonthLabel(d, t),
            value: daily.byDate.get(key) ?? 0,
            _key: key,
          };
        });
    const max = rows.reduce((m, r) => Math.max(m, r.value), 0);
    const all = rows.length <= 12;
    return rows.map((r) => ({
      ...r,
      [t.chart.count]: r.value,
      _label: r.value > 0 && (all || r.value === max) ? n(r.value) : "",
      _peak: r.value > 0 && r.value === max,
    }));
    /* `t` TO'LIQ dep — `dayMonthLabel()` oy nomlarini lug'atdan oladi. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rs.hourly, daily.byDate, days, t, isToday]);

  /** Davr yig'indisi — sarlavha ostida ODDIY jumla bilan. */
  const periodTotal = rs.total;

  /* 🔵 2026-10-26 — USTUN BOSILSA KATTA OYNA + O'SHA KUNNING KARTOCHKALARI
     (foydalanuvchi: "modalni kattalashtirib, o'sha kunda kelganlarni
     cardlarini qo'yib tashlaylik, pagination bilan"). Ilgari kichik markaziy
     oyna (`onOpenDetail`) faqat "4 610 qayd · Shaxsni aniqlash · Camera 01"
     sonlarini berardi. Endi `ai/TypeCards.tsx` `EventTypeCardsModal` —
     "Aniqlanganlar"dagi AYNI kartochkalar (`useNvrEvents("hammasi")`, o'sha
     kun), 3…8 ustun slayderi, sahifalash, bosilsa batafsil oyna; tepada
     avvalgi tur/kamera kesimi (`summary`). Soat ustunida (Bugun) — o'sha
     KUNNING kartochkalari, kesim esa o'sha soatniki (server soat bo'yicha
     filtr bermaydi). */
  const [dayCards, setDayCards] = useState<{ key: string; label: string } | null>(null);
  function onBarPick(d: unknown) {
    const p = ((d as { payload?: unknown }).payload ?? d) as { day: string; _key: string };
    if (!p?._key) return;
    setDayCards({ key: p._key, label: p.day });
  }

  /**
   * 🔴 QOIDABUZARLIK KARTOCHKALARI (2026-10-24, UX tahlili): halqa va foiz
   * O'RNIGA to'rtta aniq qator — "Janjal 2 ta [Ko'rish]". Oddiy foydalanuvchi
   * foizni emas, NECHTALIGINI bilishi kerak. Yuz tanish BU YERDA YO'Q — u
   * qoidabuzarlik emas (chap paneldagi "Kamera qaydlari" shuni ko'rsatadi).
   * Chekish/Telefon — serverda bitta kategoriya, `useSmokingSplit` ajratadi.
   */
  const violations = useMemo(
    () => [
      { kind: "janjal" as const, cat: "janjal" as NvrRealCategory, label: P.kinds.janjal, count: rs.byCategory.janjal, color: NVR_COLOR.janjal, Icon: BoxingGlove, gif: DET_GIF("wired-lineal-1807-boxing-glove-hover-pinch") },
      {
        kind: "smoking" as const,
        cat: "smoking" as NvrRealCategory,
        label: P.kinds.smoking,
        count: split.data ? split.data.smoking : rs.byCategory.smoking,
        color: NVR_COLOR.chekish,
        Icon: Cigarette,
        approx: split.data?.capped ?? false,
      },
      {
        kind: "phone" as const,
        cat: "smoking" as NvrRealCategory,
        label: P.kinds.phone,
        count: split.data?.phone ?? 0,
        color: NVR_COLOR.telefon,
        Icon: DeviceMobile,
        gif: DET_GIF("wired-lineal-2720-logo-viber-hover-pinch"),
        approx: split.data?.capped ?? false,
        pending: !split.data,
      },
      { kind: "gun" as const, cat: "gun" as NvrRealCategory, label: P.kinds.gun, count: rs.byCategory.gun, color: NVR_COLOR.gun, Icon: Pistol },
    ],
    [rs.byCategory, split.data, P.kinds]
  );
  /* Sichqoncha ustidagi kartochka — GIF faqat shunda o'ynaydi (tinch holatda
     birinchi kadr qotib turadi, `GifIcon`). */
  const [hoverKind, setHoverKind] = useState<string | null>(null);
  const violationsTotal = rs.byCategory.janjal + rs.byCategory.smoking + rs.byCategory.gun;

  /* "Ko'rish" — RASMLI kartochkalar oynasi (`ViolationListModal`, 2026-10-26).
     Ilgari o'ng panelda (`onOpenDetail` → `CategoryBreakdown`) faqat
     "kamera · vaqt" qatorlari edi — foydalanuvchi: "aniq ma'lumotlar rasmlari
     bilan, card bo'lib, bosib video/rasm/vaqt". */
  const [violation, setViolation] = useState<{ kind: ViolationKind; label: string; color: string } | null>(null);
  function openViolation(v: (typeof violations)[number]) {
    setViolation({ kind: v.kind, label: v.label, color: v.color });
  }

  const loading = rs.isLoading || period.resolving;

  return (
    <div className="grid gap-3 xl:grid-cols-[1.25fr_1fr]">
      {/* "JONLI" nishoni HAR paneldan OLIB TASHLANDI (2026-10-24, UX tahlili):
          sahifaning yuqorisida BITTA umumiy "Tizim holati" indikatori. */}
      <StatPanel
        title={P.cameraRecords}
        hint={period.label}
        className="min-h-[340px]"
        bodyClass="flex flex-col"
      >
        {/* ODDIY JUMLA — grafikni o'qishdan OLDIN javob ("Kamera oldidan jami
            41 036 marta o'tildi"), "41 036 qayd" o'rniga. */}
        <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          {loading ? (
            <Skeleton className="h-[16px] w-56 rounded" />
          ) : (
            <p className="text-[12.5px] text-slate-200">
              {(isToday ? P.cameraRecordsSubToday : P.cameraRecordsSub)("")}
              <b className="font-mono text-[15px] font-bold text-ice-bright"> {n(periodTotal)}</b>
            </p>
          )}
          <span className="ml-auto text-[10px] text-slate-500">{isToday ? P.cameraRecordsNoteToday : P.cameraRecordsNote}</span>
        </div>

        <div className="relative min-h-[200px] flex-1">
          {loading && <PanelLoader days={period.days} allTime={period.id === "all"} className="absolute inset-0 z-10" />}
          <ResponsiveContainer width="100%" height="100%" className={loading ? "invisible" : ""}>
            <BarChart data={series} margin={{ top: 18, right: 8, bottom: 0, left: 0 }} barCategoryGap={series.length > 12 ? "20%" : "28%"}>
              <CartesianGrid stroke="rgba(120,150,200,0.08)" vertical={false} />
              <XAxis dataKey="day" tick={AXIS} tickLine={false} axisLine={false} interval={series.length > 12 ? "preserveStartEnd" : 0} minTickGap={6} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} width={Y_AXIS_W} />
              <Tooltip
                contentStyle={TOOLTIP}
                itemStyle={TOOLTIP_ITEM}
                labelStyle={TOOLTIP_LABEL}
                cursor={{ fill: "rgba(143,184,255,0.08)" }}
                formatter={(v: number) => [n(v), t.chart.count]}
              />
              <Bar dataKey={t.chart.count} fill="#8FB8FF" radius={[6, 6, 2, 2]} onClick={onBarPick} cursor="pointer" maxBarSize={56}>
                {series.map((r) => (
                  /* Eng katta ustun ochroq — "eng ko'p" bir qarashda */
                  <Cell key={r._key} fill={r._peak ? "#B8D2FF" : "#8FB8FF"} fillOpacity={r._peak ? 1 : 0.78} />
                ))}
                <LabelList dataKey="_label" content={<BarValueLabel />} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </StatPanel>

      {/* ── QOIDABUZARLIK KARTOCHKALARI ── */}
      <StatPanel
        title={P.violationsTitle}
        hint={P.violationsSub(period.label)}
        right={
          loading ? undefined : (
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 font-mono text-[11px] font-bold text-white">
              {P.violationsTotal(n(violationsTotal))}
            </span>
          )
        }
        className="min-h-[340px]"
        bodyClass="flex flex-col"
      >
        {loading ? (
          <PanelLoader days={period.days} allTime={period.id === "all"} className="flex-1" />
        ) : (
          <div className="flex flex-1 flex-col gap-2">
            {violations.map((v) => {
              const none = v.count === 0 && !v.pending;
              return (
                <button
                  key={v.kind}
                  type="button"
                  onClick={() => !none && openViolation(v)}
                  onMouseEnter={() => setHoverKind(v.kind)}
                  onMouseLeave={() => setHoverKind((k) => (k === v.kind ? null : k))}
                  onFocus={() => setHoverKind(v.kind)}
                  onBlur={() => setHoverKind((k) => (k === v.kind ? null : k))}
                  disabled={none}
                  style={{ ["--c" as string]: v.color }}
                  title={v.approx ? P.approxSplit : undefined}
                  className={`group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                    none
                      ? "cursor-default border-white/[0.06] bg-white/[0.02]"
                      : "border-[color:var(--c)]/35 bg-[color:var(--c)]/[0.08] hover:border-[color:var(--c)]/70 hover:bg-[color:var(--c)]/[0.14]"
                  }`}
                >
                  {/* 🔵 2026-10-26 — ZAMONAVIY IKONKA PLITKASI (foydalanuvchi: "iconlarni
                      zamonaviy iconlarga yoki giflarga o'zgartir"). Janjal va telefon —
                      "Aniqlanganlar" tablaridagi AYNI animatsiyali GIF (hover'da o'ynaydi);
                      chekish/qurol uchun loyihada GIF YO'Q (offline — yuklab bo'lmaydi),
                      ular to'ldirilgan ikonka + hover'da jonlanish. Plitka — tur rangidagi
                      gradient va yengil porlash; aniqlanmagan tur — kulrang. */}
                  <span
                    className={`relative grid h-11 w-11 flex-none place-items-center rounded-xl ring-1 transition-transform duration-300 group-hover:-translate-y-0.5 ${
                      none
                        ? "bg-white/[0.04] text-slate-500 ring-white/[0.06]"
                        : "bg-[linear-gradient(140deg,color-mix(in_srgb,var(--c)_34%,transparent),color-mix(in_srgb,var(--c)_8%,transparent))] text-[color:var(--c)] shadow-[0_6px_18px_-8px_var(--c)] ring-[color:var(--c)]/35"
                    }`}
                  >
                    {v.gif ? (
                      <GifIcon
                        src={v.gif}
                        size={26}
                        play={!none && hoverKind === v.kind}
                        className={none ? "opacity-50 grayscale" : "drop-shadow-[0_0_6px_rgba(255,255,255,0.15)]"}
                      />
                    ) : (
                      <v.Icon
                        size={22}
                        weight={none ? "duotone" : "fill"}
                        className="transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110"
                      />
                    )}
                  </span>
                  <span className={`min-w-0 flex-1 truncate text-[13px] font-bold ${none ? "text-slate-400" : "text-white"}`}>{v.label}</span>
                  <span className={`flex-none font-mono text-[20px] font-extrabold leading-none ${none ? "text-slate-500" : "text-[color:var(--c)]"}`}>
                    {v.pending ? "…" : `${n(v.count)}${v.approx ? "+" : ""}`}
                    <span className="ml-1 text-[10.5px] font-semibold text-slate-400">{none || v.pending ? "" : "ta"}</span>
                  </span>
                  {none ? (
                    <span className="flex-none rounded-full border border-emerald-400/25 bg-emerald-400/[0.08] px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-emerald-300">
                      {P.notDetected}
                    </span>
                  ) : (
                    <span className="flex flex-none items-center gap-1 rounded-full border border-white/15 bg-black/25 px-2.5 py-1 text-[10.5px] font-semibold text-slate-200 transition-colors group-hover:border-[color:var(--c)]/60 group-hover:text-white">
                      {P.view}
                      <ArrowRight size={11} weight="bold" />
                    </span>
                  )}
                </button>
              );
            })}
            <p className="mt-auto pt-1 text-[10px] text-slate-500">{P.violationsFaceNote}</p>
          </div>
        )}
      </StatPanel>
      {dayCards && (
        <EventTypeCardsModal
          title={`${dayCards.label} — aniqlanishlar`}
          eyebrow={P.cameraRecords}
          color="#8FB8FF"
          tab="hammasi"
          from={isToday ? range.from : dayCards.key}
          to={isToday ? range.from : dayCards.key}
          count={isToday ? rs.hourly[Number(dayCards.key)] ?? 0 : undefined}
          onClose={() => setDayCards(null)}
        />
      )}
      {violation && (
        <ViolationListModal
          kind={violation.kind}
          label={violation.label}
          color={violation.color}
          from={range.from}
          to={range.to}
          onClose={() => setViolation(null)}
        />
      )}
    </div>
  );
}

/**
 * Ustun tepasidagi son — FAQAT BIR QATORGA SIG'SA (2026-10-24, foydalanuvchi:
 * "raqam bir qatorga sig'masa shuni chiqarma"). Monospace 10 px ≈ 6.2 px/belgi;
 * ustun eni + yon oraliqning bir qismi (×1.35) ichiga sig'masa CHIZILMAYDI —
 * qo'shni ustunning soniga ustma-ust tushib o'qilmas bo'lardi. Son tooltipda
 * baribir bor.
 */
function BarValueLabel(props: { x?: number | string; y?: number | string; width?: number | string; value?: string | number }) {
  const text = props.value == null ? "" : String(props.value);
  const w = Number(props.width) || 0;
  if (!text || text.length * 6.2 > w * 1.35) return null;
  return (
    <text
      x={Number(props.x) + w / 2}
      y={Number(props.y) - 5}
      textAnchor="middle"
      fill="#E2E8F0"
      fontSize={10}
      fontWeight={700}
      fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
    >
      {text}
    </text>
  );
}
