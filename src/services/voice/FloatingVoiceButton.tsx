import { useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, Mic } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useVoice } from "./useVoice";
import { voiceApi } from "./VoiceService";

const busy = (s: string) => s === "recognizing" || s === "executing";

/**
 * Suzuvchi mikrofon tugmasi — pastki o'ng burchak. Push-to-talk: bosib turilganda
 * yozadi, qo'yib yuborilganda (ekranning istalgan joyida) to'xtatadi.
 */
export function FloatingVoiceButton() {
  const { status, startListening, stopListening, cancelListening } = useVoice();
  const listening = status === "listening";
  const isBusy = busy(status);

  // Tugma tashqarisida qo'yib yuborilsa ham yozish to'xtasin (stuck-recording bo'lmasin)
  useEffect(() => {
    if (!listening) return;
    const onUp = () => stopListening();
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listening]);

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape" && listening) cancelListening();
    }
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [listening, cancelListening]);

  /* Nutq serveri (STT/TTS) hozirgi backendda YO'Q — tugma har sahifada turib,
     bosilsa "Ovoz xizmati ishlamayapti" derdi. Endi faqat `/speech/health`
     JSON bilan javob bersa ko'rinadi; kalit `SettingsPage` bilan umumiy. */
  const health = useQuery({ queryKey: ["speech-health"], queryFn: () => voiceApi.checkHealth(), staleTime: 10 * 60_000, retry: false });

  const ringClass = listening ? "hik-glow-ring-red" : status === "idle" ? "hik-glow-ring" : "";
  if (health.data !== true) return null;

  return (
    <motion.button
      type="button"
      title="Ovozli buyruq (bosib ushlab turing)"
      aria-label="Ovozli buyruq"
      disabled={isBusy}
      onPointerDown={(e) => {
        e.preventDefault();
        startListening();
      }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: listening ? 1.08 : 1 }}
      transition={{ duration: 0.25 }}
      className={`hik-glass-blue fixed bottom-5 right-5 z-40 grid h-12 w-12 touch-none place-items-center rounded-full border transition-colors ${ringClass} ${
        listening
          ? "border-rose-400/60 bg-rose-500/15 text-rose-200"
          : isBusy
            ? "cursor-wait border-ice/30 text-ice-soft opacity-80"
            : "border-ice/25 text-ice-soft hover:border-ice/50 hover:text-ice-bright"
      }`}
    >
      {isBusy ? <Loader2 size={20} className="animate-spin" /> : <Mic size={20} />}
    </motion.button>
  );
}
