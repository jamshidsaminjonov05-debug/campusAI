/**
 * **Pie bo'lagi bosilganda** ochiladigan oyna — o'sha TURNING XULOSASI
 * (2026-09-05, foydalanuvchi so'rovi).
 *
 * ── IKKI USTUN ────────────────────────────────────────────────────────
 * · **CHAPDA — BO'LAKNING O'ZI**: `Pie3D` shu bo'lak "chiqarilgan"
 *   (`highlight`) holatda chiziladi, qolganlari so'niq.
 * · **O'NGDA — UMUMIY XULOSA**: jami, ulush, kunlar, birinchi/oxirgi kun
 *   va kunma-kun kesim.
 *
 * 🔴 **MANBA — `GET /events/stats`** (2026-09-15): ilgari xulosa xom
 * hodisalar ro'yxatidan (`useArrivals({})` — 30+3 so'rov, amalda ~1 kunlik
 * oyna) hisoblanardi. Endi server BUTUN tarix bo'yicha sanaydi.
 * ⚠️ Server kamera kesimini va trevogani KATEGORIYA bo'yicha BERMAYDI
 * (`by_channel`/`alerts` — umumiy), shuning uchun bu oynada ular yo'q —
 * o'ylab topilmaydi.
 *
 * ⚠️ **RO'YXAT ATAYLAB YO'Q** (foydalanuvchi so'rovi): "Begona odam" uchun
 * 1 610 ta bir xil qator aylantirishdan boshqa hech narsa bermasdi. Bitta
 * yozuv kerak bo'lsa — "Aniqlanganlarda ochish" (u yerda filtr, qidiruv va
 * SAHIFALASH bor).
 */
"use client";

import { useMemo } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { ArrowRight, X } from "@phosphor-icons/react";
import { useT } from "@/i18n";
import { useModalHistory } from "@/hooks/useModalHistory";
import { Pie3D, type PieSlice } from "@/components/common/Pie3D";
import type { EventStatsView } from "@/hooks/useEventStats";
import type { NvrRealCategory } from "@/hooks/useEventCounts";

export function EventTypeModal({
  slices,
  activeId,
  label,
  color,
  stats,
  onOpenAll,
  onClose,
}: {
  /** Butun diagramma — chapda AYNI shakl chiziladi. */
  slices: PieSlice[];
  /** Ajratilgan bo'lak — server kategoriyasi. */
  activeId: NvrRealCategory;
  label: string;
  color: string;
  /** Server statistikasi (`useEventStats`) — XULOSA shundan. */
  stats: EventStatsView;
  /** "Aniqlanganlarda ochish". */
  onOpenAll: () => void;
  onClose: () => void;
}) {
  const t = useT();
  const u = t.dashboard.ui.typeModal;
  /* ◀ "orqaga" avval shu oynani yopadi (`lib/modalHistory.ts`). */
  useModalHistory(onClose);

  const view = useMemo(() => {
    const count = stats.byCategory[activeId] ?? 0;
    /* Shu kategoriyada hodisa bo'lgan kunlar, eskidan yangiga. */
    const days = stats.byDay.filter((d) => d[activeId] > 0).map((d) => [d.day, d[activeId]] as const);
    return {
      count,
      share: stats.total > 0 ? (count / stats.total) * 100 : 0,
      first: days[0]?.[0] ?? null,
      last: days[days.length - 1]?.[0] ?? null,
      /* Ko'rsatish — yangidan eskiga */
      days: [...days].reverse(),
    };
  }, [stats.byCategory, stats.byDay, stats.total, activeId]);

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
              <Kpi label={u.total} value={view.count.toLocaleString(t.locale)} tone="#8FB8FF" />
              <Kpi label={u.share} value={`${view.share.toFixed(1)}%`} tone={color} />
              <Kpi label={u.days} value={u.daysN(view.days.length)} tone="#64748B" />
            </div>

            <dl className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[11px]">
              <Row label={u.first} value={view.first ?? "—"} />
              <Row label={u.last} value={view.last ?? "—"} />
            </dl>

            {/* Kunma-kun kesim — server hisobi */}
            {view.days.length > 0 && (
              <section>
                <p className="mb-1 text-[9.5px] uppercase tracking-wider text-slate-500">{u.byDay}</p>
                <div className="flex flex-wrap gap-1.5">
                  {view.days.slice(0, 12).map(([day, n]) => (
                    <span
                      key={day}
                      className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[10px] text-slate-400"
                    >
                      {day.slice(5)} <b className="neon-num font-mono">{n.toLocaleString(t.locale)}</b>
                    </span>
                  ))}
                </div>
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
