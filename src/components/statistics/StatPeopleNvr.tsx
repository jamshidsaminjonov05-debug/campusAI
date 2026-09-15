"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CheckCircle, Clock, CornersIn, CornersOut, Prohibit, UsersThree } from "@phosphor-icons/react";
import type { PersonType } from "@/lib/api";
import type { StatPeriod } from "@/hooks/useStatPeriod";
import {
  useNvrAttendance,
  useNvrAttendanceRange,
  useNvrAttendanceRows,
  type PersonPeriodRow,
} from "@/hooks/useNvrAttendance";
import { LibraryPhoto, classOrder } from "@/components/people/FaceDatabasePage";
import { FaceHistoryModal } from "@/components/people/FaceHistoryModal";
import { EventDossier } from "@/components/detections/EventDossier";
import type { NvrAttendanceRow, NvrAttendanceStatus, NvrPersonRole } from "@/lib/nvrApi";
import { AXIS, KpiTile, StatPanel, TOOLTIP, fmt, rateTone, Y_AXIS_W } from "@/components/common/panels";
import { useT } from "@/i18n";
import { useViewMode, ViewToggle } from "@/components/common/ViewToggle";
import { useStudentLabel } from "@/hooks/useStudentLabel";

const STATUS_TEXT: Record<NvrAttendanceStatus, { label: string; cls: string }> = {
  early: { label: "Erta keldi", cls: "border-emerald-400/25 bg-emerald-400/12 text-emerald-300" },
  late: { label: "Kech qoldi", cls: "border-amber-400/25 bg-amber-400/12 text-amber-300" },
  absent: { label: "Kelmadi", cls: "border-rose-400/25 bg-rose-500/12 text-rose-300" },
  waiting: { label: "Kutilmoqda", cls: "border-white/10 bg-white/[0.05] text-slate-400" },
};

type SortKey = "name" | "klass" | "rate" | "late" | "absent" | "time";

/** Sinf kesimi qatori — BUGUNGI sonlar + davr foizi. */
interface ClassRow {
  klass: string;
  /** Ro'yxatdagi shaxslar (bugun). */
  total: number;
  early: number;
  late: number;
  absent: number;
  waiting: number;
  /** `early + late`. */
  present: number;
  /** Bugungi davomat foizi. */
  rate: number;
  /** Davr bo'yicha foiz (kun × shaxs) — manba bo'lmasa `null`. */
  periodRate: number | null;
}

/** Sinf kartochkalari saralashi (foydalanuvchi so'rovi: katta/kichik, yaxshi/yomon). */
/**
 * Sinf kartochkalari saralashi — **DAVOMAT TAXTASIDAGI bilan AYNI**
 * (2026-09-14, foydalanuvchi so'rovi: "3-rasmdagini olib tashla,
 * 2-rasmdagidek qil"). Ilgari bu yerda beshta tugma bor edi
 * (Sinf/Katta/Kichik/Yaxshi/Yomon) va u `AttendanceListModal` dagi
 * uchta tugmadan farq qilardi — bir xil ro'yxat ikki joyda ikki xil
 * boshqarilardi.
 *
 * "Davomat" QAYTA bosilsa yo'nalish teskari bo'ladi (yuqoridan pastga ↔
 * pastdan yuqoriga) — shu bilan eski "Yaxshi/Yomon" tugmalari ham
 * ortiqcha bo'ldi.
 */
type ClassSort = "class-asc" | "class-desc" | "rate";

/** Chiziqlar — kalitlar `dailySeries` maydon nomlari bilan AYNI. */
const LINES = [
  { key: "Kelgan", label: "Kelgan", color: "#34D399" },
  { key: "Kechikkan", label: "Kechikkan", color: "#F59E0B" },
  { key: "Kelmagan", label: "Kelmagan", color: "#FB7185" },
] as const;

/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  STATISTIKA → O'QITUVCHILAR / O'QUVCHILAR / XODIMLAR                 ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * 🔴 **MANBA — kuzatuv posti DAVOMATI** (2026-09-04). Eski `StatPeople.tsx` backend
 * `/persons` + `/attendance` ga qarardi va o'sha jadval amalda bo'sh edi
 * (jami 2 qator, ikkalasi 2026-07-15) — shu sababli hamma panel "Bugun
 * uchun davomat yozuvi yo'q" deb turardi. Endi kuzatuv postining O'Z
 * davomati: o'lchandi 2026-09-04 — 397 odam, 146 erta, 60 kech,
 * 191 kelmagan.
 *
 * Beshta panel va ularning HAQIQIY manbai:
 *   1. **Kelganlar / Kechikkanlar / Kelmaganlar** — `useNvrAttendanceRange`
 *      (toifalar taqqoslanadi, joriy toifa ajratiladi);
 *   2. **Kelish soatlari** — `useNvrAttendanceRows().byHour`;
 *   3. **Sinflar kesimi** — o'sha qatorlardan `note` bo'yicha guruhlab;
 *   4. **Kun kesimi — har bir shaxs** — davr bo'yicha jamlanma jadval;
 *   5. **Tanlangan shaxs** — o'sha odamning kunma-kun holati.
 *
 * ⚠️ **"Kirish / chiqish" EMAS, "Kelish soatlari".** Chiqish vaqti hech
 * qayerdan kelmaydi: o'lchandi 2026-09-04 — hodisalarning deyarli hammasi
 * BITTA kanaldan (`31 Camera 01`), ya'ni kirish/chiqishni ajratadigan
 * kamera yo'q. "Oxirgi ko'rinish = chiqish" deb hisoblash yolg'on son
 * berardi (odam koridorga chiqib qaytsa ham "chiqdi" bo'lardi).
 *
 * ⚠️ **"Dars kesimida e'tibor" paneli OLIB TASHLANDI** va o'rniga
 * "Sinflar kesimi" qo'yildi: kayfiyat/e'tibor moduli serverda umuman
 * o'rnatilmagan (`ultralytics` yo'q), kuzatuv posti davomatida ham bunday maydon
 * yo'q — ya'ni o'sha panel HECH QACHON haqiqiy son ko'rsata olmasdi.
 *
 * ⚠️ **XODIM (`staff`) — kuzatuv posti bu toifani BILMAYDI** (faqat `student`/
 * `teacher`). Bo'sh ekran o'rniga SABABI yoziladi.
 */
export function StatPeopleNvr({
  query,
  period,
  personType,
  onSelectType,
}: {
  query: string;
  period: StatPeriod;
  personType: PersonType;
  onSelectType?: (id: PersonType) => void;
}) {
  const t = useT();
  const n = (v: number) => fmt(v, t.locale);
  /* "O'quvchi" ↔ "Talaba" — muassasa turiga qarab (`useStudentLabel`). */
  const student = useStudentLabel();

  /* ⚠️ Saralash QAT'IY (ism bo'yicha, o'sish tartibida) — ustun
     tugmalari bo'lgan jadval sahifadan olib tashlangan. Mantiq
     saqlanadi: "Tanlangan shaxs" paneli ro'yxatdan topib oladi. */
  const sort = "name" as SortKey;
  const dir = "asc" as "asc" | "desc";
  const [selectedId] = useState<number | null>(null);
  const [openEvent, setOpenEvent] = useState<number | null>(null);
  /** Sinf chuqurlashuvidan tanlangan shaxs — to'liq SHAXS PANELI ochiladi. */
  const [personPanelId, setPersonPanelId] = useState<number | null>(null);
  /** Yorliq bosilganda yashiriladigan chiziqlar. */
  const [hidden, setHidden] = useState<Record<string, boolean>>({});

  /* kuzatuv posti roli — `staff` yo'q (yuqoridagi izohga qarang). */
  const role: NvrPersonRole | null =
    personType === "teacher" ? "teacher" : personType === "student" ? "student" : null;

  /** Davr BIR KUNMI — grafik shunga qarab kunlik yoki soatlik bo'ladi. */
  const singleDay = period.from === period.to;
  const range = useNvrAttendanceRange(period.from, period.to);
  const rowsQ = useNvrAttendanceRows(period.from, period.to, role ?? undefined);
  /* Oxirgi kun — "bugungi holat" nishonchasi va dam olish kuni izohi uchun. */
  const lastDay = useNvrAttendance(period.to);

  /** Toifalar taqqoslashi — uchala ustun (xodim doim nol). */
  const byType = useMemo(
    () =>
      [
        {
          id: "student" as PersonType,
          label: student.plural,
          s: range.totals.student,
          color: "#34D399",
        },
        {
          id: "teacher" as PersonType,
          label: t.stats.people.typeTeacher,
          s: range.totals.teacher,
          color: "#85E0FF",
        },
        { id: "staff" as PersonType, label: t.stats.people.typeStaff, s: range.totals.staff, color: "#F59E0B" },
      ].map((r) => ({
        ...r,
        present: r.s.present,
        late: r.s.late,
        absent: r.s.absent,
        total: r.s.total,
        rate: r.s.total > 0 ? Math.round((r.s.present / r.s.total) * 100) : 0,
      })),
    [range.totals, student.plural, t.stats.people.typeTeacher, t.stats.people.typeStaff]
  );

  /* ⚠️ **KPI qatori — DOIM BUGUN, davr YIG'INDISI EMAS** (2026-09-08,
     foydalanuvchi so'rovi). Ilgari `range.totals[personType]` — davr
     tanlovi standarti "Hafta"ga o'zgargach (yuqoridagi "Statistika
     sarlavhasi" bo'limiga qarang) bu yerda "Kelmaganlar 2 584" kabi
     son chiqardi: bir odam 7 kunda bir necha marta sanaladi, ya'ni son
     hech qanday haqiqiy holatni anglatmaydi. `lastDay` ALLAQACHON shu
     maqsadda so'ralgan edi ("bugungi holat" nishonchasi uchun) —
     `period.to` doim BUGUN (`useStatPeriod`), qo'shimcha so'rov kerak
     emas. Kunma-kun diagramma (`dailySeries`) va toifalar taqqoslashi
     (`byType`) esa `range.totals`da PERIOD-BOG'LIQ qolaveradi — bu
     ularning haqiqiy vazifasi. */
  const own = useMemo(() => lastDay.byRole[role ?? "staff"], [role, lastDay.byRole]);

  /**
   * KUNMA-KUN qatorlar — chiziqli diagramma uchun.
   *
   * Har kunning O'Z jamlanmasi olinadi (davr yig'indisi EMAS): 30 kunlik
   * "Kelmagan 9 012" hech narsani anglatmaydi, "3-sentabrda 177 kelmagan"
   * esa aniq fakt. Foiz ham SHU KUNGA nisbatan — tooltip'da ko'rinadi.
   *
   * ⚠️ **`range.workPoints`, `range.points` EMAS** (2026-09-09,
   * foydalanuvchi so'rovi: "yakshanba kunlaridagi statistikani
   * qo'shmaslik kerak"). Dam olish kunida hamma "waiting" bo'lib turadi
   * (`s.total` baribir to'liq ro'yxat, `present`/`late`/`absent` esa 0),
   * ya'ni xom `range.points` bilan chizilsa har yakshanba uchala chiziq
   * ham 0'ga tushib, haqiqiy tendensiyani buzardi.
   */
  const dailySeries = useMemo(() => {
    return range.workPoints
      .map((p) => {
        const s = personType === "teacher" ? p.teacher : personType === "student" ? p.student : null;
        if (!s || s.total === 0) return null;
        const pctOf = (v: number) => Math.round((v / s.total) * 100);
        return {
          day: p.date.slice(5),
          Kelgan: s.present,
          Kechikkan: s.late,
          Kelmagan: s.absent,
          /* Tooltip foizlari — `name` bilan bir xil kalitda bo'lsa
             recharts ularni ALOHIDA qator qilib chizardi, shuning uchun
             yashirin maydonlar sifatida saqlanadi va sarlavhada
             ko'rsatiladi. */
          rate: pctOf(s.present),
          latePct: pctOf(s.late),
          absentPct: pctOf(s.absent),
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);
  }, [range.workPoints, personType]);

  /**
   * 🔵 **"BUGUN" TANLANSA — SOAT KESIMI** (2026-09-14, foydalanuvchi
   * so'rovi: "bugun kun uchun bosilganda soat kesimida o'zgarishi
   * kerak").
   *
   * ⚠️ Bir kunlik davrda kunma-kun chiziq BITTA nuqtadan iborat bo'lib
   * qolardi — grafik sifatida ma'nosiz (`StatPeriodPanel` va
   * `StatDensity` da ham AYNI qoida: bir kun → soat kesimi).
   *
   * ⚠️ **"Kelmagan" SOATGA BO'LINMAYDI** va bu ataylab: kelmagan odamning
   * kelish SOATI yo'q (u umuman kelmagan). Shuning uchun soatlik
   * ko'rinishda faqat ikki chiziq bo'ladi, kelmaganlar soni esa panel
   * sarlavhasida (izohda) ko'rsatiladi — jim tashlab ketilmaydi.
   *
   * Manba — `rowsQ.byHour` ("Kelish soatlari" paneli bilan AYNI kesh,
   * qo'shimcha so'rov YO'Q): har soatda nechta odam kelgan, `early`/
   * `late` bo'yicha ajratilgan.
   */
  const hourlySeries = useMemo(() => {
    if (!singleDay) return [];
    return rowsQ.byHour
      .filter((b) => b.total > 0)
      .map((b) => ({
        day: `${String(b.hour).padStart(2, "0")}:00`,
        Kelgan: b.total,
        Kechikkan: b.late,
      }));
  }, [rowsQ.byHour, singleDay]);

  /**
   * Sinflar kesimi — **KARTOCHKADA BUGUNGI HOLAT** (2026-09-14,
   * foydalanuvchi so'rovi: "sinf kesimi uchun faqat bugungilik kelgan
   * ketganlar chiqishi kerak, qolgani davomat foizini o'zi chiqadi").
   *
   * ⚠️ Ilgari kartochkada DAVR yig'indisi turardi ("38 kun-shaxs",
   * "13 kelgan 3 kechikkan 22 kelmagan") — bir odam 7 kunda 7 marta
   * sanalgani uchun bu sonlar "sinfda nechta o'quvchi keldi" degan
   * savolga javob bermasdi. Endi:
   *   · **bugun** — `lastDay.rows` (SHAXSLAR soni, kun-shaxs emas);
   *   · **davr foizi** — `rowsQ.people` dan, chuqurlashuvda ko'rsatiladi.
   */
  const classes = useMemo<ClassRow[]>(() => {
    const m = new Map<string, ClassRow>();
    for (const r of lastDay.rows) {
      if (role && r.role !== role) continue;
      const key = r.note || r.role_label || "—";
      const c =
        m.get(key) ??
        ({ klass: key, total: 0, early: 0, late: 0, absent: 0, waiting: 0, present: 0, rate: 0, periodRate: null } as ClassRow);
      c.total++;
      if (r.status === "early") c.early++;
      else if (r.status === "late") c.late++;
      else if (r.status === "absent") c.absent++;
      else c.waiting++;
      m.set(key, c);
    }
    /* Davr foizi — kun × shaxs bo'yicha (`PersonPeriodRow.days`/`present`). */
    const per = new Map<string, { days: number; present: number }>();
    for (const p of rowsQ.people) {
      const key = p.klass || "—";
      const v = per.get(key) ?? { days: 0, present: 0 };
      v.days += p.days;
      v.present += p.present;
      per.set(key, v);
    }
    return Array.from(m.values()).map((c) => {
      const present = c.early + c.late;
      const pv = per.get(c.klass);
      return {
        ...c,
        present,
        rate: c.total > 0 ? Math.round((present / c.total) * 100) : 0,
        periodRate: pv && pv.days > 0 ? Math.round((pv.present / pv.days) * 100) : null,
      };
    });
  }, [lastDay.rows, rowsQ.people, role]);

  /** Grafik ma'lumoti — bir kunda SOATLIK, uzun davrda KUNLIK. */
  const chartData = singleDay ? hourlySeries : dailySeries;
  /** Bir kunlik ko'rinishda kelmaganlar soni — sarlavhada ko'rsatiladi. */
  const dayAbsent = singleDay ? (lastDay.byRole[role ?? "staff"]?.absent ?? 0) : 0;

  /** Jadval qatorlari — qidiruv + saralash. */
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rowsQ.people.filter(
      (p) => !q || `${p.full_name} ${p.klass}`.toLowerCase().includes(q)
    );
    const mul = dir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      switch (sort) {
        case "klass":
          return mul * a.klass.localeCompare(b.klass, "uz");
        case "rate":
          return mul * (a.rate - b.rate);
        case "late":
          return mul * (a.late - b.late);
        case "absent":
          return mul * (a.absent - b.absent);
        case "time":
          return mul * (a.avgTime ?? "99:99").localeCompare(b.avgTime ?? "99:99");
        default:
          return mul * a.full_name.localeCompare(b.full_name, "uz");
      }
    });
  }, [rowsQ.people, query, sort, dir]);

  /* ⚠️ Qatorlar JADVALI sahifadan olib tashlangan — sahifalash
     (`totalPages`/`pageRows`) va ustun saralash tugmalari (`onSort`)
     ham shu bilan kerak emas. Saralash MANTIG'I (`sort`/`dir`) qoladi:
     tanlangan shaxs ro'yxatning boshidan topiladi. */
  const selected = useMemo(() => rows.find((p) => p.person_id === selectedId) ?? null, [rows, selectedId]);


  /* ── XODIM: kuzatuv posti bu toifani bilmaydi ── */
  if (role === null) {
    return (
      <StatPanel title={t.stats.people.typeStaff} hint={t.dashboard.ui.noSource}>
        <div className="grid place-items-center py-14 text-center">
          <div className="max-w-[460px]">
            <p className="text-[13px] font-semibold text-slate-200">{t.missing.blockTitle}</p>
            <p className="mt-1.5 text-[11.5px] leading-snug text-slate-500">{t.dashboard.ui.att.staffMissing}</p>
          </div>
        </div>
      </StatPanel>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* ── KPI: DOIM BUGUN (yuqoridagi izohga qarang) ── */}
      <p className="flex-none text-[9.5px] uppercase tracking-wider text-ice-cyan/50">Bugungi holat</p>
      <div className="-mt-1.5 grid grid-cols-2 gap-2 md:grid-cols-4">
        <KpiTile
          Icon={CheckCircle}
          label="Kelganlar"
          value={n(own.present)}
          hint={`${own.total > 0 ? Math.round((own.present / own.total) * 100) : 0}% davomat`}
          tone="#34D399"
        />
        <KpiTile
          Icon={Clock}
          label="Kechikkanlar"
          value={n(own.late)}
          hint={lastDay.settings ? `${lastDay.settings.arrival_deadline} dan keyin` : "—"}
          tone="#F59E0B"
        />
        <KpiTile
          Icon={Prohibit}
          label="Kelmaganlar"
          value={n(own.absent)}
          hint={lastDay.settings ? `${lastDay.settings.absent_after} gacha ko'rinmagan` : "—"}
          tone="#FB7185"
        />
        <KpiTile
          Icon={UsersThree}
          label="Jami"
          value={n(own.total)}
          hint={period.to}
          tone="#85E0FF"
        />
      </div>

      {/* ── 1. Kelganlar / Kechikkanlar / Kelmaganlar — KUNMA-KUN ──
          ⚠️ **USTUNLI DIAGRAMMA CHIZIQLARGA ALMASHTIRILDI** (2026-09-04).
          Ilgari bu uchala toifani yonma-yon TAQQOSLAYDIGAN yig'ma ustun
          edi va u ikki jihatdan yaroqsiz chiqardi:
            1. **davr yig'indisi** ko'rsatilardi — 30 kunda "Kelmagan
               9 012" degan son chiqib, u hech narsani anglatmasdi
               (bir odam 30 marta sanalgan);
            2. **masshtab buzilardi** — 361 o'quvchi va 36 o'qituvchi
               bitta o'qda: o'qituvchi ustuni deyarli ko'rinmasdi.
          Endi grafik JORIY TOIFANING kunma-kun dinamikasini beradi —
          "Davomat dinamikasi" paneli bilan AYNI naqsh: yorliq bosilsa
          chiziq yakka qoladi, tooltip'da son ham, FOIZ ham. */}
      <StatPanel
        title="Kelganlar / Kechikkanlar / Kelmaganlar"
        hint={
          singleDay
            ? `${period.to} — soat kesimi${dayAbsent > 0 ? ` · ${n(dayAbsent)} kelmagan` : ""}`
            : `${period.from} … ${period.to} · ${range.days.length} kun`
        }
        right={
          <div className="flex flex-wrap gap-1">
            {byType.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => onSelectType?.(r.id)}
                disabled={!onSelectType}
                title={`${r.label}: ${n(r.total)} kun-shaxs yozuvi`}
                className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold transition-colors disabled:cursor-default ${
                  r.id === personType
                    ? "border-ice/40 bg-ice/15 text-ice-bright"
                    : "border-white/10 bg-white/[0.03] text-slate-400 hover:text-slate-200"
                }`}
              >
                {r.label} {r.total > 0 ? `${r.rate}%` : "—"}
              </button>
            ))}
          </div>
        }
      >
        {chartData.length === 0 ? (
          <p className="py-12 text-center text-[11.5px] text-slate-500">
            {singleDay ? "Bu kunda hali kelish qaydi yo'q" : "Bu davrda davomat yozuvi yo'q"}
          </p>
        ) : (
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 6, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
                <XAxis dataKey="day" tick={AXIS} tickLine={false} axisLine={false} />
                <YAxis width={Y_AXIS_W} tick={AXIS} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={TOOLTIP} cursor={{ stroke: "rgba(148,163,184,0.25)" }} />
                {/* ⚠️ Yorliq BOSILADI — chiziq yakka qoladi. Yashirilgan
                    chiziq `map` dan CHIQARIB TASHLANMAYDI, `hide` bilan
                    yashiriladi: aks holda ranglar bir-biriga surilib
                    ketardi ("Davomat dinamikasi" bilan ayni tuzoq). */}
                <Legend
                  verticalAlign="top"
                  height={26}
                  iconType="plainline"
                  wrapperStyle={{ fontSize: 11, cursor: "pointer" }}
                  onClick={(e: unknown) => {
                    const key = (e as { dataKey?: string })?.dataKey;
                    if (key) setHidden((h) => ({ ...h, [key]: !h[key] }));
                  }}
                />
                {/* Soat kesimida "Kelmagan" chizig'i YO'Q — kelmagan
                    odamning soati yo'q (yuqoridagi izoh). */}
                {(singleDay ? LINES.filter((l) => l.key !== "Kelmagan") : LINES).map((l) => (
                  <Line
                    key={l.key}
                    type="monotone"
                    dataKey={l.key}
                    name={l.label}
                    stroke={l.color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    hide={!!hidden[l.key]}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        <p className="mt-1 text-[10px] leading-snug text-slate-500">
          {singleDay
            ? "Bir kun tanlanganda grafik SOAT kesimiga o'tadi — kelmaganlar bu yerda ko'rsatilmaydi, chunki ularning kelish soati yo'q (soni sarlavhada)."
            : "Yuqoridagi yorliqni bosib chiziqni yashirish/ko'rsatish mumkin."}{" "}
          O&apos;ng burchakdagi toifa tugmalari o&apos;sha toifa tabiga o&apos;tkazadi.
          {range.totals.staff.total === 0 && " Xodimlar — kuzatuv postida bu toifa yo'q."}
        </p>
      </StatPanel>

      <div className="grid gap-3 xl:grid-cols-2">
        {/* ── 2. Kelish soatlari ── */}
        <StatPanel
          title="Kelish soatlari"
          hint={rowsQ.trimmedDays > 0 ? `oxirgi ${rowsQ.days.length} kun` : "har soatda nechta odam kelgan"}
        >
          {rowsQ.byHour.every((h) => h.total === 0) ? (
            <p className="py-12 text-center text-[11.5px] text-slate-500">
              {lastDay.isWeekend ? "Bu kun dam olish kuni" : "Bu davrda kelish qaydi yo'q"}
            </p>
          ) : (
            <div className="h-[210px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={rowsQ.byHour.filter((h) => h.hour >= 5 && h.hour <= 22)}
                  margin={{ top: 6, right: 8, bottom: 0, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" vertical={false} />
                  <XAxis dataKey="hour" tick={AXIS} tickLine={false} axisLine={false} tickFormatter={(h) => `${h}:00`} />
                  <YAxis width={Y_AXIS_W} tick={AXIS} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={TOOLTIP} cursor={{ fill: "rgba(148,163,184,0.06)" }} labelFormatter={(h) => `${h}:00`} />
                  <Bar dataKey="early" name="Erta" stackId="h" fill="#34D399" />
                  <Bar dataKey="late" name="Kech" stackId="h" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {/* ⚠️ Chiqish yo'q — sababi OCHIQ yoziladi, jim qoldirilmaydi. */}
          <p className="mt-1 text-[10px] leading-snug text-slate-500">
            Faqat <b>kirish</b>: odam BIRINCHI marta ko&apos;ringan soat. Chiqish vaqti
            ko&apos;rsatilmaydi — kirish va chiqishni ajratadigan alohida kamera yo&apos;q.
          </p>
        </StatPanel>

        {/* ── 3. Sinflar kesimi — BUGUNGI holat + chuqurlashuv ── */}
        <ClassBreakdown
          classes={classes}
          todayRows={lastDay.rows}
          people={rowsQ.people}
          role={role}
          periodLabel={period.label}
          isWeekend={lastDay.isWeekend}
          n={n}
          onPickPerson={setPersonPanelId}
        />
      </div>

      {/* ── 4. Kun kesimi — har bir shaxs ── */}
    

      {/* ── 5. Tanlangan shaxs ── */}
      {selected && (
        <StatPanel
          title="Tanlangan shaxs"
          hint={`${selected.full_name}${selected.klass ? ` · ${selected.klass}` : ""}`}
          right={
            selected.lastEventId ? (
              <button
                type="button"
                onClick={() => setOpenEvent(selected.lastEventId)}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 hover:bg-white/[0.08]"
              >
                Oxirgi kadrni ochish
              </button>
            ) : undefined
          }
        >
          <PersonDetail p={selected} n={n} />
        </StatPanel>
      )}

      {openEvent != null && <EventDossier eventId={openEvent} onClose={() => setOpenEvent(null)} />}
      {/* Sinf ro'yxatidan tanlangan shaxs — to'liq shaxs paneli. */}
      {personPanelId != null && (
        <FaceHistoryModal personId={personPanelId} onClose={() => setPersonPanelId(null)} />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   SINFLAR KESIMI — kartochkalar (BUGUN) → sinf ro'yxati → shaxs paneli
   ══════════════════════════════════════════════════════════════════════

   🔵 **2026-09-14, foydalanuvchi so'rovi.** Uch talab:
     1. kartochkada FAQAT bugungi kelgan/kelmagan (davr yig'indisi emas —
        bir odam 7 kunda 7 marta sanalardi);
     2. sinflarni SARALASH: katta/kichik (ro'yxat hajmi), yaxshi/yomon
        (davomat foizi);
     3. sinf bosilsa — o'sha sinfning BUGUNGI ro'yxati, har bir shaxsning
        davr foizi bilan; shaxs bosilsa — to'liq SHAXS PANELI.

   ⚠️ **Qo'shimcha so'rov YO'Q.** Bugungi holat `useNvrAttendance(period.to)`
   dan (KPI qatori bilan AYNI kesh), davr foizi esa `useNvrAttendanceRows`
   dan (soatlik panel bilan AYNI kesh) — ikkalasi ham allaqachon
   so'ralgan.
*/
function ClassBreakdown({
  classes,
  todayRows,
  people,
  role,
  periodLabel,
  isWeekend,
  n,
  onPickPerson,
}: {
  classes: ClassRow[];
  todayRows: NvrAttendanceRow[];
  people: PersonPeriodRow[];
  role: NvrPersonRole | null;
  periodLabel: string;
  isWeekend: boolean;
  n: (v: number) => string;
  onPickPerson: (personId: number) => void;
}) {
  /* Saralash tugmalari matni — davomat taxtasi bilan AYNI kalitlar. */
  const u = useT().dashboard.ui.att;
  /**
   * 🔵 **TO'LIQ EKRAN** (2026-09-14, foydalanuvchi so'rovi: "sinflar
   * kesimini katta ekranga qilish imkoni bo'lsin"). Panel o'z joyida
   * tor ustunda turadi; bu tugma uni butun ekranga ochadi — sinf
   * kartochkalari va ro'yxat bemalol joylashadi.
   */
  const [full, setFull] = useState(false);
  /* ⚠️ To'liq ekranda `Esc` yopadi — modal odatiga mos. */
  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFull(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [full]);
  /** Ro'yxat / kartochka — loyihaning UMUMIY almashtirgichi. */
  const [view, setView] = useViewMode("stat-class-roster");
  const [sort, setSort] = useState<ClassSort>("class-asc");
  /** "Davomat" saralashi yo'nalishi — tugma qayta bosilsa teskari. */
  const [rateDesc, setRateDesc] = useState(true);
  /** Sinf ichidagi ro'yxat tartibi: holat bo'yicha yoki DAVOMAT foizi. */
  const [rosterSort, setRosterSort] = useState<"status" | "rate">("status");
  const [rosterDesc, setRosterDesc] = useState(true);
  const [open, setOpen] = useState<string | null>(null);

  const sorted = useMemo(() => {
    const list = [...classes];
    /* ⚠️ `classOrder` — MATN emas, bosh RAQAM bo'yicha: oddiy alifboda
       "10-A" "2-B" dan oldin kelardi (`FaceDatabasePage.tsx`). */
    if (sort === "rate") {
      return list.sort(
        (a, b) => (rateDesc ? b.rate - a.rate : a.rate - b.rate) || classOrder(a.klass) - classOrder(b.klass)
      );
    }
    const mul = sort === "class-desc" ? -1 : 1;
    return list.sort((a, b) => mul * (classOrder(a.klass) - classOrder(b.klass)));
  }, [classes, sort, rateDesc]);

  /**
   * Ochilgan sinfning BUGUNGI ro'yxati + har kimning DAVR foizi.
   *
   * 🔵 **DAVOMAT BO'YICHA SARALASH** (2026-09-14, foydalanuvchi so'rovi:
   * "eng yaxshi davomatdagi o'quvchini birinchiga yoki teskarisini").
   * Foiz — DAVR bo'yicha (`PersonPeriodRow.rate`), ya'ni "bugun kelgan-
   * kelmagan" emas, "shu davrda necha foiz kun kelgan". Qaydi bo'lmagan
   * shaxs (`period` yo'q) DOIM oxirida turadi — uni 0% deb ko'rsatish
   * "hech qachon kelmagan" degan yolg'on xulosa bo'lardi.
   */
  const roster = useMemo(() => {
    if (!open) return [];
    const byPerson = new Map(people.map((p) => [p.person_id, p]));
    const ORDER: Record<NvrAttendanceStatus, number> = { early: 0, late: 1, absent: 2, waiting: 3 };
    const list = todayRows
      .filter((r) => (role ? r.role === role : true) && (r.note || r.role_label || "—") === open)
      .map((r) => ({ r, period: byPerson.get(r.person_id) ?? null }));
    if (rosterSort === "rate") {
      return list.sort((a, b) => {
        const ar = a.period && a.period.days > 0 ? a.period.rate : null;
        const br = b.period && b.period.days > 0 ? b.period.rate : null;
        if (ar == null || br == null) return (ar == null ? 1 : 0) - (br == null ? 1 : 0);
        return (rosterDesc ? br - ar : ar - br) || a.r.full_name.localeCompare(b.r.full_name, "uz");
      });
    }
    return list.sort(
      (a, b) => ORDER[a.r.status] - ORDER[b.r.status] || a.r.full_name.localeCompare(b.r.full_name, "uz")
    );
  }, [open, todayRows, people, role, rosterSort, rosterDesc]);

  /** Ochilgan sinfning BUGUNGI kesimi — uchala son ham ko'rinadi. */
  const rosterCounts = useMemo(() => {
    const c = { early: 0, late: 0, absent: 0, waiting: 0 };
    for (const { r } of roster) {
      if (r.status === "early") c.early++;
      else if (r.status === "late") c.late++;
      else if (r.status === "absent") c.absent++;
      else c.waiting++;
    }
    return c;
  }, [roster]);

  const cur = open ? classes.find((c) => c.klass === open) ?? null : null;

  const panel = (
    <StatPanel
      title="Sinflar kesimi"
      hint={open ? `${open} · bugungi ro'yxat` : `${n(classes.length)} ta guruh · bugun`}
      right={
        open ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setOpen(null)}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-semibold text-slate-300 hover:bg-white/[0.08]"
            >
              ◀ Sinflar
            </button>
            <ViewToggle mode={view} onChange={setView} />
            <FullBtn full={full} onClick={() => setFull((v) => !v)} />
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-1">
            <SortBtn active={sort === "class-asc"} onClick={() => setSort("class-asc")} title={u.sortAsc}>
              {u.classUp}
            </SortBtn>
            <SortBtn active={sort === "class-desc"} onClick={() => setSort("class-desc")} title={u.sortDesc}>
              {u.classDown}
            </SortBtn>
            {/* "Davomat" QAYTA bosilsa yo'nalish teskari bo'ladi. */}
            <SortBtn
              active={sort === "rate"}
              title={u.sortRate}
              onClick={() => {
                if (sort === "rate") setRateDesc((v) => !v);
                else setSort("rate");
              }}
            >
              {u.rate} {sort === "rate" ? (rateDesc ? "↓" : "↑") : ""}
            </SortBtn>
            <FullBtn full={full} onClick={() => setFull((v) => !v)} />
          </div>
        )
      }
    >
      {classes.length === 0 ? (
        <p className="py-12 text-center text-[11.5px] text-slate-500">
          {isWeekend ? "Dam olish kuni — davomat hisoblanmaydi" : "Bugun uchun davomat yozuvi yo'q"}
        </p>
      ) : open && cur ? (
        /* ── SINF ICHIDA: bugungi ro'yxat ── */
        <div className="flex min-h-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
            <span className="text-[13px] font-bold text-white">{cur.klass}</span>
            <span className={`font-mono text-[15px] font-extrabold ${rateTone(cur.rate)}`}>{cur.rate}%</span>
            <span className="text-[10px] text-slate-500">bugun</span>
            {cur.periodRate != null && (
              <>
                <span className="text-white/10">·</span>
                <span className={`font-mono text-[13px] font-bold ${rateTone(cur.periodRate)}`}>{cur.periodRate}%</span>
                <span className="text-[10px] text-slate-500">{periodLabel.toLowerCase()}</span>
              </>
            )}
            {/* Uchala son ham — davomat taxtasidagi kabi. */}
            <span className="ml-auto flex flex-wrap items-center gap-x-2 text-[10px]">
              <span className="text-emerald-300">{n(rosterCounts.early)} kelgan</span>
              <span className="text-amber-300">{n(rosterCounts.late)} kechikkan</span>
              <span className="text-rose-300">{n(rosterCounts.absent)} kelmagan</span>
              <span className="text-slate-500">{n(cur.total)} ta</span>
            </span>
          </div>

          {/* Ro'yxat tartibi — holat yoki DAVOMAT foizi (ikki yo'nalish). */}
          <div className="flex flex-wrap items-center gap-1">
            <SortBtn active={rosterSort === "status"} onClick={() => setRosterSort("status")} title="Holat bo'yicha: kelgan → kechikkan → kelmagan">
              Holat
            </SortBtn>
            <SortBtn
              active={rosterSort === "rate"}
              title="Davr davomat foizi bo'yicha"
              onClick={() => {
                if (rosterSort === "rate") setRosterDesc((v) => !v);
                else setRosterSort("rate");
              }}
            >
              {u.rate} {rosterSort === "rate" ? (rosterDesc ? "↓" : "↑") : ""}
            </SortBtn>
          </div>

          {/* KARTOCHKA ko'rinishi — rasm katta, davomat foizi ostida. */}
          {view === "card" ? (
            <div
              className={`grid gap-2 overflow-y-auto pr-0.5 ${
                full ? "max-h-[calc(100vh-330px)] grid-cols-4 md:grid-cols-6 xl:grid-cols-8" : "max-h-[210px] grid-cols-3 sm:grid-cols-4"
              }`}
            >
              {roster.map(({ r, period }) => {
                const st = STATUS_TEXT[r.status];
                return (
                  <button
                    key={r.person_id}
                    type="button"
                    onClick={() => onPickPerson(r.person_id)}
                    title="Shaxs panelini ochish"
                    className="flex flex-col items-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.02] p-2 text-center transition-colors hover:border-ice/30 hover:bg-ice/[0.06]"
                  >
                    <LibraryPhoto
                      personId={r.person_id}
                      name={r.full_name}
                      size={0}
                      className="aspect-[3/4] w-full rounded-md object-cover ring-1 ring-white/10"
                    />
                    <span className="line-clamp-2 min-h-[26px] text-[10.5px] font-semibold leading-tight text-slate-100">
                      {r.full_name}
                    </span>
                    <span className={`w-full truncate rounded-md border px-1 py-0.5 text-[9px] font-semibold ${st.cls}`}>
                      {st.label}
                    </span>
                    <span className="flex w-full items-center justify-between text-[9.5px]">
                      <span className="font-mono text-slate-400">{r.time || "—"}</span>
                      {period && period.days > 0 && (
                        <span className={`font-mono ${rateTone(period.rate)}`}>{period.rate}%</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
          <div className={`overflow-y-auto pr-0.5 ${full ? "max-h-[calc(100vh-330px)]" : "max-h-[210px]"}`}>
            <ul className="flex flex-col gap-1">
              {roster.map(({ r, period }) => {
                const st = STATUS_TEXT[r.status];
                return (
                  <li key={r.person_id}>
                    <button
                      type="button"
                      onClick={() => onPickPerson(r.person_id)}
                      title="Shaxs panelini ochish"
                      className="flex w-full items-center gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-left transition-colors hover:border-ice/30 hover:bg-ice/[0.06]"
                    >
                      <LibraryPhoto
                        personId={r.person_id}
                        name={r.full_name}
                        size={28}
                        className="h-7 w-7 flex-none rounded-md object-cover ring-1 ring-white/10"
                      />
                      <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-slate-100">{r.full_name}</span>
                      {/* Davr foizi — "3 kun / hafta" tanlovi sahifaning
                          yuqorisidagi davr qatoridan keladi. */}
                      {period && period.days > 0 && (
                        <span className={`flex-none font-mono text-[10.5px] ${rateTone(period.rate)}`}>{period.rate}%</span>
                      )}
                      <span className="flex-none font-mono text-[10.5px] text-slate-400">{r.time || "—"}</span>
                      <span className={`flex-none rounded-md border px-1.5 py-0.5 text-[9.5px] font-semibold ${st.cls}`}>
                        {st.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          )}
        </div>
      ) : (
        /* ── KARTOCHKALAR: BUGUNGI holat ── */
        <div
          className={`grid gap-2 overflow-y-auto pr-0.5 ${
            full ? "max-h-[calc(100vh-260px)] grid-cols-3 md:grid-cols-4 xl:grid-cols-6" : "max-h-[248px] grid-cols-2 sm:grid-cols-3"
          }`}
        >
          {sorted.map((c) => (
            <button
              key={c.klass}
              type="button"
              onClick={() => setOpen(c.klass)}
              title={`${c.klass} — bugungi ro'yxat`}
              className="group flex flex-col gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-3 text-left transition-colors hover:border-ice/30 hover:bg-ice/[0.06]"
            >
              <span className="flex w-full items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-[15px] font-bold text-white">{c.klass}</span>
                <span className="flex-none text-[9.5px] text-slate-500">{n(c.total)} ta</span>
              </span>
              <span className={`font-mono text-[26px] font-extrabold leading-none ${rateTone(c.rate)}`}>{c.rate}%</span>
              {/* FAQAT bugungi kelgan/kelmagan — davr yig'indisi EMAS. */}
              {/* Uchala son ham — davomat taxtasining sinf kartochkasi
                  bilan AYNI (`AttendanceListModal`). */}
              <span className="flex flex-wrap items-center gap-x-2 text-[9.5px]">
                <span className="text-emerald-300">{n(c.early + c.late)} kelgan</span>
                <span className="text-amber-300">{n(c.late)} kechikkan</span>
                <span className="text-rose-300">{n(c.absent)} kelmagan</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </StatPanel>
  );

  /* ⚠️ To'liq ekranda panel `document.body` ga PORTAL bilan chiqadi:
     sahifa o'ramlarida `backdrop-filter` bor va u `position: fixed`
     uchun yangi containing block yaratadi — portalsiz "to'liq ekran"
     faqat ustun ichida ochilardi (CLAUDE.md, `CamerasPage` bilan AYNI
     tuzoq). Fonni bosish yopadi, `Esc` ham. */
  if (!full || typeof document === "undefined") return panel;
  return createPortal(
    <div
      className="fixed inset-0 z-[88] flex flex-col bg-[#03060E]/92 p-4 backdrop-blur-md"
      onClick={() => setFull(false)}
    >
      <div className="flex min-h-0 flex-1 flex-col" onClick={(e) => e.stopPropagation()}>
        {panel}
      </div>
    </div>,
    document.body
  );
}

/** To'liq ekran tugmasi — panelni butun ekranga ochadi/yopadi. */
function FullBtn({ full, onClick }: { full: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={full ? "Oddiy ko'rinish (Esc)" : "To'liq ekran"}
      className="grid h-[26px] w-[26px] place-items-center rounded-lg border border-white/10 bg-white/[0.03] text-slate-400 transition-colors hover:text-ice-bright"
    >
      {full ? <CornersIn size={13} weight="bold" /> : <CornersOut size={13} weight="bold" />}
    </button>
  );
}

/** Tanlangan shaxsning kunma-kun holati. */
function PersonDetail({ p, n }: { p: PersonPeriodRow; n: (v: number) => string }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <LibraryPhoto
          personId={p.person_id}
          name={p.full_name}
          size={56}
          className="h-14 w-14 rounded-lg object-cover ring-1 ring-ice/25"
        />
        <div className="min-w-0">
          <p className="truncate text-[14px] font-bold text-slate-100">{p.full_name}</p>
          <p className="text-[11px] text-slate-400">
            {p.role_label}
            {p.klass ? ` · ${p.klass}` : ""}
          </p>
        </div>
        <div className="ml-auto grid grid-cols-4 gap-1.5 text-center">
          <Mini label="Kelgan" value={n(p.present)} cls="text-emerald-300" />
          <Mini label="Kechikkan" value={n(p.late)} cls="text-amber-300" />
          <Mini label="Kelmagan" value={n(p.absent)} cls="text-rose-300" />
          <Mini label="Davomat" value={`${p.rate}%`} cls={rateTone(p.rate)} />
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-[9.5px] font-bold uppercase tracking-wide text-slate-500">
          Kunlar ({n(p.byDay.length)}) · o&apos;rtacha kelish {p.avgTime ?? "—"}
        </p>
        <div className="flex flex-wrap gap-1">
          {p.byDay.map((d) => (
            <span
              key={d.date}
              title={`${d.date}${d.time ? ` · ${d.time}` : ""} — ${STATUS_TEXT[d.status].label}`}
              className={`rounded-md border px-1.5 py-0.5 font-mono text-[9.5px] ${STATUS_TEXT[d.status].cls}`}
            >
              {d.date.slice(5)}
              {d.time ? ` ${d.time}` : ""}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Mini({ label, value, cls }: { label: string; value: string; cls: string }) {
  return (
    <div className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-2 py-1">
      <p className={`font-mono text-[13px] font-bold ${cls}`}>{value}</p>
      <p className="text-[8.5px] text-slate-500">{label}</p>
    </div>
  );
}

/** Saralash tugmasi — sinf kartochkalari va sinf ro'yxati uchun umumiy. */
function SortBtn({
  active,
  title,
  onClick,
  children,
}: {
  active: boolean;
  title?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`rounded-lg border px-2 py-1 text-[10.5px] font-semibold transition-colors ${
        active
          ? "border-ice/40 bg-ice/10 text-ice-bright"
          : "border-white/10 bg-white/[0.03] text-slate-400 hover:text-slate-200"
      }`}
    >
      {children}
    </button>
  );
}
