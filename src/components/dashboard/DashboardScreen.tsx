import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Radar } from "lucide-react";
import { Map3D } from "@/components/map/Map3D";
import { useT } from "@/i18n";
import { useAppStore } from "@/store/useAppStore";
import type { PersonType } from "@/lib/api";
import { isoDate } from "@/hooks/useStudentDay";
import { institutionById, institutionKind, studentLabelKey } from "@/config/institutions";
import { AttendanceBoard } from "./AttendanceBoard";
import { AttendanceListModal } from "./AttendanceListModal";
import { InstitutionsPanel } from "./InstitutionsPanel";
import { MapDetailOverlay } from "./MapDetailOverlay";
import { AlertsOverviewPanel } from "./AlertsOverviewPanel";
import { RadarScreen } from "./RadarScreen";

/**
 * Boshqaruv paneli.
 *
 * 🔵 IKKI BOSQICH (2026-09-11, foydalanuvchi so'rovi — skrinshot bilan):
 *   1. **RADAR** (`RadarScreen`) — ochilishda: aylanib turgan radar,
 *      tasdiqlanmagan jiddiy hodisalar nuqta bo'lib chiqadi.
 *   2. **XARITA** — nuqta (yoki "Xaritani ochish") bosilgach: davomat
 *      taxtasi + 3D xarita + suzuvchi panellar. Nuqta orqali kelinsa o'sha
 *      hodisaning tahlili o'ngda DARHOL ochiladi (`selectedEventId` →
 *      `MapDetailOverlay`). Xarita tepasidagi "Radar" tugmasi orqaga qaytaradi.
 *
 * Xarita bosqichi — Hodisalar HUD'idagi bilan AYNI 3D xarita, TO'LIQ orqa
 * fonda, qolgan hammasi xarita USTIDA suzadi:
 *
 *   · chap-yuqorida — muassasa qidiruvi/ro'yxati (`InstitutionsPanel`);
 *   · o'ng-pastda — "Batafsil ma'lumot" tugmasi (`MapDetailOverlay`).
 *
 * Tanlov YAGONA kanaldan o'tadi (`useAppStore.selectedTeknikum`).
 *
 * ⚠️ Xarita bosqichiga o'tish FAQAT `opacity` bilan animatsiya qilinadi —
 * MapLibre markerlari ajdodidagi `transform` bilan urishadi (1-tuzoq).
 * Radar esa xarita emas, u `scale` bilan yig'iladi.
 */
export function DashboardScreen() {
  const t = useT();
  /** Davomat ro'yxati oynasi — qaysi toifa ochilgan (`null` — yopiq). */
  const [attendanceType, setAttendanceType] = useState<PersonType | "all" | null>(null);
  const selectedId = useAppStore((s) => s.selectedTeknikum);
  /** Xaritadagi trevoga nishoni bosilganda — CHAP "Ogohlantirishlar" tahlil
   *  paneli (`AlertsOverviewPanel`) ochiladi. */
  const [alertsOpen, setAlertsOpen] = useState(false);
  /** Hodisa tahlili (O'NG panel) — chap paneldan YOKI radar nuqtasidan. */
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  /** Ochilishda radar; nuqta yoki "Xaritani ochish" bosilsa — xarita. */
  const [mode, setMode] = useState<"radar" | "map">("radar");

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <AnimatePresence mode="wait" initial={false}>
        {mode === "radar" ? (
          <motion.div
            key="radar"
            className="flex min-h-0 flex-1 flex-col"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <RadarScreen
              onPick={(id) => {
                setSelectedEventId(id);
                setMode("map");
              }}
              onOpenMap={() => setMode("map")}
            />
          </motion.div>
        ) : (
          <motion.div
            key="map"
            className="flex min-h-0 flex-1 flex-col gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.45 }}
          >
            {/* ⚠️ **TOIFA KAFELI BO'LIMNI ALMASHTIRMAYDI**: javob shu yerda,
                oyna bo'lib ochiladi (`AttendanceListModal`). */}
            <AttendanceBoard onPickType={setAttendanceType} onPickAll={() => setAttendanceType("all")} />

            {/* Xarita TO'LIQ orqa fonda, qolgan hammasi ustida suzadi. */}
            <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl">
              <Map3D onOpenAlerts={() => setAlertsOpen(true)} />

              {/* Chap-yuqori: muassasa qidiruvi (dropdown). `top-16` — Map3D'ning
                  o'z 3D tugmasi (`left-3 top-3`) bilan urishmasin. */}
              <div className="absolute left-3 top-16 z-20 w-[300px]">
                <InstitutionsPanel />
              </div>

              {/* CHAP — "Ogohlantirishlar" tahlili: xaritadagi trevoga nishoni bosilsa. */}
              <AlertsOverviewPanel
                open={alertsOpen}
                onClose={() => setAlertsOpen(false)}
                onSelectEvent={(id) => setSelectedEventId(id)}
              />

              {/* O'NG — "Batafsil ma'lumot" + hodisa tahlili (radar nuqtasidan ham). */}
              <MapDetailOverlay eventDetailId={selectedEventId} onEventDetailClose={() => setSelectedEventId(null)} />

              {/* Tepa-markaz: radarga qaytish (Map3D tugmalari chap/o'ng burchakda) */}
              <button
                type="button"
                onClick={() => {
                  setSelectedEventId(null);
                  setMode("radar");
                }}
                className="absolute left-1/2 top-3 z-20 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#2584FF] px-4 py-2 text-[12.5px] font-semibold text-[#FFFFFF] shadow-[0_10px_24px_-12px_rgba(37,132,255,0.85)] transition-transform hover:scale-[1.04]"
              >
                <Radar size={15} />
                {t.dashboard.radar.backToRadar}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toifa davomati — Boshqaruv panelidan CHIQMASDAN. */}
      {attendanceType && (
        <AttendanceListModal
          type={attendanceType}
          date={isoDate()}
          title={
            attendanceType === "all"
              ? t.board.type.all
              : attendanceType === "student"
                ? t.board.type[studentLabelKey(institutionKind(institutionById(selectedId)))]
                : attendanceType === "teacher"
                  ? t.board.type.teacher
                  : t.board.type.staff
          }
          onClose={() => setAttendanceType(null)}
        />
      )}
    </div>
  );
}
