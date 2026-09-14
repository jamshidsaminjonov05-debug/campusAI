import { useMemo } from "react";
import { motion } from "framer-motion";
import { Info, ShieldWarning, Smiley } from "@phosphor-icons/react";
import { useT } from "@/i18n";
import { useStudentDay } from "@/hooks/useStudentDay";
import type { PersonOut } from "@/lib/api";
import { slotTime } from "@/config/lessons";
import { buildMoodDay, type MoodGroup } from "@/lib/moodTimeline";

const GROUP_COLOR: Record<MoodGroup, string> = {
  positive: "#34D399",
  neutral: "#85E0FF",
  negative: "#FB7185",
};

/** Shundan past e'tibor — diqqat qaratish kerak. */
const LOW_ATTENTION = 55;

/**
 * Kun davomidagi kayfiyat va DARS KESIMIDAGI e'tibor.
 *
 * ⚠️ MUHIM: "e'tibor" — HOSILA ko'rsatkich, o'lchov EMAS. Tizimda diqqatni
 * o'lchaydigan sensor yo'q; qiymat kayfiyat aralashmasidan hisoblanadi
 * (`lib/moodTimeline.ts`). Panel buni ochiq yozadi, chunki uni "o'quvchi
 * darsni tinglayaptimi" deb talqin qilish noto'g'ri xulosaga olib keladi.
 *
 * Agressiya — QOIDA: yorliqda g'azab so'zi yoki qisqa oraliqda ketma-ket
 * salbiy qayd. Aniqlansa panel tepasida qizil ogohlantirish chiqadi.
 */
export function PersonMood({ person, date }: { person: PersonOut; date?: string }) {
  const t = useT();
  /* Sana berilmasa — bugun (avvalgi xatti-harakat saqlanadi). */
  const src = useStudentDay(person.person_type, date);

  const records = useMemo(
    () => src.records.filter((r) => r.person_id === person.id),
    [src.records, person.id]
  );
  const mood = useMemo(() => buildMoodDay(records), [records]);

  if (!mood.hasData) {
    return (
      <section className="hik-glass-blue rounded-2xl px-3.5 py-3">
        <p className="mb-1 text-[10px] uppercase tracking-wider text-ice-cyan/70">{t.people.mood.title}</p>
        <p className="text-[11.5px] text-slate-500">{t.people.mood.empty}</p>
      </section>
    );
  }

  const total = mood.positive + mood.neutral + mood.negative;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  return (
    <section className="hik-glass-blue flex flex-col gap-2.5 rounded-2xl px-3.5 py-3">
      <header className="flex items-center gap-2">
        <Smiley size={13} className="text-ice-cyan" />
        <p className="text-[10px] uppercase tracking-wider text-ice-cyan/70">{t.people.mood.title}</p>
        <span className="ml-auto font-mono text-[11px] text-slate-300">
          {t.people.mood.attention}: <b style={{ color: mood.attention < LOW_ATTENTION ? "#F59E0B" : "#34D399" }}>{mood.attention}%</b>
        </span>
      </header>

      {/* ── AGRESSIYA OGOHLANTIRISHI ── */}
      {mood.aggressive && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2"
        >
          <ShieldWarning size={15} className="mt-0.5 flex-none animate-pulse text-rose-400" />
          <div className="min-w-0">
            <p className="text-[11.5px] font-bold text-rose-200">
              {t.people.mood.aggressive(mood.aggressiveAt ?? "—")}
            </p>
            <p className="mt-0.5 text-[10px] leading-snug text-rose-200/70">
              {mood.aggressiveReason === "label"
                ? t.people.mood.reasonLabel
                : t.people.mood.reasonStreak}
            </p>
          </div>
        </motion.div>
      )}

      {/* ── Kun bo'yicha kayfiyat ulushi ── */}
      <div>
        <div className="flex h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
          {(["positive", "neutral", "negative"] as MoodGroup[]).map((g) => {
            const n = g === "positive" ? mood.positive : g === "neutral" ? mood.neutral : mood.negative;
            if (n === 0) return null;
            return (
              <motion.span
                key={g}
                initial={{ width: 0 }}
                animate={{ width: `${pct(n)}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                style={{ background: GROUP_COLOR[g] }}
                title={`${n}`}
              />
            );
          })}
        </div>
        <div className="mt-1 flex gap-3 text-[9.5px] text-slate-400">
          <span><i className="mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: GROUP_COLOR.positive }} />{t.chart.positive} {pct(mood.positive)}%</span>
          <span><i className="mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: GROUP_COLOR.neutral }} />{t.chart.neutral} {pct(mood.neutral)}%</span>
          <span><i className="mr-1 inline-block h-1.5 w-1.5 rounded-full align-middle" style={{ background: GROUP_COLOR.negative }} />{t.chart.negative} {pct(mood.negative)}%</span>
        </div>
      </div>

      {/* ── Dars kesimida e'tibor ── */}
      <div>
        <p className="mb-1.5 text-[9.5px] uppercase tracking-wider text-slate-500">{t.people.mood.byLesson}</p>
        {mood.lessons.length === 0 ? (
          <p className="text-[11px] text-slate-500">{t.people.mood.noLessons}</p>
        ) : (
          <div className="space-y-1.5">
            {mood.lessons.map((l) => (
              <div key={l.slot.n} className="flex items-center gap-2.5">
                <span className="w-[86px] flex-none truncate text-[11px] text-slate-300">
                  {l.slot.subject ?? t.people.mood.lessonN(l.slot.n)}
                </span>
                <span className="w-[76px] flex-none font-mono text-[9.5px] text-slate-500">
                  {slotTime(l.slot.from)}–{slotTime(l.slot.to)}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${l.attention}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{ background: l.aggressive ? "#FB7185" : l.attention < LOW_ATTENTION ? "#F59E0B" : "#34D399" }}
                  />
                </div>
                <span className="w-8 flex-none text-right font-mono text-[10.5px] text-slate-400">{l.attention}%</span>
                {l.aggressive && <ShieldWarning size={11} className="flex-none text-rose-400" />}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ko'rsatkich qanday hisoblangani — talqin xatosining oldini oladi */}
      <p className="flex items-start gap-1.5 border-t border-white/[0.06] pt-2 text-[9.5px] leading-snug text-slate-500">
        <Info size={11} className="mt-px flex-none" />
        {t.people.mood.derivedHint}
      </p>
    </section>
  );
}
