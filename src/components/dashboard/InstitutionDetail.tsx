import { useState } from "react";
import { motion } from "framer-motion";
import { Warning, SecurityCamera, Gauge as GaugeIcon, GraduationCap, UsersThree, X } from "@phosphor-icons/react";
import { Icon as LucideIcon } from "@phosphor-icons/react";
import { useT } from "@/i18n";
import { useStudentLabel } from "@/hooks/useStudentLabel";
import { STATUS_COLOR, type InstitutionRow, type Metric } from "@/lib/institutionRows";
import { useLiveInstitution } from "@/hooks/useLiveInstitutions";
import { Missing } from "@/components/common/Missing";
import { useAppStore } from "@/store/useAppStore";
import { AttendanceListModal } from "./AttendanceListModal";
import { AlertsListModal, CamerasListModal } from "./InstitutionStatModals";
import { isoDate } from "@/hooks/useStudentDay";
import type { PersonType } from "@/lib/api";
import { DashPanel } from "./DashPanel";

interface Props {
  inst: InstitutionRow;
}

/**
 * Ko'rsatkichlar TAG-MA-TAG chiqishi uchun (2026-09-07, foydalanuvchi
 * so'rovi: "o'ng tomonidagi panellar transformX bilan o'ngda asta sekin
 * tagma tag ko'rinishi kerak"). `staggerChildren` — har `Stat` o'zidan
 * oldingisidan sal keyin boshlanadi; `x: 18 → 0` — `transform:
 * translateX(...)`ning O'ZI (framer-motion `x` proplari shuni beradi).
 */
const statListVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};
const statItemVariants = {
  hidden: { opacity: 0, x: 18 },
  show: { opacity: 1, x: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } },
};

/**
 * Tanlangan muassasa haqidagi ma'lumot — dashboard o'ng ustuni.
 *
 * Ro'yxatdan, xarita markeridan yoki header'dagi select'dan tanlansa ham shu
 * panel ochiladi (manba bitta — `useAppStore.selectedTeknikum`).
 * ⚠️ **Raqamlar FAQAT haqiqiy manbadan** (`useLiveInstitution` — kuzatuv posti
 * kanallari, jonli hodisalar, kuzatuv posti davomati). Ilgari ikkinchi manba ham
 * bor edi: `lib/eduInstitutions.ts` dagi formulaga qurilgan namoyish
 * sonlari. U olib tashlandi — manbasi yo'q maydon endi QIZIL
 * "ma'lumot yo'q" bo'lib turadi, nol EMAS.
 */
export function InstitutionDetail({ inst }: Props) {
  const t = useT();
  const setSelected = useAppStore((s) => s.setSelectedTeknikum);
  /* "O'quvchi" ↔ "Talaba" — muassasa turiga qarab (`useStudentLabel`). */
  const student = useStudentLabel();

  /**
   * Ochilgan oyna — HAR BIR ko'rsatkich o'zinikini ochadi
   * (2026-09-05, foydalanuvchi so'rovi). `null` — hech biri.
   *
   * ⚠️ Ilgari sonlar oddiy MATN edi: "32/32 kamera" deb turardi-yu,
   * QAYSI kamera ekanini ko'rishning yo'li yo'q edi.
   */
  const [modal, setModal] = useState<PersonType | "all" | "cameras" | "alerts" | null>(null);
  const live = useLiveInstitution(inst.id);
  const row = live ?? inst;
  const fmt = (n: number) => n.toLocaleString(t.locale).replace(/,/g, " ");

  return (
    <DashPanel
      title={t.institutions.detailTitle}
      subtitle={t.institutions.detailSubtitle}
      delay={0.15}
      className="min-h-0 flex-1"
      surface="map-glass-card"
    >
      <motion.div
        /* Boshqa muassasa tanlansa panel qayta chiziladi — o'tish sezilsin */
        key={inst.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="-mr-1.5 flex h-full min-h-0 flex-col gap-2.5 overflow-y-auto pr-1.5"
      >
        {/* Sarlavha: nom, hudud, holat */}
        <header className="flex flex-none items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-bold leading-tight text-white">{inst.name}</p>
            <p className="mt-0.5 truncate text-[10px] text-slate-400">{inst.region}</p>
          </div>
          <button
            type="button"
            onClick={() => setSelected(null)}
            title={t.institutions.clear}
            className="grid h-6 w-6 flex-none place-items-center rounded text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={14} />
          </button>
        </header>

        <div className="flex flex-none flex-wrap items-center gap-1.5">
          {/* Holat — o'lchangan sonlardan. Manba bo'lmasa QIZIL belgi. */}
          {row.status ? (
            <span
              className="rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide"
              style={{ background: `${STATUS_COLOR[row.status]}22`, color: STATUS_COLOR[row.status] }}
            >
              {t.institutions.status[row.status]}
            </span>
          ) : (
            <Missing source="kuzatuv posti /attendance · /channels" />
          )}
        </div>

        {/* Asosiy ko'rsatkichlar — tag-ma-tag suzib chiqadi (pastdagi
            `statListVariants`/`statItemVariants` izohiga qarang). */}
        <motion.div
          key={`stats-${inst.id}`}
          variants={statListVariants}
          initial="hidden"
          animate="show"
          className="grid flex-none grid-col gap-1.5"
        >
          <Stat
            Icon={UsersThree}
            label={student.plural}
            v={row.students}
            fmt={fmt}
            tone="#8FB8FF"
            onOpen={() => setModal("student")}
          />
          <Stat
            Icon={GraduationCap}
            label={t.institutions.stat.teachers}
            v={row.teachers}
            fmt={fmt}
            tone="#A78BFA"
            onOpen={() => setModal("teacher")}
          />
          <Stat
            Icon={GaugeIcon}
            label={t.institutions.stat.attendance}
            v={row.attendance}
            fmt={(n) => `${n}%`}
            tone="#34D399"
            onOpen={() => setModal("all")}
          />
          {/* ⚠️ **KAYFIYAT kartochkasi OLIB TASHLANDI** — serverda modul
              umuman o'rnatilmagan (`ultralytics` yo'q), ya'ni bu son
              HECH QACHON haqiqiy bo'lmasdi (`BACKEND.md` 6-band). */}
          <Stat
            Icon={SecurityCamera}
            label={t.institutions.stat.cameras}
            v={row.cameras}
            fmt={(n) => `${row.activeCameras ?? "?"}/${n}`}
            tone="#85E0FF"
            onOpen={() => setModal("cameras")}
          />
          <Stat
            Icon={Warning}
            label={t.institutions.stat.alerts}
            v={row.alerts}
            fmt={String}
            tone="#FB7185"
            onOpen={() => setModal("alerts")}
          />
        </motion.div>

        {/* ⚠️ **"3D KAMPUSNI OCHISH" TUGMASI OLIB TASHLANDI** (2026-09-07):
            markazdagi `Map3D` endi Hodisalar HUD'idagi bilan AYNI
            3D kampus renderini DOIM ko'rsatadi (ko'rinishlar orasida
            almashtiradigan ikkinchi sahna qolmadi), ya'ni bu tugma
            ortiqcha bo'lib qoldi. */}
      </motion.div>

      {/* ── Ko'rsatkich oynalari — Boshqaruv panelidan CHIQMASDAN ── */}
      {(modal === "student" || modal === "teacher" || modal === "staff" || modal === "all") && (
        <AttendanceListModal
          type={modal}
          date={isoDate()}
          title={
            modal === "all"
              ? t.institutions.stat.attendance
              : modal === "student"
                ? student.plural
                : t.institutions.stat.teachers
          }
          onClose={() => setModal(null)}
        />
      )}
      {modal === "cameras" && <CamerasListModal onClose={() => setModal(null)} />}
      {modal === "alerts" && <AlertsListModal onClose={() => setModal(null)} />}
    </DashPanel>
  );
}

/**
 * Bitta ko'rsatkich. `v === null` — manba yo'q, QIZIL belgi chiziladi
 * (nol ko'rsatilmaydi: "0 kamera" bilan "kameralar soni noma'lum"
 * boshqa-boshqa javob).
 */
function Stat({
  Icon,
  label,
  v,
  fmt,
  tone,
  onOpen,
}: {
  Icon: LucideIcon;
  label: string;
  v: Metric;
  fmt: (n: number) => string;
  tone: string;
  /** Berilsa kafel BOSILADIGAN bo'ladi — o'z oynasini ochadi. */
  onOpen?: () => void;
}) {
  const t = useT();
  const body = (
    <>
      <div className="mb-0.5 flex items-center gap-1" style={{ color: tone }}>
        <Icon size={11} />
        <span className="truncate text-[8.5px] uppercase tracking-wide opacity-80">{label}</span>
      </div>
      {v === null ? (
        <Missing />
      ) : (
        <p className="truncate font-mono text-[14px] font-bold leading-none text-white">{fmt(v)}</p>
      )}
    </>
  );

  if (!onOpen) return <motion.div variants={statItemVariants} className="dv-slot">{body}</motion.div>;
  return (
    <motion.button
      variants={statItemVariants}
      type="button"
      onClick={onOpen}
      title={t.dashboard.ui.inst.openList(label)}
      className="dv-slot text-left transition-colors hover:border-ice/40 hover:bg-ice/[0.08]"
    >
      {body}
    </motion.button>
  );
}
