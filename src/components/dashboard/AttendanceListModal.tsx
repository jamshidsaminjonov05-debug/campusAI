/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  TOIFA DAVOMATI — Boshqaruv panelining O'ZIDA ochiladigan oyna       ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * Davomat taxtasidagi kafel (O'qituvchilar / Xodimlar / O'quvchilar)
 * bosilganda shu oyna ochiladi: kim keldi, kim kechikdi, kim kelmadi.
 *
 * ⚠️ **Ilgari BO'LIM ALMASHARDI** (2026-09-05 da tuzatildi): kafel
 * `setPersonTypeTarget(type) + setActivePage("Statistika")` chaqirardi
 * va foydalanuvchi Statistika bo'limining o'sha toifa tabiga sakrardi.
 * Bir qarashga mo'ljallangan taxtadan bitta bosish butun panelni
 * almashtirar, orqaga qaytish esa qo'lda bo'lardi. Endi javob SHU
 * YERDA — Boshqaruv panelidan chiqmasdan.
 *
 * **"Jami" kafeli ham SHU oynani ochadi** (`type: "all"`) — bugungi
 * BARCHA shaxslar bitta ro'yxatda. Ilgari u Statistika → Umumiy ga
 * o'tardi, ya'ni yagona kafel butun bo'limni almashtirardi.
 *
 * · **Sahifalash** — ro'yxat 361 o'quvchigacha bo'lishi mumkin
 *   (`PAGE_SIZE` qatordan keyin lenta chiziladi).
 * · **Qator bosilsa — SHAXS OYNASI** (`FaceHistoryModal`, `person_id`
 *   bo'yicha): o'sha odam qachon, qaysi kameralarda ko'ringan.
 *
 * Manba — `useNvrAttendance(date)`, davomat taxtasi bilan AYNI so'rov
 * kaliti: React Query uni qayta so'ramaydi.
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { ArrowRight, CaretLeft, CaretRight, ClockCounterClockwise, Clock, Image as ImageIcon, MagnifyingGlass, Play, SecurityCamera, SquaresFour, X } from "@phosphor-icons/react";
import { useViewMode, ViewToggle } from "@/components/common/ViewToggle";
import { useT, type Messages } from "@/i18n";
import type { PersonType } from "@/lib/api";
import { useNvrAttendance } from "@/hooks/useNvrAttendance";
import { useModalHistory } from "@/hooks/useModalHistory";
import { Missing } from "@/components/common/Missing";
import { Pagination } from "@/components/common/Pagination";
import { FaceHistoryModal } from "@/components/people/FaceHistoryModal";
import { LibraryPhoto, classOrder } from "@/components/people/FaceDatabasePage";
import { DetectionThumb } from "@/components/detections/DetectionThumb";
import { EventVideo } from "@/components/detections/EventVideo";
import { AbsenceReasonModal } from "./AbsenceReasonModal";
import { cameraPlaceLabel } from "@/config/cameraPlacements";
import type { PersonBrief } from "@/lib/nvr/studentStats";
import { ImageLightbox } from "@/components/common/ImageLightbox";
import { nvrUrl } from "@/config/endpoints";
import { nvrEventVideoUrl, type NvrAttendanceRow, type NvrAttendanceSettings, type NvrAttendanceStatus } from "@/lib/nvr/nvrApi";
import { ListSkeleton } from "@/components/common/panels";
import { EmptyState } from "@/components/common/EmptyState";

/**
 * Holat RANGI — Statistikadagi davomat jadvali bilan bir xil.
 *
 * ⚠️ **NOMI BU YERDA YO'Q** (2026-09-14): ilgari `label` ham shu yerda
 * QOTIRILGAN o'zbekcha matn edi, ya'ni til almashtirilganda ham
 * "Erta keldi / Kechikdi" o'zbekcha qolardi. Matn lug'atdan olinadi —
 * `t.dashboard.ui.att.status` (uz/ru/en da ALLAQACHON bor edi, faqat
 * ishlatilmagan). Rang esa tarjima qilinmaydi, shuning uchun bu
 * jadvalda faqat u qoladi.
 */
const STATUS_CLS: Record<NvrAttendanceStatus, string> = {
  early: "bg-emerald-500/15 text-emerald-300",
  late: "bg-amber-500/15 text-amber-300",
  absent: "bg-rose-500/15 text-rose-300",
  /* `waiting` — kun hali tugamagan, `absent_after` vaqti kelmagan:
     "kelmadi" deb belgilash ERTA bo'lardi (server o'zi hisoblaydi). */
  waiting: "bg-white/[0.06] text-slate-400",
};

/** Bir sahifadagi qatorlar — oyna balandligiga mos (86vh). */
const PAGE_SIZE = 10;

export function AttendanceListModal({
  type,
  date,
  title,
  onClose,
}: {
  /** `all` — barcha toifa ("Jami" kafeli). */
  type: PersonType | "all";
  /** `YYYY-MM-DD` — taxta ko'rsatayotgan kun. */
  date: string;
  /** Kafeldagi nom ("O'quvchilar"/"Talabalar" — muassasa turiga qarab). */
  title: string;
  onClose: () => void;
}) {
  const t = useT();
  const u = t.dashboard.ui.att;
  /* ◀ "orqaga" avval shu oynani yopadi (`lib/modalHistory.ts`). */
  useModalHistory(onClose);
  const att = useNvrAttendance(date);
  const [search, setSearch] = useState("");
  const [only, setOnly] = useState<NvrAttendanceStatus | "all">("all");
  const [page, setPage] = useState(1);
  /** Ochilgan shaxs (`NvrPerson.id`) — "Umumiy ma'lumot" bosilganda TO'LIQ tarix oynasi. */
  const [openPerson, setOpenPerson] = useState<NvrAttendanceRow | null>(null);
  /**
   * Qator bosilganda — ENDI TO'LIQ tarix (`FaceHistoryModal`) emas,
   * KICHIK tezkor ko'rinish (2026-09-10, foydalanuvchi so'rovi: "uning
   * uchun alohida yangi modal ochilyabdi lekin endi umuman boshqa modal
   * ochasan ... rasmi, bugungi tushgan tasviri va videosi, qancha vaqt
   * kech qolgani yoki erta kelgani, sinf yoki o'qituvchi ekani chiqib
   * tursa yetarli"). To'liq tarix o'sha oynadagi "Umumiy ma'lumotni
   * ko'rish" tugmasidan — o'sha yerda `setOpenPersonId` chaqiriladi. */
  const [quickRow, setQuickRow] = useState<NvrAttendanceRow | null>(null);
  /** "Kadr" tugmasi — bugungi kadr rasmi (ko'ruvchi). */
  const [frameRow, setFrameRow] = useState<NvrAttendanceRow | null>(null);
  /**
   * Kelmaganlar sababini belgilash oynasi.
   *
   * ⚠️ Ilgari u davomat KAFELIDAGI "Kelmagan" sonidan ochilardi; kafel
   * pastki qatori olib tashlangach (foydalanuvchi so'rovi) shu yerga
   * ko'chdi — aks holda sabab kiritish yo'li butunlay yo'qolardi.
   */
  const [marking, setMarking] = useState(false);
  /**
   * ╔══════════════════════════════════════════════════════════════════╗
   * ║  SINFLAR KESIMI — FAQAT "O'quvchilar" (2026-09-10)                ║
   * ╚══════════════════════════════════════════════════════════════════╝
   *
   * Foydalanuvchi so'rovi: avval SINFLAR chiqsin (har biri bugungi
   * DAVOMAT FOIZI bilan), sinf bosilganda o'sha sinf o'quvchilari
   * ro'yxati ochilsin — `FaceDatabasePage.tsx`dagi "SINFLAR AVVAL"
   * naqshi bilan AYNI (`classOrder()` ham o'sha yerdan import qilinadi).
   *
   * ⚠️ Bu yerda YANGI so'rov KERAK EMAS: `useNvrClasses()` o'rniga
   * `own` (bugungi kun uchun ALLAQACHON so'ralgan davomat qatorlari)
   * `note` (sinf) bo'yicha KLIENTDA guruhlanadi — davomat foizi shu
   * yerdagina bor (yuz bazasi endpoint'i buni bilmaydi).
   */
  const [klass, setKlass] = useState<string>("all");
  const [classSort, setClassSort] = useState<"class-asc" | "class-desc" | "attendance">("class-asc");

  /**
   * Ko'rinish — ro'yxat / kartochka (`components/common/ViewToggle.tsx`).
   * 🔵 **UMUMIY KOMPONENTGA KO'CHIRILDI** (2026-09-11, foydalanuvchi
   * so'rovi: "butun loyihaga joriy qilasan qayerda ro'yhat bo'lsa
   * hammasida huddi shu ko'rinishda"). Ilgari bu holat shu faylning
   * ICHIDA edi — endi boshqa ro'yxatlar ham AYNI hook/tugmani
   * ishlatadi, naqsh ikki marta yozilmaydi.
   */
  const [viewMode, setViewMode] = useViewMode("attendance-list");
  /** Kartochka panjarasida qatordagi ustunlar soni (2…6) — tepadagi slayder. */
  const [cols, setCols] = useCardCols();

  /* Filtr yoki qidiruv o'zgarsa 1-sahifaga qaytamiz — aks holda
     3-sahifada turib filtr tanlansa ro'yxat BO'SH ko'rinardi. */
  useEffect(() => setPage(1), [only, search, type, klass]);
  /* Toifa almashsa sinf tanlovi ham tozalanadi — aks holda
     o'qituvchilarga o'tilganda eski sinf filtri osilib qolardi. */
  useEffect(() => setKlass("all"), [type]);

  /* ⚠️ kuzatuv posti `role` da FAQAT `student`/`teacher` bor — `staff` uchun
     ro'yxat bo'sh emas, MANBASIZ (`BACKEND.md` 4-band). */
  const supported = type !== "staff";
  /** Sinflar kesimi FAQAT o'quvchilarda ma'noli — o'qituvchida bitta guruh bor. */
  const classFirst = type === "student" && supported;
  /** ⚠️ QIDIRUVDA sinf ko'rinishi O'TKAZIB YUBORILADI — ism bo'yicha
   *  qidirilayotgan o'quvchi qaysi sinfda ekani noma'lum, sinf
   *  kartochkalari javobni yashirardi (`FaceDatabasePage`dagi bilan
   *  AYNI qoida). */
  const showClassCards = classFirst && klass === "all" && !search.trim();

  /** Toifaga tegishli qatorlar (`all` — hammasi). */
  const own = useMemo(
    () => (!supported ? [] : type === "all" ? att.rows : att.rows.filter((r) => r.role === type)),
    [att.rows, type, supported]
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return own
      .filter((r) => (only === "all" ? true : r.status === only))
      .filter((r) => (klass === "all" ? true : (r.note ?? r.role_label) === klass))
      .filter((r) => (q ? r.full_name.toLowerCase().includes(q) || (r.note ?? "").toLowerCase().includes(q) : true));
  }, [own, only, search, klass]);

  /** Sinf kartochkalari — nom + bugungi davomat foizi, tanlangan tartibda. */
  const classRows = useMemo(() => {
    if (!classFirst) return [];
    const map = new Map<string, { name: string; total: number; early: number; late: number; absent: number }>();
    for (const r of own) {
      const name = r.note ?? r.role_label;
      let c = map.get(name);
      if (!c) {
        c = { name, total: 0, early: 0, late: 0, absent: 0 };
        map.set(name, c);
      }
      c.total++;
      if (r.status === "early") c.early++;
      else if (r.status === "late") c.late++;
      else if (r.status === "absent") c.absent++;
    }
    const list = [...map.values()].map((c) => ({
      ...c,
      rate: c.total > 0 ? Math.round(((c.early + c.late) / c.total) * 100) : 0,
    }));
    if (classSort === "class-asc") list.sort((a, b) => classOrder(a.name) - classOrder(b.name));
    else if (classSort === "class-desc") list.sort((a, b) => classOrder(b.name) - classOrder(a.name));
    else list.sort((a, b) => b.rate - a.rate);
    return list;
  }, [own, classFirst, classSort]);

  /**
   * 🔴 TOPILDI VA TUZATILDI (2026-09-10, foydalanuvchi skrinshot bilan
   * ko'rsatdi): sinf tanlangandan KEYIN ham yuqoridagi pilyulalar
   * (Ro'yxatda/Kelgan/Kechikkan/Kelmagan) hamon BUTUN toifaning
   * (masalan 606 o'quvchi) sonini ko'rsatardi — "1-A" tanlansa ham son
   * o'zgarmasdi, holbuki 1-A'da atigi 38 ta o'quvchi bor. Endi
   * pilyulalar SINF QAMROVIGA qarab hisoblanadi (`only`/qidiruvdan
   * MUSTAQIL — ular ro'yxatning O'ZINI kesadi, bu yerda esa "shu sinfda
   * necha kishi qaysi holatda" savoliga javob beriladi).
   */
  const classScoped = useMemo(
    () => (klass === "all" ? own : own.filter((r) => (r.note ?? r.role_label) === klass)),
    [own, klass]
  );
  const counts = useMemo(
    () => ({
      total: classScoped.length,
      early: classScoped.filter((r) => r.status === "early").length,
      late: classScoped.filter((r) => r.status === "late").length,
      absent: classScoped.filter((r) => r.status === "absent").length,
    }),
    [classScoped]
  );

  /* ⚠️ Sahifa KLIENTDA kesiladi: `useNvrAttendance` baribir butun
     kunni bitta so'rovda oladi (davomat taxtasi bilan AYNI kesh),
     ya'ni serverga qo'shimcha so'rov ketmaydi. */
  /** Sabab oynasi kutadigan shakl (`PersonBrief`). */
  const absentees: PersonBrief[] = useMemo(
    () =>
      own
        .filter((r) => r.status === "absent")
        .map((r) => ({ id: String(r.person_id), name: r.full_name, group: r.note ?? r.role_label })),
    [own]
  );

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = useMemo(
    () => rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [rows, page]
  );

  if (typeof document === "undefined") return null;

  return createPortal(
    /* ⚠️ PORTAL SHART — Boshqaruv panelida `backdrop-blur` li o'ramlar
       bor, ular `position: fixed` uchun yangi containing block yaratadi
       va oyna sahifa maydoniga qamalib qolardi. */
    <div
      /* ⚠️ **`z-[80]` — `FaceHistoryModal` dan PAST** (2026-09-05 da
         tuzatildi). Shaxs oynasi `createPortal` bilan `document.body`
         ga chiqadi va o'z `z-[85]` ida turadi — ya'ni BU oynaning
         ichidagi o'ram uni KO'TARA OLMAYDI (portal stacking
         contextdan chiqib ketadi). Ilgari bu yerda `z-[86]` turardi va
         bosilgan shaxs oynasi ro'yxat ORQASIDA paydo bo'lardi. */
      className="fixed inset-0 z-[80] grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        /* 🔵 **NEON QAYTA DIZAYN (2026-09-10)** — ilgari `hik-glass-blue`
           edi, endi `.neon-modal` (gradient chegara + porlash, `index.css`
           "NEON MODAL DIZAYN TIZIMI"). Sian→binafsha tus — davomat/shaxs
           ma'nosiga mos.
           🔴 **BALANDLIK ENDI QAT'IY** (2026-09-10, foydalanuvchi
           skrinshot bilan ko'rsatdi: "Kechikkan" 5 qator bilan va
           "Kelmagan" 21 qator + sahifalash bilan — ikkalasida OYNANING
           O'ZI boshqa-boshqa balandlikda edi). Sabab — `max-h-[86vh]`:
           bu FAQAT yuqori chegara, ro'yxat qisqa bo'lsa `flex flex-col`
           konteyner CONTENT'ga qarab qisqarardi. Endi `h-[...]` QAT'IY
           qiymat — ro'yxat qancha qisqa/uzun bo'lmasin oyna DOIM bir xil
           o'lchamda turadi, ICHIDAGI ro'yxat esa o'zi `overflow-y-auto`
           bilan aylanadi (past qism bo'sh qolishi ham, pastga cho'zilib
           ketishi ham — ikkalasi ham TABIIY, oyna o'lchami barqaror).
           🔵 **KATTALASHTIRILDI (2026-09-10)** — foydalanuvchi so'rovi:
           "modal kichkina ochilyabdi, height va widthini kattalashtir
           200px ga". `680px → 880px`, `720px → 920px` (`vh`/`vw`
           chegaralari kichik ekranlar uchun xavfsizlik sifatida qoladi). */
        /* 🔵 YANA KATTALASHTIRILDI (2026-10-23, foydalanuvchi skrinshot
           bilan) — deyarli to'liq ekran: kartochkalar katta rasmli bo'lgani
           uchun 920 px da faqat 3 ustun va 1.5 qator sig'ardi. */
        className="neon-modal neon-modal--cyan flex h-[94vh] w-[min(1480px,97vw)] flex-col overflow-hidden"
      >
        <header className="flex flex-none items-start gap-3 border-b border-white/[0.08] px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-slate-500">{t.board.title}</p>
            <h3 className="truncate text-[17px] font-bold text-white">{title}</h3>
            <p className="mt-0.5 font-mono text-[10.5px] text-slate-500">{date}</p>
          </div>
          <button type="button" onClick={onClose} title={t.common.close} className="neon-icon-btn">
            <X size={14} />
          </button>
        </header>

        {!supported ? (
          <div className="px-4 py-10 text-center">
            <Missing source="kuzatuv posti /attendance · role=staff" />
            <p className="mx-auto mt-2 max-w-[380px] text-[11.5px] leading-snug text-slate-400">
              {u.staffMissing}
            </p>
          </div>
        ) : (
          <>
            {/* 🔵 DAM OLISH KUNI (2026-09-13, foydalanuvchi so'rovi) — u
                kuni davomat SERVERDA baholanmaydi: hamma "kutilmoqda"
                holatida turadi va foiz `0%` bo'lib chiqadi. Sababi
                ochiq yoziladi, foiz/sonlar esa rangsiz (`weekend` propi
                kartochkalarga uzatiladi). */}
            {att.isWeekend && (
              <div className="flex flex-none items-center gap-2 border-b border-white/[0.06] bg-white/[0.03] px-4 py-2">
                <span className="h-1.5 w-1.5 flex-none rounded-full bg-slate-500" />
                <span className="text-[11.5px] font-semibold text-slate-300">{t.board.weekend}</span>
                <span className="text-[11px] text-slate-500">— {t.board.weekendHint}</span>
              </div>
            )}

            {/* "◀ Sinflar" — sinf kartochkalaridan biriga kirilganda,
                qaytish yo'li DOIM ko'rinib tursin (chuqurlikda qolib
                ketmasin, `FaceDatabasePage`dagi bilan AYNI naqsh). */}
            {classFirst && klass !== "all" && (
              <div className="flex flex-none items-center gap-2 border-b border-white/[0.06] px-4 py-2">
                <button
                  type="button"
                  onClick={() => setKlass("all")}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5
                             text-[11px] font-semibold text-slate-300 transition-colors hover:border-ice/30 hover:text-ice-bright"
                >
                  <CaretLeft size={11} weight="bold" />
                  {u.classes}
                </button>
                <span className="text-[12.5px] font-bold text-white">{klass}</span>
              </div>
            )}

            {/* Filtr qatori — sanoq TUGMA bo'lib turadi */}
            <div className="flex flex-none flex-wrap items-center gap-1.5 border-b border-white/[0.06] px-4 py-2.5">
              <Pill active={only === "all"} onClick={() => setOnly("all")} label={t.board.onList} value={counts.total} />
              <Pill active={only === "early"} onClick={() => setOnly("early")} label={t.board.present} value={counts.early} />
              <Pill active={only === "late"} onClick={() => setOnly("late")} label={t.board.late} value={counts.late} />
              <Pill active={only === "absent"} onClick={() => setOnly("absent")} label={t.board.absent} value={counts.absent} />
              {/* Sabab belgilash — FAQAT bitta toifa tanlanganda (VA
                  O'quvchilarda EMAS — 2026-09-10, foydalanuvchi so'rovi:
                  o'sha joyga sinf-kartochkalarining SARALASH tugmalari
                  qo'yildi, pastga qarang). */}
              {type !== "all" && type !== "student" && counts.absent > 0 && (
                <button type="button" onClick={() => setMarking(true)} title={t.board.markHint} className="neon-btn ml-auto">
                  {t.board.mark}
                </button>
              )}
              {/* Sinf kartochkalari SARALASH — 3 ta mezon (2026-09-10,
                  foydalanuvchi so'rovi): sinf raqami bo'yicha ikki
                  yo'nalish + davomat foizi bo'yicha. Roster ochilganda
                  (klass !== "all") yoki qidiruv paytida bu tugmalar
                  ma'nosiz — faqat kartochka ekranida ko'rinadi. */}
              {showClassCards && (
                <div className="ml-auto flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setClassSort("class-asc")}
                    title={u.sortAsc}
                    className={`neon-btn ${classSort === "class-asc" ? "is-active" : ""}`}
                  >
                    {u.classUp}
                  </button>
                  <button
                    type="button"
                    onClick={() => setClassSort("class-desc")}
                    title={u.sortDesc}
                    className={`neon-btn ${classSort === "class-desc" ? "is-active" : ""}`}
                  >
                    {u.classDown}
                  </button>
                  <button
                    type="button"
                    onClick={() => setClassSort("attendance")}
                    title={u.sortRate}
                    className={`neon-btn ${classSort === "attendance" ? "is-active" : ""}`}
                  >
                    {u.rate}
                  </button>
                </div>
              )}
              <label
                className={`hik-input flex h-7 items-center gap-1.5 px-2 ${
                  showClassCards || type === "all" || counts.absent === 0 ? "ml-auto" : ""
                }`}
              >
                <MagnifyingGlass size={12} className="flex-none text-slate-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={u.search}
                  className="w-[150px] bg-transparent text-[11px] outline-none placeholder:text-slate-600"
                />
              </label>

              {/* Ko'rinish tanlagich — sinf kartochkalari ekranida
                  ma'nosiz (u allaqachon kartochka), shuning uchun faqat
                  haqiqiy ro'yxatda ko'rinadi. */}
              {!showClassCards && viewMode === "card" && (
                /* 🔵 Ustunlar soni — SEGMENTLI tugmalar (2026-10-23): oddiy brauzer
                   `range` slayderi tizim rangida chizilib, neon dizaynga zid edi
                   ("4 / qator" yozuvi ham ikki qatorga sinardi). Statistikadagi
                   "DAVR" paneli bilan AYNI naqsh: ramka, ikonka, aktivi gradient. */
                <div
                  role="radiogroup"
                  aria-label={u.cardSize}
                  title={u.cardSize}
                  className="flex flex-none items-center gap-0.5 rounded-xl border border-white/10 bg-black/25 p-1"
                >
                  <SquaresFour size={14} weight="duotone" className="mx-1.5 flex-none text-ice-cyan/70" />
                  {Array.from({ length: CARD_COLS_MAX - CARD_COLS_MIN + 1 }, (_, i) => CARD_COLS_MIN + i).map((c) => {
                    const active = cols === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => setCols(c)}
                        title={u.perRow(c)}
                        className={`relative h-6 w-7 rounded-lg font-mono text-[11px] font-bold transition-colors ${
                          active ? "text-white" : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-200"
                        }`}
                      >
                        {active && (
                          <motion.span
                            layoutId="att-card-cols"
                            transition={{ type: "spring", stiffness: 420, damping: 34 }}
                            className="absolute inset-0 rounded-lg shadow-[0_8px_20px_-10px_#22d3ee]"
                            style={{ background: "linear-gradient(90deg, #22d3ee, #818cf8)" }}
                          />
                        )}
                        <span className="relative">{c}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {!showClassCards && <ViewToggle mode={viewMode} onChange={setViewMode} />}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
              {att.isLoading ? (
                <ListSkeleton rows={6} />
              ) : showClassCards ? (
                classRows.length === 0 ? (
                  <EmptyState fill title={t.board.noData} />
                ) : (
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {classRows.map((c) => (
                      <AttendanceClassCard
                        key={c.name}
                        {...c}
                        weekend={att.isWeekend}
                        onPick={() => setKlass(c.name)}
                      />
                    ))}
                  </div>
                )
              ) : rows.length === 0 ? (
                <EmptyState fill title={search ? u.noMatch : t.board.noData} />
              ) : viewMode === "card" ? (
                <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
                  {pageRows.map((r) => (
                    <CardTile
                      key={r.person_id}
                      r={r}
                      settings={att.settings}
                      onOpenFrame={() => setFrameRow(r)}
                      onOpenVideo={() => setQuickRow(r)}
                      onOpenPerson={() => setOpenPerson(r)}
                      compact={cols >= 5}
                    />
                  ))}
                </div>
              ) : (
                <ul className="space-y-1">
                  {pageRows.map((r) => (
                    <Row key={r.person_id} r={r} settings={att.settings} onOpen={() => setQuickRow(r)} />
                  ))}
                </ul>
              )}
            </div>

            {/* Sahifalash — sinf kartochkalarida kerak emas (sinflar soni
                cheklangan, bitta ekranga sig'adi), bitta sahifaga sig'sa
                ham lenta chizilmaydi. */}
            {!showClassCards && (
              <div className="flex-none border-t border-white/[0.06] px-3 py-2">
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onChange={setPage}
                  prevLabel={t.detections.prev}
                  nextLabel={t.detections.next}
                />
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* Qator bosilganda — TEZKOR ko'rinish (2026-09-10). Oyna USTIDA
          oyna, shu sabab `stopPropagation` SHART (yuqoridagi izohga
          qarang — portal orqali ham klik DARAXT bo'yicha ko'tariladi). */}
      {frameRow && frameRow.event_id != null && (
        <div className="fixed inset-0 z-[95]" onClick={(e) => e.stopPropagation()}>
          {/* Birinchi — BUTUN kadr (`index=1`), ikkinchi — kesilgan yuz. Ramka
              (`boxes`) BERILMAYDI: kadr toza ko'rinsin. */}
          <ImageLightbox
            images={[
              { src: nvrUrl(`/events/${frameRow.event_id}/image?index=1`), label: `${frameRow.full_name} · ${frameRow.time}` },
              { src: nvrUrl(`/events/${frameRow.event_id}/image`), label: frameRow.full_name },
            ]}
            initialIndex={0}
            onClose={() => setFrameRow(null)}
          />
        </div>
      )}

      {quickRow && (
        <div onClick={(e) => e.stopPropagation()}>
          <AttendanceQuickView
            r={quickRow}
            videoOnly={viewMode === "card"}
            settings={att.settings}
            onClose={() => setQuickRow(null)}
            onOpenFull={() => {
              setOpenPerson(quickRow);
              setQuickRow(null);
            }}
          />
        </div>
      )}

      {/* To'liq tarix — "Umumiy ma'lumotni ko'rish" tugmasidan.
          ⚠️ `person_id` — `NvrPerson.id` bilan AYNI raqam, ya'ni
          `FaceHistoryModal` uni ANIQ FK sifatida oladi (ism bo'yicha
          taxminiy qidirish SHART EMAS). */}
      {openPerson && (
        <div onClick={(e) => e.stopPropagation()}>
          {/* `initial` — ism va sinf ro'yxatdan ALLAQACHON ma'lum: oyna
              ochilgan zahoti sarlavhada turadi, server javobini kutmaydi. */}
          <FaceHistoryModal
            personId={openPerson.person_id}
            initial={{ name: openPerson.full_name, subtitle: openPerson.note ?? openPerson.role_label }}
            onClose={() => setOpenPerson(null)}
          />
        </div>
      )}

      {/* Kelmaganlar sababi — reyestr `lib/absenceReasons.ts` da */}
      {marking && type !== "all" && (
        <div onClick={(e) => e.stopPropagation()}>
          <AbsenceReasonModal
            type={type}
            date={date}
            absentees={absentees}
            onClose={() => setMarking(false)}
          />
        </div>
      )}
    </div>,
    document.body
  );
}

function Pill({
  active,
  onClick,
  label,
  value,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  value: number;
}) {
  return (
    <button type="button" onClick={onClick} className={`neon-btn ${active ? "is-active" : ""}`}>
      {label} <b className="neon-num font-mono">{value}</b>
    </button>
  );
}

/** Sinf kartochkasi — nom + bugungi davomat foizi (`classRows`). */
function AttendanceClassCard({
  name,
  total,
  rate,
  early,
  late,
  absent,
  weekend = false,
  onPick,
}: {
  name: string;
  total: number;
  rate: number;
  early: number;
  late: number;
  absent: number;
  /** Dam olish kuni — foiz va kesim RANGSIZ (2026-09-13, yuqoridagi izoh). */
  weekend?: boolean;
  onPick: () => void;
}) {
  const t = useT();
  const u = t.dashboard.ui.att;
  return (
    <button
      type="button"
      onClick={onPick}
      title={weekend ? t.board.weekendHint : u.roster(name)}
      className="group flex flex-col gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3.5 py-3 text-left
                 transition-colors hover:border-white/20 hover:bg-white/[0.06]"
    >
      <span className="flex w-full items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-[15px] font-bold text-white">{name}</span>
        <CaretRight size={13} className="flex-none text-slate-500 transition-colors group-hover:text-ice-bright" />
      </span>
      <span className="flex items-end justify-between">
        {/* Dam olish kunida foiz YO'Q: `0%` "hech kim kelmadi" degan
            yolg'on ma'no berardi (davomat u kuni hisoblanmaydi). */}
        <span
          className={
            weekend
              ? "font-mono text-[26px] font-extrabold leading-none text-slate-600"
              : "neon-num font-mono text-[26px] font-extrabold leading-none"
          }
        >
          {weekend ? "—" : `${rate}%`}
        </span>
        <span className="text-[9.5px] text-slate-500">{u.countN(total)}</span>
      </span>
      <span className="flex items-center gap-2 text-[9.5px]">
        {weekend ? (
          <span className="text-slate-500">{t.board.weekend}</span>
        ) : (
          <>
            <span className="text-emerald-300">{u.earlyN(early)}</span>
            <span className="text-amber-300">{u.lateN(late)}</span>
            <span className="text-rose-300">{u.absentN(absent)}</span>
          </>
        )}
      </span>
    </button>
  );
}

function Row({
  r,
  settings,
  onOpen,
}: {
  r: NvrAttendanceRow;
  /** Kech/erta chegarasi — "necha daqiqa kech qoldi" shundan hisoblanadi. */
  settings: NvrAttendanceSettings | null;
  onOpen: () => void;
}) {
  const u = useT().dashboard.ui.att;
  /**
   * 🔴 TOPILDI VA TUZATILDI (2026-09-10, foydalanuvchi so'rovi:
   * "o'quvchilarni qancha vaqt kech qolgani chiqmayabdi ... shunda
   * qancha vaqt kechikkanini belgilashing kerak bo'ladi"). Ilgari
   * qatorda faqat KELISH VAQTI (`r.time`, masalan "08:00") va holat
   * nishoni ("Kechikdi") ko'rinardi — ikkalasi ham bir xil bo'lgani
   * uchun (ko'p o'quvchi bir vaqtda "birinchi ko'rindi") qatorlar
   * FARQSIZ tuyulardi. Endi FARQ (`+N` / `-N`) alohida chipda —
   * `arrival_deadline`dan necha daqiqa keyin/oldin.
   *
   * 🔵 **KENG "JADVAL" QATORI (2026-10-22, foydalanuvchi skrinshot bilan):**
   * ustunlar — rasm + ism (ostida `ID: #person_id`) · sinf chipi · kelish
   * vaqti · kech/erta chipi (soat ikonkasi bilan) · kamera (`cameraPlaceLabel`
   * + `#kanal`) · "Ko'rish" tugmasi. Har ustun CHAPGA tekis (ustun
   * kengligi qat'iy, matn markazda "suzib" turmasin — 2026-10-22). Ilgari ism/vaqt/holat uchtasi siqilib
   * turardi, sinf esa ism ostidagi mayda satr edi.
   *
   * ⚠️ Rang/ishora `r.status`dan (SERVER hisoblagan), `diff`ning o'zidan
   * EMAS — chegara holatida (`diff === 0`) server "kech" desa bu yer ham
   * "kech" deb yozishi kerak, aks holda nishon bilan ziddiyatli ko'rinardi.
   */
  const diff = attendanceDiffMinutes(r, settings);
  /* Sinf (`10-A`) → "10-A sinf"; raqamsiz guruh (`Uqituvchilar`) → rol nomi. */
  const klass = r.note && /^\d/.test(r.note) ? u.classChip(r.note) : (r.note ?? r.role_label);
  const chip =
    diff != null
      ? r.status === "late"
        ? { text: `+${formatMinutes(Math.abs(diff), u)}`, cls: "border-amber-400/40 bg-amber-500/10 text-amber-300" }
        : { text: `-${formatMinutes(Math.abs(diff), u)}`, cls: "border-emerald-400/40 bg-emerald-500/10 text-emerald-300" }
      : { text: u.status[r.status], cls: `border-transparent ${STATUS_CLS[r.status]}` };
  /* Kamera — faqat kadr kelgan qatorda; `channel_name` ko'pincha "Camera 01"
     bo'lgani uchun odam o'qiydigan joy (`cameraPlaceLabel`) + kanal raqami. */
  const camera = r.channel_id ? `${cameraPlaceLabel(r.channel_id, r.channel_name)} #${r.channel_id}` : null;
  return (
    <li>
      <button type="button" onClick={onOpen} title={u.quick(r.full_name)} className="neon-row is-link w-full">
      {/* Rasm — 2026-09-08, foydalanuvchi so'rovi: "odamlarga rasm ham
          qo'shishimiz kerak". `r.person_id` — `NvrPerson.id` bilan AYNI
          raqam (yuqoridagi izohga qarang), `LibraryPhoto` shuni to'g'ridan
          qabul qiladi. Surati bo'lmasa `onError` bilan bosh harflarga
          qaytadi — o'zi hal qiladi, bu yerda shart yozilmaydi. */}
      <LibraryPhoto
        personId={r.person_id}
        name={r.full_name}
        size={0}
        className="h-10 w-10 flex-none rounded-lg object-cover ring-1 ring-white/10"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-left text-[12.5px] font-semibold text-slate-100">{r.full_name}</span>
        <span className="block truncate text-left font-mono text-[9.5px] font-semibold text-amber-400/80">{u.idLabel(r.person_id)}</span>
      </span>
      <span className="hidden w-[104px] flex-none justify-start sm:flex">
        <span className="truncate rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-slate-300">
          {klass}
        </span>
      </span>
      {/* Kelmagan odamda vaqt yo'q — bo'sh satr kelmaydi, `—` chiziladi */}
      <span className={`w-[64px] flex-none text-left font-mono text-[11.5px] ${r.time ? "neon-num font-bold" : "text-slate-500"}`}>
        {r.time || "—"}
      </span>
      <span className="flex w-[150px] flex-none justify-start">
        <span className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 font-mono text-[10.5px] font-bold ${chip.cls}`}>
          {diff != null && <Clock size={12} weight="bold" />}
          {chip.text}
        </span>
      </span>
      <span className="hidden w-[160px] flex-none items-center justify-start gap-1.5 truncate text-[10.5px] text-slate-400 md:flex">
        {camera ? (
          <>
            <SecurityCamera size={13} className="flex-none text-slate-500" />
            <span className="truncate">{camera}</span>
          </>
        ) : (
          "—"
        )}
      </span>
      <span className="flex-none rounded-lg border border-white/15 bg-white/[0.05] px-3 py-1 text-[10.5px] font-semibold text-slate-100">
        {u.view}
      </span>
      </button>
    </li>
  );
}

/**
 * KARTOCHKA ko'rinishi — `Row` bilan AYNI ma'lumot, faqat panjara
 * shaklida (Windows fayllar boshqaruvchisidagi "Katta belgichalar"
 * ko'rinishiga o'xshash, 2026-09-11, foydalanuvchi so'rovi).
 */
function CardTile({
  r,
  settings,
  onOpenFrame,
  onOpenVideo,
  onOpenPerson,
  compact = false,
}: {
  r: NvrAttendanceRow;
  settings: NvrAttendanceSettings | null;
  /** "Kadr" — bugungi kadr rasmi. */
  onOpenFrame: () => void;
  /** "Video" — bugungi hodisa videosi. */
  onOpenVideo: () => void;
  /** "Tarix" — shaxs profili (bugungi kun avtomatik tanlangan). */
  onOpenPerson: () => void;
  /** Qatorda 5–6 ta kartochka — tugmalarda faqat ikonka, matnlar kichikroq. */
  compact?: boolean;
}) {
  const u = useT().dashboard.ui.att;
  const diff = attendanceDiffMinutes(r, settings);
  const late = r.status === "late";
  /* O'ng-yuqori chip: yashil/sariq nuqta + kelish vaqti + (farq). Kelmagan
     odamda vaqt yo'q — holat nomi. Rang `r.status`dan (SERVER hisoblagan). */
  const dot = late ? "bg-amber-400" : r.status === "early" ? "bg-emerald-400" : "bg-slate-500";
  const diffTxt =
    diff != null ? `${late ? "+" : "-"}${formatMinutes(Math.abs(diff), u)}` : null;
  const camera = r.channel_id ? `${cameraPlaceLabel(r.channel_id, r.channel_name)} #${r.channel_id}` : null;
  const klass = r.note ?? r.role_label;
  const noFrame = r.event_id == null;
  const btn = `neon-btn flex-1 justify-center ${compact ? "px-0 py-1.5" : "py-2"}`;
  return (
    <div className="neon-card flex select-none flex-col overflow-hidden text-left">
      {/* 🔴 KARTOCHKANING O'ZI BOSILMAYDI — faqat uchta tugma (2026-10-23):
            · "Kadr"  → bugungi kadr rasmi (toza, ramkasiz);
            · "Video" → bugungi hodisa videosi;
            · "Tarix" → shaxs profili (bugungi kun avto tanlangan).
          ⚠️ ID olib tashlandi, "Reja" ism ostiga ko'tarildi. Tashqi QUTI
          o'lchamni belgilaydi, `LibraryPhoto`ning o'zi emas (rasmsiz
          odamda `Avatar` doira chizadi — quti balandligi baribir bir xil). */}
      {/* Rasm kartochkaning TEPASI va IKKI YONIGA tekis (ichki chekinish yo'q) —
          burchaklarni kartochkaning o'z `overflow-hidden`i yumaloqlaydi. */}
      <span className="relative block aspect-[4/5] w-full flex-none overflow-hidden bg-white/[0.03]">
        <span className="grid h-full w-full place-items-center">
          <LibraryPhoto personId={r.person_id} name={r.full_name} size={0} className="h-full w-full object-cover" />
        </span>
        <span className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/70 to-transparent" />
        <span
          style={{ background: "linear-gradient(90deg, var(--n1), var(--n2))" }}
          className="absolute left-2.5 top-2.5 rounded-full px-3 py-1 text-[11.5px] font-bold text-white shadow-[0_8px_20px_-10px_var(--n1)]"
        >
          {klass}
        </span>
        <span title={diffTxt ?? undefined} className="absolute right-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#070c18]/80 px-2.5 py-1 font-mono text-[11.5px] font-bold text-slate-100 backdrop-blur-sm">
          <span className={`h-2 w-2 rounded-full ${dot}`} />
          {r.time || u.status[r.status]}
          {/* Tor kartochkada (5–6 ustun) farq sig'maydi — faqat vaqt; farq `title`da */}
          {diffTxt && !compact && <span className={`text-[10px] font-semibold ${late ? "text-amber-400" : "text-emerald-400"}`}>({diffTxt})</span>}
        </span>
        {camera && (
          <span className="absolute bottom-2.5 left-2.5 flex max-w-[78%] items-center gap-1.5 rounded-lg bg-black/35 px-2 py-1 text-[11px] font-semibold text-slate-100">
            <SecurityCamera size={14} className="flex-none text-slate-300" />
            <span className="truncate">{camera}</span>
          </span>
        )}
      </span>

      <span className={`flex w-full flex-col gap-1 ${compact ? "px-2 pb-2 pt-2" : "px-3 pb-3 pt-2.5"}`}>
        <span className="flex items-center justify-between gap-2">
          <span className={`min-w-0 truncate font-bold leading-tight text-white ${compact ? "text-[13px]" : "text-[16px]"}`} title={r.full_name}>
            {r.full_name}
          </span>
          {settings?.arrival_deadline && (
            <span className="flex flex-none items-center gap-1 font-mono text-[11.5px] font-semibold text-slate-400">
              <Clock size={13} className="flex-none" />
              {compact ? settings.arrival_deadline : u.plan(settings.arrival_deadline)}
            </span>
          )}
        </span>
        <span className="mt-2 flex items-center gap-1.5">
          {/* Kelmagan odamda bugungi kadr yo'q — tugmalar o'chiq, sababi `title`da */}
          <button type="button" onClick={onOpenFrame} disabled={noFrame} title={noFrame ? u.noFrame : u.frame} className={btn}>
            <ImageIcon size={14} />
            {!compact && u.frame}
          </button>
          <button type="button" onClick={onOpenVideo} disabled={noFrame} title={noFrame ? u.noFrame : u.video} className={btn}>
            <Play size={13} weight="fill" />
            {!compact && u.video}
          </button>
          <button type="button" onClick={onOpenPerson} title={u.openFull} className={btn}>
            <ClockCounterClockwise size={14} />
            {!compact && u.history}
          </button>
        </span>
      </span>
    </div>
  );
}

const CARD_COLS_MIN = 2;
const CARD_COLS_MAX = 6;
const CARD_COLS_KEY = "hik-attendance-card-cols";

/** Ustunlar soni — shu brauzerdagi qulaylik (`localStorage`, xato bo'lsa jim). */
function useCardCols(): [number, (n: number) => void] {
  const [cols, setColsState] = useState(() => {
    try {
      const v = Number(localStorage.getItem(CARD_COLS_KEY));
      if (v >= CARD_COLS_MIN && v <= CARD_COLS_MAX) return v;
    } catch {
      /* shaxsiy rejim / bloklangan saqlash — standartga qaytamiz */
    }
    return 4;
  });
  const setCols = (n: number) => {
    const v = Math.min(CARD_COLS_MAX, Math.max(CARD_COLS_MIN, Math.round(n)));
    setColsState(v);
    try {
      localStorage.setItem(CARD_COLS_KEY, String(v));
    } catch {
      /* jim */
    }
  };
  return [cols, setCols];
}

/** `HH:MM` → daqiqa; bo'sh/noto'g'ri bo'lsa `null`. */
function toMinutes(hhmm: string | undefined | null): number | null {
  if (!hhmm || !hhmm.includes(":")) return null;
  const [h, m] = hhmm.split(":").map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
}

/**
 * Kelish vaqti bilan `arrival_deadline` orasidagi farq (daqiqa) —
 * musbat: KECH QOLDI, manfiy/nol: ERTA KELDI. Faqat kelgan (`early`/
 * `late`) shaxs uchun ma'noli — kelmagan/kutilayotganda `null`.
 *
 * `Row` (ro'yxatdagi HAR BIR qator) va `AttendanceQuickView` (tezkor
 * ko'rinish) ikkalasi ham shu funksiyadan — bir joyda hisoblanadi, ikki
 * xil matn shakliga o'raladi.
 */
function attendanceDiffMinutes(r: NvrAttendanceRow, settings: NvrAttendanceSettings | null): number | null {
  if (r.status !== "early" && r.status !== "late") return null;
  const arrived = toMinutes(r.time);
  const deadline = toMinutes(settings?.arrival_deadline);
  if (arrived == null || deadline == null) return null;
  return arrived - deadline;
}

/**
 * Daqiqani soat+daqiqa ko'rinishiga o'giradi (2026-09-11, foydalanuvchi
 * so'rovi: "+177daq" o'rniga "+2 soat 23 daq" kabi). Musbat son beriladi
 * (`Math.abs` chaqiruvchida) — ishora (+/-) alohida qo'yiladi.
 */
type AttText = Messages["dashboard"]["ui"]["att"];

/** "5 daq" / "1 soat 20 daq" — birliklar lug'atdan (uz/ru/en) */
function formatMinutes(mins: number, u: AttText): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return u.min(m);
  if (m === 0) return u.hour(h);
  return u.hourMin(h, m);
}

/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  TEZKOR KO'RINISH — qator bosilganda (2026-09-10)                    ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * Foydalanuvchi so'rovi: "uning uchun alohida yangi modal ochilyabdi lekin
 * endi umuman boshqa modal ochasan ... rasmi, bugungi tushgan tasviri va
 * videosi, qancha vaqt kech qolgani yoki erta kelgani, sinf yoki
 * o'qituvchi ekani chiqib tursa yetarli". Ilgari qator to'g'ridan-to'g'ri
 * OG'IR `FaceHistoryModal`ni (kalendar, kamera jadvali, butun tarix)
 * ochardi — bir qarashda "bugun nima bo'ldi" degan savolga bu haddan
 * ziyod edi.
 *
 * ⚠️ **QO'SHIMCHA SO'ROV YO'Q** — `NvrAttendanceRow`ning O'ZIDA
 * `event_id` bor (bugungi BIRINCHI kadr), `DetectionThumb`/`EventVideo`
 * shuni `id` sifatida qabul qiladi ("Aniqlanganlar" dagi bilan AYNI
 * komponentlar, qayta yozilmagan).
 */
function AttendanceQuickView({
  r,
  settings,
  videoOnly = false,
  onClose,
  onOpenFull,
}: {
  r: NvrAttendanceRow;
  /** "Video" tugmasidan — kadr rasmi ko'rsatilmaydi, faqat video. */
  videoOnly?: boolean;
  /** Kech/erta chegarasi — `AttendanceListModal` da ALLAQACHON so'ralgan. */
  settings: NvrAttendanceSettings | null;
  onClose: () => void;
  onOpenFull: () => void;
}) {
  useModalHistory(onClose);
  const t = useT();
  const u = t.dashboard.ui.att;
  const st = { label: u.status[r.status], cls: STATUS_CLS[r.status] };

  /** "N daqiqa kech qoldi" / "N daqiqa erta keldi" — faqat kelgan bo'lsa.
   *  ⚠️ Ishora `r.status`dan (`Row`dagi bilan AYNI qoida — chegara
   *  holatida serverning o'z xulosasiga zid gapirilmasin). */
  const diffLabel = useMemo(() => {
    const diff = attendanceDiffMinutes(r, settings);
    if (diff == null) return null;
    return r.status === "late" ? u.lateBy(formatMinutes(Math.abs(diff), u)) : u.earlyBy(formatMinutes(Math.abs(diff), u));
  }, [r, settings, u]);

  if (typeof document === "undefined") return null;

  /* 🔵 "Video" tugmasi — TO'LIQ EKRAN (2026-10-23, foydalanuvchi so'rovi:
     "kadr ko'ruvchisi kabi to'liq ekranga moslab"). Rasm ko'ruvchisi
     (`ImageLightbox`) bilan AYNI qobiq: qorong'i parda (rang INLINE — yorug'
     mavzu `bg-black/*` sinfini oqartirib yuboradi), tepada sarlavha qatori,
     qolgan butun joy video. Bo'sh joy bosilsa yopiladi. */
  if (videoOnly && r.event_id != null) {
    return createPortal(
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.18 }}
        onClick={onClose}
        /* `neon-modal--cyan` — faqat `--n1`/`--n2` (tugmalar hover rangi) */
        className="neon-modal--cyan fixed inset-0 z-[82] flex flex-col backdrop-blur-sm"
        style={{ background: "rgba(4, 7, 15, 0.95)" }}
      >
        <div className="flex min-h-0 flex-1 flex-col" onClick={(e) => e.stopPropagation()}>
              {/* Sarlavha qatori: chapda gradient ikonka + "Hodisa videosi" +
                  so'nik izoh (ism · vaqt · kamera), o'ngda "Jonli ko'rish",
                  "Yuklab olish" va yopish. ⚠️ Yopish tugmasi `absolute` BILAN
                  burchakka qo'yilmaydi — `.neon-icon-btn` CSS'dagi `position:
                  relative` Tailwind'ning `absolute`ini bosib ketardi. */}
              <EventVideo
                eventId={r.event_id}
                videoUrl={nvrEventVideoUrl(r.event_id)}
                minimal
                heading={
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="neon-chip h-9 w-9">
                      <Play size={15} weight="fill" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-bold" style={{ color: "#F1F5F9" }}>{u.videoTitle}</p>
                      <p className="truncate text-[11px]" style={{ color: "#94A3B8" }}>
                        {[
                          r.full_name,
                          r.time || null,
                          r.channel_id ? `${cameraPlaceLabel(r.channel_id, r.channel_name)} #${r.channel_id}` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                  </div>
                }
                trailing={
                  <button type="button" onClick={onClose} title={t.common.close} className="neon-icon-btn h-8 w-8">
                    <X size={15} />
                  </button>
                }
              />
        </div>
      </motion.div>,
      document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[82] grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        /* "Video" tugmasidan — KATTA oyna, sarlavha (rasm/ism) YO'Q (2026-10-23,
           foydalanuvchi so'rovi): faqat video, yopish tugmasi o'ng-yuqorida. */
        className="neon-modal neon-modal--cyan relative flex w-[min(520px,94vw)] flex-col overflow-hidden"
      >
        <header className="flex flex-none items-center gap-3 border-b border-white/[0.08] px-4 py-3">
          <LibraryPhoto
            personId={r.person_id}
            name={r.full_name}
            size={0}
            className="h-12 w-12 flex-none rounded-lg object-cover ring-1 ring-white/10"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-bold text-white">{r.full_name}</p>
            <p className="truncate text-[10.5px] text-slate-500">{r.note ?? r.role_label}</p>
          </div>
          <button type="button" onClick={onClose} title={t.common.close} className="neon-icon-btn">
            <X size={14} />
          </button>
        </header>

        <div className="flex flex-col gap-3 p-4">
          {/* Holat + vaqt + kech/erta farqi — "Video" tugmasida KERAK EMAS */}
          {!videoOnly && (
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-semibold ${st.cls}`}>{u.status[r.status]}</span>
            {r.time && (
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <Clock size={12} className="flex-none" />
                <span className="neon-num font-mono font-bold">{r.time}</span>
              </span>
            )}
            {diffLabel && <span className="text-[11px] text-slate-400">— {diffLabel}</span>}
          </div>
          )}

          {/* Bugungi kadr + video — faqat kelgan bo'lsa (`event_id` bor) */}
          {r.event_id != null ? (
            <div className="flex flex-col gap-2">
              {!videoOnly && (
                <DetectionThumb
                  id={r.event_id}
                  className="aspect-[16/10] w-full rounded-lg border border-white/[0.08]"
                  alt={r.full_name}
                  eager
                />
              )}
              {/* Davomat yozuvi doim kuzatuv postining O'Z hodisasi
                  (2-versiya bunday ro'yxatga umuman qo'shilmaydi) —
                  raqam ko'rinishidagi `nvrEventVideoUrl()` yetarli. */}
              <EventVideo eventId={r.event_id} videoUrl={nvrEventVideoUrl(r.event_id)} />
            </div>
          ) : (
            <p className="rounded-lg border border-white/[0.06] bg-white/[0.02] py-6 text-center text-[11.5px] text-slate-500">
              {u.noFrame}
            </p>
          )}
        </div>

        {!videoOnly && (
        <footer className="flex-none border-t border-white/[0.08] p-3">
          <button type="button" onClick={onOpenFull} className="neon-btn w-full justify-center py-2.5">
            {u.openFull}
            <ArrowRight size={13} weight="bold" />
          </button>
        </footer>
        )}
      </motion.div>
    </div>,
    document.body
  );
}
