/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  "BACKENDDAN KELMADI" — QIZIL BELGI                                  ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * Loyihada MOCK YO'Q: son o'ylab topilmaydi. Manba bo'lmasa ekranda
 * **qizil belgi** turadi — foydalanuvchi "0" ni haqiqiy nol deb
 * o'ylamasin, dasturchi esa qaysi endpoint yetishmayotganini KO'RSIN.
 *
 * ── AVTOMAT TO'G'RILANISH ─────────────────────────────────────────────
 * Chaqiruvchi manba yo'qligini `null`/`undefined` bilan bildiradi:
 *
 * ```tsx
 * <Val v={stats?.students ?? null} />   // backend bermasa — QIZIL
 * ```
 *
 * Backend o'sha maydonni qaytara boshlagan ZAHOTI qiymat oddiy songa
 * aylanadi — komponentga TEGILMAYDI. Ya'ni "keyin tuzatamiz" ro'yxati
 * kerak emas: tuzatish backend tomonda bo'ladi.
 *
 * ⚠️ **`0` — HAQIQIY QIYMAT, yetishmagan emas.** kuzatuv posti "bugun 0 ta qurol
 * hodisasi" desa bu to'g'ri javob va oddiy qora "0" bo'lib chiqadi.
 * Faqat `null`/`undefined`/`NaN` qizil bo'ladi.
 */
import type { ReactNode } from "react";
import { WarningCircle } from "@phosphor-icons/react";
import { tr } from "@/i18n/store";

/** Qiymat manbasi yo'qmi. `0` va bo'sh satr — HAQIQIY qiymat. */
export const isMissing = (v: unknown): boolean =>
  v === null || v === undefined || (typeof v === "number" && !Number.isFinite(v));

/**
 * Bitta son/matn. Manba bo'lmasa — qizil "—" va sababi `title` da.
 *
 * @param v      qiymat; `null`/`undefined` — backend bermadi
 * @param source qaysi endpoint yetishmayapti (hover'da ko'rinadi)
 */
export function Val({
  v,
  source,
  format,
  className = "",
}: {
  v: number | string | null | undefined;
  source?: string;
  /** Ko'rsatishdan oldingi format (masalan `toLocaleString`). */
  format?: (v: number | string) => ReactNode;
  className?: string;
}) {
  if (isMissing(v)) return <Missing source={source} className={className} />;
  return <span className={className}>{format ? format(v as number | string) : (v as ReactNode)}</span>;
}

/**
 * Manba yo'q qiymat — **oddiy `0`**.
 *
 * ⚠️ **QIZIL RAMKA OLIB TASHLANDI** (2026-09-05, foydalanuvchi
 * so'rovi). Ilgari bu yerda qizil ramkali belgi turardi va u
 * ekranning yarmini "xato" kabi ko'rsatardi: kuzatuv hozircha BITTA
 * maktabda olib borilmoqda, ya'ni qolgan olti muassasada manba
 * bo'lmasligi NORMAL holat, nosozlik emas.
 *
 * Endi qiymat oddiy `0` bo'lib chiqadi, faqat rangi biroz so'niq
 * (`text-slate-500`) va sababi `title` da qoladi — sichqoncha olib
 * borilsa qaysi endpoint yetishmayotgani yoziladi. Dasturchi uchun
 * belgi saqlanadi, foydalanuvchi uchun esa ekran tinch.
 */
export function Missing({ source, className = "" }: { source?: string; className?: string }) {
  return (
    <span
      title={source ? tr().missing.hintSource(source) : tr().missing.hint}
      className={`font-mono text-slate-500 ${className}`}
    >
      0
    </span>
  );
}

/**
 * BUTUN panel/blok uchun — diagramma yoki jadval o'rniga.
 *
 * Nol ustunlar CHIZILMAYDI: bo'sh grafik "ma'lumot yo'q" degani emas,
 * "hammasi nol" degandek ko'rinadi.
 */
export function MissingBlock({
  reason,
  source,
  className = "",
}: {
  /** Odam o'qiydigan sabab — nega bu yerda son yo'q. */
  reason?: string;
  /** Kerakli endpoint — dasturchi uchun. */
  source?: string;
  className?: string;
}) {
  const t = tr();
  return (
    <div
      /* ⚠️ Ramka ham QIZIL EMAS — bu "xato" emas, "manba hali
         ulanmagan" degani (yuqoridagi `Missing` izohiga qarang). */
      className={`grid place-items-center rounded-xl border border-dashed border-white/10
                  bg-white/[0.02] p-5 text-center ${className}`}
    >
      <div className="flex max-w-[280px] flex-col items-center gap-1.5">
        <WarningCircle size={20} weight="duotone" className="text-slate-500" />
        <p className="text-[11.5px] font-semibold text-slate-300">{t.missing.blockTitle}</p>
        <p className="text-[10px] leading-snug text-slate-400">{reason ?? t.missing.hint}</p>
        {source && <code className="mt-0.5 text-[9.5px] text-slate-500">{source}</code>}
      </div>
    </div>
  );
}
