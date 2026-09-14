import { forwardRef } from "react";
import type { Icon as PhosphorIcon, IconProps } from "@phosphor-icons/react";

/**
 * PISTOLET ikonkasi — o'z SVG'imiz.
 *
 * NEGA: `@phosphor-icons/react` da qurol ikonkasi YO'Q (lucide'da ham), va
 * ilgari uning o'rniga `Crosshair` (nishonga olish halqasi) turardi — u
 * "qurol" degan ma'noni bermasdi, ko'proq "nishon" bo'lib ko'rinardi.
 *
 * Phosphor bilan BIR XIL shartnoma (`size`, `color`, `weight`, `mirrored`):
 * shuning uchun `DetectionType.icon` maydonini o'zgartirmasdan qo'yiladi va
 * chaqiruvchilar (`HudFooter`, `DetectionsPage`) tegilmaydi.
 *
 * ⚠️ `weight` faqat IKKI holatda farq qiladi: to'ldirilgan (`fill`/`duotone`)
 * va konturli. Phosphor'ning oltita qalinligini takrorlash shart emas —
 * ikonka faqat shu ikki ko'rinishda ishlatiladi.
 */
export const Pistol = forwardRef<SVGSVGElement, IconProps>(function Pistol(
  { size = 24, color = "currentColor", weight = "regular", mirrored = false, style, ...rest },
  ref
) {
  const solid = weight === "fill" || weight === "duotone";
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 256 256"
      fill="none"
      style={{ ...style, ...(mirrored ? { transform: "scaleX(-1)" } : null) }}
      {...rest}
    >
      {/* Duotone uchun yumshoq ichki to'ldirish — phosphor uslubidagi soya */}
      {weight === "duotone" && (
        <path
          d="M24 72h176v40h-40l-24 32h-32l-16-32H56a32 32 0 0 1-32-32Z"
          fill={color}
          opacity="0.2"
        />
      )}
      {/* Zatvor (tepa qismi) + dastagi + tepkisi — bitta kontur */}
      <path
        d="M24 72h192a8 8 0 0 1 8 8v24a8 8 0 0 1-8 8h-44l-22 30a16 16 0 0 1-13 6h-19l-14 46a16 16 0 0 1-15 12H62a16 16 0 0 1-15-21l19-53H56a32 32 0 0 1-32-32V72Z"
        stroke={color}
        strokeWidth={solid ? 0 : 16}
        strokeLinejoin="round"
        fill={solid ? color : "none"}
      />
      {/* Tepki himoyasi — dastaning oldidagi yoy */}
      <path
        d="M88 152h44"
        stroke={solid ? "#0000" : color}
        strokeWidth="16"
        strokeLinecap="round"
      />
    </svg>
  );
}) as PhosphorIcon;
