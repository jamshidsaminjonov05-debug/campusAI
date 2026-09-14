/**
 * Backend hodisasi → xarita hodisasi.
 *
 * ⚠️ **Mock adapteri OLIB TASHLANDI** (2026-09-05):
 * `campusEventToMapEvent()` `mockData.TEXNIKUMS` dagi 645 generatsiya
 * qilingan texnikumdan koordinata olardi. O'sha fayl butunlay o'chirildi;
 * xaritadagi hodisalar endi FAQAT kuzatuv posti oqimidan keladi
 * (`config/cameraPlacements.ts` — kanalning haqiqiy koordinatasi).
 */
import type { AlarmEventOut } from "@/lib/api";
import type { MapEvent } from "./types";

/**
 * Backend hodisasi → xarita hodisasi.
 * Hozirgi API'da koordinata yo'q — backend latitude/longitude qo'shsa
 * avtomatik ishlaydi; yo'q bo'lsa null (xaritada ko'rsatilmaydi).
 */
export function alarmEventToMapEvent(
  ev: AlarmEventOut & { latitude?: number | null; longitude?: number | null }
): MapEvent | null {
  if (typeof ev.latitude !== "number" || typeof ev.longitude !== "number") return null;
  return {
    id: ev.id,
    latitude: ev.latitude,
    longitude: ev.longitude,
    cameraId: ev.camera_id ?? "",
    cameraName: ev.camera_id ? `KAM-${ev.camera_id.slice(0, 6)}` : "Noma'lum kamera",
    time: ev.detected_at,
    image: ev.snapshot_path,
    type: ev.event_type,
    alarm: !ev.is_resolved && (ev.severity === "critical" || ev.severity === "high"),
  };
}
