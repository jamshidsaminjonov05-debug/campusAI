import type { Metadata } from "next";
import { PricingPage } from "@/components/site/pages/PricingPage";
import { sitePageMetadata } from "@/i18n/server";

/** Narxlar — ommaviy sayt sahifasi (login talab qilinmaydi). */
export function generateMetadata(): Metadata {
  return sitePageMetadata("pricing");
}

export default function Page() {
  return <PricingPage />;
}
