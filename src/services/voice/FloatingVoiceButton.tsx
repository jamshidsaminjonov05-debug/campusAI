import { useEffect } from "react";
import { motion } from "framer-motion";
import { Loader2, Mic } from "lucide-react";
import { useVoice } from "./useVoice";

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

  const ringClass = listening ? "hik-glow-ring-red" : status === "idle" ? "hik-glow-ring" : "";

  return (
    <motion.button
      type="button"
      title="Ovozli buyruq (bosib ushlab turing)"
      disabled={isBusy}
      onPointerDown={(e) => {
        e.preventDefault();
        startListening();
      }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: listening ? 1.08 : 1 }}
      transition={{ duration: 0.25 }}
      className={`hik-glass-blue fixed bottom-6 right-6 z-40 grid h-16 w-16 touch-none place-items-center rounded-full border transition-colors ${ringClass} ${
        listening
          ? "border-rose-400/60 bg-rose-500/15 text-rose-200"
          : isBusy
            ? "cursor-wait border-ice/30 text-ice-soft opacity-80"
            : "border-ice/25 text-ice-soft hover:border-ice/50 hover:text-ice-bright"
      }`}
    >
      {isBusy ? <Loader2 size={24} className="animate-spin" /> : <Mic size={24} />}
    </motion.button>
  );
}
