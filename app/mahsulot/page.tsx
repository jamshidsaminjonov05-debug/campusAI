import type { Metadata } from "next";
import { ProductPage } from "@/components/site/pages/ProductPage";
import { sitePageMetadata } from "@/i18n/server";

/** Mahsulot — ommaviy sayt sahifasi (login talab qilinmaydi). */
export function generateMetadata(): Metadata {
  return sitePageMetadata("product");
}

export default function Page() {
  return <ProductPage />;
}
