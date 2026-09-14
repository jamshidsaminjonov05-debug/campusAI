import { useT } from "@/i18n";

/**
 * Ma'lumot manbai yorlig'i — **JONLI** (haqiqiy oqim) yoki **MA'LUMOT
 * YO'Q** (manba javob bermayapti).
 *
 * ⚠️ Ilgari ikkinchi holat "DEMO" deb atalardi: backend bo'sh bo'lsa
 * panellar mock'ka tushib 645 000 talaba ko'rsatardi va bu yorliq shuni
 * belgilardi. **Mock butunlay olib tashlandi** (2026-09-05) — endi
 * manba yo'q joyda son umuman chizilmaydi, shuning uchun yorliq ham
 * QIZIL "ma'lumot yo'q" bo'ldi (`components/common/Missing.tsx` bilan
 * bir xil til).
 */
export function DataBadge({ live }: { live: boolean }) {
  const t = useT();
  return (
    <span
      title={live ? t.ai.liveHint : t.missing.hint}
      className={`cursor-help rounded-full px-2 py-0.5 text-[9px] font-bold ${
        live ? "bg-emerald-500/15 text-emerald-300" : "border border-white/10 text-slate-500"
      }`}
    >
      {live ? t.ai.live : t.missing.label}
    </span>
  );
}
