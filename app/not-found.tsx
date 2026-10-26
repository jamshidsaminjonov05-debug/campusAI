"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { House, SquaresFour } from "@phosphor-icons/react";
import { useT } from "@/i18n";
import { suggestRoute } from "@/lib/routeSuggest";
import { EmptyState } from "@/components/common/EmptyState";

/**
 * MAVJUD BO'LMAGAN MANZIL (2026-10-26, foydalanuvchi: "`/panelcha` kabi
 * xato yozilsa ham to'g'rilab qo'yish kerak, eng qulay usul bilan").
 *
 * 1. Manzil ma'lum sahifaga o'xshasa (`suggestRoute` — `/panelcha` → `/panel`,
 *    `/kamerlar` → `/panel#kameralar`) — DARHOL o'sha yerga, 404 ko'rinmaydi.
 *    `location.replace` — tarixda xato manzil qolmaydi ("orqaga" unga qaytmaydi),
 *    hash bilan ham to'g'ri ishlaydi (panel bo'limni hashdan o'qiydi).
 * 2. O'xshamasa — markazda katta "topilmadi" holati, ikkita tugma va
 *    5 soniyadan keyin bosh sahifaga avtomatik o'tish.
 */
const AUTO_HOME_SEC = 5;

export default function NotFound() {
  const t = useT().notFound;
  const [path, setPath] = useState("");
  const [target, setTarget] = useState<string | null | undefined>(undefined);
  const [left, setLeft] = useState(AUTO_HOME_SEC);

  useEffect(() => {
    const p = window.location.pathname;
    setPath(p);
    const to = suggestRoute(p);
    setTarget(to);
    if (to) window.location.replace(to + (to.includes("#") ? "" : window.location.hash));
  }, []);

  /* Mos sahifa topilmasa — sanoq, keyin bosh sahifa */
  useEffect(() => {
    if (target !== null) return;
    if (left <= 0) {
      window.location.replace("/");
      return;
    }
    const id = window.setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => window.clearTimeout(id);
  }, [target, left]);

  return (
    <main className="grid min-h-screen place-items-center bg-[#060A14] px-4 text-white">
      {target !== null ? (
        /* Taxmin qilinmoqda yoki yo'naltirilmoqda — qisqa holat, sakrash yo'q */
        <p className="flex items-center gap-2.5 text-[14px] text-slate-300">
          <span className="h-5 w-5 rounded-full border-2 border-cyan-400/30 border-t-cyan-300 motion-safe:animate-spin" />
          {t.redirecting}
        </p>
      ) : (
        <div className="flex flex-col items-center gap-5">
          <EmptyState size={180} title={<span className="text-[20px]">{t.title}</span>} hint={t.desc(path)} />
          <div className="flex flex-wrap justify-center gap-2.5">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 text-[13px] font-semibold text-[#04111d] transition-colors hover:bg-cyan-400"
            >
              <House size={16} weight="bold" />
              {t.home}
            </Link>
            <Link
              href="/panel"
              className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2.5 text-[13px] font-semibold text-slate-200 transition-colors hover:bg-white/[0.08]"
            >
              <SquaresFour size={16} weight="bold" />
              {t.panel}
            </Link>
          </div>
          <p className="font-mono text-[11px] text-slate-500">{t.autoHome(left)}</p>
        </div>
      )}
    </main>
  );
}
