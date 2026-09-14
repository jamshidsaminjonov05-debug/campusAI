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
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { CaretDown, CaretUp, type Icon } from "@phosphor-icons/react";
import { GifIcon } from "@/components/common/GifIcon";
import type { RegionHealth } from "@/lib/institutionRows";
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

export function KpiTile({
  Icon,
  label,
  value,
  hint,
  tone,
  onClick,
  title,
  demo = false,
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
}) {
  const body = (
    <>
      <div className="mb-1 flex items-center gap-1.5" style={{ color: tone }}>
        <Icon size={14} weight="duotone" />
        <span className="truncate text-[9px] uppercase tracking-wide opacity-85">{label}</span>
        {demo && (
          <span
            title="Bu son to'qilgan — backend bu ko'rsatkichni bermayapti"
            className="ml-auto flex-none rounded border border-amber-400/40 bg-amber-400/10 px-1 py-px
                       text-[8px] font-bold uppercase tracking-wide text-amber-300"
          >
            demo
          </span>
        )}
      </div>
      <p className="font-mono text-[20px] font-bold leading-none text-white">{value}</p>
      {/* Izoh joyi HAR DOIM band — aks holda qatordagi kartochkalar turli
          balandlikda bo'lib, KPI panjarasi tishli ko'rinadi */}
      <p className="mt-1 h-[12px] truncate text-[9.5px] leading-none text-slate-500">{hint ?? ""}</p>
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
}: {
  group: string;
  active: boolean;
  onClick: () => void;
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
      title={title}
      style={tone ? { ["--c" as string]: tone } : undefined}
      className={`relative flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11.5px] font-semibold transition-colors ${
        active ? "text-white" : "text-slate-400 hover:text-slate-200"
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

