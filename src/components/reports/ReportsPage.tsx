import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarDays, Download, FileSpreadsheet, Filter, LogIn, LogOut as LogOutIcon,
  RefreshCcw, Search, Smile, Meh, Frown, Upload,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAttendance, useMonthlyAttendance, usePersonMutations, usePersons } from "@/hooks/useApi";
import { DataBadge } from "@/components/dashboard/DataBadge";

function todayISO(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

const EMOTION_ICON: Record<string, { Icon: typeof Smile; cls: string }> = {
  positive: { Icon: Smile, cls: "text-emerald-400" },
  neutral: { Icon: Meh, cls: "text-amber-400" },
  negative: { Icon: Frown, cls: "text-red-400" },
};

/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  HISOBOTLAR — davomat jurnali                                        ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * ⚠️ ILGARI SAHIFA BO'SH OCHILARDI. U faqat `/attendance` dan o'qirdi va
 * hech qanday zaxirasi yo'q edi. O'lchandi (2026-09-02):
 *   · `?date_from=2026-08-27&date_to=2026-09-02` (sahifaning DEFAULT
 *     oralig'i) → **0 ta yozuv**;
 *   · filtrsiz butun tarix → **2 ta**, ikkalasi ham **2026-07-15**.
 * Ya'ni ochilishi bilan jadval bo'm-bo'sh turardi va foydalanuvchi buni
 * xato deb o'ylardi.
 *
 * Endi boshqa bo'limlar bilan AYNI qoida:
 *   · **Namoyish** — backend bo'sh bo'lsa mock davomat ko'rsatiladi
 *     (`lib/demoAttendance.ts` — Shaxslar ro'yxati bilan AYNI odamlar);
 *   · **Aniq statistika** — faqat backend; bo'sh bo'lsa sabab OCHIQ
 *     yoziladi ("bu oraliqda yozuv yo'q").
 */
export function ReportsPage() {
  const [dateFrom, setDateFrom] = useState(todayISO(-7));
  const [dateTo, setDateTo] = useState(todayISO());
  const [eventType, setEventType] = useState<"" | "entry" | "exit">("");
  const [personSearch, setPersonSearch] = useState("");
  const [personId, setPersonId] = useState<string | null>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  const attendance = useAttendance({
    person_id: personId ?? undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    event_type: eventType || undefined,
    limit: 500,
  });

  const persons = usePersons({ search: personSearch || undefined, page: 1, page_size: 50 });
  const monthly = useMonthlyAttendance(personId);
  const { importFile } = usePersonMutations();

  const personById = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of persons.data?.items ?? []) m.set(p.id, p.full_name);
    return m;
  }, [persons.data]);

  async function downloadTemplate() {
    try {
      const blob = await api.downloadImportTemplate();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "import_shablon.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setImportMsg(e instanceof Error ? e.message : "Shablonni yuklab bo'lmadi");
    }
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportMsg("Import qilinmoqda...");
    importFile.mutate(
      { file },
      {
        onSuccess: (r) =>
          setImportMsg(`Import yakunlandi: ${r.created} yaratildi, ${r.updated} yangilandi, ${r.failed} xato`),
        onError: (err) => setImportMsg(err instanceof Error ? err.message : "Import xatosi"),
      }
    );
    e.target.value = "";
  }

  const inputCls =
    "rounded-lg border border-blue-500/20 bg-slate-900/60 px-2.5 py-1.5 text-[11.5px] text-slate-300 outline-none";

  /* ⚠️ **NAMOYISH ZAXIRASI OLIB TASHLANDI** (2026-09-05): backend
     oraliq uchun bo'sh bo'lsa ilgari mock odamlardan davomat YASALARDI
     va hisobotda haqiqiy bo'lmagan ismlar chiqardi. Endi backend nima
     bersa o'sha; bo'sh bo'lsa jadval sababini yozadi. */
  const rows = useMemo(() => attendance.data ?? [], [attendance.data]);
  const usingDemo = false;
  const demoNameById = useMemo(() => new Map<string, string>(), []);

  return (
    <div className="hik-glass-blue flex h-full min-h-0 flex-col gap-3 overflow-y-auto rounded-3xl p-4">
      {/* Filtrlar */}
      <div className="flex flex-none flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
          <Filter size={13} /> Davomat hisoboti
        </span>
        <label className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <CalendarDays size={13} />
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={inputCls} />
          —
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={inputCls} />
        </label>
        <select value={eventType} onChange={(e) => setEventType(e.target.value as typeof eventType)} className={inputCls}>
          <option value="">Kirish/chiqish: barchasi</option>
          <option value="entry">Faqat kirish</option>
          <option value="exit">Faqat chiqish</option>
        </select>
        <button
          onClick={() => attendance.refetch()}
          className="flex items-center gap-1.5 rounded-lg border border-blue-500/20 bg-slate-900/60 px-2.5 py-1.5 text-[11px] text-slate-300 hover:text-white"
        >
          <RefreshCcw size={12} className={attendance.isFetching ? "animate-spin" : ""} /> Yangilash
        </button>
        <span className="ml-auto flex items-center gap-2 text-[10.5px] text-slate-500">
          {rows.length} ta yozuv
          <DataBadge live={!usingDemo} />
        </span>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[1fr_340px] gap-3">
        {/* Davomat jadvali */}
        <div className="hik-glass-blue flex min-h-0 flex-col overflow-hidden rounded-2xl">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <table className="w-full text-left text-[11.5px]">
              <thead className="sticky top-0 z-10 bg-slate-900/95 text-[9.5px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-3 py-2 font-semibold">Vaqt</th>
                  <th className="px-3 py-2 font-semibold">Shaxs</th>
                  <th className="px-3 py-2 font-semibold">Turi</th>
                  <th className="px-3 py-2 font-semibold">O'xshashlik</th>
                  <th className="px-3 py-2 font-semibold">Hissiyot</th>
                  <th className="px-3 py-2 font-semibold">Kamera</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => {
                  const emo = a.emotion_group ? EMOTION_ICON[a.emotion_group] : null;
                  return (
                    <tr key={a.id} className="border-t border-slate-800/60 hover:bg-blue-500/5">
                      <td className="px-3 py-2 font-mono text-slate-300">
                        {new Date(a.timestamp).toLocaleString("uz-UZ")}
                      </td>
                      <td className="px-3 py-2 font-semibold">
                        {personById.get(a.person_id) ?? demoNameById.get(a.person_id) ?? a.person_id.slice(0, 8)}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            a.event_type === "entry"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-slate-500/10 text-slate-300"
                          }`}
                        >
                          {a.event_type === "entry" ? <LogIn size={11} /> : <LogOutIcon size={11} />}
                          {a.event_type === "entry" ? "Kirish" : "Chiqish"}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-slate-300">
                        {a.similarity != null ? `${Math.round(a.similarity * 100)}%` : "—"}
                      </td>
                      <td className="px-3 py-2">
                        {emo ? <emo.Icon size={14} className={emo.cls} /> : <span className="text-slate-600">—</span>}
                      </td>
                      <td className="px-3 py-2 font-mono text-slate-400">{a.camera_id?.slice(0, 8) ?? "—"}</td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-10 text-center">
                      {attendance.isLoading ? (
                        <span className="text-slate-500">Yuklanmoqda...</span>
                      ) : (
                        <>
                          <p className="text-[12px] font-semibold text-amber-300/90">
                            Tanlangan davr uchun davomat yozuvi yo&apos;q
                          </p>
                          {/* ⚠️ Sabab OCHIQ yoziladi — bo'sh jadval xato
                              emas, backendda shu oraliqda yozuv yo'q. */}
                          <p className="mx-auto mt-1 max-w-[420px] text-[11px] leading-snug text-slate-500">
                            Davomat qaydlari yuz tanish orqali yoziladi. Hozircha bazada juda kam yozuv bor — sanani
                            kengaytirib ko&apos;ring yoki &laquo;Aniq statistika&raquo; ni o&apos;chirib namoyish
                            ma&apos;lumotini ko&apos;ring.
                          </p>
                        </>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* O'ng panel: shaxs bo'yicha oylik hisobot + import */}
        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto pr-0.5">
          <div className="hik-glass-blue rounded-xl px-3.5 py-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Shaxs bo'yicha oylik hisobot</p>
            <div className="mb-2 flex items-center gap-2 rounded-lg border border-blue-500/20 bg-slate-900/60 px-2.5 py-1.5">
              <Search size={13} className="text-slate-400" />
              <input
                value={personSearch}
                onChange={(e) => setPersonSearch(e.target.value)}
                placeholder="Shaxsni qidirish..."
                className="w-full bg-transparent text-[11.5px] outline-none placeholder:text-slate-500"
              />
            </div>
            <div className="max-h-[150px] space-y-1 overflow-y-auto">
              {(persons.data?.items ?? []).map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPersonId(p.id === personId ? null : p.id)}
                  className={`block w-full rounded-lg px-2.5 py-1.5 text-left text-[11.5px] transition-colors ${
                    personId === p.id ? "bg-ice/15 text-ice-bright" : "hover:bg-slate-800/50"
                  }`}
                >
                  <span className="font-semibold">{p.full_name}</span>
                  <span className="ml-1.5 font-mono text-[10px] text-slate-500">{p.person_code}</span>
                </button>
              ))}
              {persons.data && persons.data.items.length === 0 && (
                <p className="py-3 text-center text-[10.5px] text-slate-500">Shaxs topilmadi</p>
              )}
            </div>
          </div>

          {personId && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="hik-glass-blue rounded-xl px-3.5 py-3"
            >
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                {monthly.data?.full_name ?? "..."} — {monthly.data ? `${monthly.data.month}/${monthly.data.year}` : ""}
              </p>
              {monthly.isLoading && <p className="text-[11px] text-slate-500">Yuklanmoqda...</p>}
              {monthly.data && (
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: "Ish kuni", v: monthly.data.working_days, cls: "text-ice-soft" },
                    { label: "Hozir", v: monthly.data.present_days, cls: "text-emerald-400" },
                    { label: "Kechikdi", v: monthly.data.late_days, cls: "text-amber-400" },
                    { label: "Yo'q", v: monthly.data.absent_days, cls: "text-red-400" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-lg border border-slate-700/30 bg-slate-900/40 py-1.5 text-center">
                      <p className={`font-mono text-[13px] font-bold ${s.cls}`}>{s.v}</p>
                      <p className="text-[8.5px] text-slate-400">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}
              {monthly.data?.days && monthly.data.days.length > 0 && (
                <div className="mt-2 max-h-[160px] space-y-1 overflow-y-auto">
                  {monthly.data.days.map((d) => (
                    <div key={d.date} className="flex items-center justify-between rounded px-2 py-1 text-[10.5px] odd:bg-slate-900/40">
                      <span className="font-mono text-slate-400">{d.date}</span>
                      <span className={`font-mono ${d.late ? "text-amber-400" : d.entry_time ? "text-emerald-400" : "text-red-400"}`}>
                        {d.entry_time ?? "yo'q"} {d.late ? "· kech" : ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          <div className="hik-glass-blue rounded-xl px-3.5 py-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Import / Shablon</p>
            <div className="flex flex-col gap-2">
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 rounded-lg border border-blue-500/20 bg-slate-900/60 px-3 py-2 text-[11.5px] text-slate-200 hover:bg-slate-800/70"
              >
                <Download size={14} className="text-ice-soft" /> Import shablonini yuklab olish
              </button>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-blue-500/20 bg-slate-900/60 px-3 py-2 text-[11.5px] text-slate-200 hover:bg-slate-800/70">
                <Upload size={14} className="text-emerald-400" /> Excel/Word fayldan import
                <input type="file" accept=".xlsx,.xls,.docx" onChange={handleImport} className="hidden" />
              </label>
              {importMsg && (
                <p className="flex items-start gap-1.5 rounded-lg bg-slate-900/60 px-2.5 py-2 text-[10.5px] text-slate-300">
                  <FileSpreadsheet size={13} className="mt-0.5 flex-none text-ice-soft" /> {importMsg}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
