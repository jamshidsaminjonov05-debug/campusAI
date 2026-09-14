import type { TooltipProps } from "recharts";

/**
 * Diagrammalar uchun YAGONA tooltip.
 *
 * Nega o'z komponentimiz kerak (recharts'ning standarti o'rniga):
 *  - **Joyi buzilardi.** Halqa diagramma konteyneri atigi 86×86 px; standart
 *    tooltip shu ichida chizilib, diagramma ustiga tushib qolardi. Bu yerda
 *    `allowEscapeViewBox` bilan birga ishlatiladi — oyna konteynerdan
 *    tashqariga chiqadi.
 *  - **O'qish qiyin edi.** Fon deyarli qora, matn kulrang. Endi ochroq fon,
 *    oq matn va kattaroq shrift.
 *  - **Rang ko'rinmasdi.** Endi chapda AYNAN o'sha bo'lakning rangi turadi,
 *    ya'ni qaysi segment tanlanganini darrov bilasiz.
 */
export function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-ice/35 bg-[#16203A]/98 px-3 py-2 shadow-[0_10px_30px_-8px_rgba(0,0,0,0.85)] backdrop-blur-sm">
      {label != null && label !== "" && (
        <p className="mb-1 text-[11px] font-semibold text-slate-200">{label}</p>
      )}
      <ul className="space-y-0.5">
        {payload.map((p, i) => {
          /* Pie'da rang `payload.fill` da, Bar/Line'da esa `color` da keladi —
             ikkalasini ham tekshiramiz, aks holda swatch bo'sh qolardi. */
          const color =
            (p.payload as { fill?: string; color?: string } | undefined)?.fill ?? p.color ?? "#85E0FF";
          const name = p.name ?? (p.payload as { label?: string } | undefined)?.label ?? "";
          return (
            <li key={`${name}-${i}`} className="flex items-center gap-2 text-[12px] whitespace-nowrap">
              <span className="h-2.5 w-2.5 flex-none rounded-sm" style={{ background: color }} />
              <span className="text-slate-300">{name}</span>
              <b className="ml-auto pl-3 font-mono font-bold text-white">{p.value}</b>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Har bir `<Tooltip>` ga tarqatiladigan proplar.
 *
 * `allowEscapeViewBox` — SHART: kichik konteynerlarda (halqa diagramma)
 * tooltip qirqilib, diagrammaning ustiga chiqib ketardi.
 */
export const chartTooltipProps = {
  content: <ChartTooltip />,
  allowEscapeViewBox: { x: true, y: true } as const,
  wrapperStyle: { zIndex: 60, outline: "none" },
  cursor: { fill: "rgba(133,224,255,0.10)" },
} as const;
