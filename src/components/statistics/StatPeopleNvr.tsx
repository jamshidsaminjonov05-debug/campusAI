"use client";

import { useMemo, useState } from "react";
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
import { CheckCircle, Clock, Prohibit, UsersThree } from "@phosphor-icons/react";
import type { PersonType } from "@/lib/api";
import type { StatPeriod } from "@/hooks/useStatPeriod";
import {
  useNvrAttendance,
  useNvrAttendanceRange,
  useNvrAttendanceRows,
  type PersonPeriodRow,
} from "@/hooks/useNvrAttendance";
import { LibraryPhoto } from "@/components/people/FaceDatabasePage";
import { EventDossier } from "@/components/detections/EventDossier";
import type { NvrAttendanceStatus, NvrPersonRole } from "@/lib/nvrApi";
import { AXIS, KpiTile, StatPanel, TOOLTIP, fmt, rateTone, Y_AXIS_W } from "@/components/common/panels";
import { useT } from "@/i18n";
import { useStudentLabel } from "@/hooks/useStudentLabel";

const STATUS_TEXT: Record<NvrAttendanceStatus, { label: string; cls: string }> = {
  early: { label: "Erta keldi", cls: "border-emerald-400/25 bg-emerald-400/12 text-emerald-300" },
  late: { label: "Kech qoldi", cls: "border-amber-400/25 bg-amber-400/12 text-amber-300" },
  absent: { label: "Kelmadi", cls: "border-rose-400/25 bg-rose-500/12 text-rose-300" },
  waiting: { label: "Kutilmoqda", cls: "border-white/10 bg-white/[0.05] text-slate-400" },
};

type SortKey = "name" | "klass" | "rate" | "late" | "absent" | "time";

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
  /* Sinf kartochkalari matni — davomat taxtasi bilan AYNI lug'at kaliti
     (kelgan/kechikkan/kelmagan), ya'ni so'z ikki joyda farq qilmaydi. */
  const u = t.dashboard.ui.att;
  /* "O'quvchi" ↔ "Talaba" — muassasa turiga qarab (`useStudentLabel`). */
  const student = useStudentLabel();

  /* ⚠️ Saralash QAT'IY (ism bo'yicha, o'sish tartibida) — ustun
     tugmalari bo'lgan jadval sahifadan olib tashlangan. Mantiq
     saqlanadi: "Tanlangan shaxs" paneli ro'yxatdan topib oladi. */
  const sort = "name" as SortKey;
  const dir = "asc" as "asc" | "desc";
  const [selectedId] = useState<number | null>(null);
  const [openEvent, setOpenEvent] = useState<number | null>(null);
  /** Yorliq bosilganda yashiriladigan chiziqlar. */
  const [hidden, setHidden] = useState<Record<string, boolean>>({});

  /* kuzatuv posti roli — `staff` yo'q (yuqoridagi izohga qarang). */
  const role: NvrPersonRole | null =
    personType === "teacher" ? "teacher" : personType === "student" ? "student" : null;

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

  /** Sinflar kesimi — QATORLARDAN (`note`), qo'lda ro'yxat yozilmaydi. */
  const classes = useMemo(() => {
    const m = new Map<string, { klass: string; total: number; early: number; late: number; absent: number }>();
    for (const p of rowsQ.people) {
      const key = p.klass || "—";
      const c = m.get(key) ?? { klass: key, total: 0, early: 0, late: 0, absent: 0 };
      c.total += p.days;
      c.early += p.early;
      c.late += p.late;
      c.absent += p.absent;
      m.set(key, c);
    }
    return Array.from(m.values())
      .map((c) => ({ ...c, rate: c.total > 0 ? Math.round(((c.early + c.late) / c.total) * 100) : 0 }))
      .sort((a, b) => a.klass.localeCompare(b.klass, "uz"));
  }, [rowsQ.people]);

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
      <StatPanel title={t.stats.people.typeStaff} hint="Manba yo'q">
        <div className="grid place-items-center py-14 text-center">
          <div className="max-w-[460px]">
            <p className="text-[13px] font-semibold text-slate-200">
              Kuzatuv postida «xodim» toifasi yo&apos;q
            </p>
            <p className="mt-1.5 text-[11.5px] leading-snug text-slate-500">
              Davomat kuzatuv postidan olinadi, u esa faqat <b>o&apos;quvchi</b> va{" "}
              <b>o&apos;qituvchi</b> toifalarini biladi. Xodimlar uchun son o&apos;ylab topilmaydi —
              ular yuz bazasiga qo&apos;shilgach shu yerda o&apos;zi paydo bo&apos;ladi.
            </p>
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
          period.from === period.to
            ? `${period.to} — bir kun`
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
        {dailySeries.length === 0 ? (
          <p className="py-12 text-center text-[11.5px] text-slate-500">Bu davrda davomat yozuvi yo&apos;q</p>
        ) : (
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailySeries} margin={{ top: 6, right: 12, bottom: 0, left: 0 }}>
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
                {LINES.map((l) => (
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
          Yuqoridagi yorliqni bosib chiziqni yashirish/ko&apos;rsatish mumkin. O&apos;ng
          burchakdagi toifa tugmalari o&apos;sha toifa tabiga o&apos;tkazadi.
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

        {/* ── 3. Sinflar kesimi (e'tibor panelining o'rnida) ── */}
        <StatPanel title="Sinflar kesimi" hint={`${n(classes.length)} ta guruh`}>
          {/* 🔵 **KARTOCHKA KO'RINISHI — BOSHQARUV PANELIDAGIDEK**
              (2026-09-13, foydalanuvchi so'rovi: "sinf kesimini boshqaruv
              panelidagidek qilishing kerak"). Ilgari bu yerda 5 ustunli
              jadval turardi (Sinf/Erta/Kech/Kelmadi/Davomat) — davomat
              taxtasining sinf kartochkalari (`AttendanceListModal`
              `AttendanceClassCard`) bilan bir xil ma'lumotni BOSHQACHA
              ko'rsatardi. Endi ikkalasi ham AYNI naqsh: katta foiz, yon
              tomonda hajm, ostida kelgan/kechikkan/kelmagan kesimi.
              ⚠️ Bu yerdagi son — DAVR yig'indisi (kun × shaxs), taxtadagi
              esa BITTA kunniki: shuning uchun "N ta" o'rniga aniq
              "kun-shaxs" yozilgan, aks holda ikki xil son bir xil nomda
              turardi. */}
          {classes.length === 0 ? (
            <p className="py-12 text-center text-[11.5px] text-slate-500">Bu davrda yozuv yo&apos;q</p>
          ) : (
            <div className="grid max-h-[248px] grid-cols-2 gap-2 overflow-y-auto pr-0.5 sm:grid-cols-3">
              {classes.map((c) => (
                <div
                  key={c.klass}
                  className="flex flex-col gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-3"
                >
                  <span className="truncate text-[15px] font-bold text-white">{c.klass}</span>
                  <span className="flex items-end justify-between gap-1">
                    <span className={`font-mono text-[26px] font-extrabold leading-none ${rateTone(c.rate)}`}>{c.rate}%</span>
                    <span className="flex-none text-[9px] text-slate-500">{n(c.total)} kun-shaxs</span>
                  </span>
                  <span className="flex flex-wrap items-center gap-x-2 text-[9.5px]">
                    <span className="text-emerald-300">{u.earlyN(c.early)}</span>
                    <span className="text-amber-300">{u.lateN(c.late)}</span>
                    <span className="text-rose-300">{u.absentN(c.absent)}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </StatPanel>
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
    </div>
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

