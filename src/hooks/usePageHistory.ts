"use client";

import { useEffect, useRef } from "react";
import { resetModalLayers } from "@/lib/modalHistory";
import { pageFromUrl, savePage, writePageToUrl } from "@/lib/pageRoute";
import { useAppStore } from "@/store/useAppStore";

/**
 * Bo'lim almashuvini BRAUZER TARIXI bilan bog'laydi.
 *
 * `App.tsx` da BIR MARTA chaqiriladi. Uchta ish qiladi:
 *   1. ochilishda manzilni joriy bo'limga moslaydi (yangi yozuvsiz);
 *   2. **◀ / ▶** bosilganda (`popstate`) bo'limni URL'dan tiklaydi;
 *   3. bo'lim almashsa tarixga bitta yozuv qo'shadi va uni eslab qoladi.
 *
 * ⚠️ **HALQAGA TUSHIB QOLMASLIK.** Uchinchi qadam `activePage` ga
 * qaraydi, ikkinchisi esa aynan o'sha qiymatni o'zgartiradi — himoyasiz
 * qoldirilsa "orqaga" bosilishi darhol YANGI yozuv qo'shib, foydalanuvchi
 * tarixdan chiqolmay qolardi. Shuning uchun `fromPop` bayrog'i: `popstate`
 * dan kelgan o'zgarish tarixga QAYTA yozilmaydi.
 *
 * ⚠️ Sidebar, global qidiruv, ovozli buyruq va kartochkalar — hammasi
 * `setActivePage()` orqali o'tadi, ya'ni ular uchun alohida kod kerak
 * emas: bu hook YAGONA joyda ushlaydi.
 */
export function usePageHistory(): void {
  const activePage = useAppStore((s) => s.activePage);
  const setActivePage = useAppStore((s) => s.setActivePage);

  /** Oxirgi marta tarixga yozilgan bo'lim. */
  const written = useRef<string | null>(null);
  /** Joriy o'zgarish "orqaga/oldinga" dan keldimi. */
  const fromPop = useRef(false);

  /* 1) Ochilish — manzil joriy bo'limni ko'rsatsin.
        `replace`: yangi yozuv qo'shilmaydi, aks holda panelga kirishning
        o'zi tarixda ikkita yozuv qoldirardi va "orqaga" bir marta
        bekorga bosilardi. */
  useEffect(() => {
    const page = useAppStore.getState().activePage;
    writePageToUrl(page, true);
    savePage(page);
    written.current = page;
  }, []);

  /* 2) Brauzerning ◀ / ▶ tugmalari */
  useEffect(() => {
    const onPop = () => {
      const page = pageFromUrl();
      if (!page || page === useAppStore.getState().activePage) return;
      fromPop.current = true;
      written.current = page;
      setActivePage(page);
      savePage(page);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [setActivePage]);

  /* 3) Bo'lim almashdi — tarixga bitta yozuv */
  useEffect(() => {
    if (fromPop.current) {
      fromPop.current = false;
      return;
    }
    if (written.current === activePage) return;
    written.current = activePage;
    /* Ochiq oynalar yangi bo'limda baribir unmount bo'ladi — ularning
       tarix yozuvlariga qaytishning ma'nosi yo'q (`modalHistory`). */
    resetModalLayers();
    writePageToUrl(activePage);
    savePage(activePage);
  }, [activePage]);
}
