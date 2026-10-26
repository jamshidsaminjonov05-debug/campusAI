import { useState } from "react";
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

/**
 * Boshqaruv paneli: davomat taxtasi + 3D xarita + suzuvchi panellar.
 *
 * 🔴 2026-10-21: RADAR bosqichi (`RadarScreen`) BUTUNLAY OLIB TASHLANDI
 * (foydalanuvchi so'rovi: "radar oynasi umuman kerak emas"). Panel endi
 * to'g'ridan-to'g'ri xarita bilan ochiladi.
 *
 * Xarita — Hodisalar HUD'idagi bilan AYNI 3D xarita, TO'LIQ orqa fonda,
 * qolgan hammasi xarita USTIDA suzadi:
 *
 *   · chap-yuqorida — muassasa qidiruvi/ro'yxati (`InstitutionsPanel`);
 *   · o'ng-pastda — "Batafsil ma'lumot" tugmasi (`MapDetailOverlay`).
 *
 * Tanlov YAGONA kanaldan o'tadi (`useAppStore.selectedTeknikum`).
 */
export function DashboardScreen() {
  const t = useT();
  /** Davomat ro'yxati oynasi — qaysi toifa ochilgan (`null` — yopiq). */
  const [attendanceType, setAttendanceType] = useState<PersonType | "all" | null>(null);
  const selectedId = useAppStore((s) => s.selectedTeknikum);
  /** Xaritadagi trevoga nishoni bosilganda — CHAP "Ogohlantirishlar" tahlil
   *  paneli (`AlertsOverviewPanel`) ochiladi. */
  const [alertsOpen, setAlertsOpen] = useState(false);
  /** Hodisa tahlili (O'NG panel) — chap paneldan tanlanadi. */
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* ⚠️ **TOIFA KAFELI BO'LIMNI ALMASHTIRMAYDI**: javob shu yerda,
          oyna bo'lib ochiladi (`AttendanceListModal`). */}
      <AttendanceBoard onPickType={setAttendanceType} onPickAll={() => setAttendanceType("all")} />

      {/* Xarita TO'LIQ orqa fonda, qolgan hammasi ustida suzadi. */}
      <div className="map-flat relative min-h-0 flex-1 overflow-hidden rounded-2xl">
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

        {/* O'NG — "Batafsil ma'lumot" + hodisa tahlili. */}
        <MapDetailOverlay eventDetailId={selectedEventId} onEventDetailClose={() => setSelectedEventId(null)} />
      </div>

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
