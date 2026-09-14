"use client";

import { motion } from "framer-motion";
import { Warning } from "@phosphor-icons/react";

/**
 * "SAQLANMAGAN MA'LUMOT BOR — chiqasizmi?" tasdig'i.
 *
 * Formali oynalarda ishlatiladi (`PersonFormModal`, `EnrollPerson`):
 * X, Esc, fon bosilishi va brauzerning **"◀ orqaga"** tugmasi — hammasi
 * shu oynaga olib keladi, ya'ni to'ldirilgan forma tasodifan yo'qolmaydi.
 *
 * ⚠️ Forma USTIDAN chiqadi (`z-[97]`), lekin uni bekitmaydi: foydalanuvchi
 * nimadan voz kechayotganini ko'rib turishi kerak.
 *
 * ⚠️ "◀ orqaga" bosilganda tarix yozuvi allaqachon QAYTA QO'YILGAN
 * (`lib/modalHistory.ts`) — ya'ni "Formaga qaytish" tanlansa tarix ham
 * joyida qoladi.
 */
export function UnsavedExitDialog({ onStay, onLeave }: { onStay: () => void; onLeave: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[97] grid place-items-center bg-[#03060E]/80 p-4 backdrop-blur-sm"
      onClick={(e) => {
        e.stopPropagation();
        onStay();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        role="alertdialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="hik-glass-blue w-[380px] max-w-full rounded-2xl border border-amber-400/30 bg-ink-panel p-5"
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid h-8 w-8 flex-none place-items-center rounded-lg bg-amber-400/15 text-amber-300">
            <Warning size={17} weight="duotone" />
          </span>
          <div className="min-w-0">
            <p className="text-[13.5px] font-bold text-white">Saqlanmagan ma&apos;lumot bor</p>
            <p className="mt-1 text-[11.5px] leading-snug text-slate-400">
              Forma to&apos;ldirilgan, lekin saqlanmadi. Chiqsangiz kiritilgan ma&apos;lumot
              yo&apos;qoladi.
            </p>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            autoFocus
            onClick={onStay}
            className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[12px] font-semibold text-slate-200 hover:bg-white/[0.12]"
          >
            Formaga qaytish
          </button>
          <button
            type="button"
            onClick={onLeave}
            className="rounded-lg border border-rose-400/40 bg-rose-500/15 px-3 py-1.5 text-[12px] font-semibold text-rose-200 hover:bg-rose-500/25"
          >
            Chiqish
          </button>
        </div>
      </motion.div>
    </div>
  );
}
