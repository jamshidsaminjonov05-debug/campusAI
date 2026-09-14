"use client";

import { motion } from "framer-motion";
import {
  BarChart3, BellRing, Camera, CheckCircle2, Clock, Crosshair, Eye, Fingerprint, Layers, Lock, MapPin, ScanFace,
  Server, ThumbsUp, UserCheck, type LucideIcon,
} from "lucide-react";
import { useT } from "@/i18n";
import { SiteShell } from "../Footer";
import { BlueBanner, Faq, FeatureRow, MediaCard, PageHero, Pill, SectionTitle, TELEGRAM_ORDER_URL, WRAP, reveal, type ChipKind } from "../ui";

/* "Asosiy imkoniyatlar" qatorlari — matni lug'atda (`landing.product.caps`), SHU tartibda */
const CAP_MEDIA: { img: string; icons: LucideIcon[]; chip: ChipKind; pos?: string }[] = [
  { img: "/imges/incident-scene.webp", icons: [Crosshair, UserCheck, Layers], chip: "alert", pos: "left-8 top-8" },
  { img: "/imges/uz-map.webp", icons: [MapPin, Camera, BellRing], chip: "solid" },
  { img: "/imges/ai-face.webp", icons: [Lock, Fingerprint, CheckCircle2], chip: "ok", pos: "left-8 top-8" },
];
const TECH_MEDIA: { img: string; icons: LucideIcon[] }[] = [
  { img: "/imges/cam-scene.webp", icons: [ScanFace, Layers, Eye] },
  { img: "/imges/control-room.webp", icons: [Clock, BarChart3, Camera] },
];
const INTEG_ICONS: LucideIcon[] = [Camera, Server];

/** /mahsulot — maketdagi "service" sahifasi */
export function ProductPage() {
  const l = useT().landing;
  const p = l.product;
  return (
    <SiteShell overDark>
      <PageHero img="/imges/control-room.webp" title={p.title}>
        <Pill href={TELEGRAM_ORDER_URL} tone="light">{l.nav.demo}</Pill>
      </PageHero>

      <section id="imkoniyatlar" className="scroll-mt-20 bg-transparent pb-10 pt-[clamp(64px,6vw,90px)]">
        <div className={WRAP}>
          <SectionTitle title={p.capsTitle} />
          <div className="mt-6">
            {p.caps.map((c, i) => {
              const m = CAP_MEDIA[i % CAP_MEDIA.length];
              return (
                <FeatureRow
                  key={c.title}
                  reverse={i % 2 === 1}
                  title={c.title}
                  items={c.items}
                  icons={m.icons}
                  media={<MediaCard img={m.img} chip={{ kind: m.chip, title: c.chip, meta: c.chipMeta, pos: m.pos }} />}
                />
              );
            })}
          </div>
        </div>
      </section>

      <BlueBanner lead={l.cta.lead} text={l.cta.text} cta={l.cta.button} href={TELEGRAM_ORDER_URL} />

      <section className="bg-[var(--s-bg2)] py-[clamp(64px,6vw,90px)]">
        <div className={WRAP}>
          <SectionTitle title={p.allTitle} />
          <div className="mx-auto mt-12 grid max-w-[1100px] gap-x-10 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            {p.all.map((it, i) => (
              <motion.div
                key={it}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: 0.04 * i }}
                className="group flex items-start gap-3 text-[16px] leading-[1.5] text-[var(--s-text)]"
              >
                <ThumbsUp size={19} strokeWidth={1.8} className="mt-0.5 flex-none text-[#2584FF] transition-transform duration-300 group-hover:-rotate-12 group-hover:scale-110" />
                {it}
              </motion.div>
            ))}
          </div>

          <div id="integratsiya" className="scroll-mt-24 pt-[clamp(64px,7vw,110px)]">
            <SectionTitle title={p.integTitle} />
            <div className="mx-auto mt-12 grid max-w-[900px] gap-6 md:grid-cols-2">
              {p.integ.map((c, i) => {
                const Icon = INTEG_ICONS[i % INTEG_ICONS.length];
                return (
                  <motion.div
                    key={c.title}
                    {...reveal}
                    transition={{ ...reveal.transition, delay: 0.1 * i }}
                    whileHover={{ y: -6 }}
                    className="rounded-[32px] bg-[var(--s-card)] p-9 shadow-[0_20px_50px_-40px_rgba(14,21,32,0.5)]"
                  >
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--s-accent-soft)] text-[#2584FF]">
                      <Icon size={22} strokeWidth={1.8} />
                    </span>
                    <h3 className="mt-6 text-[28px] font-medium tracking-[-0.03em] text-[var(--s-text)]">{c.title}</h3>
                    <p className="mt-3 text-[15.5px] leading-[1.6] text-[var(--s-text2)]">{c.text}</p>
                    <p className="mt-6 flex items-center gap-2 text-[15px] font-medium text-[var(--s-text)]">
                      <CheckCircle2 size={18} className="text-[#2584FF]" />
                      {c.note}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-transparent py-[clamp(64px,6vw,90px)]">
        <div className={WRAP}>
          <SectionTitle title={p.techTitle} sub={p.techSub} />
          <div className="mt-6">
            {p.tech.map((c, i) => {
              const m = TECH_MEDIA[i % TECH_MEDIA.length];
              return (
                <FeatureRow key={c.title} reverse={i % 2 === 1} title={c.title} items={c.items} icons={m.icons} media={<MediaCard img={m.img} />} />
              );
            })}
          </div>
        </div>
      </section>

      <Faq id="savollar" title={l.faq.title} items={l.faq.items} />
    </SiteShell>
  );
}
