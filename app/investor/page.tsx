import type { Metadata } from "next";
import InvestorPage from "@/components/investor/InvestorPage";

/**
 * `/investor` — Campus AI investor taqdimoti.
 *
 * To'liq ekranli, klaviaturadan boshqariladigan sahna (taqdimot pulti ham
 * ishlaydi). Login talab qilmaydi: uni uchrashuvda, mehmon kompyuterida
 * ochish mumkin bo'lishi kerak.
 *
 * ⚠️ Saytning menyusida ATAYLAB ko'rsatilmaydi va indekslanmaydi: bu
 * hujjat moliyaviy prognoz va so'rov summasini o'z ichiga oladi, ya'ni
 * havola bo'yicha tarqatiladigan material.
 */
export const metadata: Metadata = {
  title: "Campus AI — investorlar uchun",
  description: "Ta'lim muassasalari xavfsizligi bozori: hajm, raqobat, birlik iqtisodiyoti va investitsiya taklifi.",
  robots: { index: false, follow: false },
};

/**
 * Mavzuni HYDRATSIYAGACHA qorong'iga o'tkazadi.
 *
 * Ildiz `layout.tsx` mavzuni cookie'dan o'qiydi va u YORUG' bo'lishi
 * mumkin. `Deck` uni baribir qorong'iga majburlaydi, lekin bu faqat JS
 * yuklangach bo'ladi — oradagi bir lahzada oq ekran chaqnab ketardi.
 */
const FORCE_DARK = `document.documentElement.dataset.theme="dark";document.documentElement.dataset.scheme="dark";document.documentElement.classList.add("dark");`;

export default function InvestorRoute() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: FORCE_DARK }} />
      <InvestorPage />
    </>
  );
}
