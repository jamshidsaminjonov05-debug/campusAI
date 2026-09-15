/**
 * "Statistika" bo'limi — batafsil raqamlar bitta joyda.
 *
 * OLTI kesim (tab): umumiy · o'qituvchi · talabalar · xodimlar ·
 * odamlar oqimi · hodisalar.
 *
 * ⚠️ **"Odamlar oqimi" (`StatCounting.tsx`) sahifaning umumiy DAVR
 * tanlovidan MUSTAQIL** — `FRONTEND.md` 10-A bo'limi o'z prezetlarini
 * talab qiladi (**Kecha** kerak, sahifaning `STAT_PERIODS` da yo'q), shu
 * sabab o'ng yuqoridagi umumiy davr qatori shu tabda YASHIRILADI, aks
 * holda ikkita bir-biriga bog'liq bo'lmagan davr tanlovi yonma-yon turib
 * chalkashtirardi.
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
import { Briefcase, ChalkboardTeacher, CheckCircle, DoorOpen, Gauge, type Icon, MagnifyingGlass, Printer, Siren, Student, X } from "@phosphor-icons/react";
import { useT } from "@/i18n";
import { useStudentLabel } from "@/hooks/useStudentLabel";
import type { PersonType } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";
import { useDashboardData } from "@/hooks/useDashboardData";
import { TabPill } from "@/components/common/panels";
import { StatCounting } from "./StatCounting";
import { StatAttendance } from "./StatAttendance";
import { StatOverview } from "./StatOverview";
import { StatEvents } from "./StatEvents";
import { StatPeopleNvr } from "./StatPeopleNvr";
import { STAT_PERIODS, useStatPeriod } from "@/hooks/useStatPeriod";

type Tab = "overview" | "attendance" | PersonType | "counting" | "events";

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
    { id: "counting", label: t.stats.counting.tab, Icon: DoorOpen },
    { id: "events", label: t.stats.tabs.events, Icon: Siren },
  ];

  /** Qidiruv faqat jadvalli (shaxslar) kesimlarida ma'noga ega. */
  const searchable = tab === "teacher" || tab === "student" || tab === "staff";
  /** "Odamlar oqimi" o'z davr filtriga ega — sahifaning umumiy davr
      qatori shu tabda yashiriladi (yuqoridagi izohga qarang). */
  const showPagePeriod = tab !== "counting";

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
          <TabPill key={x.id} group="stats-tab" active={tab === x.id} onClick={() => setTab(x.id)} Icon={x.Icon}>
            {x.label}
          </TabPill>
        ))}
      </div>

      {/* ── 2-QATOR: DAVR + qidiruv + chop etish ──
          "Odamlar oqimi" kesimida davr tanlovi CHIZILMAYDI — u yerda
          o'z filtri bor (yuqoridagi izohga qarang). */}
      <div className="no-print flex flex-none flex-wrap items-center gap-2 border-t border-white/[0.06] pt-2.5">
        {showPagePeriod && (
          <div className="flex flex-wrap items-center gap-1.5">
            {STAT_PERIODS.map((p) => (
              <TabPill key={p.id} group="stats-period" active={period.id === p.id} onClick={() => period.setId(p.id)}>
                {p.label}
              </TabPill>
            ))}
            {period.id === "custom" && (
              <span className="flex items-center gap-1">
                <input
                  type="date"
                  value={period.from}
                  max={period.to}
                  onChange={(e) => period.setFrom(e.target.value)}
                  className="hik-input h-7 px-2 text-[11px] text-slate-200 [color-scheme:dark]"
                />
                <span className="text-slate-500">—</span>
                <input
                  type="date"
                  value={period.to}
                  min={period.from}
                  onChange={(e) => period.setTo(e.target.value)}
                  className="hik-input h-7 px-2 text-[11px] text-slate-200 [color-scheme:dark]"
                />
              </span>
            )}
          </div>
        )}

        <div className="flex-1" />

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

        <button
          type="button"
          onClick={() => window.print()}
          title={t.stats.printHint}
          className="hik-chip px-2.5 py-1.5 text-[11px] text-slate-300 transition-colors hover:text-ice-bright"
        >
          <Printer size={14} weight="duotone" />
          {t.stats.print}
        </button>
      </div>

      {/* ── Kesim mazmuni ── */}
      <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
        {tab === "overview" && (
          <StatOverview dash={dash} period={period} onSelectType={setTab} />
        )}
        {searchable && (
          <StatPeopleNvr query={query} period={period} personType={tab as PersonType} onSelectType={setTab} />
        )}
        {tab === "attendance" && <StatAttendance from={period.from} to={period.to} />}
        {tab === "counting" && <StatCounting />}
        {tab === "events" && (
          <StatEvents period={period} />
        )}
      </div>
    </div>
  );
}
