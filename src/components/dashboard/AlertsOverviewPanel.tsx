"use client";

import { nvrEventLabel } from "@/lib/eventLabels";
import { useT } from "@/i18n";
import { useMemo, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, CaretLeft, CaretRight, Checks, X } from "@phosphor-icons/react";
import { useDetections } from "@/hooks/useDetections";
import { markSeen, seenVersion, subscribeSeen, unseenOf } from "@/lib/detectionSeen";
import { DetectionThumb } from "@/components/detections/DetectionThumb";
import { cameraPlaceLabel } from "@/config/cameraPlacements";
import { nvrTime, type NvrEvent } from "@/lib/nvrApi";
import { useAppStore } from "@/store/useAppStore";
import { DashPanel } from "./DashPanel";

/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  OGOHLANTIRISHLAR TAHLILI — xaritadan ochiladigan CHAP panel          ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * 2026-09-09, foydalanuvchi so'rovi (ikkinchi tur): "chap tomonda tursin,
 * ustiga chiqib ketsa ham bo'ladi o'quv muassalarining, keyin hodisalar
 * ustiga bosilsa o'ngda chiqib beradi hodisa tahlili".
 *
 * ⚠️ **QAYTA QURILDI** — ilgari bu panel `MapDetailOverlay`ning O'NG
 * slotida, "Batafsil ma'lumot" bilan BIR JOYDA edi va qator bosilganda
 * o'zi ICHIDA `EventDossier`ni ochardi. Endi:
 *   · panelning O'ZI — mustaqil, CHAP tomonda (`InstitutionsPanel`
 *     ustidan chiqishi mumkin — foydalanuvchi buni ATAYLAB so'ragan);
 *   · qatorga bosilsa dossiye BU YERDA ochilmaydi — `onSelectEvent(id)`
 *     chaqiriladi, `DashboardScreen` buni `MapDetailOverlay`ning O'NG
 *     slotiga (`eventDetailId`) uzatadi — natijada "hodisa tahlili"
 *     O'NGDA paydo bo'ladi (`EventAnalysisPanel.tsx`).
 *
 * ⚠️ **`alarmOnly` OLIB TASHLANDI** (2026-09-09, foydalanuvchi so'rovi:
 * "nega umuman ma'lumot kelmayabdi ... hamma alertlar chiqib berishi
 * kerak"). Sabab o'lchandi: hozir kuzatuv postida `gun`/`janjal` = **0** (butun
 * tarixda), `alert:true` bayrog'i esa deyarli hech qachon qo'yilmaydi
 * (`isAlarm()` faqat shu ikkitasiga tayanadi) — natijada `alarmOnly:true`
 * bilan ro'yxat DEYARLI DOIM bo'sh chiqardi, holbuki kunига mingdan ortiq
 * yuz hodisasi bor edi. Endi manba `useDetections({category:"all",
 * limit:100})` — **`RecentAlertsPanel` bilan boshqa kalit** (u hamon
 * `alarmOnly:true`, "Signallar" — faqat xavfli), bu panel esa "nima
 * sodir bo'lyapti" degan TO'LIQ manzarani beradi.
 *
 * Ro'yxat uzun bo'lishi mumkinligi uchun **sahifalash** qo'shildi
 * (`Pagination`, "Aniqlanganlar"dagi bilan bir xil komponent).
 */
const overlayVariants = {
  hidden: { opacity: 0, x: -36 },
  show: { opacity: 1, x: 0, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const } },
  exit: { opacity: 0, x: -36, transition: { duration: 0.18 } },
};

const LIMIT = 100;
/** Sahifada nechta qator — tor panelga mos. */
const PAGE_SIZE = 8;

export function AlertsOverviewPanel({
  open,
  onClose,
  onSelectEvent,
}: {
  open: boolean;
  onClose: () => void;
  /** Qator bosilganda — hodisa raqami shu yerga uzatiladi (o'ng panel ochadi). */
  onSelectEvent: (id: number) => void;
}) {
  const t = useT();
  const u = t.dashboard.ui;
  const setActivePage = useAppStore((s) => s.setActivePage);
  const [page, setPage] = useState(1);
  const q = useDetections({ category: "all", limit: LIMIT });

  /* Tasdiq reyestri React'dan tashqarida (`lib/detectionSeen.ts`,
     `localStorage`) — "Hammasini tozalash" bosilishi bilan ro'yxat
     DARHOL qisqarishi uchun unga obuna bo'lamiz (`AlertsPage.tsx` dagi
     bilan AYNI naqsh, `seenVersion` snapshot). */
  const seenTick = useSyncExternalStore(subscribeSeen, seenVersion, () => 0);

  /* "Kelgan" / "Tasdiqlangan" / "Tasdiqlanmagan" — AYNI reyestr
     (`lib/detectionSeen.ts`) "Ogohlantirishlar" bo'limi (`AlertsPage.tsx`)
     ishlatadigan bilan bir xil, faqat bu yerda ARRAY UZUNLIGIDAN
     hisoblanadi (server `total` filtrlanmagan "all" kategoriyaga tegishli
     bo'lgani uchun bu yerda ishlatilmaydi — chalkash son bermasin). */
  const pending = useMemo(
    () => unseenOf(q.events as NvrEvent[]),
    // `seenTick` — reyestr o'zgarganda qayta hisoblanadi
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q.events, seenTick]
  );
  const confirmed = q.events.length - pending.length;

  /* ⚠️ Ro'yxat FAQAT tasdiqlanmaganlarni ko'rsatadi ("Ogohlantirishlar"
     bo'limi — `AlertsPage.tsx` bilan AYNI mantiq): tasdiqlangan yozuv
     ro'yxatdan CHIQADI, "Hammasini tozalash" bosilsa panel bo'shab
     qoladi (2026-09-09, foydalanuvchi so'rovi: "bossam hamma alert
     yuqoladi"). Sahifalash shu (tasdiqlanmagan) ro'yxat bo'yicha. */
  const totalPages = Math.max(1, Math.ceil(pending.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const timeline = pending.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const clearAll = () => markSeen(pending.map((e) => String(e.id)));

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          variants={overlayVariants}
          initial="hidden"
          animate="show"
          exit="exit"
          className="absolute top-16 left-3 z-30 flex min-h-0 w-[330px] flex-col gap-2"
          style={{ height: "min(680px, calc(100% - 88px))" }}
        >
          <DashPanel
            title={u.alerts.title}
            subtitle={u.alerts.sub(q.total || q.events.length)}
            className="min-h-0 flex-1"
            surface="map-glass-card"
          >
            <div className="-mr-1.5 flex h-full min-h-0 flex-col gap-2.5 overflow-y-auto pr-1.5">
              <header className="flex flex-none items-center justify-between">
                <p className="text-[10px] leading-snug text-slate-500">{u.alerts.hint}</p>
                <button
                  type="button"
                  onClick={onClose}
                  title={t.common.close}
                  className="grid h-6 w-6 flex-none place-items-center rounded text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X size={14} />
                </button>
              </header>

              {/* KPI — kelgan / tasdiqlangan / tasdiqlanmagan */}
              <div className="grid flex-none grid-cols-3 gap-1.5">
                <MiniKpi label={u.alerts.kpiIn} value={q.events.length} tone="#8FB8FF" />
                <MiniKpi label={u.alerts.kpiConfirmed} value={confirmed} tone="#34D399" />
                <MiniKpi label={u.alerts.kpiPending} value={pending.length} tone="#F59E0B" />
              </div>

              {/* Vaqt bo'yicha ro'yxat — HODISALAR. Qator bosilsa dossiye BU
                  YERDA ochilmaydi — `onSelectEvent` orqali O'NG panelga
                  uzatiladi ("hodisa tahlili", foydalanuvchi so'rovi).
                  ⚠️ **`flex-1` YO'Q** (2026-09-09 da topilgan bug: bu
                  DIV allaqachon TASHQI `overflow-y-auto` konteyner
                  ICHIDA — `flex-1 min-h-0` bilan birga ishlatilsa,
                  ro'yxat o'zining kichraytirilgan flex-o'lchamidan
                  TOSHIB, pastdagi sahifalash va tugmalar USTIGA
                  bosib chiqardi (foydalanuvchi ekran suratida ko'rdi).
                  Bitta scroll — bitta o'lchash zanjiri: ichki flex-1
                  kerak emas. */}
              <div className="flex flex-col gap-1">
                {timeline.length === 0 ? (
                  <p className="py-4 text-center text-[11px] leading-snug text-slate-500">
                    {pending.length === 0 && q.events.length > 0
                      ? u.alerts.allConfirmed
                      : u.alerts.none}
                  </p>
                ) : (
                  timeline.map((ev) => (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => onSelectEvent(ev.id)}
                      title={u.alerts.analyze(nvrEventLabel(ev))}
                      className="flex w-full flex-none items-center gap-2 rounded-lg border border-rose-400/15 bg-rose-500/[0.05] px-2 py-1.5
                                 text-left transition-colors hover:border-rose-400/40 hover:bg-rose-500/[0.1]"
                    >
                      <DetectionThumb id={ev.id} className="h-8 w-8 flex-none rounded" alt="" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11px] font-medium text-slate-100">{nvrEventLabel(ev)}</span>
                        <span className="block truncate text-[9.5px] text-slate-500">
                          {cameraPlaceLabel(ev.channel, ev.camera)}
                        </span>
                      </span>
                      <span className="flex-none font-mono text-[10px] text-rose-300/80">{nvrTime(ev.time)}</span>
                    </button>
                  ))
                )}
              </div>

              {/* ⚠️ Umumiy `Pagination` (raqamli tugmalar) EMAS — 2026-09-09
                  da foydalanuvchi ekran suratida ko'rsatdi: panel FAQAT
                  330px, ko'p sahifa bo'lsa (12+) raqamlar sig'masdan
                  IKKINCHI qatorga tushib sinib qolardi. Bu yerda o'rniga
                  ixcham "‹ 3 / 12 ›" — kenglikdan qat'i nazar sig'adi. */}
              {totalPages > 1 && (
                <div className="mt-1 flex flex-none items-center justify-center gap-3">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    aria-label={u.prev}
                    title={u.prev}
                    className="grid h-7 w-7 flex-none place-items-center rounded-md border border-white/[0.08] bg-white/[0.05]
                               text-slate-300 transition-colors hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <CaretLeft size={14} />
                  </button>
                  <span className="font-mono text-[11px] text-slate-400">
                    {safePage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    aria-label={u.next}
                    title={u.next}
                    className="grid h-7 w-7 flex-none place-items-center rounded-md border border-white/[0.08] bg-white/[0.05]
                               text-slate-300 transition-colors hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <CaretRight size={14} />
                  </button>
                </div>
              )}

              {/* Umumiy statistika — to'liq "Ogohlantirishlar" bo'limiga o'tadi */}
              <button
                type="button"
                onClick={() => setActivePage("Ogohlantirishlar")}
                className="mt-1 flex flex-none items-center justify-center gap-1.5 rounded-lg border border-white/10
                           bg-white/[0.04] py-1.5 text-[11px] font-semibold text-slate-300 transition-colors
                           hover:border-ice/30 hover:text-ice-bright"
              >
                {u.alerts.stats}
                <ArrowRight size={12} weight="bold" />
              </button>

              {/* "HAMMASINI TOZALASH" — eng pastda (2026-09-09, foydalanuvchi
                  so'rovi: "eng pastida umumiy tozalash tugmasi tursin bossam
                  hamma alert yuqoladi"). Ko'rinayotgan (tasdiqlanmagan)
                  hammasini bir zumda tasdiqlaydi — ro'yxat bo'shab qoladi. */}
              <button
                type="button"
                disabled={pending.length === 0}
                onClick={clearAll}
                title={u.alerts.clearAllHint}
                className="flex flex-none items-center justify-center gap-1.5 rounded-lg border border-emerald-400/30
                           bg-emerald-400/10 py-1.5 text-[11px] font-semibold text-emerald-300 transition-colors
                           hover:bg-emerald-400/20 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-emerald-400/10"
              >
                <Checks size={13} weight="bold" />
                {u.alerts.clearAll}
              </button>
            </div>
          </DashPanel>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MiniKpi({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1.5">
      <p className="truncate text-[8.5px] font-semibold uppercase tracking-wide" style={{ color: tone }}>
        {label}
      </p>
      <p className="truncate font-mono text-[15px] font-bold leading-tight text-white">{value}</p>
    </div>
  );
}
