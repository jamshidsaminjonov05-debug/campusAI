import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useModalHistory } from "@/hooks/useModalHistory";
import { UnsavedExitDialog } from "@/components/common/UnsavedExitDialog";
import { FaceHistoryModalByName } from "./FaceHistoryModal";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search, CheckCircle2, XCircle, Building2, LogOut, AlertTriangle,
  Plus, Pencil, Trash2, Camera as CameraIcon, X, RefreshCcw,
  Smile, Meh, Frown, ScanFace, Printer, Video, ShieldAlert,
} from "lucide-react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { photoUrl, type PersonOut, type PersonPayload, type PersonType } from "@/lib/api";
import { isoDate, useStudentDay } from "@/hooks/useStudentDay";
import { buildPersonDays, type PersonDay } from "@/lib/personDay";
import { absenceSnapshot, getReason, subscribeAbsence } from "@/lib/absenceReasons";
import { useT } from "@/i18n";
import { useStudentLabel } from "@/hooks/useStudentLabel";
import { Pagination } from "@/components/common/Pagination";
import { useAttendance, useCameras, useEvents, useMonthlyAttendance, usePersonMutations, usePersons } from "@/hooks/useApi";
import { FACE_ENGINE_HINT, isFaceEngineError } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";
import { usePermissions } from "@/lib/permissions";
import { EVENT_TYPE_LABELS } from "@/lib/eventLabels";

const PAGE_SIZE = 10;

const EMOTION_ICON: Record<string, { Icon: typeof Smile; cls: string }> = {
  positive: { Icon: Smile, cls: "text-emerald-400" },
  neutral: { Icon: Meh, cls: "text-amber-400" },
  negative: { Icon: Frown, cls: "text-red-400" },
};

export function Avatar({ name, photo, size = 34 }: { name: string; photo?: string | null; size?: number }) {
  const [failed, setFailed] = useState(false);
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const url = photoUrl(photo);
  if (url && !failed) {
    return (
      <img
        src={url}
        alt={name}
        onError={() => setFailed(true)}
        style={{ width: size, height: size }}
        className="flex-none rounded-full object-cover ring-1 ring-ice/25"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.34 }}
      className="grid flex-none place-items-center rounded-full bg-ice/15 font-bold text-ice-soft ring-1 ring-ice/25"
    >
      {initials}
    </div>
  );
}

function FaceBadge({ hasFace }: { hasFace: boolean }) {
  return hasFace ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
      <CheckCircle2 size={12} /> Yuz bor
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-400">
      <XCircle size={12} /> Yuz yo'q
    </span>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-t border-slate-700/30 pt-2.5">
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">{title}</p>
      {children}
    </div>
  );
}

/** Kirish vaqti + kechikish DAQIQASI (kechikkan bo'lsa). */
function EntryCell({ day }: { day?: PersonDay }) {
  if (!day?.entryAt) return <span className="text-slate-600">—</span>;
  return (
    <span className="whitespace-nowrap">
      {day.entryAt}
      {day.lateMin > 0 && <b className="ml-1 font-semibold text-amber-400">+{day.lateMin} daq</b>}
    </span>
  );
}

/** Ichkarida bo'lgan vaqt; hali chiqmagan bo'lsa "hozir ichkarida". */
function InsideCell({ day }: { day?: PersonDay }) {
  if (!day?.present) return <span className="text-slate-600">—</span>;
  if (day.stillInside) return <span className="whitespace-nowrap text-ice-soft">hozir · {day.insideMin} daq</span>;
  return <span className="whitespace-nowrap">{day.insideMin} daq</span>;
}

/**
 * Kelmaganlik sababi — `lib/absenceReasons.ts` reyestridan.
 *
 * Uch holat: SABABLI (hujjatli sabab), SABABSIZ, ANIQLANMAGAN (sabab hali
 * kiritilmagan) — davomat taxtasidagi uchlik bilan AYNI.
 */
function ReasonCell({ day, personId }: { day?: PersonDay; personId: string }) {
  const t = useT();
  /* Sabab reyestri React'dan tashqarida — "Sababni belgilash" oynasida
     kiritilgani DARHOL jadvalga chiqsin. */
  useSyncExternalStore(subscribeAbsence, absenceSnapshot, absenceSnapshot);

  if (!day || day.present) return <span className="text-slate-600">—</span>;
  const r = getReason(isoDate(), personId);
  if (!r) return <StatusChip tone="#64748B" label={t.board.unknown} />;
  const excused = r.code !== "unexcused";
  return (
    <span className="flex flex-wrap items-center gap-1">
      <StatusChip tone={excused ? "#34D399" : "#FB7185"} label={excused ? t.board.excused : t.board.unexcused} />
      <span className="truncate text-[10px] text-slate-500">{t.board.code[r.code]}</span>
    </span>
  );
}

/**
 * Jadvaldagi BUGUNGI holat katagi.
 *
 * Kelmagan bo'lsa — belgilangan sabab ham ko'rsatiladi (`lib/absenceReasons.ts`),
 * ya'ni "Sababni belgilash" oynasida kiritilgani darhol jadvalga chiqadi.
 */
function TodayCell({ day, personId }: { day?: PersonDay; personId: string }) {
  const t = useT();
  /* Sabab reyestri React'dan tashqarida — belgilangani DARHOL ko'rinishi
     uchun unga obuna bo'lamiz (`AttendanceBoard` bilan bir xil naqsh). */
  useSyncExternalStore(subscribeAbsence, absenceSnapshot, absenceSnapshot);

  if (!day) return <span className="text-slate-600">—</span>;
  if (!day.present) {
    const r = getReason(isoDate(), personId);
    return (
      <span className="flex flex-wrap items-center gap-1">
        <StatusChip tone="#FB7185" label="Kelmagan" />
        {r && <span className="text-[10px] text-slate-500">{t.board.code[r.code]}</span>}
      </span>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-1">
      <StatusChip tone={day.late ? "#F59E0B" : "#34D399"} label={day.late ? "Kechikkan" : "Kelgan"} />
      {day.stillInside && <StatusChip tone="#85E0FF" label="Ichkarida" />}
    </span>
  );
}

/** Bugungi holat nishonchasi — kelgan / kechikkan / ichkarida / sabab. */
function StatusChip({ tone, label }: { tone: string; label: string }) {
  return (
    <span
      style={{ ["--c" as string]: tone }}
      className="inline-flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--c)_45%,transparent)] bg-[color-mix(in_srgb,var(--c)_14%,transparent)] px-2 py-0.5 text-[10px] font-semibold text-[color:var(--c)]"
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone }} />
      {label}
    </span>
  );
}

/** `value` matn ham bo'lishi mumkin ("09:14", "ichkarida", "—"). */
function MiniStat({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="rounded-lg border border-slate-700/30 bg-slate-900/40 py-1.5 text-center">
      <p className={`font-mono text-[13px] font-bold ${color}`}>{value}</p>
      <p className="text-[8.5px] text-slate-400">{label}</p>
    </div>
  );
}

/* ------------------------------ Shaxs formasi ------------------------------ */

const EMPTY_PERSON: PersonPayload = {
  first_name: "",
  last_name: "",
  middle_name: "",
  person_code: "",
  person_type: "student",
  group_name: "",
  course: undefined,
  department: "",
  position: "",
  phone: "",
  email: "",
  birth_date: "",
};

function PersonFormModal({
  initial,
  defaultType,
  onClose,
  onSubmit,
  busy,
  error,
}: {
  initial: PersonOut | null;
  defaultType: PersonType;
  onClose: () => void;
  onSubmit: (data: PersonPayload, photo: File | null) => void;
  busy: boolean;
  error: string | null;
}) {
  /* "O'quvchi" ↔ "Talaba" — muassasa turiga qarab (`useStudentLabel`). */
  const student = useStudentLabel();
  const [form, setForm] = useState<PersonPayload>(
    initial
      ? {
          first_name: initial.first_name,
          last_name: initial.last_name,
          middle_name: initial.middle_name ?? "",
          person_code: initial.person_code,
          person_type: initial.person_type,
          group_name: initial.group_name ?? "",
          course: initial.course ?? undefined,
          department: initial.department ?? "",
          position: initial.position ?? "",
          phone: initial.phone ?? "",
          email: initial.email ?? "",
          birth_date: initial.birth_date ?? "",
        }
      : { ...EMPTY_PERSON, person_type: defaultType }
  );
  const [photo, setPhotoFile] = useState<File | null>(null);
  /** Rasm tanlash ham "saqlanmagan ma'lumot" — o'ramdan o'tkazamiz. */
  const setPhoto = (f: File | null) => {
    setDirty(true);
    setPhotoFile(f);
  };
  /* Tanlangan rasm oldindan ko'rinishi. `blob:` havolasi FAYL o'zgarganda
     bo'shatiladi — aks holda xotirada to'planib qolardi. */
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!photo) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);
  /**
   * Formaga TEGILDIMI — "saqlanmagan ma'lumot" ogohlantirishi shunga
   * qaraydi. Faqat maydon o'zgarganda `true` bo'ladi, ya'ni oyna ochib
   * darhol yopgan foydalanuvchi bekorga so'roqqa tutilmaydi.
   */
  const [dirty, setDirty] = useState(false);
  /** Tasdiq so'ralmoqda ("Chiqilsinmi?"). */
  const [confirmExit, setConfirmExit] = useState(false);

  /**
   * YOPISH SO'ROVI — X, Esc, fon bosilishi va brauzerning "◀ orqaga"
   * tugmasi SHU YERGA tushadi.
   *
   * `false` qaytarsa oyna yopilmaydi: `useModalHistory` buni tushunadi va
   * tarix yozuvini qayta qo'yadi (`lib/modalHistory.ts`), ya'ni forma
   * ochiq qolgani holda tarix ham joyida qoladi.
   */
  const requestClose = useCallback((): boolean => {
    if (!dirty || busy) {
      onClose();
      return true;
    }
    setConfirmExit(true);
    return false;
  }, [dirty, busy, onClose]);

  /* ◀ "orqaga" — saqlanmagan ma'lumot bo'lsa avval tasdiq so'raydi. */
  useModalHistory(requestClose);

  /* Esc — X bilan bir xil yo'ldan o'tadi (tasdiq bilan). */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      /* Tasdiq ochiq bo'lsa Esc uni bekor qiladi, formani emas */
      if (confirmExit) setConfirmExit(false);
      else requestClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [requestClose, confirmExit]);

  const set = <K extends keyof PersonPayload>(k: K, v: PersonPayload[K]) => {
    setDirty(true);
    setForm((f) => ({ ...f, [k]: v }));
  };
  const inputCls =
    "w-full rounded-lg border border-blue-500/20 bg-slate-900/60 px-3 py-2 text-[12px] text-slate-200 outline-none placeholder:text-slate-500";

  function submit(e: FormEvent) {
    e.preventDefault();
    onSubmit(form, photo);
  }

  const modal = (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-[#03060E]/85 p-4 backdrop-blur-md"
      onClick={() => requestClose()}
    >
      <motion.form
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="hik-glass-blue max-h-[90vh] w-[480px] max-w-full overflow-y-auto rounded-2xl border border-white/10 bg-ink-panel p-5"
      >
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[14px] font-bold">{initial ? "Shaxsni tahrirlash" : "Yangi shaxs qo'shish"}</p>
          <button type="button" onClick={() => requestClose()} className="text-slate-400 hover:text-white"><X size={17} /></button>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <input value={form.last_name} onChange={(e) => set("last_name", e.target.value)} placeholder="Familiya *" required className={inputCls} />
          <input value={form.first_name} onChange={(e) => set("first_name", e.target.value)} placeholder="Ism *" required className={inputCls} />
          <input value={form.middle_name ?? ""} onChange={(e) => set("middle_name", e.target.value)} placeholder="Otasining ismi" className={inputCls} />
          <input value={form.person_code ?? ""} onChange={(e) => set("person_code", e.target.value)} placeholder="Shaxs kodi (ID)" className={inputCls} />
          <select value={form.person_type} onChange={(e) => set("person_type", e.target.value as PersonType)} className={inputCls}>
            <option value="student">{student.one}</option>
            <option value="teacher">O'qituvchi</option>
            <option value="staff">Xodim</option>
          </select>
          {form.person_type === "student" ? (
            <>
              <input value={form.group_name ?? ""} onChange={(e) => set("group_name", e.target.value)} placeholder="Guruh (masalan 22-IT-1)" className={inputCls} />
              <input
                type="number"
                value={form.course ?? ""}
                onChange={(e) => set("course", e.target.value ? Number(e.target.value) : undefined)}
                placeholder="Kurs"
                min={1}
                max={6}
                className={inputCls}
              />
            </>
          ) : (
            <>
              <input value={form.department ?? ""} onChange={(e) => set("department", e.target.value)} placeholder="Bo'lim / kafedra" className={inputCls} />
              <input value={form.position ?? ""} onChange={(e) => set("position", e.target.value)} placeholder="Lavozim" className={inputCls} />
            </>
          )}
          <input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} placeholder="Telefon" className={inputCls} />
          <input value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} placeholder="Email" className={inputCls} />
          <label className="col-span-2 text-[10.5px] text-slate-400">
            Tug'ilgan sana
            <input
              type="date"
              value={form.birth_date ?? ""}
              onChange={(e) => set("birth_date", e.target.value)}
              className={`${inputCls} mt-1`}
            />
          </label>
          {/* Yuz surati — tanlangач DARHOL ko'rinadi. Ilgari faqat fayl
              nomi yozilardi va to'g'ri rasm tanlanganini tekshirib
              bo'lmasdi. */}
          <label className="col-span-2 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-blue-500/30 bg-slate-900/40 px-3 py-2.5 text-[11.5px] text-slate-300 hover:border-blue-400/60">
            {preview ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={preview} alt="" className="h-12 w-12 flex-none rounded-lg object-cover" />
            ) : (
              <CameraIcon size={15} className="flex-none text-ice-soft" />
            )}
            <span className="min-w-0 flex-1 truncate">
              {photo ? photo.name : "Yuz fotosini tanlash (yuz tanish uchun)"}
            </span>
            {photo && (
              <span
                role="button"
                onClick={(e) => {
                  e.preventDefault();
                  setPhoto(null);
                }}
                className="flex-none text-slate-500 hover:text-rose-400"
                title="Bekor qilish"
              >
                <X size={14} />
              </span>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              className="hidden"
            />
          </label>
        </div>
        {error && <p className="mt-2.5 rounded-lg bg-red-500/10 px-3 py-2 text-[11px] text-red-300">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="mt-4 flex w-full items-center justify-center gap-2 hik-btn-ice rounded-xl py-2.5 text-[13px] disabled:opacity-50"
        >
          {busy && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
          Saqlash
        </button>
      </motion.form>

      {/* ── SAQLANMAGAN MA'LUMOT tasdig'i ──
          Forma ustidan chiqadi (`z-[95]`), ya'ni ma'lumot ko'rinib
          turadi va foydalanuvchi nimadan voz kechayotganini biladi.
          "Orqaga" tugmasi bosilganda ham SHU oyna chiqadi — tarix
          yozuvi esa qayta qo'yilgan (`lib/modalHistory.ts`). */}
      {confirmExit && (
        <UnsavedExitDialog
          onStay={() => setConfirmExit(false)}
          onLeave={() => {
            setConfirmExit(false);
            onClose();
          }}
        />
      )}
    </div>
  );

  /* ⚠️ `document.body` ga PORTAL — sahifa ildizidagi `hik-glass-blue` da
     `backdrop-filter` bor va u `position: fixed` uchun YANGI containing
     block yaratadi. Portalsiz oyna butun ekranni emas, faqat sahifa
     maydonini egallab, chetdan kesilib qolardi (CLAUDE.md, kamera oqimi
     modalida ham AYNI tuzoq). */
  return typeof document === "undefined" ? modal : createPortal(modal, document.body);
}

/* ------------------------------ Profil paneli ------------------------------ */

function ProfilePanel({
  person,
  onEdit,
  onDelete,
  onPhoto,
}: {
  person: PersonOut | null;
  onEdit: (p: PersonOut) => void;
  onDelete: (p: PersonOut) => void;
  onPhoto: (p: PersonOut, f: File) => void;
}) {
  const backendMonthly = useMonthlyAttendance(person?.id ?? null);

  /* Shu shaxsning BUGUNGI kun kesimi — davomat taxtasi bilan ayni manba. */
  const day = useStudentDay(person?.person_type ?? "student");
  const t = useT();
  const today = useMemo(() => {
    if (!person) return null;
    // `placeOf()` matnni `tr()` dan oladi — til almashsa qayta hisoblanadi
    return buildPersonDays(day.persons, day.records, day.cameraName).find((d) => d.id === person.id) ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [person, day.persons, day.records, day.cameraName, t.locale]);

  /** Kelmagan bo'lsa belgilangan sabab (`lib/absenceReasons.ts`). */
  const todayReason = useMemo(() => {
    if (!person || today?.present) return null;
    const r = getReason(isoDate(), person.id);
    return r ? t.board.code[r.code] : null;
  }, [person, today, t]);
  /* Kengroq tanlanma — emotsiya/kamera/kunlik trend hisob-kitoblari shu
     asosda, oxirgi 8 tasi ro'yxatda ko'rsatiladi.

     ⚠️ **MOCK ODAM ZAXIRASI OLIB TASHLANDI** (2026-09-05): ilgari
     ro'yxatda mock odamlar ham bo'lgani uchun ular tanlanganda
     `lib/demoAttendance.ts` dan 14 kunlik SOXTA davomat qurilardi.
     Mock butunlay o'chirildi — ro'yxatda faqat backend shaxslari qoladi,
     ya'ni bu zaxiraga ehtiyoj yo'q. */
  const activity = useAttendance({ person_id: person?.id, limit: 60 });
  const monthly = backendMonthly;
  const { data: cameras } = useCameras();
  const { data: allEvents } = useEvents({ limit: 100 });
  const recentActs = (activity.data ?? []).slice(0, 8);

  const emotionData = useMemo(() => {
    const counts = { positive: 0, neutral: 0, negative: 0 };
    for (const r of activity.data ?? []) {
      if (r.emotion_group && r.emotion_group in counts) counts[r.emotion_group as keyof typeof counts]++;
    }
    return [
      { key: "positive", label: "Pozitiv", value: counts.positive, color: "#22C55E" },
      { key: "neutral", label: "Neytral", value: counts.neutral, color: "#F5D06B" },
      { key: "negative", label: "Negativ", value: counts.negative, color: "#FB7185" },
    ];
  }, [activity.data]);
  const emotionTotal = emotionData.reduce((s, e) => s + e.value, 0);

  const cameraHistory = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of activity.data ?? []) if (r.camera_id) counts.set(r.camera_id, (counts.get(r.camera_id) ?? 0) + 1);
    return Array.from(counts.entries())
      .map(([camId, count]) => ({ camId, count, name: cameras?.find((c) => c.id === camId)?.name ?? `Kamera ${camId.slice(0, 6)}` }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [activity.data, cameras]);

  const dailyTrend = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of activity.data ?? []) {
      const day = new Date(r.timestamp).toLocaleDateString("uz-UZ", { day: "2-digit", month: "2-digit" });
      counts.set(day, (counts.get(day) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([day, count]) => ({ day, count })).slice(-14);
  }, [activity.data]);

  const relatedAlerts = useMemo(() => {
    const camIds = new Set(cameraHistory.map((c) => c.camId));
    return (allEvents ?? []).filter((e) => e.camera_id && camIds.has(e.camera_id)).slice(0, 5);
  }, [allEvents, cameraHistory]);

  const attendancePct =
    monthly.data && monthly.data.working_days > 0
      ? Math.round((monthly.data.present_days / monthly.data.working_days) * 100)
      : null;

  if (!person) {
    return (
      <div className="hik-glass-blue grid min-h-0 place-items-center rounded-2xl px-4 py-3.5 text-center">
        <div>
          <ScanFace size={34} className="mx-auto mb-2 text-slate-600" />
          <p className="text-[12px] text-slate-500">Profilni ko'rish uchun jadvaldan shaxsni tanlang</p>
        </div>
      </div>
    );
  }

  return (
    <div className="hik-glass-blue flex min-h-0 flex-col overflow-y-auto rounded-2xl px-4 py-3.5">
      <AnimatePresence mode="wait">
        <motion.div
          key={person.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="flex flex-col gap-3"
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wide text-ice-soft">Shaxsni aniqlash</p>
            <div className="flex gap-1">
              <button
                onClick={() => window.print()}
                className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-slate-800/60 hover:text-ice-soft"
                title="Hisobotni chop etish"
              >
                <Printer size={14} />
              </button>
              <label className="grid h-7 w-7 cursor-pointer place-items-center rounded-md text-slate-400 hover:bg-slate-800/60 hover:text-ice-soft" title="Foto yuklash">
                <CameraIcon size={14} />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onPhoto(person, f);
                    e.target.value = "";
                  }}
                />
              </label>
              <button
                onClick={() => onEdit(person)}
                className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-slate-800/60 hover:text-white"
                title="Tahrirlash"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => onDelete(person)}
                className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:bg-red-500/15 hover:text-red-400"
                title="O'chirish"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Avatar name={person.full_name} photo={person.photo_path} size={60} />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold leading-tight">{person.full_name}</p>
              <p className="text-[11px] text-slate-400">ID: {person.person_code}</p>
              <p className="truncate text-[11px] text-slate-400">
                {person.person_type === "student"
                  ? `Talaba${person.group_name ? " · " + person.group_name : ""}${person.course ? " · " + person.course + "-kurs" : ""}`
                  : `${person.position ?? (person.person_type === "teacher" ? "O'qituvchi" : "Xodim")}${person.department ? " · " + person.department : ""}`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <FaceBadge hasFace={person.has_face} />
            {person.is_active ? (
              <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-ice-soft">Aktiv</span>
            ) : (
              <span className="rounded-full bg-slate-500/10 px-2 py-0.5 text-[10px] font-bold text-slate-400">Nofaol</span>
            )}
          </div>

          <Section title="Aloqa ma'lumotlari">
            <div className="space-y-1 text-[11.5px]">
              <div className="flex justify-between"><span className="text-slate-400">Telefon</span><span>{person.phone ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Email</span><span className="truncate">{person.email ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Tug'ilgan sana</span><span className="font-mono">{person.birth_date ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Ro'yxatga olingan</span><span className="font-mono">{new Date(person.created_at).toLocaleDateString("uz-UZ")}</span></div>
            </div>
          </Section>

          {/* BUGUNGI holat — davomat taxtasidagi kesimning shu shaxsga
              tegishli qismi. Manba `useStudentDay` → `buildPersonDays()`,
              ya'ni "Shaxslar" bo'limi tepasidagi taxta bilan AYNI hisob:
              bir odam uchun ikki joyda turli xulosa chiqmaydi. */}
          <Section title="Bugungi holat">
            {today ? (
              <>
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                  <StatusChip
                    tone={today.present ? (today.late ? "#F59E0B" : "#34D399") : "#FB7185"}
                    label={today.present ? (today.late ? "Kechikkan" : "Kelgan") : "Kelmagan"}
                  />
                  {today.stillInside && <StatusChip tone="#85E0FF" label="Ichkarida" />}
                  {!today.present && todayReason && <StatusChip tone="#64748B" label={todayReason} />}
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  <MiniStat label="Kirdi" value={today.entryAt ?? "—"} color="text-emerald-400" />
                  <MiniStat label="Chiqdi" value={today.exitAt ?? (today.stillInside ? "ichkarida" : "—")} color="text-ice-soft" />
                  <MiniStat label="Ichkarida" value={today.insideMin > 0 ? `${today.insideMin} daq` : "—"} color="text-slate-200" />
                  <MiniStat label="Kamera" value={today.cameras} color="text-slate-200" />
                </div>
                {today.places.length > 0 && (
                  <p className="mt-1.5 truncate text-[10.5px] text-slate-400" title={today.places.join(" → ")}>
                    {today.places.join(" → ")}
                  </p>
                )}
              </>
            ) : (
              <p className="text-[11px] text-slate-500">Bugungi qayd topilmadi</p>
            )}
          </Section>

          <Section title="Oylik davomat (joriy oy)">
            {monthly.isLoading && <p className="text-[11px] text-slate-500">Yuklanmoqda...</p>}
            {monthly.data ? (
              <div className="grid grid-cols-4 gap-1.5">
                <MiniStat label="Ish kuni" value={monthly.data.working_days} color="text-ice-soft" />
                <MiniStat label="Hozir" value={monthly.data.present_days} color="text-emerald-400" />
                <MiniStat label="Kechikdi" value={monthly.data.late_days} color="text-amber-400" />
                <MiniStat label="Yo'q" value={monthly.data.absent_days} color="text-red-400" />
              </div>
            ) : (
              !monthly.isLoading && <p className="text-[11px] text-slate-500">Davomat ma'lumoti yo'q</p>
            )}
            {attendancePct !== null && (
              <p className="mt-1.5 text-[10.5px] text-slate-400">
                Davomat foizi: <span className="font-mono font-bold text-ice-soft">{attendancePct}%</span>
              </p>
            )}
          </Section>

          <Section title="Kunlik faollik (so'nggi qayd etilgan kunlar)">
            {activity.isLoading ? (
              <p className="text-[11px] text-slate-500">Yuklanmoqda...</p>
            ) : dailyTrend.length > 0 ? (
              <div className="h-[80px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyTrend} margin={{ top: 2, right: 4, bottom: 0, left: -24 }}>
                    <XAxis dataKey="day" tick={{ fill: "#5A6B85", fontSize: 8 }} tickLine={false} axisLine={false} />
                    <YAxis hide />
                    <Tooltip contentStyle={{ background: "#0E1626", border: "1px solid rgba(37,99,235,0.3)", borderRadius: 8, fontSize: 11 }} />
                    <Bar dataKey="count" fill="#8FB8FF" radius={[3, 3, 0, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500">Faollik ma'lumoti yo'q</p>
            )}
          </Section>

          <Section title="Emotsiya statistikasi">
            {activity.isLoading ? (
              <p className="text-[11px] text-slate-500">Yuklanmoqda...</p>
            ) : emotionTotal > 0 ? (
              <div className="flex items-center gap-3">
                <div className="h-[72px] w-[72px] flex-none">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={emotionData} dataKey="value" nameKey="label" innerRadius={20} outerRadius={34} paddingAngle={2}>
                        {emotionData.map((e) => <Cell key={e.key} fill={e.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  {emotionData.map((e) => (
                    <div key={e.key} className="flex items-center gap-1.5 text-[10.5px]">
                      <span className="h-1.5 w-1.5 flex-none rounded-full" style={{ background: e.color }} />
                      <span className="text-slate-300">{e.label}</span>
                      <span className="ml-auto font-mono text-slate-400">{e.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500">Emotsiya ma'lumoti yo'q</p>
            )}
          </Section>

          <Section title="Aniqlangan kameralar">
            {activity.isLoading ? (
              <p className="text-[11px] text-slate-500">Yuklanmoqda...</p>
            ) : cameraHistory.length > 0 ? (
              <div className="space-y-1.5">
                {cameraHistory.map((c) => (
                  <div key={c.camId} className="flex items-center gap-2 text-[11px]">
                    <Video size={12} className="flex-none text-ice-soft" />
                    <span className="min-w-0 flex-1 truncate">{c.name}</span>
                    <span className="font-mono text-slate-400">{c.count} marta</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500">Kamera tarixi topilmadi</p>
            )}
          </Section>

          <Section title="Harakat vaqt chizig'i">
            <div className="relative space-y-2.5 pl-1">
              {recentActs.length > 0 && (
                <div className="absolute bottom-2 left-[11px] top-2 w-px bg-slate-700/40" />
              )}
              {recentActs.map((a) => {
                const emo = a.emotion_group ? EMOTION_ICON[a.emotion_group] : null;
                const isEntry = a.event_type === "entry";
                return (
                  <div key={a.id} className="relative flex items-start gap-2.5">
                    <div
                      className={`relative z-10 mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-full ring-4 ring-ink-panel ${
                        isEntry ? "bg-blue-500/15 text-ice-soft" : "bg-slate-500/15 text-slate-300"
                      }`}
                    >
                      {isEntry ? <Building2 size={12} /> : <LogOut size={12} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold">{isEntry ? "Binoga kirdi" : "Binodan chiqdi"}</p>
                      <p className="font-mono text-[9.5px] text-slate-400">
                        {new Date(a.timestamp).toLocaleString("uz-UZ")}
                      </p>
                    </div>
                    {emo && <emo.Icon size={13} className={`mt-1 ${emo.cls}`} />}
                  </div>
                );
              })}
              {activity.isLoading && (
                <p className="text-[11px] text-slate-500">Yuklanmoqda...</p>
              )}
              {!activity.isLoading && recentActs.length === 0 && (
                <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <AlertTriangle size={12} className="text-slate-600" /> Hozircha faoliyat qayd etilmagan
                </p>
              )}
            </div>
          </Section>

          <Section title="Bog'liq hodisalar (shu shaxs ko'rilgan kameralarda)">
            {activity.isLoading ? (
              <p className="text-[11px] text-slate-500">Yuklanmoqda...</p>
            ) : relatedAlerts.length > 0 ? (
              <div className="space-y-1.5">
                {relatedAlerts.map((e) => (
                  <div key={e.id} className="flex items-center gap-2 text-[11px]">
                    <ShieldAlert size={12} className="flex-none text-amber-400" />
                    <span className="min-w-0 flex-1 truncate">{EVENT_TYPE_LABELS[e.event_type] ?? e.event_type}</span>
                    <span className="font-mono text-[9.5px] text-slate-500">{new Date(e.detected_at).toLocaleString("uz-UZ")}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500">Hodisa aniqlanmadi</p>
            )}
          </Section>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* -------------------------------- Asosiy sahifa -------------------------------- */

interface Props {
  /** Ochilishdagi toifa — "Shaxslar" bo'limi xodimni ham beradi. */
  initialTab: PersonType;
  /** Tab almashsa tashqariga xabar (davomat taxtasi bilan sinxron tursin). */
  onTabChange?: (type: PersonType) => void;
}

export function PeoplePage({ initialTab, onTabChange }: Props) {
  const t = useT();
  /* "O'quvchi" ↔ "Talaba" — muassasa turiga qarab (`useStudentLabel`). */
  const student = useStudentLabel();
  const [tab, setTabRaw] = useState<PersonType>(initialTab);
  const setTab = (type: PersonType) => {
    setTabRaw(type);
    onTabChange?.(type);
  };
  /** "Shaxslar" bo'limi ichida ishlayapmizmi. */
  const embedded = !!onTabChange;
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [groupFilter, setGroupFilter] = useState("all");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("active");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modal, setModal] = useState<"create" | PersonOut | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  /* Ism yoki rasm bosilganda ochiladigan kamera tarixi (`FaceHistoryModal`,
     ism bo'yicha topiladi — aniq FK yo'q, `FaceHistoryModalByName` izohiga
     qarang). */
  const [faceHistoryName, setFaceHistoryName] = useState<string | null>(null);

  // Qidiruvni 300ms kechiktirish — har harfda so'rov ketmasin
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  /* ══ SHAXSLAR — IKKI REJIM ══
     · **Namoyish** (default): backend yozuvlari + MOCK ro'yxat
       (`public/people/people.json`, 500 yozuv, har birida `institutionId`)
       — header'da muassasa almashsa ro'yxat ham almashadi.
     · **Aniq statistika**: FAQAT backend. O'lchandi (2026-09-02):
       2 o'quvchi, 1 o'qituvchi, 0 xodim — ro'yxat qisqa bo'lishi halol
       javob.

     ⚠️ Namoyish rejimida MUASSASA TANLANGAN bo'lsa faqat mock ro'yxat
     ishlatiladi: backend yozuvlari qaysi muassasaga tegishli ekani
     noma'lum (backend `person_type` dan boshqa filtrni qo'llamaydi) va
     ular muassasa almashtirilganda ham turaverardi. */
  const selectedTeknikum = useAppStore((s) => s.selectedTeknikum);

  /**
   * RO'YXAT MANBASI — sahifani SERVER kesadi (1 000 o'quvchi klientga
   * tortilmaydi).
   *
   * ⚠️ Ilgari ikki manba bor edi (backend + mock) va sahifalash IKKI
   * KARRA bajarilardi: serverdan `page=N&page_size=10` so'ralib, kelgan
   * 10 qator yana `slice((N-1)*10, N*10)` bilan kesilardi — 2-sahifa
   * DOIM bo'sh chiqardi, sahifalagich esa "1 / 1" deb turardi. Mock
   * olib tashlangach manba bitta bo'ldi va bu xato ildizi bilan ketdi.
   */
  const serverPaged = true;

  const query = usePersons({
    person_type: tab,
    search: debouncedSearch || undefined,
    group_name: groupFilter !== "all" ? groupFilter : undefined,
    is_active: activeFilter === "all" ? undefined : activeFilter === "active",
    page: page,
    page_size: PAGE_SIZE,
  });
  const { create, update, remove, setPhoto } = usePersonMutations();
  const { can, deniedMessage } = usePermissions();

  const backendRows = useMemo(() => query.data?.items ?? [], [query.data]);
  const mockRows: PersonOut[] = useMemo(() => [], []);

  const allRows = useMemo(() => {
    if (serverPaged) return backendRows;
    const q = debouncedSearch.toLowerCase();
    const base = selectedTeknikum
      ? mockRows
      : [
          ...backendRows,
          ...mockRows.filter((p) => !new Set(backendRows.map((b) => b.full_name)).has(p.full_name)),
        ];
    return base
      .filter((p) => !q || `${p.full_name} ${p.person_code} ${p.group_name ?? ""}`.toLowerCase().includes(q))
      .filter((p) => groupFilter === "all" || p.group_name === groupFilter)
      .filter((p) => activeFilter === "all" || p.is_active === (activeFilter === "active"));
  }, [serverPaged, selectedTeknikum, backendRows, mockRows, debouncedSearch, groupFilter, activeFilter]);

  /* Backend rejimida SERVER allaqachon kerakli sahifani berdi — ikkinchi
     marta kesilmaydi. Namoyishda esa ro'yxat to'liq, shuning uchun
     klientda kesiladi. */
  const rows = serverPaged ? allRows : allRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  /* BUGUNGI kun kesimi — davomat taxtasi va shaxs tafsiloti bilan AYNI
     manba (`useStudentDay` → `buildPersonDays`). Jadvalda ham xuddi shu
     xulosa chiqadi: bitta odam uchun uch joyda uch xil holat bo'lmaydi. */
  const day = useStudentDay(tab);
  const dayById = useMemo(() => {
    const list = buildPersonDays(day.persons, day.records, day.cameraName);
    return new Map(list.map((d) => [d.id, d]));
    // `placeOf()` matni `tr()` dan — til almashsa qayta hisoblanadi
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day.persons, day.records, day.cameraName, t.locale]);
  /* ⚠️ JAMI — backend rejimida SERVER bergan `total`, ro'yxat uzunligi EMAS.
     Ilgari `allRows.length` olinardi: server bir sahifada 10 ta yozuv
     bergani uchun "jami 10" chiqib, sahifalagich HAR DOIM "1 / 1"
     ko'rsatardi — 1 000 o'quvchidan faqat birinchi o'ntasi ochilardi. */
  const total = serverPaged ? (query.data?.total ?? allRows.length) : allRows.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const selected = rows.find((p) => p.id === selectedId) ?? rows[0] ?? null;

  /* Guruh filtri — BUTUN toifadagi guruhlar (`day.persons` — `useStudentDay`
     allaqachon to'liq ro'yxatni olgan, React Query uni takror so'ramaydi).
     ⚠️ Ilgari faqat JORIY SAHIFADAGI 10 qatordan yig'ilardi: 1 000
     o'quvchida ro'yxatda o'nlab guruh bor, filtrda esa bir-ikkitasi
     ko'rinardi. */
  const groupOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of day.persons) if (p.group_name) set.add(p.group_name);
    for (const p of rows) if (p.group_name) set.add(p.group_name);
    if (groupFilter !== "all") set.add(groupFilter);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [day.persons, rows, groupFilter]);

  // Muassasa ham ro'yxatni o'zgartiradi: almashganda 2-sahifada osilib qolmaslik uchun
  useEffect(() => { setPage(1); }, [debouncedSearch, groupFilter, activeFilter, tab, selectedTeknikum]);
  useEffect(() => { setSelectedId(null); setSearch(""); setGroupFilter("all"); }, [tab]);

  // Ovozli buyruq: "Ali Valiyevni top" — App.tsx allaqachon mos tab'ga o'tkazgan, shu yerda qidiruvni to'ldiramiz
  const voicePersonSearch = useAppStore((s) => s.voicePersonSearch);
  const setVoicePersonSearch = useAppStore((s) => s.setVoicePersonSearch);
  useEffect(() => {
    if (!voicePersonSearch || voicePersonSearch.value.personType !== tab) return;
    setSearch(voicePersonSearch.value.query);
    setVoicePersonSearch(null);
  }, [voicePersonSearch, tab, setVoicePersonSearch]);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3000);
  }

  function submitPerson(data: PersonPayload, photo: File | null) {
    setFormError(null);
    const action = modal === "create" ? "person.create" : "person.update";
    if (!can(action)) {
      setFormError(deniedMessage);
      return;
    }
    if (modal === "create") {
      create.mutate(
        { data, photo },
        {
          /* ⚠️ Rasm alohida bosqichda biriktiriladi (`usePersonMutations`
             izohiga qarang). Rasm yiqilsa ham SHAXS saqlangan bo'ladi —
             shuning uchun oyna yopiladi va ogohlantirish xabar sifatida
             chiqadi, xato sifatida emas. */
          onSuccess: ({ person, photoError }) => {
            setModal(null);
            flash(photoError ? `"${person.full_name}" qo'shildi — ${photoError}` : `"${person.full_name}" qo'shildi`);
          },
          onError: (e) => setFormError(e.message),
        }
      );
    } else if (modal) {
      update.mutate(
        { id: modal.id, data },
        {
          onSuccess: (p) => {
            setModal(null);
            flash(`"${p.full_name}" yangilandi`);
            /* Tahrirda ham rasm ALOHIDA so'rov — yuz moduli ishlamasa
               ("onnxruntime") faqat surat saqlanmaydi, tahrirning o'zi
               kuchda qoladi. Xato odam o'qiydigan matnga aylantiriladi. */
            if (photo)
              setPhoto.mutate(
                { id: p.id, photo },
                {
                  onError: (err) =>
                    flash(isFaceEngineError(err.message) ? FACE_ENGINE_HINT : `Surat saqlanmadi: ${err.message}`),
                }
              );
          },
          onError: (e) => setFormError(e.message),
        }
      );
    }
  }

  function handleDelete(p: PersonOut) {
    if (!can("person.delete")) return flash(deniedMessage);
    if (!window.confirm(`"${p.full_name}" ni o'chirasizmi?`)) return;
    remove.mutate(p.id, {
      onSuccess: () => { setSelectedId(null); flash("Shaxs o'chirildi"); },
      onError: (e) => flash(`O'chirish xatosi: ${e.message}`),
    });
  }

  function handlePhoto(p: PersonOut, f: File) {
    setPhoto.mutate(
      { id: p.id, photo: f },
      {
        onSuccess: () => flash("Foto yuklandi va yuz indeksga qo'shildi"),
        onError: (e) => flash(`Foto xatosi: ${e.message}`),
      }
    );
  }

  const selectClass = "rounded-lg border border-blue-500/20 bg-slate-900/60 px-2.5 py-1.5 text-[11px] text-slate-300 outline-none";

  return (
    /* ⚠️ Sahifa ildizida `hik-glass-blue` YO'Q — u butun ekranni qoplab,
       orqadagi blueprint setkasini bekitib qo'yardi. Endi kartochka va
       panellar to'g'ridan-to'g'ri fon ustida "suzadi", setka esa ularning
       shaffof sirtidan ko'rinib turadi. */
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto">
      <AnimatePresence>
        {toast && (
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-xl border border-ice/30 bg-[#16213C]/90 px-4 py-2 text-[12px] font-semibold text-ice-bright shadow-xl backdrop-blur-xl"
          >
            {toast}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Tabs + search.
          ⚠️ Toifa tugmalari "Shaxslar" bo'limida CHIZILMAYDI (`embedded`):
          u yerda davomat taxtasidagi kafellar tanlagich bo'lib xizmat qiladi,
          ikkita tanlagich bir ishni qilib turgani chalkash edi. */}
      <div className="flex flex-none items-center justify-between gap-3">
        <div className={`flex gap-1.5${embedded ? " hidden" : ""}`}>
          {([
            ["student", student.plural],
            ["teacher", "O'qituvchilar"],
            ["staff", "Xodimlar"],
          ] as [PersonType, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-3.5 py-2 text-[12px] font-semibold transition-colors ${
                tab === t ? "bg-gradient-to-b from-[#C4D7FF] to-[#7FA6F2] text-[#0A0F1E] shadow-[0_8px_22px_-8px_rgba(143,184,255,0.5)]" : "hik-glass-blue text-slate-400 hover:text-slate-200"
              }`}
            >
              {label}{tab === t && query.data ? ` (${total})` : ""}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-blue-500/20 bg-slate-900/60 px-3 py-1.5">
            <Search size={14} className="text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ism, familiya yoki kod bo'yicha qidirish..."
              className="w-64 bg-transparent text-[12px] outline-none placeholder:text-slate-500"
            />
          </div>
          <button
            onClick={() => { setFormError(null); setModal("create"); }}
            className="flex items-center gap-1.5 hik-btn-ice rounded-xl px-3 py-2 text-[12px]"
          >
            <Plus size={14} /> Yangi shaxs
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-none flex-wrap items-center gap-2">
        {tab === "student" && (
          <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} className={selectClass}>
            <option value="all">Guruh: barchasi</option>
            {groupOptions.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        )}
        <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value as typeof activeFilter)} className={selectClass}>
          <option value="active">Holat: aktiv</option>
          <option value="inactive">Holat: nofaol</option>
          <option value="all">Holat: barchasi</option>
        </select>
        <button
          onClick={() => query.refetch()}
          className="flex items-center gap-1.5 rounded-lg border border-blue-500/20 bg-slate-900/60 px-2.5 py-1.5 text-[11px] text-slate-300 hover:text-white"
        >
          <RefreshCcw size={12} className={query.isFetching ? "animate-spin" : ""} /> Yangilash
        </button>
        {query.isError && (
          <span className="rounded-lg bg-red-500/10 px-2.5 py-1.5 text-[10.5px] text-red-300">
            Server bilan aloqa xatosi — {query.error instanceof Error ? query.error.message : ""}
          </span>
        )}
        <span className="ml-auto text-[10.5px] text-slate-500">{total} ta natija</span>
      </div>

      {/* Table + profile */}
      <div className="grid min-h-[420px] flex-1 grid-cols-[1fr_360px] gap-3">
        <div className="hik-glass-blue flex min-h-0 flex-col overflow-hidden rounded-2xl">
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <table className="w-full text-left text-[11.5px]">
              <thead className="sticky top-0 z-10 bg-slate-900/95 text-[9.5px] uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-3 py-2 font-semibold">Kod</th>
                  <th className="px-3 py-2 font-semibold">Ism-familya</th>
                  <th className="px-3 py-2 font-semibold">{tab === "student" ? "Guruh / kurs" : "Bo'lim / lavozim"}</th>
                  <th className="px-3 py-2 font-semibold">Yuz</th>
                  {/* BUGUNGI davomat — davomat taxtasidagi kesimning shu
                      shaxsga tegishli qismi */}
                  <th className="px-3 py-2 font-semibold">Bugun</th>
                  <th className="px-3 py-2 font-semibold">Kirdi</th>
                  <th className="px-3 py-2 font-semibold">Ichkarida</th>
                  <th className="px-3 py-2 font-semibold">Sabab</th>
                  <th className="px-3 py-2 font-semibold">Holat</th>
                  <th className="px-3 py-2 font-semibold">Qo'shilgan</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    className={`cursor-pointer border-t border-slate-800/60 transition-colors hover:bg-blue-500/10 ${
                      selected?.id === p.id ? "bg-ice/10" : ""
                    }`}
                  >
                    <td className="px-3 py-2 font-mono text-slate-400">{p.person_code}</td>
                    <td className="px-3 py-2">
                      {/* Ism yoki rasm bosilsa — kamera TARIXI (boshqa
                          ma'no: qatorning qolgani `ProfilePanel` uchun
                          shu KUNning harakatini tanlaydi). `stopPropagation`
                          shart — aks holda qator klikini ham ishga tushirib,
                          ikkala oyna bir vaqtda ochilardi. */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFaceHistoryName(p.full_name);
                        }}
                        title="Kamera tarixini ko'rish"
                        className="flex items-center gap-2 text-left hover:opacity-80"
                      >
                        <Avatar name={p.full_name} photo={p.photo_path} size={26} />
                        <span className="font-semibold">{p.full_name}</span>
                      </button>
                    </td>
                    <td className="px-3 py-2 text-slate-300">
                      {p.person_type === "student"
                        ? `${p.group_name ?? "—"}${p.course ? " · " + p.course + "-kurs" : ""}`
                        : `${p.department ?? "—"}${p.position ? " · " + p.position : ""}`}
                    </td>
                    <td className="px-3 py-2"><FaceBadge hasFace={p.has_face} /></td>
                    <td className="px-3 py-2"><TodayCell day={dayById.get(p.id)} personId={p.id} /></td>
                    <td className="px-3 py-2 font-mono text-slate-300">
                      <EntryCell day={dayById.get(p.id)} />
                    </td>
                    <td className="px-3 py-2 font-mono text-slate-300">
                      <InsideCell day={dayById.get(p.id)} />
                    </td>
                    <td className="px-3 py-2">
                      <ReasonCell day={dayById.get(p.id)} personId={p.id} />
                    </td>
                    <td className="px-3 py-2">
                      {p.is_active ? (
                        <span className="text-emerald-400">Aktiv</span>
                      ) : (
                        <span className="text-slate-500">Nofaol</span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-slate-400">
                      {new Date(p.created_at).toLocaleDateString("uz-UZ")}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-3 py-10 text-center text-slate-500">
                      {query.isLoading ? (
                        "Yuklanmoqda..."
                      ) : (
                        <>
                          Ro'yxat bo'sh —{" "}
                          <button onClick={() => setModal("create")} className="text-blue-400 underline hover:text-ice-soft">
                            birinchi shaxsni qo'shing
                          </button>{" "}
                          yoki Hisobotlar sahifasidan Excel import qiling
                        </>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Sahifalash jadval SKROLLI ICHIDA — panel pastiga qotirilmaydi,
                ro'yxat oxirida turadi (Aniqlanganlar/Kameralar bilan AYNI
                komponent va ayni xatti-harakat). */}
            <div className="mt-auto border-t border-slate-700/30 px-3">
              <Pagination
                page={page}
                totalPages={totalPages}
                onChange={setPage}
                prevLabel="Oldingi"
                nextLabel="Keyingi"
                ariaLabel={`Sahifa ${page} / ${totalPages}`}
              />
            </div>
          </div>
        </div>

        <ProfilePanel
          person={selected}
          onEdit={(p) => { setFormError(null); setModal(p); }}
          onDelete={handleDelete}
          onPhoto={handlePhoto}
        />
      </div>

      <AnimatePresence>
        {modal && (
          <PersonFormModal
            key={modal === "create" ? "create" : modal.id}
            initial={modal === "create" ? null : modal}
            defaultType={tab}
            onClose={() => setModal(null)}
            onSubmit={submitPerson}
            busy={create.isPending || update.isPending}
            error={formError}
          />
        )}
      </AnimatePresence>

      {faceHistoryName && (
        <FaceHistoryModalByName name={faceHistoryName} onClose={() => setFaceHistoryName(null)} />
      )}
    </div>
  );
}
