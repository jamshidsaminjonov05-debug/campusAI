import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Sector } from "recharts";

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

/**
 * Halqa diagramma — bo'lak ustiga borilganda O'SHA BO'LAK KATTALASHADI.
 *
 * NEGA tooltip YO'Q: kichik konteynerda (86×86 px) recharts tooltip qutisi
 * diagrammaning ustiga tushib, uni bekitib qo'yardi va to'rtburchak oq dog'
 * bo'lib ko'rinardi. Bo'lakning o'zini kattalashtirish ancha tiniq: hech
 * narsa bekilmaydi va qaysi segment tanlangani darrov ko'rinadi.
 *
 * Qiymat/nom baribir yonidagi ro'yxatda (legend) turadi, shuning uchun
 * matnli oyna umuman kerak emas.
 */
export function ActiveDonut({
  data,
  innerRadius = 26,
  outerRadius = 40,
  /** Tanlanganda shuncha piksel kattalashadi. */
  grow = 5,
  /** Markazda ko'rinadigan blok (jami son va h.k.). */
  center,
  /** Bo'lakka bosilganda — o'sha kesim bo'yicha batafsil ochish uchun. */
  onSliceClick,
}: {
  data: DonutSlice[];
  innerRadius?: number;
  outerRadius?: number;
  grow?: number;
  center?: React.ReactNode;
  onSliceClick?: (slice: DonutSlice) => void;
}) {
  const [active, setActive] = useState<number | undefined>(undefined);

  return (
    <div className="relative h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
            stroke="none"
            activeIndex={active}
            /* `activeShape` — o'sha bo'lakni kattaroq radius bilan qayta
               chizadi. Ichki radius ham biroz kichrayadi, shunda bo'lak
               ikkala tomonga "shishadi" va tanlangani aniq bilinadi. */
            activeShape={(props: any) => (
              <Sector
                {...props}
                innerRadius={Math.max(0, props.innerRadius - grow * 0.4)}
                outerRadius={props.outerRadius + grow}
              />
            )}
            onMouseEnter={(_, i) => setActive(i)}
            onMouseLeave={() => setActive(undefined)}
            onClick={(_, i) => onSliceClick?.(data[i])}
            isAnimationActive={false}
          >
            {data.map((s) => (
              <Cell
                key={s.label}
                fill={s.color}
                style={{ cursor: onSliceClick ? "pointer" : "default", outline: "none" }}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      {center && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">{center}</div>
      )}
    </div>
  );
}
