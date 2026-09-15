/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  "ANIQLANGANLAR" YUQORI KPI — QOLGAN IKKITASI ("Xavf signali",        ║
 * ║  "Faol kameralar") uchun oyna                                        ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * 2026-09-08, foydalanuvchi so'rovi: "aniqlanganlardagi yuqori tablardagi
 * hamma cardlar bosilishi kerak". Birinchi ikki kartochka ("Tanlangan
 * davrda", "Tanilgan yuzlar") ALLAQACHON bor `TodayArrivalsModal`ni
 * ochadi (`DetectionsPage.tsx`ga qarang). Qolgan ikkitasi uchun bu fayl:
 *
 * | Kartochka | Oyna | Manba |
 * |---|---|---|
 * | Xavf signali | `AlertKpiModal` | O'ZI so'raydi: `janjal` + `gun` ro'yxati, SAHIFALAB ko'rsatiladi |
 * | Faol kameralar | `CameraKpiModal` | `GET /events/stats` `by_channel` — qo'shimcha so'rov YO'Q |
 *
 * 🔴 **2026-09-15 dan manba o'zgardi.** Ilgari ikkalasi ham `useArrivals()`
 * ning XOM ro'yxatidan oziqlanardi: sahifa tanlangan davrni 100 tadan
 * 30+3 so'rov qilib o'qirdi va baribir 3 000 yozuvda to'xtab, eski
 * janjal/qurolni ko'rmay qolardi. Endi sonlar server hisobidan
 * (`useEventStats`), ro'yxat esa FAQAT oyna ochilganda va faqat kerakli
 * ikki kategoriyadan olinadi.
 */
"use client";

import { useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { BoxingGlove, CaretLeft, CaretRight, SecurityCamera, X } from "@phosphor-icons/react";
import { Pistol } from "@/components/common/PistolIcon";
import { useModalHistory } from "@/hooks/useModalHistory";
import { CameraQuickView } from "@/components/cameras/CameraQuickView";
import { EventDossier } from "@/components/detections/EventDossier";
import { cameraPlaceLabel } from "@/config/cameraPlacements";
import { NVR_MAX_LIMIT, listEvents, nvrTime, type NvrEvent } from "@/lib/nvrApi";
import { NVR_COLOR } from "./DetectionCard";

/* ─────────────────────────── Umumiy qobiq ─────────────────────────── */

function Shell({
  title,
  subtitle,
  onClose,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  /** Pastki qator — sahifalagich uchun. */
  footer?: ReactNode;
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
        {footer && <footer className="flex-none border-t border-white/[0.08] px-3 py-2">{footer}</footer>}
      </motion.div>
    </div>,
    document.body
  );
}

/** Ixcham sahifalagich — "◀ 2 / 5 ▶". Bitta sahifa bo'lsa chizilmaydi. */
function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null;
  const btn =
    "grid h-7 w-7 place-items-center rounded-lg border border-white/10 text-slate-300 transition-colors hover:border-ice/30 hover:text-white disabled:opacity-30";
  return (
    <div className="flex items-center justify-center gap-2 font-mono text-[11px] text-slate-400">
      <button type="button" className={btn} disabled={page <= 1} onClick={() => onPage(page - 1)} title="Oldingi">
        <CaretLeft size={12} weight="bold" />
      </button>
      <span>
        {page} / {pages}
      </span>
      <button type="button" className={btn} disabled={page >= pages} onClick={() => onPage(page + 1)} title="Keyingi">
        <CaretRight size={12} weight="bold" />
      </button>
    </div>
  );
}

/* ─────────────────────────── Xavf signali ────────────────────────────
   "Xavfli" — foydalanuvchi ANIQ ta'riflagan: janjal va qurol. `smoking`
   ("chekish/telefon") va `face` ("begona shaxs") bu ro'yxatga KIRMAYDI. */

const DANGER_CATEGORIES = new Set(["gun", "janjal"]);

/** "Xavf signali" ta'rifi — boshqa joylar ham shu funksiyadan foydalansin. */
export function isDangerEvent(ev: NvrEvent): boolean {
  return DANGER_CATEGORIES.has(ev.category);
}

/** Oynadagi bitta sahifa. */
const ALERT_PAGE = 20;

export function AlertKpiModal({
  from,
  to,
  onClose,
}: {
  /** Sahifaning sana filtri (`YYYY-MM-DD`; bo'sh — butun tarix). */
  from?: string;
  to?: string;
  onClose: () => void;
}) {
  const [openId, setOpenId] = useState<number | null>(null);
  const [page, setPage] = useState(1);

  /* Janjal va qurol KAM uchraydi (o'lchandi: butun tarixda 4 va 0), ya'ni
     har biri bitta so'rovga (`limit=500`) sig'adi. Ikki kategoriya bitta
     vaqt tartibida birlashtiriladi, keyin SAHIFALAB ko'rsatiladi. */
  const q = useQuery({
    queryKey: ["nvr-danger-list", from ?? "", to ?? ""],
    queryFn: async () => {
      const pages = await Promise.all(
        (["janjal", "gun"] as const).map((c) =>
          listEvents(c, { limit: NVR_MAX_LIMIT, date_from: from, date_to: to }).catch(() => null)
        )
      );
      const events = pages.flatMap((p) => p?.events ?? []);
      events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
      return { events, total: pages.reduce((s, p) => s + (p?.total ?? 0), 0) };
    },
    staleTime: 45_000,
  });

  const danger = useMemo(() => q.data?.events ?? [], [q.data]);
  const total = q.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(danger.length / ALERT_PAGE));
  const safePage = Math.min(page, pages);
  const rows = danger.slice((safePage - 1) * ALERT_PAGE, safePage * ALERT_PAGE);

  return (
    <Shell
      title={q.isLoading ? "Xavfli signallar…" : `${total} ta xavfli signal`}
      subtitle="Janjal va qurol — tanlangan davr. Qatorni bosing — hodisa tafsiloti ochiladi"
      onClose={onClose}
      footer={pages > 1 ? <Pager page={safePage} pages={pages} onPage={setPage} /> : undefined}
    >
      {q.isLoading ? (
        <p className="py-10 text-center text-[11.5px] text-slate-500">Yuklanmoqda…</p>
      ) : danger.length === 0 ? (
        /* Nol o'rniga SABAB — bo'sh oyna nosozlik deb o'qilmasin */
        <p className="py-10 text-center text-[11.5px] leading-snug text-slate-500">
          Bu davrda janjal yoki qurol qayd etilmagan — bu yaxshi holat.
        </p>
      ) : (
        <ul className="space-y-1">
          {rows.map((ev) => {
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
      {/* Kategoriya 500 dan oshsa — jim qirqilmaydi */}
      {total > danger.length && (
        <p className="px-2 pt-2 text-[10px] text-slate-500">
          Oxirgi {danger.length} tasi ko&apos;rsatilmoqda; jami — {total}.
        </p>
      )}

      <div onClick={(e) => e.stopPropagation()}>
        <EventDossier eventId={openId} onClose={() => setOpenId(null)} />
      </div>
    </Shell>
  );
}

/* ─────────────────────────── Faol kameralar ───────────────────────────
   Manba — `GET /events/stats` `by_channel` (server hisobi): "shu davrda
   qaysi kameradan nechta qayd kelgan". Qator bosilsa kamerani JONLI
   ko'rish (`CameraQuickView`) ochiladi. */

export function CameraKpiModal({
  byChannel,
  onClose,
}: {
  byChannel: { channel: string; camera: string; total: number }[];
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
                  title={`${c.total} qayd`}
                  className="flex-none rounded-md bg-emerald-400/15 px-1.5 py-0.5 font-mono text-[10.5px] font-bold text-emerald-300"
                >
                  {c.total}
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
