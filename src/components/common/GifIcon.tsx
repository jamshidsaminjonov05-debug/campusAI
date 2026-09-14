import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

interface Props {
  src: string;
  /** Kvadrat o'lcham (px). */
  size?: number;
  /** `true` — animatsiya o'ynaydi; `false` — birinchi kadr (qotgan rasm). */
  play?: boolean;
  alt?: string;
  className?: string;
}

/**
 * Animatsiyali GIF ikonka — **bo'sh turganda QOTIB turadi**.
 *
 * NEGA shunday: ikonkalar `…-hover-…` animatsiyalari va hammasi cheksiz
 * takrorlanadigan (LOOP) GIF. Sidebar'da 9 tasi bir vaqtda o'ynasa ekran
 * tinmay qimirlaydi va brauzer har kadrda qayta chizadi — kuzatuv paneli
 * uchun bu shovqin.
 *
 * GIF ni `<img>` ichida to'xtatib bo'lmaydi (`pause` yo'q, CSS ham ta'sir
 * qilmaydi). Shuning uchun: rasm yuklangach BIRINCHI KADR `<canvas>` ga
 * chiziladi va tinch holatda o'sha ko'rsatiladi. Kerak bo'lganda (`play`)
 * `<img>` qayta ulanadi — GIF boshidan o'ynaydi.
 *
 * `canvas` DOM'da DOIM turadi (`display:none` bilan), aks holda `play` yoqiq
 * holda ochilgan element uchun ref bo'sh qolib, kadr hech qachon olinmasdi.
 *
 * "Harakatni kamaytirish" tizim sozlamasi yoqilgan bo'lsa animatsiya umuman
 * o'ynamaydi.
 */
export function GifIcon({ src, size = 20, play = false, alt = "", className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [frozen, setFrozen] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    setFrozen(false);
    let cancelled = false;

    const img = new Image();
    const draw = () => {
      const c = canvasRef.current;
      if (cancelled || !c) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = size * dpr;
      c.height = size * dpr;
      const ctx = c.getContext("2d");
      if (!ctx) return; // canvas ishlamasa — GIF shundoq o'ynayveradi
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      setFrozen(true);
    };

    img.src = src;
    if (img.complete) draw();
    else img.onload = draw;

    return () => {
      cancelled = true;
    };
  }, [src, size]);

  const animate = play && !reduceMotion;
  // Kadr hali olinmagan bo'lsa GIF ko'rsatiladi — bo'sh joy "sakramasin"
  const showImg = animate || !frozen;

  return (
    <span className={className} style={{ display: "block", width: size, height: size }}>
      <canvas
        ref={canvasRef}
        aria-hidden
        style={{ width: size, height: size, display: showImg ? "none" : "block" }}
      />
      {showImg && <img src={src} width={size} height={size} alt={alt} draggable={false} />}
    </span>
  );
}
