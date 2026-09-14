"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { ImageBroken, MagnifyingGlass, UserFocus, X } from "@phosphor-icons/react";
import { DetectionThumb } from "@/components/detections/DetectionThumb";
import { EventDossier } from "@/components/detections/EventDossier";
import { useFaces } from "@/hooks/useFaces";
import { ARRIVAL_PERIODS, periodRange } from "@/hooks/useTodayArrivals";
import { nvrDateTime, nvrTime } from "@/lib/nvrApi";
import { cameraPlaceLabel } from "@/config/cameraPlacements";
import { TabPill } from "@/components/common/panels";
import { useModalHistory } from "@/hooks/useModalHistory";
import { useViewMode, ViewToggle } from "@/components/common/ViewToggle";
import type { NvrFaceRow } from "@/lib/nvrApi";

/**
 * KAMERAGA TUSHGAN ODAMLAR — to'liq ro'yxat.
 *
 * Manba — **`GET /api/v1/faces`** (`FRONTEND.md` 5-C): bitta so'rov,
 * server odamlarni O'ZI yig'adi (bir odamning bir necha `face_id` si
 * `face_ids` ga birlashadi) va kamera kesimini ham beradi.
 *
 * ⚠️ Ilgari bu oyna kunning barcha hodisalarini sahifama-sahifa o'qib
 * (11 ta so'rov), `face_id` larni klientda to'plamga yig'ardi. Server
 * birlashtirishni o'zi qilgani uchun uning soni ANIQROQ — bugungi kun
 * uchun klient 640, server 620 bergan (o'lchandi 2026-09-02).
 *
 * ⚠️ Ko'pchilik odamning ISMI YO'Q va bu NORMAL: yuz bazasi deyarli bo'sh
 * (1119 odamdan atigi 2 tasi tanish). Bunday yozuv shaxs RAQAMI bilan
 * ko'rsatiladi — u bir odamga doim bir xil beriladi (5-B).
 *
 * ⚠️ `has_picture: false` bo'lsa `<img>` CHIZILMAYDI — qurilmada bu
 * odamning birorta rasmi qolmagan (5-D), so'ralsa 404 keladi.
 */
export function TodayArrivalsModal({
  onClose,
  title = "Kameraga tushgan odamlar",
  initialPeriod = "today",
  initialKnown = "all",
}: {
  onClose: () => void;
  title?: string;
  /** Boshlang'ich davr — `ARRIVAL_PERIODS` id'si. */
  initialPeriod?: string;
  /**
   * Boshlang'ich Tanish/Notanish filtri (2026-09-08, foydalanuvchi
   * so'rovi: "Aniqlanganlar"dagi "Tanilgan yuzlar" kartochkasi bosilsa
   * oyna HAMMASINI ko'rsatardi — sarlavhaga zid edi). Foydalanuvchi
   * ichkarida baribir istalgan tabga o'tishi mumkin — bu faqat
   * BOSHLANG'ICH holat.
   */
  initialKnown?: "all" | "yes" | "no";
}) {
  /* ◀ "orqaga" avval SHU oynani yopadi (`lib/modalHistory.ts`). */
  useModalHistory(onClose);
  const [periodId, setPeriodId] = useState(initialPeriod);
  const [q, setQ] = useState("");
  const [known, setKnown] = useState<"all" | "yes" | "no">(initialKnown);
  /* Bosilgan yozuvning MA'LUMOTLARI — "Aniqlanganlar" dagi bilan ayni oyna. */
  const [openId, setOpenId] = useState<number | null>(null);
  /** Ro'yxat/kartochka — `AttendanceListModal`dagi bilan AYNI naqsh (2026-09-11). */
  const [viewMode, setViewMode] = useViewMode("arrivals-list", "card");

  const range = periodRange(periodId);
  /* Qidiruv va filtr SERVERGA yuboriladi — ro'yxat mingdan uzun bo'lishi
     mumkin, uni klientga tortib filtrlashning ma'nosi yo'q. */
  const a = useFaces({
    /* ⚠️ `/faces` `date_from`/`date_to` KUTADI, `periodRange` esa
       `from`/`to` beradi. `{...range}` bilan uzatilganda server notanish
       kalitlarni jimgina tashlab yuborardi — ya'ni yuqoridagi davr
       tanlovi (Bugun / 7 kun / 30 kun) HECH NARSA QILMASDI, ro'yxat doim
       butun tarixni ko'rsatardi (AI tahlil va Geo Analitikada ham AYNI
       xato bor edi). */
    date_from: range.from,
    date_to: range.to,
    limit: 100,
    sort: "last_seen",
    search: q.trim() || undefined,
    known: known === "all" ? undefined : known,
  });

  const KNOWN_TABS = [
    { id: "all", label: "Hammasi" },
    { id: "yes", label: "Tanish" },
    { id: "no", label: "Notanish" },
  ] as const;

  const body = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[80] grid place-items-center bg-[#03060E]/85 p-4 backdrop-blur-sm"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="geo-strip-card flex max-h-[88vh] w-[min(1180px,95vw)] flex-col overflow-hidden rounded-2xl"
      >
        <header className="flex flex-none flex-wrap items-center gap-3 border-b border-white/[0.08] px-4 py-3">
          <span className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-emerald-400/15 text-emerald-300">
            <UserFocus size={17} weight="fill" />
          </span>
          <span className="min-w-0">
            <b className="block text-[13px] font-bold text-slate-100">{title}</b>
            <i className="block font-mono text-[10px] not-italic text-slate-500">
              {a.total} odam · {a.known} tanish · {a.unknown} notanish
            </i>
          </span>

          <div className="ml-auto flex flex-none flex-wrap items-center gap-1.5">
            {ARRIVAL_PERIODS.map((p) => (
              <TabPill key={p.id} group="arrivals-period" active={periodId === p.id} onClick={() => setPeriodId(p.id)}>
                {p.label}
              </TabPill>
            ))}
            <span className="mx-1 h-5 w-px bg-white/12" />
            {KNOWN_TABS.map((k) => (
              <TabPill key={k.id} group="arrivals-known" active={known === k.id} onClick={() => setKnown(k.id)}>
                {k.label}
              </TabPill>
            ))}
          </div>

          <label className="flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.04] px-2">
            <MagnifyingGlass size={13} className="text-slate-500" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ism bo'yicha"
              className="h-8 w-[160px] bg-transparent text-[11.5px] text-slate-100 outline-none placeholder:text-slate-600"
            />
          </label>

          <ViewToggle mode={viewMode} onChange={setViewMode} />

          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Yopish">
            <X size={17} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {a.isLoading ? (
            <div className="grid h-40 place-items-center">
              <span className="h-7 w-7 animate-spin rounded-full border-2 border-ice/40 border-t-ice" />
            </div>
          ) : a.faces.length === 0 ? (
            <p className="py-10 text-center text-[12px] text-slate-500">
              {q ? "Qidiruvga mos yozuv yo'q" : "Bu davrda hech kim qayd etilmadi"}
            </p>
          ) : viewMode === "list" ? (
            <ul className="space-y-1">
              {a.faces.map((f) => (
                <ArrivalRow key={f.face_id} f={f} onOpen={() => setOpenId(f.last_event_id)} />
              ))}
            </ul>
          ) : (
            <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(232px,1fr))]">
              {a.faces.map((f) => (
                <ArrivalCard key={f.face_id} f={f} onOpen={() => setOpenId(f.last_event_id)} />
              ))}
            </div>
          )}
        </div>

        {a.byChannel.length > 0 && (
          <footer className="flex flex-none flex-wrap items-center gap-2 border-t border-white/[0.08] px-4 py-2">
            {a.byChannel.map((c) => (
              <span
                key={c.channel}
                title={`${c.events} qayd`}
                className="rounded-lg border border-white/[0.1] bg-white/[0.04] px-2 py-1 text-[10.5px] text-slate-300"
              >
                #{c.channel} · {cameraPlaceLabel(c.channel, c.camera)} —{" "}
                <b className="font-mono text-slate-100">{c.people}</b>
              </span>
            ))}
          </footer>
        )}
      </div>

      {/* Dossiye — shu oynaning USTIDAN ochiladi (`EventDossier` o'zi
          portal qiladi va z-index'ni hal etadi). */}
      <EventDossier eventId={openId} onClose={() => setOpenId(null)} />
    </motion.div>
  );

  return typeof document === "undefined" ? null : createPortal(body, document.body);
}

/** Kartochka ko'rinishi — ilgaridan bor edi, shunchaki alohida funksiyaga chiqarildi. */
function ArrivalCard({ f, onOpen }: { f: NvrFaceRow; onOpen: () => void }) {
  return (
    /* ⚠️ Kartochka BOSILADI — ilgari rasm ham, qator ham o'lik edi:
       operator odamni ko'rib turib, uning hodisasini ocholmasdi.
       Bosilganda "Aniqlanganlar" dagi AYNI dossiye ochiladi
       (`last_event_id` — shu odamning oxirgi qaydi). */
    <button
      type="button"
      onClick={onOpen}
      title="Hodisa tafsilotini ochish"
      className="flex gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] p-2 text-left transition-colors hover:border-ice/45 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ice/50"
    >
      {f.has_picture ? (
        <DetectionThumb id={f.last_event_id} className="h-[68px] w-[54px] flex-none rounded-lg" alt="" />
      ) : (
        <span
          title="Rasm saqlanmagan"
          className="grid h-[68px] w-[54px] flex-none place-items-center rounded-lg bg-black/40 text-slate-600"
        >
          <ImageBroken size={16} />
        </span>
      )}

      <div className="min-w-0 flex-1">
        <p className="truncate text-[12px] font-semibold text-slate-100">
          {f.known && f.name ? f.name : `Shaxs #${f.face_id}`}
        </p>
        {f.person && <p className="truncate text-[10px] text-emerald-300">{f.person.role_label}</p>}
        <p className="truncate font-mono text-[10px] text-slate-500" title={nvrDateTime(f.first_seen)}>
          {nvrTime(f.first_seen)} → {nvrTime(f.last_seen)}
        </p>
        <p className="truncate text-[10px] text-slate-400">
          {f.cameras
            .slice(0, 2)
            .map((c) => cameraPlaceLabel(c.channel, c.camera))
            .join(" · ")}
          {f.camera_count > 2 && ` +${f.camera_count - 2}`}
        </p>
        <p className="font-mono text-[9.5px] text-slate-600">{f.count} qayd</p>
      </div>
    </button>
  );
}

/**
 * RO'YXAT ko'rinishi — `ArrivalCard` bilan AYNI ma'lumot, ingichka qator
 * shaklida (`AttendanceListModal.tsx`dagi `Row` bilan AYNI naqsh,
 * 2026-09-11, foydalanuvchi so'rovi).
 */
function ArrivalRow({ f, onOpen }: { f: NvrFaceRow; onOpen: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        title="Hodisa tafsilotini ochish"
        className="flex w-full items-center gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5 text-left transition-colors hover:border-ice/30 hover:bg-ice/[0.06]"
      >
        {f.has_picture ? (
          <DetectionThumb id={f.last_event_id} className="h-10 w-10 flex-none rounded-lg" alt="" />
        ) : (
          <span
            title="Rasm saqlanmagan"
            className="grid h-10 w-10 flex-none place-items-center rounded-lg bg-black/40 text-slate-600"
          >
            <ImageBroken size={14} />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-left text-[12px] font-semibold text-slate-100">
            {f.known && f.name ? f.name : `Shaxs #${f.face_id}`}
          </span>
          <span className="block truncate text-left text-[9.5px] text-slate-500">
            {f.person?.role_label ??
              f.cameras
                .slice(0, 2)
                .map((c) => cameraPlaceLabel(c.channel, c.camera))
                .join(" · ")}
          </span>
        </span>
        <span className="flex-none text-right">
          <span className="block font-mono text-[11px] font-bold text-slate-200" title={nvrDateTime(f.first_seen)}>
            {nvrTime(f.first_seen)} → {nvrTime(f.last_seen)}
          </span>
          <span className="block font-mono text-[9px] text-slate-500">{f.count} qayd</span>
        </span>
      </button>
    </li>
  );
}
