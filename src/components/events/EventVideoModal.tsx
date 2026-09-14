import { useEffect, useRef, useState, type MouseEvent } from "react";
import { motion } from "framer-motion";
import { Loader2, Maximize, Pause, Play, X } from "lucide-react";
import type { AlertEvent } from "@/lib/alertTypes";

const PLACEHOLDER_SRC = "/video/fight.mp4";
const PLACEHOLDER_POSTER = "/video/fight-poster.jpg";

function fmtTime(s: number): string {
  if (!Number.isFinite(s)) return "00:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

interface Props {
  alert: AlertEvent;
  onClose: () => void;
}

/**
 * Hodisa video oynasi — backend'da hodisaga bog'langan video saqlanmaydi
 * (AlarmEventOut'da video_url yo'q), shuning uchun mahalliy namuna oqim
 * ko'rsatiladi (public/video/, tashqi internetga bog'liq emas). Player
 * to'liq funksional: play/pause, progress/timeline, fullscreen, yuklanish holati.
 */
export function EventVideoModal({ alert, onClose }: Props) {
  // To'liq ekran uchun alohida, animatsiyasiz konteyner — Framer Motion transform
  // qo'llangan elementda (yoki uning ajdodida) requestFullscreen() chaqirilsa
  // brauzer render'ni buzadi (kontent noto'g'ri joyda/o'lchamda chiqadi).
  const videoAreaRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  }

  function seek(e: MouseEvent<HTMLDivElement>) {
    const v = videoRef.current;
    if (!v || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    v.currentTime = ratio * duration;
  }

  return (
    <div
      className="absolute inset-0 z-9999 grid place-items-center bg-black/95 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      {/* DIQQAT: shkala (scale) animatsiya ISHLATILMAYDI — Framer Motion transform
          qoldiradi, keyin videoAreaRef'da requestFullscreen() chaqirilsa ajdodda
          transform borligi sabab brauzer render'ni buzadi. Faqat opacity bilan
          fade — transform umuman qo'yilmaydi. */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="hik-glass-blue absolute z-50 relative flex max-h-[92vh] w-[1180px] max-w-[94vw] flex-col overflow-hidden rounded-2xl border border-white/10 bg-ink-panel"
      >
        <div className="flex flex-none items-center justify-between border-b border-white/[0.06] px-5 py-3">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold text-white">{alert.title}</p>
            <p className="truncate text-[11.5px] text-slate-400">{alert.camera} · {alert.institute}</p>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 flex-none place-items-center rounded-md text-slate-400 hover:bg-white/10 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div ref={videoAreaRef} className="relative min-h-0 flex-1 bg-black">
          <video
            ref={videoRef}
            src={PLACEHOLDER_SRC}
            poster={PLACEHOLDER_POSTER}
            className="h-full w-full object-contain"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onWaiting={() => setLoading(true)}
            onCanPlay={() => setLoading(false)}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
            onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
            onEnded={() => setPlaying(false)}
            playsInline
          />

          {loading && (
            <div className="absolute inset-0 grid place-items-center bg-black/40">
              <Loader2 size={34} className="animate-spin text-ice-bright" />
            </div>
          )}

          <span className="hik-glass-blue absolute left-4 top-4 flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-semibold text-rose-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" /> JANJAL · YOZUV
          </span>

          {!loading && (
            <button
              onClick={togglePlay}
              className="group absolute inset-0 grid place-items-center"
              title={playing ? "Pauza" : "Ijro etish"}
            >
              {!playing && (
                <span className="grid h-20 w-20 place-items-center rounded-full border border-emerald-300/50 bg-[#0F172A]/60 backdrop-blur-xl">
                  <Play size={34} className="ml-1 text-emerald-300" />
                </span>
              )}
            </button>
          )}
        </div>

        {/* Boshqaruv paneli */}
        <div className="flex flex-none items-center gap-3 px-5 py-3.5">
          <button onClick={togglePlay} className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-white/[0.06] text-slate-200 hover:bg-white/[0.12]">
            {playing ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
          </button>

          <span className="w-[42px] flex-none font-mono text-[11px] text-slate-400">{fmtTime(current)}</span>

          <div
            onClick={seek}
            className="h-1.5 flex-1 cursor-pointer rounded-full bg-slate-700/60"
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400"
              style={{ width: duration ? `${(current / duration) * 100}%` : "0%" }}
            />
          </div>

          <span className="w-[42px] flex-none font-mono text-[11px] text-slate-400">{fmtTime(duration)}</span>

          <button
            onClick={() => void videoAreaRef.current?.requestFullscreen()}
            title="To'liq ekran"
            className="grid h-9 w-9 flex-none place-items-center rounded-lg bg-white/[0.06] text-slate-200 hover:bg-white/[0.12]"
          >
            <Maximize size={16} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
