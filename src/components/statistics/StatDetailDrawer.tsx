"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "@phosphor-icons/react";
import { useModalHistory } from "@/hooks/useModalHistory";

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
  if (typeof document === "undefined") return null;
  /* 🔴 2026-10-26 — PORTAL + NOSHAFFOF SIRT (foydalanuvchi: "o'qib bo'lmayabdi").
     Panel `fixed z-[70]` edi, lekin `StatOverview` ichida — `StatPanel`lar
     `motion.section` (transform/opacity) bo'lgani uchun uning z-index'i o'sha
     konteynerga qamalib, sahifa sarlavhasi ("Tizim holati") va KPI
     kartochkalari panel USTIDAN chiqardi; ustiga sirt `/92` shaffof edi.
     Endi `document.body`ga chiqadi (boshqa oynalar bilan AYNI qoida) va sirt
     `bg-[#0B1220]` — to'liq noshaffof, yorug' mavzuda oqaradi (index.css
     "Modal / panel sirtlari" ro'yxati). */
  /* 🔵 2026-10-26 — O'NG PANEL → MARKAZDAGI ODDIY MODAL (foydalanuvchi:
     "bosganda o'ng tomonda chiqadigan hamma modallardagi ma'lumotlar markazda
     oddiy modal holatida chiqishi kerak"). Mazmun (`detail.body`) va
     chaqiruvchilar (`onOpenDetail`) O'ZGARMADI — faqat qobiq: qoraytirilgan
     fon, markazda karta, fon bosilsa / Esc / ◀ orqaga — yopiladi. */
  return createPortal(
    <AnimatePresence>
      {detail && (
        <motion.div
          key={detail.key}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <DetailCard detail={detail} onClose={onClose} />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

function DetailCard({ detail, onClose }: { detail: StatDetailContent; onClose: () => void }) {
  /* ◀ "orqaga" avval shu oynani yopadi (`lib/modalHistory.ts`). */
  useModalHistory(onClose);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      onClick={(e) => e.stopPropagation()}
      className="relative flex max-h-[86vh] w-[min(640px,96vw)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0B1220] shadow-2xl"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent" />
      <div className="flex flex-none items-center gap-2 border-b border-white/[0.08] px-4 py-3">
        <span className="min-w-0 flex-1 truncate text-[15px] font-bold" style={{ color: detail.tone ?? "#fff" }}>
          {detail.title}
        </span>
        <button
          type="button"
          onClick={onClose}
          title="Yopish"
          className="grid h-7 w-7 flex-none place-items-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X size={14} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">{detail.body}</div>
    </motion.div>
  );
}
