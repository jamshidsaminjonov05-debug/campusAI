"use client";

import { useEffect, useRef } from "react";

/**
 * Taqdimotning umumiy foni — barcha slaydlarda bir xil, shuning uchun
 * slayd almashganda fon "sakramaydi".
 *
 * To'rt qatlam:
 *   1) kosmik radial gradient        — CSS
 *   2) blueprint setkasi (72 px)     — CSS, ilova qobig'i bilan bir xil qadam
 *   3) yulduz changi                 — kanvas
 *   4) chetlardagi ikkilik yomg'iri  — kanvas (markaz toza qoladi)
 *
 * Ranglar `tailwind.config.ts` dagi `ice` palitrasidan olingan.
 */

type Star = { x: number; y: number; r: number; drift: number; seed: number; color: string };
type Column = { x: number; y0: number; speed: number; count: number; gap: number; alpha: number; seed: number };

const DIGITS = ["0", "1"];

export default function ShowBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const calm = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    let w = 0;
    let h = 0;
    let raf = 0;
    let stars: Star[] = [];
    let columns: Column[] = [];
    const t0 = performance.now();

    const build = () => {
      const n = Math.round((w * h) / 12000);
      stars = Array.from({ length: n }, () => {
        const r = Math.random();
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          r: 0.5 + Math.random() * 1.15,
          drift: -(3 + Math.random() * 8),
          seed: Math.random() * Math.PI * 2,
          color: r < 0.72 ? "#D6E6FF" : r < 0.94 ? "#8FB8FF" : "#85E0FF",
        };
      });

      /* Yomg'ir FAQAT chetlarda: markazdagi matn ustiga tushsa o'qilishi
         qiyinlashadi. Chap va o'ng chegaradan 22% kenglikda ustun ekamiz. */
      const band = Math.max(90, w * 0.22);
      const step = 26;
      const cols: Column[] = [];
      for (let x = 6; x < band; x += step) cols.push(makeColumn(x));
      for (let x = w - band; x < w - 6; x += step) cols.push(makeColumn(x));
      columns = cols;
    };

    const makeColumn = (x: number): Column => ({
      x,
      y0: -Math.random() * h,
      speed: 22 + Math.random() * 46,
      count: 12 + Math.round(Math.random() * 16),
      gap: 15 + Math.random() * 5,
      alpha: 0.05 + Math.random() * 0.11,
      seed: Math.random() * 1000,
    });

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const t = (now - t0) / 1000;
      ctx.clearRect(0, 0, w, h);

      // ── yulduz changi ──
      for (const s of stars) {
        const y = calm ? s.y : (((s.y + s.drift * t) % h) + h) % h;
        const tw = 0.45 + 0.55 * Math.sin(t * 1.6 + s.seed);
        ctx.globalAlpha = 0.18 + tw * 0.5;
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── ikkilik yomg'iri ──
      ctx.font = "500 13px 'IBM Plex Mono', monospace";
      ctx.textBaseline = "top";
      for (const c of columns) {
        const head = calm ? h * 0.4 : ((c.y0 + c.speed * t) % (h + c.count * c.gap)) - c.count * c.gap;
        for (let i = 0; i < c.count; i++) {
          const y = head - i * c.gap;
          if (y < -20 || y > h) continue;
          const fade = 1 - i / c.count;
          ctx.globalAlpha = c.alpha * fade * (i === 0 ? 3.2 : 1);
          ctx.fillStyle = i === 0 ? "#C9DAFF" : "#8FB8FF";
          const d = DIGITS[Math.floor(Math.abs(Math.sin(c.seed + i * 1.7 + Math.floor(t * 3)) * 2)) % 2];
          ctx.fillText(d, c.x, y);
        }
      }
      ctx.globalAlpha = 1;
    };

    resize();
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* 1 — kosmik gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 15%, #16203a 0%, #0c1122 42%, #070910 100%)",
        }}
      />
      {/* 2 — blueprint setkasi */}
      <div
        className="absolute inset-0 opacity-[0.55]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(142,183,255,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(142,183,255,0.055) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage: "radial-gradient(85% 75% at 50% 45%, #000 30%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(85% 75% at 50% 45%, #000 30%, transparent 100%)",
        }}
      />
      {/* 3+4 — kanvas qatlami */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      {/* vinyetka — chetlar qoraytiriladi, diqqat markazda qoladi */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(100% 80% at 50% 50%, transparent 45%, rgba(5,7,13,0.75) 100%)" }}
      />
    </div>
  );
}
