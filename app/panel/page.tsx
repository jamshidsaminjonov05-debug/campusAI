"use client";

import dynamic from "next/dynamic";

/**
 * Boshqaruv paneli — mavjud SPA (zustand activePage routing) o'zgarishsiz
 * shu yerda yashaydi. MapLibre va localStorage faqat brauzerda ishlagani
 * uchun SSR o'chirilgan.
 */
const AppRoot = dynamic(() => import("@/AppRoot"), {
  ssr: false,
  loading: () => (
    <div className="grid h-screen place-items-center bg-ink text-slate-100">
      <div className="flex flex-col items-center gap-3">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500/40 border-t-blue-500" />
        <p className="text-[12px] text-slate-400">Panel yuklanmoqda...</p>
      </div>
    </div>
  ),
});

export default function PanelPage() {
  return <AppRoot />;
}
