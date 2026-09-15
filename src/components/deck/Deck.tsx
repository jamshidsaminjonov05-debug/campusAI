"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Captions, CaptionsOff, ChevronLeft, ChevronRight, Languages, Pause, Play, Repeat, Volume2, VolumeX, X } from "lucide-react";
import AiOrb from "./AiOrb";
import Narrator from "./Narrator";
import ShowBackground from "./ShowBackground";
import StartGate from "./StartGate";
import { cueAt, cueTimes, segmentFor } from "./narration";
import { voiceBus } from "./voiceBus";
import { useShowTime } from "./useShowTime";
import { EASE } from "./ui";
import { isDeckLang, type DeckCopyBase, type DeckDefinition, type DeckLang } from "./types";

/**
 * TAQDIMOT QOBIG'I — barcha taqdimotlar uchun bitta dvijok.
 *
 * Butun taqdimot — bitta uzluksiz sahna. Fon hech qachon almashmaydi,
 * AI orbi esa hech qachon ekrandan ketmaydi: u faqat joyini o'zgartiradi
 * (`centred` slaydlarda markazda, qolganlarida burchakda).
 *
 * IKKI TILDA: o'zbekcha va inglizcha. Til almashsa matn ham, ovoz ham,
 * animatsiya vaqtlari ham o'sha tilnikiga o'tadi.
 *
 * Boshqaruv:
 *   →  PageDown  Enter          keyingi slayd
 *   ←  PageUp  Backspace        oldingi
 *   1…9                         to'g'ridan-to'g'ri slaydga o'tish
 *   Space                       PAUZA — eng katta tugma, eng ko'p kerak
 *   P                           PAUZA (o'sha amal)
 *   M                           ovozni o'chirish/yoqish (vaqt oqaveradi)
 *   R                           joriy slaydni boshidan qayta o'ynatish
 *   A                           avtomatik rejim (o'zi gapiradi, o'zi o'tadi)
 *   S                           subtitrni yoqish/o'chirish
 *   L                           tilni almashtirish
 *   Esc                         taqdimotdan chiqish
 *
 * URL parametrlari:
 *   `?slayd=4`   — o'sha slayddan boshlash (boshlash ekrani o'tkaziladi)
 *   `?til=en`    — inglizcha
 *   `?tayyor=1`  — animatsiyasiz, har slayd YAKUNIY holatida (chop etish,
 *                  ekran rasmi, tez ko'rib chiqish uchun)
 *   `?kiosk=1`   — stend rejimi: boshlash ekranisiz, o'zi gapiradi, oxiriga
 *                  yetgach boshidan qaytaradi
 *
 * Slaydga QAYTILGANDA animatsiya va ovoz takrorlanmaydi — slayd oxirgi
 * holatida ochiladi. Taqdimotchi orqaga qaytsa shou buzilmaydi.
 */

/** Avtorejimda ovoz tugagach keyingi slaydgacha nafas, sekund */
const AUTO_GAP = 2.2;
/** Ko'rilgan slaydda avtorejim qancha turadi (ovoz qayta o'qilmaydi), sekund */
const SEEN_DWELL = 4;

export default function Deck<T extends DeckCopyBase>({ deck }: { deck: DeckDefinition<T> }) {
  const [slide, setSlide] = useState(0);
  const [lang, setLang] = useState<DeckLang>("uz");
  /* Shou boshlanganmi. Ovoz brauzerda faqat foydalanuvchi bosgandan keyin
     ijro etiladi, shuning uchun sahna `StartGate` ortida kutib turadi. */
  const [started, setStarted] = useState(false);
  /**
   * "Yakuniy kadr" rejimi (`?tayyor=1`): har bir slayd animatsiyasiz, darhol
   * OXIRGI holatida chiziladi. Chop etish, ekran rasmi olish va slaydni
   * tez ko'zdan kechirish uchun — shou sifatida emas.
   */
  const [staticMode, setStaticMode] = useState(false);
  /** Stend rejimi (`?kiosk=1`) — oxiriga yetgach boshidan qaytaradi */
  const [kiosk, setKiosk] = useState(false);
  const [captions, setCaptions] = useState(true);
  const [auto, setAuto] = useState(false);
  /** Sahna joyida qotgan — ovoz ham, vaqt ham to'xtagan */
  const [paused, setPaused] = useState(false);
  /** Ovoz o'chirilgan — vaqt esa oqishda davom etadi */
  const [muted, setMuted] = useState(false);
  /** Slaydni qayta o'ynatish hisoblagichi (`R`) */
  const [runId, setRunId] = useState(0);

  const count = deck.slides.length;
  const copy = deck.copies[lang];
  const langKey = `campus-ai:deck:${deck.id}`;
  const exitHref = deck.exitHref ?? "/";

  /**
   * Ko'rib bo'lingan slaydlar. Slayd BIRINCHI marta ochilganda `fresh`
   * true bo'ladi va animatsiya to'liq o'ynaydi; keyin qaytilganda esa
   * u oxirgi holatida ochiladi.
   *
   * Qiymat render paytida hisoblanadi (effektda emas): aks holda yangi
   * slaydning BIRINCHI kadri eski `fresh` bilan chizilib, animatsiya
   * boshlanishi sakrab ketardi. Shart faqat slayd yoki til o'zgarganda
   * bajariladi, shuning uchun takroriy renderda natija o'zgarmaydi.
   */
  const seen = useRef<Set<number>>(new Set());
  const lastKey = useRef("");
  const freshRef = useRef(true);
  const key = `${lang}:${slide}:${runId}`;
  if (lastKey.current !== key) {
    lastKey.current = key;
    freshRef.current = !seen.current.has(slide);
    seen.current.add(slide);
  }
  const fresh = !staticMode && freshRef.current;

  const seg = useMemo(() => segmentFor(copy, slide, deck.audio), [copy, slide, deck.audio]);
  const at = useMemo(() => cueTimes(seg), [seg]);
  const t = useShowTime(slide, !fresh, seg?.duration ?? 0, started, paused, runId);

  /* Til almashganda hamma slayd yana "yangi" bo'ladi — yangi tildagi
     ovoz va animatsiya to'liq o'ynashi kerak. */
  const switchLang = useCallback(
    (next: DeckLang) => {
      seen.current.clear();
      lastKey.current = "";
      setLang(next);
      try {
        window.localStorage.setItem(langKey, next);
      } catch {
        /* localStorage yopiq bo'lishi mumkin — til shunchaki saqlanmaydi */
      }
    },
    [langKey],
  );

  /* `?slayd=4&til=en` — to'g'ridan-to'g'ri kerakli slayd va tildan boshlash.
     Repetitsiyada va savol-javobda kerak: butun shouni qaytadan o'tkazmasdan
     bitta slaydga qaytish mumkin. */
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const qLang = q.get("til");
    let saved: string | null = null;
    try {
      saved = window.localStorage.getItem(langKey);
    } catch {
      saved = null;
    }
    const wanted = isDeckLang(qLang) ? qLang : isDeckLang(saved) ? saved : null;
    if (wanted && wanted !== "uz") {
      seen.current.clear();
      lastKey.current = "";
      setLang(wanted);
    }

    /* Deep-link (`?slayd=N`) — repetitsiya va savol-javob rejimi:
       boshlash ekrani o'tkazib yuboriladi, kadr darhol ochiladi. */
    if (q.get("tayyor") === "1") {
      setStaticMode(true);
      setStarted(true);
    }

    /* Stend rejimi: ko'rgazmada hech kim tugma bosmaydi — shou o'zi
       boshlanadi, o'zi gapiradi va oxiriga yetgach boshidan qaytadi.
       Ovoz brauzer tomonidan bloklanishi mumkin, sahna esa baribir yuradi. */
    if (q.get("kiosk") === "1") {
      setKiosk(true);
      setStarted(true);
      setAuto(true);
    }

    const n = Number(q.get("slayd"));
    if (Number.isInteger(n) && n >= 1 && n <= count) {
      setSlide(n - 1);
      setStarted(true);
    }
  }, [langKey, count]);

  const next = useCallback(() => setSlide((s) => Math.min(s + 1, count - 1)), [count]);
  const prev = useCallback(() => setSlide((s) => Math.max(s - 1, 0)), []);

  /* Pauza: sahna qotadi, ovoz to'xtaydi. Taqdimotchi o'zi gapirmoqchi
     bo'lganda yoki savolga javob berayotganda kerak. */
  const togglePause = useCallback(() => {
    setPaused((v) => {
      voiceBus.setHeld(!v);
      return !v;
    });
  }, []);

  /* Ovozni o'chirish: vaqt OQAVERADI — taqdimotchi matnni o'zi o'qiydi,
     subtitr va animatsiya esa o'sha jadval bo'yicha ketaveradi. */
  const toggleMute = useCallback(() => {
    setMuted((v) => {
      voiceBus.setMuted(!v);
      return !v;
    });
  }, []);

  /** Joriy slaydni boshidan qayta o'ynatish (ovoz bilan birga) */
  const replay = useCallback(() => {
    seen.current.delete(slide);
    setPaused(false);
    voiceBus.setHeld(false);
    setRunId((n) => n + 1);
  }, [slide]);

  /* ── klaviatura (taqdimot pulti ham shu tugmalarni yuboradi) ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key;

      /* Boshqaruv elementi fokusda bo'lsa klaviatura O'SHANIKI.
         Investor taqdimotidagi sliderlar `←`/`→` bilan sozlanadi — usiz
         bitta bosishda ham slider surilib, ham slayd almashib ketardi. */
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) {
        // Esc baribir ishlaydi: fokusni tashlab, taqdimotdan chiqish yo'li
        if (k !== "Escape") return;
        el.blur();
      }

      if (!started) {
        // Boshlash ekranida faqat ikkita tugma ishlaydi
        if (k === "Enter" || k === " " || e.code === "Space" || k === "ArrowRight") {
          e.preventDefault();
          setStarted(true);
        } else if (k === "Escape") {
          window.location.href = exitHref;
        }
        return;
      }
      /* SPACE — PAUZA, keyingi slayd EMAS.
         Taqdimotchining eng tez-tez kerak bo'ladigan amali sahnani joyida
         qotirish: savol berilganda yoki o'zi gapirmoqchi bo'lganda. Space
         eng katta tugma, shuning uchun u shu vazifada. Slaydni o'tkazish —
         `→`, `Enter`, `PageDown` va pultdagi tugma. */
      if (k === " " || e.code === "Space") {
        e.preventDefault();
        togglePause();
      } else if (k === "ArrowRight" || k === "PageDown" || k === "Enter") {
        e.preventDefault();
        next();
      } else if (k === "ArrowLeft" || k === "PageUp" || k === "Backspace") {
        e.preventDefault();
        prev();
      } else if (k === "Escape") {
        window.location.href = exitHref;
      } else if (k >= "1" && k <= "9") {
        /* Savol-javobda kerak: investor 6-slaydga qaytishni so'rasa,
           butun shouni aylanib o'tirmasdan darhol o'sha yerga o'tiladi. */
        const n = Number(k) - 1;
        if (n < count) setSlide(n);
      } else if (k === "a" || k === "A" || k === "ф" || k === "Ф") {
        setAuto((v) => !v);
      } else if (k === "s" || k === "S" || k === "ы" || k === "Ы") {
        setCaptions((v) => !v);
      } else if (k === "l" || k === "L" || k === "д" || k === "Д") {
        switchLang(lang === "uz" ? "en" : "uz");
      } else if (k === "p" || k === "P" || k === "з" || k === "З") {
        e.preventDefault();
        togglePause();
      } else if (k === "m" || k === "M" || k === "ь" || k === "Ь") {
        toggleMute();
      } else if (k === "r" || k === "R" || k === "к" || k === "К") {
        replay();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [next, prev, lang, switchLang, started, togglePause, toggleMute, replay, count, exitHref]);

  /**
   * AVTOMATIK REJIM — taqdimot o'zi gapiradi va o'zi o'tadi.
   *
   * Vaqt `t` dan o'qiladi, taymerdan emas. Bu uchta narsani hal qiladi:
   *   • pauzadan chiqilganda hisob NOLDAN boshlanmaydi (`t` qotib turadi);
   *   • brauzer ovozni kech boshlasa, slayd ovozni kesib o'tmaydi —
   *     `t` audio faylining O'Z vaqtiga ergashadi;
   *   • ovoz umuman bo'lmasa oddiy sekundomer bo'yicha ketadi.
   */
  const autoFrom = useRef(0);
  useEffect(() => {
    autoFrom.current = performance.now();
  }, [slide, auto, runId]);

  useEffect(() => {
    if (!auto || !started || paused) return;
    const len = seg?.duration ?? 12;
    /* Ko'rilgan slaydda ovoz qayta o'qilmaydi va `t` darhol katta bo'ladi —
       shuning uchun u yerda oddiy turish vaqti ishlatiladi. */
    const ready = fresh ? t >= len + AUTO_GAP : (performance.now() - autoFrom.current) / 1000 >= SEEN_DWELL;
    if (!ready) return;

    if (slide < count - 1) next();
    else if (kiosk) {
      /* Stend rejimi: yangi tomoshabin uchun hammasi boshidan o'ynasin */
      seen.current.clear();
      lastKey.current = "";
      setSlide(0);
      setRunId((n) => n + 1);
    } else setAuto(false);
  }, [auto, started, paused, t, seg, fresh, slide, next, count, kiosk]);

  /* ── sahifa scroll qilinmaydi: bu slayd, sayt emas ── */
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  /**
   * Taqdimot HAR DOIM qorong'i.
   *
   * Ilovaning yorug' mavzusi `index.css` da `text-white` ni QORAga
   * aylantiradi (`:root[data-scheme="light"] .text-white`). Taqdimot esa
   * kino sahnasi: yorug' mavzuda sarlavhalar fonga singib ketardi.
   * Shuning uchun sahifa ochilganda mavzu majburan `dark` ga o'tadi va
   * chiqishda foydalanuvchi tanlovi qaytariladi.
   */
  useEffect(() => {
    const root = document.documentElement;
    const prevTheme = root.dataset.theme;
    const prevScheme = root.dataset.scheme;
    const prevClass = root.classList.contains("dark");
    root.dataset.theme = "dark";
    root.dataset.scheme = "dark";
    root.classList.add("dark");
    return () => {
      if (prevTheme) root.dataset.theme = prevTheme;
      if (prevScheme) root.dataset.scheme = prevScheme;
      if (!prevClass) root.classList.remove("dark");
    };
  }, []);

  const subtitle = captions ? cueAt(seg, t) : "";
  const centred = useMemo(() => new Set(deck.centred ?? [0, count - 1]), [deck.centred, count]);
  const orbAnchor = useMemo(() => (centred.has(slide) ? ".show-slide.is-active .orb-slot" : null), [centred, slide]);
  const progress = ((slide + 1) / count) * 100;
  const titles = copy.shell.slideTitles;
  const Extra = deck.Controls;

  const scene = (
    <div className="relative h-[100dvh] w-full select-none overflow-hidden bg-ink text-slate-100">
      <ShowBackground />

      {/* ovoz (ko'rinmas) va AI orbi — barcha slaydlarda bitta nusxa */}
      {started && <Narrator key={runId} slide={slide} copy={copy} manifest={deck.audio} />}
      <AiOrb anchor={orbAnchor} />

      {/* ── yuqori chiziq: jarayon ── */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-40 h-[2px] bg-white/5">
        <motion.div
          className="h-full bg-gradient-to-r from-ice-cyan via-ice to-ice-bright"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.6, ease: EASE }}
        />
      </div>

      {/* ── slaydlar ── */}
      <div className="absolute inset-0 z-10 pb-[132px]">
        {deck.slides.map((C, i) => {
          const on = i === slide;
          return (
            <div
              /**
               * ⚠️ `key` ga `staticMode` KIRADI.
               *
               * `?tayyor=1` URL'dan effektda o'qiladi, ya'ni BIRINCHI render
               * allaqachon `fresh=true` bilan chizilgan bo'ladi va
               * framer-motion `initial={{opacity:0}}` ni boshlang'ich holat
               * sifatida yodda saqlaydi. `initial` propi keyin o'zgarsa ham
               * u faqat MOUNT paytida o'qiladi — natijada yakuniy kadr
               * rejimida ham animatsiya o'ynab, kech chiqadigan elementlar
               * (kechiktirilgan ro'yxat bandlari) chop etishda tushib qolardi.
               *
               * `key` o'zgarishi slaydni qayta mount qiladi va `initial={false}`
               * to'g'ri qo'llanadi.
               */
              key={`${i}:${staticMode}`}
              aria-hidden={!on}
              /* Yakuniy kadr rejimida o'tish effekti yo'q: slayd darhol
                 to'liq ko'rinadi (chop etish va ekran rasmi uchun). */
              className={`show-slide absolute inset-0 ${staticMode ? "" : "transition-all duration-700"} ${
                on ? "is-active opacity-100" : "pointer-events-none opacity-0"
              }`}
              style={{ transform: on || staticMode ? "scale(1)" : i < slide ? "scale(0.985)" : "scale(1.015)" }}
            >
              {/* Faqat qo'shni slaydlar chiziladi: og'ir kadrlar (video,
                  xarita, GIF) ekrandan uzoqda turib resurs yemasin. */}
              {Math.abs(i - slide) <= 1 && <C active={on} t={on ? t : 0} fresh={on ? fresh : true} at={on ? at : []} />}
            </div>
          );
        })}
      </div>

      {/* ── subtitr ── */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[62px] z-30 flex justify-center px-6">
        <AnimatePresence mode="wait">
          {subtitle && (
            <motion.p
              key={subtitle}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.35, ease: EASE }}
              className="max-w-[1000px] rounded-xl border border-white/[0.07] bg-[#060a14]/75 px-6 py-3 text-center text-[clamp(13.5px,1.15vw,18px)] leading-[1.5] text-slate-200 backdrop-blur-md"
            >
              {subtitle}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* ── pastki boshqaruv paneli ── */}
      <div className="absolute inset-x-0 bottom-0 z-40 flex items-center justify-between gap-4 px-[clamp(16px,3vw,40px)] py-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prev}
            disabled={slide === 0}
            aria-label={copy.shell.prev}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/[0.12] text-slate-300 transition-colors hover:border-ice/50 hover:text-ice disabled:opacity-25 disabled:hover:border-white/[0.12] disabled:hover:text-slate-300"
          >
            <ChevronLeft size={17} />
          </button>
          <button
            type="button"
            onClick={next}
            disabled={slide === count - 1}
            aria-label={copy.shell.next}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/[0.12] text-slate-300 transition-colors hover:border-ice/50 hover:text-ice disabled:opacity-25 disabled:hover:border-white/[0.12] disabled:hover:text-slate-300"
          >
            <ChevronRight size={17} />
          </button>
          <span className="ml-2 font-mono text-[11px] tracking-[0.2em] text-slate-500">
            {String(slide + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
            <span className="ml-3 hidden text-slate-600 sm:inline">{titles[slide]}</span>
          </span>
        </div>

        {/* nuqtalar */}
        <div className="hidden items-center gap-2 md:flex">
          {titles.map((title, i) => (
            <button
              key={title}
              type="button"
              onClick={() => setSlide(i)}
              title={title}
              aria-label={title}
              className={`h-1.5 rounded-full transition-all duration-500 ${i === slide ? "w-7 bg-ice" : "w-1.5 bg-white/20 hover:bg-white/45"}`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          {/* Taqdimotga xos qo'shimcha tugmalar (masalan valyuta almashtirgich) */}
          {Extra && <Extra />}

          {/* Pauza — taqdimotchining asosiy tugmasi: sahna joyida qotadi */}
          <button
            type="button"
            onClick={togglePause}
            title="(P)"
            aria-label={paused ? copy.shell.resume : copy.shell.pause}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.16em] transition-colors ${
              paused ? "border-amber-400/60 bg-amber-500/15 text-amber-200" : "border-white/[0.12] text-slate-400 hover:border-ice/40 hover:text-ice"
            }`}
          >
            {paused ? <Play size={12} /> : <Pause size={12} />}
            {paused ? copy.shell.resume : copy.shell.pause}
          </button>
          <button
            type="button"
            onClick={toggleMute}
            title="(M)"
            aria-label={copy.shell.sound}
            className={`grid h-9 w-9 place-items-center rounded-full border transition-colors ${
              muted ? "border-rose-400/45 text-rose-300" : "border-white/[0.12] text-slate-400 hover:border-ice/50 hover:text-ice"
            }`}
          >
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <button
            type="button"
            onClick={replay}
            title="(R)"
            aria-label="Qayta"
            className="grid h-9 w-9 place-items-center rounded-full border border-white/[0.12] text-slate-400 transition-colors hover:border-ice/50 hover:text-ice"
          >
            <Repeat size={15} />
          </button>
          <span className="mx-1 h-5 w-px bg-white/10" />
          <button
            type="button"
            onClick={() => switchLang(lang === "uz" ? "en" : "uz")}
            title="(L)"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.12] px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.16em] text-slate-400 transition-colors hover:border-ice/40 hover:text-ice"
          >
            <Languages size={12} />
            {lang === "uz" ? "UZ" : "EN"}
          </button>
          <button
            type="button"
            onClick={() => setAuto((v) => !v)}
            title="(A)"
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[10.5px] uppercase tracking-[0.16em] transition-colors ${
              auto ? "border-ice/55 bg-ice/[0.12] text-ice" : "border-white/[0.12] text-slate-400 hover:border-ice/40 hover:text-ice"
            }`}
          >
            {auto ? <Pause size={12} /> : <Play size={12} />}
            {copy.shell.auto}
          </button>
          <button
            type="button"
            onClick={() => setCaptions((v) => !v)}
            title="(S)"
            aria-label={copy.shell.captions}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/[0.12] text-slate-400 transition-colors hover:border-ice/50 hover:text-ice"
          >
            {captions ? <Captions size={16} /> : <CaptionsOff size={16} />}
          </button>
          <a
            href={exitHref}
            title="(Esc)"
            aria-label={copy.shell.exit}
            className="grid h-9 w-9 place-items-center rounded-full border border-white/[0.12] text-slate-400 transition-colors hover:border-rose-400/50 hover:text-rose-300"
          >
            <X size={16} />
          </a>
        </div>
      </div>

      {/* ── pauza belgisi ── */}
      <AnimatePresence>
        {paused && started && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="pointer-events-none absolute left-1/2 top-6 z-40 -translate-x-1/2"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/45 bg-amber-500/15 px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.3em] text-amber-200 backdrop-blur-md">
              <Pause size={12} />
              {copy.shell.paused}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── boshlash ekrani ── */}
      <AnimatePresence>
        {!started && (
          <StartGate lang={lang} copies={deck.copies} onLang={switchLang} onStart={() => setStarted(true)} />
        )}
      </AnimatePresence>

      {/* ── birinchi slaydda qisqa eslatma ── */}
      <AnimatePresence>
        {started && slide === 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, delay: 1.2 }}
            className="pointer-events-none absolute right-[clamp(16px,3vw,40px)] top-6 z-40 font-mono text-[10.5px] uppercase tracking-[0.24em] text-slate-600"
          >
            {copy.shell.hint}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );

  const Wrapper = deck.Wrapper;
  const inner = <deck.context.Provider value={copy}>{scene}</deck.context.Provider>;
  return Wrapper ? <Wrapper>{inner}</Wrapper> : inner;
}
