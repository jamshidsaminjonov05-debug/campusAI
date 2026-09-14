"use client";

import { useEffect } from "react";

/**
 * "Failed to load module script … MIME type text/html" xatosini yo'q qiladi.
 *
 * SABABI: brauzerdagi ochiq tab eski chunk manzilini so'raydi, serverda esa u
 * yo'q (dev server qayta ishga tushgan yoki yangi versiya deploy qilingan) —
 * Next 404 o'rniga HTML sahifa qaytaradi, brauzer uni skript deb ochib xato
 * beradi. Ilgari buni faqat `Ctrl+Shift+R` tuzatardi.
 *
 * YECHIM: skript/uslub yuklanmaganini ushlab, sahifani BIR MARTA avtomatik
 * yangilaymiz — yangi HTML yangi chunk nomlarini olib keladi. Ishlab
 * chiqarishda ham foydali: deploydan keyin operatorlarning ochiq tablari o'zi
 * tuzaladi, ular hech narsa qilmaydi.
 *
 * TSIKLDAN HIMOYA: `sessionStorage` da oxirgi yangilash vaqti saqlanadi —
 * 15 soniya ichida ikkinchi marta yangilanmaydi. Ya'ni fayl haqiqatan yo'q
 * bo'lsa (buzuq deploy) sahifa cheksiz aylanmaydi, xato oddiy ko'rinadi.
 */
const KEY = "hik-chunk-reload-at";
const COOLDOWN_MS = 15_000;

export function ChunkReloadGuard() {
  useEffect(() => {
    const reloadOnce = (why: string) => {
      try {
        const last = Number(sessionStorage.getItem(KEY) ?? 0);
        if (Date.now() - last < COOLDOWN_MS) return;
        sessionStorage.setItem(KEY, String(Date.now()));
      } catch {
        /* sessionStorage yopiq bo'lsa ham bir marta urinib ko'ramiz */
      }
      console.warn(`[chunk] eskirgan fayl (${why}) — sahifa yangilanmoqda`);
      window.location.reload();
    };

    // Resurs xatolari "bubble" bo'lmaydi — capture bosqichida ushlaymiz
    const onResourceError = (e: Event) => {
      const el = e.target as HTMLElement | null;
      if (!el || el === (window as unknown as HTMLElement)) return;
      const tag = el.tagName;
      // Faqat skript va uslub: rasm/video yiqilsa sahifani yangilash noto'g'ri
      if (tag === "SCRIPT" || tag === "LINK") reloadOnce(tag.toLowerCase());
    };

    // Dinamik `import()` yiqilishi (ChunkLoadError) — promise sifatida keladi
    const onRejection = (e: PromiseRejectionEvent) => {
      const msg = String((e.reason as Error)?.message ?? e.reason ?? "");
      if (/ChunkLoadError|Loading chunk|Failed to (load|fetch) (module script|dynamically imported module)/i.test(msg)) {
        reloadOnce("import");
      }
    };

    window.addEventListener("error", onResourceError, true);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onResourceError, true);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
