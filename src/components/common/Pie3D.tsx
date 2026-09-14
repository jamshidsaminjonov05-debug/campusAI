/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  3D PIE — HAJMLI doira diagramma (halqa EMAS)                        ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * `Donut3D` dan farqi (ikkalasi ham qoladi, ular BOSHQA vazifa uchun):
 *
 * | | `Donut3D` | **`Pie3D`** |
 * |---|---|---|
 * | Shakl | halqa (o'rtasi teshik) | **to'liq doira** |
 * | Proyeksiya | tekis, pastga siljigan soya | **ellips** (qiya qaralgan) |
 * | Qalinlik | bo'lak nusxasi | **yon devor** (front yoylar bo'yicha) |
 * | Foiz | markazda, faqat hover'da | **har bo'lakning ICHIDA** |
 *
 * ── QANDAY QURILADI ───────────────────────────────────────────────────
 * Doira **ellips** bo'lib proyeksiyalanadi (`ry = rx * TILT`), ya'ni
 * ustidan qiya qaralgandek. Har bo'lak uchta qismdan:
 *   1. **tag** — ustki yuzaning `DEPTH` px pastga siljigan, qoraytirilgan
 *      nusxasi;
 *   2. **yon devor** — FAQAT oldingi yarim doiraga (`sin(a) > 0`) tushgan
 *      yoy uchun: orqadagi devor ustki yuza ostida qolib ko'rinmaydi;
 *   3. **ustki yuza** — bo'lakning o'zi, vertikal gradient bilan.
 *
 * ⚠️ **CHIZISH TARTIBI MUHIM.** Avval HAMMA tag, keyin HAMMA yon devor
 * (oldingilari KEYIN — `sin(mid)` bo'yicha saralanadi), oxirida ustki
 * yuzalar. Aks holda oldingi bo'lakning devori orqadagi bo'lak ustiga
 * chiqib, diagramma "teshik" bo'lib ko'rinardi.
 *
 * ⚠️ **BITTA BO'LAK = 100%** bo'lsa SVG yoyi umuman chizilmaydi (yoyning
 * boshi va oxiri bir nuqta). Shu holat uchun to'liq ellips alohida
 * chiziladi — `Donut3D` dagi bilan AYNI tuzoq.
 */
"use client";

import { useId, useMemo, useState } from "react";
import { motion } from "framer-motion";

export interface PieSlice {
  label: string;
  value: number;
  color: string;
  /** Chaqiruvchining O'Z kaliti (tarjima qilinadigan NOMga tayanmaslik uchun). */
  id?: string;
}

/** Ellips "yassiligi" — 1 bo'lsa tekis doira, 0.5 qiya qaralgan. */
const TILT = 0.56;
const TAU = Math.PI * 2;
/** To'liq aylana deb hisoblanadigan chegara (suzuvchi nuqta xatosi uchun). */
const FULL = TAU - 1e-6;

/** Rangni qoraytirish — yon devor va tag uchun. */
function shade(hex: string, k: number): string {
  const m = /^#?([\da-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

export function Pie3D({
  data,
  size = 320,
  depth,
  onSelect,
  /** Ajratib ko'rsatiladigan bo'lak (`id`). Qolganlari so'niq bo'ladi. */
  highlight = null,
  /** Foiz yozuvi chiziladigan eng kichik ulush. */
  labelMinPct = 3,
}: {
  data: PieSlice[];
  size?: number;
  depth?: number;
  onSelect?: (slice: PieSlice) => void;
  highlight?: string | null;
  labelMinPct?: number;
}) {
  const uid = useId().replace(/:/g, "");
  const [hover, setHover] = useState<number | null>(null);

  const rows = useMemo(() => data.filter((d) => d.value > 0), [data]);
  const sum = rows.reduce((s, d) => s + d.value, 0);

  const W = size;
  const rx = W * 0.36;
  const ry = rx * TILT;
  const DEPTH = depth ?? Math.max(14, Math.round(rx * 0.22));
  /* Balandlik: ellips + qalinlik + yorliqlarga joy. */
  const H = Math.round(ry * 2 + DEPTH + 44);
  const cx = W / 2;
  const cy = ry + 22;

  const pt = (r: number, a: number, ox = 0, oy = 0) => [cx + ox + rx * r * Math.cos(a), cy + oy + ry * r * Math.sin(a)];

  const slices = useMemo(() => {
    let a = -Math.PI / 2; // 12 soatdan boshlanadi
    return rows.map((d, i) => {
      const span = sum > 0 ? (d.value / sum) * TAU : 0;
      const s = { ...d, i, a0: a, a1: a + span, mid: a + span / 2, pct: sum > 0 ? (d.value / sum) * 100 : 0 };
      a += span;
      return s;
    });
  }, [rows, sum]);

  /** Bo'lakning ustki yuzasi (`ox`/`oy` — "chiqarilgan" holat siljishi). */
  /** `r` — radius koeffitsienti (nishon qatlami uchun 1 dan katta). */
  const topPath = (a0: number, a1: number, ox: number, oy: number, r = 1) => {
    const RX = rx * r;
    const RY = ry * r;
    if (a1 - a0 >= FULL) {
      /* To'liq doira — yoy bilan chizib bo'lmaydi (bosh va oxir bir nuqta). */
      const [lx, ly] = pt(r, Math.PI, ox, oy);
      const [rxp, ryp] = pt(r, 0, ox, oy);
      return `M ${lx} ${ly} A ${RX} ${RY} 0 1 1 ${rxp} ${ryp} A ${RX} ${RY} 0 1 1 ${lx} ${ly} Z`;
    }
    const [x0, y0] = pt(r, a0, ox, oy);
    const [x1, y1] = pt(r, a1, ox, oy);
    const large = a1 - a0 > Math.PI ? 1 : 0;
    return `M ${cx + ox} ${cy + oy} L ${x0} ${y0} A ${RX} ${RY} 0 ${large} 1 ${x1} ${y1} Z`;
  };

  /**
   * Yon devor — bo'lakning OLDINGI yarim doiraga tushgan qismi.
   *
   * Ekran koordinatasida `y` pastga o'sadi, ya'ni old tomon
   * `sin(a) > 0` (0 … π). Bo'lak shu oraliq bilan kesishmasa devor
   * umuman chizilmaydi.
   */
  const sidePath = (a0: number, a1: number, ox: number, oy: number) => {
    /* Burchaklarni [-π/2, 3π/2) ga keltirib, [0, π] bilan kesishtiramiz. */
    const segs: [number, number][] = [];
    const push = (s: number, e: number) => {
      const ss = Math.max(s, 0);
      const ee = Math.min(e, Math.PI);
      if (ee > ss) segs.push([ss, ee]);
    };
    /* Bo'lak bir necha marta aylanishi mumkin emas, lekin -π/2 dan
       boshlangani uchun ikki oraliqqa bo'linishi mumkin. */
    push(a0, a1);
    push(a0 + TAU, a1 + TAU);
    push(a0 - TAU, a1 - TAU);
    if (segs.length === 0) return null;

    return segs
      .map(([s, e]) => {
        const [x0, y0] = pt(1, s, ox, oy);
        const [x1, y1] = pt(1, e, ox, oy);
        const large = e - s > Math.PI ? 1 : 0;
        return (
          `M ${x0} ${y0} A ${rx} ${ry} 0 ${large} 1 ${x1} ${y1} ` +
          `L ${x1} ${y1 + DEPTH} A ${rx} ${ry} 0 ${large} 0 ${x0} ${y0 + DEPTH} Z`
        );
      })
      .join(" ");
  };

  /** "Chiqarilgan" bo'lak siljishi — hover yoki ajratilgan. */
  const offsetOf = (s: (typeof slices)[number]) => {
    const on = hover === s.i || (highlight != null && s.id === highlight);
    if (!on) return [0, 0] as const;
    const k = rx * 0.1;
    return [Math.cos(s.mid) * k, Math.sin(s.mid) * k * TILT] as const;
  };

  /** So'niq holat — ajratilgan bo'lak bo'lsa qolganlari xiralashadi. */
  const dimOf = (s: (typeof slices)[number]) => (highlight != null && s.id !== highlight ? 0.22 : 1);

  /* Yon devorlar OLDINGILARI KEYIN chizilishi kerak (yuqoridagi izoh). */
  const wallOrder = useMemo(() => [...slices].sort((a, b) => Math.sin(a.mid) - Math.sin(b.mid)), [slices]);

  if (slices.length === 0) return null;

  return (
    <div className="relative w-full" style={{ maxWidth: W }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ overflow: "visible" }}>
        <defs>
          {/* ⚠️ Gradient UCH to'xtashli va biroz burchakli (`x1/x2`):
              ikki to'xtashli tik gradient tekis ko'rinardi. Yuqori chapdan
              yorug' → o'rtada asosiy rang → pastda biroz to'q, ya'ni
              bo'lak "yotgan disk" bo'lib ko'rinadi. */}
          {slices.map((s) => (
            <linearGradient key={`g-${s.i}`} id={`${uid}-g${s.i}`} x1="0.15" y1="0" x2="0.85" y2="1">
              <stop offset="0%" stopColor={shade(s.color, 1.28)} />
              <stop offset="45%" stopColor={shade(s.color, 1.06)} />
              <stop offset="100%" stopColor={shade(s.color, 0.88)} />
            </linearGradient>
          ))}
        </defs>

        {/* 1) TAG — ustki yuzaning pastga siljigan qoraytirilgan nusxasi */}
        <g>
          {slices.map((s) => {
            const [ox, oy] = offsetOf(s);
            return (
              <path
                key={`b-${s.i}`}
                d={topPath(s.a0, s.a1, ox, oy + DEPTH)}
                fill={shade(s.color, 0.55)}
                opacity={dimOf(s)}
              />
            );
          })}
        </g>

        {/* 2) YON DEVORLAR — oldingilari keyin */}
        <g>
          {wallOrder.map((s) => {
            const [ox, oy] = offsetOf(s);
            const d = sidePath(s.a0, s.a1, ox, oy);
            if (!d) return null;
            return <path key={`w-${s.i}`} d={d} fill={shade(s.color, 0.62)} opacity={dimOf(s)} />;
          })}
        </g>

        {/* 3) USTKI YUZALAR + foiz yozuvi */}
        <g>
          {slices.map((s) => {
            const [ox, oy] = offsetOf(s);
            const [lx, ly] = pt(0.62, s.mid, ox, oy);
            return (
              <motion.g
                key={`t-${s.i}`}
                animate={{ opacity: dimOf(s) }}
                transition={{ duration: 0.2 }}
                /* ⚠️ **KO'RINADIGAN qatlam hodisa QABUL QILMAYDI** —
                   hammasi pastdagi qimirlamaydigan "nishon" qatlamida
                   (`hover titrashi` izohiga qarang). */
                style={{ pointerEvents: "none" }}
              >
                <path
                  d={topPath(s.a0, s.a1, ox, oy)}
                  fill={`url(#${uid}-g${s.i})`}
                  stroke="rgba(3,6,14,0.55)"
                  strokeWidth={1}
                />
                {/* Foiz — bo'lakning ICHIDA (mayda bo'lakda chizilmaydi:
                    yozuv bo'lakdan chiqib ketardi). */}
                {s.pct >= labelMinPct && (
                  <text
                    x={lx}
                    y={ly}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="pointer-events-none select-none"
                    style={{
                      fontSize: Math.max(10, rx * 0.13),
                      fontWeight: 800,
                      fill: "#0B1220",
                      paintOrder: "stroke",
                      stroke: "rgba(255,255,255,0.55)",
                      strokeWidth: 2.5,
                    }}
                  >
                    {s.pct >= 10 ? Math.round(s.pct) : s.pct.toFixed(1)}%
                  </text>
                )}
              </motion.g>
            );
          })}
        </g>
        {/* ── NISHON QATLAMI — ko'rinmas va QIMIRLAMAYDI ──
            🔴 **HOVER TITRARDI** (foydalanuvchi xabar qildi): sichqoncha
            hodisalari ANIMATSIYALANADIGAN bo'lakning O'ZIDA edi —
            hover'da bo'lak markazdan chiqardi, kursor uning tagidan
            chiqib qolardi → `mouseleave` → qaytadi → `mouseenter`…
            Bo'lak chetida cheksiz titrash bo'lardi (`Donut3D` da ham
            AYNI xato bo'lgan va shu yo'l bilan tuzatilgan).

            Yechim: nishon `r = 1.18` radiusda (chiqarilgan holatni ham
            qamraydi) va SILJIMAYDI, ya'ni kursor ostidagi shakl
            o'zgarmaydi. */}
        <g>
          {slices.map((s) => (
            <path
              key={`h-${s.i}`}
              d={topPath(s.a0, s.a1, 0, 0, 1.18)}
              fill="transparent"
              /* ⚠️ `outline:none` — SVG elementga fokus halqasi BOUNDING
                 BOX bo'yicha chiziladi, ya'ni yoy atrofida katta oq
                 to'rtburchak paydo bo'lardi. A11Y buzilmaydi: `onFocus`
                 bo'lakni ajratib ko'rsatadi. */
              style={{ cursor: onSelect ? "pointer" : "default", outline: "none" }}
              onMouseEnter={() => setHover(s.i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(s.i)}
              onBlur={() => setHover(null)}
              onClick={onSelect ? () => onSelect(s) : undefined}
              onKeyDown={
                onSelect
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelect(s);
                      }
                    }
                  : undefined
              }
              tabIndex={onSelect ? 0 : undefined}
              role={onSelect ? "button" : undefined}
              aria-label={`${s.label}: ${s.value} (${s.pct.toFixed(1)}%)`}
            />
          ))}
        </g>
      </svg>

      {/* ── YORLIQLAR — HTML (SVG `<text>` o'ralmaydi va qirqiladi) ── */}
      <ul className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1">
        {slices.map((s) => (
          <li key={`l-${s.i}`}>
            <button
              type="button"
              disabled={!onSelect}
              onClick={onSelect ? () => onSelect(s) : undefined}
              onMouseEnter={() => setHover(s.i)}
              onMouseLeave={() => setHover(null)}
              className="flex items-center gap-1.5 rounded px-1 py-0.5 text-[10.5px] transition-colors
                         hover:bg-white/[0.06] disabled:cursor-default"
              style={{ opacity: dimOf(s) }}
            >
              <span className="h-2 w-2 flex-none rounded-sm" style={{ background: s.color }} />
              <span className="text-slate-300">{s.label}</span>
              <b className="font-mono text-slate-100">{s.value}</b>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
