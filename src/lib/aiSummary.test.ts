import { describe, expect, it } from "vitest";
import { buildAiSummary, EMPTY_SUMMARY } from "./aiSummary";
import type { DetectionEvent } from "@/lib/detectionEvents";

/**
 * ⚠️ **HALI ISHGA TUSHIRILMAGAN** — `vitest.config.ts` izohiga qarang.
 */

let seq = 0;
function ev(overrides: Partial<DetectionEvent> = {}): DetectionEvent {
  seq++;
  return {
    id: `ev-${seq}`,
    type: "unknown_person",
    title: "Begona odam",
    severity: "medium",
    campusId: "edu-mk-179",
    campus: "179-maktab",
    mahalla: "Toshkent",
    camera: "Camera 01",
    time: "10:00:00",
    ts: Date.now(),
    lat: 41.3,
    lng: 69.2,
    confidence: 90,
    ...overrides,
  };
}

/** `2026-09-0X 10:00` — kunlar orasidagi farqni aniq boshqarish uchun. */
function dayTs(day: number, hour = 10): number {
  return new Date(2026, 8, day, hour, 0, 0).getTime();
}

describe("buildAiSummary", () => {
  it("bo'sh oqim uchun EMPTY_SUMMARY qaytaradi", () => {
    expect(buildAiSummary([])).toEqual(EMPTY_SUMMARY);
  });

  it("hisobni ENG SO'NGGI kun bo'yicha yuritadi, eskilarini emas", () => {
    const events = [
      ev({ ts: dayTs(1), type: "smoking" }),
      ev({ ts: dayTs(1), type: "smoking" }),
      ev({ ts: dayTs(3), type: "fight" }), // eng so'nggi kun
    ];
    const s = buildAiSummary(events);
    expect(s.total).toBe(1); // faqat 3-kundagi 1 ta hodisa
    expect(s.topType).toBe("fight");
  });

  it("eng gavjum soatni to'g'ri topadi", () => {
    const events = [
      ev({ ts: dayTs(1, 8) }),
      ev({ ts: dayTs(1, 8) }),
      ev({ ts: dayTs(1, 8) }),
      ev({ ts: dayTs(1, 14) }),
    ];
    const s = buildAiSummary(events);
    expect(s.peakHour).toBe(8);
    expect(s.peakCount).toBe(3);
  });

  it("xavfli (critical/high) qaydlarni sanaydi", () => {
    const events = [
      ev({ ts: dayTs(1), severity: "critical" }),
      ev({ ts: dayTs(1), severity: "high" }),
      ev({ ts: dayTs(1), severity: "low" }),
    ];
    const s = buildAiSummary(events);
    expect(s.dangerous).toBe(2);
  });

  it("tarix QISQA (< 2 kun) bo'lsa anomaliya E'LON QILMAYDI", () => {
    const events = [ev({ ts: dayTs(1) }), ev({ ts: dayTs(2), type: "fight" })];
    const s = buildAiSummary(events);
    expect(s.hasHistory).toBe(false);
    expect(s.anomalies).toEqual([]);
  });

  it("odatdagidan SEZILARLI oshgan turni anomaliya deb topadi", () => {
    const events = [
      // 3 kunlik "odatiy" tarix — kuniga 1 tadan fight
      ev({ ts: dayTs(1), type: "fight" }),
      ev({ ts: dayTs(2), type: "fight" }),
      ev({ ts: dayTs(3), type: "fight" }),
      // eng so'nggi kun — keskin sakrash (5 ta, ANOMALY_FACTOR=2 dan ko'p)
      ev({ ts: dayTs(4), type: "fight" }),
      ev({ ts: dayTs(4), type: "fight" }),
      ev({ ts: dayTs(4), type: "fight" }),
      ev({ ts: dayTs(4), type: "fight" }),
      ev({ ts: dayTs(4), type: "fight" }),
    ];
    const s = buildAiSummary(events);
    expect(s.hasHistory).toBe(true);
    const anomaly = s.anomalies.find((a) => a.type === "fight");
    expect(anomaly).toBeDefined();
    expect(anomaly?.count).toBe(5);
  });

  it("kichik sakrashni (1->2) anomaliya deb HISOBLAMAYDI (ANOMALY_MIN)", () => {
    const events = [
      ev({ ts: dayTs(1), type: "fight" }),
      ev({ ts: dayTs(2), type: "fight" }),
      ev({ ts: dayTs(3), type: "fight" }),
      ev({ ts: dayTs(4), type: "fight" }),
      ev({ ts: dayTs(4), type: "fight" }), // 2 ta — shovqin, sakrash emas
    ];
    const s = buildAiSummary(events);
    expect(s.anomalies.find((a) => a.type === "fight")).toBeUndefined();
  });
});
