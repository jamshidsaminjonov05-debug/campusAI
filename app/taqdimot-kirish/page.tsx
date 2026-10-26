import type { Metadata } from "next";
import DeckLogin from "@/components/deck/DeckLogin";

/** `/taqdimot-kirish` — taqdimotga kirish: panel bilan AYNI backend logini (`middleware.ts`). */
export const metadata: Metadata = {
  title: "Campus AI — taqdimotga kirish",
  robots: { index: false, follow: false },
};

/** Taqdimotlar kabi doim qorong'i — panel loginining qorong'i ko'rinishi bilan bir xil */
const FORCE_DARK = `document.documentElement.dataset.theme="dark";document.documentElement.dataset.scheme="dark";document.documentElement.classList.add("dark");`;

export default function DeckLoginRoute() {
  /* Yagona taqdimot — investor. Qaytish manzili qat'iy: tashqi manzilga yo'naltirib bo'lmasin */
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: FORCE_DARK }} />
      <DeckLogin next="/investor" />
    </>
  );
}
