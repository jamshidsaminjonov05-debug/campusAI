"use client";

import { useEffect, useState } from "react";
import { CheckCircle, Clock, Prohibit, UsersThree } from "@phosphor-icons/react";
import { useNvrAttendance, useNvrAttendanceRange, attDay } from "@/hooks/useNvrAttendance";
import { EventDossier } from "@/components/detections/EventDossier";
import { saveAttendanceSettings, type NvrAttendanceSettings } from "@/lib/nvrApi";
import { fmt } from "@/components/common/panels";
import { AttendanceDrilldown } from "./AttendanceDrilldown";
import { useT } from "@/i18n";
import { useQueryClient } from "@tanstack/react-query";

/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  DAVOMAT — "kim keldi, kim kelmadi" (`/nvr/attendance`)              ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * Manba — kuzatuv postining O'Z davomati (`hooks/useNvrAttendance.ts`).
 * Holatni SERVER hisoblaydi: `arrival_deadline` (08:30) dan oldin —
 * "erta keldi", keyin — "kech qoldi", `absent_after` (10:00) dan keyin ham
 * ko'rinmasa — "kelmadi". Klientda QAYTA hisoblanmaydi.
 *
 * ⚠️ **XODIM (`staff`) YO'Q** — kuzatuv posti faqat `student`/`teacher` biladi.
 * Bu API chegarasi; nol ko'rsatiladi, son o'ylab topilmaydi.
 *
 * 🔴 **"RO'YXAT" VA "KUNLAR BO'YICHA" JADVALLARI OLIB TASHLANDI**
 * (2026-09-10, foydalanuvchi so'rovi: "huddi shu davomat qismidan
 * Ro'yhat qismini olib tashla ... chunki piechart bosilganda
 * chiqaryabmiz"). Ikkalasi ham `AttendanceDrilldown`ga KO'CHDI:
 *   · "Ro'yxat" — pie bo'lagi → toifa/sinf chuqurlashuvi bilan
 *     ALMASHTIRILDI (allaqachon shu ro'yxatni beradi, faqat filtrlangan
 *     holda — sinf/holat bo'yicha);
 *   · "Kunlar bo'yicha" (jadval) — KALENDAR bilan ALMASHTIRILDI, pie
 *     panelining chap tomonida.
 */
export function StatAttendance({ from, to }: { from: string; to: string }) {
  const t = useT();
  const n = (v: number) => fmt(v, t.locale);
  const qc = useQueryClient();

  /** Pie/kalendar qaysi kun uchun — kalendardan tanlanadi. */
  const [day, setDay] = useState(to);
  useEffect(() => setDay(to), [to]);

  const [openEvent, setOpenEvent] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const att = useNvrAttendance(day);
  const range = useNvrAttendanceRange(from, to);
  /** Yuqoridagi 4 ta KPI karta uchun — DOIM BUGUN, kalendarda tanlangan
   *  kundan MUSTAQIL (pastdagi izohga qarang). `day === attDay()`
   *  bo'lganda `att` bilan BIR XIL keshga tushadi — qo'shimcha so'rov
   *  faqat boshqa kun tanlangandagina ketadi. */
  const today = useNvrAttendance(attDay());

  /* ⚠️ **YUQORI 4 TA KPI KARTA — DOIM BUGUN** (2026-09-08, foydalanuvchi
     so'rovi: sahifaning davr standarti "Hafta"ga o'zgargach — pastdagi
     "Statistika sarlavhasi" bo'limiga qarang — bu kartalar davr
     YIG'INDISINI ko'rsata boshlagan edi: "Kelmadi 2 706" kabi son hech
     narsani anglatmasdi, chunki bir odam bir necha kunda bir necha marta
     sanaladi. Endi ular `StatOverview`/`StatCounting` dagi bilan AYNI
     qoidaga bo'ysunadi — periodga UMUMAN bog'liq emas, doim bugungi kun. */
  const kpi = today.summary;

  return (
    <div className="flex flex-col gap-3">
      
      {/* ── KPI qatori — DOIM BUGUN (yuqoridagi izohga qarang) ── */}
      <p className="flex-none text-[9.5px] uppercase tracking-wider text-ice-cyan/50">
        Bugungi holat
        {/* 🔵 DAM OLISH KUNI (2026-09-13) — u kuni davomat serverda
            baholanmaydi, shuning uchun holat sonlari `—` bo'lib chiqadi:
            `0` "hech kim kelmadi" degan yolg'on ma'no berardi. */}
        {today.isWeekend && <span className="ml-2 text-slate-500">· {t.board.weekend}</span>}
      </p>
      <div className="-mt-1.5 grid flex-none grid-cols-2 gap-2 md:grid-cols-4">
        <KpiCard Icon={UsersThree} value={n(kpi.total)} label="Jami" tone="#85E0FF" active />
        <KpiCard
          Icon={CheckCircle}
          value={today.isWeekend ? "—" : n(kpi.early)}
          label="Erta keldi"
          tone={today.isWeekend ? "#64748B" : "#34D399"}
        />
        <KpiCard
          Icon={Clock}
          value={today.isWeekend ? "—" : n(kpi.late)}
          label="Kech qoldi"
          tone={today.isWeekend ? "#64748B" : "#F59E0B"}
        />
        <KpiCard
          Icon={Prohibit}
          value={today.isWeekend ? "—" : n(kpi.absent)}
          label="Kelmadi"
          tone={today.isWeekend ? "#64748B" : "#FB7185"}
        />
      </div>

      {/* ── "Toifalar kesimi" (statik jadval) BUTUNLAY OLIB TASHLANDI
          (2026-09-10, foydalanuvchi so'rovi) — o'rniga TO'LIQ KENGLIKDA
          3D halqa (Erta/Kech/Kelmagan) + bo'lak bosilganda o'ngdan
          suzib kiruvchi toifa/sinf chuqurlashuvi (`AttendanceDrilldown`,
          o'zining `StatPanel`i bilan — shu sabab bu yerda IKKINCHI
          o'rov YO'Q). Manba — AYNI `att.rows` ("Ro'yxat" jadvali bilan
          bir xil kesh), qo'shimcha so'rov yo'q. "Vaqtlarni o'zgartirish"
          tugmasi ham shu panelning o'ziga ko'chdi — ilgari "Toifalar
          kesimi" sarlavhasida edi. */}
      <AttendanceDrilldown
        rows={att.rows}
        day={day}
        from={from}
        to={to}
        points={range.points}
        /* Bugungi katak kun TUGAGANDAN keyin bo'yaladi — sababi
           `AttendanceDrilldown` dagi `todayDone` izohida. */
        todayDone={today.deadlinePassed}
        onSelectDay={setDay}
        onOpenEvent={setOpenEvent}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {openEvent != null && <EventDossier eventId={openEvent} onClose={() => setOpenEvent(null)} />}
      {settingsOpen && att.settings && (
        <SettingsModal
          initial={att.settings}
          onClose={() => setSettingsOpen(false)}
          onSaved={() => {
            setSettingsOpen(false);
            /* Vaqtlar o'zgardi — HAMMA kun qaytadan hisoblanadi. */
            qc.invalidateQueries({ queryKey: ["nvr-attendance"] });
            qc.invalidateQueries({ queryKey: ["nvr-att-classes"] });
          }}
        />
      )}
    </div>
  );
}

function KpiCard({
  Icon,
  value,
  label,
  tone,
  active,
}: {
  Icon: typeof UsersThree;
  value: string;
  label: string;
  tone: string;
  active?: boolean;
}) {
  return (
    <div
      style={{ ["--c" as string]: tone }}
      className={`rounded-xl border px-3 py-2.5 ${
        active ? "border-[color:var(--c)]/40 bg-[color:var(--c)]/[0.08]" : "border-white/[0.08] bg-white/[0.03]"
      }`}
    >
      <div className="flex items-center gap-1.5">
        <Icon size={13} weight="fill" className="text-[color:var(--c)]" />
        <span className="text-[9.5px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
      </div>
      <p className="mt-0.5 font-mono text-[24px] font-bold leading-none text-[color:var(--c)]">{value}</p>
    </div>
  );
}

/** Kelish muddati / "kelmadi" vaqti — serverda saqlanadi, qayta ishga
 *  tushirish shart emas (`FRONTEND.md`). */
function SettingsModal({
  initial,
  onClose,
  onSaved,
}: {
  initial: NvrAttendanceSettings;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [deadline, setDeadline] = useState(initial.arrival_deadline);
  const [absentAfter, setAbsentAfter] = useState(initial.absent_after);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await saveAttendanceSettings({ arrival_deadline: deadline, absent_after: absentAfter });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Saqlanmadi");
    } finally {
      setBusy(false);
    }
  }

  const input = "hik-input h-9 w-full px-2.5 text-[12px] text-slate-100 outline-none";

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[90] grid place-items-center bg-[#03060E]/85 p-4 backdrop-blur-md"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="hik-glass-blue w-[360px] max-w-full rounded-2xl border border-white/10 bg-ink-panel p-5"
      >
        <p className="mb-3 text-[14px] font-bold">Davomat vaqtlari</p>
        <label className="mb-2.5 block text-[10.5px] text-slate-400">
          Kelish muddati — undan keyin «kech qoldi»
          <input type="time" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={`${input} mt-1`} />
        </label>
        <label className="block text-[10.5px] text-slate-400">
          Shundan keyin «kelmadi»
          <input
            type="time"
            value={absentAfter}
            onChange={(e) => setAbsentAfter(e.target.value)}
            className={`${input} mt-1`}
          />
        </label>
        {error && <p className="mt-2.5 text-[11.5px] text-rose-300">{error}</p>}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-white/10 py-2 text-[12px] font-semibold text-slate-300 hover:bg-white/[0.06]"
          >
            Bekor qilish
          </button>
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="flex-1 rounded-lg bg-emerald-500/90 py-2 text-[12px] font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            Saqlash
          </button>
        </div>
      </div>
    </div>
  );
}

export { attDay };
