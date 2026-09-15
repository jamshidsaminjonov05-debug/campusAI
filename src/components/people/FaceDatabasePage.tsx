"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  Briefcase,
  CaretLeft,
  CaretRight,
  ChalkboardTeacher,
  CheckCircle,
  MagnifyingGlass,
  Plus,
  Student,
  Trash,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { useModalHistory } from "@/hooks/useModalHistory";
import { UnsavedExitDialog } from "@/components/common/UnsavedExitDialog";
import { Avatar } from "./PeoplePage";
import { FaceHistoryModal } from "./FaceHistoryModal";
import { DetectionThumb } from "@/components/detections/DetectionThumb";
import { useNvrClasses, useNvrPeople, useNvrPeopleMutations } from "@/hooks/useNvrPeople";
import { nvrPersonPhotoUrl, type NvrPerson, type NvrPersonRole } from "@/lib/nvrApi";
import { fmt } from "@/components/common/panels";
import { Missing, MissingBlock } from "@/components/common/Missing";
import { useT } from "@/i18n";

/** Elementga ISHORA (`ref`) ekranga kirguncha `false`. Uzun ro'yxatlarda
 *  har bir kartochka o'z rasm so'rovini bir vaqtda boshlab yubormasin. */
function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (inView) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [inView]);
  return { ref, inView };
}

/**
 * Bitta kartochka — rasm FAQAT ekranga kirganda so'raladi (`useInView`).
 * 397 kishilik bazada bittada 200 tagacha kartochka chizilishi mumkin —
 * hammasi darhol rasm so'rasa panel qotib qolardi (o'lchandi 2026-09-04).
 *
 * Rasm ustuvorligi: **bazadagi surat (`/people/{id}/photo`) > kamera
 * kadri > bosh harflar** — kamera kadri tasodifiy lahzaviy tutilish,
 * bazadagi surat esa odamning HAQIQIY, o'zi tanilgan surati.
 */
/**
 * Shaxs kartochkasi — **rasm butun kartochka kengligida**, ma'lumot
 * pastida.
 *
 * ⚠️ Ilgari rasm 96 px lik DUMALOQ avatar edi va kartochkaning kichik
 * qismini egallardi; qolgan joyni ism, rol, "tayyor/rasm yo'q" nishoni
 * va o'chirish tugmasi bo'lib olardi. Odamni YUZIDAN tanish esa bu
 * ro'yxatning asosiy vazifasi — shuning uchun rasm 3:4 nisbatda butun
 * enni egalladi, matn esa uning OSTIGA tushdi.
 *
 * ⚠️ Rasm FAQAT ekranga kirganda so'raladi (`useInView`) — 397 kishilik
 * bazada hamma kartochka birdan so'rov boshlasa panel qotib qolardi
 * (o'lchandi 2026-09-04). Joy ushlab turuvchi skelet ayni o'lchamda.
 */
function PersonCard({
  p,
  onOpen,
  onDelete,
}: {
  p: NvrPerson;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className="group relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03]
                 transition-colors hover:border-ice/30"
    >
      <button
        type="button"
        onClick={onOpen}
        title="Shaxs tarixini ochish"
        className="block w-full text-left"
      >
        {/* ── RASM: butun en, 3:4 ── */}
        <span className="relative block aspect-[3/4] w-full overflow-hidden bg-[#0B1220]">
          {!inView ? (
            <span className="block h-full w-full animate-pulse bg-white/[0.06]" />
          ) : p.pid ? (
            /* `pid` bo'sh bo'lsa bazada surat YO'Q — server `404` beradi,
               shuning uchun so'rov UMUMAN yuborilmaydi. Surat bor bo'lsa ham
               `onError` bosh-harflarga qaytaradi (buzuq rasm belgisi
               hech qachon qolmaydi). */
            /* ⚠️ `size={0}` SHART — aks holda inline 96×96 Tailwind
               sinfini bosib ketadi (`LibraryPhoto` izohiga qarang). */
            <LibraryPhoto
              personId={p.id}
              name={p.full_name}
              size={0}
              className="h-full w-full object-cover"
            />
          ) : p.last_event_id ? (
            <DetectionThumb id={p.last_event_id} className="h-full w-full rounded-none" alt={p.full_name} eager />
          ) : (
            <span className="grid h-full w-full place-items-center">
              <Avatar name={p.full_name} size={72} />
            </span>
          )}

          {/* Holat nishoni — rasm USTIDA, o'ng yuqorida (matn joyini olmasin) */}
          <span
            title={p.pid ? "Kamera taniydi" : "Rasm yo'q — kamera hali tanimaydi"}
            className={`absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5
                        text-[9px] font-semibold backdrop-blur-md ${
                          p.pid ? "bg-emerald-500/25 text-emerald-200" : "bg-amber-500/25 text-amber-200"
                        }`}
          >
            {p.pid ? <CheckCircle size={10} weight="fill" /> : <WarningCircle size={10} weight="fill" />}
            {p.pid ? "tayyor" : "rasm yo'q"}
          </span>
        </span>

        {/* ── MA'LUMOT: rasm OSTIDA ── */}
        <span className="block px-2.5 py-2">
          <span className="block truncate text-[12px] font-semibold text-slate-100">{p.full_name}</span>
          <span className="mt-0.5 block truncate text-[9.5px] text-slate-500">
            {p.role_label}
            {p.note ? ` · ${p.note}` : ""}
          </span>
        </span>
      </button>

      {/* O'chirish — faqat hover'da, rasm ustidagi pastki burchakda */}
      <button
        type="button"
        onClick={onDelete}
        title="Bazadan o'chirish"
        className="absolute left-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-lg border border-rose-400/40
                   bg-rose-950/70 text-rose-300 opacity-0 backdrop-blur-md transition-opacity
                   hover:bg-rose-500/40 hover:text-white group-hover:opacity-100"
      >
        <Trash size={13} />
      </button>
    </div>
  );
}

/**
 * Rol kartochkasi — "Yuz bazasi" tabining BIRINCHI ekrani.
 *
 * ⚠️ Ilgari tab ochilishi bilan BUTUN baza (397 kishi) bitta ro'yxatda
 * chiqardi va tepasida uchta mayda pilyula turardi. Endi avval
 * **O'qituvchilar → Xodimlar → O'quvchilar** kartochkalari chiqadi,
 * biri bosilgach o'sha toifa ochiladi (o'quvchilarda — sinflar).
 *
 * ⚠️ **XODIMLAR — MANBASI YO'Q.** kuzatuv posti `role` da faqat
 * `student`/`teacher` bor (`BACKEND.md` 4-band), shuning uchun sanoq
 * o'rniga QIZIL belgi turadi va kartochka bosilganda ro'yxat emas,
 * sababi ko'rsatiladi. `0` yozish "xodim yo'q" degan yolg'on javob
 * bo'lardi.
 */
function RoleCard({
  Icon,
  label,
  count,
  tone,
  onPick,
}: {
  Icon: typeof Student;
  label: string;
  /** `null` — manbasi yo'q (qizil belgi). */
  count: number | null;
  tone: string;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      title={`${label} — ro'yxatni ochish`}
      className="hik-glass-blue group flex flex-col items-start gap-1.5 rounded-xl px-4 py-3.5 text-left
                 transition-colors hover:border-ice/40 hover:bg-ice/[0.08]"
    >
      <span className="flex w-full items-center gap-2.5">
        <span
          className="grid h-9 w-9 flex-none place-items-center rounded-lg"
          style={{ background: `${tone}1F`, color: tone }}
        >
          <Icon size={18} weight="duotone" />
        </span>
        <span className="min-w-0 flex-1 truncate text-[15px] font-bold text-white">{label}</span>
        <CaretRight size={14} className="flex-none text-slate-500 transition-colors group-hover:text-ice-bright" />
      </span>
      <span className="text-[10.5px] text-slate-400">
        {count === null ? <Missing source="kuzatuv posti /people · role=staff" /> : <b className="font-mono text-[13px] text-slate-200">{count}</b>}
        {count === null ? "" : " ta shaxs"}
      </span>
    </button>
  );
}

/**
 * Sinf kartochkasi — "O'quvchilar" tabining BIRINCHI ekrani.
 *
 * Bosilganda o'sha sinfning o'quvchilari ochiladi (`klass` serverga
 * `class=` bo'lib ketadi, klientda KESILMAYDI — aks holda "Ko'proq"
 * sahifalashi bilan urishardi).
 */
function ClassCard({ name, count, onPick }: { name: string; count: number; onPick: () => void }) {
  return (
    <button
      type="button"
      onClick={onPick}
      title={`${name} — o'quvchilar ro'yxati`}
      className="hik-glass-blue group flex flex-col items-start gap-1 rounded-xl px-3.5 py-3 text-left
                 transition-colors hover:border-ice/40 hover:bg-ice/[0.08]"
    >
      <span className="flex w-full items-center gap-2">
        <span className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-ice/15 text-ice-bright">
          <Student size={16} weight="duotone" />
        </span>
        <span className="min-w-0 flex-1 truncate text-[16px] font-bold text-white">{name}</span>
        <CaretRight size={13} className="flex-none text-slate-500 transition-colors group-hover:text-ice-bright" />
      </span>
      <span className="text-[10.5px] text-slate-400">
        <b className="font-mono text-[12px] text-slate-200">{count}</b> ta o&apos;quvchi
      </span>
    </button>
  );
}

/** Sarlavhada ko'rinadigan toifa nomi (`role` holati bo'yicha). */
const ROLE_TITLE: Record<string, string> = {
  none: "Odamlar",
  teacher: "O'qituvchilar",
  staff: "Xodimlar",
  student: "O'quvchilar",
};

/** Qulflangan (bitta) rol bilan chaqirilganda sarlavha/tavsif shunga mos. */
const LOCKED_HEADER: Record<NvrPersonRole, { title: string; desc: string }> = {
  teacher: {
    title: "O'qituvchilar",
    desc: "Ro'yxatga OLINGAN o'qituvchilar — kuzatuv postining O'Z bazasidan (yagona manba, backend `/persons` EMAS).",
  },
  student: {
    title: "O'quvchilar",
    desc: "Ro'yxatga OLINGAN o'quvchilar — kuzatuv postining O'Z bazasidan (yagona manba, backend `/persons` EMAS).",
  },
};

/**
 * "Yuz bazasi" — kuzatuv postining O'Z ro'yxati (`/nvr/people`,
 * `FRONTEND.md` 10-bo'lim). Kamera odamni TANISHI uchun u shu yerda
 * bo'lishi kerak.
 *
 * ⚠️ **Backend `Person` (`/persons`) BILAN ARALASHTIRILMAYDI** —
 * ikkalasi har xil tizim, har xil `id` (bu yerdagi `number`, u yerdagi
 * UUID).
 *
 * ⚠️ **Rasm YO'Q — enrollment surati alohida so'rovda qaytarilmaydi**
 * (`GET /people` bunday maydon bermaydi, `FRONTEND.md`da yo'q). Shuning
 * uchun ko'ringan odamlarga kameradan olingan haqiqiy kadr (`last_event_id`),
 * hali ko'rinmaganlarga esa bosh harflar ko'rsatiladi (`Avatar` — hech narsa
 * o'ylab topilmaydi).
 *
 * ⚠️ **`lockedRole` — "O'qituvchilar"/"O'quvchilar" TABLARI ENDI SHU
 * KOMPONENTNING O'ZI** (2026-09-04, "bitta APIga o'tamiz" so'ralgach).
 * Ilgari bu ikkala tab backend `Person`ga (`PeoplePage.tsx`) qarardi —
 * o'sha ro'yxat deyarli BO'SH edi (o'lchandi: 2 o'quvchi, 1 o'qituvchi),
 * ya'ni tablar "umuman chiqmayabdi" holida turardi. Kuzatuv postining
 * o'z bazasida esa HAQIQIY odamlar bor (`FaceDatabasePage` — "Yuz
 * bazasi" tabida allaqachon ishlab turgan manba). `lockedRole` berilsa
 * rol pilyulalari YASHIRILADI (sahifaning o'zi allaqachon shu filtr) va
 * "Shaxs qo'shish" formasi ham o'sha rolga qulflanadi.
 *
 * ⚠️ **"Xodimlar" BU YO'LDAN O'TMAYDI** — kuzatuv posti `NvrPersonRole`da FAQAT
 * `student`/`teacher` bor, kuzatuv posti "xodim" tushunchasini UMUMAN
 * bilmaydi (yuqoriroqdagi "Notanish yuzni bazaga qo'shish" bo'limiga
 * qarang — xuddi shu sabab `EnrollPerson`dan ham "Xodim" olib
 * tashlangan edi). Shuning uchun "Xodimlar" tabi hali ham backend
 * `Person`ga (`PeoplePage.tsx`) qaraydi — bitta API'ga TO'LIQ o'tish bu
 * toifa uchun texnik jihatdan MUMKIN EMAS, o'ylab topilmadi.
 */
/** Bitta bosishda nechta yangi qator yuklanadi — qurilmaning o'z
 *  `position=0&max=48` sxemasi bilan bir xil qadam. */
const PAGE = 48;

export function classOrder(name: string): number {
  const m = name.match(/^(\d+)/);
  if (!m) return 10_000; // raqamsiz guruh — eng oxirida
  return Number(m[1]) * 100 + (name.charCodeAt(m[1].length + 1) || 0) / 1000;
}

export function FaceDatabasePage({ lockedRole }: { lockedRole?: NvrPersonRole } = {}) {
  const t = useT();
  const n = (v: number) => fmt(v, t.locale);

  /**
   * Tanlangan toifa. **`null` — hali tanlanmagan**, ya'ni rol
   * kartochkalari ko'rsatiladi ("Yuz bazasi" tabining birinchi ekrani).
   * `staff` — kuzatuv posti bilmaydigan toifa (pastga qarang).
   */
  const [role, setRole] = useState<NvrPersonRole | "staff" | null>(lockedRole ?? null);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [openPersonId, setOpenPersonId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  /** Tanlangan sinf (`all` — hammasi). Serverga `class=` bo'lib ketadi. */
  const [klass, setKlass] = useState("all");
  /* ⚠️ 397 kishilik bazada BIR SO'ROVDA HAMMASINI (200 tagacha) chizish
     panelni QOTIRIB QO'YARDI — 200 kartochkaning har biri rasm so'rovi
     boshlardi (o'lchandi 2026-09-04). Endi "Ko'proq" bosilgan sari
     `limit` o'sadi (qurilmaning o'z `max=` mantig'i bilan bir xil), rasm
     esa kartochka EKRANGA KIRGANDA yuklanadi (`PersonCard` pastda). */
  const [limit, setLimit] = useState(PAGE);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search]);

  /* Serverga yuboriladigan rol. `staff` kuzatuv postida YO'Q — so'rov ham
     yuborilmaydi (`enabled` o'rniga `role`ni `teacher` qoldirib bo'sh
     natija olish noto'g'ri bo'lardi), shuning uchun u alohida ekran. */
  const effectiveRole: NvrPersonRole | null =
    role === "staff" || role === null ? null : role;
  /** Rol kartochkalari ekrani — hali hech qaysi toifa tanlanmagan. */
  const showRoleCards = !lockedRole && role === null;
  useEffect(() => setLimit(PAGE), [debounced, role, klass]);
  /* Toifa almashsa sinf tanlovi ham tozalanadi — aks holda
     o'qituvchilarga o'tilganda `4-A` filtri osilib qolardi. */
  useEffect(() => setKlass("all"), [role]);

  /* ── SINF FILTRI ──
     Ro'yxat SERVERDAN keladi (`useNvrClasses`), klientda `note` dan
     yig'ilmaydi: serverda hali kamerada ko'rinmagan sinf ham bor va har
     birida nechta odam borligi tayyor keladi. Filtr ham SERVERGA
     yuboriladi (`class=` parametri), klientda kesilmaydi — aks holda
     "Ko'proq" sahifalashi bilan urishardi. */
  const classesQ = useNvrClasses();
  const classes = useMemo(() => {
    const list = classesQ.data?.classes ?? [];
    /* O'quvchilar tabida "Uqituvchilar" guruhi ortiqcha va aksincha. */
    const filtered =
      effectiveRole === "student"
        ? list.filter((c) => c.students > 0)
        : effectiveRole === "teacher"
          ? list.filter((c) => c.teachers > 0)
          : list;

    /* ⚠️ Saralash — `classOrder()`, oddiy alifbo tartibi NOTO'G'RI:
       server matn bo'yicha saralab `10-A` ni `2-B` dan OLDIN beradi. */
    return [...filtered].sort((a, b) => classOrder(a.class) - classOrder(b.class));
  }, [classesQ.data, effectiveRole]);

  /* ⚠️ Rol kartochkalari ekranida ro'yxat KERAK EMAS — faqat sanoq
     (`counts`). Shuning uchun `limit: 1`: 397 kishilik javob o'rniga
     bitta yozuv keladi, sanoq esa baribir to'liq bo'ladi. */
  const q = useNvrPeople({
    role: effectiveRole ?? undefined,
    search: debounced || undefined,
    klass: klass === "all" ? undefined : klass,
    limit: showRoleCards ? 1 : limit,
  });
  const { create, remove } = useNvrPeopleMutations();
  const people = q.data?.people ?? [];
  /* ⚠️ Sinf tanlanganda `counts.total` GLOBAL qoladi (server filtrni
     `total` ga qo'llaydi, `counts` ga emas) — shuning uchun "Ko'proq"
     uchun `total` olinadi. */
  const total = klass === "all" ? q.data?.counts.total ?? 0 : q.data?.total ?? 0;
  const hasMore = people.length < total;
  const header = lockedRole ? LOCKED_HEADER[lockedRole] : null;

  /**
   * **SINFLAR AVVAL** (2026-09-05, foydalanuvchi so'rovi).
   *
   * "O'quvchilar" tabi ochilganda avval SINFLAR kartochka bo'lib
   * chiqadi; sinf bosilgach o'sha sinfning o'quvchilari ko'rsatiladi.
   *
   * ⚠️ Ilgari 361 ta o'quvchi BIR ro'yxatda, tepasida esa 14 ta mayda
   * sinf tugmasi turardi — "6-B da kim bor" degan savolga javob berish
   * uchun avval tugmani topish kerak edi.
   *
   * ⚠️ **QIDIRUVDA sinf ko'rinishi O'TKAZIB YUBORILADI**: ism bo'yicha
   * qidirilayotgan odam qaysi sinfda ekani NOMA'LUM, ya'ni sinf
   * kartochkalari javobni yashirardi. Qidiruv butun toifa bo'ylab
   * ishlaydi (server `search=` ni o'zi qo'llaydi).
   */
  const classFirst = effectiveRole === "student" && classes.length > 0;
  const showClassCards = classFirst && klass === "all" && !debounced;

  /* ⚠️ Enrollment suratlari uchun ALOHIDA SO'ROV YO'Q — har bir
     kartochka o'z rasmini `/people/{id}/photo` dan oladi (`LibraryPhoto`,
     ekranga kirganda). Ilgari bu yerda butun kutubxona oldindan
     tortilardi (`useFacelibPhotos(fdid)`), keyin har bir rasm qurilmaning
     ichki IP'siga 10 soniya osilardi — `nvrApi.ts` `nvrPersonPhotoUrl()`
     izohiga qarang. */

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3000);
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <header className="flex flex-none items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
            {header ? "Shaxslar" : "Yuz bazasi"}
          </p>
          <h2 className="text-[19px] font-bold text-white">
            {header ? header.title : ROLE_TITLE[role ?? "none"]}
          </h2>
        </div>
        <label className="hik-input ml-auto flex h-8 items-center gap-1.5 px-2.5">
          <MagnifyingGlass size={13} className="flex-none text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ism bo'yicha qidirish..."
            className="w-[180px] bg-transparent text-[11.5px] outline-none placeholder:text-slate-600"
          />
        </label>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="flex flex-none items-center gap-1.5 rounded-lg bg-emerald-500/90 px-3.5 py-2 text-[12.5px] font-bold text-white hover:bg-emerald-500"
        >
          <Plus size={15} weight="bold" />
          Shaxs qo'shish
        </button>
      </header>

      {/* ── TOIFA TANLANGANDA: "orqaga" qatori ──
          ⚠️ Ilgari bu yerda uchta rol PILYULASI turardi va tab ochilishi
          bilan butun baza ro'yxati chiqardi. Endi toifa kartochkadan
          tanlanadi, bu qator esa qaytish yo'lini ko'rsatadi. */}
      {!lockedRole && role !== null && (
        <div className="flex flex-none items-center gap-2">
          <button
            type="button"
            onClick={() => setRole(null)}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5
                       text-[11.5px] font-semibold text-slate-300 transition-colors hover:border-ice/30 hover:text-ice-bright"
          >
            <CaretLeft size={12} weight="bold" />
            Toifalar
          </button>
          <span className="text-[13px] font-bold text-white">{ROLE_TITLE[role]}</span>
        </div>
      )}

      {/* ── SINF TANLANGANDA: "orqaga" qatori ──
          Sinf kartochkalari ko'rinishiga qaytish yo'li DOIM ko'rinib
          tursin (chuqurlikda qolib ketmasin). */}
      {classFirst && klass !== "all" && (
        <div className="flex flex-none items-center gap-2">
          <button
            type="button"
            onClick={() => setKlass("all")}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5
                       text-[11.5px] font-semibold text-slate-300 transition-colors hover:border-ice/30 hover:text-ice-bright"
          >
            <CaretLeft size={12} weight="bold" />
            Sinflar
          </button>
          <span className="text-[13px] font-bold text-white">{klass}</span>
          <span className="text-[10.5px] text-slate-500">{n(total)} ta</span>
        </div>
      )}

      {/* ⚠️ **SINF PILYULALARI QATORI OLIB TASHLANDI** (2026-09-05,
          foydalanuvchi so'rovi). U 22 ta sinf + "Uqituvchilar" ni
          bitta qatorga tizib chiqardi va ekranning ikki qatorini
          egallardi; ustiga ROL KARTOCHKALARI ekranida ham ko'rinib
          turardi (o'sha paytda `effectiveRole` `null` bo'lgani uchun
          filtr ISHLAMASDI ham).

          Sinf tanlash "O'quvchilar" toifasida KARTOCHKA ko'rinishida
          (`ClassCard`) — u yerda har sinfda nechta odam borligi ham
          o'qiladi. O'qituvchilarda esa bitta guruh bor, ya'ni filtrga
          ehtiyoj yo'q. */}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {showRoleCards ? (
          /* ── TOIFALAR — kartochka ko'rinishida (birinchi ekran) ── */
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            <RoleCard
              Icon={ChalkboardTeacher}
              label="O'qituvchilar"
              count={q.data?.counts.teacher ?? 0}
              tone="#A78BFA"
              onPick={() => setRole("teacher")}
            />
            <RoleCard
              Icon={Briefcase}
              label="Xodimlar"
              /* Manbasi YO'Q — `0` emas, qizil belgi (`BACKEND.md` 4-band). */
              count={null}
              tone="#F59E0B"
              onPick={() => setRole("staff")}
            />
            <RoleCard
              Icon={Student}
              label="O'quvchilar"
              count={q.data?.counts.student ?? 0}
              tone="#34D399"
              onPick={() => setRole("student")}
            />
          </div>
        ) : role === "staff" ? (
          /* ── XODIMLAR — manba yo'q, sabab OCHIQ yoziladi ── */
          <MissingBlock
            className="mt-6"
            reason={t.dashboard.ui.att.staffMissing}
            source="kuzatuv posti /people · role=staff"
          />
        ) : showClassCards ? (
          /* ── SINFLAR — KARTOCHKA ko'rinishida ── */
          classesQ.isLoading ? (
            <div className="grid h-40 place-items-center">
              <span className="h-7 w-7 animate-spin rounded-full border-2 border-ice/40 border-t-ice" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
              {classes.map((c) => (
                <ClassCard key={c.class} name={c.class} count={c.students} onPick={() => setKlass(c.class)} />
              ))}
            </div>
          )
        ) : q.isLoading ? (
          <div className="grid h-40 place-items-center">
            <span className="h-7 w-7 animate-spin rounded-full border-2 border-ice/40 border-t-ice" />
          </div>
        ) : people.length === 0 ? (
          <p className="py-14 text-center text-[12px] text-slate-500">
            {debounced
              ? "Qidiruvga mos yozuv yo'q"
              : klass !== "all"
                ? `«${klass}» sinfida yozuv yo'q`
                : "Baza bo'sh"}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
              {people.map((p) => (
                <PersonCard
                  key={p.id}
                  p={p}
                  onOpen={() => setOpenPersonId(p.id)}
                  onDelete={() => setDeleteId(p.id)}
                />
              ))}
            </div>
            {hasMore && (
              <div className="mt-3 flex justify-center">
                <button
                  type="button"
                  onClick={() => setLimit((l) => l + PAGE)}
                  disabled={q.isFetching}
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-[12px] font-semibold text-slate-300 hover:bg-white/[0.08] disabled:opacity-50"
                >
                  {q.isFetching ? "Yuklanmoqda…" : `Ko'proq (${n(people.length)}/${n(total)})`}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {addOpen && (
        <AddPersonModal
          lockedRole={lockedRole}
          onClose={() => setAddOpen(false)}
          onDone={(name) => {
            setAddOpen(false);
            flash(`"${name}" bazaga qo'shildi`);
          }}
          create={create}
        />
      )}

      {deleteId != null && (
        <ConfirmDeleteModal
          busy={remove.isPending}
          onCancel={() => setDeleteId(null)}
          onConfirm={() => {
            const id = deleteId;
            remove.mutate(id, {
              /* ⚠️ `removed_from_nvr` TEKSHIRILADI (`FRONTEND.md`) —
                 `false` bo'lsa odam ro'yxatdan ketgan, lekin yuzi
                 QURILMADA qolgan va kamera uni TANISHDA DAVOM ETADI.
                 Bu holatni jimgina o'tkazib bo'lmaydi. */
              onSuccess: (res) => {
                setDeleteId(null);
                flash(
                  res.removed_from_nvr
                    ? "O'chirildi"
                    : "Ro'yxatdan o'chirildi, lekin kamera hali ham TANIYDI — qurilmada yuz qoldi"
                );
              },
              onError: () => flash("O'chirib bo'lmadi — qayta urinib ko'ring"),
            });
          }}
        />
      )}

      {openPersonId != null && (
        <FaceHistoryModal personId={openPersonId} onClose={() => setOpenPersonId(null)} />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[99] -translate-x-1/2 rounded-lg border border-emerald-400/30 bg-ink-panel px-4 py-2 text-[12px] font-semibold text-emerald-300 shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function AddPersonModal({
  lockedRole,
  onClose,
  onDone,
  create,
}: {
  /** "O'qituvchilar"/"O'quvchilar" tabidan ochilganda — rol tanlagich
   *  YASHIRILADI, forma to'g'ridan-to'g'ri shu rolga yozadi. */
  lockedRole?: NvrPersonRole;
  onClose: () => void;
  onDone: (name: string) => void;
  create: ReturnType<typeof useNvrPeopleMutations>["create"];
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<NvrPersonRole>(lockedRole ?? "student");
  const [note, setNote] = useState("");
  const [gender, setGender] = useState<"" | "male" | "female">("");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmExit, setConfirmExit] = useState(false);

  const dirty = firstName.trim() !== "" || lastName.trim() !== "" || note.trim() !== "" || !!image;
  const requestClose = () => {
    if (!dirty || create.isPending) {
      onClose();
      return true;
    }
    setConfirmExit(true);
    return false;
  };
  useModalHistory(requestClose);

  useEffect(() => {
    if (!image) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!firstName.trim()) {
      setError("Ism majburiy");
      return;
    }
    setError(null);
    create.mutate(
      { data: { first_name: firstName.trim(), last_name: lastName.trim() || undefined, role, note: note.trim() || undefined, gender: gender || undefined }, image },
      {
        onSuccess: (p) => onDone(p.full_name),
        onError: (e) => setError(e instanceof Error ? e.message : "Xatolik"),
      }
    );
  }

  const inputCls =
    "w-full rounded-lg border border-blue-500/20 bg-slate-900/60 px-3 py-2 text-[12px] text-slate-200 outline-none placeholder:text-slate-500";

  const body = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={() => requestClose()}
      className="fixed inset-0 z-[90] grid place-items-center bg-[#03060E]/85 p-4 backdrop-blur-md"
    >
      <motion.form
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="hik-glass-blue max-h-[90vh] w-[420px] max-w-full overflow-y-auto rounded-2xl border border-white/10 bg-ink-panel p-5"
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[14px] font-bold">Yuz bazasiga shaxs qo'shish</p>
          <button type="button" onClick={() => requestClose()} className="text-slate-400 hover:text-white">
            <X size={17} />
          </button>
        </div>

        <div className="mb-3 flex justify-center">
          <label className="cursor-pointer">
            {preview ? (
              <img src={preview} alt="" className="h-20 w-20 rounded-full object-cover ring-2 ring-ice/40" />
            ) : (
              <div className="grid h-20 w-20 place-items-center rounded-full border-2 border-dashed border-white/15 text-[10px] text-slate-500">
                Rasm
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setImage(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Familiya" className={inputCls} />
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Ism *" required className={inputCls} />
          {!lockedRole && (
            <select value={role} onChange={(e) => setRole(e.target.value as NvrPersonRole)} className={`${inputCls} [color-scheme:dark] [&_option]:bg-ink-panel [&_option]:text-slate-100`}>
              <option value="student">O'quvchi</option>
              <option value="teacher">O'qituvchi</option>
            </select>
          )}
          <select value={gender} onChange={(e) => setGender(e.target.value as "" | "male" | "female")} className={`${inputCls} [color-scheme:dark] [&_option]:bg-ink-panel [&_option]:text-slate-100`}>
            <option value="">Jinsi (ixtiyoriy)</option>
            <option value="male">Erkak</option>
            <option value="female">Ayol</option>
          </select>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Izoh (sinf, lavozim)" className={`${inputCls} col-span-2`} />
        </div>

        {error && <p className="mt-2.5 text-[11.5px] text-rose-300">{error}</p>}
        {!image && (
          <p className="mt-2.5 text-[10.5px] leading-snug text-amber-300/80">
            Rasmsiz ham qo'shiladi, lekin kamera bu odamni hali TANIMAYDI.
          </p>
        )}

        <button
          type="submit"
          disabled={create.isPending}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500/90 py-2.5 text-[13px] font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {create.isPending && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
          Qo'shish
        </button>
      </motion.form>

      {confirmExit && (
        <UnsavedExitDialog onStay={() => setConfirmExit(false)} onLeave={onClose} />
      )}
    </motion.div>
  );

  return typeof document === "undefined" ? null : createPortal(body, document.body);
}

function ConfirmDeleteModal({
  busy,
  onCancel,
  onConfirm,
}: {
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useModalHistory(onCancel);
  const body = (
    <div onClick={onCancel} className="fixed inset-0 z-[90] grid place-items-center bg-[#03060E]/85 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="hik-glass-blue w-[360px] max-w-full rounded-2xl border border-rose-400/30 bg-ink-panel p-5"
      >
        <p className="text-[13.5px] font-bold text-white">Yuz bazasidan o'chirilsinmi?</p>
        <p className="mt-1 text-[11.5px] leading-snug text-slate-400">
          Kamera bu odamni endi TANIMAYDI. Uning kuzatuv tarixi (o'tgan qaydlar) o'zgarmaydi.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[12px] font-semibold text-slate-200 hover:bg-white/[0.12]">
            Bekor
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="rounded-lg border border-rose-400/40 bg-rose-500/15 px-3 py-1.5 text-[12px] font-semibold text-rose-200 hover:bg-rose-500/25 disabled:opacity-50"
          >
            O'chirish
          </button>
        </div>
      </motion.div>
    </div>
  );
  return typeof document === "undefined" ? null : createPortal(body, document.body);
}

/**
 * BAZADAGI (enrollment) surat — `GET /nvr/people/{id}/photo`
 * (`FRONTEND.md` 10-D). Rasmni kuzatuv posti serverining O'ZI beradi, ya'ni
 * qurilmaning ichki IP'siga bog'liq emas (eski `facelib-image` relay
 * shu sababli 10 soniya osilib turardi — `nvrApi.ts`
 * `nvrPersonPhotoUrl()` izohiga qarang).
 *
 * Surati yo'q odamda server `404` beradi → `onError` bosh-harflarga
 * (`Avatar`) qaytaradi, buzuq rasm belgisi HECH QACHON qolmaydi.
 */
export function LibraryPhoto({
  personId,
  name,
  size = 96,
  className,
}: {
  personId: number;
  name: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  /* ⚠️ `size={0}` — "o'lchamni CSS hal qiladi" degani (masalan
     `aspect-[3/4] w-full`): inline `height/width` berilsa u Tailwind
     sinfini BOSIB KETARDI va rasm 0×0 bo'lib yo'qolardi. */
  const fluid = size === 0;
  if (failed) return <Avatar name={name} size={fluid ? 64 : size} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={nvrPersonPhotoUrl(personId)}
      alt={name}
      loading="lazy"
      onError={() => setFailed(true)}
      style={fluid ? undefined : { height: size, width: size }}
      className={className ?? "rounded-full object-cover ring-1 ring-ice/25"}
    />
  );
}
