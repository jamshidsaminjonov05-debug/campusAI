import { AnimatePresence, motion } from "framer-motion";
import { Check, History, Repeat, Sparkles, X } from "lucide-react";
import { useVoice } from "./useVoice";
import { VoiceStatus } from "./VoiceStatus";
import { VoiceWave } from "./VoiceWave";

/** Ishonch foizini rangli ko'rsatadi. */
function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? "text-emerald-300" : pct >= 60 ? "text-ice-soft" : "text-amber-300";
  return <span className={`font-mono text-[10px] font-bold ${color}`}>{pct}%</span>;
}

/**
 * Ovoz operatori paneli — holat, tanilgan matn, ishonch, takliflar (bosiladigan)
 * va oxirgi buyruqlar tarixi (replay). Enterprise AI operator ko'rinishi.
 */
export function VoiceOverlay() {
  const {
    status, recognizedText, feedbackText, errorMessage, confidence, suggestions, history, chooseSuggestion, replay, clearHistory,
  } = useVoice();

  const visible = status !== "idle";

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.96 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="hik-glass-blue fixed bottom-[104px] right-6 z-40 w-[320px] rounded-2xl p-4"
        >
          <div className="mb-2.5 flex items-center justify-between">
            <VoiceStatus status={status} errorMessage={errorMessage} />
            <VoiceWave active={status === "listening"} />
          </div>

          {recognizedText && (
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-white" title={recognizedText}>
                "{recognizedText}"
              </p>
              {status === "completed" && confidence > 0 && <ConfidenceBadge value={confidence} />}
            </div>
          )}

          {status === "completed" && feedbackText && (
            <p className="flex items-center gap-1.5 text-[11.5px] text-emerald-300/90">
              <Check size={13} /> {feedbackText}
            </p>
          )}

          {status === "listening" && (
            <p className="text-[10.5px] text-slate-500">Gapiring, qo'yib yuborsangiz tugaydi...</p>
          )}

          {/* Takliflar — ishonch past yoki buyruq to'liqsiz bo'lganda */}
          {status === "suggesting" && suggestions.length > 0 && (
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-ice-soft">
                <Sparkles size={12} /> Balki shuni nazarda tutdingiz?
              </p>
              <div className="space-y-1">
                {suggestions.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => chooseSuggestion(s)}
                    className="flex w-full items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-2.5 py-2 text-left transition-colors hover:border-ice/30 hover:bg-white/[0.07]"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-semibold text-slate-100">{s.label}</span>
                      <span className="block truncate text-[9.5px] text-slate-500">{s.hint}</span>
                    </span>
                    <ConfidenceBadge value={s.prediction.confidence} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tarix — oxirgi buyruqlar (faqat tinglashdan tashqari holatlarda) */}
          {history.length > 0 && (status === "completed" || status === "suggesting" || status === "error") && (
            <div className="mt-3 border-t border-white/[0.06] pt-2">
              <div className="mb-1 flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-[9.5px] font-bold uppercase tracking-wide text-slate-500">
                  <History size={11} /> Oxirgi buyruqlar
                </p>
                <button onClick={clearHistory} title="Tarixni tozalash" className="text-slate-500 hover:text-slate-300">
                  <X size={12} />
                </button>
              </div>
              <div className="max-h-[120px] space-y-0.5 overflow-y-auto">
                {history.slice(0, 5).map((h, i) => (
                  <button
                    key={`${h.at}-${i}`}
                    onClick={() => replay(h)}
                    title="Qayta bajarish"
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left transition-colors hover:bg-white/[0.05]"
                  >
                    <Repeat size={11} className="flex-none text-slate-500" />
                    <span className="min-w-0 flex-1 truncate text-[10.5px] text-slate-300">{h.transcript}</span>
                    <span className={`h-1.5 w-1.5 flex-none rounded-full ${h.success ? "bg-emerald-400" : "bg-rose-400"}`} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
