"use client";

import { useSyncExternalStore } from "react";
import { SpeakerHigh, SpeakerSlash } from "@phosphor-icons/react";
import { isMuted, mutedVersion, setMuted, subscribeMuted, unlockSound } from "@/lib/detectionSound";
import { preloadSpeech, stopSpeech } from "@/lib/detectionSpeech";

/**
 * Aniqlash ovozini yoqish/o'chirish — header tugmasi.
 *
 * Tanlov `localStorage` da (`lib/detectionSound.ts`). Bosilganda `unlockSound()`
 * ham chaqiriladi: brauzer autoplay taqiqi tufayli `AudioContext` foydalanuvchi
 * harakatisiz ishga tushmaydi — usiz birinchi signal jimgina yo'qolardi.
 */
export function SoundToggle() {
  const muted = useSyncExternalStore(
    subscribeMuted,
    () => `${mutedVersion()}:${isMuted()}`,
    () => "0:false"
  ).endsWith("true");

  return (
    <button
      type="button"
      onClick={() => {
        unlockSound();
        preloadSpeech();
        // O'chirilganda chalinayotgan E'LON ham darhol tinsin
        if (!muted) stopSpeech();
        setMuted(!muted);
      }}
      aria-pressed={!muted}
      aria-label={muted ? "Ovozni yoqish" : "Ovozni o'chirish"}
      title={muted ? "Aniqlash ovozi O'CHIQ — yoqish" : "Aniqlash ovozi YOQIQ — o'chirish"}
      className={`no-print grid h-9 w-9 place-items-center rounded-xl border transition-colors ${
        muted
          ? "border-white/[0.08] bg-white/[0.04] text-slate-500 hover:text-slate-300"
          : "border-ice/35 bg-ice/10 text-ice-soft hover:border-ice/60 hover:text-white"
      }`}
    >
      {muted ? <SpeakerSlash size={17} weight="duotone" /> : <SpeakerHigh size={17} weight="fill" />}
    </button>
  );
}
