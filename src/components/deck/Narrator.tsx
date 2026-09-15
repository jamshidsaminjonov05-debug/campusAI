"use client";

import { useEffect, useRef } from "react";
import { segmentFor } from "./narration";
import { voiceBus } from "./voiceBus";
import type { DeckCopyBase, NarrationManifest } from "./types";

/**
 * Taqdimot ovozini boshqaradi — KO'RINADIGAN QISMI YO'Q.
 *
 * Slayd almashganda o'sha slaydning segmenti boshlanadi, oldingisi
 * to'xtaydi. Har segment sessiyada FAQAT BIR MARTA o'qiladi: orqaga
 * qaytilganda takrorlanmaydi, slayd oxirgi holatida turaveradi.
 *
 * Til almashsa hisob tozalanadi — yangi tildagi ovoz to'liq eshitiladi.
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
  const played = useRef<Set<number>>(new Set());

  useEffect(() => {
    played.current.clear();
  }, [copy.lang]);

  useEffect(() => {
    const seg = segmentFor(copy, slide, manifest);
    if (!seg || played.current.has(slide)) {
      voiceBus.stop();
      return;
    }
    played.current.add(slide);
    voiceBus.play(seg.audio, seg.duration);
    return () => voiceBus.stop();
  }, [slide, copy, manifest]);

  return null;
}
