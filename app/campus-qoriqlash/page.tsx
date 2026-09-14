import type { Metadata } from "next";
import { CampusPage } from "@/components/site/pages/CampusPage";
import { sitePageMetadata } from "@/i18n/server";

/** Campus qo'riqlash — ommaviy sayt sahifasi (login talab qilinmaydi). */
export function generateMetadata(): Metadata {
  return sitePageMetadata("campus");
}

export default function Page() {
  return <CampusPage />;
}
