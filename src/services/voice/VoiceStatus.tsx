import { AlertTriangle, Check, Loader2, Mic, Sparkles } from "lucide-react";
import type { VoiceStatus as Status } from "./VoiceProvider";

const STATUS_LABEL: Record<Status, string> = {
  idle: "",
  listening: "Tinglanmoqda...",
  recognizing: "Tanilmoqda...",
  executing: "Bajarilmoqda...",
  completed: "Bajarildi",
  suggesting: "Aniqlashtiring",
  error: "Xatolik",
};

interface Props {
  status: Status;
  errorMessage: string | null;
}

/** Joriy holat (ikonka + matn) — VoiceOverlay ichida ishlatiladi. */
export function VoiceStatus({ status, errorMessage }: Props) {
  const label = status === "error" ? errorMessage ?? STATUS_LABEL.error : STATUS_LABEL[status];

  const icon =
    status === "listening" ? (
      <Mic size={13} className="text-rose-400" />
    ) : status === "recognizing" || status === "executing" ? (
      <Loader2 size={13} className="animate-spin text-ice" />
    ) : status === "completed" ? (
      <Check size={13} className="text-emerald-400" />
    ) : status === "suggesting" ? (
      <Sparkles size={13} className="text-ice-soft" />
    ) : status === "error" ? (
      <AlertTriangle size={13} className="text-rose-400" />
    ) : null;

  const textColor =
    status === "error" ? "text-rose-300" : status === "completed" ? "text-emerald-300" : "text-slate-300";

  return (
    <div className={`flex items-center gap-1.5 text-[11px] font-semibold ${textColor}`}>
      {icon}
      <span>{label}</span>
    </div>
  );
}
