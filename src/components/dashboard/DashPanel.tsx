import type { ReactNode } from "react";
import { StatPanel } from "@/components/common/panels";

interface DashPanelProps {
  title: string;
  /** Sarlavha yonidagi lotincha izoh — Figma dizaynidagi ikki tilli sarlavha. */
  subtitle?: string;
  delay?: number;
  className?: string;
  /** Xarita ustida suzuvchi panellar uchun `"geo-strip-card"` (CLAUDE.md
   *  qoidasi: default `hik-glass-blue` juda shaffof — ostidagi xarita
   *  ustidan matn o'qilmay qoladi). Berilmasa `StatPanel`ning o'zi. */
  surface?: string;
  children: ReactNode;
}

/**
 * Dashboard paneli — endi `common/panels.tsx` dagi `StatPanel` ning O'ZI.
 *
 * ⚠️ Ilgari bu alohida "katta ekran" ramkasi edi (`.dv-panel`: burchak
 * qavslari + cyan sarlavha lentasi). Ilova bo'ylab bitta dizayn tizimi
 * bo'lishi uchun u Statistika bo'limining panel ramkasiga almashtirildi.
 * `.dv-panel` CSS'i `src/index.css` da TURIBDI — `KpiStrip` va boshqa
 * joylardan olib tashlangan bo'lsa ham, qaytarish oson.
 *
 
 * RecentEntriesPanel, EmotionPanel — hammasi shu bitta o'zgarish bilan yangi
 * ko'rinishga o'tadi.
 */
export function DashPanel({ title, subtitle, delay = 0, className = "", surface, children }: DashPanelProps) {
  return (
    <StatPanel
      title={title}
      hint={subtitle}
      delay={delay}
      className={className}
      bodyClass="overflow-hidden"
      {...(surface ? { surface } : null)}
    >
      {children}
    </StatPanel>
  );
}

/** Halqa diagramma — markazida umumiy son, atrofida segmentlar. */
export function DonutChart({
  segments,
  size = 96,
  total,
  caption,
  centerText,
  format,
}: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
  total?: number;
  caption?: string;
  /** Markazdagi matnni butunlay almashtiradi (masalan `"74%"`). */
  centerText?: string;
  /** Ro'yxatdagi qiymat ko'rinishi — foiz/ulush qo'shish uchun. */
  format?: (value: number) => string;
}) {
  const sum = segments.reduce((a, s) => a + s.value, 0);
  const stroke = size * 0.13;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-none" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
          {sum > 0 &&
            segments.map((s) => {
              const len = (s.value / sum) * circ;
              const el = (
                <circle
                  key={s.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={stroke}
                  strokeDasharray={`${len} ${circ - len}`}
                  strokeDashoffset={-offset}
                  style={{ transition: "stroke-dasharray 0.7s ease-out, stroke-dashoffset 0.7s ease-out" }}
                />
              );
              offset += len;
              return el;
            })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="stat-num text-base leading-none text-white">{centerText ?? total ?? sum}</p>
            {caption && <p className="mt-0.5 text-[8.5px] text-slate-400">{caption}</p>}
          </div>
        </div>
      </div>
      <ul className="min-w-0 flex-1 space-y-1">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-1.5 text-[10.5px]">
            <span className="h-2 w-2 flex-none rounded-sm" style={{ background: s.color }} />
            <span className="min-w-0 flex-1 truncate text-slate-400">{s.label}</span>
            <b className="stat-num text-slate-100">{format ? format(s.value) : s.value}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}
