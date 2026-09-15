"use client";

import { motion } from "framer-motion";
import {
  BarChart3, Camera, CheckCircle2, ClipboardList, Cpu, Crosshair, Download, Eye, FileVideo, History, Layers,
  LayoutDashboard, Lock, MapPin, PiggyBank, Send, ShieldCheck, Swords, Users, UserX, Video, Zap, type LucideIcon,
} from "lucide-react";
import { useT } from "@/i18n";
import { SiteShell } from "../Footer";
import { BlueBanner, Bullets, EASE, Faq, FeatureRow, MediaCard, PageHero, Pill, QuoteBlock, SectionTitle, TELEGRAM_ORDER_URL, WRAP, reveal } from "../ui";

const BENEFIT_ICONS: LucideIcon[] = [ShieldCheck, Zap, PiggyBank];
const PROTECT_ICONS: LucideIcon[] = [Swords, Crosshair, UserX, Lock];
const RESP_ICONS: LucideIcon[][] = [
  [Cpu, Send, History],
  [MapPin, Layers, Video],
  [FileVideo, Download, History],
];
const IMPROVE_ICONS: LucideIcon[][] = [
  [Users, ShieldCheck, Eye],
  [Camera, Cpu, Video],
  [ClipboardList, BarChart3, LayoutDashboard],
];

/**
 * AI aniqladi → mas'ul shaxslarga yuborildi — kadr + holat qatori.
 *
 * ⚠️ Ilgari bu yerda OPERATOR TASDIG'I ("Tasdiqlandi / Rad etish") turardi.
 * 2026-09-14 dan landing hodisa oqimini "hammasini AI qiladi, hodisa
 * mas'ul shaxslarga yuboriladi" deb tavsiflaydi (foydalanuvchi so'rovi).
 */
function DetectArt({ detected, sent }: { detected: string; sent: string }) {
  return (
    <div className="group rounded-[40px] border border-[var(--s-line)] bg-[var(--s-muted)] p-5 lg:rounded-[48px] lg:p-7">
      <div className="relative aspect-[16/10] overflow-hidden rounded-[28px]">
        <img src="/imges/incident-scene.webp" alt="" className="h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105" />
        <span className="absolute left-[38%] top-[34%] h-[34%] w-[30%] rounded-xl border-2 border-[#F0454B] shadow-[0_0_0_4px_rgba(240,69,75,0.18)]">
          <span className="absolute inset-0 animate-pulse rounded-xl bg-[rgba(240,69,75,0.12)]" />
        </span>
      </div>
      <div className="mt-5 flex items-center justify-between rounded-2xl bg-[var(--s-card)] px-4 py-3 shadow-[0_10px_30px_-24px_rgba(14,21,32,0.5)]">
        <span className="inline-flex items-center gap-2 text-[14px] font-medium text-[var(--s-text)]">
          <CheckCircle2 size={18} className="text-[#22C55E]" />
          {detected}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#2584FF] px-3 py-1 text-[13px] text-[#FFFFFF]">
          <Send size={13} />
          {sent}
        </span>
      </div>
    </div>
  );
}

/** "Xarajatlarni kamaytiring" kartasi tepasidagi yengil illyustratsiya — 3 ta ikonka plitkasi */
function TileArt({ icons }: { icons: LucideIcon[] }) {
  return (
    <div className="grid h-[190px] grid-cols-3 items-center gap-3 rounded-[28px] bg-[var(--s-muted)] p-6">
      {icons.map((Icon, i) => (
        <motion.span
          key={i}
          animate={{ y: [0, i === 1 ? -8 : -4, 0] }}
          transition={{ duration: 3.5 + i * 0.6, repeat: Infinity, ease: "easeInOut" }}
          className={`grid place-items-center rounded-2xl bg-[var(--s-card)] text-[#2584FF] shadow-[0_12px_30px_-20px_rgba(14,21,32,0.5)] ${i === 1 ? "h-[110px]" : "h-[80px]"}`}
        >
          <Icon size={i === 1 ? 30 : 22} strokeWidth={1.6} />
        </motion.span>
      ))}
    </div>
  );
}

/** /campus-qoriqlash — maketdagi ta'lim muassasalari xavfsizligi sahifasi */
export function CampusPage() {
  const l = useT().landing;
  const c = l.campus;
  return (
    <SiteShell overDark>
      <PageHero img="/imges/cam-scene.webp" title={c.title}>
        <Pill href={TELEGRAM_ORDER_URL} tone="light">{l.nav.demo}</Pill>
        <Pill href="#savollar" tone="ghost">{c.faqBtn}</Pill>
        <Pill href="/narxlar" tone="ghost">{c.pricingBtn}</Pill>
      </PageHero>

      <section className="bg-[var(--s-bg2)] py-[clamp(64px,6vw,90px)]">
        <div className={WRAP}>
          <div className="grid gap-6 md:grid-cols-3">
            {c.benefits.map((b, i) => {
              const Icon = BENEFIT_ICONS[i % BENEFIT_ICONS.length];
              return (
                <motion.div
                  key={b.title}
                  {...reveal}
                  transition={{ ...reveal.transition, delay: 0.1 * i }}
                  whileHover={{ y: -6 }}
                  className="group rounded-[32px] bg-[var(--s-card)] p-9 shadow-[0_20px_50px_-40px_rgba(14,21,32,0.5)]"
                >
                  <Icon size={44} strokeWidth={1.3} className="mx-auto text-[#2584FF] transition-transform duration-500 group-hover:scale-110" />
                  <h3 className="mt-10 text-[26px] font-medium leading-[1.2] tracking-[-0.03em] text-[var(--s-text)]">{b.title}</h3>
                  <p className="mt-3 text-[15px] leading-[1.6] text-[var(--s-text2)]">{b.text}</p>
                </motion.div>
              );
            })}
          </div>

          <div id="himoya" className="grid scroll-mt-24 items-center gap-12 pt-[clamp(56px,6vw,90px)] lg:grid-cols-2 lg:gap-[clamp(48px,7vw,140px)]">
            <motion.div {...reveal}>
              <h3 className="text-[clamp(28px,2.6vw,42px)] font-medium leading-[1.2] tracking-[-0.04em] text-[var(--s-text)]">{c.protectTitle}</h3>
              <ul className="mt-8 flex flex-col gap-5">
                {c.protect.map((it, i) => {
                  const Icon = PROTECT_ICONS[i % PROTECT_ICONS.length];
                  return (
                    <motion.li
                      key={it.lead}
                      initial={{ opacity: 0, x: -16 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, margin: "-60px" }}
                      transition={{ duration: 0.6, delay: 0.08 * i, ease: EASE }}
                      className="group flex items-start gap-4"
                    >
                      <span className="grid h-9 w-9 flex-none place-items-center rounded-xl text-[#2584FF] transition-colors duration-300 group-hover:bg-[#2584FF] group-hover:text-[#FFFFFF]">
                        <Icon size={22} strokeWidth={1.8} />
                      </span>
                      <p className="text-[16.5px] leading-[1.55] text-[var(--s-text)]">
                        <span className="font-semibold">{it.lead}</span>
                        {it.text}
                      </p>
                    </motion.li>
                  );
                })}
              </ul>
            </motion.div>
            <motion.div {...reveal} transition={{ ...reveal.transition, delay: 0.1 }}>
              <MediaCard img="/imges/qurol.webp" aspect="aspect-[5/4]" chip={{ kind: "solid", title: c.protectChip, meta: "Campus AI", pos: "left-8 top-8" }} />
            </motion.div>
          </div>
        </div>
      </section>

      <BlueBanner lead={l.cta.lead} text={l.cta.text} cta={l.cta.button} href={TELEGRAM_ORDER_URL} />

      <section id="javob" className="scroll-mt-20 bg-transparent py-[clamp(64px,6vw,90px)]">
        <div className={WRAP}>
          <SectionTitle title={c.respTitle} />
          <div className="mt-6">
            {c.resp.map((r, i) => (
              <FeatureRow
                key={r.title}
                reverse={i % 2 === 1}
                title={r.title}
                items={r.items}
                icons={RESP_ICONS[i % RESP_ICONS.length]}
                media={
                  i === 0 ? (
                    <DetectArt detected={c.aiDetected} sent={c.sentResponsible} />
                  ) : i === 1 ? (
                    <MediaCard img="/imges/uz-map.webp" chip={{ kind: "alert", title: c.inProgress, meta: "Campus AI", pos: "left-8 top-8" }} />
                  ) : (
                    <MediaCard img="/imges/control-room.webp" />
                  )
                }
              />
            ))}
          </div>
        </div>
      </section>

      <section id="samaradorlik" className="scroll-mt-20 bg-[var(--s-bg2)] py-[clamp(64px,6vw,90px)]">
        <div className={WRAP}>
          <SectionTitle title={c.improveTitle} />
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {c.improve.map((card, i) => {
              const icons = IMPROVE_ICONS[i % IMPROVE_ICONS.length];
              return (
                <motion.div key={card.title} {...reveal} transition={{ ...reveal.transition, delay: 0.1 * i }}>
                  <TileArt icons={icons} />
                  <h3 className="mt-7 text-[24px] font-medium leading-[1.2] tracking-[-0.03em] text-[var(--s-text)]">{card.title}</h3>
                  <Bullets items={card.items} icons={icons} className="mt-5" />
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <QuoteBlock text={l.quote.text} author={l.quote.author} role={l.quote.role} cta={l.quote.cta} href="/mahsulot" />
      <Faq id="savollar" title={l.faq.title} items={l.faq.items} />
    </SiteShell>
  );
}
