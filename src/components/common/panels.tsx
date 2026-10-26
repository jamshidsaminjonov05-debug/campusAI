/**
 * ILOVA BO'YLAB UMUMIY panel bo'laklari — panel ramkasi, KPI kartochkasi,
 * saralanadigan jadval sarlavhasi, holat nishonchasi va recharts o'q/tooltip
 * uslubi.
 *
 * Nega bitta fayl: Boshqaruv paneli, Kameralar, Geo Analitika, Aniqlanganlar
 * va Statistika — hammasi AYNAN bir xil ko'rinishda bo'lishi kerak; uslub bir
 * joyda tursa keyin bittasi "boshqacha" bo'lib qolmaydi.
 *
 * (Ilgari `components/statistics/parts.tsx` edi va faqat Statistika
 * bo'limiga tegishli edi.)
 */
import { useEffect, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { CaretDown, CaretUp, type Icon } from "@phosphor-icons/react";
import { useT } from "@/i18n";
import { GifIcon } from "@/components/common/GifIcon";
import type { RegionHealth } from "@/lib/nvr/institutionRows";
import type { SortDir } from "@/lib/statistics";

/** Recharts o'qlari va tooltip — butun sahifada bir xil. */
export const AXIS = { fill: "#5A6B85", fontSize: 9 } as const;

/**
 * Recharts `YAxis` KENGLIGI — barcha diagrammalarda bir xil.
 *
 * ⚠️ **NEGA KERAK BO'LDI** (2026-09-04): diagrammalarda joy tejash uchun
 * `margin={{ left: -18 }}` (yoki `-22`, `-34`) yozilardi — bu `YAxis`
 * ning default **60 px** kengligini "qisqartirish" usuli edi. Ammo
 * margin o'qni QIRQMAYDI, uni CHAPGA SURADI: son qancha uzun bo'lsa
 * shuncha ko'p qismi konteynerdan chiqib ketardi. Davomat sonlari
 * to'rt-besh xonaga yetgach (`10000`, `100%`) chap tomondagi yorliqlar
 * KESILIB, `100` o'rniga `OY`, `80` o'rniga `0` bo'lib ko'rinardi.
 *
 * Yechim: manfiy margin OLIB TASHLANDI, o'q kengligi esa shu yerda
 * ANIQ beriladi — 44 px `10000` va `100%` uchun yetadi, default 60 px
 * dan esa tejamliroq.
 */
export const Y_AXIS_W = 44;
export const TOOLTIP = {
  background: "#0E1626",
  border: "1px solid rgba(37,99,235,0.3)",
  borderRadius: 8,
  fontSize: 11,
} as const;
/* ⚠️ Recharts qator rangini SERIYA rangidan oladi (`stroke`/`fill`); `Cell`
   bilan bo'yalgan ustunda u yo'q va matn QORA chiqardi (o'lchandi 2026-10-24:
   "Soni : 10 454" qorong'i fonda ko'rinmasdi). Shu ikkisini HAR tooltipga bering. */
export const TOOLTIP_ITEM = { color: "#CBD5E1", fontWeight: 600 } as const;
export const TOOLTIP_LABEL = { color: "#F1F5F9", fontWeight: 700, marginBottom: 2 } as const;

export const STATUS_TONE: Record<RegionHealth, string> = {
  normal: "#22C55E",
  warning: "#EAB308",
  critical: "#EF4444",
};

/** Raqamni til qoidasi bo'yicha, ming ajratgichi — probel (645 000). */
export const fmt = (v: number, locale: string): string =>
  v.toLocaleString(locale).replace(/[, ]/g, " ");

export function StatPanel({
  title,
  hint,
  right,
  delay = 0,
  className = "",
  bodyClass = "",
  surface = "hik-glass-blue",
  children,
}: {
  title: string;
  hint?: string;
  right?: ReactNode;
  delay?: number;
  className?: string;
  bodyClass?: string;
  /**
   * Sirt klassi. Default — yarim shaffof `hik-glass-blue`.
   *
   * ⚠️ XARITA USTIDA turgan panel uchun `"geo-strip-card"` beriladi: shaffof
   * sirtda ostidagi viloyat ranglari ko'rinib, matn o'qilmay qoladi.
   */
  surface?: string;
  children: ReactNode;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      className={`${surface} flex min-h-0 flex-col rounded-2xl px-3.5 py-3 ${className}`}
    >
      <header className="mb-2 flex flex-none items-baseline gap-2">
        <p className="text-[10px] uppercase tracking-wider text-ice-cyan/70">{title}</p>
        {hint && <span className="truncate text-[9.5px] text-slate-500">{hint}</span>}
        {right && <span className="ml-auto flex-none">{right}</span>}
      </header>
      <div className={`min-h-0 flex-1 ${bodyClass}`}>{children}</div>
    </motion.section>
  );
}

/**
 * YUKLANAYOTGAN joy egallovchisi — pulsatsiyali plita (2026-10-23).
 *
 * ⚠️ FAQAT so'rov haqiqatan KUTILAYOTGANDA (`isLoading`) ko'rsatiladi.
 * Soxta progress yoki "N soniya qoldi" YO'Q — server qancha vaqt olishini
 * bilmaymiz. O'lchamni chaqiruvchi beradi (panel shakliga mos), shunda
 * ma'lumot kelganda panel balandligi sakramaydi.
 */
export function Skeleton({
  className = "",
  spinner = false,
  timer = false,
}: {
  className?: string;
  spinner?: boolean;
  /**
   * Kutilayotgan vaqt — "3 s", "4 s"… (ochilgan paytdan OLDINGA sanaydi).
   * ⚠️ Teskari hisob ("10s…1s") ATAYLAB YO'Q: server qachon javob berishini
   * bilmaymiz, to'qilgan muddat yolg'on va'da bo'lardi.
   */
  timer?: boolean;
}) {
  /* 🔴 `relative` ATAYLAB YO'Q (2026-10-23 da topildi): chaqiruvchi grafik
     ustiga `absolute inset-0` beradi, Tailwind CSS'ida esa `relative`
     `absolute`dan KEYIN turadi va yutadi — skelet balandligi 0 bo'lib,
     umuman ko'rinmasdi. Shuning uchun `relative` FAQAT chaqiruvchi
     `absolute`/`fixed` bermaganda qo'shiladi (to'lqin `::after` uchun
     joylashgan ota kerak). CSS'da ham `position` yozilmaydi — u Tailwind
     utility'laridan KEYIN keladi va `absolute`ni bosib ketardi. */
  const positioned = /(^|\s)(absolute|fixed)(\s|$)/.test(className);
  return (
    <div
      aria-busy="true"
      className={`skeleton-shimmer ${positioned ? "" : "relative"} grid place-items-center overflow-hidden rounded-lg border border-white/[0.06] bg-white/[0.05] ${className}`}
    >
      {(spinner || timer) && (
        <span className="flex flex-col items-center gap-1.5">
          {spinner && <span className="h-6 w-6 rounded-full border-2 border-ice/30 border-t-ice motion-safe:animate-spin" />}
          {timer && <ElapsedSeconds />}
        </span>
      )}
    </div>
  );
}

/** Ochilgan paytdan beri o'tgan soniyalar — "Yuklanmoqda · 4 s". */
export function ElapsedSeconds({ label = "Yuklanmoqda" }: { label?: string }) {
  const [sec, setSec] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const id = window.setInterval(() => setSec(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <span className="font-mono text-[10.5px] text-slate-400">
      {label} · <b className="text-ice-bright">{sec} s</b>
    </span>
  );
}

/**
 * KATTA panel yuklanishi (2026-10-23, foydalanuvchi maketi bo'yicha):
 * aylanuvchi halqa ichida ma'lumotlar bazasi ikonkasi, "N kunlik ma'lumotlar
 * hisoblanmoqda…", progress chizig'i va TESKARI soniya hisobi.
 *
 * ⚠️ Muddat — TAXMINIY (davr uzunligidan: bugun ~3 s, oy ~10 s, butun tarix
 * ~15 s). Server javob vaqtini oldindan aytmaydi, shuning uchun:
 *   · progress 95% dan oshmaydi (ma'lumot kelmaguncha "tugadi" deb ko'rsatmaydi);
 *   · hisob 0 ga yetsa manfiyga o'tmaydi — "biroz ko'proq…" yoziladi.
 * Yorliq "Taxminiy vaqt" deb OCHIQ yozilgan — va'da emas.
 */
export function PanelLoader({
  days,
  allTime = false,
  className = "",
}: {
  /** Davrdagi kunlar soni (`period.days`). */
  days: number;
  /** "Butun tarix" tanlangan. */
  allTime?: boolean;
  className?: string;
}) {
  const t = useT().loader;
  const est = allTime ? 15 : Math.min(15, Math.max(3, Math.round(2 + days * 0.28)));
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const id = window.setInterval(() => setElapsed((Date.now() - started) / 1000), 250);
    return () => window.clearInterval(id);
  }, []);
  /* 🔵 SEKINLASHUVCHI hisob (2026-10-23, foydalanuvchi so'rovi: "sanab
     bo'linsa «..» bo'lib qolyapti"). Ulush `f = t / (t + est)` — boshida
     tez, keyin borgan sari sekin o'sadi va 1 ga HECH QACHON yetmaydi.
     Qolgan soniya `2·est·(1 − f)` dan: boshida `2·est`, `est` soniyada
     yarmi, keyin sekinlashib 1 da to'xtab turadi. Ma'lumot kelgach
     komponent o'zi yo'qoladi — "tugadi" deb yolg'on ko'rsatmaydi. */
  const f = elapsed / (elapsed + est);
  const left = Math.max(1, Math.ceil(2 * est * (1 - f)));
  const pct = Math.min(97, f * 100);
  /* 🔵 SODDA (2026-10-23, foydalanuvchi so'rovi): faqat chiziq + teskari son.
     Ikonka/halqa, sarlavha, izoh, "Taxminiy vaqt" yorlig'i va skelet fon
     OLIB TASHLANDI. Matnlar (`t.loader.title` …) lug'atda qoldi. */
  return (
    <div aria-busy="true" aria-label={allTime ? t.allTime : t.title(days)} className={`grid place-items-center ${className}`}>
      <div className="flex w-full max-w-[420px] items-center gap-3 px-6">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full transition-[width] duration-300 ease-linear"
            style={{ width: `${pct}%`, background: "linear-gradient(90deg, #22d3ee, #818cf8)" }}
          />
        </div>
        <span className="w-9 flex-none text-right font-mono text-[12px] font-bold text-cyan-300">
          {left} s
        </span>
      </div>
    </div>
  );
}

/**
 * KARTOCHKALAR TO'RI yuklanishi (2026-10-26, foydalanuvchi: "backenddan
 * kelayotgan bo'lsa skeleton yoki slider loading bo'lib tursin, DOIM").
 * "Hisoblanmoqda…" kabi yolg'iz matn o'rniga — kartochka shaklidagi
 * pulsatsiyali plitalar: kelgan to'r AYNI joyni egallaydi, sakrash yo'q.
 * `cols` — `.nvr-grid` `--cols` bilan bir xil; `media` — rasm nisbati.
 */
export function CardGridSkeleton({
  count = 8,
  cols = 4,
  media = "aspect-video",
  className = "",
}: {
  count?: number;
  cols?: number;
  media?: string;
  className?: string;
}) {
  return (
    <div aria-busy="true" className={`nvr-grid ${className}`} style={{ ["--cols" as string]: cols }}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.02]">
          <Skeleton className={`${media} w-full rounded-none border-0`} />
          <div className="space-y-2 p-3">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-2.5 w-1/2" />
            <Skeleton className="h-2.5 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** RO'YXAT yuklanishi — qator shaklidagi plitalar (ikonka + ikki satr). */
export function ListSkeleton({ rows = 5, className = "" }: { rows?: number; className?: string }) {
  return (
    <div aria-busy="true" className={`space-y-2 ${className}`}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border border-white/[0.05] bg-white/[0.02] p-2">
          <Skeleton className="h-8 w-8 flex-none rounded-full" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-2.5 w-3/5" />
            <Skeleton className="h-2 w-2/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function KpiTile({
  Icon,
  label,
  value,
  hint,
  tone,
  onClick,
  title,
  demo = false,
  loading = false,
}: {
  Icon: Icon;
  label: string;
  /** `ReactNode` — ba'zi kartochkalarda qiymat animatsiyalanadi (`CountUp`). */
  value: ReactNode;
  hint?: string;
  tone: string;
  onClick?: () => void;
  title?: string;
  /**
   * Qiymat DEMO manbadanmi.
   *
   * KERAK: bitta qatorda real va to'qilgan sonlar ARALASH turishi mumkin
   * (backendda 2 talaba bor, kamera esa yo'q → mock). Umumiy "DEMO" lentasi
   * qaysi son haqiqiy ekanini ko'rsatmaydi, shuning uchun belgi HAR
   * KARTOCHKADA alohida turadi.
   */
  demo?: boolean;
  /** Manba hali kelmagan — qiymat va izoh o'rnida skelet (yorliq/ikonka turaveradi). */
  loading?: boolean;
}) {
  const body = (
    <>
      <div className="mb-1 flex items-center gap-1.5" style={{ color: tone }}>
        <Icon size={14} weight="duotone" />
        <span className="truncate text-[9px] uppercase tracking-wide opacity-85">{label}</span>
        {demo && (
          <span
            title="Hali jarayonda — ma'lumotlar qo'shilmoqda"
            className="ml-auto flex-none rounded border border-amber-400/40 bg-amber-400/10 px-1 py-px
                       text-[8px] font-bold uppercase tracking-wide text-amber-300"
          >
            demo
          </span>
        )}
      </div>
      {loading ? (
        <>
          <Skeleton className="h-[20px] w-14" />
          <Skeleton className="mt-1 h-[12px] w-24 rounded" />
        </>
      ) : (
        <>
          <p className="font-mono text-[20px] font-bold leading-none text-white">{value}</p>
          {/* Izoh joyi HAR DOIM band — aks holda qatordagi kartochkalar turli
              balandlikda bo'lib, KPI panjarasi tishli ko'rinadi.
              `slate-400` (2026-10-23) — `slate-500` qorong'i sirtda o'qilmasdi. */}
          <p className="mt-1 h-[12px] truncate text-[9.5px] leading-none text-slate-400">{hint ?? ""}</p>
        </>
      )}
    </>
  );

  if (!onClick) {
    return (
      <div className="hik-glass-blue rounded-xl px-3 py-2.5" title={title}>
        {body}
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="hik-glass-blue rounded-xl px-3 py-2.5 text-left transition-colors hover:border-ice/30 hover:bg-white/[0.06]"
    >
      {body}
    </button>
  );
}

/** Saralanadigan jadval sarlavhasi. `align` — sonli ustunlar o'ngga. */
export function Th<K extends string>({
  id,
  label,
  sort,
  dir,
  onSort,
  align = "right",
  hint,
}: {
  id: K;
  label: string;
  sort: K;
  dir: SortDir;
  onSort: (key: K) => void;
  align?: "left" | "right";
  hint?: string;
}) {
  const active = sort === id;
  return (
    <th className={`px-2 py-1.5 font-medium ${align === "right" ? "text-right" : "text-left"}`}>
      <button
        type="button"
        onClick={() => onSort(id)}
        title={hint}
        className={`inline-flex items-center gap-1 transition-colors ${
          active ? "text-ice-bright" : "text-slate-400 hover:text-slate-200"
        }`}
      >
        {align === "right" && active && (dir === "asc" ? <CaretUp size={10} weight="fill" /> : <CaretDown size={10} weight="fill" />)}
        <span>{label}</span>
        {align === "left" && active && (dir === "asc" ? <CaretUp size={10} weight="fill" /> : <CaretDown size={10} weight="fill" />)}
      </button>
    </th>
  );
}

export function StatusPill({ status, label }: { status: RegionHealth; label: string }) {
  const tone = STATUS_TONE[status];
  return (
    <span
      style={{ ["--c" as string]: tone }}
      className="inline-flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--c)_45%,transparent)] bg-[color-mix(in_srgb,var(--c)_12%,transparent)] px-1.5 py-0.5 text-[9px] font-semibold text-[color:var(--c)]"
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone }} />
      {label}
    </span>
  );
}

/** Jadval katagidagi ingichka progress — foizni ko'z bilan solishtirish uchun. */
export function CellBar({ pct, tone }: { pct: number; tone: string }) {
  return (
    <div className="ml-auto h-1 w-14 overflow-hidden rounded-full bg-white/[0.07]">
      <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: tone }} />
    </div>
  );
}

/** Foizga qarab rang — davomat/qamrov ustunlari uchun yagona qoida. */
export const rateTone = (pct: number): string => (pct >= 93 ? "#34D399" : pct >= 88 ? "#F59E0B" : "#FB7185");

/**
 * Tab / filtr tugmasi — Statistika kesimlari, Aniqlanganlar kategoriyalari,
 * Kameralar holat filtri va Geo saralash tanlovi UCHALASI shu bitta
 * ko'rinishda bo'lsin.
 *
 * Aktiv fon `layoutId` bilan siljiydi (framer-motion), shuning uchun bitta
 * guruhdagi barcha tugmalar AYNI `group` nomini berishi shart — aks holda
 * fon guruhdan guruhga "uchib" ketadi.
 */
export function TabPill({
  group,
  active,
  onClick,
  Icon,
  gif,
  iconSize = 15,
  children,
  tone,
  title,
  disabled = false,
}: {
  group: string;
  active: boolean;
  onClick: () => void;
  /** Bosilmaydigan tab (masalan "Xodimlar" — manba yo'q, 2026-10-26). */
  disabled?: boolean;
  Icon?: Icon;
  /**
   * GIF ikonka manzili — `Icon` O'RNIGA. Aktiv/hover holatda o'ynaydi,
   * tinch holatda birinchi kadr qotib turadi (`GifIcon`).
   */
  gif?: string;
  /** Ikonka o'lchami (px). GIF uchun ham, `Icon` uchun ham. */
  iconSize?: number;
  children: ReactNode;
  /** Kategoriya rangi (bo'lsa) — Aniqlanganlar tablarida hodisa rangi. */
  tone?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={tone ? { ["--c" as string]: tone } : undefined}
      className={`relative flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? "text-white" : "text-slate-400 enabled:hover:text-slate-200"
      }`}
    >
      {active && (
        <motion.span
          layoutId={group}
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
          className="absolute inset-0 rounded-xl border"
          style={{
            borderColor: tone ? `color-mix(in srgb, ${tone} 55%, transparent)` : "rgba(143,184,255,0.25)",
            background: tone ? `color-mix(in srgb, ${tone} 14%, transparent)` : "rgba(143,184,255,0.10)",
          }}
        />
      )}
      {gif ? (
        <GifIcon src={gif} size={iconSize} play={active} className="relative flex-none" />
      ) : (
        Icon && <Icon size={iconSize} weight={active ? "fill" : "duotone"} className="relative flex-none" />
      )}
      <span className="relative truncate">{children}</span>
    </button>
  );
}

/**
 * Recharts nuqtasi — BOSILADIGAN (`dot`/`activeDot` propiga ELEMENT
 * sifatida beriladi, recharts uni har nuqta uchun `cx`/`cy`/`payload`
 * bilan klonlaydi). Ko'rinadigan doiradan tashqari KATTAROQ ko'rinmas
 * "urish nishoni" bor (`r=9`) — kichik 3 px doirani aniq bosish qiyin.
 *
 * Statistika → Umumiy'dagi "har bir kunni/soatni bosish" talabi uchun
 * (2026-09-10, foydalanuvchi so'rovi) — bir joyda, bir xil bosiladigan
 * nuqta ko'rinishi hamma diagrammada takrorlanmasin.
 *
 * 🔴 **`activeDot`GA HAM BERILISHI SHART** (2026-09-10, foydalanuvchi
 * qayta xabar qildi: "vaqt tugunlarni bosish imkoni bo'lmayabdi, ustiga
 * olib kelib bosish mumkin bo'lsin"). Recharts HOVER paytida nuqta
 * ustiga ALOHIDA "aktiv nuqta" elementini (`activeDot`) chizadi va u
 * doim so'nggi bo'lib qo'shilgani uchun oddiy `dot` elementining
 * USTIDA turadi — agar `activeDot` oddiy `{r, fill}` obyekti bo'lsa (
 * `onClick`SIZ), aynan HOVER qilingan (ya'ni bosmoqchi bo'lingan) nuqta
 * ustida bosilmaydigan qatlam paydo bo'ladi: sichqoncha nuqta ustiga
 * kelgan zahoti "aktiv" holat yoqiladi va shu YANGI, klik tutmaydigan
 * doira pastdagi bosiladigan doirani TO'SIB qo'yadi. Yechim — chaqiruvchi
 * `activeDot` ga ham AYNI `<ClickableDot>` elementini beradi (kattaroq
 * `r` bilan).
 */
export function ClickableDot(props: {
  cx?: number;
  cy?: number;
  payload?: unknown;
  onPick: (payload: unknown) => void;
  tone: string;
  /** Ko'rinadigan doira radiusi — `activeDot` uchun kattaroq beriladi. */
  r?: number;
}) {
  const { cx, cy, payload, onPick, tone, r = 3 } = props;
  if (cx == null || cy == null) return null;
  return (
    <g style={{ cursor: "pointer" }} onClick={() => onPick(payload)}>
      <circle cx={cx} cy={cy} r={Math.max(9, r + 4)} fill="transparent" />
      <circle cx={cx} cy={cy} r={r} fill={tone} stroke="#0B1220" strokeWidth={1} />
    </g>
  );
}

