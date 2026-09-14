import type { SVGProps } from "react";

/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  CAMPUS AI LOGOTIPI — "CA" monogrammasi                              ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * 🔵 **2026-09-14, foydalanuvchi bergan belgi.** Ilgari brend joyida
 * `lucide` ning `ScanFace` ikonkasi turardi (umumiy, loyihaga xos emas).
 *
 * ⚠️ **MANBA — `public/logo/`** (`Logo.tsx` va `logo.svg`). `public/`
 * STATIK fayllar uchun, ya'ni u yerdagi `.tsx` ni ilova IMPORT QILA
 * OLMAYDI (Next uni kompilyatsiya qilmaydi, faqat fayl bo'lib beradi) —
 * shuning uchun komponent SHU YERGA ko'chirilgan, nusxasi esa manba
 * sifatida `public/logo/` da qoladi. Belgi o'zgarsa ikkalasi ham
 * yangilanadi.
 *
 * Rang `currentColor` orqali olinadi, ya'ni Tailwind'da oddiy `text-*`
 * klassi bilan boshqariladi:
 *   <Logo className="h-8 w-auto text-brand" />
 *   <Logo className="h-6 w-auto text-white" />
 */
export function Logo({ title = "Campus AI", ...props }: SVGProps<SVGSVGElement> & { title?: string }) {
  return (
    <svg
      viewBox="0 0 199 124"
      fill="currentColor"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {/* "C" — halqa va o'ng tomonga cho'zilgan o'tkir dum */}
      <path d="M99.31 12.48A62.0 62.0 0 1 0 64.16 123.96C85.60 123.30 83.70 97.10 101.00 85.00L76.90 92.56A34.0 34.0 0 1 1 88.05 40.15Z" />
      {/* "A" — chap oyog'i "C" dumiga ulanadigan shevron */}
      <path d="M119.00 0L139.00 0L198.99 124.0L169.43 124.0L129.00 33.19L108.60 79.00L75.93 86.00Z" />
    </svg>
  );
}

export default Logo;
