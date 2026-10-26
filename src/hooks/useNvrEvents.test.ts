import { describe, expect, it } from "vitest";
import { merge } from "./useNvrEvents";
import type { NvrEvent } from "@/lib/nvr/nvrApi";

/** Yuz hodisasi — faqat `merge()` ga kerak maydonlar bilan. */
function face(id: number, time: string, extra: Partial<NvrEvent> = {}): NvrEvent {
  return {
    id,
    category: "face",
    category_label: "Yuz",
    label: "Yuz",
    time,
    camera: "Camera 01",
    channel: "31",
    confidence: 90,
    image_url: `/api/v1/events/${id}/image`,
    image_count: 2,
    image: null,
    name: "Nuritdinov Asliddin",
    recognized: true,
    face_id: 7,
    frames: 2,
    ...extra,
  };
}

describe("merge() — bir odamning 10 daqiqa ichidagi o'tishlari", () => {
  it("3 daqiqadan uzoq, 10 daqiqadan qisqa oraliqdagi ikki o'tish BITTA kartochka (oxirgisi vakil)", () => {
    const a = face(1, "2026-10-23T18:17:45+05:00", { frames: 2 });
    const b = face(2, "2026-10-23T18:21:38+05:00", { frames: 4 });
    const out = merge(true, [b, a]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe(2);
    expect(out[0].frames).toBe(4); // kadr soni o'tishlar bo'ylab QO'SHILMAYDI
    expect(out[0].passes).toBe(2);
    expect(out[0].passes_from).toBe(new Date("2026-10-23T18:17:45+05:00").toISOString());
  });

  it("tartib teskari kelsa ham vakil — ENG OXIRGI o'tish", () => {
    const a = face(1, "2026-10-23T18:17:45+05:00");
    const b = face(2, "2026-10-23T18:21:38+05:00");
    const out = merge(true, [a, b]);
    expect(out[0].id).toBe(2);
    expect(out[0].passes).toBe(2);
  });

  it("10 daqiqadan uzoq oraliq — ikki alohida kartochka", () => {
    const a = face(1, "2026-10-23T18:00:00+05:00");
    const b = face(2, "2026-10-23T18:21:38+05:00");
    expect(merge(true, [b, a])).toHaveLength(2);
  });

  it("boshqa odam yoki boshqa kamera yig'ilmaydi", () => {
    const a = face(1, "2026-10-23T18:17:45+05:00", { face_id: 8, name: "Boshqa Odam" });
    const b = face(2, "2026-10-23T18:21:38+05:00");
    const c = face(3, "2026-10-23T18:19:00+05:00", { channel: "32" });
    expect(merge(true, [b, a, c])).toHaveLength(3);
  });

  it("notanishlar (face_id ham, ism ham yo'q) 10 daqiqa bo'yicha YIG'ILMAYDI", () => {
    const a = face(1, "2026-10-23T18:17:45+05:00", { face_id: null, name: null, recognized: false });
    const b = face(2, "2026-10-23T18:21:38+05:00", { face_id: null, name: null, recognized: false });
    expect(merge(true, [b, a])).toHaveLength(2);
  });

  it("180 s ichidagi kadr avvalgidek O'TISHga qo'shiladi (`passes` oshmaydi)", () => {
    const a = face(1, "2026-10-23T18:20:00+05:00", { frames: undefined });
    const b = face(2, "2026-10-23T18:21:00+05:00", { frames: undefined });
    const out = merge(true, [b, a]);
    expect(out).toHaveLength(1);
    expect(out[0].frames).toBe(2);
    expect(out[0].passes).toBeUndefined();
  });

  it("`group=false` da hech narsa yig'ilmaydi", () => {
    const a = face(1, "2026-10-23T18:17:45+05:00");
    const b = face(2, "2026-10-23T18:21:38+05:00");
    expect(merge(false, [b, a])).toHaveLength(2);
  });
});
