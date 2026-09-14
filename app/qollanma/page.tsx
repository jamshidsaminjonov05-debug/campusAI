import type { Metadata } from "next";
import { DocsPage } from "@/components/site/pages/DocsPage";
import { sitePageMetadata } from "@/i18n/server";

/** Qo'llanma — ommaviy sayt sahifasi (login talab qilinmaydi). */
export function generateMetadata(): Metadata {
  return sitePageMetadata("docs");
}

export default function Page() {
  return <DocsPage />;
}
