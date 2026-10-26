"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { CalendarBlank, CaretLeft, CaretRight } from "@phosphor-icons/react";
import { useT } from "@/i18n";
import { dayMonthLabel } from "@/lib/dateLabel";

/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  ORALIQ TANLASH — loyiha uslubidagi kalendar (2026-10-23)            ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * Brauzerning `<input type="date">` oynasi tizim tilida va tizim rangida
 * chiziladi (rus tilidagi "Удалить/Сегодня", kulrang fon) — neon dizaynga
 * zid edi. Bu yerda: bitta tugma ("2-okt — 23-okt"), bosilsa ochiladigan
 * kalendar. Birinchi bosish — BOSHI, ikkinchisi — OXIRI (teskari tanlansa
 * o'zi almashtiriladi), oraliq yoritiladi. Kelajak kunlari bosilmaydi.
 *
 * ⚠️ Oy/hafta nomlari LUG'ATDAN (`t.chart.months`/`weekdays`), `Intl` EMAS —
 * o'zbek ICU ma'lumoti bo'lmagan brauzerda "M10" chiqardi (`lib/dateLabel.ts`).
 * ⚠️ Oyna PORTAL bilan `body`ga chiqadi: sarlavha qatoridagi `backdrop-filter`
 * `fixed` uchun yangi containing block yaratadi va oyna qirqilib qolardi.
 */

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s: string) => new Date(`${s}T00:00:00`);

export function DateRangePicker({
  from,
  to,
  max,
  onChange,
}: {
  from: string;
  to: string;
  /** Eng kech tanlanadigan kun (`YYYY-MM-DD`), odatda bugun. */
  max: string;
  onChange: (from: string, to: string) => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  /** Tanlov jarayonida — boshi tanlangan, oxiri kutilmoqda. */
  const [pending, setPending] = useState<string | null>(null);
  const [hoverDay, setHoverDay] = useState<string | null>(null);
  const [month, setMonth] = useState(() => {
    const d = parse(to);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (r) setPos({ top: r.bottom + 8, left: Math.max(8, Math.min(r.left, window.innerWidth - 300)) });
    };
    place();
    const onDown = (e: MouseEvent) => {
      const n = e.target as Node;
      if (btnRef.current?.contains(n) || popRef.current?.contains(n)) return;
      setOpen(false);
      setPending(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setPending(null);
      }
    };
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  /* Oy to'ri — dushanbadan boshlanadigan 6 hafta (42 katak) */
  const cells = useMemo(() => {
    const first = new Date(month);
    const shift = (first.getDay() + 6) % 7;
    const start = new Date(first);
    start.setDate(1 - shift);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return { key: iso(d), day: d.getDate(), inMonth: d.getMonth() === month.getMonth() };
    });
  }, [month]);

  /* Ko'rsatiladigan oraliq: tanlov jarayonida — boshi + sichqoncha ostidagi kun */
  const [a, b] = pending
    ? [pending, hoverDay ?? pending].sort()
    : [from, to];

  const pick = (day: string) => {
    if (day > max) return;
    if (!pending) {
      setPending(day);
      return;
    }
    const [s, e] = [pending, day].sort();
    setPending(null);
    setOpen(false);
    onChange(s, e);
  };

  const shiftMonth = (d: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + d, 1));
  const canNext = iso(new Date(month.getFullYear(), month.getMonth() + 1, 1)) <= max;
  const today = max;

  const label = `${dayMonthLabel(parse(from), t)} — ${dayMonthLabel(parse(to), t)}`;

  const pop =
    open && pos ? (
      <motion.div
        ref={popRef}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.16 }}
        style={{ top: pos.top, left: pos.left }}
        className="geo-strip-card fixed z-[70] w-[292px] rounded-2xl border border-white/10 p-3 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)]"
      >
        <div className="mb-2 flex items-center justify-between">
          <button type="button" onClick={() => shiftMonth(-1)} className="grid h-7 w-7 place-items-center rounded-lg text-slate-300 hover:bg-white/[0.07] hover:text-white">
            <CaretLeft size={14} weight="bold" />
          </button>
          <p className="text-[12.5px] font-bold capitalize text-white">
            {t.chart.months[month.getMonth()]} {month.getFullYear()}
          </p>
          <button
            type="button"
            onClick={() => canNext && shiftMonth(1)}
            disabled={!canNext}
            className="grid h-7 w-7 place-items-center rounded-lg text-slate-300 hover:bg-white/[0.07] hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <CaretRight size={14} weight="bold" />
          </button>
        </div>

        <div className="mb-1 grid grid-cols-7 text-center text-[9.5px] font-bold uppercase tracking-wide text-slate-500">
          {t.chart.weekdays.map((w) => (
            <span key={w} className="py-1">
              {w}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-0.5" onMouseLeave={() => setHoverDay(null)}>
          {cells.map((c) => {
            const future = c.key > max;
            const inRange = c.key >= a && c.key <= b;
            const edge = c.key === a || c.key === b;
            const isStart = c.key === a;
            const isEnd = c.key === b;
            return (
              <button
                key={c.key}
                type="button"
                disabled={future}
                onClick={() => pick(c.key)}
                onMouseEnter={() => setHoverDay(c.key)}
                className={`relative h-8 text-[11.5px] font-semibold transition-colors ${
                  future ? "cursor-not-allowed text-slate-700" : c.inMonth ? "text-slate-200" : "text-slate-600"
                } ${inRange && !edge ? "bg-cyan-400/[0.12]" : ""} ${isStart && a !== b ? "rounded-l-lg bg-cyan-400/[0.12]" : ""} ${
                  isEnd && a !== b ? "rounded-r-lg bg-cyan-400/[0.12]" : ""
                }`}
              >
                <span
                  className={`relative z-[1] mx-auto grid h-8 w-8 place-items-center rounded-lg ${
                    edge ? "text-white shadow-[0_6px_16px_-8px_#22d3ee]" : future ? "" : "hover:bg-white/[0.07]"
                  } ${c.key === today && !edge ? "ring-1 ring-cyan-300/50" : ""}`}
                  style={edge ? { background: "linear-gradient(135deg, #22d3ee, #818cf8)" } : undefined}
                >
                  {c.day}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-2.5 flex items-center justify-between border-t border-white/[0.07] pt-2.5 text-[11px]">
          <span className="text-slate-500">{pending ? t.dateRange.pickEnd : t.dateRange.pickStart}</span>
          <button
            type="button"
            onClick={() => {
              setPending(null);
              setOpen(false);
              setMonth(new Date(parse(today).getFullYear(), parse(today).getMonth(), 1));
              onChange(today, today);
            }}
            className="rounded-lg px-2 py-1 font-semibold text-cyan-300 hover:bg-cyan-400/10"
          >
            {t.dateRange.today}
          </button>
        </div>
      </motion.div>
    ) : null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setPending(null);
          const d = parse(to);
          setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
        }}
        aria-expanded={open}
        className={`flex items-center gap-2 rounded-xl border bg-black/25 px-3 py-1.5 text-[11.5px] font-semibold transition-colors ${
          open ? "border-cyan-400/50 text-white" : "border-white/10 text-slate-200 hover:border-white/20"
        }`}
      >
        <CalendarBlank size={14} weight="duotone" className="text-cyan-300" />
        <span className="font-mono">{label}</span>
      </button>
      {typeof document !== "undefined" && createPortal(pop, document.body)}
    </>
  );
}
