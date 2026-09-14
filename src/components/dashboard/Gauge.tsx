import { useId } from "react";

interface GaugeProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  colorFrom?: string;
  colorTo?: string;
  label?: string;
  suffix?: string;
}

/** Doiraviy gauge — Nexa "Customer Satisfaction" uslubidagi gradient halqa. */
export function Gauge({ value, size = 120, strokeWidth = 12, colorFrom = "#2563eb", colorTo = "#f97316", label, suffix }: GaugeProps) {
  const gradientId = useId();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, value));
  const dash = (pct / 100) * circumference;

  return (
    <div className="relative flex-none" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colorFrom} />
            <stop offset="100%" stopColor={colorTo} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - dash}
          style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <p className="font-mono text-2xl font-bold leading-none text-slate-50">
            {Math.round(value)}
            {suffix}
          </p>
          {label && <p className="mt-1 text-[9px] uppercase tracking-wide text-slate-400">{label}</p>}
        </div>
      </div>
    </div>
  );
}
