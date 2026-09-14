/**
 * **Bugungi davomat taxtasi** — dashboard'ning eng yuqori qatori.
 *
 * Vazir/rahbar birinchi qaraydigan savol shu: *bugun kim keldi, kim
 * kelmadi*. To'rtta kafel — **Jami → O'qituvchilar → Xodimlar →
 * O'quvchilar/Talabalar**.
 *
 * ── 2026-09-05 DA QAYTA QURILDI ───────────────────────────────────────
 * · **Panel sarlavhasi lentasi OLIB TASHLANDI** ("Bugungi davomat …
 *   462 ta sabab kiritilmagan … 180/642 · 28% … JONLI"). U bir qatorda
 *   uchta bog'liq bo'lmagan narsani (bo'lim nomi, ogohlantirish,
 *   yig'indi, manba yorlig'i) siqib turardi va kafellardagi sonlarni
 *   TAKRORLARDI — yig'indi endi "Jami" kafelining O'ZIDA.
 * · **Kafel ostidagi sabab bloki OLIB TASHLANDI** ("Kelmagan 19 /
 *   Sababni belgilash / Sababli · Sababsiz · Aniqlanmagan"). U kafel
 *   balandligining yarmini egallardi, holbuki taxtaning asosiy savoli
 *   "kim keldi". Sabab belgilash YO'QOLMADI — "Kelmagan" sonining
 *   O'ZI tugma (`AbsenceReasonModal` o'sha yerdan ochiladi).
 * · **Ko'rinish — Statistika dizayni** (`common/panels.tsx` kafeli:
 *   `hik-glass-blue`, duotone ikonka, mayda uppercase yorliq, mono
 *   qiymat). Ilgari `dv-panel` "katta ekran" ramkasi edi va butun
 *   loyihada FAQAT shu joyda ishlatilardi.
 *
 * ⚠️ **"O'quvchilar" yoki "Talabalar"** — muassasa turiga qarab
 * (`config/institutions.ts` `studentLabelKey`): maktabda o'quvchi,
 * kollej/oliy ta'limda talaba.
 *
 * ⚠️ **XODIM kafeli QIZIL** — kuzatuv posti bu toifani bilmaydi (`supported:false`),
 * ya'ni `0` "hech kim kelmadi" emas, "manba yo'q" degani.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Briefcase, ChalkboardTeacher, type Icon, Student, UsersThree } from "@phosphor-icons/react";
import { useT } from "@/i18n";
import type { PersonType } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";
import { institutionById, institutionKind, studentLabelKey } from "@/config/institutions";
import { useAttendanceBoard } from "@/hooks/useAttendanceBoard";
import { Missing } from "@/components/common/Missing";
import { rateTone } from "@/components/common/panels";
import { AbsenceReasonModal } from "./AbsenceReasonModal";

const TYPE_ICON: Record<PersonType, Icon> = {
  teacher: ChalkboardTeacher,
  staff: Briefcase,
  student: Student,
};

const TYPE_TONE: Record<PersonType, string> = {
  teacher: "#A78BFA",
  staff: "#F59E0B",
  student: "#34D399",
};

/**
 * Kafel tartibi — **Jami BIRINCHI**, keyin o'qituvchi → xodim → o'quvchi.
 *
 * ⚠️ `useAttendanceBoard` dagi `BOARD_TYPES` tartibi O'ZGARTIRILMAYDI —
 * u hisob-kitob tartibi, bu esa KO'RINISH tartibi.
 */
const CARD_ORDER: PersonType[] = ["teacher", "staff", "student"];

export function AttendanceBoard({
  activeType,
  onPickType,
  onPickAll,
}: {
  /** Tanlangan toifa — "Shaxslar" bo'limida kartochka ro'yxatni boshqaradi. */
  activeType?: PersonType;
  /** Berilsa TOIFA kafeli bosiladigan bo'ladi. */
  onPickType?: (type: PersonType) => void;
  /**
   * "Jami" kafeli bosilganda — BARCHA shaxslar ro'yxati oynasi.
   *
   * ⚠️ Ilgari u Statistika → Umumiy ga o'tardi; foydalanuvchi so'rovi
   * bilan u ham qolgan uchtasi kabi Boshqaruv panelining O'ZIDA oyna
   * ochadigan bo'ldi (`AttendanceListModal` `type: "all"`).
   */
  onPickAll?: () => void;
} = {}) {
  const t = useT();
  const board = useAttendanceBoard();
  const [marking, setMarking] = useState<PersonType | null>(null);
  /* "O'quvchilar" ↔ "Talabalar" — tanlangan muassasa turiga qarab. */
  const selected = useAppStore((s) => s.selectedTeknikum);
  const studentLabel = t.board.type[studentLabelKey(institutionKind(institutionById(selected)))];

  const open = board.categories.find((c) => c.type === marking) ?? null;

  return (
    <motion.section
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="grid flex-none grid-cols-2 gap-2.5 lg:grid-cols-4"
    >
      {/* Jami — BIRINCHI kafel. Bosilsa Statistika → Umumiy. */}
      <Tile
        Icon={UsersThree}
        tone="#85E0FF"
        label={t.board.type.all}
        onPick={onPickAll}
        pickHint={t.board.openOverview}
        total={board.totals.total}
        present={board.totals.present}
        late={board.totals.late}
        absent={board.totals.absent}
        rate={board.totals.rate}
        weekend={board.isWeekend}
        accent
        compact
      />

      {CARD_ORDER.map((type) => {
        const c = board.categories.find((x) => x.type === type);
        if (!c) return null;
        return (
          <Tile
            key={type}
            Icon={TYPE_ICON[type]}
            tone={TYPE_TONE[type]}
            label={type === "student" ? studentLabel : t.board.type[type]}
            total={c.total}
            present={c.present}
            late={c.late}
            absent={c.absent}
            rate={c.rate}
            /* Manbasi yo'q toifa (xodim) — QIZIL, nol emas */
            missing={!c.supported}
            weekend={board.isWeekend}
            active={activeType === type}
            compact
            onPick={onPickType ? () => onPickType(type) : undefined}
            pickHint={t.board.openList}
            onMarkAbsence={c.absent > 0 ? () => setMarking(type) : undefined}
          />
        );
      })}

      {open && (
        <AbsenceReasonModal
          type={open.type}
          date={board.date}
          absentees={open.absentees}
          onClose={() => setMarking(null)}
        />
      )}
    </motion.section>
  );
}

/* ──────────────────────────────── Kafel ─────────────────────────────── */

/**
 * Davomat kafeli — **"Aniqlanganlar" KPI qatori bilan AYNI ko'rinish**
 * (`.cam-kpi`, 2026-09-05 foydalanuvchi so'rovi): rangli kvadrat
 * ikonka, katta son, ostida nom va izoh, o'ng chetda so'niq "suv
 * belgisi" ikonkasi.
 *
 * ⚠️ Uslub `src/index.css` dagi `.cam-kpi*` qoidalaridan — ATAYLAB
 * takrorlanmadi: rang `--c` orqali beriladi, ya'ni bitta qoida butun
 * panelga yetadi va keyin bir joyda o'zgartirilsa hamma joyda o'zgaradi.
 */
function Tile({
  Icon,
  tone,
  label,
  total,
  present,
  late,
  absent,
  rate,
  missing = false,
  weekend = false,
  accent = false,
  compact = false,
  active = false,
  onPick,
  pickHint,
  onMarkAbsence,
}: {
  Icon: Icon;
  tone: string;
  label: string;
  total: number;
  present: number;
  late: number;
  absent: number;
  rate: number;
  /** Manba umuman yo'q — sonlar o'rniga so'niq belgi. */
  missing?: boolean;
  /** Dam olish kuni — foiz/kelgan soni chizilmaydi (yuqoridagi izoh). */
  weekend?: boolean;
  /** "Jami" kafeli — sian ramka bilan ajratiladi. */
  accent?: boolean;
  /**
   * Pastki sonlar qatorini CHIZMASLIK.
   *
   * ⚠️ HOZIR TO'RTALA KAFELDA HAM YOQIQ: kafel faqat NOM va SONni
   * beradi, tafsilot esa bosilganda ochiladigan ro'yxatda
   * (`AttendanceListModal`). Prop SAQLANGAN — qatorni qaytarish
   * kerak bo'lsa bitta so'z o'chiriladi.
   */
  compact?: boolean;
  active?: boolean;
  onPick?: () => void;
  /** Kafel bosilganda nima bo'lishi — hover izohi. */
  pickHint?: string;
  /** "Kelmagan" soni bosilganda — sabab belgilash oynasi. */
  onMarkAbsence?: () => void;
}) {
  const t = useT();

  return (
    /* ⚠️ `div` — ichida "Kelmagan" TUGMASI bo'lishi mumkin, tugma ichida
       tugma HTML'da noto'g'ri. Klaviatura uchun `role`/`tabIndex` qo'lda. */
    <div
      onClick={onPick}
      title={onPick ? pickHint : undefined}
      role={onPick ? "button" : undefined}
      tabIndex={onPick ? 0 : undefined}
      onKeyDown={
        onPick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onPick();
              }
            }
          : undefined
      }
      style={{ ["--c" as string]: tone }}
      className={`cam-kpi${onPick ? " is-link" : ""}${
        accent ? " ring-1 ring-ice-cyan/25" : ""
      }${active ? " ring-1 ring-ice/50" : ""}`}
    >
      <Icon size={58} weight="fill" className="cam-kpi-ghost" />
      <span className="cam-kpi-chip">
        <Icon size={18} weight="fill" />
      </span>

      <span className="min-w-0 flex-1">
        {/* Asosiy son — RO'YXATDAGI shaxslar soni: kafelning savoli
            "nechta odam", foiz esa yonida qo'shimcha. */}
        <span className="cam-kpi-num">
          {missing ? <Missing source="kuzatuv posti /attendance · role=staff" /> : total}
        </span>
        <span className="cam-kpi-label">{label}</span>
        <span className="cam-kpi-hint">
          {missing ? (
            t.dashboard.ui.noSource
          ) : weekend ? (
            /* 🔵 DAM OLISH KUNI — foiz va "kelgan" soni CHIZILMAYDI
               (2026-09-13): u kuni davomat serverda umuman baholanmaydi,
               ya'ni `0%` "hech kim kelmadi" emas, "hisoblanmagan" degani. */
            <span className="text-slate-500">{t.board.weekend}</span>
          ) : (
            <>
              <b className="font-semibold" style={{ color: rateTone(rate) }}>
                {rate}%
              </b>{" "}
              · {t.board.present} {present}
              {late > 0 ? ` · ${t.board.late} ${late}` : ""}
            </>
          )}
        </span>
      </span>

      {/* Kelmaganlar — sabab belgilash oynasi.
          ⚠️ `stopPropagation`: kafelning O'ZI ham bosiladi. */}
      {!missing && onMarkAbsence && (
        <button
          type="button"
          title={t.board.markHint}
          onClick={(e) => {
            e.stopPropagation();
            onMarkAbsence();
          }}
          className="relative flex-none rounded-lg border border-rose-400/25 bg-rose-500/[0.08] px-2 py-1
                     text-center transition-colors hover:border-rose-400/60 hover:bg-rose-500/15"
        >
          <span className="block font-mono text-[13px] font-bold leading-none text-rose-300">{absent}</span>
          <span className="mt-0.5 block text-[8.5px] uppercase tracking-wide text-rose-300/70">
            {t.board.absent}
          </span>
        </button>
      )}
      {/* `compact` — pastki sonlar qatori bu ko'rinishda umuman yo'q
          (hammasi yuqoridagi `cam-kpi-hint` da), shuning uchun prop
          faqat moslik uchun qoldirilgan. */}
      {!compact && null}
    </div>
  );
}
