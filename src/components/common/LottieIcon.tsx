import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import type { AnimationItem } from "lottie-web";

interface Props {
  /** `public/` ichidagi Lottie JSON manzili (`/icons/gif/statistika.json`). */
  src: string;
  size?: number;
  /** `true` — animatsiya o'ynaydi; `false` — birinchi kadrda qotib turadi. */
  play?: boolean;
  className?: string;
}

/**
 * Lottie (JSON) ikonka — GIF'ning yengil va aniq muqobili.
 *
 * NEGA GIF EMAS: bu fayl VEKTOR (22 KB, 192×192 shakl animatsiyasi) —
 * har o'lchamda aniq chiqadi va GIF'lar kabi 100–300 KB emas. Eng muhimi,
 * playbackni BOSHQARSA bo'ladi: `goToAndStop(0)` bilan tinch holatda birinchi
 * kadrda turadi, hover/aktivda `play()`. GIF'da bu imkoniyat yo'q edi va
 * `GifIcon` da birinchi kadrni canvasga chizib "muzlatish" hiylasi kerak
 * bo'lgandi (qarang: `common/GifIcon.tsx`).
 *
 * Kutubxona (`lottie-web`) bundle'ga tushadi — CDN YO'Q, oflayn qoida buzilmaydi.
 * JSON ham `public/` dan, ya'ni ichki tarmoqdan olinadi.
 */
export function LottieIcon({ src, size = 25, play = false, className }: Props) {
  const boxRef = useRef<HTMLSpanElement>(null);
  const animRef = useRef<AnimationItem | null>(null);
  const reduceMotion = useReducedMotion();
  /* Yuklash ASINXRON: fayl kelguncha `play` allaqachon o'zgargan bo'lishi
     mumkin, shuning uchun oxirgi qiymat ref'da saqlanadi. */
  const playRef = useRef(play);
  playRef.current = play && !reduceMotion;

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    let cancelled = false;

    /* `lottie-web` faqat brauzerda ishlaydi (DOM kerak) — dinamik import
       server render paytida uni yuklamaydi va bundle'ni ham bo'ladi. */
    import("lottie-web").then((mod) => {
      if (cancelled || !boxRef.current) return;
      animRef.current = mod.default.loadAnimation({
        container: boxRef.current,
        renderer: "svg",
        loop: true,
        autoplay: false, // boshlang'ich holat — birinchi kadr
        path: src,
      });
      if (playRef.current) animRef.current.play();
    });

    return () => {
      cancelled = true;
      animRef.current?.destroy();
      animRef.current = null;
    };
  }, [src]);

  useEffect(() => {
    const anim = animRef.current;
    if (!anim) return;
    if (play && !reduceMotion) anim.play();
    else anim.goToAndStop(0, true);
  }, [play, reduceMotion]);

  return <span ref={boxRef} className={className} style={{ display: "block", width: size, height: size }} />;
}
