"use client";

import { useEffect } from "react";
import { segmentFor } from "./narration";
import { voiceBus } from "./voiceBus";
import type { DeckCopyBase, NarrationManifest } from "./types";

/**
 * Taqdimot ovozini boshqaradi — KO'RINADIGAN QISMI YO'Q.
 *
 * Slayd almashganda o'sha slaydning segmenti boshlanadi, oldingisi
 * to'xtaydi. Orqaga qaytilganda ham ovoz boshidan o'qiladi (2026-10-20,
 * foydalanuvchi so'rovi).
 */
export default function Narrator({
  slide,
  copy,
  manifest,
}: {
  slide: number;
  copy: DeckCopyBase;
  manifest: NarrationManifest;
}) {
  useEffect(() => {
    const seg = segmentFor(copy, slide, manifest);
    if (!seg) {
      voiceBus.stop();
      return;
    }
    voiceBus.play(seg.audio, seg.duration);
    return () => voiceBus.stop();
  }, [slide, copy, manifest]);

  return null;
}
