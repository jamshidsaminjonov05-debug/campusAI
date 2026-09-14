"use client";

import { motion } from "framer-motion";
import { Building2, GraduationCap, School, type LucideIcon } from "lucide-react";
import { useT } from "@/i18n";
import { SiteShell } from "../Footer";
import { EASE, Pill, QuoteBlock, TELEGRAM_ORDER_URL, WRAP, reveal } from "../ui";

const PLAN_ICONS: LucideIcon[] = [School, Building2, GraduationCap];

/*
 * TODO: tarif narxlarini kiriting (masalan "150 000 so'm"), SHU tartibda:
 * Maktablar, Texnikum va kollejlar, Oliy ta'lim. `null` bo'lsa kartada
 * "Kelishiladi" chiqadi — narx o'ylab topilmaydi (maketdagi dollar
 * narxlari boshqa kompaniyaniki edi).
 */
const PLAN_PRICES: (string | null)[] = [null, null, null];

/** /narxlar */
export function PricingPage() {
  const l = useT().landing;
  const p = l.pricing;
  return (
    <SiteShell overDark={false}>
      <section className="bg-[var(--s-bg2)] pb-[clamp(64px,6vw,90px)] pt-[clamp(140px,13vw,180px)]">
        <div className={WRAP}>
          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE }}
            className="text-center text-[clamp(40px,4.6vw,72px)] font-light tracking-[-0.05em] text-[var(--s-text)]"
          >
            {p.title}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.12, ease: EASE }}
            className="mt-4 text-center text-[17px] text-[var(--s-text)]"
          >
            {p.sub}
          </motion.p>

          <div className="mx-auto mt-16 grid max-w-[1180px] gap-6 md:grid-cols-3">
            {p.plans.map((plan, i) => {
              const Icon = PLAN_ICONS[i % PLAN_ICONS.length];
              const price = PLAN_PRICES[i] ?? null;
              return (
                <motion.div
                  key={plan.title}
                  initial={{ opacity: 0, y: 26 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 + 0.1 * i, ease: EASE }}
                  whileHover={{ y: -8 }}
                  className="group flex flex-col items-center rounded-[40px] border border-transparent bg-[var(--s-card)] px-8 py-12 text-center transition-[border-color,box-shadow] duration-300 hover:border-[rgba(37,132,255,0.35)] hover:shadow-[0_30px_60px_-40px_rgba(37,132,255,0.7)]"
                >
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--s-accent-soft)] text-[#2584FF] transition-transform duration-500 group-hover:scale-110">
                    <Icon size={22} strokeWidth={1.8} />
                  </span>
                  <h2 className="mt-6 text-[clamp(26px,2.2vw,34px)] font-medium tracking-[-0.03em] text-[var(--s-text)]">{plan.title}</h2>
                  <p className="mt-3 text-[13px] font-medium uppercase tracking-[0.06em] text-[var(--s-text2)]">{plan.for}</p>
                  {price ? (
                    <>
                      <p className="mt-8 text-[13px] text-[var(--s-text2)]">{p.from}</p>
                      <p className="text-[clamp(36px,3vw,48px)] font-medium tracking-[-0.03em] text-[#2584FF]">{price}</p>
                    </>
                  ) : (
                    <p className="mt-8 text-[clamp(30px,2.6vw,40px)] font-light tracking-[-0.03em] text-[#2584FF]">{p.onRequest}</p>
                  )}
                  <p className="mt-2 text-[13.5px] text-[var(--s-text2)]">{p.perCamera}</p>
                </motion.div>
              );
            })}
          </div>

          <motion.div {...reveal} className="mt-14 flex flex-col items-center gap-6">
            <p className="text-[15px] text-[var(--s-text)]">{p.note}</p>
            <Pill href={TELEGRAM_ORDER_URL} tone="dark">{p.cta}</Pill>
          </motion.div>
        </div>
      </section>

      <QuoteBlock text={l.quote.text} author={l.quote.author} role={l.quote.role} cta={l.quote.cta} href="/mahsulot" />
    </SiteShell>
  );
}
