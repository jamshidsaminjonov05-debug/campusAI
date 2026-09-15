/**
 * Ovoz segmentlarini yig'ish.
 *
 * Matn — taqdimotning `copy/<til>.ts` faylida (tarjima bilan birga turadi).
 * Ovoz  — `narrationAudio.ts` da (generatsiya qilingan manifest).
 *
 * Ikkisi shu yerda birlashtiriladi: ovoz bo'lsa cue vaqtlari O'LCHANGAN
 * qiymatlarga almashadi, bo'lmasa `copy` dagi rejalashtirilgan vaqtlar
 * qoladi. Slaydlar farqni sezmaydi — ular faqat `at[]` massivini oladi.
 */

import type { DeckCopyBase, NarrationManifest } from "./types";

export type Cue = { at: number; text: string };

export type Segment = {
  cues: Cue[];
  /** segment uzunligi, sekund */
  duration: number;
  /** ovoz fayli manzili (bo'lsa) */
  audio?: string;
};

/** Oxirgi bo'lak tugagach qo'shiladigan nafas — ovozsiz rejim uchun */
const TAIL = 3.2;

export function segmentFor(
  copy: DeckCopyBase,
  slide: number,
  manifest: NarrationManifest,
): Segment | undefined {
  const cues = copy.narration[slide];
  if (!cues || cues.length === 0) return undefined;

  const audio = manifest[copy.lang]?.[slide];
  if (audio && audio.offsets.length === cues.length) {
    return {
      cues: cues.map((c, i) => ({ at: audio.offsets[i], text: c.text })),
      duration: audio.duration,
      audio: audio.file,
    };
  }

  return {
    cues: cues.map((c) => ({ at: c.at, text: c.text })),
    duration: cues[cues.length - 1].at + TAIL,
  };
}

/** Bosqich vaqtlari — slaydlar animatsiyani shu massivga bog'laydi */
export function cueTimes(seg: Segment | undefined): number[] {
  return seg ? seg.cues.map((c) => c.at) : [];
}

/** Berilgan lahzada ko'rinishi kerak bo'lgan subtitr */
export function cueAt(seg: Segment | undefined, t: number): string {
  if (!seg) return "";
  let out = "";
  for (const c of seg.cues) {
    if (t + 0.001 >= c.at) out = c.text;
    else break;
  }
  return out;
}

/** Vaqtlar ro'yxati bo'yicha joriy bosqich indeksi (-1 — hali boshlanmagan) */
export function phaseAt(times: readonly number[], t: number): number {
  let i = -1;
  for (let k = 0; k < times.length; k++) {
    if (t + 0.001 >= times[k]) i = k;
    else break;
  }
  return i;
}
