/**
 * Statistika → "Umumiy" tab: respublika miqyosidagi asosiy ko'rsatkichlar.
 *
 * Sonlar ikki manbadan keladi va ULAR ARALASHTIRILMAYDI:
 *   · talaba/o'qituvchi/kamera/davomat — `useDashboardData()` (backend yoki mock),
 *   · aniqlanishlar — hodisalar oqimi (`useDetectionFeed`).
 * Har bir panel o'z manbasining JONLI/DEMO yorlig'ini ko'rsatadi.
 */
import { useEffect, useMemo, useRef, useState } from "react";
/* Phosphor duotone — ma'noga qarab: kuzatuv kamerasi (fotoapparat emas),
   o'qituvchi — doska oldida, davomat — belgilangan kalendar. */
import {
  Briefcase,
  Buildings,
  CalendarCheck,
  ChalkboardTeacher,
  Student,
  UserFocus,
} from "@phosphor-icons/react";
import { useT } from "@/i18n";
import type { PersonType } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";
import type { DashboardView } from "@/hooks/useDashboardData";
import { Donut3D } from "@/components/common/Donut3D";
import { KpiTile, StatPanel, fmt } from "@/components/common/panels";
import { localDay } from "@/hooks/useTodayArrivals";
import { useEventStats } from "@/hooks/useEventStats";
import { useAttendanceBoard } from "@/hooks/useAttendanceBoard";
import { Missing } from "@/components/common/Missing";
import { useStudentLabel } from "@/hooks/useStudentLabel";
import { StatPeriodPanel } from "./StatPeriodPanel";
import { DailyAttendancePanel } from "./DailyAttendancePanel";
import { StatDetailDrawer, type StatDetailContent } from "./StatDetailDrawer";
import type { StatPeriod } from "@/hooks/useStatPeriod";

/**
 * "Kayfiyat taqsimoti" — VAQTINCHA YASHIRILGAN (2026-10-23, foydalanuvchi
 * so'rovi: "kayfiyat umuman qo'shilmaydi, chetga olib qo'y, kerak bo'lsa
 * aytaman"). Serverda kayfiyat moduli yo'q, panel doim bo'sh turardi.
 * Qaytarish — shu bayroqni `true` qilish kifoya: halqa, bo'sh holat va
 * "Davomat dinamikasi" yonidagi o'z joyiga qaytadi. "Kamera qamrovi"
 * bo'limi esa 2026-10-23 da BUTUNLAY olib tashlandi.
 */
const SHOW_MOOD = false;


export function StatOverview({
  dash,
  period,
  onSelectType,
}: {
  dash: DashboardView;
  /** Sahifaning YAGONA davr tanlovi. */
  period: StatPeriod;
  /** O'qituvchi/Talabalar/Xodimlar kartochkasi bosilganda — o'sha tabga o'tkazadi. */
  onSelectType?: (id: PersonType) => void;
}) {
  const t = useT();
  const n = (v: number) => fmt(v, t.locale);
  const setActivePage = useAppStore((s) => s.setActivePage);
  const setInstitutionsTab = useAppStore((s) => s.setInstitutionsTab);

  /* "Bugun qayd etilganlar" KPI'si — ATAYLAB BUGUNGI kun, davrga ergashmaydi.
     Manba — `/events/stats` `total` (server hisobi, bitta yengil so'rov). */
  const today = localDay();
  const dayStats = useEventStats({ from: today, to: today });

  /**
   * "Xodimlar" va "Bugungi davomat" — `useAttendanceBoard()` dan.
   *
   * ⚠️ Respublika miqyosida XODIM SONI HECH QAYERDA YO'Q — `mockData`/
   * `geoAggregate` faqat talaba/o'qituvchi/kamera/muassasa kuzatadi.
   * Shuning uchun bu ikkala ko'rsatkich kuzatuvdagi (Chilonzor 179-maktab)
   * HAQIQIY sonidan olinadi. `useAttendanceBoard()` allaqachon
   * namoyish/aniq rejimlarni to'g'ri ajratadi (`useStudentDay` orqali:
   * aniq rejimda faqat backend, namoyishda mock zaxira) — bu yerda
   * qo'shimcha shart YOZILMAYDI, hook o'zi hal qiladi.
   */
  const board = useAttendanceBoard();
  /* "O'quvchilar" ↔ "Talabalar" — muassasa turiga qarab (`useStudentLabel`). */
  const student = useStudentLabel();
  const cat = (type: "teacher" | "staff" | "student") =>
    board.categories.find((c) => c.type === type) ?? { total: 0, present: 0, absent: 0, late: 0, rate: 0 };
  const staffCat = cat("staff");
  /* Xodim toifasini MANBA qo'llab-quvvatlaydimi (`useAttendanceBoard`). */
  const staffSupported = board.categories.find((c) => c.type === "staff")?.supported ?? false;

  /**
   * 🔴 **KPI SONLARI — kuzatuv posti DAVOMATIDAN.**
   *
   * Backend `/statistics/dashboard` amalda bo'sh (o'lchandi: 2 o'quvchi,
   * 1 o'qituvchi, davomat 0%), kuzatuv postida esa **361 o'quvchi va
   * 36 o'qituvchi** bor. Shuning uchun manba — `useAttendanceBoard()`.
   *
   * ⚠️ Ilgari bu yerda ikkinchi shox bor edi (namoyish rejimi:
   * `dash.*` — respublika mock yig'indisi). Mock butunlay olib
   * tashlanganidan keyin u kerak emas.
   */
  const kpi = useMemo(() => {
    const teacher = cat("teacher");
    const student = cat("student");
    return {
      teachers: teacher.total,
      students: student.total,
      studentsPresent: student.present,
      rate: board.totals.rate,
      absent: board.totals.absent,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board.categories, board.totals]);


  /* ⚠️ **"Yetakchi hududlar" paneli OLIB TASHLANDI** (2026-09-05):
     u `REGION_ROWS` — 14 viloyat uchun GENERATSIYA qilingan trevoga
     sonlaridan qurilardi. Backend hudud kesimini bermaydi, kuzatuv esa
     bitta obyektda — "yetakchi hududlar" ro'yxati to'liq to'qilgan edi. */

  /* Bir o'qituvchiga necha o'quvchi. Manbalardan biri yo'q bo'lsa `null`
     (qizil belgi) — nol ko'rsatish yolg'on bo'lardi. */
  const perTeacher =
    dash.teachers.total !== null && dash.teachers.total > 0 && dash.students.total !== null
      ? Math.round(dash.students.total / dash.teachers.total)
      : null;
  const moodPct =
    dash.emotions.total > 0 ? Math.round((dash.emotions.positive / dash.emotions.total) * 100) : 0;

  /**
   * "O'rtacha davomat" kartochkasi bosilganda — pastdagi "Davomat
   * dinamikasi" paneliga suziladi (`StatPeriodPanel` + shu grafik allaqachon
   * SAHIFANING YAGONA davr tanlovi — Bugun/3 kun/Hafta/Oy/Oraliq — bo'yicha
   * ishlaydi, ya'ni "aniq vaqt taqsimoti" allaqachon bor edi, faqat
   * kartochkaning o'zi unga olib bormasdi).
   */
  /**
   * ── YAGONA O'NG PANEL (2026-09-10, foydalanuvchi so'rovi) ──
   * "Davomat dinamikasi", "Kayfiyat taqsimoti" (shu fayl) va
   * "Davr kesimi"/"Kun davomidagi zichlik" (`StatPeriodPanel`/
   * `StatDensity`, `onOpenDetail` propi orqali) — HAMMASI shu BITTA
   * `StatDetailDrawer`ga mazmun yuboradi. Ilgari har biri O'Z ICHIDA
   * kichik karta ochib, chartni siqardi — endi chartlar to'liq
   * kenglikda qoladi, panel esa sahifa ustida suzadi.
   */
  const [detail, setDetail] = useState<StatDetailContent | null>(null);
  const openDetail = (c: StatDetailContent) => setDetail((cur) => (cur?.key === c.key ? null : c));
  useEffect(() => setDetail(null), [period.from, period.to, period.id]);

  const weeklyRef = useRef<HTMLDivElement>(null);
  const [highlightWeekly, setHighlightWeekly] = useState(false);
  const openWeekly = () => {
    weeklyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    setHighlightWeekly(true);
    setTimeout(() => setHighlightWeekly(false), 1400);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* ── Asosiy ko'rsatkichlar ──
          Tartib: Muassasalar → O'qituvchilar → Xodimlar → Talabalar →
          O'rtacha davomat →  Bugun kelganlar →
          Bugungi davomat. Har biri o'z manbasidan (izohlariga qarang);
          "aniq statistika" tugmasi ta'sir qiladigan kartochkalar (Xodimlar,
          Bugungi davomat va yuqoridagi respublika sonlari) HECH NARSANI
          O'YLAB TOPMAYDI — manba bo'lmasa nol chiqadi. */}
      <div className="grid grid-cols-4 gap-2 xl:grid-cols-6">
        <KpiTile
          Icon={Buildings}
          label={t.stats.kpi.institutes}
          value={n(dash.institutes)}
          tone="#8FB8FF"
          /* ⚠️ "Muassasalar" bo'limi O'Z standarti bilan (Muassasalar
             kesimi) ochilardi; kartochka esa UMUMIY manzarani so'raydi —
             shuning uchun HUDUDLAR kesimi ochiladi. */
          onClick={() => {
            setInstitutionsTab("regions");
            setActivePage("Muassasalar");
          }}
          title={t.stats.hint.openInstitutions}
        />
        <KpiTile
          Icon={ChalkboardTeacher}
          label={t.stats.kpi.teachers}
          value={n(kpi.teachers)}
          loading={board.isLoading}
          hint={perTeacher === null ? undefined : t.stats.hint.perTeacher(perTeacher)}
          tone="#A78BFA"
          onClick={onSelectType ? () => onSelectType("teacher") : undefined}
          title={t.stats.hint.openTab(t.stats.people.typeTeacher)}
        />
        {/* ⚠️ **XODIMLAR — MANBA YO'Q.** kuzatuv posti `role` da faqat
            `student`/`teacher` bor, backend `/persons?person_type=staff`
            esa bo'sh. `0` "xodim yo'q" degani emas, shuning uchun QIZIL
            belgi ko'rsatiladi (`BACKEND.md` 4-band). */}
        <KpiTile
          Icon={Briefcase}
          label={t.stats.kpi.staff}
          value={staffSupported ? n(staffCat.total) : <Missing source="kuzatuv posti /attendance · role=staff" />}
          loading={board.isLoading}
          hint={staffSupported ? t.stats.hint.present(n(staffCat.present)) : undefined}
          tone="#F59E0B"
          /* Bosilmaydi — xodimlar bo'yicha manba yo'q (2026-10-26) */
          onClick={staffSupported && onSelectType ? () => onSelectType("staff") : undefined}
          title={staffSupported ? t.stats.hint.openTab(t.stats.people.typeStaff) : undefined}
        />
        <KpiTile
          Icon={Student}
          label={student.plural}
          value={n(kpi.students)}
          loading={board.isLoading}
          hint={t.stats.hint.present(n(kpi.studentsPresent))}
          tone="#34D399"
          onClick={onSelectType ? () => onSelectType("student") : undefined}
          title={t.stats.hint.openTab(student.plural)}
        />
        <KpiTile
          Icon={CalendarCheck}
          label={t.stats.kpi.attendance}
          value={`${kpi.rate}%`}
          loading={board.isLoading}
          hint={t.stats.hint.absent(n(kpi.absent))}
          tone="#22D3EE"
          onClick={openWeekly}
          title={t.stats.hint.openWeekly}
        />

        {/* ── BUGUN QAYD ETILGANLAR ── (2026-10-26, foydalanuvchi: "bugun
            kelganlar bo'limini olib tashla, bugun qayd etilganlar qil").
            Ilgari "Bugun kelganlar" — `/faces` takrorsiz odam soni edi, server
            tomonda u DOIM `total:0` qaytaradi (`BACKEND.md` 14-band), kartochka
            "0 · 7 841 qayd" bo'lib turardi. Endi asosiy son — kamera
            qaydlari (`/events/stats` `total`), izohda xavflilari (janjal +
            qurol). Bosilsa "Aniqlanganlar" bo'limi ochiladi — u yerda qaydlar
            kartochka bo'lib, dossiye bilan ko'rinadi. `TodayArrivalsModal`
            (shu `/faces`ga qurilgan) bu yerdan olib tashlandi. */}
        <button
          type="button"
          onClick={() => setActivePage("Aniqlanganlar")}
          title={t.stats.kpi.recordsTodayGo}
          className="text-left"
        >
          <KpiTile
            Icon={UserFocus}
            label={t.stats.kpi.recordsToday}
            value={n(dayStats.total)}
            hint={t.stats.kpi.recordsTodayHint(n(dayStats.danger))}
            loading={dayStats.isLoading}
            tone="#22C55E"
          />
        </button>
       
      </div>

      {/* ── DAVR KESIMI: kunlik / haftalik / oylik / oraliq + halqa ── */}
      <StatPeriodPanel period={period} />

      {/* ── Davomat dinamikasi + kayfiyat ── */}
      <div className={`grid gap-3 ${SHOW_MOOD ? "xl:grid-cols-[1.5fr_1fr]" : ""}`}>
        {/* `ref` — "O'rtacha davomat" kartochkasi bosilganda shu yerga
            suziladi (`openWeekly`); `StatPanel` o'zi ref forward qilmaydi,
            shuning uchun tashqi o'rovchi kerak. Qisqa highlight — foydalanuvchi
            "aynan shu panelga o'tdim" deb bilsin. */}
        <div
          ref={weeklyRef}
          className={`h-full rounded-2xl transition-shadow duration-500 ${
            highlightWeekly ? "shadow-[0_0_0_2px_rgba(133,224,255,0.55)]" : ""
          }`}
        >
        {/* KUNLIK DAVOMAT — umumiy komponent (`DailyAttendancePanel`): Davomat
            tabida ham AYNI panel; Qatorlar/Grafik ko'rinishini foydalanuvchi tanlaydi. */}
        <DailyAttendancePanel period={period} onOpenDetail={openDetail} delay={0.04} />
        </div>

        {/* "Kamera qamrovi" OLIB TASHLANDI (2026-10-23, foydalanuvchi so'rovi);
            kayfiyat paneli faqat `SHOW_MOOD` bilan. */}
        {SHOW_MOOD && (
        <StatPanel
          title={t.stats.panel.emotion}
          className="min-h-[260px]"
          bodyClass="flex flex-col"
          delay={0.08}
        >
          <div className="flex flex-1 flex-col gap-3">
            {/* ⚠️ Qayd bo'lmasa halqa chizilmaydi va SABABI yoziladi:
                serverda kayfiyat moduli yo'q (`ultralytics`) — o'lchandi,
                `/statistics/emotions/daily` 30 kunda 0 ta qayd beradi.
                🔵 Shu bilan birga panel HAR IKKI holatda ham bosiladi
                (2026-09-10, foydalanuvchi so'rovi) — ma'lumot bo'lmasa
                ham SABAB shu "sidebar" ko'rinishida ochiladi, boshqa
                diagrammalar bilan BIR XIL naqsh. */}
            {SHOW_MOOD && (
            <div className="flex flex-1 justify-center">
              {dash.emotions.total > 0 ? (
                /* Hodisa turlari bilan AYNI ko'rinish — hover'da bo'lak
                   kattalashadi va markazda o'sha toifa yoziladi. */
                <Donut3D
                  data={[
                    { label: t.chart.positive, value: dash.emotions.positive, color: "#34D399" },
                    { label: t.chart.neutral, value: dash.emotions.neutral, color: "#8FB8FF" },
                    { label: t.chart.negative, value: dash.emotions.negative, color: "#FB7185" },
                  ]}
                  caption={`${moodPct}% ${t.stats.panel.positiveShort}`}
                  size={320}
                  format={n}
                  onSelect={(s) =>
                    openDetail({
                      key: `mood:${s.label}`,
                      title: s.label,
                      tone: s.color,
                      body: (
                        <div className="space-y-2">
                          <p className="font-mono text-[22px] font-bold leading-none" style={{ color: s.color }}>
                            {n(s.value)}
                            <span className="ml-1.5 text-[10.5px] font-normal text-slate-500">
                              · {((s.value / Math.max(1, dash.emotions.total)) * 100).toFixed(1)}%
                            </span>
                          </p>
                          <p className="text-[10.5px] text-slate-500">{dash.emotions.total} ta qayddan.</p>
                        </div>
                      ),
                    })
                  }
                />
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    openDetail({
                      key: "mood-empty",
                      title: "Kayfiyat ma'lumoti",
                      tone: "#F59E0B",
                      body: (
                        <p className="text-[11px] leading-snug text-slate-400">
                          Backend&apos;da kayfiyat tahlili moduli (<code>ultralytics</code>) o&apos;rnatilmagan —
                          <code>/statistics/emotions/daily</code> hozircha 0 ta qayd qaytaradi. Modul ishga tushgach bu
                          panel o&apos;zi haqiqiy sonlar bilan to&apos;ladi.
                        </p>
                      ),
                    })
                  }
                  /* `flex-1` + markaz — ramka bo'sh joyni TO'LDIRADI, matn o'rtada. */
                  className="flex w-full flex-1 flex-col items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-3 text-center transition-colors hover:border-amber-400/30 hover:bg-amber-400/[0.05]"
                >
                  <p className="text-[11.5px] font-semibold text-amber-300/90">Kayfiyat ma&apos;lumoti yo&apos;q</p>
                  <p className="mt-1 text-[10.5px] leading-snug text-slate-500">
                    Serverda kayfiyat tahlili moduli o&apos;rnatilmagan.
                  </p>
                </button>
              )}
            </div>
            )}
          </div>
        </StatPanel>
        )}
      </div>

      {/* "Kun davomidagi zichlik" (`StatDensity`) OLIB TASHLANDI — 2026-10-24,
          foydalanuvchi so'rovi ("statistika qismidan olib tashla"); fayl ham
          o'chirildi (chaqiruvchisi qolmadi), kerak bo'lsa git tarixidan. */}

      {/* ⚠️ IKKINCHI "Hodisa turlari" paneli OLIB TASHLANDI — yuqoridagi
          "Davr kesimi" qatorida halqa diagramma AYNI shu kesimni
          ko'rsatadi (son va foiz bilan). Ikkalasi bir xil sarlavha
          ostida turli son chiqarib, chalkashtirardi. */}

      {/* ⚠️ **"Yetakchi hududlar" paneli OLIB TASHLANDI** (2026-09-05) —
          u 14 viloyat uchun GENERATSIYA qilingan trevoga sonlaridan
          qurilardi. Backend hudud kesimini bermaydi. */}

      {/* ── YAGONA O'NG PANEL — yuqoridagi barcha diagrammalar shunga
          mazmun yuboradi (`onOpenDetail`/`openDetail`, yuqoridagi izohga
          qarang). `fixed` bo'lgani uchun DOM'dagi joyi ahamiyatsiz. */}
      <StatDetailDrawer detail={detail} onClose={() => setDetail(null)} />
    </div>
  );
}
