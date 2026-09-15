"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight, BellRing, BookOpen, Building2, CircleHelp, Crosshair, GraduationCap, Menu, PiggyBank, School,
  Sparkles, Tag, TrendingUp, Users, Workflow, X, type LucideIcon,
} from "lucide-react";
import { useT } from "@/i18n";
import { Brand, EASE, LangSwitch, Pill, TELEGRAM_ORDER_URL, ThemeToggle, WRAP } from "./ui";

/*
 * NAVBAR — mega-menyu va hover animatsiyalari shu yerda.
 *
 * Yuqori qator = sayt sahifalari. "Mahsulot" va "Campus qo'riqlash" ustiga
 * kelinsa butun kenglikdagi och panel ochiladi, bosilsa o'z sahifasi.
 */

type MenuId = "product" | "campus";
type TopKey = "product" | "campus" | "presentation" | "investor" | "docs" | "about" | "pricing";

const TOP: { key: TopKey; href: string; menu?: MenuId }[] = [
  { key: "product", href: "/mahsulot", menu: "product" },
  { key: "campus", href: "/campus-qoriqlash", menu: "campus" },
  /* ⚠️ Mahsulot taqdimoti menyudan VAQTINCHA olib turilgan — havola
     orqali `/taqdimot` baribir ochiladi. Qaytarish uchun quyidagi qatorni
     izohdan chiqaring (matn kaliti `landing.nav.presentation` joyida):
       { key: "presentation", href: "/taqdimot" }, */
  /* Investor taqdimoti — to'liq ekranli shou. Sahifa `noindex`
     (moliyaviy hisob bor), lekin menyudan ochilishi mumkin. */
  { key: "investor", href: "/investor" },
  { key: "docs", href: "/qollanma" },
  { key: "about", href: "/biz-haqimizda" },
  { key: "pricing", href: "/narxlar" },
];

/* Menyu bandlarining manzili va ikonkasi — matni lug'atda (`landing.nav`), SHU tartibda */
type MenuLinkDef = { href: string; Icon: LucideIcon };
const PRODUCT_LINKS: MenuLinkDef[] = [
  { href: "/mahsulot#imkoniyatlar", Icon: Sparkles },
  { href: "/mahsulot#integratsiya", Icon: Workflow },
  { href: "/mahsulot#savollar", Icon: CircleHelp },
];
/* Muassasa turi → narxlar sahifasi (tariflar aynan shu turlar bo'yicha) */
const TYPE_LINKS: MenuLinkDef[] = [
  { href: "/narxlar", Icon: School },
  { href: "/narxlar", Icon: Building2 },
  { href: "/narxlar", Icon: GraduationCap },
];
const CASE_LINKS: MenuLinkDef[] = [
  { href: "/campus-qoriqlash#himoya", Icon: Crosshair },
  { href: "/campus-qoriqlash#javob", Icon: BellRing },
  { href: "/campus-qoriqlash#samaradorlik", Icon: PiggyBank },
  { href: "/campus-qoriqlash#savollar", Icon: CircleHelp },
];
const PLAIN_ICONS: Partial<Record<TopKey, LucideIcon>> = { investor: TrendingUp, docs: BookOpen, about: Users, pricing: Tag };

/** Mega-menyu bandi: kulrang doiradagi ikonka + sarlavha (+ izoh). Hover'da ko'k */
function MenuLink({ def, title, text, i, onPick }: { def: MenuLinkDef; title: string; text?: string; i: number; onPick: () => void }) {
  const { href, Icon } = def;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 + 0.04 * i, ease: EASE }}>
      <Link
        href={href}
        onClick={onPick}
        className="group flex items-center gap-4 rounded-2xl p-3 transition-[background-color,box-shadow] duration-300 hover:bg-[var(--s-card)] hover:shadow-[0_12px_30px_-18px_rgba(14,21,32,0.35)]"
      >
        <span className="grid h-11 w-11 flex-none place-items-center rounded-full bg-[var(--s-muted)] text-[var(--s-text3)] transition-all duration-300 group-hover:scale-110 group-hover:bg-[var(--s-accent-soft)] group-hover:text-[#2584FF]">
          <Icon size={20} strokeWidth={1.7} />
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-[17px] font-medium leading-snug text-[var(--s-text)] transition-colors duration-300 group-hover:text-[#2584FF]">
            {title}
            <ArrowRight size={15} className="-translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100" />
          </span>
          {text && <span className="mt-1 block text-[15.5px] leading-[1.45] text-[var(--s-text2)]">{text}</span>}
        </span>
      </Link>
    </motion.div>
  );
}

/** Ochiq panel mazmuni: "Mahsulot" — izohli 3 band, "Campus qo'riqlash" — ikki guruh */
function MegaContent({ menu, onPick }: { menu: MenuId; onPick: () => void }) {
  const n = useT().landing.nav;
  if (menu === "product") {
    return (
      <div className="grid grid-cols-3 gap-8">
        {n.productItems.map((it, i) => (
          <MenuLink key={it.title} def={PRODUCT_LINKS[i % PRODUCT_LINKS.length]} title={it.title} text={it.text} i={i} onPick={onPick} />
        ))}
      </div>
    );
  }
  const groups = [
    { title: n.byType, items: n.typeItems, links: TYPE_LINKS },
    { title: n.byCase, items: n.caseItems, links: CASE_LINKS },
  ];
  return (
    <div className="flex flex-col gap-10">
      {groups.map((g, gi) => (
        <div key={g.title}>
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.04 + 0.12 * gi }}
            className="text-[20px] font-medium tracking-[-0.01em] text-[var(--s-text)]"
          >
            {g.title}
          </motion.p>
          <div className="mt-5 grid grid-cols-4 gap-6">
            {g.items.map((label, i) => (
              <MenuLink key={label} def={g.links[i % g.links.length]} title={label} i={i + gi * 3} onPick={onPick} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Mobil menyu bandi */
function MobileLink({ def, label, onPick }: { def: MenuLinkDef; label: string; onPick: () => void }) {
  const { href, Icon } = def;
  return (
    <Link
      href={href}
      onClick={onPick}
      className="group flex items-center gap-3 rounded-2xl px-2 py-2.5 text-[16px] font-medium text-[var(--s-text)] transition-colors hover:bg-[var(--s-muted)] hover:text-[#2584FF]"
    >
      <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-[var(--s-muted)] text-[var(--s-text3)] transition-colors group-hover:text-[#2584FF]">
        <Icon size={17} strokeWidth={1.8} />
      </span>
      {label}
    </Link>
  );
}

/**
 * `overDark` — sahifa qorong'i rasmli hero bilan boshlanadi: navbar shaffof,
 * matni oq. Aks holda (Qo'llanma, Biz haqimizda, Narxlar) darhol oq fon.
 *
 * MEGA-MENYU — ochilganda navbar och fonga o'tadi, ostidagi sahifa yengil
 * qoraytiriladi. Sichqoncha band → panel orasida yurganda menyu
 * "o'chib-yonmasin" deb yopilish 160 ms kechiktiriladi.
 *
 * CHIZIQ — ochiq menyu (bo'lmasa joriy sahifa) tagidagi qalin ko'k chiziq
 * bitta `layoutId` bilan bandlar orasida SURILADI; qolgan bandlarda
 * hover'da chapdan o'ngga ochroq chiziq chiziladi.
 */
export function Nav({ overDark }: { overDark: boolean }) {
  const n = useT().landing.nav;
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false); // mobil menyu
  const [menu, setMenu] = useState<MenuId | null>(null); // mega-menyu
  const closeTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenu(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu]);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  const openMenu = (m: MenuId | null) => {
    window.clearTimeout(closeTimer.current);
    setMenu(m);
  };
  const scheduleClose = () => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setMenu(null), 160);
  };
  const pick = () => {
    setMenu(null);
    setOpen(false);
  };

  const active = TOP.find((t) => pathname === t.href || pathname?.startsWith(`${t.href}/`))?.key ?? null;
  const solid = !overDark || scrolled || open || menu !== null;
  const onDark = !solid;
  const current: TopKey | null = menu ?? active;

  return (
    <>
      {/* Menyu ochiq — ostidagi sahifa yengil qoraytiriladi, bosilsa yopiladi */}
      <AnimatePresence>
        {menu && (
          <motion.div
            key="lp-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={() => setMenu(null)}
            aria-hidden
            className="fixed inset-0 z-40 hidden bg-[rgba(14,21,32,0.35)] backdrop-blur-[2px] lg:block"
          />
        )}
      </AnimatePresence>

      <header
        onMouseEnter={() => window.clearTimeout(closeTimer.current)}
        onMouseLeave={scheduleClose}
        className={`fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow] duration-500 ${
          menu
            ? "bg-[var(--s-mega)] shadow-[0_30px_60px_-30px_rgba(14,21,32,0.45)]"
            : solid
              ? "bg-[var(--s-nav)] shadow-[0_1px_0_rgba(23,24,25,0.08),0_10px_30px_-20px_rgba(14,21,32,0.35)] backdrop-blur-xl"
              : "bg-transparent"
        }`}
      >
        <div className={`${WRAP} flex items-center transition-[height] duration-500 ${scrolled && !menu ? "h-[68px]" : "h-[88px]"}`}>
          <Brand onDark={onDark} />

          <nav className="ml-12 hidden lg:block" aria-label="Campus AI">
            <ul className="flex items-center gap-8">
              {TOP.map((item) => {
                const isCurrent = current === item.key;
                const m = item.menu;
                const cls = `group relative block whitespace-nowrap py-2 text-[16.5px] font-medium tracking-[0.005em] transition-colors duration-300 ${
                  onDark ? "text-[#FFFFFF]" : isCurrent ? "text-[var(--s-text)]" : "text-[var(--s-text-soft)] hover:text-[var(--s-text)]"
                }`;
                const line = isCurrent ? (
                  <motion.span
                    layoutId="lp-nav-line"
                    className={`absolute -bottom-[2px] left-0 right-0 h-[3px] rounded-full ${onDark ? "bg-[#FFFFFF]" : "bg-[#2584FF]"}`}
                    transition={{ type: "spring", stiffness: 500, damping: 38 }}
                  />
                ) : (
                  <span
                    className={`absolute -bottom-[2px] left-0 right-0 h-[3px] origin-left scale-x-0 rounded-full transition-transform duration-300 ease-out group-hover:scale-x-100 ${
                      onDark ? "bg-[rgba(255,255,255,0.7)]" : "bg-[rgba(37,132,255,0.45)]"
                    }`}
                  />
                );
                return (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      aria-haspopup={m ? "true" : undefined}
                      aria-expanded={m ? menu === m : undefined}
                      onMouseEnter={() => openMenu(m ?? null)}
                      onFocus={() => openMenu(m ?? null)}
                      onClick={pick}
                      className={cls}
                    >
                      {n[item.key]}
                      {line}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-4" onMouseEnter={() => openMenu(null)}>
            <div className="hidden sm:block">
              <LangSwitch onDark={onDark} />
            </div>
            <ThemeToggle onDark={onDark} />
            <Link
              href="/panel"
              className={`group relative hidden whitespace-nowrap py-2 text-[16.5px] font-medium transition-colors duration-300 xl:block ${
                onDark ? "text-[#FFFFFF]" : "text-[var(--s-text)] hover:text-[#2584FF]"
              }`}
            >
              {n.login}
              <span className="absolute -bottom-[2px] left-0 right-0 h-[2px] origin-right scale-x-0 rounded-full bg-current transition-transform duration-300 group-hover:origin-left group-hover:scale-x-100" />
            </Link>
            <div className="hidden sm:block">
              <Pill href={TELEGRAM_ORDER_URL} tone={onDark ? "light" : "dark"} small>
                {n.demo}
              </Pill>
            </div>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label={n.menu}
              className={`grid h-10 w-10 place-items-center rounded-full transition-colors duration-300 lg:hidden ${
                onDark ? "text-[#FFFFFF] hover:bg-[rgba(255,255,255,0.14)]" : "text-[var(--s-text)] hover:bg-[var(--s-hover)]"
              }`}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={open ? "x" : "m"}
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  {open ? <X size={22} /> : <Menu size={22} />}
                </motion.span>
              </AnimatePresence>
            </button>
          </div>
        </div>

        {/* Mega-menyu paneli (faqat lg+) */}
        <AnimatePresence>
          {menu && (
            <motion.div
              key="lp-mega"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
              className="hidden overflow-hidden lg:block"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={menu}
                  initial={{ opacity: 0, x: 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -14 }}
                  transition={{ duration: 0.2 }}
                  className={`${WRAP} pb-14 pt-8`}
                >
                  <MegaContent menu={menu} onPick={pick} />
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobil menyu — o'sha bandlar guruh bo'lib */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
              className="overflow-hidden border-t border-[var(--s-line)] lg:hidden"
            >
              <div className={`${WRAP} flex max-h-[calc(100vh-88px)] flex-col gap-5 overflow-y-auto py-5`}>
                {[
                  { title: n.product, items: n.productItems.map((it) => it.title), links: PRODUCT_LINKS },
                  { title: n.campus, items: n.caseItems, links: CASE_LINKS },
                  { title: n.byType, items: n.typeItems, links: TYPE_LINKS },
                ].map((g) => (
                  <div key={g.title}>
                    <p className="px-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--s-text3)]">{g.title}</p>
                    <div className="mt-1.5 grid gap-0.5 sm:grid-cols-2">
                      {g.items.map((label, i) => (
                        <MobileLink key={label} def={g.links[i % g.links.length]} label={label} onPick={pick} />
                      ))}
                    </div>
                  </div>
                ))}
                <div className="grid gap-0.5 border-t border-[var(--s-line)] pt-3 sm:grid-cols-3">
                  {TOP.filter((t) => !t.menu).map((t) => (
                    <MobileLink key={t.key} def={{ href: t.href, Icon: PLAIN_ICONS[t.key] ?? BookOpen }} label={n[t.key]} onPick={pick} />
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-3 px-1">
                  <LangSwitch onDark={false} />
                  <ThemeToggle onDark={false} />
                  <Pill href="/panel" tone="outline" small>{n.login}</Pill>
                  <Pill href={TELEGRAM_ORDER_URL} tone="dark" small>{n.demo}</Pill>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
