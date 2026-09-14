"use client";

import { useId, useMemo, useState } from "react";
import { motion } from "framer-motion";

/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  3D KO'RINISHDAGI HALQA — yorliqlar chiziqcha bilan tashqarida       ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * Nega o'z komponenti: `recharts` `PieChart` tekis halqa chizadi va
 * yorliqlarni faqat yon ro'yxatda ko'rsatadi. Bizga esa:
 *   · **hajm** — pastdagi qalinlik va yumshoq gradient (haqiqiy 3D emas,
 *     lekin ko'zga shunday ko'rinadi va SVG'da arzon);
 *   · **tashqi yorliq** — leader-line bilan, ustidan o'qish oson;
 *   · **hover'da bo'lak KATTALASHADI** va tanlangani markazda yoziladi.
 *
 * ⚠️ Bo'laklar SVG `path` bilan chiziladi, `stroke` bilan emas: `stroke`
 * bilan chizilgan halqada bo'lakni alohida "chiqarib olish" (`explode`)
 * mumkin emas — hammasi bitta aylanada yotadi.
 *
 * ── UCHTA TUZOQ (hammasi 2026-09-05 da tuzatilgan) ────────────────────
 *
 * 1. **BITTA BO'LAK = 100% bo'lsa halqa UMUMAN CHIZILMASDI.** SVG
 *    qoidasi: yoyning boshi va oxiri BIR XIL nuqta bo'lsa, yoy butunlay
 *    tashlab yuboriladi. To'liq aylanada `a0 = 0`, `a1 = 2π` — ikkalasi
 *    ayni nuqta. "Aniq statistika"da bu DOIMIY holat edi: serverda
 *    hozircha faqat yuz hodisalari bor (qurol/chekish — 0), ya'ni
 *    "Hodisa turlari" halqasi bitta bo'lakdan iborat bo'lib, ekranda
 *    hech narsa ko'rinmasdi. Endi to'liq aylana IKKI yoy bilan chiziladi
 *    (`ringPath` boshidagi shart).
 *
 * 2. **HOVER TITRARDI.** Sichqoncha hodisalari ANIMATSIYALANADIGAN
 *    bo'lakning o'zida edi: hover'da bo'lak kattayib (`rIn + 4`) va
 *    markazdan chiqib ketardi, kursor esa uning TAGIDAN chiqib qolardi
 *    → `mouseleave` → bo'lak kichrayadi → yana kursor ustida →
 *    `mouseenter`… Ayniqsa bo'lakning ICHKI chetida cheksiz titrash
 *    bo'lardi. Endi hodisalar ALOHIDA, KO'RINMAS va QIMIRLAMAYDIGAN
 *    "nishon" qatlamida (`hit`), ko'rinadigan bo'lak esa
 *    `pointer-events: none`.
 *
 * 3. **YORLIQ QIRQILARDI** (`…` bilan) va uzunlari viewBox chetidan
 *    chiqib ko'rinmay qolardi. Endi yorliqlar SVG matni emas, **HTML**
 *    qatlami: to'liq matn, kerak bo'lsa ikki qatorga o'raladi va
 *    konteynerdan tashqariga chiqmaydi. Halqa radiusi ham kichraytirildi
 *    — chetlarda yorliq uchun joy qoldi.
 */

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
  /**
   * Chaqiruvchining O'Z kaliti (masalan `DetectionId`).
   *
   * `onSelect` bilan birga ishlatiladi: bo'lak bosilganda chaqiruvchi
   * qaysi kesim ekanini NOM bo'yicha emas, KALIT bo'yicha biladi —
   * nom tarjima qilinadi va til almashsa moslik buzilardi.
   */
  id?: string;
}

const TAU = Math.PI * 2;
/** To'liq aylana deb hisoblanadigan chegara. */
const FULL = TAU - 1e-6;

/** Qutb → dekart. Burchak 12 dan boshlanadi (`-90°`). */
function pt(cx: number, cy: number, r: number, a: number) {
  return [cx + r * Math.cos(a - Math.PI / 2), cy + r * Math.sin(a - Math.PI / 2)] as const;
}

/** Halqa bo'lagi (ring sector) yo'li. */
function ringPath(cx: number, cy: number, rIn: number, rOut: number, a0: number, a1: number) {
  /* ⚠️ TO'LIQ AYLANA — bitta yoy bilan chizib BO'LMAYDI (yuqoridagi
     1-tuzoq). Ikkita yarim yoy bilan chiziladi; ichki aylana TESKARI
     yo'nalishda, shunda `nonzero` to'ldirish qoidasi o'rtada teshik
     qoldiradi. */
  if (a1 - a0 >= FULL) {
    const [ox0, oy0] = pt(cx, cy, rOut, 0);
    const [ox1, oy1] = pt(cx, cy, rOut, Math.PI);
    const [ix0, iy0] = pt(cx, cy, rIn, 0);
    const [ix1, iy1] = pt(cx, cy, rIn, Math.PI);
    return (
      `M${ox0},${oy0} A${rOut},${rOut} 0 1 1 ${ox1},${oy1} A${rOut},${rOut} 0 1 1 ${ox0},${oy0} ` +
      `M${ix0},${iy0} A${rIn},${rIn} 0 1 0 ${ix1},${iy1} A${rIn},${rIn} 0 1 0 ${ix0},${iy0} Z`
    );
  }
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const [x0, y0] = pt(cx, cy, rOut, a0);
  const [x1, y1] = pt(cx, cy, rOut, a1);
  const [x2, y2] = pt(cx, cy, rIn, a1);
  const [x3, y3] = pt(cx, cy, rIn, a0);
  return `M${x0},${y0} A${rOut},${rOut} 0 ${large} 1 ${x1},${y1} L${x2},${y2} A${rIn},${rIn} 0 ${large} 0 ${x3},${y3} Z`;
}

export function Donut3D({
  data,
  total: totalProp,
  caption = "jami",
  size = 380,
  format = (v: number) => String(v),
  labelMinPct = 4,
  onSelect,
}: {
  data: DonutSlice[];
  /** Markazdagi son (berilmasa — yig'indi). */
  total?: number;
  caption?: string;
  size?: number;
  format?: (v: number) => string;
  /**
   * Bo'lak BOSILGANDA (ixtiyoriy).
   *
   * ⚠️ Berilmasa halqa avvalgidek faqat hover bilan ishlaydi — mavjud
   * chaqiruvchilar (Statistika, Muassasa tafsiloti) O'ZGARMAYDI.
   * Nishon qatlami allaqachon `tabIndex`/`role="button"` bilan
   * fokus oladi, ya'ni klaviatura ham darhol ishlaydi (Enter/Bo'shliq).
   */
  /**
   * Yorliq chiziladigan eng kichik ulush (foizda).
   *
   * Default **4%** — mayda bo'laklarning yorliqlari ustma-ust tushib
   * o'qilmay qolardi. **`0`** berilsa HAMMASI yoziladi: bo'lak
   * qanchalik kichik bo'lsa ham nomi ko'rinadi (Dashboard'dagi
   * "Hodisa turlari" shunday — u yerda turlar atigi 4–5 ta va
   * bittasi ulushning 99% ini olishi mumkin).
   */
  labelMinPct?: number;
  onSelect?: (slice: DonutSlice) => void;
}) {
  const uid = useId().replace(/:/g, "");
  const [hover, setHover] = useState<number | null>(null);

  const rows = useMemo(() => data.filter((d) => d.value > 0), [data]);
  const sum = rows.reduce((s, d) => s + d.value, 0);
  const total = totalProp ?? sum;

  /* Geometriya. `DEPTH` — pastki "qalinlik" (3D taassuroti).
     ⚠️ `rOut` ATAYLAB kichik (enning ~1/5 qismi): qolgan joy chetdagi
     YORLIQLARGA kerak. Ilgari halqa kengroq edi va uzun nomlar
     (`Telefonda gaplashish`) chetdan chiqib qirqilardi. */
  const W = size;
  const H = Math.round(size * 0.78);
  const cx = W / 2;
  const cy = H / 2 - 4;
  const rOut = Math.min(W * 0.2, H * 0.33);
  const rIn = rOut * 0.58;
  const DEPTH = Math.max(6, Math.round(rOut * 0.12));
  /** Yorliq chiziqchasining uchi va matn boshlanadigan joy. */
  const LEAD = rOut + 16;

  const slices = useMemo(() => {
    let a = 0;
    return rows.map((d, i) => {
      const span = sum > 0 ? (d.value / sum) * TAU : 0;
      const s = { ...d, i, a0: a, a1: a + span, mid: a + span / 2, pct: sum > 0 ? (d.value / sum) * 100 : 0 };
      a += span;
      return s;
    });
  }, [rows, sum]);

  const active = hover != null ? slices[hover] : null;

  /** Yorliqlar — HTML qatlami uchun (foizda joylashtiriladi). */
  const labels = useMemo(
    () =>
      slices
        /* Mayda bo'lakning yorlig'i chizilmaydi (ustma-ust tushardi),
           lekin hover'da doim ko'rsatiladi. Chegara `labelMinPct` —
           `0` bo'lsa hammasi yoziladi. */
        .filter((s) => s.pct >= labelMinPct || hover === s.i)
        .map((s) => {
          const right = Math.cos(s.mid - Math.PI / 2) >= 0;
          const [bx, by] = pt(cx, cy, LEAD, s.mid);
          const x = right ? Math.min(W - 4, bx + 6) : Math.max(4, bx - 6);
          return { s, right, x, y: by, leftPct: (x / W) * 100, topPct: (by / H) * 100 };
        }),
    [slices, hover, cx, cy, LEAD, W, H, labelMinPct]
  );

  return (
    <div className="relative w-full" style={{ maxWidth: W }}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={caption}>
        <defs>
          {slices.map((s) => (
            <linearGradient key={s.i} id={`${uid}-g${s.i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity={1} />
              <stop offset="100%" stopColor={s.color} stopOpacity={0.72} />
            </linearGradient>
          ))}
        </defs>

        {/* ── 1) QALINLIK: har bo'lakning pastga siljitilgan nusxasi ── */}
        <g opacity={0.55} style={{ pointerEvents: "none" }}>
          {slices.map((s) => {
            const on = hover === s.i;
            return (
              <path
                key={`d-${s.i}`}
                d={ringPath(cx, cy + DEPTH, on ? rIn + 4 : rIn, on ? rOut + 10 : rOut, s.a0, s.a1)}
                fill={s.color}
                style={{ filter: "brightness(0.45)" }}
              />
            );
          })}
        </g>

        {/* ── 2) YUZA ──
               ⚠️ `pointer-events: none` — sichqoncha hodisalari pastdagi
               QIMIRLAMAYDIGAN "nishon" qatlamida (2-tuzoq). */}
        <g style={{ pointerEvents: "none" }}>
          {slices.map((s) => {
            const on = hover === s.i;
            /* Hover'da bo'lak markazdan "chiqadi" — qaysi bo'lak ustida
               turganini aniq ko'rsatadi. */
            const push = on ? 8 : 0;
            const [dx, dy] = [Math.cos(s.mid - Math.PI / 2) * push, Math.sin(s.mid - Math.PI / 2) * push];
            return (
              <motion.path
                key={s.i}
                d={ringPath(cx, cy, on ? rIn + 4 : rIn, on ? rOut + 10 : rOut, s.a0, s.a1)}
                fill={`url(#${uid}-g${s.i})`}
                stroke="rgba(4,7,15,0.65)"
                strokeWidth={1.5}
                animate={{ x: dx, y: dy }}
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
                style={{ filter: on ? `drop-shadow(0 0 10px ${s.color})` : undefined }}
              />
            );
          })}
        </g>

        {/* ── 3) YORLIQ CHIZIQCHALARI (matnning o'zi — HTML qatlamda) ── */}
        <g style={{ pointerEvents: "none" }}>
          {labels.map(({ s, x, y }) => {
            const [ex, ey] = pt(cx, cy, rOut + 4, s.mid);
            const [bx, by] = pt(cx, cy, LEAD, s.mid);
            const on = hover === s.i;
            return (
              <g key={`l-${s.i}`}>
                <path
                  d={`M${ex},${ey} L${bx},${by} L${x},${y}`}
                  fill="none"
                  stroke={on ? s.color : "rgba(148,163,184,0.55)"}
                  strokeWidth={on ? 1.6 : 1}
                />
                <circle cx={ex} cy={ey} r={on ? 3 : 2} fill={s.color} />
              </g>
            );
          })}
        </g>

        {/* ── 4) MARKAZ: jami yoki tanlangan bo'lak ── */}
        <text
          x={cx}
          y={cy - 2}
          textAnchor="middle"
          fontSize={active ? 20 : 22}
          fontWeight={800}
          fill={active ? active.color : "#F1F5F9"}
          fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
          style={{ pointerEvents: "none" }}
        >
          {format(active ? active.value : total)}
        </text>
        <text
          x={cx}
          y={cy + 14}
          textAnchor="middle"
          fontSize={10}
          fill="#64748B"
          style={{ pointerEvents: "none" }}
        >
          {active ? active.label : caption}
        </text>

        {/* ── 5) NISHON QATLAMI — ko'rinmas va QIMIRLAMAYDI ──
               Hover shu yerda ushlanadi: bo'lak kattaygani bilan nishon
               joyida qoladi, ya'ni kursor "tushib qolmaydi" (2-tuzoq).
               Tashqi radius exploded holatni ham qamrab oladi. */}
        <g>
          {slices.map((s) => (
            <path
              key={`h-${s.i}`}
              d={ringPath(cx, cy, Math.max(1, rIn - 4), rOut + 22, s.a0, s.a1)}
              fill="transparent"
              /* ⚠️ **`outline: none` SHART.** Bu qatlam `tabIndex`/`role`
                 bilan fokus oladi, brauzer esa SVG elementiga fokus
                 halqasini uning BOUNDING BOX'i bo'yicha chizadi — bo'lak
                 yoy bo'lsa ham ekranda katta OQ TO'RTBURCHAK paydo
                 bo'lardi (bosilgan zahoti halqa atrofida oq ramka). Klik
                 bilan fokus olinganda bu shunchaki nuqson edi.
                 A11Y BUZILMAYDI: `onFocus` allaqachon `setHover` qiladi,
                 ya'ni klaviatura bilan o'tilganda bo'lak markazdan
                 chiqadi va markazda o'sha bo'lakning soni yoziladi — bu
                 fokus halqasidan ko'ra ANIQROQ ko'rsatkich. */
              style={{ cursor: onSelect ? "pointer" : "default", outline: "none" }}
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
              onMouseEnter={() => setHover(s.i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(s.i)}
              onBlur={() => setHover(null)}
              tabIndex={0}
              role="button"
              aria-label={`${s.label}: ${format(s.value)} (${s.pct.toFixed(1)}%)`}
            />
          ))}
        </g>
      </svg>

      {/* ── YORLIQ MATNLARI — HTML (SVG emas) ──
          ⚠️ Nega HTML: SVG `<text>` o'ralmaydi va viewBox chetida
          QIRQILADI, shuning uchun uzun nomlar `…` bilan kesilardi.
          HTML esa o'raladi va `maxWidth` bilan konteyner ichida qoladi —
          nom TO'LIQ ko'rinadi (3-tuzoq). */}
      <div className="pointer-events-none absolute inset-0">
        {labels.map(({ s, right, leftPct, topPct }) => {
          const on = hover === s.i;
          return (
            <div
              key={`t-${s.i}`}
              className="absolute leading-tight"
              style={{
                left: `${leftPct}%`,
                top: `${topPct}%`,
                transform: right ? "translateY(-50%)" : "translate(-100%,-50%)",
                maxWidth: right ? `${Math.max(12, 98 - leftPct)}%` : `${Math.max(12, leftPct - 2)}%`,
                textAlign: right ? "left" : "right",
                paddingLeft: right ? 4 : 0,
                paddingRight: right ? 0 : 4,
              }}
            >
              <p
                className="text-[10.5px] font-medium"
                style={{ color: on ? s.color : "#CBD5E1", fontWeight: on ? 700 : 500 }}
              >
                {s.label}
              </p>
              <p className="font-mono text-[9.5px]" style={{ color: on ? s.color : "#64748B" }}>
                {s.pct.toFixed(1)}% · {format(s.value)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
