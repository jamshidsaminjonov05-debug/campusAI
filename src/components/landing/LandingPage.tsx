"use client";

import { useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  BarChart3, BellRing, Box, Cigarette, Crosshair, FileVideo, ListChecks, Pause, Play, ScanFace, Swords, UserX,
} from "lucide-react";
import { useT } from "@/i18n";
import { SiteShell } from "@/components/site/Footer";
import { BlueBanner, EASE, FloatChip, Pill, QuoteBlock, TELEGRAM_ORDER_URL, WRAP, reveal, type ChipKind } from "@/components/site/ui";

/*
 * Ommaviy bosh sahifa (`/`) — Figma maketi asosida (2026-09-11).
 *
 * ⚠️ Maket boshqa saytdan (html.to.design) olingan — undan faqat TARTIB,
 * tipografiya va ranglar olindi. Logotip, matn, rasm, press logolari va
 * sharhlar KO'CHIRILMADI: kontent Campus AI'niki, rasmlar `public/`dan
 * (offline qoidasi — tashqi rasm yo'q).
 *
 * Navbar, footer va umumiy bo'laklar — `components/site/` (ichki
 * sahifalar bilan umumiy). Ranglar hex bo'lishining sababi — `site/ui.tsx`.
 */

function Hero() {
  const h = useT().landing.hero;
  const reduce = useReducedMotion();
  return (
    <header id="top" className="relative isolate overflow-hidden bg-[#0E1520] text-[#FFFFFF]">
      <motion.img
        src="/imges/cam-scene.webp"
        alt=""
        initial={{ scale: reduce ? 1 : 1.1 }}
        animate={{ scale: 1 }}
        transition={{ duration: 9, ease: "easeOut" }}
        className="absolute inset-0 -z-10 h-full w-full object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(14,21,32,0.86)_0%,rgba(14,21,32,0.55)_50%,rgba(14,21,32,0.2)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-2/3 bg-[linear-gradient(0deg,rgba(14,21,32,0.92),transparent)]" />

      <div className={`${WRAP} pb-12 pt-[150px] md:pt-[200px]`}>
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.1, ease: EASE }}
          className="max-w-[1100px] text-[clamp(40px,5.6vw,90px)] font-light leading-[1.1] tracking-[-0.05em]"
        >
          {h.titleA}
          <br />
          {h.titleB}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.25, ease: EASE }}
          className="mt-7 max-w-[760px] text-[clamp(16px,1.3vw,21.6px)] leading-[1.5] text-[rgba(255,255,255,0.88)]"
        >
          {h.text}
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.38, ease: EASE }}
          className="mt-9"
        >
          <Pill href="#imkoniyatlar" tone="light">{h.cta}</Pill>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="mt-20 grid items-center gap-8 border-t border-[rgba(255,255,255,0.18)] pt-10 md:mt-28 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]"
        >
          <p className="max-w-[440px] text-[clamp(17px,1.35vw,25px)] font-medium leading-[1.5]">{h.trusted}</p>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {h.stats.map((s) => (
              <div key={s.label} className="group">
                <p className="text-[clamp(30px,2.6vw,44px)] font-light tracking-[-0.04em] transition-colors duration-300 group-hover:text-[#8DBBFF]">
                  {s.num}
                </p>
                <p className="mt-1 text-[13px] leading-snug text-[rgba(255,255,255,0.7)]">{s.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </header>
  );
}

function News() {
  const n = useT().landing.news;
  return (
    <section className="bg-transparent py-[clamp(64px,6vw,90px)]">
      <div className={`${WRAP} grid items-center gap-12 lg:grid-cols-2 lg:gap-20`}>
        <motion.div {...reveal}>
          <p className="text-[15px] font-medium text-[var(--s-text2)]">{n.kicker}</p>
          <h3 className="mt-2 max-w-[560px] text-[clamp(26px,2.5vw,40px)] font-medium leading-[1.18] tracking-[-0.035em] text-[var(--s-text)]">
            {n.title}
          </h3>
          <p className="mt-5 max-w-[560px] text-[15.5px] leading-[1.6] text-[var(--s-text2)]">{n.text}</p>
          <p className="mt-4 max-w-[560px] text-[15.5px] leading-[1.6] text-[var(--s-text)]">{n.text2}</p>
          <div className="mt-8">
            <Pill href="/mahsulot" tone="dark">{n.cta}</Pill>
          </div>
        </motion.div>

        <motion.div
          {...reveal}
          transition={{ ...reveal.transition, delay: 0.1 }}
          className="group relative aspect-[16/10] overflow-hidden rounded-[36px] bg-[#0E1520]"
        >
          <img
            src="/imges/uz-map.webp"
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(37,132,255,0.82),rgba(32,80,224,0.5)_60%,rgba(14,21,32,0.35))]" />
          <div className="relative flex h-full flex-col items-center justify-center px-8 text-center text-[#FFFFFF]">
            <div className="flex items-center gap-3 text-[clamp(18px,1.7vw,26px)] font-semibold tracking-[-0.02em]">
              <span className="flex items-center gap-2">
                <ScanFace size={24} /> Campus AI
              </span>
              <span className="text-[rgba(255,255,255,0.6)]">×</span>
              <span>{n.cardA}</span>
            </div>
            <p className="mt-4 text-[clamp(20px,2vw,30px)] font-light tracking-[-0.03em]">{n.cardTitle}</p>
            <p className="mt-2 max-w-[420px] text-[14px] leading-[1.55] text-[rgba(255,255,255,0.85)]">{n.cardText}</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

const WHY_MEDIA: { img: string; chip: ChipKind; pos: string }[] = [
  { img: "/imges/ai-face.webp", chip: "ok", pos: "left-7 top-8" },
  { img: "/imges/incident-scene.webp", chip: "alert", pos: "left-7 top-8" },
  { img: "/imges/control-room.webp", chip: "solid", pos: "left-7 top-[34%]" },
];

function Why() {
  const w = useT().landing.why;
  return (
    <section id="imkoniyatlar" className="scroll-mt-16 bg-[var(--s-bg2)] py-[clamp(64px,6vw,90px)]">
      <div className={WRAP}>
        <motion.h2 {...reveal} className="text-center text-[clamp(32px,3.4vw,54px)] font-medium tracking-[-0.05em] text-[var(--s-text)]">
          {w.title}
        </motion.h2>

        <div className="mt-12 grid gap-6 md:grid-cols-3 lg:mt-[72px] lg:gap-9">
          {w.cards.map((c, i) => {
            const m = WHY_MEDIA[i % WHY_MEDIA.length];
            return (
              <motion.article
                key={c.title}
                {...reveal}
                transition={{ ...reveal.transition, delay: 0.1 * i }}
                whileHover={{ y: -8 }}
                className="group relative flex min-h-[480px] flex-col justify-end overflow-hidden rounded-[40px] bg-[#0E1520] p-8 lg:min-h-[576px] lg:rounded-[54px] lg:p-[45px]"
              >
                <img
                  src={m.img}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(0,0,0,0.85)_0%,rgba(0,0,0,0.35)_48%,rgba(0,0,0,0.05)_100%)]" />
                <FloatChip kind={m.chip} title={c.chip} meta={c.chipMeta} className={m.pos} />
                <div className="relative">
                  <h4 className="text-[clamp(22px,1.8vw,28.8px)] leading-[1.2] text-[#FAFAFA]">{c.title}</h4>
                  <p className="mt-3.5 text-[16px] leading-[1.55] tracking-[-0.01em] text-[rgba(255,255,255,0.9)]">{c.text}</p>
                </div>
              </motion.article>
            );
          })}
        </div>

        <motion.div {...reveal} className="mt-14 flex flex-col items-center gap-8 lg:mt-[72px]">
          <p className="text-center text-[17px] text-[var(--s-text)]">{w.note}</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Pill href={TELEGRAM_ORDER_URL} tone="dark">{w.primary}</Pill>
            <Pill href="#qanday" tone="outline">{w.secondary}</Pill>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

const PROTECT_ICONS = [Crosshair, Swords, Cigarette, UserX];

function Protect() {
  const p = useT().landing.protect;
  return (
    <section id="qanday" className="scroll-mt-16 bg-transparent pt-[clamp(64px,6vw,90px)]">
      <div className={WRAP}>
        <motion.h2 {...reveal} className="text-center text-[clamp(32px,3.4vw,54px)] font-medium tracking-[-0.05em] text-[var(--s-text)]">
          {p.title}
        </motion.h2>

        <div className="mt-10 grid items-center gap-12 py-9 lg:grid-cols-2 lg:gap-[clamp(48px,8vw,162px)]">
          <motion.div {...reveal}>
            <p className="text-[clamp(16px,1.2vw,20.3px)] font-medium text-[var(--s-text2)]">{p.kicker}</p>
            <h3 className="mt-1 text-[clamp(30px,2.8vw,45px)] font-medium leading-[1.2] tracking-[-0.05em] text-[var(--s-text)]">
              {p.heading}
            </h3>
            <p className="mt-6 text-[clamp(16px,1.2vw,20.3px)] font-medium leading-[1.5] text-[var(--s-text2)]">{p.sub}</p>
            <ul className="mt-10 flex flex-col gap-6">
              {p.items.map((it, i) => {
                const Icon = PROTECT_ICONS[i % PROTECT_ICONS.length];
                return (
                  <motion.li
                    key={it.lead}
                    initial={{ opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.6, delay: 0.08 * i, ease: EASE }}
                    className="group flex items-start gap-[18px]"
                  >
                    <span className="grid h-9 w-9 flex-none place-items-center rounded-xl text-[#2584FF] transition-colors duration-300 group-hover:bg-[#2584FF] group-hover:text-[#FFFFFF]">
                      <Icon size={26} strokeWidth={1.8} />
                    </span>
                    <p className="text-[clamp(16px,1.2vw,20.3px)] font-medium leading-[1.5] tracking-[-0.01em] text-[var(--s-text)]">
                      <span className="font-bold text-[#2584FF] underline decoration-[rgba(37,132,255,0.45)] underline-offset-4 transition-colors group-hover:decoration-[#2584FF]">
                        {it.lead}
                      </span>
                      {it.text}
                    </p>
                  </motion.li>
                );
              })}
            </ul>
          </motion.div>

          <motion.div
            {...reveal}
            transition={{ ...reveal.transition, delay: 0.1 }}
            className="group relative aspect-[693/780] overflow-hidden rounded-[40px] bg-[#0E1520] lg:rounded-[54px]"
          >
            <img
              src="/imges/uz-map.webp"
              alt=""
              className="absolute inset-0 h-full w-full object-cover object-[62%_50%] transition-transform duration-[1400ms] ease-out group-hover:scale-110"
            />
            <FloatChip kind="alert" title={p.mapChip} meta="Campus AI" className="bottom-10 left-8" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

const EMPOWER_ICONS = [BellRing, ListChecks, Box, FileVideo, BarChart3];

/** Hodisa videosi — lokal fayl, faqat bosilganda o'ynaydi (`preload="none"`) */
function VideoCard({ label }: { label: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) {
      void v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };
  return (
    <div className="group relative aspect-square overflow-hidden rounded-[40px] border border-[var(--s-line)] bg-[var(--s-muted)] lg:rounded-[54px]">
      <video
        ref={ref}
        src="/video/fight.mp4"
        poster="/video/fight-poster.jpg"
        muted
        loop
        playsInline
        preload="none"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className={`absolute inset-0 bg-[rgba(14,21,32,0.25)] transition-opacity duration-500 ${playing ? "opacity-0" : "opacity-100"}`} />
      <button
        type="button"
        onClick={toggle}
        aria-label={label}
        className={`absolute left-1/2 top-1/2 grid h-[88px] w-[88px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[rgba(255,255,255,0.92)] text-[#3F4448] shadow-[0_20px_50px_-18px_rgba(0,0,0,0.6)] transition-[transform,opacity] duration-300 hover:scale-110 ${
          playing ? "opacity-0 group-hover:opacity-100" : "opacity-100"
        }`}
      >
        {!playing && <span className="absolute inset-0 animate-ping rounded-full bg-[rgba(255,255,255,0.35)]" />}
        {playing ? <Pause size={30} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
      </button>
    </div>
  );
}

function Empower() {
  const e = useT().landing.empower;
  return (
    <section id="xarita" className="scroll-mt-16 bg-transparent pb-[clamp(64px,6vw,90px)] pt-9">
      <div className={`${WRAP} grid items-center gap-12 lg:grid-cols-2 lg:gap-[clamp(48px,8vw,162px)]`}>
        <motion.div {...reveal}>
          <VideoCard label={e.play} />
        </motion.div>
        <motion.div {...reveal} transition={{ ...reveal.transition, delay: 0.1 }}>
          <p className="text-[15px] font-medium text-[var(--s-text2)]">{e.kicker}</p>
          <h3 className="mt-1 text-[clamp(28px,2.4vw,40px)] font-medium leading-[1.2] tracking-[-0.04em] text-[var(--s-text)]">{e.heading}</h3>
          <p className="mt-4 text-[16px] leading-[1.6] text-[var(--s-text2)]">{e.sub}</p>
          <ul className="mt-8 flex flex-col gap-4">
            {e.items.map((it, i) => {
              const Icon = EMPOWER_ICONS[i % EMPOWER_ICONS.length];
              return (
                <li key={it} className="group flex items-center gap-3.5 text-[16px] text-[var(--s-text)]">
                  <span className="grid h-8 w-8 flex-none place-items-center rounded-lg bg-[var(--s-accent-soft)] text-[#2584FF] transition-transform duration-300 group-hover:scale-110">
                    <Icon size={17} strokeWidth={2} />
                  </span>
                  <span className="transition-transform duration-300 group-hover:translate-x-1">{it}</span>
                </li>
              );
            })}
          </ul>
          <div className="mt-9">
            <Pill href="/panel" tone="dark">{e.cta}</Pill>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

const DETECT_IMAGES = ["/imges/chekish.webp", "/imges/telefon.webp", "/imges/qurol.webp"];

function Detect() {
  const d = useT().landing.detect;
  return (
    <section id="aniqlash" className="scroll-mt-16 bg-transparent py-[clamp(64px,6vw,90px)]">
      <div className={WRAP}>
        <motion.div {...reveal} className="text-center">
          <p className="text-[15px] font-medium text-[var(--s-text2)]">{d.kicker}</p>
          <h2 className="mt-2 text-[clamp(30px,3vw,48px)] font-medium tracking-[-0.05em] text-[var(--s-text)]">{d.title}</h2>
        </motion.div>

        <div className="mt-12 grid gap-6 md:grid-cols-3 lg:gap-9">
          {d.cards.map((c, i) => (
            <motion.a
              key={c.title}
              href="#qanday"
              {...reveal}
              transition={{ ...reveal.transition, delay: 0.1 * i }}
              className="group relative block aspect-[4/5] overflow-hidden rounded-[40px] bg-[#0E1520] lg:aspect-[492/576] lg:rounded-[54px]"
            >
              <img
                src={DETECT_IMAGES[i % DETECT_IMAGES.length]}
                alt=""
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.6)_0%,rgba(0,0,0,0.05)_40%,rgba(0,0,0,0.35)_100%)]" />
              <h4 className="absolute inset-x-0 top-8 text-center text-[clamp(20px,1.6vw,26px)] text-[#FFFFFF]">{c.title}</h4>
              <span className="absolute bottom-7 right-7 inline-flex items-center rounded-full bg-[#FFFFFF] px-5 py-2.5 text-[14px] font-semibold text-[#171819] transition-all duration-300 group-hover:bg-[#2584FF] group-hover:text-[#FFFFFF]">
                {d.more}
              </span>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
}

export function LandingPage() {
  const l = useT().landing;
  return (
    <SiteShell overDark>
      <Hero />
      <News />
      <Why />
      <Protect />
      <Empower />
      <BlueBanner lead={l.banner.lead} text={l.banner.text} cta={l.banner.cta} href="#boglanish" />
      <Detect />
      <QuoteBlock text={l.quote.text} author={l.quote.author} role={l.quote.role} cta={l.quote.cta} href="/mahsulot" />
    </SiteShell>
  );
}
