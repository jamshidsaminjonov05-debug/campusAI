/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  "ANIQLANGANLAR" YUQORI KPI — QOLGAN IKKITASI ("Xavf signali",        ║
 * ║  "Faol kameralar") uchun oyna                                        ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * 2026-09-08, foydalanuvchi so'rovi: "aniqlanganlardagi yuqori tablardagi
 * hamma cardlar bosilishi kerak". Birinchi ikki kartochka ("Tanlangan
 * davrda", "Tanilgan yuzlar") ALLAQACHON bor `TodayArrivalsModal`ni
 * ochadi (`DetectionsPage.tsx`ga qarang, `initialKnown` propi shu tufayli
 * qo'shildi). Qolgan ikkitasi uchun bu fayl:
 *
 * | Kartochka | Oyna | Manba |
 * |---|---|---|
 * | Xavf signali | `AlertKpiModal` | `arrivals.raw` dan `gun`/`janjal` (foydalanuvchi: "Xavfli signallarga janjal va qurol kiradi") |
 * | Faol kameralar | `CameraKpiModal` | `arrivals.byChannel` — ALLAQACHON hisoblangan, qo'shimcha so'rov YO'Q |
 *
 * Ikkalasi ham `DetectionsPage`da ALLAQACHON so'ralgan `arrivals`
 * (`useArrivals({from:dateFrom,to:dateTo})`) dan oziqlanadi — TANLANGAN
 * DAVRning O'ZIGA mos (sarlavhadagi sana filtriga qarab o'zgaradi),
 * muassasa/qidiruv filtriga esa BOG'LIQ EMAS — xuddi kartochkalarning
 * o'zidagi sonlar kabi (`DetKpi` "Xavf signali"/"Faol kameralar"
 * ATAYLAB shu ikkalasidan mustaqil, `DetectionsPage.tsx`dagi izohga
 * qarang).
 */
"use client";

import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { BoxingGlove, SecurityCamera, X } from "@phosphor-icons/react";
import { Pistol } from "@/components/common/PistolIcon";
import { useModalHistory } from "@/hooks/useModalHistory";
import { CameraQuickView } from "@/components/cameras/CameraQuickView";
import { EventDossier } from "@/components/detections/EventDossier";
import { cameraPlaceLabel } from "@/config/cameraPlacements";
import { nvrTime, type NvrEvent } from "@/lib/nvrApi";
import { NVR_COLOR } from "./DetectionCard";

/* ─────────────────────────── Umumiy qobiq ─────────────────────────── */

function Shell({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  /* ◀ "orqaga" avval shu oynani yopadi (`lib/modalHistory.ts`). */
  useModalHistory(onClose);
  if (typeof document === "undefined") return null;

  return createPortal(
    /* ⚠️ PORTAL SHART — "Aniqlanganlar" filtr panelida `backdrop-blur` bor,
       u `position: fixed` uchun yangi containing block yaratadi. */
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[86vh] w-[min(640px,96vw)] flex-col overflow-hidden rounded-2xl
                   border border-white/10 bg-[#0B1220] shadow-2xl"
      >
        <header className="flex flex-none items-start gap-3 border-b border-white/[0.08] px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-slate-500">Aniqlanganlar</p>
            <h3 className="truncate text-[16px] font-bold text-white">{title}</h3>
            {subtitle && <p className="mt-0.5 text-[10.5px] text-slate-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Yopish"
            className="grid h-7 w-7 flex-none place-items-center rounded-lg text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={14} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">{children}</div>
      </motion.div>
    </div>,
    document.body
  );
}

/* ─────────────────────────── Xavf signali ────────────────────────────
   "Xavfli" — foydalanuvchi ANIQ ta'riflagan: janjal va qurol. `smoking`
   ("chekish/telefon") va `face` ("begona shaxs") bu ro'yxatga KIRMAYDI —
   ular o'zicha kategoriya, "Xavf signali" kartochkasi esa kuzatuv posti `alert`
   emas, aynan shu ikkitasini sanaydi. */

const DANGER_CATEGORIES = new Set(["gun", "janjal"]);

/** "Xavf signali" KPI kartochkasi va oyna BIR XIL sonni ko'rsatsin —
 *  ikkalasi ham shu funksiyadan (`DetectionsPage.tsx` ham ishlatadi). */
export function isDangerEvent(ev: NvrEvent): boolean {
  return DANGER_CATEGORIES.has(ev.category);
}

export function AlertKpiModal({ events, onClose }: { events: NvrEvent[]; onClose: () => void }) {
  const [openId, setOpenId] = useState<number | null>(null);
  const danger = events.filter(isDangerEvent);

  return (
    <Shell
      title={`${danger.length} ta xavfli signal`}
      subtitle="Janjal va qurol — tanlangan davr. Qatorni bosing — hodisa tafsiloti ochiladi"
      onClose={onClose}
    >
      {danger.length === 0 ? (
        /* Nol o'rniga SABAB — bo'sh oyna nosozlik deb o'qilmasin */
        <p className="py-10 text-center text-[11.5px] leading-snug text-slate-500">
          Bu davrda janjal yoki qurol qayd etilmagan — bu yaxshi holat.
        </p>
      ) : (
        <ul className="space-y-1">
          {danger.map((ev) => {
            const Icon = ev.category === "gun" ? Pistol : BoxingGlove;
            const color = NVR_COLOR[ev.category] ?? "#F43F5E";
            return (
              <li key={ev.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(ev.id)}
                  className="flex w-full items-center gap-2.5 rounded-lg border px-2.5 py-1.5 text-left transition-colors"
                  style={{ borderColor: `${color}40`, background: `${color}0F` }}
                >
                  <Icon size={13} style={{ color }} className="flex-none" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-semibold text-slate-100">{ev.label}</span>
                    <span className="block truncate text-[9.5px] text-slate-500">
                      {cameraPlaceLabel(ev.channel, ev.camera)}
                    </span>
                  </span>
                  <span className="flex-none font-mono text-[10.5px] text-slate-400">{nvrTime(ev.time)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div onClick={(e) => e.stopPropagation()}>
        <EventDossier eventId={openId} onClose={() => setOpenId(null)} />
      </div>
    </Shell>
  );
}

/* ─────────────────────────── Faol kameralar ───────────────────────────
   Manba — `arrivals.byChannel` (`useTodayArrivals.ts`), ALLAQACHON
   hisoblangan: "shu davrda qaysi kameradan nechta odam o'tgan". Qator
   bosilsa kamerani JONLI ko'rish (`CameraQuickView`) ochiladi. */

export function CameraKpiModal({
  byChannel,
  onClose,
}: {
  byChannel: { channel: string; camera: string; people: number; events: number }[];
  onClose: () => void;
}) {
  const [camChannel, setCamChannel] = useState<string | null>(null);

  return (
    <Shell
      title={`${byChannel.length} ta faol kamera`}
      subtitle="Tanlangan davrda hodisa kelgan kanallar. Qatorni bosing — jonli oqim ochiladi"
      onClose={onClose}
    >
      {byChannel.length === 0 ? (
        <p className="py-10 text-center text-[11.5px] leading-snug text-slate-500">
          Bu davrda hech qaysi kameradan hodisa kelmadi.
        </p>
      ) : (
        <ul className="space-y-1">
          {byChannel.map((c) => (
            <li key={c.channel}>
              <button
                type="button"
                onClick={() => setCamChannel(c.channel)}
                className="flex w-full items-center gap-2.5 rounded-lg border border-white/[0.05] bg-white/[0.02]
                           px-2.5 py-1.5 text-left transition-colors hover:border-ice/30 hover:bg-ice/[0.06]"
              >
                <SecurityCamera size={14} weight="fill" className="flex-none text-amber-300" />
                <span className="min-w-0 flex-1 truncate text-[12px] text-slate-100">
                  {cameraPlaceLabel(c.channel, c.camera)}
                </span>
                <span className="flex-none font-mono text-[10.5px] text-slate-500">#{c.channel}</span>
                <span
                  title={`${c.events} qayd`}
                  className="flex-none rounded-md bg-emerald-400/15 px-1.5 py-0.5 font-mono text-[10.5px] font-bold text-emerald-300"
                >
                  {c.people}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div onClick={(e) => e.stopPropagation()}>
        <CameraQuickView channel={camChannel} onClose={() => setCamChannel(null)} />
      </div>
    </Shell>
  );
}
