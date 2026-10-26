/**
 * "Statistika" bo'limi — batafsil raqamlar bitta joyda.
 *
 * Kesimlar (tab): umumiy · davomat · o'qituvchi · talabalar · xodimlar ·
 * hodisalar. "Odamlar oqimi" (`StatCounting`) 2026-10-26 da loyihadan
 * BUTUNLAY olib tashlandi (foydalanuvchi: "odam sanog'ini to'liq olib tashla").
 *
 * ⚠️ **Yagona "Shaxslar" tabi OLIB TASHLANDI** — ilgari uchala toifa
 * (o'qituvchi/talaba/xodim) bitta umumiy "Shaxslar" bo'limi ICHIDAGI tugma
 * qatori bilan almashtirilardi (+ "Hammasi" tanlovi). Endi uchalasi
 * TO'G'RIDAN-TO'G'RI yuqori tab — bir bosishda kerakli toifaga o'tiladi,
 * "Hammasi" esa olib tashlandi (uch alohida tab bo'lgach ortiqcha edi).
 * Kontent bir xil `StatPeople` komponentidan — endi `personType` propi
 * bilan (ilgari komponent ichki holat sifatida saqlardi).
 *
 * ⚠️ **Hududlar va Muassasalar kesimlari OLIB TASHLANDI** — ular endi
 * sidebar'dagi alohida **"Muassasalar"** bo'limida
 * (`components/institutions/InstitutionsPage.tsx`). Kod takrorlanmaydi:
 * o'sha sahifa ham xuddi shu `StatRegions`/`StatInstitutions`
 * komponentlarini chaqiradi.
 *
 * Ma'lumot manbalari ATAYLAB alohida ushlanadi va har bir panel o'z
 * JONLI/DEMO yorlig'ini ko'rsatadi:
 *   · `useDashboardData()` — talaba/o'qituvchi/kamera/davomat (backend|mock),
 *   · `useDetectionFeed()` — hodisalar oqimi (backend `/events`|demo).
 *
 * Hisob formulalari komponentda EMAS — `src/lib/statistics.ts` da (sof
 * funksiyalar), shuning uchun tekshirish oson va takrorlanmaydi.
 */
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Briefcase, CalendarBlank, ChalkboardTeacher, CheckCircle, Gauge, type Icon, MagnifyingGlass, Siren, Student, X } from "@phosphor-icons/react";
import { useT } from "@/i18n";
import { useStudentLabel } from "@/hooks/useStudentLabel";
import type { PersonType } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";
import { useDashboardData } from "@/hooks/useDashboardData";
import { TabPill } from "@/components/common/panels";
import { StatAttendance } from "./StatAttendance";
import { StatOverview } from "./StatOverview";
import { StatEvents } from "./StatEvents";
import { StatPeopleNvr } from "./StatPeopleNvr";
import { STAT_PERIODS, useStatPeriod } from "@/hooks/useStatPeriod";
import { DateRangePicker } from "@/components/common/DateRangePicker";
import { localDay } from "@/hooks/useTodayArrivals";

type Tab = "overview" | "attendance" | PersonType | "events";

export function StatisticsPage() {
  const t = useT();
  /* "O'quvchi" ↔ "Talaba" — muassasa turiga qarab (`useStudentLabel`). */
  const student = useStudentLabel();
  const dash = useDashboardData();

  const [tab, setTab] = useState<Tab>("overview");
  const [query, setQuery] = useState("");

  /* Boshqaruv panelidagi "Bugungi davomat" kartochkasi bosilganda shu
     toifaning tabi ochiladi (`AttendanceBoard.tsx` → `personTypeTarget`). */
  const personTypeTarget = useAppStore((s) => s.personTypeTarget);
  const setPersonTypeTarget = useAppStore((s) => s.setPersonTypeTarget);
  useEffect(() => {
    if (!personTypeTarget) return;
    setTab(personTypeTarget.value);
    setPersonTypeTarget(null);
  }, [personTypeTarget, setPersonTypeTarget]);
  /* ⚠️ DAVR — BUTUN SAHIFA uchun BITTA. Ilgari har tab o'z davrini o'zi
     tanlardi va bir ekranda "bugungi" bilan "oylik" sonlar yonma-yon
     chiqib, zid ko'rinardi (`hooks/useStatPeriod.ts`).
     ⚠️ **Standart "Hafta" — 2026-09-07 da "Bugun"dan o'zgartirildi**
     (foydalanuvchi so'rovi): bitta kunlik grafik sahifa ochilishida
     deyarli tekis chiziq bo'lib ko'rinardi, haftalik esa darhol
     TENDENSIYANI ko'rsatadi. Bu FAQAT pastdagi davr-bog'liq panellarga
     (grafiklar, "Davomat"/"O'qituvchi"/... jadvallari) tegishli — yuqori
     KPI qatori (`StatOverview` — Muassasalar/O'qituvchilar/Xodimlar/
     .../Bugun kelganlar) `useAttendanceBoard()`/`useTodayArrivals()`
     dan o'qiydi, `period`ga UMUMAN bog'liq EMAS, shuning uchun bu
     o'zgarishdan keyin ham DOIM bugungi kunni ko'rsataveradi. */
  const period = useStatPeriod("week");

  /* ⚠️ 2026-09-15: `useDetectionFeed()` (bugungi XOM skan) va undan
     `buildEventStats`/`buildAiSummary` OLIB TASHLANDI — ular faqat
     "Hodisalar" tabiga ZAXIRA sifatida uzatilardi, sahifa esa qaysi tab
     ochiq bo'lishidan qat'i nazar kunni sahifalab o'qirdi. Tab endi o'z
     sonlarini `GET /events/stats` dan oladi. */

  /* Ikonka ma'noga qarab: umumiy — ko'rsatkich strelkasi, uch toifa — o'z
     belgisi (o'qituvchi/talaba/xodim), hodisalar — sirena. */
  const tabs: { id: Tab; label: string; Icon: Icon }[] = [
    { id: "overview", label: t.stats.tabs.overview, Icon: Gauge },
    { id: "attendance", label: "Davomat", Icon: CheckCircle },
    { id: "teacher", label: t.stats.people.typeTeacher, Icon: ChalkboardTeacher },
    { id: "student", label: student.plural, Icon: Student },
    { id: "staff", label: t.stats.people.typeStaff, Icon: Briefcase },
    { id: "events", label: t.stats.tabs.events, Icon: Siren },
  ];

  /** Qidiruv faqat jadvalli (shaxslar) kesimlarida ma'noga ega. */
  const searchable = tab === "teacher" || tab === "student" || tab === "staff";

  return (
    /* ⚠️ `h-full`, `flex-1` EMAS. Ota-element (`<main>` — `App.tsx`)
       FLEX EMAS, shuning uchun bolaning `flex-1` i hech narsa qilmaydi:
       sahifa balandligi `auto` bo'lib, ichkaridagi `overflow-y-auto`
       konteyner CHEGARASIZ o'sardi. `<main>` da esa `overflow-hidden` —
       natijada pastki qism QIRQILARDI va skroll ham ishlamasdi. */
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* ── 1-QATOR: KESIM TABLARI ──
          ⚠️ Davr tanlovi va chop etish tugmasi bu qatordan PASTGA
          ko'chirildi (2026-09-05, foydalanuvchi so'rovi): ilgari
          uchalasi bitta qatorda edi va tor ekranda tablar davr
          pilyulalari bilan aralashib, qaysi biri nima ekani
          bilinmasdi. */}
      <div className="no-print flex flex-none flex-wrap items-center gap-1.5">
        {tabs.map((x) => (
          <TabPill
            key={x.id}
            group="stats-tab"
            active={tab === x.id}
            onClick={() => setTab(x.id)}
            Icon={x.Icon}
            /* Xodimlar — manba yo'q, bosilmaydi (2026-10-26) */
            disabled={x.id === "staff"}
            title={x.id === "staff" ? "Xodimlar bo'yicha ma'lumot hozircha yo'q" : undefined}
          >
            {x.label}
          </TabPill>
        ))}
      </div>

      {/* ── 2-QATOR: DAVR + qidiruv + chop etish ── */}
      <div className="no-print flex flex-none flex-wrap items-center gap-2 border-t border-white/[0.06] pt-2.5">
        {/* 🔵 DAVR — SEGMENTLI PANEL (2026-10-23, foydalanuvchi so'rovi: "yuqori
            tab bilan aralashib ketyapti"). Ilgari bu ham `TabPill` edi —
            yuqoridagi kesim tablari bilan AYNI ko'rinish, qaysi biri "nima",
            qaysi biri "qachon" ekani ajralmasdi. Endi: chapda "DAVR" yorlig'i
            + ikonka, bitta ramka ichida tugmalar, aktivi `neon` gradientida
            (davomat oynasidagi "Ro'yxatda" filtri bilan AYNI naqsh). */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/25 p-1">
              <span className="flex items-center gap-1.5 pl-2 pr-1.5 text-[9.5px] font-bold uppercase tracking-[0.16em] text-ice-cyan/70">
                <CalendarBlank size={13} weight="duotone" />
                {t.stats.periodLabel}
              </span>
              <span className="h-5 w-px bg-white/10" />
              {STAT_PERIODS.map((p) => {
                const active = period.id === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => period.setId(p.id)}
                    aria-pressed={active}
                    className={`relative rounded-lg px-3 py-1 text-[11.5px] font-semibold transition-colors ${
                      active ? "text-white" : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-200"
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="stats-period-seg"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                        className="absolute inset-0 rounded-lg shadow-[0_8px_20px_-10px_#22d3ee]"
                        style={{ background: "linear-gradient(90deg, #22d3ee, #818cf8)" }}
                      />
                    )}
                    <span className="relative">{p.label}</span>
                  </button>
                );
              })}
            </div>
            {/* Oraliq — loyiha uslubidagi kalendar (brauzerning tizim oynasi EMAS) */}
            {period.id === "custom" && (
              <DateRangePicker
                from={period.from}
                to={period.to}
                max={localDay()}
                onChange={(f, t2) => {
                  period.setFrom(f);
                  period.setTo(t2);
                }}
              />
            )}
          </div>

        <div className="flex-1" />

        {/* 🔵 BITTA UMUMIY "TIZIM HOLATI" (2026-10-24, UX tahlili): ilgari har
            panel burchagida alohida "JONLI" nishoni turardi — haftalik tarixiy
            grafikda bu ma'nosiz edi. Endi faqat shu yerda, sahifa tepasida. */}
        <span
          title={t.stats.panel.systemLiveHint}
          className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold ${
            dash.live ? "border-emerald-400/30 bg-emerald-400/[0.08] text-emerald-300" : "border-white/10 text-slate-500"
          }`}
        >
          <span className="relative flex h-1.5 w-1.5">
            {dash.live && <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/70" />}
            <span className={`relative h-1.5 w-1.5 rounded-full ${dash.live ? "bg-emerald-400" : "bg-slate-500"}`} />
          </span>
          {dash.live ? t.stats.panel.systemLive : t.stats.panel.systemOffline}
        </span>

        {searchable && (
          <div className="hik-input flex items-center gap-2 px-2.5 py-1.5">
            <MagnifyingGlass size={14} className="flex-none text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.stats.searchPerson}
              className="w-[220px] bg-transparent text-[11.5px] text-slate-100 outline-none placeholder:text-slate-600"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                title={t.common.close}
                className="flex-none text-slate-500 hover:text-slate-200"
              >
                <X size={12} weight="bold" />
              </button>
            )}
          </div>
        )}

        {/* "Chop etish" tugmasi OLIB TASHLANDI (2026-10-23, foydalanuvchi so'rovi). */}
      </div>

      {/* ── Kesim mazmuni ── */}
      <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
        {tab === "overview" && (
          <StatOverview dash={dash} period={period} onSelectType={setTab} />
        )}
        {searchable && (
          <StatPeopleNvr query={query} period={period} personType={tab as PersonType} onSelectType={setTab} />
        )}
        {tab === "attendance" && <StatAttendance from={period.from} to={period.to} period={period} />}
        {tab === "events" && (
          <StatEvents period={period} />
        )}
      </div>
    </div>
  );
}
