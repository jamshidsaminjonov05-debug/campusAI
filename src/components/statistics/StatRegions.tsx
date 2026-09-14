/**
 * "Muassasalar" bo'limi → "Hududlar" tab: TIZIMGA ULANGAN muassasalar
 * hududlar kesimida.
 *
 * ── 2026-09-05: MOCK OLIB TASHLANDI ───────────────────────────────────
 * Ilgari jadvalda **14 viloyat** bor edi va ularning har bir soni
 * (talaba, o'qituvchi, kamera, davomat, kayfiyat, signal)
 * `lib/regionInstitutes.ts` da GENERATSIYA qilinardi — backend hudud
 * kesimini bermaydi (`BACKEND.md` 1-band). Endi jadval FAQAT ulangan
 * muassasalar hududini ko'rsatadi, ko'rsatkichi yo'q katak esa QIZIL
 * "ma'lumot yo'q" bo'lib turadi.
 *
 * ⚠️ **"Kayfiyat" ustuni OLIB TASHLANDI** — serverda modul umuman
 * o'rnatilmagan (`ultralytics` yo'q), ya'ni u HECH QACHON haqiqiy son
 * ko'rsatmasdi.
 *
 * ⚠️ **Qatorga bosilsa — `onSelectRegion` (majburiy propi)**: chaqiruvchi
 * (`InstitutionsPage.tsx`) shu hududdagi muassasalarni "Muassasalar"
 * tabida ko'rsatadi. Ilgari bu yerda to'g'ridan-to'g'ri Geo Analitikaga
 * o'tib ketardi — endi drill-down BITTA sahifa ICHIDA (hudud → muassasa
 * → tafsilot), Geo Analitikaga o'tish esa tafsilot panelidagi alohida
 * "Xaritada ochish" tugmasi bilan.
 */
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DownloadSimple } from "@phosphor-icons/react";
import { useT } from "@/i18n";
import { useStudentLabel } from "@/hooks/useStudentLabel";
import { csvName, downloadCsv, sortRows, sumRegions, toCsv, type SortDir } from "@/lib/statistics";
import { useLiveInstitutions } from "@/hooks/useLiveInstitutions";
import { Missing } from "@/components/common/Missing";
import type { Metric } from "@/lib/institutionRows";
import { DataBadge } from "@/components/dashboard/DataBadge";
import { AXIS, CellBar, StatPanel, StatusPill, TOOLTIP, Th, fmt, rateTone } from "@/components/common/panels";

/** Manbasi bo'lmagan katak — QIZIL belgi, nol EMAS. */
function Cell({ v, format }: { v: Metric; format?: (n: number) => string }) {
  if (v === null) return <Missing />;
  return <>{format ? format(v) : v}</>;
}

type SortKey = "regionFull" | "institutes" | "students" | "teachers" | "attendance" | "cameras" | "alerts";

export function StatRegions({
  query,
  onSelectRegion,
}: {
  query: string;
  /** Hudud qatori bosilganda — to'liq nom (`RegionAnalytics.region`) beriladi. */
  onSelectRegion: (region: string) => void;
}) {
  const t = useT();
  const n = (v: number) => fmt(v, t.locale);
  /* "O'quvchi" ↔ "Talaba" — muassasa turiga qarab (`useStudentLabel`). */
  const student = useStudentLabel();

  const [sort, setSort] = useState<SortKey>("students");
  const [dir, setDir] = useState<SortDir>("desc");

  const onSort = (key: SortKey) => {
    // Bir ustunni ikkinchi marta bosish — yo'nalishni almashtiradi
    if (key === sort) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSort(key);
      setDir(key === "regionFull" ? "asc" : "desc");
    }
  };

  const { regions, live } = useLiveInstitutions();
  /* ⚠️ Signal soni DAVRGA ko'paytirilMAYDI. Ilgari qatorlar bir kunlik
     mock edi va uzun oraliq uchun `alerts * period.days` qilinardi —
     ya'ni son o'ylab topilardi. Hozir `alerts` jonli oqimdan (oxirgi
     sutka) keladi; davr kesimini server bermaydi (`BACKEND.md` 2-band). */
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q ? regions.filter((r) => r.regionFull.toLowerCase().includes(q)) : regions;
    return sortRows(filtered, sort, dir, t.locale);
  }, [regions, query, sort, dir, t.locale]);

  const totals = useMemo(() => sumRegions(rows), [rows]);

  /* Diagrammaga FAQAT soni ma'lum bo'lgan hududlar tushadi — noma'lumni
     nol ustun qilib chizish yolg'on ko'rinish berardi. */
  const chart = useMemo(
    () =>
      rows
        .filter((r) => r.students !== null)
        .sort((a, b) => (b.students ?? 0) - (a.students ?? 0))
        .slice(0, 10)
        .map((r) => ({
          // Uzun nom o'qda sig'maydi — "viloyati" so'zi olib tashlanadi
          region: r.regionFull.replace(/\s*(viloyati|Respublikasi)$/i, ""),
          [student.one]: r.students as number,
        })),
    [rows, student.one]
  );

  const exportCsv = () => {
    const csv = toCsv(
      [
        t.stats.col.region,
        t.stats.col.institutes,
        student.one,
        t.stats.col.teachers,
        t.stats.col.attendance,
        t.stats.col.activeCameras,
        t.stats.col.cameras,
        t.stats.col.alerts,
        t.stats.col.status,
      ],
      /* CSV'da manbasi yo'q katak BO'SH qoladi — nol yozilsa Excel'da
         u haqiqiy nol bo'lib o'qilardi. */
      rows.map((r) => [
        r.regionFull,
        r.institutes,
        r.students ?? "",
        r.teachers ?? "",
        r.attendance ?? "",
        r.activeCameras ?? "",
        r.cameras ?? "",
        r.alerts ?? "",
        r.status ? t.stats.status[r.status] : "",
      ])
    );
    downloadCsv(csvName("statistika-hududlar"), csv);
  };

  return (
    <div className="flex flex-col gap-3">
      <StatPanel
        title={t.stats.panel.regionTable}
        hint={t.stats.panel.regionTableHint}
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
        bodyClass="overflow-x-auto"
      >
        <table className="w-full min-w-[820px] border-collapse text-[11.5px]">
          <thead className="text-[9.5px] uppercase tracking-wide text-slate-500">
            <tr className="border-b border-white/[0.08]">
              <Th id="regionFull" label={t.stats.col.region} sort={sort} dir={dir} onSort={onSort} align="left" hint={t.stats.sortHint} />
              <Th id="institutes" label={t.stats.col.institutes} sort={sort} dir={dir} onSort={onSort} />
              <Th id="students" label={student.one} sort={sort} dir={dir} onSort={onSort} />
              <Th id="teachers" label={t.stats.col.teachers} sort={sort} dir={dir} onSort={onSort} />
              <Th id="attendance" label={t.stats.col.attendance} sort={sort} dir={dir} onSort={onSort} />
              <Th id="cameras" label={t.stats.col.cameras} sort={sort} dir={dir} onSort={onSort} />
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
            {rows.map((r) => {
              const coverage =
                r.activeCameras !== null && r.cameras !== null && r.cameras > 0
                  ? Math.round((r.activeCameras / r.cameras) * 100)
                  : null;
              return (
                <tr
                  key={r.regionFull}
                  onClick={() => onSelectRegion(r.regionFull)}
                  title={t.stats.regionDrillHint}
                  className="cursor-pointer border-b border-white/[0.04] transition-colors hover:bg-white/[0.04]"
                >
                  <td className="px-2 py-1.5 font-semibold text-slate-100">{r.regionFull}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-slate-300">{n(r.institutes)}</td>
                  <td className="px-2 py-1.5 text-right font-mono text-slate-300">
                    <Cell v={r.students} format={n} />
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono text-slate-400">
                    <Cell v={r.teachers} format={n} />
                  </td>
                  <td className="px-2 py-1.5">
                    {r.attendance === null ? (
                      <div className="text-right">
                        <Missing source="kuzatuv posti /attendance" />
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-mono" style={{ color: rateTone(r.attendance) }}>
                          {r.attendance}%
                        </span>
                        <CellBar pct={r.attendance} tone={rateTone(r.attendance)} />
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono text-slate-400">
                    {r.cameras === null ? (
                      <Missing source="kuzatuv posti /channels" />
                    ) : (
                      <>
                        {n(r.activeCameras ?? 0)}/{n(r.cameras)}
                        {coverage !== null && <span className="ml-1 text-[9.5px] text-slate-600">{coverage}%</span>}
                      </>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    {r.alerts === null ? (
                      <Missing />
                    ) : (
                      <span
                        className={`font-mono ${r.alerts > 5 ? "text-rose-300" : r.alerts > 1 ? "text-amber-300" : "text-slate-400"}`}
                      >
                        {r.alerts}
                      </span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    {r.status ? <StatusPill status={r.status} label={t.stats.status[r.status]} /> : <Missing />}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-white/[0.12] text-[11.5px] font-semibold text-slate-200">
              <td className="px-2 py-2">{t.stats.total}</td>
              <td className="px-2 py-2 text-right font-mono">{n(totals.institutes)}</td>
              <td className="px-2 py-2 text-right font-mono">
                <Cell v={totals.students} format={n} />
              </td>
              <td className="px-2 py-2 text-right font-mono">
                <Cell v={totals.teachers} format={n} />
              </td>
              <td className="px-2 py-2 text-right font-mono">
                <Cell v={totals.attendance} format={(v) => `${v}%`} />
              </td>
              <td className="px-2 py-2 text-right font-mono">
                {totals.totalCameras === null ? (
                  <Missing />
                ) : (
                  `${n(totals.activeCameras ?? 0)}/${n(totals.totalCameras)}`
                )}
              </td>
              <td className="px-2 py-2 text-right font-mono">
                <Cell v={totals.alerts} />
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </StatPanel>

      <StatPanel title={t.stats.panel.regionChart} hint={t.stats.panel.regionChartHint} className="min-h-[240px]" delay={0.06}>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} margin={{ top: 8, right: 12, bottom: 18, left: 0 }}>
              <CartesianGrid stroke="rgba(120,150,200,0.08)" vertical={false} />
              <XAxis
                dataKey="region"
                tick={{ ...AXIS, fontSize: 8.5 }}
                tickLine={false}
                axisLine={false}
                interval={0}
                angle={-25}
                textAnchor="end"
                height={40}
              />
              <YAxis
                tick={AXIS}
                tickLine={false}
                axisLine={false}
                width={42}
                tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
              />
              <Tooltip contentStyle={TOOLTIP} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar dataKey={student.one} fill="#8FB8FF" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </StatPanel>
    </div>
  );
}
