"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "@phosphor-icons/react";

/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  YAGONA O'NG PANEL — Statistika → Umumiy diagrammalari uchun          ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * 🔴 **QAYTA QURILDI** (2026-09-10, foydalanuvchi so'rovi: "davr kesimida
 * bitta bosilganda davr kesimidan yon panel ochilyabdi, bizga umumiy
 * bitta yon panel ochilishi kerak — hammasiga alohida emas"). Ilgari HAR
 * BIR diagramma (`StatPeriodPanel`ning ikkalasi, `StatOverview`ning
 * "Davomat dinamikasi"/"Kayfiyat taqsimoti", `StatDensity`) o'z ICHIDA
 * chart+karta qatorini bo'lib, o'zining kichik kartasini chizardi — 5 ta
 * mustaqil panel, har biri chartni SIQARDI. Endi bitta umumiy panel
 * (shu fayl) `StatOverview.tsx`da BIR MARTA render qilinadi, qolgan
 * diagrammalar esa `onOpenDetail(content)` chaqiruv orqali unga
 * mazmun yuboradi — chartlarning o'zi endi SIQILMAYDI (kartaga joy
 * bo'shatib bermaydi), panel esa `fixed` bilan sahifa USTIDA, o'ng
 * tomondan suzib chiqadi.
 */
export interface StatDetailContent {
  /** AnimatePresence key — boshqa diagramma bosilsa panel QAYTA suzib kirsin. */
  key: string;
  title: ReactNode;
  tone?: string;
  body: ReactNode;
}

export function StatDetailDrawer({ detail, onClose }: { detail: StatDetailContent | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {detail && (
        <motion.div
          key={detail.key}
          initial={{ opacity: 0, x: 56 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 56 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="fixed right-4 top-24 z-[70] flex max-h-[calc(100vh-140px)] w-[360px] max-w-[92vw] flex-col overflow-hidden rounded-2xl border border-cyan-400/25 bg-[#0A1424]/92 shadow-[0_0_40px_-8px_rgba(34,211,238,0.4),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent" />
          <div className="flex flex-none items-center gap-2 border-b border-white/[0.06] px-4 py-3">
            <span className="min-w-0 flex-1 truncate text-[13px] font-bold" style={{ color: detail.tone ?? "#fff" }}>
              {detail.title}
            </span>
            <button
              type="button"
              onClick={onClose}
              title="Yopish"
              className="grid h-7 w-7 flex-none place-items-center rounded-full border border-white/10 bg-white/[0.05] text-slate-300 transition-colors hover:border-cyan-400/40 hover:text-cyan-200"
            >
              <X size={13} weight="bold" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">{detail.body}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
