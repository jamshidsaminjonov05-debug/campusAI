import { memo, useEffect, useRef } from "react";
import { useScheme } from "@/theme";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";

// SVG feTurbulence — statik noise teksturasi (tarmoqsiz, data-uri)
const NOISE_URI =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E\")";

/** `#rrggbb` → `"r,g,b"` (CSS `rgba()` uchun tayyor). */
function hexToRgb(hex: string): string | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
  const n = parseInt(h, 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

/**
 * Canvas ranglari — sxemaga qarab.
 *
 * ⚠️ Yorug' rejimda yulduzlar OQ bo'lsa umuman ko'rinmaydi, shuning uchun
 * rang mavzu URG'USIDAN olinadi va TO'QLASHTIRILADI (`×0.5`): "Qum"da
 * jigarrang, "Yalpiz"da yashil zarralar chiqadi. Shaffoflik ham pasaytiriladi
 * (`k`) — qorong'idagi kabi yorqin bo'lsa oq fonda shovqin bo'lardi.
 */
function inkFor(scheme: "dark" | "light") {
  if (scheme === "dark") {
    return { star: "200,218,255", dust: "142,183,255", spark: "220,232,255", k: 1 };
  }
  const raw =
    typeof document !== "undefined"
      ? getComputedStyle(document.documentElement).getPropertyValue("--lm-accent")
      : "";
  const rgb = hexToRgb(raw) ?? "29,78,216";
  const deep = rgb
    .split(",")
    .map((v) => Math.round(Number(v) * 0.5))
    .join(",");
  return { star: deep, dust: rgb, spark: deep, k: 0.62 };
}

interface Star {
  x: number;
  y: number;
  z: number; // chuqurlik 0.2..1 — parallaks va tezlik shundan
  r: number;
  ph: number; // miltillash fazasi
}
interface Dust {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}
interface Spark {
  x: number;
  y: number;
  life: number;
  max: number;
  r: number;
}

/**
 * Loyihaning umumiy kinematik foni: bitta canvas (yulduzlar + chang +
 * uchqunlar + tarmoq chiziqlari, yagona rAF) va CSS qatlamlar (nebula,
 * blueprint grid, sichqoncha spotlight, noise). Sichqonchani o'zi kuzatadi —
 * istalgan sahifaga qo'yish kifoya. Past opacity — kontent diqqatni tortadi.
 */
export const SpaceBackground = memo(function SpaceBackground() {
  const scheme = useScheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Sichqoncha: -1..1 normallashgan (parallaks) + piksel (spotlight), spring silliqlaydi
  const mxRaw = useMotionValue(0);
  const myRaw = useMotionValue(0);
  const pxRaw = useMotionValue(-600);
  const pyRaw = useMotionValue(-600);
  const mx = useSpring(mxRaw, { stiffness: 50, damping: 20, mass: 0.7 });
  const my = useSpring(myRaw, { stiffness: 50, damping: 20, mass: 0.7 });
  const px = useSpring(pxRaw, { stiffness: 120, damping: 26 });
  const py = useSpring(pyRaw, { stiffness: 120, damping: 26 });

  useEffect(() => {
    function onMove(e: MouseEvent) {
      mxRaw.set((e.clientX / window.innerWidth) * 2 - 1);
      myRaw.set((e.clientY / window.innerHeight) * 2 - 1);
      pxRaw.set(e.clientX);
      pyRaw.set(e.clientY);
    }
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [mxRaw, myRaw, pxRaw, pyRaw]);

  // Spotlight — sichqoncha ortidan yumshoq radial nur
  const spotlight = useMotionTemplate`radial-gradient(560px circle at ${px}px ${py}px, var(--space-spot), transparent 70%)`;
  // Grid yoritish maskasi — kursor atrofidagi katakchalar yumshoq yorishadi
  const gridMask = useMotionTemplate`radial-gradient(300px circle at ${px}px ${py}px, black, transparent 75%)`;

  // Grid va nebula parallaksi (sichqonchaga teskari, sekin)
  const gridX = useTransform(mx, [-1, 1], [10, -10]);
  const gridY = useTransform(my, [-1, 1], [10, -10]);
  const nebAX = useTransform(mx, [-1, 1], [-24, 24]);
  const nebAY = useTransform(my, [-1, 1], [-16, 16]);
  const nebBX = useTransform(mx, [-1, 1], [20, -20]);
  const nebBY = useTransform(my, [-1, 1], [14, -14]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const ink = inkFor(scheme);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let w = 0;
    let h = 0;
    let stars: Star[] = [];
    let dust: Dust[] = [];
    const sparks: Spark[] = [];
    let raf = 0;
    let t = 0;

    function seed() {
      stars = Array.from({ length: Math.min(220, Math.round((w * h) / 9000)) }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        z: 0.2 + Math.random() * 0.8,
        r: 0.4 + Math.random() * 1.1,
        ph: Math.random() * Math.PI * 2,
      }));
      dust = Array.from({ length: Math.min(34, Math.round((w * h) / 60000)) }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.12,
        r: 0.8 + Math.random() * 1.6,
      }));
    }

    function resize() {
      w = canvas!.clientWidth;
      h = canvas!.clientHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    }

    function frame() {
      t += 1;
      ctx!.clearRect(0, 0, w, h);
      const ox = mx.get() * 14;
      const oy = my.get() * 10;

      // Yulduzlar — doimiy sekin drift + miltillash, chuqurlikka mos parallaks
      for (const s of stars) {
        s.x -= 0.03 * s.z;
        if (s.x < -2) s.x = w + 2;
        const a = 0.25 + 0.35 * s.z + Math.sin(t * 0.012 + s.ph) * 0.18;
        ctx!.beginPath();
        ctx!.arc(s.x - ox * s.z, s.y - oy * s.z, s.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${ink.star},${Math.max(0.05, a) * ink.k})`;
        ctx!.fill();
      }

      // Chang zarralari + orasidagi tarmoq chiziqlari (opacity < 5%)
      for (const d of dust) {
        d.x += d.vx;
        d.y += d.vy;
        if (d.x < 0) d.x = w;
        if (d.x > w) d.x = 0;
        if (d.y < 0) d.y = h;
        if (d.y > h) d.y = 0;
      }
      for (let i = 0; i < dust.length; i++) {
        for (let j = i + 1; j < dust.length; j++) {
          const dx = dust[i].x - dust[j].x;
          const dy = dust[i].y - dust[j].y;
          const dist = Math.hypot(dx, dy);
          if (dist < 150) {
            ctx!.beginPath();
            ctx!.moveTo(dust[i].x - ox * 0.5, dust[i].y - oy * 0.5);
            ctx!.lineTo(dust[j].x - ox * 0.5, dust[j].y - oy * 0.5);
            ctx!.strokeStyle = `rgba(${ink.dust},${(1 - dist / 150) * 0.045 * ink.k})`;
            ctx!.lineWidth = 1;
            ctx!.stroke();
          }
        }
        const d = dust[i];
        ctx!.beginPath();
        ctx!.arc(d.x - ox * 0.5, d.y - oy * 0.5, d.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${ink.dust},${0.16 * ink.k})`;
        ctx!.fill();
      }

      // Vaqti-vaqti bilan porlab so'nadigan uchqunlar
      if (sparks.length < 5 && Math.random() < 0.008) {
        sparks.push({
          x: Math.random() * w,
          y: Math.random() * h,
          life: 0,
          max: 240 + Math.random() * 200,
          r: 1.2 + Math.random() * 1.6,
        });
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const sp = sparks[i];
        sp.life += 1;
        if (sp.life >= sp.max) {
          sparks.splice(i, 1);
          continue;
        }
        const a = Math.sin((sp.life / sp.max) * Math.PI) * 0.5;
        ctx!.beginPath();
        ctx!.arc(sp.x, sp.y, sp.r * 3.2, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${ink.dust},${a * 0.12 * ink.k})`;
        ctx!.fill();
        ctx!.beginPath();
        ctx!.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${ink.spark},${a * ink.k})`;
        ctx!.fill();
      }

      raf = requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
    /* `scheme` — dep: mavzu almashganda ranglar qayta olinadi */
  }, [mx, my, scheme]);

  return (
    /* `space-bg` — YORUG' rejimda ham ko'rinadi, faqat ranglari almashadi
       (`index.css` → `:root[data-scheme="light"] .space-*`). Ilgari butun
       qatlam `display:none` edi va kunduzgi mavzularda na yulduz, na
       kursor setkasi qolardi. */
    <div className="space-bg pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      {/* Asosiy gradient fon */}
      <div className="space-base absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,#111524_0%,#0D1020_45%,#090B14_100%)]" />

      {/* Nebula qatlamlari — sekin suzadigan xira dog'lar */}
      <motion.div style={{ x: nebAX, y: nebAY }} className="absolute inset-0">
        <motion.div
          animate={{ x: [0, 60, 0], y: [0, 40, 0], scale: [1, 1.12, 1] }}
          transition={{ duration: 34, repeat: Infinity, ease: "easeInOut" }}
          className="space-neb absolute left-[8%] top-[6%] h-[46vmax] w-[46vmax] rounded-full bg-[#3B5BDB] opacity-[0.07] blur-[120px]"
        />
        <motion.div
          animate={{ x: [0, -50, 0], y: [0, 30, 0] }}
          transition={{ duration: 42, repeat: Infinity, ease: "easeInOut" }}
          className="space-neb absolute -bottom-[12%] right-[4%] h-[40vmax] w-[40vmax] rounded-full bg-[#5F3DC4] opacity-[0.06] blur-[130px]"
        />
      </motion.div>
      <motion.div style={{ x: nebBX, y: nebBY }} className="absolute inset-0">
        <motion.div
          animate={{ x: [0, 40, 0], y: [0, -50, 0], scale: [1, 1.08, 1] }}
          transition={{ duration: 38, repeat: Infinity, ease: "easeInOut" }}
          className="space-neb absolute left-[30%] top-[38%] h-[34vmax] w-[34vmax] rounded-full bg-[#1C4E9E] opacity-[0.08] blur-[110px]"
        />
      </motion.div>

      {/* ⚠️ BLUEPRINT SETKASI bu yerdan OLIB TASHLANDI — u endi ilova
          qobig'ining foni (`.app-grid`, `index.css`). Ikkalasi birga
          turganda ekranda IKKI QAVAT setka chiqib qolardi. Quyidagi
          kursor atrofidagi yorug' qatlam esa qoladi: u bezak, takror emas. */}

      {/* Yorug' grid qatlami — faqat kursor atrofida mask orqali ko'rinadi */}
      <motion.div
        style={{
          x: gridX,
          y: gridY,
          /* ⚠️ Rang QOTIRILMAYDI: inline uslub CSS qoidasini bosib ketadi,
             shuning uchun u `--space-line` o'zgaruvchisidan olinadi va
             mavzuga qarab `index.css` da almashadi. */
          backgroundImage:
            "linear-gradient(var(--space-line) 1px, transparent 1px), linear-gradient(90deg, var(--space-line) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          WebkitMaskImage: gridMask,
          maskImage: gridMask,
        }}
        className="space-grid absolute -inset-6 opacity-[0.14]"
      />

      {/* Canvas: yulduzlar, chang, uchqunlar, tarmoq chiziqlari */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* Sichqoncha spotlight */}
      <motion.div style={{ background: spotlight }} className="absolute inset-0" />

      {/* Ambient tuman + pastki vignette */}
      <div className="space-fog absolute inset-0 bg-[radial-gradient(ellipse_at_50%_120%,rgba(9,11,20,0.9),transparent_60%)]" />

      {/* Noise overlay */}
      <div
        style={{ backgroundImage: NOISE_URI }}
        className="space-noise absolute inset-0 opacity-[0.035] mix-blend-overlay"
      />
    </div>
  );
});
