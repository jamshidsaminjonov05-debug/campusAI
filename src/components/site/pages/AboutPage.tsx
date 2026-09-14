"use client";

import { motion } from "framer-motion";
import { BadgeCheck, Lock, Users, Zap, type LucideIcon } from "lucide-react";
import { useI18n, type Lang } from "@/i18n";
import { SiteShell } from "../Footer";
import { EASE, Pill, SectionTitle, TELEGRAM_ORDER_URL, WRAP, reveal } from "../ui";

/* Tamoyillar ikonkasi va rangi — matni lug'atda (`landing.about.principles`), SHU tartibda */
const PRINCIPLE_STYLE: { Icon: LucideIcon; color: string }[] = [
  { Icon: Users, color: "#7C5CFF" },
  { Icon: Zap, color: "#F0454B" },
  { Icon: BadgeCheck, color: "#F59E0B" },
  { Icon: Lock, color: "#22C55E" },
];

/*
 * TODO: jamoa a'zolarini qo'shing. Bo'sh bo'lsa bo'lim CHIZILMAYDI —
 * ism, lavozim va rasm o'ylab topilmaydi (maketdagi "Our Leadership"
 * boshqa kompaniyaning haqiqiy odamlari edi). `photo` — `public/` dagi yo'l.
 */
type TeamMember = { name: string; role: Record<Lang, string>; photo?: string };
const TEAM: TeamMember[] = [];

/** /biz-haqimizda */
export function AboutPage() {
  const { t, lang } = useI18n();
  const a = t.landing.about;
  return (
    <SiteShell overDark={false}>
      <header className="bg-transparent pb-[clamp(56px,6vw,90px)] pt-[clamp(140px,14vw,190px)]">
        <div className={WRAP}>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} className="text-[15px] font-medium text-[var(--s-text2)]">
            {a.kicker}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.1, ease: EASE }}
            className="mt-3 max-w-[1150px] text-[clamp(34px,4vw,66px)] font-light leading-[1.12] tracking-[-0.045em] text-[var(--s-text)]"
          >
            {a.title}
          </motion.h1>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3, ease: EASE }} className="mt-9">
            <Pill href={TELEGRAM_ORDER_URL} tone="dark">{t.landing.nav.demo}</Pill>
          </motion.div>
        </div>
      </header>

      <section className="bg-[var(--s-bg2)] py-[clamp(56px,6vw,90px)]">
        <div className={`${WRAP} grid gap-6 lg:grid-cols-2`}>
          <motion.div {...reveal} className="rounded-[36px] bg-[var(--s-card)] p-10 lg:p-12">
            <p className="text-[15px] font-medium text-[var(--s-text2)]">{a.storyKicker}</p>
            <h2 className="mt-2 text-[clamp(28px,2.4vw,38px)] font-medium tracking-[-0.04em] text-[var(--s-text)]">{a.storyTitle}</h2>
          </motion.div>
          <motion.div {...reveal} transition={{ ...reveal.transition, delay: 0.1 }} className="rounded-[36px] bg-[var(--s-card)] p-10 lg:p-12">
            <p className="text-[18px] font-semibold leading-[1.55] text-[var(--s-text)]">{a.storyLead}</p>
            {a.storyText.map((p) => (
              <p key={p} className="mt-4 text-[15.5px] leading-[1.65] text-[var(--s-text2)]">
                {p}
              </p>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="bg-transparent py-[clamp(64px,6vw,90px)]">
        <div className={WRAP}>
          <SectionTitle title={a.principlesTitle} />
          <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {a.principles.map((pr, i) => {
              const { Icon, color } = PRINCIPLE_STYLE[i % PRINCIPLE_STYLE.length];
              return (
                <motion.div key={pr.title} {...reveal} transition={{ ...reveal.transition, delay: 0.08 * i }} className="group">
                  <span className="grid h-16 w-16 place-items-center transition-transform duration-500 group-hover:-translate-y-1 group-hover:scale-110" style={{ color }}>
                    <Icon size={44} strokeWidth={1.3} />
                  </span>
                  <h3 className="mt-6 text-[26px] font-medium leading-[1.2] tracking-[-0.03em] text-[var(--s-text)]">{pr.title}</h3>
                  <p className="mt-3 text-[15px] leading-[1.6] text-[var(--s-text2)]">{pr.text}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {TEAM.length > 0 && (
        <section className="bg-[var(--s-bg2)] py-[clamp(64px,6vw,90px)]">
          <div className={WRAP}>
            <SectionTitle title={a.teamTitle} />
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {TEAM.map((m) => (
                <motion.div key={m.name} {...reveal} className="rounded-[32px] bg-[var(--s-card)] p-9 text-center">
                  <div className="mx-auto h-24 w-24 overflow-hidden rounded-full bg-[var(--s-muted)]">
                    {m.photo && <img src={m.photo} alt={m.name} className="h-full w-full object-cover" />}
                  </div>
                  <h3 className="mt-6 text-[24px] font-medium text-[var(--s-text)]">{m.name}</h3>
                  <p className="mt-1 text-[14px] text-[var(--s-text2)]">{m.role[lang]}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="bg-[var(--s-bg2)] py-[clamp(56px,5vw,80px)]">
        <motion.div {...reveal} className={`${WRAP} text-center`}>
          <h2 className="text-[clamp(26px,2.4vw,38px)] font-medium tracking-[-0.04em] text-[var(--s-text)]">{a.partnerTitle}</h2>
          <p className="mx-auto mt-3 max-w-[560px] text-[16px] text-[var(--s-text2)]">{a.partnerText}</p>
          <div className="mt-7">
            <Pill href="#boglanish" tone="dark">{a.partnerCta}</Pill>
          </div>
        </motion.div>
      </section>

      <section className="bg-transparent py-[clamp(64px,6vw,100px)]">
        <div className={WRAP}>
          <motion.div {...reveal}>
            <p className="text-[15px] font-medium text-[var(--s-text2)]">{a.timelineKicker}</p>
            <h2 className="mt-1 text-[clamp(30px,3vw,48px)] font-medium tracking-[-0.05em] text-[var(--s-text)]">{a.timelineTitle}</h2>
          </motion.div>
          <div className="mt-12">
            {a.timeline.map((row, i) => (
              <motion.div
                key={row.when}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.7, delay: 0.05 * i, ease: EASE }}
                className="group grid items-center gap-4 border-t border-[var(--s-line)] py-9 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-16"
              >
                <p className="text-[clamp(34px,4vw,64px)] font-semibold tracking-[-0.04em] text-[var(--s-text)] transition-colors duration-300 group-hover:text-[#2584FF] md:pl-[12%]">
                  {row.when}
                </p>
                <p className="max-w-[440px] text-[16px] leading-[1.6] text-[var(--s-text2)]">{row.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
