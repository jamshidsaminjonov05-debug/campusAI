"use client";

import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarBlank,
  Camera,
  CaretLeft,
  CaretRight,
  Link as LinkIcon,
  LinkBreak,
  MagnifyingGlass,
  MagnifyingGlassPlus,
  UserFocus,
  X,
} from "@phosphor-icons/react";
import { useModalHistory } from "@/hooks/useModalHistory";
import { EventDossier } from "@/components/detections/EventDossier";
import { ImageLightbox } from "@/components/common/ImageLightbox";
import { DetectionThumb } from "@/components/detections/DetectionThumb";
import { EventVideo } from "@/components/detections/EventVideo";
import {
  assignFace,
  getAttendanceSettings,
  getFace,
  getPersonHistory,
  listFaces,
  nvrDateTime,
  nvrImageUrl,
  nvrPersonPhotoUrl,
  nvrEventVideoUrl,
  nvrTime,
} from "@/lib/nvr/nvrApi";
import { useNvrPeople } from "@/hooks/useNvrPeople";
import { usePersonAttendanceRate } from "@/hooks/useNvrAttendance";
import { fmt, ListSkeleton } from "@/components/common/panels";
import { useT } from "@/i18n";
import { absenceSnapshot, getReason, subscribeAbsence, EXCUSED_CODES } from "@/lib/nvr/absenceReasons";
import { dayMonthLongLabel } from "@/lib/dateLabel";
import type { NvrEvent } from "@/lib/nvr/nvrApi";
import { EmptyState } from "@/components/common/EmptyState";

/**
 * SHAXS TARIXI — bitta `face_id`ning butun kuzatuv tarixi.
 *
 * Manba — bitta so'rov: `getFace(faceId)` (`FRONTEND.md` 5-B). Server
 * o'zi hisoblab beradi: `stats` (jami/birinchi/oxirgi/kunlar/kameralar +
 * kunlar kesimi) va `events` (har bir qaydning o'zi — kadr shundan).
 *
 * ⚠️ Bu oyna **yuz oqimi** (ilgari `AllPeoplePage` — 2026-10-23 da o'chirilgan; endi dossiye/`RecentEntriesPanel`) va **ro'yxatdagi
 * shaxs** (`PeoplePage` — ism/rasm bosilganda) ikkalasidan ham ochiladi:
 * `face_id` — kuzatuv postining o'z raqami, backend `Person.id` (UUID)
 * bilan bog'liq emas. Ro'yxatdagi shaxs bosilganda mos `face_id` ISM
 * bo'yicha topiladi (`PeoplePage.tsx` — aniq FK yo'q, `FRONTEND.md` buni
 * bermaydi).
 *
 * ⚠️ **Kadr bosilsa hodisa MA'LUMOTLARI ochiladi** (`EventDossier`) — bu
 * oynaning USTIDAN, "Aniqlanganlar" dagi bilan AYNI oyna: video, ramka,
 * yuz belgilari.
 */
export function FaceHistoryModal({
  faceId,
  personId,
  initial,
  onClose,
  zClass = "z-[85]",
}: {
  /** Kuzatuv jurnalidagi yuz raqami. */
  faceId?: number;
  /**
   * Chaqiruvchi ALLAQACHON biladigan ma'lumot (ism, sinf/rol) — oyna
   * ochilgan ZAHOTI sarlavhada ko'rinadi, server javobini kutmaydi
   * (2026-10-23, foydalanuvchi so'rovi: ilgari butun oyna bitta aylanuvchi
   * belgi ortida, sarlavhada esa "Begona shaxs #0" deb turardi).
   */
  initial?: { name: string; subtitle?: string | null };
  /**
   * RO'YXATDAGI shaxs raqami (`NvrPerson.id`). `GET /people/{id}`
   * `getFace()` bilan AYNI shaklda javob beradi (o'lchandi 2026-09-04:
   * `name`, `face_ids`, `events`, `stats`), shuning uchun bu oyna
   * ikkala manbadan ham O'ZGARISHSIZ ishlaydi.
   *
   * ⚠️ ANIQ FK — ism bo'yicha taxminiy qidirish (`FaceHistoryModalByName`)
   * SHART EMAS: bir xil ismli ikki odam bo'lsa u noto'g'ri tarix
   * ko'rsatishi mumkin edi.
   */
  personId?: number;
  onClose: () => void;
  /**
   * Oyna z-qatlami. Default `z-[85]`; hodisa dossiyesidan ("Shaxs haqida
   * ma'lumot") ochilganda BALANDROQ beriladi — dossiye `EventDossier`
   * orqali `z-[92]` o'ramda turishi mumkin va bu oyna uning ORTIDA qolardi.
   */
  zClass?: string;
}) {
  const pnl = useT().people.panel;
  const t = useT();
  const n = (v: number) => fmt(v, t.locale);
  useModalHistory(onClose);

  const [assignOpen, setAssignOpen] = useState(false);
  const qc = useQueryClient();

  /**
   * "Bog'lash" / "Ajratish" — `POST /faces/{id}/assign` (`FRONTEND.md`
   * 10-bo'lim, "yangi"). Ikki holat: (1) odam rasmsiz qo'shilgan va
   * "notanish" bo'lib yuribdi — qo'lda bog'laymiz; (2) model bitta odamni
   * ikki guruhga bo'lib yuborgan — ikkinchisini ham shu odamga qo'shamiz.
   * `personId: null` — ADASHIB bog'langanni ajratish.
   */
  /* ⚠️ "Bog'lash"/"Ajratish" FAQAT yuz jurnalidan ochilganda ko'rinadi
     (`faceId` bor). Ro'yxatdagi shaxsdan (`personId`) kelganda oyna
     faqat TARIXNI ko'rsatadi: u yerda bitta aniq `face_id` yo'q —
     odamga bir nechta yuz guruhi bog'langan bo'lishi mumkin
     (`face_ids`), ya'ni "qaysi birini ajratamiz?" degan savol
     javobsiz qolardi. */
  const assign = useMutation({
    mutationFn: (pid: number | null) => assignFace(faceId!, pid),
    onSuccess: () => {
      setAssignOpen(false);
      /* Bog'lash ESKI kadrlarni ham qayta belgilaydi — shu odamning
         boshqa yozuvlari, "Hammasi" ro'yxati va yuz bazasi darhol
         yangilanishi kerak. */
      qc.invalidateQueries({ queryKey: ["nvr-face", faceId] });
      qc.invalidateQueries({ queryKey: ["nvr-faces"] });
      qc.invalidateQueries({ queryKey: ["nvr-people"] });
      qc.invalidateQueries({ queryKey: ["nvr-face-by-name"] });
    },
  });

  const q = useQuery({
    queryKey: personId != null ? ["nvr-person-history", personId] : ["nvr-face", faceId],
    queryFn: () => (personId != null ? getPersonHistory(personId, 500) : getFace(faceId!, 500)),
    enabled: personId != null || faceId != null,
    staleTime: 30_000,
  });

  const data = q.data;
  const stats = data?.stats;

  /* 🔵 DAVOMAT FOIZI (2026-09-10, "Birinchi marta kameraga tushishi"
     o'rniga) — faqat davomat ro'yxatida BOR shaxs uchun (`personId`
     bevosita berilgan YOKI yuz allaqachon ro'yxatga BOG'LANGAN,
     `data.person`). Notanish yuzda bu tushuncha yo'q — `null` qoladi. */
  const attPersonId = data?.person?.id ?? personId ?? null;
  const personRole = data?.person?.role;
  /* kuzatuv posti `role` maydoni bu javobda erkin `string` — davomat tizimida esa
     FAQAT `student`/`teacher` bor (`BACKEND.md` 4-band), shuning uchun
     tor tekshiruv bilan `NvrPersonRole`ga toraytiriladi. */
  const attRole = personRole === "student" || personRole === "teacher" ? personRole : null;
  const attRate = usePersonAttendanceRate(attPersonId, attRole);

  /* Ism: server javobi → chaqiruvchi bergan ism → faqat yuz raqami bo'lsa
     "Begona shaxs #N". `personId` bilan ochilganda "Begona shaxs #0" degan
     yolg'on sarlavha CHIQMAYDI (ro'yxatdagi odam begona emas). */
  const displayName = data?.name?.trim() || initial?.name?.trim() || (faceId != null ? pnl.unknownFace(faceId) : "…");
  const subtitle = data?.person
    ? data.person.role
    : initial?.subtitle
      ? initial.subtitle
      : personId != null
        ? ""
        : pnl.hintNotInList;

  /**
   * Sarlavhadagi rasm va uni kattalashtirish.
   *
   * Ustuvorlik `FaceDatabasePage` bilan AYNI: **bazadagi surat** (odamning
   * o'zi tanilgan, barqaror rasmi) → **kamera kadri** (tasodifiy lahza).
   * Ikkalasi ham bo'lsa ko'ruvchida o'ngga-chapga o'tib solishtirish
   * mumkin — shu sabab ro'yxat, bitta rasm emas.
   */
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarImages = useMemo(() => {
    const out: { src: string; label: string }[] = [];
    /* Bazadagi surat — `personId` ma'lum bo'lsa DARHOL (server javobini
       kutmasdan): manzil faqat raqamdan quriladi. */
    const libId = data?.person?.id ?? personId ?? null;
    if (libId != null) out.push({ src: nvrPersonPhotoUrl(libId), label: pnl.libraryPhoto });
    const frame = (data?.events ?? []).find((e) => e.image_url);
    if (frame) {
      const u = nvrImageUrl(frame, 0);
      if (u) out.push({ src: u, label: `${pnl.camera} · ${nvrDateTime(frame.time)}` });
    }
    return out;
  }, [data, personId, pnl]);
  const avatar = avatarImages[0] ?? null;
  /* Surat serverda bo'lmasa (404) — ikonkaga qaytadi, buzilgan rasm chizilmaydi. */
  const [avatarFailed, setAvatarFailed] = useState(false);
  useEffect(() => setAvatarFailed(false), [avatar?.src]);

  const body = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className={`fixed inset-0 ${zClass} grid place-items-center bg-[#03060E]/85 p-4 backdrop-blur-sm`}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={displayName}
        onClick={(e) => e.stopPropagation()}
        /* 🔵 NEON QAYTA DIZAYN (2026-09-10) — ilgari `geo-strip-card` edi. */
        /* 🔵 TO'LIQ EKRAN (2026-10-23, foydalanuvchi so'rovi) — balandlik
           QAT'IY, mazmun yuklanishiga qarab oyna "sakramaydi". */
        className="neon-modal neon-modal--violet flex h-[92vh] w-[min(1240px,96vw)] flex-col overflow-hidden"
      >
        <header className="relative flex flex-none h-[100px] flex-wrap items-center gap-3 border-b border-white/[0.08] px-4 py-3">
          {/* ── SHAXS RASMI — bosilsa KATTALASHADI ──
              Ilgari bu yerda faqat umumiy `UserFocus` ikonkasi turardi va
              oynada odamning O'ZI umuman ko'rinmasdi: kim haqida gap
              ketayotganini faqat ismdan bilish mumkin edi. Rasm
              ustuvorligi `FaceDatabasePage` bilan AYNI: bazadagi surat →
              kamera kadri. */}
          {avatar && !avatarFailed ? (
            <button
              type="button"
              onClick={() => setAvatarOpen(true)}
              title={pnl.zoomPhoto}
              className="group relative h-full w-[80px] flex-none overflow-hidden rounded-lg ring-1 ring-ice/25 hover:ring-ice/60"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={avatar.src} alt={displayName} onError={() => setAvatarFailed(true)} className="h-full w-full object-cover" />
              <span className="absolute inset-0 grid place-items-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                <MagnifyingGlassPlus size={14} className="text-white" />
              </span>
            </button>
          ) : (
            <span className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-ice/15 text-ice-bright">
              <UserFocus size={17} weight="duotone" />
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-bold text-white">{displayName}</p>
            <p className="truncate text-[10.5px] text-slate-500">
              {subtitle}
              {faceId != null && `${subtitle ? " · " : ""}#${faceId}`}
            </p>
          </div>
          {stats && (
            <span className="hidden flex-none rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[10.5px] font-semibold text-slate-300 sm:inline">
              <span className="neon-num font-mono font-bold">{n(stats.total)}</span> marta ko&apos;ringan
            </span>
          )}

          {/* "Bog'lash" — FAQAT ro'yxatga hali BOG'LANMAGAN yuz uchun
              (`FRONTEND.md` "yangi" — `POST /faces/{id}/assign`). Bu
              odam rasmsiz qo'shilgan yoki model uni ikkinchi guruhga
              ajratib yuborgan bo'lishi mumkin. */}
          {stats && faceId != null && !data?.person && (
            <button
              type="button"
              onClick={() => setAssignOpen((v) => !v)}
              className="flex flex-none items-center gap-1.5 rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-300 hover:border-emerald-400/70"
            >
              <LinkIcon size={13} weight="bold" />
              {pnl.link}
            </button>
          )}
          {/* "Ajratish" — ADASHIB bog'langan bo'lsa, `person_id: null`. */}
          {stats && faceId != null && data?.person && (
            <button
              type="button"
              onClick={() => assign.mutate(null)}
              disabled={assign.isPending}
              title={pnl.unlinkHint}
              className="flex flex-none items-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-400/10 px-2.5 py-1.5 text-[11px] font-semibold text-amber-300 hover:border-amber-400/70 disabled:opacity-50"
            >
              <LinkBreak size={13} weight="bold" />
              {pnl.unlink}
            </button>
          )}

          <button type="button" onClick={onClose} className="neon-icon-btn h-8 w-8 flex-none" aria-label={t.common.close}>
            <X size={17} />
          </button>

          {assignOpen && <AssignPicker onPick={(id) => assign.mutate(id)} busy={assign.isPending} />}
        </header>
        {assign.isError && (
          <p className="flex-none border-b border-rose-500/20 bg-rose-500/[0.06] px-4 py-1.5 text-[11px] text-rose-300">
            {pnl.linkFailed}
          </p>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {/* 🔴 BITTA UMUMIY AYLANUVCHI BELGI YO'Q (2026-10-23, foydalanuvchi
              so'rovi). Ilgari server javobi kelguncha butun oyna bo'sh
              turardi. Endi sarlavha (ism, rasm) darhol, bo'limlar esa
              o'z joyida ALOHIDA yuklanadi — qaysi qism hali kelmagan bo'lsa
              o'sha qismda skelet (`Skeleton`) turadi. */}
          {!q.isLoading && !stats ? (
            <p className="py-10 text-center text-[12px] text-slate-500">{pnl.notFound}</p>
          ) : (
            <>
              {/* JAMI / DAVOMAT FOIZI / OXIRGI / KUNLAR / KAMERALAR
                  ⚠️ "Birinchi marta" O'RNIGA "Davomat foizi" (2026-09-10,
                  foydalanuvchi so'rovi) — kameraga birinchi tushgan sana
                  o'zi kam ma'noli edi, davomat esa doim so'raladigan
                  ko'rsatkich. Faqat davomat ro'yxatidagi shaxs uchun
                  (`attRole` topilganda) — notanish yuzda bu tushuncha yo'q. */}
              {!stats ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Skeleton key={i} className="h-[58px]" />
                  ))}
                </div>
              ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                <StatCell label={pnl.total} value={n(stats.total)} hint={pnl.hintAllCases} />
                <StatCell
                  label={pnl.attRate}
                  value={attRole == null ? "—" : attRate.isLoading ? "…" : attRate.rate != null ? `${attRate.rate}%` : "—"}
                  hint={
                    attRole == null
                      ? pnl.hintNotInList
                      : attRate.rate != null
                        ? pnl.hintLast7Days(n(attRate.days))
                        : pnl.hintLast7
                  }
                />
                <StatCell
                  label={pnl.lastSeen}
                  value={stats.last_seen ? nvrTime(stats.last_seen) : "—"}
                  hint={stats.last_seen ? dateOnly(stats.last_seen) : pnl.hintNotSeen}
                />
                <StatCell label={pnl.days} value={n(stats.days)} hint={pnl.hintDaysSeen} />
                <StatCell label={t.common.cameras} value={n(stats.cameras.length)} hint={pnl.hintCountUnit} />
              </div>
              )}

              {/* 🔵 ARALASH GURUH OGOHLANTIRISHI (`FRONTEND.md`, 2026-09-10
                  kechki — "Shaxs tarixiga BEGONA kadrlar tushmaydi").
                  `mixed_face_ids` bo'sh bo'lmasa — shu odamning bir yoki
                  bir nechta yuz guruhi ARALASH (ichida boshqa odamning
                  ismli kadri ham bor edi), server faqat ISHONCHLI
                  kadrlarni oldi — ya'ni bu yerdagi tarix TO'LIQ emas
                  bo'lishi mumkin. Jim qoldirilmaydi, sababi ochiq yoziladi. */}
              {data && data.mixed_face_ids && data.mixed_face_ids.length > 0 && (
                <p className="mt-2.5 rounded-lg border border-amber-400/25 bg-amber-400/[0.08] px-3 py-2 text-[10.5px] leading-snug text-amber-300">
                  ⚠️ {pnl.mixedWarn}
                </p>
              )}

              {/* ⚠️ "QAYSI KAMERADA" jadvali OLIB TASHLANDI (2026-10-23,
                  foydalanuvchi so'rovi). Kamera soni yuqoridagi KPI'da,
                  har kadrning kamerasi "Barcha kadrlar"da ko'rinadi.
                  Server `stats.cameras`ni beraveradi — qaytarish kerak
                  bo'lsa git tarixidan. */}

              {/* QAYSI KUNLARI — OY KESIMIDA KALENDAR + KUN TAFSILOTI */}
              <Section icon={CalendarBlank} title={pnl.whichDays} hint={stats ? pnl.daysTotal(n(stats.by_day.length)) : undefined}>
                {!stats ? (
                  <Skeleton className="h-[260px]" />
                ) : (
                <AttendanceCalendarSection
                  byDay={stats.by_day}
                  firstSeen={stats.first_seen}
                  lastSeen={stats.last_seen}
                  events={data?.events ?? []}
                  personId={data?.person?.id ?? personId ?? null}
                />
                )}
              </Section>

              {/* ⚠️ "FAOL KAMERALAR" BO'LIMI OLIB TASHLANDI (2026-09-10,
                  foydalanuvchi so'rovi) — son yuqoridagi "Kameralar"
                  StatCell'ida ALLAQACHON bor edi, bu yerda faqat
                  takrorlanardi va joy egallardi. */}

              {/* 🔴 "BOSHQA HODISALAR" (`PersonIncidents`) va "BARCHA KADRLAR"
                  (davr filtri + kadr panjarasi + sahifalash) BO'LIMLARI OLIB
                  TASHLANDI (2026-10-23, foydalanuvchi so'rovi, skrinshot
                  bilan). Kadrlar "Aniqlanganlar" bo'limida o'z filtri va
                  sahifalashi bilan bor; hodisa biriktirish esa o'sha
                  hodisaning dossiyesidan qilinadi. Bu bilan `EventDossier`,
                  davr/sahifa holati ham ketdi (kalendar kun kesimidagi
                  kadrlar — `DayDetail` — o'z joyida qoladi). */}
            </>
          )}
        </div>
      </div>

      {/* ⚠️ Ko'ruvchi SHU oynaning USTIDAN ochiladi va o'zi `z-[70]` da —
          bu oyna esa `z-[85]`. Shuning uchun o'ram bilan ko'tariladi,
          aks holda ostida ko'rinmay qolardi. `stopPropagation` ham shart:
          React hodisasi portal orqali ham DARAXT bo'yicha ko'tariladi va
          ko'ruvchidagi klik shu oynaning `onClick={onClose}` iga yetib
          borardi (`EventDossier` bilan AYNI tuzoq). */}
      {avatarOpen && avatarImages.length > 0 && (
        <div className="fixed inset-0 z-[95]" onClick={(e) => e.stopPropagation()}>
          <ImageLightbox images={avatarImages} initialIndex={0} onClose={() => setAvatarOpen(false)} />
        </div>
      )}
    </motion.div>
  );

  return typeof document === "undefined" ? null : createPortal(body, document.body);
}

/**
 * `PersonOut`/`NvrPerson` yozuvida `face_id` YO'Q — ular ikkalasi ham
 * ENROLLMENT ro'yxati, `NvrFaceRow` esa kuzatuv JURNALI (bog'lanmagan
 * tizimlar). Shuning uchun ism bo'yicha mos `face_id` qidiriladi:
 * `PeoplePage` (ro'yxatdagi shaxs bosilganda) va `FaceDatabasePage`
 * (yuz bazasi kartochkasi bosilganda) ikkalasi ham SHU qobiqdan
 * foydalanadi — qidiruv mantig'i bitta joyda.
 *
 * ⚠️ Aniq FK yo'qligi degani — ism to'qnashuvi (bir xil ism-familiya
 * ikki kishida) noto'g'ri odamni ko'rsatishi MUMKIN. Bu API'ning o'zi
 * qo'ygan chegara, klientda tuzatib bo'lmaydi.
 */
export function FaceHistoryModalByName({ name, onClose }: { name: string; onClose: () => void }) {
  const pnl = useT().people.panel;
  const q = useQuery({
    queryKey: ["nvr-face-by-name", name],
    queryFn: () => listFaces({ search: name, known: "yes", limit: 5 }),
    staleTime: 30_000,
  });
  const hit = q.data?.faces.find((f) => f.name === name) ?? q.data?.faces[0] ?? null;
  const faceId = hit?.face_id ?? null;

  if (q.isLoading) return null;

  if (!faceId) {
    return (
      <div onClick={onClose} className="fixed inset-0 z-[85] grid place-items-center bg-[#03060E]/85 p-4 backdrop-blur-sm">
        <div onClick={(e) => e.stopPropagation()} className="hik-glass-blue rounded-xl px-5 py-4 text-[12.5px] text-slate-300">
          {pnl.notSeenYet}
          <button type="button" onClick={onClose} className="ml-3 text-ice-bright hover:underline">
            Yopish
          </button>
        </div>
      </div>
    );
  }

  return <FaceHistoryModal faceId={faceId} onClose={onClose} />;
}

/**
 * "Bog'lash" tugmasi ostida ochiladigan qidiruv+ro'yxat — yuz bazasidagi
 * (`/nvr/people`) odamlardan birini tanlash uchun. Tasdiqlash YO'Q
 * (bitta bosish yetarli) — ro'yxat kichik (yuz bazasi 397 ta), xato
 * bosilsa "Ajratish" bilan darhol tuzatiladi.
 */
function AssignPicker({ onPick, busy }: { onPick: (personId: number) => void; busy: boolean }) {
  const t = useT();
  const pnl = t.people.panel;
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(id);
  }, [search]);

  const q = useNvrPeople({ search: debounced || undefined, limit: 20 });
  const people = q.data?.people ?? [];

  return (
    <div className="absolute right-4 top-full z-10 mt-1.5 w-[280px] rounded-xl border border-white/10 bg-ink-panel p-2 shadow-2xl">
      <label className="hik-input mb-1.5 flex h-8 items-center gap-1.5 px-2">
        <MagnifyingGlass size={12} className="flex-none text-slate-500" />
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={pnl.searchName}
          className="w-full bg-transparent text-[11.5px] outline-none placeholder:text-slate-600"
        />
      </label>
      <div className="h-[220px] overflow-y-auto">
        {q.isLoading ? (
          <ListSkeleton rows={4} />
        ) : people.length === 0 ? (
          <EmptyState compact className="py-3" title={t.common.nothingFound} />
        ) : (
          people.map((p) => (
            <button
              key={p.id}
              type="button"
              disabled={busy}
              onClick={() => onPick(p.id)}
              className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-[11.5px] text-slate-200 hover:bg-white/[0.06] disabled:opacity-50"
            >
              <span className="truncate">{p.full_name}</span>
              <span className="flex-none text-[9.5px] text-slate-500">{p.role_label}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function dateOnly(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("uz-UZ");
}

const pad2 = (v: number) => String(v).padStart(2, "0");

/** `"2026-09"` → bir oy oldingi/keyingi `"YYYY-MM"`. */
function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
}

/**
 * "Qaysi kunlari" — OY KESIMIDA kalendar (2026-09-09, foydalanuvchi so'rovi).
 *
 * ⚠️ Ilgari `stats.by_day` FLAT RO'YXAT bo'lib chizilardi — bir yillik
 * tarixda bu yuzlab qatorlik skroll bo'lib, birorta kunni ham qulay topib
 * bo'lmasdi. Endi BITTA OY bir vaqtning o'zida ko'rsatiladi (‹ › bilan
 * almashtiriladi, standart — OXIRGI ko'ringan oy), har kun katakchada:
 *
 * | Belgi | Ma'nosi |
 * |---|---|
 * | ✓ (yashil) | shu kuni kamerada ko'ringan (`by_day`da bor) |
 * | ✕ (qizil) | kuzatuv oralig'ida (birinchi–oxirgi ko'rinish orasida), lekin shu kuni yo'q |
 * | bo'sh | oraliqdan TASHQARIDA — bu haqda ma'lumot yo'q, "kelmadi" DEGANI EMAS |
 *
 * Server `by_day` faqat ko'rinilgan kunlarni beradi (`FRONTEND.md` 5-B) —
 * "kelmagan" kunlar shu ro'yxatda YO'Q, shuning uchun "yo'qligi" (X) faqat
 * `first_seen`/`last_seen` ORALIG'I ICHIDA chiziladi: undan oldin/keyin
 * kuzatuv umuman yo'q edi, u yerda X chizish yolg'on xulosa bo'lardi.
 */
/**
 * `weekend` maydonini (`"5,6"` — dushanba 0, FRONTEND.md 10-B) kunlar
 * to'plamiga o'giradi. Settings hali kelmagan/xato bo'lsa bo'sh
 * to'plam qaytadi — hech qaysi kun "dam olish" deb belgilanmaydi
 * (jim yolg'iz taxmin qilinmaydi).
 *
 * ⚠️ **BO'SH QATOR ATAYLAB TASHLAB YUBORILADI** (2026-09-09 da topilgan
 * xato: `settings` kelmagan payt `csv` `undefined` bo'lardi,
 * `"".split(",")` esa `[""]` beradi — `Number("")` JavaScript'da
 * **`0`** qaytaradi (`NaN` EMAS), ya'ni bo'sh qator "0" — DUSHANBA —
 * deb noto'g'ri o'qilardi. `part.trim()` bo'sh bo'lsa shu yerda
 * o'tkazib yuboriladi, endi manba butunlay yo'q bo'lsa ham hech qaysi
 * kun tasodifan "dam olish" bo'lib chiqmaydi.
 */
function parseWeekend(csv: string | undefined): Set<number> {
  const out = new Set<number>();
  for (const part of (csv ?? "").split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const n = Number(trimmed);
    if (Number.isInteger(n) && n >= 0 && n <= 6) out.add(n);
  }
  return out;
}

type ByDayEntry = { day: string; count: number; first_seen: string; last_seen: string };
type DayStatus = "present" | "excused" | "absent" | "weekend" | "outside";

/**
 * Bir kunning holati — kalendar VA kun tafsiloti ikkalasi ham SHU BITTA
 * qoidadan o'qiydi (ikki joyda ikki xil mantiq yozilmasin).
 *
 * Tartib muhim: avval "kelganmi" (`hit`), keyin "dam olish kuni"mi,
 * keyin "oraliqdanmi", oxirida — agar shu uchalasi ham yo'q bo'lsa —
 * sababli/sababsiz. Sabab FAQAT ro'yxatga OLINGAN shaxs uchun
 * tekshiriladi (`personKey` — `lib/absenceReasons.ts` xuddi shu
 * kalitni ishlatadi, `AttendanceListModal.tsx` da ham).
 */
function dayStatusOf(
  dateStr: string,
  dayMap: Map<string, ByDayEntry>,
  weekend: Set<number>,
  firstDate: string,
  lastDate: string,
  personKey: string | null
): { status: DayStatus; hit?: ByDayEntry } {
  const hit = dayMap.get(dateStr);
  if (hit) return { status: "present", hit };
  const weekdayIdx = (new Date(`${dateStr}T00:00:00`).getDay() + 6) % 7;
  if (weekend.has(weekdayIdx)) return { status: "weekend" };
  if (dateStr < firstDate || dateStr > lastDate) return { status: "outside" };
  if (personKey) {
    const r = getReason(dateStr, personKey);
    if (r && EXCUSED_CODES.includes(r.code)) return { status: "excused" };
  }
  return { status: "absent" };
}

/**
 * Har holat uchun rang — kalendar katakchasi VA kun tafsiloti bir xil
 * ishlatadi.
 *
 * ⚠️ **SAYT DIZAYNIGA MOSLASHTIRILDI** (2026-09-09, foydalanuvchi so'rovi:
 * "kalendar rangini sayt design rangiga moslashtir, light va darkmodlarga
 * ham"). Ilgari bu yerda o'zboshimcha rgba soya/gradient bor edi — ular
 * qorong'i fon uchun QOTIRILGAN edi va yorug' rejimda (`[data-theme=
 * "light"]`, `src/index.css`) umuman moslashmasdi. Endi ranglar
 * `StatAttendance.tsx` dagi `TONE` jadvali bilan AYNI (early/late/absent/
 * waiting) — bu qiymatlar loyihada ALLAQACHON ikkala mavzuda ham
 * sinalgan, chunki `text-slate-*`/`bg-white/[x]`/`border-white/[x]`
 * `index.css`dagi umumiy qoidalar orqali avtomatik almashadi. */
const STATUS_STYLE: Record<DayStatus, { badge: string; dot: string; label: string }> = {
  present: { badge: "border border-emerald-400/25 bg-emerald-400/12 text-emerald-300", dot: "bg-emerald-400", label: "Kelgan" },
  excused: { badge: "border border-amber-400/25 bg-amber-400/12 text-amber-300", dot: "bg-amber-400", label: "Sababli" },
  absent: { badge: "border border-rose-400/25 bg-rose-500/12 text-rose-300", dot: "bg-rose-400", label: "Kelmagan" },
  weekend: { badge: "border border-white/10 bg-white/[0.05] text-slate-400", dot: "bg-slate-500", label: "Dam olish kuni" },
  outside: { badge: "border border-white/[0.04] bg-transparent text-slate-600", dot: "bg-slate-700", label: "Ma'lumot yo'q" },
};

/**
 * Kalendar + kun tafsiloti — 2026-09-09, foydalanuvchi so'rovi: "har bir
 * sanaga bosganda o'sha kundagi ma'lumotlari o'ng tomon panelida
 * ochilishi kerak, yarimida kelendar yarimida esa bir kun tafsiloti".
 *
 * Ikkala yarim BIR XIL holat hisoblagichidan (`dayStatusOf`) o'qiydi —
 * shu yerda BIR MARTA hisoblanadi (dam olish kunlari sozlamasi + sabab
 * reyestri), ikkala bola komponentga tayyor funksiya sifatida uzatiladi.
 */
function AttendanceCalendarSection({
  byDay,
  firstSeen,
  lastSeen,
  events,
  personId,
}: {
  byDay: ByDayEntry[];
  /* ⚠️ `null` bo'lishi mumkin — ro'yxatga OLINGAN, lekin hali BIRON
     marta kamerada KO'RINMAGAN shaxs uchun (`stats.total:0`,
     `nvrApi.ts` dagi izohga qarang; o'lchandi 2026-09-11: 642 tadan
     150 tasi shu holatda — TypeError "Cannot read properties of null
     (reading 'slice')" shuning uchun berilardi). */
  firstSeen: string | null;
  lastSeen: string | null;
  events: NvrEvent[];
  /** Ro'yxatga OLINGAN shaxs raqami (`NvrPerson.id`) — sabab qidirish uchun. `null` — notanish yuz, sabab tekshirilmaydi. */
  personId: number | null;
}) {
  const pnl = useT().people.panel;
  /* 🔵 BUGUNGI (aniqrog'i — OXIRGI ko'ringan) KUN AVTO TANLANGAN
     (2026-10-23, foydalanuvchi so'rovi): profil ochilishi bilan o'ng
     yarimda shu kunning holati va OXIRGI kadr videosi turadi, kalendardan
     kun tanlash shart emas. */
  const [selectedDay, setSelectedDay] = useState<string | null>(lastSeen?.slice(0, 10) ?? null);
  useEffect(() => {
    const d = lastSeen?.slice(0, 10) ?? null;
    setSelectedDay((cur) => cur ?? d);
  }, [lastSeen]);
  const dayMap = useMemo(() => new Map(byDay.map((d) => [d.day, d])), [byDay]);
  /* Hooklar SHARTSIZ chaqirilishi shart (`DayDetail`dagi bilan bir xil
     qoida) — shuning uchun `null` bo'lsa ham bo'sh qator bilan davom
     etiladi, RENDER esa pastda shu holatni alohida ko'rsatadi. */
  const firstDate = firstSeen?.slice(0, 10) ?? "";
  const lastDate = lastSeen?.slice(0, 10) ?? "";
  const personKey = personId != null ? String(personId) : null;

  /* Dam olish kunlari — davomat sozlamalaridan (`/attendance/settings`,
     ALLAQACHON `StatAttendance.tsx` shu manzilni ishlatadi). */
  const settingsQ = useQuery({
    queryKey: ["nvr-attendance-settings"],
    queryFn: getAttendanceSettings,
    staleTime: 10 * 60_000,
  });
  const weekend = useMemo(() => parseWeekend(settingsQ.data?.weekend), [settingsQ.data]);

  /* Sabab reyestri `localStorage`da — operator boshqa oynada belgilasa
     ham bu kalendar DARHOL yangilansin (`AbsenceReasonModal`dagi bilan
     AYNI store, `useSyncExternalStore` naqshi). */
  useSyncExternalStore(subscribeAbsence, absenceSnapshot, absenceSnapshot);

  const statusOf = (dateStr: string) => dayStatusOf(dateStr, dayMap, weekend, firstDate, lastDate, personKey);

  if (!firstSeen || !lastSeen) {
    return (
      <p className="py-6 text-center text-[11.5px] leading-snug text-slate-500">
        {pnl.noCalendar}
      </p>
    );
  }

  /* 🔵 2026-10-26 — kun ma'lumoti va kadrlar KALENDAR OSTIDA, o'ng ustun
     FAQAT VIDEO (kattaroq) — foydalanuvchi: "shu qismni kalendar ostiga qo'yib,
     videoni sal kattalashtirsak". Tartibni `DayDetail` quradi. */
  return (
    <DayDetail
      day={selectedDay}
      statusOf={statusOf}
      events={events}
      calendar={
        <AttendanceCalendar firstSeen={firstSeen} lastSeen={lastSeen} statusOf={statusOf} selectedDay={selectedDay} onSelectDay={setSelectedDay} />
      }
    />
  );
}

/**
 * Kalendarning O'ZI — rasmdagi TARKIBIY dizaynga moslab qurilgan (dumaloq
 * kunlar, dumaloq oy tugmalari, oldingi/keyingi oy kunlari XIRA), lekin
 * RANGLAR sayt palitrasidan (`STATUS_STYLE` — quyidagi izohga qarang):
 * rasmdagi qattiq yashil emas, loyihaning `ice`/`slate`/status ranglari,
 * ya'ni qorong'i VA yorug' rejimda ham to'g'ri ishlaydi.
 */
function AttendanceCalendar({
  firstSeen,
  lastSeen,
  statusOf,
  selectedDay,
  onSelectDay,
}: {
  firstSeen: string;
  lastSeen: string;
  statusOf: (dateStr: string) => { status: DayStatus; hit?: ByDayEntry };
  selectedDay: string | null;
  onSelectDay: (day: string) => void;
}) {
  const pnl = useT().people.panel;
  const t = useT();
  const firstDate = firstSeen.slice(0, 10);
  const lastDate = lastSeen.slice(0, 10);
  const firstMonth = firstDate.slice(0, 7);
  const lastMonth = lastDate.slice(0, 7);

  const [month, setMonth] = useState(lastMonth);
  /* Ko'rsatilayotgan oy chegaradan tashqariga chiqmaydi — boshqa shaxs
     tanlanib `firstMonth`/`lastMonth` o'zgarsa ham (`stats` almashadi)
     eski oy tashqarida qolib ketmasin. */
  const shown = month < firstMonth ? firstMonth : month > lastMonth ? lastMonth : month;

  const [y, m] = shown.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  /* `getDay()` yakshanbadan (0) boshlaydi, panjara esa dushanbadan. */
  const firstWeekday = (new Date(y, m - 1, 1).getDay() + 6) % 7;
  const prevMonthDays = new Date(y, m - 1, 0).getDate();

  const canPrev = shown > firstMonth;
  const canNext = shown < lastMonth;

  /* Panjara TO'LIQ to'ldiriladi — oldingi/keyingi oydan XIRA kunlar bilan
     (rasmdagi kabi: "26 27 28 29" fevraldan, martdan keyin ham xuddi
     shunday to'ldirilishi mumkin). Bular BOSILMAYDI — faqat vizual. */
  const cells: { day: number; kind: "prev" | "cur" | "next" }[] = [
    ...Array.from({ length: firstWeekday }, (_, i) => ({ day: prevMonthDays - firstWeekday + i + 1, kind: "prev" as const })),
    ...Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, kind: "cur" as const })),
  ];
  const trail = (7 - (cells.length % 7)) % 7;
  for (let i = 0; i < trail; i++) cells.push({ day: i + 1, kind: "next" });

  const monthLabel = t.chart.months[m - 1] ? `${t.chart.months[m - 1][0].toUpperCase()}${t.chart.months[m - 1].slice(1)}` : shown;

  /* Dumaloq tugma — sayt urg'u rangida (`ice`), qattiq yashil EMAS.
     `border-ice`/`bg-ice`/`text-ice` — `index.css`dagi umumiy substring
     qoidalari orqali yorug' rejimda o'zi to'g'ri rangga o'tadi. */
  const navBtn =
    "grid h-9 w-9 flex-none place-items-center rounded-full border border-ice/30 bg-ice/[0.12] text-ice-bright " +
    "transition-colors hover:border-ice/50 hover:bg-ice/[0.2] disabled:opacity-25 disabled:hover:bg-ice/[0.12]";

  return (
    /* Sirt — `Section` bilan AYNI reyestr (`border-white/[x]`/`bg-white/
       [x]`), ya'ni ikkala mavzuda ham to'g'ri ko'rinadi. */
    <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] p-4">
      <div className="mb-3 flex flex-none items-center justify-between">
        <button type="button" disabled={!canPrev} onClick={() => setMonth(shiftMonth(shown, -1))} title={pnl.prevMonth} className={navBtn}>
          <CaretLeft size={15} weight="bold" />
        </button>
        <p className="text-[13px] font-semibold tracking-wide text-white">
          {monthLabel}, {y}
        </p>
        <button type="button" disabled={!canNext} onClick={() => setMonth(shiftMonth(shown, 1))} title={pnl.nextMonth} className={navBtn}>
          <CaretRight size={15} weight="bold" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-2">
        {t.chart.weekdays.map((w) => (
          <span key={w} className="pb-1.5 text-center text-[9.5px] font-semibold uppercase tracking-wide text-slate-500">
            {w.slice(0, 3)}
          </span>
        ))}
        {cells.map(({ day, kind }, i) => {
          /* Oldingi/keyingi oy — XIRA, bosilmaydi (faqat panjarani
             to'ldirish uchun, rasmdagi 26-29 kabi). */
          if (kind !== "cur") {
            return (
              <div key={`${kind}-${i}`} className="flex items-center justify-center">
                <span className="grid h-8 w-8 place-items-center font-mono text-[10.5px] text-slate-700">{day}</span>
              </div>
            );
          }

          const dateStr = `${shown}-${pad2(day)}`;
          const { status } = statusOf(dateStr);
          const style = STATUS_STYLE[status];
          const clickable = status !== "outside";
          const isSelected = selectedDay === dateStr;

          return (
            <div key={dateStr} className="flex items-center justify-center">
              <button
                type="button"
                disabled={!clickable}
                onClick={() => onSelectDay(dateStr)}
                title={`${dateStr} — ${style.label}`}
                className={`grid h-8 w-8 place-items-center rounded-full font-mono text-[11px] font-semibold transition-transform ${style.badge} ${
                  clickable ? "hover:scale-110" : "cursor-default"
                } ${isSelected ? "ring-2 ring-ice-bright" : ""}`}
              >
                {day}
              </button>
            </div>
          );
        })}
      </div>

      {/* Rang izohi — sababli (sarg'ish) shu bilan qo'shildi. */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9.5px] text-slate-500">
        <Legend tone="bg-emerald-400" label={pnl.came} />
        <Legend tone="bg-rose-400" label={pnl.absentDay} />
        <Legend tone="bg-amber-400" label={pnl.excused} />
        <Legend tone="bg-slate-500" label={t.board.weekend} />
      </div>
    </div>
  );
}

/**
 * O'NG YARIM — bosilgan kunning tafsiloti. Kun tanlanmagan bo'lsa
 * bo'sh holat ("kunni tanlang"). Kadrlar — SHU kunga tegishli
 * hodisalar (`events` butun tarixdan `dateStr` bo'yicha filtrlanadi),
 * bosilsa mavjud `EventDossier` ochiladi.
 */
function DayDetail({
  day,
  statusOf,
  events,
  calendar,
}: {
  day: string | null;
  statusOf: (dateStr: string) => { status: DayStatus; hit?: ByDayEntry };
  events: NvrEvent[];
  /** Kalendar — chap ustunning tepasida, kun ma'lumoti uning OSTIDA. */
  calendar: ReactNode;
}) {
  const pnl = useT().people.panel;
  const t = useT();
  const [openId, setOpenId] = useState<number | null>(null);
  /* ⚠️ Hooks QOIDASI — `day` bo'lmaganda ham SHU TARTIBDA chaqirilishi
     shart, aks holda "kun tanlanmagan → tanlangan" o'tishida hook soni
     o'zgarib React xato beradi. Shu sabab shart ICHIDA emas, tashqarida
     (bo'sh massiv — `day` yo'q bo'lsa filtr baribir hech nima bermaydi). */
  const dayFrames = useMemo(() => (day ? events.filter((e) => e.time.slice(0, 10) === day) : []), [events, day]);
  /* 🔵 KADRLAR — KARUSEL, VIDEO USTIDA (2026-10-23, foydalanuvchi so'rovi,
     skrinshot bilan): ilgari kadrlar panel PASTIDA 4 ustunli to'r + sahifalash
     edi, video esa DOIM oxirgi kadrniki. Endi kadrlar vaqt yorlig'i o'rnida,
     bir qatorda (`FRAME_WINDOW` tasi ko'rinadi, strelka bilan suriladi),
     bosilgan kadrning VIDEOSI pastda ochiladi. Kun almashsa — boshiga va
     eng oxirgi kadrga qaytadi (`events` yangidan eskiga kelgani uchun
     `dayFrames[0]` — kunning oxirgi kadri). */
  /* 🔵 2026-10-26 — kadrlar KATTAROQ (3 ta, 16:9) + har kadrda 🔍 "rasmni
     ko'rish" (foydalanuvchi: "rasm cardlarini kattalashtir, bosganda rasmni
     ham ko'rib bo'lsin"). Kadrning o'zi bosilsa — o'sha kadr VIDEOSI. */
  /* O'sha kuni ikkinchi so'rov: "ikkitadan joylashtir, kattaroq" — 2 ustun,
     sahifada 4 ta (2×2). Ustunlar soni `FRAME_COLS`, sahifa — `FRAME_WINDOW`. */
  const FRAME_COLS = 2;
  /* Uchinchi so'rov: "faqat ikkitadan, next bossa bitta-bitta o'tib" — bitta
     qatorda 2 ta, ‹ › bir martada BITTA kadr suradi (`FRAME_STEP`). */
  const FRAME_WINDOW = 2;
  const FRAME_STEP = 1;
  /** Rasm ko'ruvchisi — kunning barcha kadrlari, ochilgan kadr indeksi */
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);
  const dayPhotos = useMemo(
    () =>
      dayFrames.flatMap((ev) => {
        const src = ev.picture_lost ? null : nvrImageUrl(ev, ev.image_count > 1 ? 1 : 0);
        return src ? [{ id: ev.id, src, label: nvrDateTime(ev.time) }] : [];
      }),
    [dayFrames]
  );
  const [frameStart, setFrameStart] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  useEffect(() => {
    setFrameStart(0);
    setSelectedId(null);
  }, [day]);
  const selected = dayFrames.find((e) => e.id === selectedId) ?? dayFrames[0] ?? null;

  /* Ikki ustun: CHAP — kalendar + kun ma'lumoti/kadrlar, O'NG — video (kengroq) */
  const grid = "grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)]";

  if (!day) {
    return (
      <div className={grid}>
        {calendar}
        <div className="grid place-items-center rounded-3xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
          <div>
            <CalendarBlank size={22} weight="duotone" className="mx-auto mb-2 text-slate-600" />
            <p className="text-[11.5px] text-slate-500">{pnl.pickDayHint}</p>
          </div>
        </div>
      </div>
    );
  }

  const { status, hit } = statusOf(day);
  const style = STATUS_STYLE[status];

  return (
    <div className={grid}>
    <div className="flex min-w-0 flex-col gap-3">
    {calendar}
    {/* `flex-1` — karta ustunning qolgan balandligini to'ldiradi, o'ngdagi
        video kartasi bilan pastki chegarasi TEKIS */}
    <div className="flex-1 rounded-3xl border border-white/[0.07] bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] font-bold text-white">
          {dayMonthLongLabel(new Date(`${day}T00:00:00`), t)}, {day.slice(0, 4)}
        </p>
        <span className="flex items-center gap-1.5">
          {/* QAYD SONI — nishon (2026-10-23, foydalanuvchi: "2 marta bo'lsa
              badge qilib qo'shish kerak"); ilgari alohida KPI kafeli edi */}
          {hit && hit.count > 0 && (
            <span
              className="rounded-full border border-ice-cyan/25 bg-ice-cyan/[0.1] px-2.5 py-1 font-mono text-[10px] font-bold text-ice-cyan"
              title={pnl.howMany}
            >
              {hit.count} {pnl.hintRecords}
            </span>
          )}
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${style.badge}`}>
            {style.label}
          </span>
        </span>
      </div>

      {/* ⚠️ "Birinchi / Oxirgi" KPI qatori OLIB TASHLANDI (2026-10-23,
          foydalanuvchi so'rovi) — vaqtlar karuseldagi har kadrda ko'rinadi.
          Qaydsiz kunda esa sabab avvalgidek yoziladi. */}
      {!hit && (
        <p className="mt-2 text-[11px] leading-snug text-slate-500">
          {status === "weekend"
            ? pnl.weekendNote
            : status === "excused"
              ? pnl.excusedNote
              : pnl.absentNote}
        </p>
      )}

      {/* ── KADRLAR KARUSELI — vaqt yorlig'i O'RNIDA, video USTIDA ── */}
      {dayFrames.length > 0 && (() => {
        const total = dayFrames.length;
        const start = Math.min(frameStart, Math.max(0, total - FRAME_WINDOW));
        const end = Math.min(total, start + FRAME_WINDOW);
        const windowFrames = dayFrames.slice(start, end);
        const canPrev = start > 0;
        const canNext = end < total;
        const navBtn =
          "grid h-7 w-7 flex-none place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-slate-300 transition-colors hover:bg-white/[0.09] hover:text-white disabled:cursor-default disabled:opacity-30 disabled:hover:bg-white/[0.04]";
        return (
          <div className="mt-3.5">
            <p className="mb-1.5 flex items-center justify-between text-[9.5px] font-bold uppercase tracking-[0.14em] text-slate-500">
              <span>{pnl.dayFrames}</span>
              <span className="font-mono normal-case tracking-normal text-slate-600">
                {start + 1}–{end} / {total}
              </span>
            </p>
            <div className="flex items-center gap-1.5">
              <button type="button" disabled={!canPrev} onClick={() => setFrameStart(Math.max(0, start - FRAME_STEP))} className={navBtn} aria-label={t.dashboard.ui.prev}>
                <CaretLeft size={13} weight="bold" />
              </button>
              <div className="grid min-w-0 flex-1 gap-2" style={{ gridTemplateColumns: `repeat(${FRAME_COLS}, minmax(0, 1fr))` }}>
                {windowFrames.map((ev) => {
                  const on = selected?.id === ev.id;
                  const photoAt = dayPhotos.findIndex((p) => p.id === ev.id);
                  return (
                    /* ⚠️ `<div>` o'ram — ichida IKKI tugma (kadr va 🔍); tugma
                       ichida tugma yaroqsiz HTML */
                    <div
                      key={ev.id}
                      className={`group relative overflow-hidden rounded-xl border transition-all ${
                        on
                          ? "border-emerald-400/70 shadow-[0_0_0_2px_rgba(52,211,153,0.25)]"
                          : "border-white/[0.1] hover:border-emerald-400/40"
                      }`}
                    >
                      <button type="button" onClick={() => setSelectedId(ev.id)} title={nvrDateTime(ev.time)} className="block w-full">
                        <DetectionThumb id={ev.id} pictureLost={ev.picture_lost} className="aspect-video w-full" alt="" index={ev.image_count > 1 ? 1 : 0} />
                        <span
                          className={`absolute inset-x-0 bottom-0 truncate px-1 py-1 text-center font-mono text-[10.5px] font-semibold ${
                            on ? "bg-emerald-500/80 text-white" : "bg-black/70 text-slate-200"
                          }`}
                        >
                          {nvrTime(ev.time)}
                        </span>
                      </button>
                      {photoAt >= 0 && (
                        <button
                          type="button"
                          onClick={() => setPhotoIndex(photoAt)}
                          title={pnl.viewPhoto}
                          aria-label={pnl.viewPhoto}
                          className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-lg border border-white/25 bg-black/60 text-white opacity-80 transition-all hover:scale-105 hover:border-cyan-300/70 hover:bg-cyan-500/40 hover:opacity-100"
                        >
                          <MagnifyingGlassPlus size={14} weight="bold" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <button type="button" disabled={!canNext} onClick={() => setFrameStart(start + FRAME_STEP)} className={navBtn} aria-label={t.dashboard.ui.next}>
                <CaretRight size={13} weight="bold" />
              </button>
            </div>
          </div>
        );
      })()}

    </div>
    </div>

      {/* ── TANLANGAN KADR VIDEOSI — O'NG USTUN, butun kenglikda ── */}
      {selected ? (
        <div className="min-w-0 rounded-3xl border border-white/[0.07] bg-white/[0.02] p-4">
          <p className="mb-1.5 flex items-center justify-between text-[9.5px] font-bold uppercase tracking-[0.14em] text-slate-500">
            <span className="font-mono text-[12px] normal-case tracking-normal text-slate-200">{nvrTime(selected.time)}</span>
            <button
              type="button"
              onClick={() => setOpenId(selected.id)}
              className="flex items-center gap-1 rounded-md px-1.5 py-0.5 normal-case tracking-normal text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <MagnifyingGlassPlus size={12} weight="bold" />
              {t.nvr.openDossier}
            </button>
          </p>
          <EventVideo key={selected.id} eventId={selected.id} videoUrl={nvrEventVideoUrl(selected.id)} />
        </div>
      ) : (
        <div className="grid place-items-center rounded-3xl border border-white/[0.06] bg-white/[0.02] p-6 text-center text-[11.5px] text-slate-500">
          {pnl.dayFrames}: 0
        </div>
      )}

      <EventDossier eventId={openId} onClose={() => setOpenId(null)} />

      {/* Rasm ko'ruvchisi — shu oynaning USTIDA (`z-[95]`), `stopPropagation`
          shart (sarlavhadagi avatar ko'ruvchisi bilan AYNI sabab). */}
      {photoIndex != null && dayPhotos.length > 0 && (
        <div className="fixed inset-0 z-[95]" onClick={(e) => e.stopPropagation()}>
          <ImageLightbox
            images={dayPhotos.map(({ src, label }) => ({ src, label }))}
            initialIndex={Math.min(photoIndex, dayPhotos.length - 1)}
            onClose={() => setPhotoIndex(null)}
          />
        </div>
      )}
    </div>
  );
}

/** Yuklanayotgan bo'lim o'rnidagi joy egallovchi — pulsatsiyali bo'sh plita. */
function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-busy="true"
      className={`relative animate-pulse overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.04] ${className}`}
    >
      <span className="absolute inset-0 grid place-items-center">
        <span className="h-5 w-5 rounded-full border-2 border-ice/30 border-t-ice/80 motion-safe:animate-spin" />
      </span>
    </div>
  );
}

function Legend({ tone, label }: { tone: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2 w-2 flex-none rounded-full ${tone}`} />
      {label}
    </span>
  );
}

function StatCell({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-2.5 py-2">
      <p className="text-[9px] uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="neon-num truncate font-mono text-[16px] font-extrabold leading-tight">{value}</p>
      <p className="truncate text-[9.5px] text-slate-500">{hint}</p>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: typeof Camera;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    /* 2026-10-26: tashqi ramka/fon OLIB TASHLANDI (foydalanuvchi: "tashqi
       borderni olib tashla") — ichidagi kalendar va kun kartasi o'z
       ramkasida, ikki qavat ramka ortiqcha edi. */
    <div className="mt-3.5">
      <div className="mb-2 flex items-center gap-1.5">
        <Icon size={13} weight="duotone" className="text-slate-400" />
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{title}</p>
        {hint && <span className="ml-auto text-[9.5px] text-slate-600">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
