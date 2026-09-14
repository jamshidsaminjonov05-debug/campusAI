"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUp, Phone, Send } from "lucide-react";
import { useT } from "@/i18n";
import { SpaceBackground } from "@/components/common/SpaceBackground";
import { BlueBanner, Brand, TELEGRAM_ORDER_URL, WRAP } from "./ui";
import { Nav } from "./Nav";

/**
 * Aloqa — HAQIQIY ma'lumot (2026-09-14, foydalanuvchi bergan).
 *
 * ⚠️ **E-POCHTA ATAYLAB YO'Q** — foydalanuvchi so'rovi bilan olib
 * tashlandi (ilgari `info@example.uz` degan NAMUNA turardi, ya'ni
 * ishlamaydigan manzil). Buyurtma va savollar Telegram yoki telefon
 * orqali keladi. Pochta paydo bo'lsa — shu ro'yxatga bitta yozuv.
 */
const CONTACTS = [
  { Icon: Phone, value: "+998 91 153-57-05", href: "tel:+998911535705" },
  { Icon: Send, value: "@Jsaminjonov", href: TELEGRAM_ORDER_URL },
];

/* Footer ustunlaridagi havolalar — matni lug'atda (`footer.cols[i].links`), SHU tartibda */
const FOOTER_HREFS = [
  ["/mahsulot", "/campus-qoriqlash", "/qollanma"],
  ["/biz-haqimizda", "/narxlar", "/panel"],
];

/** Sayt footeri — `#boglanish` langari shu yerda (har sahifada bor) */
export function Footer() {
  const f = useT().landing.footer;
  return (
    <footer id="boglanish" className="scroll-mt-16 bg-[var(--s-footer)] text-[#FFFFFF]">
      <div className={`${WRAP} grid gap-14 pb-16 pt-[clamp(64px,6vw,108px)] lg:grid-cols-[1.1fr_1.6fr]`}>
        <div>
          <Brand onDark />
          <p className="mt-6 max-w-[420px] text-[16px] leading-[1.7] text-[rgba(255,255,255,0.8)]">{f.tagline}</p>
        </div>

        <div className="grid gap-10 sm:grid-cols-3">
          {f.cols.map((col, ci) => (
            <div key={col.title}>
              <h5 className="text-[16px] font-semibold">{col.title}</h5>
              <ul className="mt-4 flex flex-col gap-3">
                {col.links.map((label, li) => (
                  <li key={label}>
                    <Link
                      href={FOOTER_HREFS[ci]?.[li] ?? "/"}
                      className="group inline-flex items-center text-[15.5px] text-[rgba(255,255,255,0.85)] transition-colors duration-300 hover:text-[#5AA2FF]"
                    >
                      <span className="mr-0 h-[1.5px] w-0 bg-[#5AA2FF] transition-all duration-300 group-hover:mr-2 group-hover:w-3" />
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h5 className="text-[16px] font-semibold">{f.contactTitle}</h5>
            <ul className="mt-4 flex flex-col gap-3">
              {CONTACTS.map(({ Icon, value, href }) => (
                <li key={href}>
                  <a
                    href={href}
                    className="group inline-flex items-center gap-2.5 text-[15.5px] text-[rgba(255,255,255,0.85)] transition-colors duration-300 hover:text-[#5AA2FF]"
                  >
                    <Icon size={16} className="transition-transform duration-300 group-hover:scale-110" />
                    {value}
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[13px] text-[#B5B5B5]">{f.hours}</p>
          </div>
        </div>
      </div>

      <div className={`${WRAP} flex flex-col items-start justify-between gap-4 border-t border-[rgba(255,255,255,0.1)] py-8 sm:flex-row sm:items-center`}>
        <p className="flex flex-wrap gap-x-10 gap-y-2 text-[15px] text-[#B5B5B5]">
          <span>{f.rights}</span>
          <span>{f.offline}</span>
        </p>
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label={f.top}
          title={f.top}
          className="grid h-12 w-12 place-items-center rounded-full bg-[#2584FF] text-[#FFFFFF] transition-transform duration-300 hover:-translate-y-1"
        >
          <ArrowUp size={20} />
        </button>
      </div>
    </footer>
  );
}

/**
 * Sayt qobig'i: navbar + sahifa + "Qanday ishlashini ko'ring" lentasi + footer.
 * `overDark` — sahifa qorong'i rasmli hero bilan boshlanadimi (navbar rangi).
 */
export function SiteShell({ overDark, cta = true, children }: { overDark: boolean; cta?: boolean; children: ReactNode }) {
  const l = useT().landing;
  return (
    <div className="site relative isolate min-h-screen bg-[var(--s-bg)] font-sans text-[var(--s-text)] antialiased">
      {/* Yulduzlar + setka — panel bilan AYNI fon. `fixed -z-10`, lekin `isolate`
          ildiz ichida qoladi; oq bo'limlar shaffof, shuning uchun ko'rinadi. */}
      <SpaceBackground />
      <Nav overDark={overDark} />
      {children}
      {cta && <BlueBanner lead={l.cta.lead} text={l.cta.text} cta={l.cta.button} href={TELEGRAM_ORDER_URL} />}
      <Footer />
    </div>
  );
}
