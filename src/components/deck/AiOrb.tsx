"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { voiceBus } from "./voiceBus";

/**
 * Gapiruvchi AI — zarrachali sfera. Taqdimotning qahramoni: u hech qachon
 * ekrandan ketmaydi, faqat joyini va o'lchamini o'zgartiradi.
 *
 * Jim turganda kichik, xira va sekin aylanadi. AI gapira boshlagach
 * kengayadi, yorqinlashadi, ichki meridianlar to'lqinlanadi; ovoz
 * cho'qqilarida esa sferadan halqa tarqaladi.
 *
 * `anchor` — CSS selektor. Berilsa orb SHU element ustiga ko'chadi va
 * o'lchamini unga tenglaydi. Nega selektor: joylashuvni foizda yozib
 * qo'yish mo'rt bo'lardi — ekran nisbati o'zgarsa sfera siljib ketardi.
 * Element chegarasi o'lchansa, u har doim kerakli katakka tushadi.
 */

const POINTS = 620;
const RIPPLE_S = 1.15;

/**
 * Sfera radiusi kanvas o'lchamining ulushi sifatida.
 *
 * ⚠️ Bu son kanvasning YARMIDAN ancha kichik bo'lishi shart: sferadan
 * tarqaladigan halqa `R * RIPPLE_MAX` gacha kengayadi, yorug'lik esa
 * undan ham uzoqqa cho'ziladi. Ilgari bu hisobga olinmagan edi va
 * halqa ramkaga tiqilib, kesilib qolardi.
 *   0.26 * 1.85 = 0.48  <  0.5  ✔
 */
const R_RATIO = 0.26;
const RIPPLE_MAX = 1.85;

/** Kanvas anchor katagidan shuncha marta katta — halqaga joy qoladi */
const CANVAS_PAD = 1.45;

type P = { x: number; y: number; z: number; s: number };

/** Fibonachchi sferasi — nuqtalar yuzada teng taqsimlanadi */
function buildSphere(n: number): P[] {
  const out: P[] = [];
  const phi = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const th = phi * i;
    out.push({ x: Math.cos(th) * r, y, z: Math.sin(th) * r, s: 0.55 + Math.random() * 0.9 });
  }
  return out;
}

export default function AiOrb({
  visible = true,
  anchor = null,
}: {
  visible?: boolean;
  anchor?: string | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [box, setBox] = useState<{ left: number; top: number; w: number; h: number } | null>(null);

  /* Anchor elementni kuzatish. ResizeObserver yetarli emas: slayd ochilishida
     kontent siljiydi — O'LCHAM o'zgarmaydi, JOY o'zgaradi. Shuning uchun
     chegara har kadrda o'qiladi; qiymat o'zgarmasa qayta render bo'lmaydi. */
  useLayoutEffect(() => {
    if (!anchor) {
      setBox(null);
      return;
    }
    let raf = 0;
    let prev = "";
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const el = document.querySelector(anchor);
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      const key = `${Math.round(r.left)}|${Math.round(r.top)}|${Math.round(r.width)}|${Math.round(r.height)}`;
      if (key === prev) return;
      prev = key;
      setBox({ left: r.left, top: r.top, w: r.width, h: r.height });
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [anchor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!visible) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const calm = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const pts = buildSphere(POINTS);

    let w = 0;
    let h = 0;
    let raf = 0;
    let flow = 0; // aylanish fazasi — ovoz tezligiga qarab jamlanadi
    let wave = 0; // meridian to'lqini
    let prevT = 0;
    let smooth = 0; // silliqlangan rms
    let ripples: number[] = [];
    let lastRipple = -9;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const t = now / 1000;
      const dt = prevT ? Math.min(0.05, t - prevT) : 0.016;
      prevT = t;

      const lvl = voiceBus.level();
      smooth += (lvl.rms - smooth) * (lvl.rms > smooth ? 0.35 : 0.08);
      if (lvl.peak > 0 && t - lastRipple > 0.32) {
        lastRipple = t;
        ripples.push(t);
      }
      ripples = ripples.filter((r) => t - r < RIPPLE_S);

      flow += dt * (0.18 + smooth * 1.5) * (calm ? 0.3 : 1);
      wave += dt * (1.1 + smooth * 5.5) * (calm ? 0.3 : 1);

      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;
      const base = Math.min(w, h) * R_RATIO;
      const R = base * (1 + smooth * 0.2);

      // ── ichki yorug'lik ──
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 2.1);
      glow.addColorStop(0, `rgba(160,205,255,${0.22 + smooth * 0.4})`);
      glow.addColorStop(0.45, `rgba(120,170,255,${0.07 + smooth * 0.14})`);
      glow.addColorStop(1, "rgba(10,16,32,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 2.1, 0, Math.PI * 2);
      ctx.fill();

      // ── tarqaluvchi halqalar ──
      for (const r of ripples) {
        const k = (t - r) / RIPPLE_S;
        ctx.globalAlpha = (1 - k) * 0.5;
        ctx.strokeStyle = "#85E0FF";
        ctx.lineWidth = 1.4 * (1 - k) + 0.3;
        ctx.beginPath();
        ctx.arc(cx, cy, R * (1 + k * (RIPPLE_MAX - 1)), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // ── zarrachalar ──
      const cosA = Math.cos(flow);
      const sinA = Math.sin(flow);
      const tilt = 0.42;
      const cosB = Math.cos(tilt);
      const sinB = Math.sin(tilt);

      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        // Y o'qi atrofida aylantirish
        let x = p.x * cosA + p.z * sinA;
        let z = -p.x * sinA + p.z * cosA;
        // X o'qi bo'yicha qiyalik
        const y = p.y * cosB - z * sinB;
        z = p.y * sinB + z * cosB;

        /* Meridian to'lqini: ovoz balandligiga qarab yuza "nafas oladi" —
           shu narsa sferani jonli qiladi, oddiy aylanish esa mexanik. */
        const bulge = 1 + Math.sin(wave + p.y * 3.4 + p.x * 1.7) * (0.02 + smooth * 0.13);
        const persp = 1 / (1.9 - z * 0.55);
        const sx = cx + x * R * bulge * persp * 1.55;
        const sy = cy + y * R * bulge * persp * 1.55;

        const depth = (z + 1) / 2; // 0 — orqada, 1 — oldinda
        const a = (0.1 + depth * 0.72) * (0.5 + smooth * 0.6);
        const size = p.s * (0.5 + depth * 1.1) * (1 + smooth * 0.35);

        ctx.globalAlpha = Math.min(1, a);
        ctx.fillStyle = depth > 0.82 ? "#EAF3FF" : depth > 0.45 ? "#9EC4FF" : "#4E7BC4";
        ctx.beginPath();
        ctx.arc(sx, sy, size, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── yadro ──
      ctx.globalAlpha = 1;
      const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.5);
      core.addColorStop(0, `rgba(233,244,255,${0.5 + smooth * 0.5})`);
      core.addColorStop(1, "rgba(120,170,255,0)");
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.5, 0, Math.PI * 2);
      ctx.fill();
    };

    resize();
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [visible]);

  /* Kanvas katakdan KATTAROQ: sfera o'z o'lchamida qoladi, halqa va
     yorug'lik esa chetga chiqib ketmaydi. Markaz katak markazida turadi. */
  const grow = box ? Math.max(box.w, box.h) * CANVAS_PAD : 0;
  const style: React.CSSProperties = box
    ? {
        left: box.left + box.w / 2 - grow / 2,
        top: box.top + box.h / 2 - grow / 2,
        width: grow,
        height: grow,
      }
    : { left: 6, bottom: 6, width: 232, height: 232 };

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      /* z-0 — orb slayd kontenti ORTIDA turadi: burchakda matnga tegib
         qolsa ham to'smaydi, yumshoq yorug'lik bo'lib ko'rinadi. Markazga
         ko'chganda (0 va oxirgi slayd) ustidagi katak bo'sh, shuning uchun
         u baribir to'liq ko'rinadi. */
      className="pointer-events-none fixed z-0 transition-opacity duration-700"
      style={{ ...style, opacity: visible ? 1 : 0 }}
    />
  );
}
