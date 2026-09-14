"use client";

import { useMemo } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";

/**
 * Sahifalash raqamlari — `1 … 4 5 6 … 492` ko'rinishi.
 *
 * Uch nuqta FAQAT haqiqiy uzilish bo'lganda qo'yiladi (2 dan 4 gacha
 * sakralsa), aks holda u hech qanday raqamni yashirmagan bo'lardi.
 *
 * Slotlar soni DOIM 7 ta — sahifa almashganda lenta eni "sakramaydi".
 */
export function pageRange(page: number, totalPages: number): (number | "gap")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const from = Math.max(2, Math.min(page - 1, totalPages - 4));
  const to = Math.min(totalPages - 1, Math.max(page + 1, 5));
  const out: (number | "gap")[] = [1];
  if (from > 2) out.push("gap");
  for (let n = from; n <= to; n++) out.push(n);
  if (to < totalPages - 1) out.push("gap");
  out.push(totalPages);
  return out;
}

/**
 * Sahifalash lentasi — chetlarda strelka, markazda raqamlar.
 *
 * "Aniqlanganlar" va "Kameralar" bo'limlari SHU bitta komponentdan
 * foydalanadi: ikkalasi bir xil ko'rinishda bo'lsin va tuzatish bir joyda
 * bo'lsin. `totalPages <= 1` bo'lsa hech narsa chizilmaydi.
 */
export function Pagination({
  page,
  totalPages,
  onChange,
  prevLabel,
  nextLabel,
  ariaLabel,
  className = "",
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  prevLabel: string;
  nextLabel: string;
  ariaLabel?: string;
  /** Qo'shimcha sinf — odatda `mt-auto` (pastga surish). */
  className?: string;
}) {
  const items = useMemo(() => pageRange(Math.max(1, page), Math.max(1, totalPages)), [page, totalPages]);

  /* Ma'lumot BITTA sahifaga sig'sa lenta umuman chizilmaydi — bo'sh
     sahifada "1" tugmasi yolg'iz turishining ma'nosi yo'q. */
  if (totalPages <= 1) return null;

  /* Strelka raqamlar bilan BIR O'LCHAMDA — ilgari 40 px edi va lenta
     chetlarida boshqa balandlikda "osilib" turardi. */
  const arrow =
    "grid h-8 w-8 flex-none place-items-center rounded-md border border-white/[0.08] bg-white/[0.05] " +
    "text-slate-300 transition-colors hover:border-white/20 hover:text-white " +
    "disabled:cursor-not-allowed disabled:opacity-30";

  return (
    /* Panel pastiga QOTIRILMAYDI (`flex-none` + skrolldan tashqarida
       variant sinab ko'rildi va rad etildi) — ro'yxat oqimida, uning
       ostida turadi.

       ⚠️ Strelkalar RAQAMLAR YONIDA, bitta markazlashgan guruhda.
       Ilgari `justify-between` bilan ular ekranning ikki CHETIGA
       yopishardi: raqamlar markazda, strelkalar esa ulardan yuzlab
       piksel narida "yolg'iz" qolardi va ular bir boshqaruv ekani
       bilinmasdi. Guruh markazda bo'lgani uchun o'ngdagi ovozli
       boshqaruv tugmasi (`fixed bottom-6 right-6`) endi xalaqit
       bermaydi — chetdan bo'shliq ham kerak emas.

       ── PASTDA TURISHI ──
       Chaqiruvchi `className="mt-auto"` beradi va skroll o'ramini
       `flex flex-col` qiladi. Shunda:
         · ro'yxat KALTA bo'lsa  → `margin-top:auto` bo'sh joyni yeydi,
           lenta panelning PASTIGA tushadi;
         · ro'yxat UZUN bo'lsa   → bo'sh joy yo'q, `auto` = 0 va lenta
           odatdagidek ro'yxat oxirida qoladi.

       ⚠️ ATAYLAB `position: sticky` EMAS: sticky lentani skroll paytida
       HAM ekranda ushlab turardi, ya'ni u doim ko'rinib, kartochkalarni
       bekitib turardi. Bu yerda kerak bo'lgani — "bo'sh joy bo'lsa
       pastga tushsin", bu esa aynan `mt-auto`. */
    <nav
      className={`mt-3 flex flex-wrap items-center justify-center gap-1.5 py-1 ${className}`}
      aria-label={ariaLabel}
    >
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label={prevLabel}
        title={prevLabel}
        className={arrow}
      >
        <CaretLeft size={18} />
      </button>

      {items.map((it, i) =>
          typeof it === "string" ? (
            <span
              key={`gap-${i}`}
              aria-hidden
              className="grid h-8 min-w-[32px] place-items-center px-1 text-[12px] text-slate-500"
            >
              …
            </span>
          ) : (
            <button
              key={it}
              type="button"
              onClick={() => onChange(it)}
              aria-current={it === page ? "page" : undefined}
              className={
                "grid h-8 min-w-[32px] place-items-center rounded-md px-2 font-mono text-[12px] transition-colors " +
                (it === page
                  ? "border border-ice/60 bg-ice/20 font-semibold text-white"
                  : "border border-white/[0.08] bg-white/[0.05] text-slate-300 hover:border-white/20 hover:text-white")
              }
            >
              {it}
            </button>
        )
      )}

      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label={nextLabel}
        title={nextLabel}
        className={arrow}
      >
        <CaretRight size={18} />
      </button>
    </nav>
  );
}
