import type { Metadata } from "next";
import { AboutPage } from "@/components/site/pages/AboutPage";
import { sitePageMetadata } from "@/i18n/server";

/** Biz haqimizda — ommaviy sayt sahifasi (login talab qilinmaydi). */
export function generateMetadata(): Metadata {
  return sitePageMetadata("about");
}

export default function Page() {
  return <AboutPage />;
}
