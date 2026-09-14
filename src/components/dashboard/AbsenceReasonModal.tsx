/**
 * Kelmaganlar ro'yxati va SABABNI BELGILASH oynasi.
 *
 * Sabab tizimda hisoblanmaydi — uni mas'ul xodim kiritadi (`lib/absenceReasons.ts`).
 * Oyna shuni ochiq yozadi: belgilanmagan yozuv "aniqlanmagan" bo'lib qoladi va
 * taxtada alohida rangda turadi — "sababsiz" deb noto'g'ri o'qilmasin.
 *
 * ⚠️ **PORTAL SHART.** Oyna davomat taxtasi ichidan chaqiriladi, taxta esa
 * `.dv-panel` (`backdrop-filter` + `contain: layout`). Ikkalasi ham `position:
 * fixed` avlodlar uchun containing block yaratadi — portalsiz modal ekranga
 * emas, PANEL qutisiga nisbatan joylashib, qirqilib qolardi. Shu sabab
 * `createPortal(..., document.body)`.
 */
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import { useT } from "@/i18n";
import type { PersonType } from "@/lib/api";
import type { PersonBrief } from "@/lib/studentStats";
import { useModalHistory } from "@/hooks/useModalHistory";
import {
  ABSENCE_CODES,
  clearReason,
  getReason,
  setReason,
  type AbsenceCode,
} from "@/lib/absenceReasons";

/** Modalda bir vaqtda ko'rsatiladigan maksimal qator — yuqoridagi izohga qarang. */
const MAX_ROWS = 60;

export function AbsenceReasonModal({
  type,
  date,
  absentees,
  onClose,
}: {
  type: PersonType;
  date: string;
  absentees: PersonBrief[];
  onClose: () => void;
}) {
  /* ◀ "orqaga" avval SHU oynani yopadi (`lib/modalHistory.ts`). */
  useModalHistory(onClose);
  const t = useT();
  const [query, setQuery] = useState("");
  /** Reyestr o'zgarishini shu hisoblagich orqali qayta o'qiymiz (store
   *  `useSyncExternalStore` bilan taxtani ham yangilaydi). */
  const [tick, setTick] = useState(0);

  /* ⚠️ **RO'YXAT CHEGARALANGAN.** Har bir qator ichida tanlagich va izoh
     maydoni bor (`AbsentRow`), ya'ni qator "og'ir". Davomat qaydi hali
     kelmagan kunda esa BUTUN ro'yxat kelmagan hisoblanadi — 1 000
     o'quvchi import qilinsa modal 1 000 ta shunday qatorni chizib,
     ochilishda muzlab qolardi. Qidiruv butun ro'yxat bo'yicha ishlaydi,
     ya'ni kerakli odam baribir topiladi. */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return absentees.filter(
      (p) => !q || p.name.toLowerCase().includes(q) || p.group.toLowerCase().includes(q)
    );
  }, [absentees, query]);
  const rows = useMemo(() => filtered.slice(0, MAX_ROWS), [filtered]);
  const hiddenCount = filtered.length - rows.length;

  const marked = useMemo(
    () => absentees.filter((p) => getReason(date, p.id) !== null).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [absentees, date, tick]
  );

  // Esc bilan yopish — modal odatiy xatti-harakati
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // SSR'da `document` yo'q — portal faqat brauzerda
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-black/60 p-6 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        /* 🔵 NEON QAYTA DIZAYN (2026-09-10) — ilgari `nexa-card` edi. */
        className="neon-modal flex max-h-[80vh] w-full max-w-3xl flex-col overflow-hidden"
      >
        <header className="flex flex-none items-center gap-3 border-b border-white/[0.08] px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold text-white">{t.board.modal.title(t.board.type[type])}</p>
            <p className="text-[10.5px] text-slate-500">
              {t.board.modal.progress(marked, absentees.length)} · {date}
            </p>
          </div>
          <div className="flex-1" />
          <div className="hik-input flex items-center gap-2 px-2.5 py-1.5">
            <MagnifyingGlass size={13} className="flex-none text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.stats.searchPerson}
              className="w-[180px] bg-transparent text-[11.5px] text-slate-100 outline-none placeholder:text-slate-600"
            />
          </div>
          <button type="button" onClick={onClose} title={t.common.close} className="neon-icon-btn h-8 w-8">
            <X size={15} weight="bold" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {rows.length === 0 ? (
            <p className="py-8 text-center text-[12px] text-emerald-300/80">{t.board.noAbsent}</p>
          ) : (
            <table className="w-full border-collapse text-[11.5px]">
              <thead className="text-[9.5px] uppercase tracking-wide text-slate-500">
                <tr className="border-b border-white/[0.08]">
                  <th className="px-2 py-1.5 text-left font-medium">{t.stats.people.col.name}</th>
                  <th className="px-2 py-1.5 text-left font-medium">{t.stats.people.col.group}</th>
                  <th className="px-2 py-1.5 text-left font-medium">{t.board.modal.reason}</th>
                  <th className="px-2 py-1.5 text-left font-medium">{t.board.modal.note}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <AbsentRow key={p.id} person={p} date={date} onChange={() => setTick((n) => n + 1)} />
                ))}
              </tbody>
            </table>
          )}
          {hiddenCount > 0 && (
            <p className="px-2 py-2.5 text-center text-[10.5px] text-slate-500">
              {t.board.modal.moreHidden(hiddenCount)}
            </p>
          )}
        </div>

        <footer className="flex-none border-t border-white/[0.08] px-4 py-2.5">
          <p className="text-[10.5px] leading-snug text-slate-500">{t.board.modal.hint}</p>
        </footer>
      </motion.div>
    </div>,
    document.body
  );
}

function AbsentRow({
  person,
  date,
  onChange,
}: {
  person: PersonBrief;
  date: string;
  onChange: () => void;
}) {
  const t = useT();
  const current = getReason(date, person.id);
  const [note, setNote] = useState(current?.note ?? "");

  const change = (value: string) => {
    if (!value) clearReason(date, person.id);
    else setReason(date, person.id, value as AbsenceCode, note || undefined);
    onChange();
  };

  const saveNote = () => {
    // Izoh faqat sabab tanlangan bo'lsa saqlanadi — izohsiz kod ma'nosiz
    if (current) setReason(date, person.id, current.code, note || undefined);
    onChange();
  };

  return (
    <tr className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.035]">
      <td className="px-2 py-1.5 font-semibold text-slate-100">{person.name}</td>
      <td className="px-2 py-1.5 text-slate-400">{person.group}</td>
      <td className="px-2 py-1.5">
        <select
          value={current?.code ?? ""}
          onChange={(e) => change(e.target.value)}
          className={`hik-input cursor-pointer px-2 py-1 text-[11px] [color-scheme:dark] [&_option]:bg-ink-panel [&_option]:text-slate-100 ${
            current?.code === "unexcused" ? "text-rose-300" : current ? "text-emerald-300" : "text-slate-400"
          }`}
        >
          <option value="">{t.board.modal.unset}</option>
          {ABSENCE_CODES.map((c) => (
            <option key={c} value={c}>
              {t.board.code[c]}
            </option>
          ))}
        </select>
      </td>
      <td className="px-2 py-1.5">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={saveNote}
          disabled={!current}
          placeholder={t.board.modal.notePlaceholder}
          className="hik-input w-full px-2 py-1 text-[11px] text-slate-200 placeholder:text-slate-600 disabled:opacity-40"
        />
      </td>
    </tr>
  );
}
