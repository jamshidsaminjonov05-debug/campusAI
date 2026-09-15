import type { Metadata } from "next";
import PresentationPage from "@/components/presentation/PresentationPage";

/**
 * `/taqdimot` — Campus AI taqdimot shousi.
 *
 * To'liq ekranli, klaviaturadan boshqariladigan sahna (taqdimot pulti ham
 * ishlaydi). Login talab qilmaydi: uni zalda, mehmon kompyuterida ham
 * ochish mumkin bo'lishi kerak.
 */
export const metadata: Metadata = {
  title: "Campus AI — taqdimot",
  description: "Ta'lim muassasalari xavfsizligi sun'iy intellekt nazoratida: imkoniyatlar, nazorat va maxfiylik.",
};

/**
 * Mavzuni HYDRATSIYAGACHA qorong'iga o'tkazadi.
 *
 * Ildiz `layout.tsx` mavzuni cookie'dan o'qiydi va u YORUG' bo'lishi mumkin.
 * `PresentationPage` uni baribir qorong'iga majburlaydi, lekin bu faqat
 * JS yuklangach bo'ladi — oradagi bir lahzada zalda oq ekran chaqnab
 * ketardi. Shu qator brauzer HTML'ni o'qish jarayonida bajariladi.
 */
const FORCE_DARK = `document.documentElement.dataset.theme="dark";document.documentElement.dataset.scheme="dark";document.documentElement.classList.add("dark");`;

export default function TaqdimotRoute() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: FORCE_DARK }} />
      <PresentationPage />
    </>
  );
}
