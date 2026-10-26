import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Search, GraduationCap, Users, Camera as CameraIcon, Building2 } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useStudentLabel } from "@/hooks/useStudentLabel";
import { useInstitutions } from "@/hooks/useInstitutions";
import { useNvrChannels } from "@/hooks/useNvrChannels";
import { useNvrPeople } from "@/hooks/useNvrPeople";
import { cameraPlaceLabel } from "@/config/cameraPlacements";
import type { NvrPerson } from "@/lib/nvr/nvrApi";
import { useT } from "@/i18n";
import { EmptyState } from "@/components/common/EmptyState";

/**
 * Header'dagi universal qidiruv — o'qituvchi/o'quvchi, kamera va muassasani
 * bitta joydan topadi. Natijaga bosish tegishli sahifani ochib, kerakli
 * elementni avtomatik tanlaydi (VoiceProvider bilan bir xil store kanallaridan
 * foydalanadi — alohida navigatsiya mantig'i qayta yozilmaydi).
 *
 * 🔴 **SHAXSLAR — KUZATUV POSTI YUZ BAZASIDAN (2026-10-26).** Ilgari
 * `usePersons` → eski backend `/api/v1/persons` edi; hozirgi server bu yo'lga
 * HTML qaytaradi, ya'ni odam qidiruvi HECH QACHON natija bermasdi va har
 * sahifada bekorga so'rov ketardi. Endi `listPeople` (`/people?search=`) —
 * "Shaxslar" bo'limi ko'rsatadigan AYNI ro'yxat; 2 harfdan oldin so'rov yo'q.
 * Kameralar — faqat qurilma kanallari (Kameralar sahifasi bilan bir xil
 * tartib, `openCamera` INDEKS yuboradi).
 *
 * ⚠️ **Natijalar ro'yxati `document.body` ga PORTAL orqali chiqadi va `fixed`
 * turadi** (`NotificationBell` bilan AYNI naqsh, 2026-10-22). Ilgari u header
 * ichida `absolute z-50` edi — header `nexa-card` → `backdrop-filter` YANGI
 * stacking context yaratadi, ichkaridagi `z-50` esa `<main>` dagi sahifa
 * mazmuni USTIGA CHIQA OLMAYDI. Joylashuv qidiruv maydonining
 * `getBoundingClientRect()` idan hisoblanadi, oyna o'lchami/skroll
 * o'zgarganda qayta o'lchanadi.
 */
/** Natijalar ro'yxatining kengligi (px) — joylashuv hisobida ham ishlatiladi. */
const MENU_W = 340;

export function GlobalSearch() {
  const t = useT();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  /** Ro'yxat joylashuvi — AYNAN qidiruv maydoni ostida, CHAP cheti bilan tekis
   *  (foydalanuvchi so'rovi: "poiskni tagida chiqsin"). Oynadan o'ngga
   *  sig'masa chapga suriladi. */
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const measure = useCallback(() => {
    const el = boxRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ top: r.bottom + 8, left: Math.max(8, Math.min(r.left, window.innerWidth - MENU_W - 8)) });
  }, []);

  useEffect(() => {
    if (!open) return;
    measure();
    window.addEventListener("resize", measure);
    // `capture` — ichki skroll konteynerlari ham hisobga olinsin
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, measure]);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const active = debounced.length >= 2;
  const people = useNvrPeople({ search: active ? debounced : undefined, limit: 5 }, { enabled: active });
  const nvr = useNvrChannels();
  const { data: institutions } = useInstitutions();

  /* "O'quvchi" ↔ "Talaba" — muassasa turiga qarab. */
  const student = useStudentLabel();
  const setActivePage = useAppStore((s) => s.setActivePage);
  const setSelectedTeknikum = useAppStore((s) => s.setSelectedTeknikum);
  const setVoicePersonSearch = useAppStore((s) => s.setVoicePersonSearch);
  const setVoiceCameraCommand = useAppStore((s) => s.setVoiceCameraCommand);

  /* 🔴 ILGARI SHU YERDA `if (!active) return <boshqa daraxt>` BOR EDI — 2 harfdan
     kam bo'lsa komponent ildizi boshqa element edi va ikkinchi harf yozilganda
     React `<input>` ni O'CHIRIB QAYTA YARATARDI → fokus yo'qolardi (2026-10-22).
     Endi daraxt DOIM bitta, faqat ro'yxat `open && active` bilan ko'rsatiladi. */

  const q = debounced.toLowerCase();
  const personRows: NvrPerson[] = active ? (people.data?.people ?? []).slice(0, 5) : [];
  const cameraRows = nvr.cameras
    .filter((c) => {
      const place = cameraPlaceLabel(String(c.channel), c.name).toLowerCase();
      return c.name.toLowerCase().includes(q) || place.includes(q) || String(c.channel) === q;
    })
    .slice(0, 4);
  // Muassasalar — FAQAT kuzatuvdagilar (3D kampusi bor).
  const institutionRows = (institutions ?? []).filter(
    (i) => i.name.toLowerCase().includes(q) || i.short.toLowerCase().includes(q) || i.region.toLowerCase().includes(q)
  ).slice(0, 4);
  const hasResults =
    personRows.length > 0 || cameraRows.length > 0 || institutionRows.length > 0;

  function close() {
    setQuery("");
    setOpen(false);
  }

  /** "Shaxslar" ochiladi, `FaceDatabasePage` ismni o'z qidiruviga qo'yadi. */
  function openPerson(p: NvrPerson) {
    setActivePage("Shaxslar");
    setVoicePersonSearch({ query: p.full_name, personType: p.role });
    close();
  }

  function openCamera(c: (typeof nvr.cameras)[number]) {
    const index = nvr.cameras.findIndex((cam) => cam.id === c.id) + 1;
    setActivePage("Kameralar");
    setVoiceCameraCommand({ selectIndex: index });
    close();
  }

  /** Kuzatuvdagi muassasa — dashboard ochilib, 3D kampus shu obyektga o'tadi. */
  function openInstitution(id: string) {
    setActivePage("Boshqaruv paneli");
    setSelectedTeknikum(id);
    close();
  }

  /* Sirt `geo-strip-card` (opaq) — default `hik-glass-blue` bg-white/4%,
     ostidagi xarita/kafellar ko'rinib matn o'qilmay qolardi. `z-[70]` —
     sahifa mazmunidan (max z-40) yuqori, to'liq ekranli oynalardan
     (`z-[80]`…) past — qo'ng'iroq menyusi bilan bir xil qatlam. */
  const menu = open && active ? (
    <div
      style={{ top: pos?.top ?? 0, left: pos?.left ?? 0, width: MENU_W }}
      className="geo-strip-card fixed z-[70] max-h-[min(420px,70vh)] max-w-[92vw] overflow-y-auto rounded-2xl p-2"
    >
      {!hasResults && people.isLoading && (
        <p className="px-3 py-4 text-center text-[11.5px] text-slate-500">{t.search.searching}</p>
      )}
      {!hasResults && !people.isLoading && (
        <EmptyState compact className="py-4" title={t.search.noResults} />
      )}

      {personRows.length > 0 && (
        <SearchGroup label={t.search.groupPeople}>
          {personRows.map((p) => (
            <SearchRow
              key={p.id}
              Icon={p.role === "teacher" ? GraduationCap : Users}
              title={p.full_name}
              subtitle={p.role === "teacher" ? t.board.type.teacher : `${student.one}${p.note ? " · " + p.note : ""}`}
              onClick={() => openPerson(p)}
            />
          ))}
        </SearchGroup>
      )}

      {cameraRows.length > 0 && (
        <SearchGroup label={t.search.groupCameras}>
          {cameraRows.map((c) => (
            <SearchRow
              key={c.id}
              Icon={CameraIcon}
              title={cameraPlaceLabel(String(c.channel), c.name)}
              subtitle={`${t.search.cameraSub(String(c.channel))} · ${c.is_active ? t.search.online : t.search.offline}`}
              onClick={() => openCamera(c)}
            />
          ))}
        </SearchGroup>
      )}

      {institutionRows.length > 0 && (
        <SearchGroup label={t.header.groupMonitored}>
          {institutionRows.map((i) => (
            <SearchRow
              key={i.id}
              Icon={Building2}
              title={i.name}
              subtitle={i.region}
              onClick={() => openInstitution(i.id)}
            />
          ))}
        </SearchGroup>
      )}

    </div>
  ) : null;

  return (
    <div ref={boxRef} className="relative w-[240px]">
      <div className="hik-input flex items-center gap-2 px-3 py-2">
        <Search size={14} className="flex-none text-slate-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={t.search.placeholder}
          aria-label={t.search.placeholder}
          className="w-full bg-transparent text-[12px] outline-none placeholder:text-slate-500"
        />
      </div>
      {typeof document !== "undefined" && createPortal(menu, document.body)}
    </div>
  );
}

function SearchGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-1.5 last:mb-0">
      <p className="px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function SearchRow({
  Icon,
  title,
  subtitle,
  onClick,
}: {
  Icon: typeof Users;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-white/[0.06]"
    >
      <span className="grid h-7 w-7 flex-none place-items-center rounded-lg bg-ice/10 text-ice-soft">
        <Icon size={13} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12px] font-semibold text-slate-100">{title}</span>
        <span className="block truncate text-[10px] text-slate-500">{subtitle}</span>
      </span>
    </button>
  );
}
