"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CaretLeft, MagnifyingGlass, UsersThree } from "@phosphor-icons/react";
import { useAllAttendance, useAllPersons } from "@/hooks/useApi";
import { isoDate } from "@/hooks/useStudentDay";
import type { PersonType } from "@/lib/api";
import { AXIS, StatPanel } from "@/components/common/panels";
import { useT } from "@/i18n";

/** Necha kunlik kesim. */
const DAYS = 7;
/** Ro'yxatdagi maksimal shaxs — uzun ro'yxat panelni bosib ketmasin. */
const MAX_ROWS = 60;

/**
 * HAFTALIK DAVOMAT DINAMIKASI — umumiy va HAR BIR SHAXS uchun alohida.
 *
 * Ilgari bu diagramma faqat YIG'MA foizni ko'rsatardi va "kim qachon
 * kelmagan" degan savolga javob bermasdi. Endi:
 *   · default — butun toifaning kunlik davomati (foizda);
 *   · ro'yxatdan shaxs tanlansa — FAQAT o'shaning haftasi (kelgan kunlar
 *     100%, kelmagani 0%), tepasida "orqaga" tugmasi.
 *
 * ⚠️ Ma'lumot HAQIQIY: `/attendance` so'nggi 7 kun bo'yicha so'raladi.
 * Qayd bo'lmagan kun `0` bo'ladi — mock bilan to'ldirilmaydi.
 */
export function WeeklyAttendance({ personType }: { personType: PersonType }) {
  const t = useT();
  const [picked, setPicked] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const from = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - (DAYS - 1));
    return isoDate(d);
  }, []);
  const to = useMemo(() => isoDate(), []);

  /* ⚠️ `page_size: 500` / `limit: 5000` server chegarasidan oshadi (200 va
     1 000) — o'sha so'rovlar `422` bilan yiqilardi. Sahifalanadigan
     variantlar 1 000 shaxsni ham to'liq oladi. */
  const persons = useAllPersons({ person_type: personType, is_active: true });
  const attendance = useAllAttendance({ date_from: from, date_to: to });

  const people = useMemo(() => persons.data?.items ?? [], [persons.data]);
  const records = useMemo(() => attendance.data ?? [], [attendance.data]);

  /** So'nggi 7 kun — eskisidan yangisiga. */
  const days = useMemo(() => {
    const out: { key: string; label: string }[] = [];
    for (let i = DAYS - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      // 0 = dushanba: `getDay()` yakshanbadan boshlaydi
      out.push({ key: isoDate(d), label: t.chart.weekdays[(d.getDay() + 6) % 7] });
    }
    return out;
  }, [t.chart.weekdays]);

  /** Kun → shu kuni qayd etilgan shaxslar (takrorsiz). */
  const presentByDay = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const r of records) {
      const day = r.timestamp.slice(0, 10);
      const set = map.get(day) ?? new Set<string>();
      set.add(r.person_id);
      map.set(day, set);
    }
    return map;
  }, [records]);

  const ids = useMemo(() => new Set(people.map((p) => p.id)), [people]);

  const data = useMemo(
    () =>
      days.map((d) => {
        const seen = presentByDay.get(d.key);
        if (picked) {
          // Bitta shaxs: kelgan kun 100%, kelmagani 0%
          return { label: d.label, value: seen?.has(picked) ? 100 : 0 };
        }
        // Toifa: shu toifadagi nechta odam qayd etilgan
        let n = 0;
        if (seen) for (const id of seen) if (ids.has(id)) n++;
        return { label: d.label, value: people.length > 0 ? Math.round((n / people.length) * 100) : 0 };
      }),
    [days, presentByDay, picked, ids, people.length]
  );

  /** Ro'yxat — qidiruv bilan, har birida nechta kun kelgani. */
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return people
      .filter((p) => !needle || p.full_name.toLowerCase().includes(needle))
      .slice(0, MAX_ROWS)
      .map((p) => {
        let n = 0;
        for (const d of days) if (presentByDay.get(d.key)?.has(p.id)) n++;
        return { id: p.id, name: p.full_name, days: n };
      })
      // "Yomoni birinchi" — kam kelgani tepada
      .sort((a, b) => a.days - b.days);
  }, [people, q, days, presentByDay]);

  const pickedName = picked ? people.find((p) => p.id === picked)?.full_name : null;
  const loading = persons.isLoading || attendance.isLoading;

  return (
    <StatPanel
      title="Haftalik davomat dinamikasi"
      hint={pickedName ?? `${people.length} ta shaxs · so'nggi ${DAYS} kun`}
      className="min-h-0"
      bodyClass="grid min-h-0 grid-cols-[1fr_230px] gap-3"
    >
      {/* ── Diagramma ── */}
      <div className="flex min-h-[180px] flex-col">
        {picked && (
          <button
            type="button"
            onClick={() => setPicked(null)}
            className="mb-1 flex w-fit items-center gap-1 rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-slate-300 transition-colors hover:border-ice/40 hover:text-white"
          >
            <CaretLeft size={11} weight="bold" />
            Umumiy dinamikaga qaytish
          </button>
        )}
        <div className="min-h-0 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -26 }}>
              <defs>
                <linearGradient id="week-att" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34D399" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#34D399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(133,224,255,0.08)" vertical={false} />
              <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
              {/* Domen 0..100 QOTIRILGAN — foiz, avtomatik masshtab
                  kichik farqni "tog'" qilib ko'rsatardi */}
              <YAxis domain={[0, 100]} tick={AXIS} tickLine={false} axisLine={false} width={34} />
              <Tooltip
                cursor={{ stroke: "rgba(133,224,255,0.35)", strokeWidth: 1 }}
                contentStyle={{
                  background: "#0E1626",
                  border: "1px solid rgba(133,224,255,0.28)",
                  borderRadius: 8,
                  fontSize: 11,
                }}
                formatter={(v: number) => [`${v}%`, "Davomat"]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#34D399"
                strokeWidth={2}
                fill="url(#week-att)"
                dot={{ r: 2.5, fill: "#0B1220", stroke: "#34D399", strokeWidth: 1.5 }}
                activeDot={{ r: 4, fill: "#34D399" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Shaxslar ro'yxati — bosilsa o'shaning diagrammasi ── */}
      <div className="flex min-h-0 flex-col gap-1.5">
        <div className="hik-input flex h-7 flex-none items-center gap-1.5 px-2 text-[11px]">
          <MagnifyingGlass size={12} className="flex-none text-slate-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ism bo'yicha..."
            className="w-full bg-transparent text-slate-200 outline-none placeholder:text-slate-600"
          />
        </div>

        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-0.5">
          {loading && <p className="py-4 text-center text-[11px] text-slate-500">{t.common.loading}</p>}
          {!loading && rows.length === 0 && (
            <p className="flex flex-col items-center gap-1.5 py-6 text-center text-[11px] text-slate-500">
              <UsersThree size={22} weight="duotone" />
              Ro'yxat bo'sh
            </p>
          )}
          {rows.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setPicked(picked === r.id ? null : r.id)}
              title={`${r.name} — ${DAYS} kundan ${r.days} tasida kelgan`}
              className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors ${
                picked === r.id
                  ? "border-ice/60 bg-ice/[0.12]"
                  : "border-white/[0.06] bg-white/[0.02] hover:border-white/20"
              }`}
            >
              <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-slate-100">{r.name}</span>
              <span
                className="flex-none font-mono text-[10.5px] font-bold"
                style={{ color: r.days >= DAYS - 1 ? "#34D399" : r.days >= DAYS / 2 ? "#F59E0B" : "#FB7185" }}
              >
                {r.days}/{DAYS}
              </span>
            </button>
          ))}
        </div>
      </div>
    </StatPanel>
  );
}
