"use client";

import { useEffect } from "react";

/** Next.js route-segment xato ekrani — /panel yoki / render'ida xato bo'lsa. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[route error]", error);
  }, [error]);

  return (
    <div className="grid min-h-screen place-items-center bg-ink p-6 text-slate-100">
      <div className="max-w-md rounded-2xl border border-rose-500/25 bg-white/[0.04] p-6 text-center backdrop-blur-xl">
        <p className="mb-1 text-[16px] font-bold">Xatolik yuz berdi</p>
        <p className="mb-4 text-[12.5px] leading-relaxed text-slate-400">
          Sahifani ko'rsatishda muammo bo'ldi. Iltimos, qayta urinib ko'ring yoki sahifani yangilang.
        </p>
        <button
          onClick={reset}
          className="mx-auto rounded-xl bg-gradient-to-b from-[#C4D7FF] to-[#7FA6F2] px-5 py-2.5 text-[13px] font-bold text-[#0A0F1E]"
        >
          Qayta urinib ko'rish
        </button>
      </div>
    </div>
  );
}
