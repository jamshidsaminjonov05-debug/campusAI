"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Moon, Plus, Sun, type LucideIcon } from "lucide-react";
import { LANGS, useI18n, useT, type Lang } from "@/i18n";
import { hydrateTheme, setTheme, useScheme } from "@/theme";
import { Logo } from "@/components/common/Logo";

/*
 * Ommaviy sayt (landing + ichki sahifalar) — UMUMIY bo'laklar.
 *
 * RANGLAR — `.site` TOKENLARIDAN (`index.css` oxiri): `bg-[var(--s-card)]`,
 * `text-[var(--s-text)]`… Yorug'/qorong'i qiymat `<html data-scheme>` ga
 * qarab almashadi (panel bilan AYNI mavzu tanlovi).
 *
 * ⚠️ `text-white`/`text-slate-*`/`bg-white/…` ISHLATILMAYDI: `index.css`
 * dagi yorug' mavzu qoidalari ularni `!important` bilan qayta yozadi.
 * ⚠️ Rasm/qorong'i hero/ko'k lenta USTIDAGI elementlar ATAYLAB hex
 * (`#FFFFFF`, `#171819`) — ular ikkala rejimda bir xil qoladi.
 */

export const WRAP = "mx-auto w-full max-w-[1360px] px-5 md:px-10";
export const EASE = [0.22, 1, 0.36, 1] as const;

/* Scroll'da yumshoq paydo bo'lish — barcha bo'limlar uchun yagona preset */
export const reveal = {
  initial: { opacity: 0, y: 26 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.8, ease: EASE },
} as const;

/* ---------------------------------------------------------------- */

/** Buyurtma tugmalari shu yerga olib boradi — Telegram orqali to'g'ridan-to'g'ri hisobga */
export const TELEGRAM_ORDER_URL = "https://t.me/Jsaminjonov";

export type PillTone = "light" | "dark" | "outline" | "ghost";

const PILL_TONE: Record<PillTone, string> = {
  light: "border-[#FFFFFF] bg-[#FFFFFF] text-[#171819] hover:bg-[#EAF2FF]",
  dark: "border-[var(--s-ink)] bg-[var(--s-ink)] text-[var(--s-on-ink)] hover:border-[#2584FF] hover:bg-[#2584FF] hover:text-[#FFFFFF]",
  outline: "border-[var(--s-ink)] bg-transparent text-[var(--s-text)] hover:bg-[var(--s-ink)] hover:text-[var(--s-on-ink)]",
  ghost: "border-[rgba(255,255,255,0.7)] bg-transparent text-[#FFFFFF] hover:bg-[#FFFFFF] hover:text-[#171819]",
};

/**
 * Maketdagi "pbtn" — tinch holatda faqat matn, hover'da o'ngdan strelka
 * chiqadi va tugma biroz ko'tariladi. `/` bilan boshlangan manzil — Next Link.
 */
export function Pill({ href, tone, small, children }: { href: string; tone: PillTone; small?: boolean; children: ReactNode }) {
  const cls = `group inline-flex items-center rounded-full border font-semibold tracking-[0.005em] transition-[background-color,color,border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-14px_rgba(37,132,255,0.6)] active:translate-y-0 ${
    small ? "px-5 py-2.5 text-[14px]" : "px-7 py-[15px] text-[15.5px]"
  } ${PILL_TONE[tone]}`;
  const inner = (
    <>
      <span>{children}</span>
      <span className="grid w-0 place-items-center overflow-hidden opacity-0 transition-all duration-300 group-hover:ml-2 group-hover:w-4 group-hover:opacity-100">
        <ArrowRight size={16} strokeWidth={2.2} />
      </span>
    </>
  );
  if (href.startsWith("/")) return <Link href={href} className={cls}>{inner}</Link>;
  /* Tashqi manzil (masalan Telegram) — yangi tabda ochiladi, sayt o'zi yopilib qolmasin */
  const external = href.startsWith("http");
  return (
    <a href={href} className={cls} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      {inner}
    </a>
  );
}

/** Brend belgisi — tipografik (alohida logo fayli yo'q), bosh sahifaga olib boradi */
export function Brand({ onDark }: { onDark: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-2.5" aria-label="Campus AI">
      {/* Brend belgisi — `public/logo/` dagi "CA" monogrammasi
          (2026-09-14; ilgari umumiy `ScanFace` ikonkasi turardi). */}
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-[linear-gradient(135deg,#2584FF,#2050E0)] text-[#FFFFFF] shadow-[0_8px_20px_-8px_rgba(37,132,255,0.8)] transition-transform duration-500 ease-out group-hover:-rotate-[10deg] group-hover:scale-110">
        <Logo className="h-[15px] w-auto" />
      </span>
      <span className={`text-[19px] font-semibold tracking-[-0.02em] transition-colors duration-300 ${onDark ? "text-[#FFFFFF]" : "text-[var(--s-text)]"}`}>
        Campus <span className="text-[#2584FF]">AI</span>
      </span>
    </Link>
  );
}

/** Til tanlagich — aktiv fon `layoutId` bilan siljiydi */
export function LangSwitch({ onDark }: { onDark: boolean }) {
  const { lang, setLang, t } = useI18n();
  return (
    <div
      role="group"
      aria-label={t.lang.switch}
      className={`flex items-center rounded-full border p-0.5 transition-colors duration-300 ${
        onDark ? "border-[rgba(255,255,255,0.28)]" : "border-[var(--s-line-strong)]"
      }`}
    >
      {LANGS.map((code: Lang) => {
        const on = lang === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLang(code)}
            aria-pressed={on}
            title={t.lang[code]}
            className={`relative rounded-full px-2.5 py-1 text-[11.5px] font-bold uppercase tracking-[0.04em] transition-colors duration-300 ${
              on ? (onDark ? "text-[#171819]" : "text-[var(--s-on-ink)]") : onDark ? "text-[rgba(255,255,255,0.75)] hover:text-[#FFFFFF]" : "text-[var(--s-text2)] hover:text-[var(--s-text)]"
            }`}
          >
            {on && (
              <motion.span
                layoutId="lp-lang"
                className={`absolute inset-0 rounded-full ${onDark ? "bg-[#FFFFFF]" : "bg-[var(--s-ink)]"}`}
                transition={{ type: "spring", stiffness: 480, damping: 36 }}
              />
            )}
            <span className="relative">{code}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Kunduzgi ↔ tungi rejim. Panel bilan AYNI store (`theme/store.ts`), ya'ni
 * saytda tanlangan rejim panelga kirganda ham saqlanadi.
 */
export function ThemeToggle({ onDark }: { onDark: boolean }) {
  const n = useT().landing.nav;
  const dark = useScheme() === "dark";
  /* SSR faqat `data-theme` ni qo'yadi, mavzu tokenlari klientda qo'llanadi */
  useEffect(() => {
    hydrateTheme();
  }, []);
  const label = dark ? n.themeToLight : n.themeToDark;
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={label}
      title={label}
      className={`grid h-9 w-9 flex-none place-items-center overflow-hidden rounded-full border transition-colors duration-300 ${
        onDark
          ? "border-[rgba(255,255,255,0.28)] text-[#FFFFFF] hover:bg-[rgba(255,255,255,0.14)]"
          : "border-[var(--s-line-strong)] text-[var(--s-text)] hover:bg-[var(--s-hover)]"
      }`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={dark ? "moon" : "sun"}
          initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
          transition={{ duration: 0.25 }}
          className="grid place-items-center"
        >
          {dark ? <Moon size={17} /> : <Sun size={17} />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

/* ---------------------------------------------------------------- */

export type ChipKind = "ok" | "alert" | "solid";

/** Rasm ustidagi "aniqlandi" kartochkasi — sekin suzib turadi */
export function FloatChip({ kind, title, meta, className }: { kind: ChipKind; title: string; meta: string; className: string }) {
  const reduce = useReducedMotion();
  const box =
    kind === "solid"
      ? "bg-[#F0454B] text-[#FFFFFF] shadow-[0_18px_40px_-16px_rgba(240,69,75,0.9)]"
      : "bg-[#FFFFFF] text-[#171819] shadow-[0_18px_40px_-18px_rgba(0,0,0,0.55)]";
  const dot = kind === "ok" ? "bg-[#22C55E]" : kind === "alert" ? "bg-[#F0454B]" : "bg-[#FFFFFF]"; // qizil chip ustida — doim oq
  return (
    <motion.div
      animate={reduce ? undefined : { y: [0, -7, 0] }}
      transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      className={`absolute z-10 flex items-start gap-2.5 rounded-2xl px-4 py-3 ${box} ${className}`}
    >
      <span className={`relative mt-1 h-2.5 w-2.5 flex-none rounded-full ${dot}`}>
        <span className={`absolute inset-0 animate-ping rounded-full ${dot} opacity-60`} />
      </span>
      <span>
        <span className="block text-[13.5px] font-semibold leading-tight">{title}</span>
        <span className={`mt-0.5 block text-[11.5px] ${kind === "solid" ? "text-[rgba(255,255,255,0.85)]" : "text-[#636769]"}`}>{meta}</span>
      </span>
    </motion.div>
  );
}

/** Katta yumaloq rasm kartasi (ixtiyoriy "aniqlandi" belgisi bilan) */
export function MediaCard({
  img,
  chip,
  aspect = "aspect-[4/3]",
  position = "object-center",
}: {
  img: string;
  chip?: { kind: ChipKind; title: string; meta: string; pos?: string };
  aspect?: string;
  position?: string;
}) {
  return (
    <div className={`group relative overflow-hidden rounded-[40px] bg-[#0E1520] lg:rounded-[48px] ${aspect}`}>
      <img
        src={img}
        alt=""
        className={`absolute inset-0 h-full w-full object-cover ${position} transition-transform duration-[1200ms] ease-out group-hover:scale-105`}
      />
      {chip && <FloatChip kind={chip.kind} title={chip.title} meta={chip.meta} className={chip.pos ?? "bottom-8 left-8"} />}
    </div>
  );
}

/** Ko'k lenta — "Qanday ishlashini ko'ring" va o'rtadagi bannerlar uchun umumiy */
export function BlueBanner({ lead, text, cta, href }: { lead: string; text: string; cta: string; href: string }) {
  return (
    <section className="relative overflow-hidden bg-[#2584FF] text-[#FFFFFF]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_140%_at_85%_50%,rgba(255,255,255,0.18),transparent_60%)]" />
      <motion.div {...reveal} className={`${WRAP} relative flex flex-col items-center justify-center gap-6 py-12 text-center md:flex-row md:py-[54px]`}>
        <p className="text-[clamp(18px,1.6vw,27px)] tracking-[-0.02em]">
          <span className="font-bold">{lead}</span>
          {text}
        </p>
        <Pill href={href} tone="light" small>{cta}</Pill>
      </motion.div>
    </section>
  );
}

/** Markazlashgan bo'lim sarlavhasi */
export function SectionTitle({ kicker, title, sub }: { kicker?: string; title: string; sub?: string }) {
  return (
    <motion.div {...reveal} className="text-center">
      {kicker && <p className="text-[15px] font-medium text-[var(--s-text2)]">{kicker}</p>}
      <h2 className="mt-1 text-[clamp(30px,3.2vw,52px)] font-medium leading-[1.15] tracking-[-0.05em] text-[var(--s-text)]">{title}</h2>
      {sub && <p className="mt-3 text-[16px] text-[var(--s-text2)]">{sub}</p>}
    </motion.div>
  );
}

/** Ko'k ikonkali ro'yxat (maketdagi "plist") */
export function Bullets({ items, icons, className = "" }: { items: readonly string[]; icons: LucideIcon[]; className?: string }) {
  return (
    <ul className={`flex flex-col gap-4 ${className}`}>
      {items.map((it, i) => {
        const Icon = icons[i % icons.length];
        return (
          <li key={it} className="group flex items-start gap-3.5 text-[16.5px] leading-[1.5] text-[var(--s-text)]">
            <span className="mt-[-2px] grid h-8 w-8 flex-none place-items-center rounded-lg text-[#2584FF] transition-colors duration-300 group-hover:bg-[#2584FF] group-hover:text-[#FFFFFF]">
              <Icon size={19} strokeWidth={1.8} />
            </span>
            <span className="transition-transform duration-300 group-hover:translate-x-0.5">{it}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Matn + rasm qatori; `reverse` — rasm chapda */
export function FeatureRow({
  title,
  kicker,
  items,
  icons,
  media,
  reverse,
  id,
}: {
  title: string;
  kicker?: string;
  items: readonly string[];
  icons: LucideIcon[];
  media: ReactNode;
  reverse?: boolean;
  id?: string;
}) {
  return (
    <div id={id} className="grid scroll-mt-24 items-center gap-10 py-10 lg:grid-cols-2 lg:gap-[clamp(48px,7vw,140px)] lg:py-14">
      <motion.div {...reveal} className={reverse ? "lg:order-2" : undefined}>
        {kicker && <p className="text-[15px] font-medium text-[var(--s-text2)]">{kicker}</p>}
        <h3 className="text-[clamp(26px,2.4vw,40px)] font-medium leading-[1.2] tracking-[-0.04em] text-[var(--s-text)]">{title}</h3>
        <Bullets items={items} icons={icons} className="mt-7" />
      </motion.div>
      <motion.div {...reveal} transition={{ ...reveal.transition, delay: 0.1 }} className={reverse ? "lg:order-1" : undefined}>
        {media}
      </motion.div>
    </div>
  );
}

/** Rasmli qorong'i hero (ichki sahifalar uchun) */
export function PageHero({ img, title, children }: { img: string; title: string; children?: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <header className="relative isolate overflow-hidden bg-[#0E1520] text-[#FFFFFF]">
      <motion.img
        src={img}
        alt=""
        initial={{ scale: reduce ? 1 : 1.1 }}
        animate={{ scale: 1 }}
        transition={{ duration: 9, ease: "easeOut" }}
        className="absolute inset-0 -z-10 h-full w-full object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(14,21,32,0.85)_0%,rgba(14,21,32,0.5)_55%,rgba(14,21,32,0.2)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-2/3 bg-[linear-gradient(0deg,rgba(14,21,32,0.85),transparent)]" />
      <div className={`${WRAP} flex min-h-[540px] flex-col justify-end pb-16 pt-[150px] md:min-h-[620px]`}>
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.1, ease: EASE }}
          className="max-w-[1100px] text-[clamp(38px,5vw,84px)] font-light leading-[1.08] tracking-[-0.05em]"
        >
          {title}
        </motion.h1>
        {children && (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.3, ease: EASE }}
            className="mt-9 flex flex-wrap gap-3"
          >
            {children}
          </motion.div>
        )}
      </div>
    </header>
  );
}

/** Ko'p so'raladigan savollar — ochiladigan qatorlar */
export function Faq({ id, title, items }: { id?: string; title: string; items: readonly { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id={id} className="scroll-mt-20 bg-[var(--s-bg2)] py-[clamp(64px,6vw,90px)]">
      <div className={WRAP}>
        <motion.h2 {...reveal} className="text-[clamp(30px,3vw,48px)] font-medium tracking-[-0.05em] text-[var(--s-text)]">
          {title}
        </motion.h2>
        <div className="mt-10 flex flex-col gap-4">
          {items.map((it, i) => {
            const on = open === i;
            return (
              <motion.div
                key={it.q}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: 0.04 * i, ease: EASE }}
                className={`rounded-[24px] bg-[var(--s-card)] transition-shadow duration-300 ${
                  on ? "shadow-[0_18px_40px_-24px_rgba(14,21,32,0.35)]" : "hover:shadow-[0_12px_30px_-24px_rgba(14,21,32,0.35)]"
                }`}
              >
                <button
                  type="button"
                  aria-expanded={on}
                  onClick={() => setOpen(on ? null : i)}
                  className="group flex w-full items-center justify-between gap-6 px-7 py-6 text-left"
                >
                  <span className={`text-[17px] font-medium transition-colors duration-300 ${on ? "text-[#2584FF]" : "text-[var(--s-text)] group-hover:text-[#2584FF]"}`}>
                    {it.q}
                  </span>
                  <span
                    className={`grid h-9 w-9 flex-none place-items-center rounded-full transition-all duration-300 ${
                      on ? "rotate-45 bg-[#2584FF] text-[#FFFFFF]" : "bg-[var(--s-muted)] text-[var(--s-text2)] group-hover:bg-[var(--s-accent-soft)] group-hover:text-[#2584FF]"
                    }`}
                  >
                    <Plus size={18} />
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {on && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: EASE }}
                      className="overflow-hidden"
                    >
                      <p className="max-w-[900px] px-7 pb-7 text-[16px] leading-[1.65] text-[var(--s-text2)]">{it.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/** Iqtibos bloki — o'ngda nuqtali naqsh (CSS, rasm yo'q) */
export function QuoteBlock({ text, author, role, cta, href }: { text: string; author: string; role: string; cta: string; href: string }) {
  return (
    <section className="relative overflow-hidden bg-transparent py-[clamp(72px,8vw,120px)]">
      <div className="pointer-events-none absolute inset-y-0 right-0 w-2/3 bg-[radial-gradient(rgba(37,132,255,0.22)_1.3px,transparent_1.3px)] [background-size:22px_22px] [mask-image:linear-gradient(90deg,transparent,#000_70%)]" />
      <motion.div {...reveal} className="relative mx-auto max-w-[900px] px-5 md:px-10">
        <blockquote className="text-[clamp(21px,1.9vw,30px)] leading-[1.4] tracking-[-0.02em] text-[var(--s-text)]">“{text}”</blockquote>
        <div className="mt-8 flex items-center gap-3.5">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-[linear-gradient(135deg,#2584FF,#2050E0)] text-[#FFFFFF]">
            <Logo className="h-[17px] w-auto" />
          </span>
          <span>
            <span className="block text-[16px] font-semibold text-[var(--s-text)]">{author}</span>
            <span className="block text-[14px] text-[var(--s-text2)]">{role}</span>
          </span>
        </div>
        <div className="mt-9">
          <Pill href={href} tone="outline">{cta}</Pill>
        </div>
      </motion.div>
    </section>
  );
}
