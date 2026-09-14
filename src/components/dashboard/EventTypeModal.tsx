/**
 * **Pie bo'lagi bosilganda** ochiladigan oyna — o'sha TURNING XULOSASI
 * (2026-09-05, foydalanuvchi so'rovi).
 *
 * ── IKKI USTUN ────────────────────────────────────────────────────────
 * · **CHAPDA — BO'LAKNING O'ZI**: `Pie3D` shu bo'lak "chiqarilgan"
 *   (`highlight`) holatda chiziladi, qolganlari so'niq. Ya'ni
 *   foydalanuvchi qaysi bo'lakni bosganini KO'RIB turadi.
 * · **O'NGDA — UMUMIY XULOSA**: jami, ulush, trevoga, birinchi/oxirgi
 *   qayd, kunma-kun va kamera kesimi.
 *
 * ⚠️ **RO'YXAT ATAYLAB YO'Q** (foydalanuvchi so'rovi). Ilgari bu yerda
 * o'sha turdagi barcha hodisalar ro'yxati chizilardi — "Begona odam"
 * uchun **1 610** ta bir xil qator ("Notanish shaxs · Kirish posti"),
 * ya'ni aylantirishdan boshqa hech narsa bermasdi. Bitta yozuvni
 * ko'rish kerak bo'lsa — "Aniqlanganlarda ochish" tugmasi (u yerda
 * filtr, qidiruv va sahifalash bor).
 */
"use client";

import { useMemo } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { ArrowRight, X } from "@phosphor-icons/react";
import { useT } from "@/i18n";
import { useModalHistory } from "@/hooks/useModalHistory";
import { Pie3D, type PieSlice } from "@/components/common/Pie3D";
import { cameraPlaceLabel } from "@/config/cameraPlacements";
import type { DetectionEvent } from "@/lib/detectionEvents";

const HIGH = new Set(["critical", "high"]);

export function EventTypeModal({
  slices,
  activeId,
  label,
  color,
  list,
  onOpenAll,
  onClose,
}: {
  /** Butun diagramma — chapda AYNI shakl chiziladi. */
  slices: PieSlice[];
  /** Ajratilgan bo'lak (`DetectionId`). */
  activeId: string;
  label: string;
  color: string;
  /** Shu turdagi hodisalar — XULOSA shundan hisoblanadi (ro'yxat chizilmaydi). */
  list: DetectionEvent[];
  /** "Aniqlanganlarda ochish". */
  onOpenAll: () => void;
  onClose: () => void;
}) {
  const t = useT();
  const u = t.dashboard.ui.typeModal;
  /* ◀ "orqaga" avval shu oynani yopadi (`lib/modalHistory.ts`). */
  useModalHistory(onClose);

  const stats = useMemo(() => {
    const total = slices.reduce((s, x) => s + x.value, 0);
    const alarms = list.filter((e) => HIGH.has(e.severity)).length;

    /* Kunma-kun va kamera kesimi — bitta o'tishda sanaladi. */
    const days = new Map<string, number>();
    const cams = new Map<string, { label: string; n: number }>();
    let first = Infinity;
    let last = -Infinity;
    for (const e of list) {
      const day = new Date(e.ts).toISOString().slice(0, 10);
      days.set(day, (days.get(day) ?? 0) + 1);
      const key = e.channel ?? e.camera;
      const c = cams.get(key);
      if (c) c.n += 1;
      else cams.set(key, { label: cameraPlaceLabel(e.channel ?? "", e.camera), n: 1 });
      if (e.ts < first) first = e.ts;
      if (e.ts > last) last = e.ts;
    }

    return {
      count: list.length,
      share: total > 0 ? (list.length / total) * 100 : 0,
      alarms,
      first: Number.isFinite(first) ? new Date(first) : null,
      last: Number.isFinite(last) ? new Date(last) : null,
      days: [...days.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)),
      cams: [...cams.values()].sort((a, b) => b.n - a.n),
    };
  }, [list, slices]);

  const dt = (d: Date | null) =>
    d ? d.toLocaleString(t.locale, { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—";

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        style={{ ["--n1" as string]: color, ["--n2" as string]: "#a78bfa" }}
        className="neon-modal flex max-h-[88vh] w-[min(860px,96vw)] flex-col overflow-hidden"
      >
        <header className="flex flex-none items-start gap-3 border-b border-white/[0.08] px-4 py-3">
          <span
            className="mt-1 h-3 w-3 flex-none rounded-full"
            style={{ background: color, boxShadow: `0 0 10px ${color}` }}
          />
          <div className="min-w-0 flex-1">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-slate-500">
              {t.dashboard.byCategory}
            </p>
            <h3 className="truncate text-[17px] font-bold text-white">{label}</h3>
          </div>
          <button type="button" onClick={onClose} title={t.common.close} className="neon-icon-btn">
            <X size={14} />
          </button>
        </header>

        {/* ⚠️ Tor ekranda ustunlar bir-birining OSTIGA tushadi. */}
        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 md:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
          {/* ── CHAP: BO'LAKNING O'ZI ── */}
          <div className="grid place-items-start">
            <Pie3D data={slices} size={320} highlight={activeId} />
          </div>

          {/* ── O'NG: UMUMIY XULOSA ── */}
          <div className="flex min-w-0 flex-col gap-3">
            <div className="grid grid-cols-3 gap-2">
              <Kpi label={u.total} value={String(stats.count)} tone="#8FB8FF" />
              <Kpi label={u.share} value={`${stats.share.toFixed(1)}%`} tone={color} />
              <Kpi
                label={u.alarm}
                value={String(stats.alarms)}
                tone={stats.alarms > 0 ? "#FB7185" : "#64748B"}
              />
            </div>

            <dl className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[11px]">
              <Row label={u.first} value={dt(stats.first)} />
              <Row label={u.last} value={dt(stats.last)} />
              <Row label={u.days} value={u.daysN(stats.days.length)} />
              <Row label={t.common.cameras} value={u.camsN(stats.cams.length)} />
            </dl>

            {/* Kunma-kun kesim */}
            {stats.days.length > 0 && (
              <section>
                <p className="mb-1 text-[9.5px] uppercase tracking-wider text-slate-500">{u.byDay}</p>
                <div className="flex flex-wrap gap-1.5">
                  {stats.days.slice(0, 12).map(([day, n]) => (
                    <span
                      key={day}
                      className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[10px] text-slate-400"
                    >
                      {day.slice(5)} <b className="neon-num font-mono">{n}</b>
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Kamera kesimi — qaysi kamerada nechta */}
            {stats.cams.length > 0 && (
              <section>
                <p className="mb-1 text-[9.5px] uppercase tracking-wider text-slate-500">{u.byCam}</p>
                <ul className="space-y-1">
                  {stats.cams.slice(0, 6).map((c) => (
                    <li key={c.label} className="flex items-center gap-2 text-[10.5px]">
                      <span className="min-w-0 flex-1 truncate text-slate-300">{c.label}</span>
                      <span className="neon-bar w-24 flex-none">
                        <span className="neon-bar-fill" style={{ width: `${(c.n / stats.cams[0].n) * 100}%` }} />
                      </span>
                      <b className="neon-num w-10 flex-none text-right font-mono">{c.n}</b>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <button type="button" onClick={onOpenAll} className="neon-btn mt-auto justify-center py-2.5">
              {u.openAll}
              <ArrowRight size={12} weight="bold" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div
      className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-2.5 py-2"
      style={{ ["--n1" as string]: tone, ["--n2" as string]: "#a78bfa" }}
    >
      <p className="truncate text-[9px] uppercase tracking-wide" style={{ color: tone }}>
        {label}
      </p>
      <p className="neon-num mt-0.5 font-mono text-[18px] font-extrabold leading-none">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2 py-0.5">
      <dt className="flex-none text-slate-500">{label}:</dt>
      <dd className="min-w-0 flex-1 truncate text-right font-mono text-slate-200">{value}</dd>
    </div>
  );
}
