import { motion } from "framer-motion";
import { DashboardScreen } from "@/components/dashboard/DashboardScreen";
import { Building2, LogOut, UserCircle2 } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { GlobalSearch } from "@/components/layout/GlobalSearch";
import { PageHeading } from "@/components/layout/PageHeading";
import { CamerasPage } from "@/components/cameras/CamerasPage";
import { AiAnalysisPage } from "@/components/ai/AiAnalysisPage";
import { AlertsPage } from "@/components/alerts/AlertsPage";
import { EventsHudScreen } from "@/components/events/hud/EventsHudScreen";
import { GeoAnalyticsPage } from "@/components/geo/GeoAnalyticsPage";
import { DetectionsPage } from "@/components/detections/DetectionsPage";
import { PersonsPage } from "@/components/people/PersonsPage";
import { InstitutionsPage } from "@/components/institutions/InstitutionsPage";
import { StatisticsPage } from "@/components/statistics/StatisticsPage";
import { ReportsPage } from "@/components/reports/ReportsPage";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { AuthPage } from "@/components/auth/AuthPage";
import { SpaceBackground } from "@/components/common/SpaceBackground";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { ThemeSwitcher } from "@/theme";
import { useInstitutions } from "@/hooks/useInstitutions";
import { useInstitutionScope } from "@/lib/institutionScope";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { SoundToggle } from "@/components/layout/SoundToggle";
import { DetectionToast } from "@/components/layout/DetectionToast";
import { useT } from "@/i18n";
import { useAppStore } from "@/store/useAppStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useEffect, useState } from "react";
import { VoiceProvider } from "@/services/voice/VoiceProvider";
import { FloatingVoiceButton } from "@/services/voice/FloatingVoiceButton";
import { VoiceOverlay } from "@/services/voice/VoiceOverlay";
import { usePageHistory } from "@/hooks/usePageHistory";
import { useSyncServerClock } from "@/hooks/useNvrAttendance";

export default function App() {
  const t = useT();
  const { selectedTeknikum, setSelectedTeknikum, activePage } = useAppStore();
  /* Bo'lim almashuvi ↔ brauzer tarixi: ◀ orqaga, ▶ oldinga, F5 da esa
     o'sha bo'lim qayta ochiladi (`hooks/usePageHistory.ts`). */
  usePageHistory();
  /* "Bugun"ni kuzatuv posti server zonasidan sozlaydi (`GUIDE.md`, "Vaqt zonasi
     bitta joydan") — brauzer soati noto'g'ri bo'lsa ham davomat/hodisa
     ro'yxatlari sababsiz bo'sh chiqmasin. */
  useSyncServerClock();
  const { authenticated, checking, user, logout, restore } = useAuthStore();
  /* Default — OCHIQ (keng) sidebar: bo'lim nomlari darhol ko'rinsin
     (2026-09-13, foydalanuvchi so'rovi). Yig'ish tugmasi joyida qoladi. */
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // Muassasalar ro'yxati — kelajakda backenddan (`useInstitutions` izohiga qarang)
  const { data: institutions = [] } = useInstitutions();
  // Kim nimani ko'radi — yagona manba (`lib/institutionScope.ts`)
  const scope = useInstitutionScope();

  // Saqlangan token bilan sessiyani tiklash
  useEffect(() => {
    restore();
  }, [restore]);

  if (checking) {
    return (
      <div className="grid h-screen place-items-center bg-ink text-slate-100">
        <div className="flex flex-col items-center gap-3">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500/40 border-t-blue-500" />
          <p className="text-[12px] text-slate-400">{t.header.sessionChecking}</p>
        </div>
      </div>
    );
  }

  if (!authenticated) return <AuthPage />;

  return (
    <VoiceProvider>
      <div className="flex h-screen flex-col overflow-hidden text-slate-100">

        {/* `app-grid` — BLUEPRINT SETKASI shu qobiqning O'ZIDA (`index.css`).
            ⚠️ Ilgari u faqat `SpaceBackground` ichida, `-z-10` qatlamda edi
            va panellar ostida ishonchsiz ko'rinardi. Endi setka fonning
            bir qismi: `backdrop-blur` li panellar uni o'zidan o'tkazadi. */}
        <div className="app-grid relative flex min-h-0 flex-1 overflow-hidden">
        {/* Umumiy kosmik fon — butun loyiha uchun */}
        <div className="no-print contents">
          <SpaceBackground />
        </div>

        {/* Doimiy chap panel — navigatsiya paytida yashirinmaydi, faqat torayadi */}
        <div className="no-print contents">
          <Sidebar collapsed={sidebarCollapsed} onToggleCollapsed={() => setSidebarCollapsed((v) => !v)} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Header — suzuvchi glass karta */}
          <div className="no-print flex-none px-3.5 pt-3.5">
            <motion.header
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="nexa-card flex h-[60px] items-center gap-4 px-4"
            >
              <PageHeading />
              <div className="mx-1 h-8 w-px bg-white/10" />
              <GlobalSearch />

              <div className="flex-1" />
              {/* Muassasa tanlash — FAQAT kuzatuvdagilar (3D kampusi bor,
                  `public/geojson/campus`). Respublika texnikumlari ro'yxatdan
                  olib tashlandi: ular uchun kampus fayli yo'q edi.
                  DIQQAT: `option`/`optgroup` ranglari ATAYLAB qo'lda beriladi —
                  brauzer ro'yxatni tizim palitrasida chizadi va qorong'i fonda
                  matn ko'rinmay qoladi.

                  Maktab foydalanuvchisi (`canSwitch: false`) tanlagichni
                  KO'RMAYDI — o'rniga o'z muassasasi nomi yozilgan yorliq
                  turadi (`lib/institutionScope.ts`). */}
              {scope.canSwitch ? (
                <select
                  value={selectedTeknikum ?? ""}
                  onChange={(e) => setSelectedTeknikum(e.target.value || null)}
                  title={t.header.institutionHint}
                  className="hik-input min-w-[300px] cursor-pointer px-3 py-2 text-[12.5px] [color-scheme:dark] [&_option]:bg-ink-panel [&_option]:text-slate-100"
                >
                  <option value="">{t.header.institutionsAll(institutions.length)}</option>
                  {institutions.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name} — {inst.region}
                    </option>
                  ))}
                </select>
              ) : (
                <div
                  className="hik-chip min-w-[300px] px-3 py-2 text-[12.5px]"
                  title="Sizning muassasangiz — almashtirib bo'lmaydi"
                >
                  <Building2 size={14} className="flex-none text-ice" />
                  <span className="truncate">{scope.label}</span>
                </div>
              )}
              {/* Ko'rilmagan aniqlanishlar — rozetka + ro'yxat (hover'da vaqti) */}
              <NotificationBell />
              {/* Aniqlash ovozini yoqish/o'chirish */}
              <SoundToggle />
              <LanguageSwitcher />
              <ThemeSwitcher />
              
              <div className="hik-chip px-3 py-1.5">
                <UserCircle2 size={16} className="text-ice" />
                <div className="leading-tight">
                  <p className="text-[11.5px] font-semibold">
                    {user?.full_name || user?.username || t.header.userFallback}
                  </p>
                  <p className="text-[9.5px] uppercase tracking-wide text-slate-500">{user?.role ?? ""}</p>
                </div>
                <button
                  onClick={logout}
                  title={t.header.logout}
                  className="ml-1 grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition-all hover:bg-ice/15 hover:text-ice-bright"
                >
                  <LogOut size={15} />
                </button>
              </div>
            </motion.header>
          </div>

          {/* Kameralar sahifasining KPI qatori sahifaning O'ZIDA
              (`CameraKpiRow`) — u sahifadagi kanallar ro'yxatiga bog'liq.
              Ilgari bu yerda `StatsCards` (muassasa/talaba/o'qituvchi)
              turardi, ya'ni kameralarga aloqasi yo'q sonlar. */}

          {/* Main content — har bir bo'lim alohida ErrorBoundary ichida:
              bittasi yiqilsa header/sidebar/boshqa bo'limlar ishlashda davom etadi */}
          {/* ⚠️ `flex flex-col` — sahifa ildizi `h-full` bo'lsa ham,
              `flex-1` bo'lsa ham to'g'ri balandlik olsin. Ilgari `main`
              flex EMAS edi: `flex-1` ishlatgan sahifa `auto` balandlikda
              qolib, ichidagi `overflow-y-auto` chegarasiz o'sardi va
              `overflow-hidden` pastini qirqardi (skroll ishlamasdi). */}
          <main className="flex min-h-0 flex-1 flex-col overflow-hidden p-3.5">
            <ErrorBoundary key={activePage} label={activePage}>
              {activePage === "Ogohlantirishlar" ? (
                /* Tasdiqlanmagan aniqlanishlar — ish navbati.
                   "Aniqlanganlar" dan farqi: bu yerda faqat hali
                   tasdiqlanmagani turadi va tasdiqlangach chiqib ketadi. */
                <AlertsPage />
              ) : activePage === "AI tahlil" ? (
                /* Aniqlanishlar TAHLILI — tur bo'yicha kesim, soatlik
                   zichlik va o'lchangan sonlardan yig'ilgan xulosa. */
                <AiAnalysisPage />
              ) : activePage === "Kameralar" ? (
                <CamerasPage />
              ) : activePage === "Hodisalar" ? (
                /* Yagona HUD ("katta ekran") ko'rinishi — faqat shu bo'limda.
                   Eski jadval ko'rinishi: `components/events/EventsPage.tsx` */
                <EventsHudScreen />
              ) : activePage === "Aniqlanganlar" ? (
                /* kuzatuv posti aniqlagan barcha hodisalar (yuz/qurol/chekish/sanoq) */
                <DetectionsPage />
              ) : activePage === "Geo Analitika" ? (
                <GeoAnalyticsPage />
              ) : activePage === "Shaxslar" ? (
                /* O'quvchi + o'qituvchi + xodim: tepada davomat taxtasi,
                   ostida tanlangan toifaning ro'yxati. */
                <PersonsPage />
              ) : activePage === "Muassasalar" ? (
                /* Hududlar + Muassasalar kesimi — Statistika sahifasidan
                   ko'chirildi, o'z sidebar bo'limi sifatida. */
                <InstitutionsPage />
              ) : activePage === "Statistika" ? (
                <StatisticsPage />
              ) : activePage === "Hisobotlar" ? (
                <ReportsPage />
              ) : activePage === "Sozlamalar" ? (
                <SettingsPage />
              ) : (
                /* Boshqaruv paneli — `components/dashboard/DashboardScreen.tsx`.
                   Tartib: bugungi davomat taxtasi, ostida uch ustun
                   (muassasalar │ xarita/3D kampus + KPI │ tanlangan muassasa). */
                <DashboardScreen />
              )}
            </ErrorBoundary>
          </main>
        </div>

        {/* Yangi aniqlash — ekran ustidagi xabar + ovoz (butun ilovada) */}
        <DetectionToast />

        {/* Ovozli boshqaruv — suzuvchi mikrofon tugmasi + holat kartochkasi */}
        <div className="no-print contents">
          <VoiceOverlay />
          <FloatingVoiceButton />
        </div>
        </div>
      </div>
    </VoiceProvider>
  );
}
