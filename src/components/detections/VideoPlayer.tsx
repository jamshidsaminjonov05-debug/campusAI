"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type KeyboardEvent as RKeyboardEvent,
  type PointerEvent as RPointerEvent,
  type VideoHTMLAttributes,
} from "react";
import {
  ArrowClockwise,
  ArrowCounterClockwise,
  CornersIn,
  CornersOut,
  GearSix,
  Pause,
  Play,
  SpeakerHigh,
  SpeakerLow,
  SpeakerSlash,
} from "@phosphor-icons/react";
import { useT } from "@/i18n";

/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  VIDEO PLEER — loyiha uslubidagi boshqaruv paneli (2026-10-23)       ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * Brauzerning standart `controls` paneli har brauzerda boshqacha va tizim
 * rangida chiziladi — neon dizaynga zid edi. Bu yerda o'z panelimiz:
 * play/pause, ±10 s, suriladigan vaqt chizig'i (yuklangan qism bilan),
 * vaqt, ovoz (o'chirish + daraja), tezlik sozlamasi va to'liq ekran.
 *
 * Klaviatura (pleer fokusda): Probel/K — play/pause, ←/→ — 5 s, ↑/↓ — ovoz,
 * M — ovozsiz, F — to'liq ekran.
 *
 * ⚠️ `<video>` hodisalari (`onWaiting`, `onCanPlay`, `onError`…) chaqiruvchidan
 * O'ZGARMASDAN uzatiladi — `EventVideo`ning bufer/xato mantig'i shunga tayanadi.
 * `ref` ham `<video>` elementining O'ZIGA ishora qiladi (`.load()` ishlaydi).
 */

const SPEEDS = [0.25, 0.5, 1, 1.5, 2] as const;

function fmtTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const s = Math.floor(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${r}` : `${m}:${r}`;
}

type Props = Omit<VideoHTMLAttributes<HTMLVideoElement>, "controls"> & {
  /** Konteyner (to'liq ekranga aynan shu chiqadi). */
  wrapClassName?: string;
};

export const VideoPlayer = forwardRef<HTMLVideoElement, Props>(function VideoPlayer(
  { className = "", wrapClassName = "", onPlay, onPause, onTimeUpdate, onLoadedMetadata, onProgress, onVolumeChange, onSeeked, ...rest },
  ref
) {
  const p = useT().player;
  const wrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  useImperativeHandle(ref, () => videoRef.current as HTMLVideoElement);

  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  /** Surish paytida vaqt chizig'i ko'rsatkichi (sichqoncha ustida). */
  const [hover, setHover] = useState<{ x: number; t: number } | null>(null);
  const draggingRef = useRef(false);

  const v = () => videoRef.current;

  const toggle = useCallback(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) void el.play().catch(() => undefined);
    else el.pause();
  }, []);

  const skip = useCallback((d: number) => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = Math.min(Math.max(0, el.currentTime + d), el.duration || el.currentTime + d);
  }, []);

  const setVol = useCallback((val: number) => {
    const el = videoRef.current;
    if (!el) return;
    el.volume = Math.min(1, Math.max(0, val));
    el.muted = el.volume === 0;
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    else void el.requestFullscreen?.().catch(() => undefined);
  }, []);

  useEffect(() => {
    const onFs = () => setFullscreen(document.fullscreenElement === wrapRef.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  /* Vaqt chizig'idagi nuqtadan vaqtga */
  const timeAt = (clientX: number, bar: HTMLElement) => {
    const r = bar.getBoundingClientRect();
    const f = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    return { f, t: f * (duration || 0), x: f * r.width };
  };

  /* 🔵 SILLIQ SURISH (2026-10-26, foydalanuvchi: "surmoqchi bo'lsam «video
     yuklanmoqda» chiqyapti, oddiy silliq o'tkazmoqchiman"). Ilgari HAR BIR
     sichqoncha harakatida `currentTime` yozilardi — brauzer oldingi sakrashni
     bekor qilib yangisini boshlar, `waiting` otilar va qoplama chiqardi.
     Endi: tutqich DARHOL `dragT` bo'yicha chiziladi; video esa faqat oldingi
     sakrash tugagach (`seeking === false`) eng so'nggi nuqtaga o'tadi
     (`seeked`da navbatdagisi qo'llanadi); qo'yib yuborilganda aniq nuqta.
     Tortish paytida video to'xtatiladi va keyin o'z holatiga qaytadi. */
  const [dragT, setDragT] = useState<number | null>(null);
  const pendingSeekRef = useRef<number | null>(null);
  const resumeRef = useRef(false);

  const seekTo = (t: number) => {
    const el = v();
    if (!el || !duration) return;
    if (el.seeking) {
      pendingSeekRef.current = t;
      return;
    }
    pendingSeekRef.current = null;
    const fast = (el as HTMLVideoElement & { fastSeek?: (t: number) => void }).fastSeek;
    if (draggingRef.current && typeof fast === "function") fast.call(el, t);
    else el.currentTime = t;
  };

  const onBarDown = (e: RPointerEvent<HTMLDivElement>) => {
    const bar = e.currentTarget;
    bar.setPointerCapture(e.pointerId);
    draggingRef.current = true;
    const el = v();
    resumeRef.current = !!el && !el.paused;
    el?.pause();
    const { t } = timeAt(e.clientX, bar);
    setDragT(t);
    seekTo(t);
  };
  const onBarMove = (e: RPointerEvent<HTMLDivElement>) => {
    const bar = e.currentTarget;
    const { t, x } = timeAt(e.clientX, bar);
    setHover({ x, t });
    if (draggingRef.current) {
      setDragT(t);
      seekTo(t);
    }
  };
  const onBarUp = (e: RPointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
    const { t } = timeAt(e.clientX, e.currentTarget);
    const el = v();
    pendingSeekRef.current = null;
    if (el && duration) el.currentTime = t; // aniq nuqta
    setTime(t);
    setDragT(null);
    if (resumeRef.current) void el?.play().catch(() => undefined);
  };

  const onKey = (e: RKeyboardEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("input,select,textarea")) return;
    const k = e.key.toLowerCase();
    if (k === " " || k === "k") toggle();
    else if (k === "arrowleft") skip(-5);
    else if (k === "arrowright") skip(5);
    else if (k === "arrowup") setVol((v()?.volume ?? 1) + 0.1);
    else if (k === "arrowdown") setVol((v()?.volume ?? 1) - 0.1);
    else if (k === "m") {
      const el = v();
      if (el) el.muted = !el.muted;
    } else if (k === "f") toggleFullscreen();
    else return;
    e.preventDefault();
  };

  /* Tortish paytida chiziq va vaqt — qo'l turgan joydan (video ulgurmasa ham) */
  const shownTime = dragT ?? time;
  const pct = duration > 0 ? (shownTime / duration) * 100 : 0;
  const bufPct = duration > 0 ? (buffered / duration) * 100 : 0;
  const VolIcon = muted || volume === 0 ? SpeakerSlash : volume < 0.5 ? SpeakerLow : SpeakerHigh;
  const btn =
    "grid h-8 w-8 flex-none place-items-center rounded-lg text-slate-200 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-300/60";

  return (
    <div
      ref={wrapRef}
      tabIndex={0}
      onKeyDown={onKey}
      className={`group/player relative flex h-full w-full flex-col overflow-hidden rounded-lg bg-black outline-none ${wrapClassName}`}
    >
      {/* 🔵 2026-10-26 — VIDEO ALOHIDA QUTIDA, boshqaruv paneli uning OSTIDA
          (foydalanuvchi: "videoni to'liq ko'ravermaydi"). Ilgari panel kadr
          ustida (`absolute bottom-0`) turib, pastki qismini — sana/vaqt
          yozuvi, odamlar — doim yopardi. */}
      {/* ⚠️ `flex-col` SHART: gorizontal flexda `<video>` bo'yiga cho'zilmay,
          katta oynada tabiiy balandligida (kichkina) qolardi. */}
      <div className="relative flex min-h-0 flex-1 flex-col">
      <video
        ref={videoRef}
        {...rest}
        playsInline
        onClick={toggle}
        onPlay={(e) => {
          setPlaying(true);
          onPlay?.(e);
        }}
        onPause={(e) => {
          setPlaying(false);
          onPause?.(e);
        }}
        onTimeUpdate={(e) => {
          setTime(e.currentTarget.currentTime);
          onTimeUpdate?.(e);
        }}
        /* Oldingi sakrash tugadi — tortish paytida yig'ilgan eng so'nggi nuqtaga */
        onSeeked={(e) => {
          const next = pendingSeekRef.current;
          if (next != null) {
            pendingSeekRef.current = null;
            e.currentTarget.currentTime = next;
          }
          onSeeked?.(e);
        }}
        onLoadedMetadata={(e) => {
          setDuration(e.currentTarget.duration);
          e.currentTarget.playbackRate = rate;
          onLoadedMetadata?.(e);
        }}
        onProgress={(e) => {
          const b = e.currentTarget.buffered;
          setBuffered(b.length ? b.end(b.length - 1) : 0);
          onProgress?.(e);
        }}
        onVolumeChange={(e) => {
          setVolume(e.currentTarget.volume);
          setMuted(e.currentTarget.muted);
          onVolumeChange?.(e);
        }}
        /* To'liq ekranda chaqiruvchining o'lcham cheklovi (dossiyedagi
           `max-h-[46vh]`) QO'LLANMAYDI — aks holda kadr qora ekran o'rtasida
           kichkina qolardi (2026-10-26, "videoni kattalashtirishimiz kerak"). */
        className={`min-h-0 w-full flex-1 cursor-pointer object-contain ${fullscreen ? "h-full max-h-none" : className}`}
      />

      {/* Markazdagi katta play — to'xtab turganda */}
      {!playing && (
        <button
          type="button"
          onClick={toggle}
          aria-label={p.play}
          /* 🔵 2026-10-26 — "play tugmasini to'g'rila": yorqin ko'k-binafsha
             gradient kadr ustida baqiroq turardi. Endi zamonaviy pleerlardagi
             kabi — yarim shaffof qorong'i doira + ingichka yorug' chegara,
             hover'da sian. Uchburchak OPTIK markazda (`ml-1` — uchburchakning
             og'irlik markazi chapga siljigan bo'ladi). Joylashuv flex bilan
             (`inset-0 m-auto`), `translate` EMAS — hover `scale` bilan urishmaydi. */
          className="absolute inset-0 m-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/40 bg-black/55 text-white shadow-[0_10px_30px_-8px_rgba(0,0,0,0.8)] transition-[transform,background-color,border-color] duration-200 hover:scale-110 hover:border-cyan-300/80 hover:bg-cyan-500/30"
        >
          <Play size={24} weight="fill" className="ml-1" />
        </button>
      )}
      </div>

      {/* ── Boshqaruv paneli ── */}
      <div className="flex-none border-t border-white/[0.08] bg-[#070c18] px-3 pb-2 pt-2.5">
        {/* Vaqt chizig'i — bosish va surish */}
        <div
          role="slider"
          aria-label={p.seek}
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(time)}
          tabIndex={-1}
          onPointerDown={onBarDown}
          onPointerMove={onBarMove}
          onPointerUp={onBarUp}
          onPointerLeave={() => !draggingRef.current && setHover(null)}
          /* Ushlash maydoni 28 px (chiziqning o'zi 8 px) — sichqoncha va
             barmoq bilan ham oson topiladi; `touch-none` — sensorli ekranda
             surish sahifani aylantirib yubormasin. */
          className="group/bar relative mb-1 flex h-7 cursor-pointer touch-none items-center"
        >
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/15 transition-[height] group-hover/bar:h-2.5">
            <div className="absolute inset-y-0 left-0 bg-white/25" style={{ width: `${bufPct}%` }} />
            <div
              className="absolute inset-y-0 left-0"
              style={{ width: `${pct}%`, background: "linear-gradient(90deg, #22d3ee, #818cf8)" }}
            />
          </div>
          <span
            className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 rounded-full border-2 border-cyan-300 bg-white shadow-[0_0_12px_#22d3ee] transition-transform group-hover/bar:scale-125"
            style={{ left: `${pct}%` }}
          />
          {hover && duration > 0 && (
            <span
              className="pointer-events-none absolute -top-7 -translate-x-1/2 rounded-md border border-white/10 bg-[#070c18]/90 px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-slate-100"
              style={{ left: hover.x }}
            >
              {fmtTime(hover.t)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button type="button" onClick={toggle} title={playing ? p.pause : p.play} className={btn}>
            {playing ? <Pause size={17} weight="fill" /> : <Play size={17} weight="fill" />}
          </button>
          <button type="button" onClick={() => skip(-10)} title={p.back10} className={btn}>
            <ArrowCounterClockwise size={16} weight="bold" />
          </button>
          <button type="button" onClick={() => skip(10)} title={p.fwd10} className={btn}>
            <ArrowClockwise size={16} weight="bold" />
          </button>

          {/* Ovoz — tugma + ustiga kelganda daraja chizig'i */}
          <div className="group/vol flex items-center">
            <button
              type="button"
              onClick={() => {
                const el = v();
                if (el) el.muted = !el.muted;
              }}
              title={muted ? p.unmute : p.mute}
              className={btn}
            >
              <VolIcon size={17} weight="fill" />
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={muted ? 0 : volume}
              onChange={(e) => setVol(Number(e.target.value))}
              aria-label={p.volume}
              className="player-range w-0 opacity-0 transition-all duration-200 group-hover/vol:ml-1 group-hover/vol:w-20 group-hover/vol:opacity-100 focus:ml-1 focus:w-20 focus:opacity-100"
              style={{ ["--fill" as string]: `${(muted ? 0 : volume) * 100}%` }}
            />
          </div>

          <span className="ml-2 font-mono text-[11.5px] font-semibold text-slate-200">
            {fmtTime(shownTime)} <span className="text-slate-500">/ {fmtTime(duration)}</span>
          </span>

          <div className="ml-auto flex items-center gap-1">
            {/* Tezlik sozlamasi */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setSpeedOpen((o) => !o)}
                title={p.speed}
                aria-expanded={speedOpen}
                className={`${btn} w-auto gap-1 px-2 font-mono text-[11px] font-bold`}
              >
                <GearSix size={16} weight={speedOpen ? "fill" : "regular"} />
                {rate !== 1 && <span>{rate}×</span>}
              </button>
              {speedOpen && (
                <div className="absolute bottom-10 right-0 z-10 w-40 rounded-xl border border-white/10 bg-[#070c18]/95 p-1.5 shadow-[0_20px_40px_-16px_rgba(0,0,0,0.9)] backdrop-blur-md">
                  <p className="px-2 pb-1 pt-0.5 text-[9.5px] font-bold uppercase tracking-[0.16em] text-cyan-300/70">
                    {p.speed}
                  </p>
                  {SPEEDS.map((s) => {
                    const active = rate === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          setRate(s);
                          const el = v();
                          if (el) el.playbackRate = s;
                          setSpeedOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-[11.5px] font-semibold transition-colors ${
                          active ? "text-white" : "text-slate-300 hover:bg-white/[0.06]"
                        }`}
                        style={active ? { background: "linear-gradient(90deg, rgba(34,211,238,.35), rgba(129,140,248,.3))" } : undefined}
                      >
                        <span>{s === 1 ? p.normal : `${s}×`}</span>
                        {active && <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <button type="button" onClick={toggleFullscreen} title={fullscreen ? p.exitFullscreen : p.fullscreen} className={btn}>
              {fullscreen ? <CornersIn size={17} weight="bold" /> : <CornersOut size={17} weight="bold" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
