import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { ArrowsClockwise as RefreshCcw, ArrowsOut as Maximize2, CircleNotch as Loader2, Pause, Play, VideoCameraSlash as VideoOff, X } from "@phosphor-icons/react";
import type { CameraOut } from "@/lib/api";
import { useT } from "@/i18n";
import { useModalHistory } from "@/hooks/useModalHistory";

/** 1×1 shaffof GIF — MJPEG ulanishini UZISH uchun (pastga qarang). */
const BLANK = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

interface Props {
  cam: CameraOut;
  /** MJPEG manzili (kuzatuv posti kanali yoki backend kamerasi) — chaqiruvchi tanlaydi. */
  streamUrl: string;
  /** Bitta kadr (JPEG) — oqim ulanguncha va pauzada ko'rsatiladi. */
  posterUrl?: string | null;
  onClose: () => void;
  /** Backend kamerasi uchun start/stop xabari (kuzatuv posti kanalida bunday API yo'q). */
  onStart?: () => void;
  onStop?: () => void;
  /** Ovozli buyruq: "jonli efirni och/to'xtat", "to'liq ekranga o't". */
  action?: "play" | "pause" | "fullscreen" | null;
  onActionDone?: () => void;
}

/**
 * Kameraning JONLI oqimi — vizir (viewfinder) ko'rinishidagi modal.
 *
 * NEGA modal: kameralar sahifasida 32 tagacha kanal bor. Ularning hammasini
 * bir vaqtda oqim bilan ko'rsatib bo'lmaydi — har MJPEG oqimi ochiq HTTP
 * ulanish. Panjarada faqat STOP-KADR (`snapshot`) turadi, jonli oqim esa
 * FAQAT shu oynada ulanadi va oyna yopilishi bilan uziladi.
 *
 * ── Oqim QAYERDA to'xtaydi (talab: "o'chirilsa ham, yopilsa ham tugasin")
 *  1. Oyna yopilganda — effekt tozalanishida manzil bo'shatiladi;
 *  2. "Pauza" bosilganda — o'sha yo'l bilan;
 *  3. Tab boshqa oynaga o'tganda — oqim to'xtaydi, qaytganda o'zi tiklanadi.
 *
 * ── IKKI MUHIM TEXNIK NUQTA ────────────────────────────────────────────
 * 1. **`src` IMPERATIV boshqariladi** (`<img src=…>` propi EMAS). MJPEG'ni
 *    to'xtatish uchun manzilni 1×1 `data:` GIF'ga almashtirish kerak; agar
 *    buni React propi bilan qilsak, React `src` propi o'zgarmagani uchun uni
 *    QAYTA yozmaydi. React 18 StrictMode dev'da har komponentni ikki marta
 *    ulaydi (mount → unmount → mount) va aynan shu sababli oqim BIR MARTA
 *    uzilib, ekran qop-qora bo'lib qolardi (REC yonib turgani holda —
 *    chunki bo'sh GIF ham "yuklandi" hisoblanadi).
 * 2. **Modal `document.body` ga portal orqali chiqariladi.** Kameralar
 *    sahifasining ildizida `backdrop-filter` bor (`hik-glass-blue`), u esa
 *    `position: fixed` uchun YANGI containing block yaratadi — portalsiz
 *    oyna butun ekranni emas, faqat sahifa maydonini egallaydi va pastdan
 *    kesilib qoladi.
 */
export function CameraStreamModal({
  cam,
  streamUrl,
  posterUrl,
  onClose,
  onStart,
  onStop,
  action,
  onActionDone,
}: Props) {
  const t = useT();
  /* ◀ "orqaga" avval oqim oynasini yopadi (`lib/modalHistory.ts`). */
  useModalHistory(onClose);
  const c = t.cameras;
  const imgRef = useRef<HTMLImageElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  /** Tab yashirilgani sababli to'xtatilgan — qaytganda o'zi tiklanadi. */
  const autoPaused = useRef(false);

  const [live, setLive] = useState(cam.is_active);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [seconds, setSeconds] = useState(0);
  /** Pauzada ko'rsatiladigan "muzlatilgan" oxirgi kadr. */
  const [frozen, setFrozen] = useState<string | null>(null);

  /** Joriy kadrni canvasga ko'chiradi (oqim same-origin — canvas ifloslanmaydi). */
  const capture = useCallback((): string | null => {
    const img = imgRef.current;
    if (!img?.naturalWidth) return null;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0);
      return canvas.toDataURL("image/jpeg", 0.85);
    } catch {
      return null;
    }
  }, []);

  const pause = useCallback(() => {
    setFrozen(capture());
    setLive(false);
    setLoaded(false);
    onStop?.();
  }, [capture, onStop]);

  const resume = useCallback(() => {
    setFrozen(null);
    setFailed(false);
    setSeconds(0);
    setLive(true);
    onStart?.();
  }, [onStart]);

  /* Oqimni ULASH va UZISH — manzil shu yerda beriladi (yuqoridagi 1-izoh).
     Tozalash: oyna yopilganda, pauzada va manzil almashganda ulanish uziladi. */
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    if (live && !failed) img.src = streamUrl;
    return () => {
      if (img.src !== BLANK) img.src = BLANK;
    };
  }, [live, failed, streamUrl]);

  /* Backendga "oqim tugadi" xabari — faqat oyna yopilganda (bir marta). */
  useEffect(() => {
    return () => onStop?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Tab yashirilsa oqim to'xtaydi (bekorga tarmoq va kuzatuv posti bandligi),
     qaytganda o'zi tiklanadi. */
  useEffect(() => {
    const onVis = () => {
      if (document.hidden && live) {
        autoPaused.current = true;
        pause();
      } else if (!document.hidden && autoPaused.current) {
        autoPaused.current = false;
        resume();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [live, pause, resume]);

  /* Server javob bermasa "Ulanmoqda…" abadiy osilib qolmasin */
  useEffect(() => {
    if (!live || loaded || failed) return;
    const timer = window.setTimeout(() => setFailed(true), 10000);
    return () => window.clearTimeout(timer);
  }, [live, loaded, failed, streamUrl]);

  /* Yozuv taymeri — birinchi kadr kelgandan boshlanadi */
  useEffect(() => {
    if (!live || !loaded) return;
    const id = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [live, loaded]);

  /* Esc — yopish */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /* Ovozli buyruq */
  useEffect(() => {
    if (!action) return;
    if (action === "play") resume();
    else if (action === "pause") pause();
    else if (action === "fullscreen") void stageRef.current?.requestFullscreen?.();
    onActionDone?.();
  }, [action, pause, resume, onActionDone]);

  const clock = `${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(
    Math.floor((seconds % 3600) / 60)
  ).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  const recording = live && loaded && !failed;
  /* Oqim kelguncha (yoki pauzada) stop-kadr ko'rsatiladi — ekran qop-qora
     turmasin. Pauzada muzlatilgan kadr bo'lsa o'sha ustunroq. */
  const still = !live || !loaded ? frozen ?? posterUrl ?? null : null;

  const modal = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[90] grid place-items-center bg-[#03060E]/90 p-4 backdrop-blur-md"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${cam.name} — ${c.liveTitle}`}
        onClick={(e) => e.stopPropagation()}
        /* 🔵 NEON QAYTA DIZAYN (2026-09-10) — `.neon-modal--cyan` `.cam-live`
           ustidan gradient chegara/porlash qo'yadi (`index.css`), joylashuv/
           o'lcham qoidalari `.cam-live`ning o'zida qoladi. */
        className="cam-live neon-modal neon-modal--cyan"
      >
        <header className="cam-live-top">
          <span className={`cam-rec${recording ? " is-on" : ""}`}>
            <i />
            {recording ? c.liveRec : cam.is_active ? c.liveStandby : c.liveOffline}
          </span>
          <b className="min-w-0">{cam.name}</b>
          <span className="cam-ch neon-num font-bold">#{cam.channel}</span>
          <button type="button" onClick={onClose} className="ml-auto neon-icon-btn" aria-label={t.common.close} title={t.common.close}>
            <X size={15} />
          </button>
        </header>

        <div ref={stageRef} className="cam-live-stage">
          {/* Stop-kadr — oqim kelguncha va pauzada */}
          {still && <img src={still} alt="" className="cam-live-img" />}

          {/* Jonli MJPEG — `src` effektda beriladi (yuqoridagi izoh) */}
          <img
            ref={imgRef}
            alt=""
            className="cam-live-img"
            style={{ visibility: recording ? "visible" : "hidden" }}
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
          />

          {/* Kadr ustida FAQAT soat qoladi.
              Olib tashlandi: `cam-live-guides` (vizir chiziqlari),
              `cam-live-mid` (markaz halqasi) va TAKROR REC nishoni —
              REC allaqachon sarlavhada turibdi. */}
          <span className="cam-live-time">{clock}</span>

          {/* Holatlar */}
          {!cam.is_active && (
            <div className="cam-live-note">
              <VideoOff size={26} className="text-slate-500" />
              {c.liveOfflineHint}
            </div>
          )}
          {cam.is_active && live && !loaded && !failed && (
            <div className="cam-live-note">
              <Loader2 size={26} className="animate-spin text-ice-bright" />
              {c.liveConnecting}
            </div>
          )}
          {cam.is_active && failed && (
            <div className="cam-live-note">
              <VideoOff size={26} className="text-rose-400" />
              <b className="text-[13px] text-rose-200">{c.liveFailed}</b>
              <span className="max-w-[360px] text-center text-slate-400">{c.liveFailedHint}</span>
              <button type="button" onClick={resume} className="neon-btn mt-1">
                <RefreshCcw size={13} />
                {c.liveRetry}
              </button>
            </div>
          )}
          {cam.is_active && !live && !failed && (
            <div className="cam-live-note">
              <Play size={26} className="text-emerald-300" />
              {c.livePausedNote}
              <button type="button" onClick={resume} className="neon-btn mt-1">
                <Play size={13} />
                {c.liveResume}
              </button>
            </div>
          )}
        </div>

        {/* Pastki qator. Olib tashlandi: takroriy `CH` (sarlavhada bor) va
            "oyna yopilganda oqim uziladi" izohi. Tugmalar faqat IKONKA —
            nomi `title` da qoladi (kartochkadagi boshqaruv bilan bir xil). */}
        <footer className="cam-live-foot">
          {cam.ip_address && <span>{cam.ip_address}</span>}
          {cam.location && <span className="normal-case tracking-normal">{cam.location}</span>}

          <span className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => (live ? pause() : resume())}
              disabled={!cam.is_active}
              title={live ? c.livePause : c.liveResume}
              aria-label={live ? c.livePause : c.liveResume}
              className={`neon-icon-btn${live ? " is-active" : ""}`}
            >
              {live ? <Pause size={15} weight="fill" /> : <Play size={15} weight="fill" />}
            </button>
            <button
              type="button"
              onClick={() => void stageRef.current?.requestFullscreen?.()}
              title={c.liveFullscreen}
              aria-label={c.liveFullscreen}
              className="neon-icon-btn"
            >
              <Maximize2 size={15} />
            </button>
          </span>
        </footer>
      </div>
    </motion.div>
  );

  /* SSR'da `document` yo'q — portal faqat brauzerda. Sahifa `ssr:false`
     bilan yuklanadi, lekin bu tekshiruv komponentni mustaqil qiladi. */
  return typeof document === "undefined" ? modal : createPortal(modal, document.body);
}
