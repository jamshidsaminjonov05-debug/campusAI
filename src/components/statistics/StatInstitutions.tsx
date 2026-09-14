/**
 * "Muassasalar" bo'limi → "Muassasalar" tab: tizimga ULANGAN o'quv
 * muassasalari jadvali + tanlangan muassasa kesimi.
 *
 * ── 2026-09-05: MOCK OLIB TASHLANDI ───────────────────────────────────
 * Ilgari ro'yxatda **645 muassasa** bor edi (`lib/regionInstitutes.ts`
 * generatsiya qilardi) va tanlangan muassasa paneli `institutionAnalytics()`
 * FORMULASI bilan haftalik davomat, kayfiyat taqsimoti va hodisa
 * kesimini "hisoblab" chizardi. Backend bu kesimni bermaydi
 * (`BACKEND.md` 1-band), ya'ni ekrandagi deyarli har bir raqam to'qilgan
 * edi.
 *
 * Endi:
 *   · ro'yxat — `config/institutions.ts` (kuzatuvdagi haqiqiy obyektlar),
 *   · sonlar  — `hooks/useLiveInstitutions` (kuzatuv posti kanallari, davomat,
 *     jonli hodisalar),
 *   · manbasi yo'q katak — QIZIL "ma'lumot yo'q"
 *     (`components/common/Missing.tsx`), nol EMAS.
 *
 * ⚠️ **"Turi" (Kuzatuvda/Respublika) filtri OLIB TASHLANDI** — ro'yxatda
 * endi faqat kuzatuvdagilar bor, ya'ni filtr har doim bir xil natija
 * berardi.
 *
 * ⚠️ **"Kayfiyat" ustuni va halqasi OLIB TASHLANDI** — serverda modul
 * umuman o'rnatilmagan (`ultralytics` yo'q, o'lchandi: 30 kunda 0 qayd).
 */
"use client";

import { useMemo, useState } from "react";
import {
  CalendarCheck,
  ChalkboardTeacher,
  DownloadSimple,
  MapPin,
  SecurityCamera,
  Siren,
  Student,
  X,
} from "@phosphor-icons/react";
import { useT } from "@/i18n";
import { useStudentLabel } from "@/hooks/useStudentLabel";
import { useAppStore } from "@/store/useAppStore";
import { useLiveInstitutions } from "@/hooks/useLiveInstitutions";
import { Missing, MissingBlock } from "@/components/common/Missing";
import type { InstitutionRow, Metric } from "@/lib/institutionRows";
import { csvName, downloadCsv, sortRows, sumInstitutions, toCsv, type SortDir } from "@/lib/statistics";
import { DataBadge } from "@/components/dashboard/DataBadge";
import { CellBar, KpiTile, StatPanel, StatusPill, Th, fmt, rateTone } from "@/components/common/panels";

type SortKey = "name" | "region" | "students" | "teachers" | "cameras" | "attendance" | "alerts";

/** Manbasi bo'lmagan katak — QIZIL belgi, nol EMAS. */
function Cell({ v, format }: { v: Metric; format?: (n: number) => string }) {
  if (v === null) return <Missing />;
  return <>{format ? format(v) : v}</>;
}

export function StatInstitutions({
  query,
  regionFilter,
  onClearRegion,
}: {
  query: string;
  /** Hudud bo'yicha qisqartirish — `InstitutionRow.regionFull` bilan aniq mos kelishi shart. */
  regionFilter?: string | null;
  onClearRegion?: () => void;
}) {
  const t = useT();
  const n = (v: number) => fmt(v, t.locale);
  /* "O'quvchi" ↔ "Talaba" — muassasa turiga qarab (`useStudentLabel`). */
  const student = useStudentLabel();
  const selected = useAppStore((s) => s.selectedTeknikum);
  const setSelectedTeknikum = useAppStore((s) => s.setSelectedTeknikum);
  const setActivePage = useAppStore((s) => s.setActivePage);
  const setVoiceCampusTarget = useAppStore((s) => s.setVoiceCampusTarget);

  const [sort, setSort] = useState<SortKey>("students");
  const [dir, setDir] = useState<SortDir>("desc");

  const onSort = (key: SortKey) => {
    if (key === sort) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSort(key);
      setDir(key === "name" || key === "region" ? "asc" : "desc");
    }
  };

  const { institutions: source, live } = useLiveInstitutions();

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = source.filter((i) => {
      if (regionFilter && i.regionFull !== regionFilter) return false;
      if (!q) return true;
      return i.name.toLowerCase().includes(q) || i.region.toLowerCase().includes(q);
    });
    return sortRows(filtered, sort, dir, t.locale);
  }, [source, query, regionFilter, sort, dir, t.locale]);

  const totals = useMemo(() => sumInstitutions(rows), [rows]);
  const current = useMemo(() => source.find((i) => i.id === selected) ?? null, [source, selected]);

  const exportCsv = () => {
    const csv = toCsv(
      [
        t.stats.col.institution,
        t.stats.col.region,
        student.one,
        t.stats.col.teachers,
        t.stats.col.activeCameras,
        t.stats.col.cameras,
        t.stats.col.attendance,
        t.stats.col.alerts,
        t.stats.col.status,
      ],
      /* ⚠️ Manbasi yo'q katak CSV'da BO'SH qoladi — nol yozilsa Excel'da
         u haqiqiy nol bo'lib o'qilardi. */
      rows.map((i) => [
        i.name,
        i.region,
        i.students ?? "",
        i.teachers ?? "",
        i.activeCameras ?? "",
        i.cameras ?? "",
        i.attendance ?? "",
        i.alerts ?? "",
        i.status ? t.stats.status[i.status] : "",
      ])
    );
    downloadCsv(csvName("statistika-muassasalar"), csv);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Tanlangan muassasa kesimi — jadval USTIDA: qatorga bosgach natija
          ko'z oldida chiqsin, pastga aylantirishga majbur qilmasin. */}
      {current ? (
        <InstitutionStatsDetail
          inst={current}
          all={source}
          onOpen={() => {
            setVoiceCampusTarget(current.id);
            setActivePage("Geo Analitika");
          }}
          onClear={() => setSelectedTeknikum(null)}
        />
      ) : (
        <StatPanel title={t.stats.panel.institutionDetail}>
          <p className="py-4 text-center text-[11.5px] text-slate-500">{t.stats.pickInstitution}</p>
        </StatPanel>
      )}

      <StatPanel
        title={t.stats.panel.institutionTable}
        hint={t.stats.panel.institutionTableHint}
        right={
          <span className="flex items-center gap-2">
            <DataBadge live={live} />
            <button
              type="button"
              onClick={exportCsv}
              title={t.stats.exportHint}
              className="hik-chip px-2 py-1 text-[10px] text-slate-300 transition-colors hover:text-ice-bright"
            >
              <DownloadSimple size={12} weight="bold" />
              {t.stats.exportCsv}
            </button>
          </span>
        }
      >
        {/* Hudud kesimidan tanlangan bo'lsa — filtr shu yerda ko'rinadi,
            bosilsa Muassasalarning HAMMASI qaytadi (`InstitutionsPage.tsx`). */}
        {regionFilter && (
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={onClearRegion}
              title={t.common.close}
              className="flex items-center gap-1.5 rounded-lg border border-ice/40 bg-ice/[0.12] px-2 py-1 text-[10.5px] font-semibold text-ice-bright"
            >
              {t.stats.col.region}: {regionFilter}
              <X size={10} weight="bold" />
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-[11.5px]">
            <thead className="text-[9.5px] uppercase tracking-wide text-slate-500">
              <tr className="border-b border-white/[0.08]">
                <Th
                  id="name"
                  label={t.stats.col.institution}
                  sort={sort}
                  dir={dir}
                  onSort={onSort}
                  align="left"
                  hint={t.stats.sortHint}
                />
                <Th id="region" label={t.stats.col.region} sort={sort} dir={dir} onSort={onSort} align="left" />
                <Th id="students" label={student.one} sort={sort} dir={dir} onSort={onSort} />
                <Th id="teachers" label={t.stats.col.teachers} sort={sort} dir={dir} onSort={onSort} />
                <Th id="cameras" label={t.stats.col.cameras} sort={sort} dir={dir} onSort={onSort} />
                <Th id="attendance" label={t.stats.col.attendance} sort={sort} dir={dir} onSort={onSort} />
                <Th id="alerts" label={t.stats.col.alerts} sort={sort} dir={dir} onSort={onSort} />
                <th className="px-2 py-1.5 text-right font-medium">{t.stats.col.status}</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-500">
                    {t.stats.nothing}
                  </td>
                </tr>
              )}
              {rows.map((i) => (
                <tr
                  key={i.id}
                  onClick={() => setSelectedTeknikum(i.id)}
                  title={t.stats.selectHint}
                  className={`cursor-pointer border-b border-white/[0.04] transition-colors hover:bg-white/[0.04] ${
                    selected === i.id ? "bg-ice/[0.07]" : ""
                  }`}
                >
                  <td className="max-w-[240px] truncate px-2 py-1.5 font-semibold text-slate-100">{i.name}</td>
                  <td className="px-2 py-1.5 text-slate-400">{i.region}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-slate-300">
                    <Cell v={i.students} format={n} />
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono text-slate-400">
                    <Cell v={i.teachers} format={n} />
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono text-slate-400">
                    {i.cameras === null ? <Missing source="kuzatuv posti /channels" /> : `${i.activeCameras ?? 0}/${i.cameras}`}
                  </td>
                  <td className="px-2 py-1.5">
                    {i.attendance === null ? (
                      <div className="text-right">
                        <Missing source="kuzatuv posti /attendance" />
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-mono" style={{ color: rateTone(i.attendance) }}>
                          {i.attendance}%
                        </span>
                        <CellBar pct={i.attendance} tone={rateTone(i.attendance)} />
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    {i.alerts === null ? (
                      <Missing />
                    ) : (
                      <span
                        className={`font-mono ${i.alerts > 4 ? "text-rose-300" : i.alerts > 1 ? "text-amber-300" : "text-slate-400"}`}
                      >
                        {i.alerts}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    {i.status ? <StatusPill status={i.status} label={t.stats.status[i.status]} /> : <Missing />}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/[0.12] font-semibold text-slate-200">
                <td className="px-2 py-2">{t.stats.total}</td>
                <td className="px-2 py-2 font-mono text-slate-400">{totals.count}</td>
                <td className="px-2 py-2 text-right font-mono">
                  <Cell v={totals.students} format={n} />
                </td>
                <td className="px-2 py-2 text-right font-mono">
                  <Cell v={totals.teachers} format={n} />
                </td>
                <td className="px-2 py-2 text-right font-mono">
                  {totals.cameras === null ? <Missing /> : `${n(totals.activeCameras ?? 0)}/${n(totals.cameras)}`}
                </td>
                <td className="px-2 py-2 text-right font-mono">
                  <Cell v={totals.attendance} format={(v) => `${v}%`} />
                </td>
                <td className="px-2 py-2 text-right font-mono">
                  <Cell v={totals.alerts} />
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </StatPanel>
    </div>
  );
}

/* ───────────────────── Tanlangan muassasa statistikasi ───────────────────── */

function InstitutionStatsDetail({
  inst,
  all,
  onOpen,
  onClear,
}: {
  inst: InstitutionRow;
  /** Butun ro'yxat — o'rin (rank) va o'rtacha shundan hisoblanadi. */
  all: InstitutionRow[];
  onOpen: () => void;
  onClear: () => void;
}) {
  const t = useT();
  const n = (v: number) => fmt(v, t.locale);
  const student = useStudentLabel();

  /* O'rin — FAQAT qiymati ma'lum bo'lgan muassasalar orasida. Noma'lum
     qiymatli qatorni ro'yxatga qo'shish o'rinni yolg'on qilardi. */
  const rank = useMemo(() => {
    const withAtt = all.filter((i) => i.attendance !== null);
    const withAlerts = all.filter((i) => i.alerts !== null);
    const idxAtt = [...withAtt].sort((x, y) => (y.attendance ?? 0) - (x.attendance ?? 0)).findIndex((i) => i.id === inst.id);
    const idxAl = [...withAlerts].sort((x, y) => (y.alerts ?? 0) - (x.alerts ?? 0)).findIndex((i) => i.id === inst.id);
    return {
      attendance: idxAtt >= 0 ? idxAtt + 1 : null,
      attendanceTotal: withAtt.length,
      alerts: idxAl >= 0 ? idxAl + 1 : null,
      alertsTotal: withAlerts.length,
    };
  }, [all, inst.id]);

  const totals = useMemo(() => sumInstitutions(all), [all]);
  const delta =
    inst.attendance !== null && totals.attendance !== null
      ? Math.round((inst.attendance - totals.attendance) * 10) / 10
      : null;
  const coverage =
    inst.activeCameras !== null && inst.cameras !== null && inst.cameras > 0
      ? Math.round((inst.activeCameras / inst.cameras) * 100)
      : null;
  const perTeacher =
    inst.teachers !== null && inst.teachers > 0 && inst.students !== null
      ? Math.round(inst.students / inst.teachers)
      : null;

  return (
    <StatPanel
      title={t.stats.panel.institutionDetail}
      right={
        <span className="flex items-center gap-2">
          {inst.status ? <StatusPill status={inst.status} label={t.stats.status[inst.status]} /> : <Missing />}
          <button
            type="button"
            onClick={onOpen}
            title={t.stats.openInstitution}
            className="hik-chip px-2 py-1 text-[10px] text-slate-300 transition-colors hover:text-ice-bright"
          >
            <MapPin size={12} weight="bold" />
            {t.stats.openInstitution}
          </button>
          <button
            type="button"
            onClick={onClear}
            title={t.stats.detail.clear}
            className="grid h-6 w-6 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-white/[0.06] hover:text-slate-200"
          >
            <X size={12} weight="bold" />
          </button>
        </span>
      }
    >
      {/* Muassasa nomi — ATAYLAB katta va oq: ilgari panel sarlavhasining
          mayda (`hint`, ~9.5px kulrang) qatoriga siqilgan edi va tanlangan
          muassasa qaysi ekani ekranga kirganda darrov ko'zga tashlanmasdi. */}
      <div className="mb-2.5">
        <p className="text-[19px] font-bold leading-tight text-white">{inst.name}</p>
        <p className="mt-0.5 text-[11.5px] text-slate-400">{inst.region}</p>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 xl:grid-cols-5">
        <KpiTile
          Icon={Student}
          label={student.plural}
          value={inst.students === null ? <Missing source="kuzatuv posti /attendance" /> : n(inst.students)}
          tone="#34D399"
        />
        <KpiTile
          Icon={ChalkboardTeacher}
          label={t.stats.kpi.teachers}
          value={inst.teachers === null ? <Missing source="kuzatuv posti /attendance" /> : n(inst.teachers)}
          hint={perTeacher === null ? undefined : t.stats.hint.perTeacher(perTeacher)}
          tone="#A78BFA"
        />
        <KpiTile
          Icon={SecurityCamera}
          label={t.stats.kpi.cameras}
          value={
            inst.cameras === null ? (
              <Missing source="kuzatuv posti /channels" />
            ) : (
              `${inst.activeCameras ?? 0}/${inst.cameras}`
            )
          }
          hint={coverage === null ? undefined : t.stats.hint.coverage(coverage)}
          tone="#85E0FF"
        />
        <KpiTile
          Icon={CalendarCheck}
          label={t.stats.kpi.attendance}
          value={inst.attendance === null ? <Missing source="kuzatuv posti /attendance" /> : `${inst.attendance}%`}
          hint={delta === null ? undefined : t.stats.detail.vsAvg(`${delta >= 0 ? "+" : ""}${delta}%`)}
          tone={rateTone(inst.attendance ?? 0)}
        />
        <KpiTile
          Icon={Siren}
          label={t.stats.kpi.alerts}
          value={inst.alerts === null ? <Missing /> : String(inst.alerts)}
          hint={rank.alerts === null ? undefined : t.stats.detail.rankAlerts(rank.alerts, rank.alertsTotal)}
          tone="#FB7185"
        />
      </div>

      {/* Ro'yxatdagi o'rni — foizning o'zi yaxshi/yomonligini aytmaydi */}
      <div className="mb-3 flex flex-wrap items-center gap-2 text-[10.5px]">
        {rank.attendance !== null && (
          <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-slate-300">
            {t.stats.detail.rankAttendance(rank.attendance, rank.attendanceTotal)}
          </span>
        )}
        {coverage !== null && inst.activeCameras !== null && inst.cameras !== null && (
          <span className="rounded-full bg-white/[0.05] px-2 py-0.5 text-slate-400">
            {t.stats.detail.coverageLine(n(inst.activeCameras), n(inst.cameras), coverage)}
          </span>
        )}
      </div>

      {/* ⚠️ **UCHTA DIAGRAMMA OLIB TASHLANDI** (haftalik davomat chizig'i,
          kayfiyat halqasi, hodisa turlari halqasi). Uchalasi ham
          `institutionAnalytics()` FORMULASI bilan chizilardi: server
          muassasa kesimida na kunlik davomat tarixini, na kayfiyatni, na
          hodisa turlarini bermaydi (`BACKEND.md` 1 va 6-band). Sabab
          ekranda OCHIQ yoziladi — jim bo'sh joy qoldirilmaydi. */}
      <MissingBlock
        reason={t.stats.detail.noBreakdown}
        source="GET /api/v1/statistics/institutions/{id}"
      />
    </StatPanel>
  );
}
