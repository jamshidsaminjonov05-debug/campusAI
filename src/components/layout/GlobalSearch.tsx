import { useEffect, useState, type ReactNode } from "react";
import { Search, GraduationCap, Users, Camera as CameraIcon, Building2, AlertTriangle } from "lucide-react";
import { usePersons, useCameras } from "@/hooks/useApi";
import { useAppStore } from "@/store/useAppStore";
import { useStudentLabel } from "@/hooks/useStudentLabel";
import { EVENT_TYPE_LABELS } from "@/lib/eventLabels";
import type { EventTypeCode } from "@/services/voice/VoiceCommands";
import { useInstitutions } from "@/hooks/useInstitutions";
import { useT } from "@/i18n";

/**
 * Header'dagi universal qidiruv — talaba/o'qituvchi, kamera, muassasa va hodisa
 * turlarini bitta joydan topadi. Natijaga bosish tegishli sahifani ochib, kerakli
 * elementni avtomatik tanlaydi (VoiceProvider bilan bir xil store kanallaridan
 * foydalanadi — alohida navigatsiya mantig'i qayta yozilmaydi).
 */
export function GlobalSearch() {
  const t = useT();
  const msg = useT();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const active = debounced.length >= 2;
  const persons = usePersons({ search: active ? debounced : undefined, page_size: 5 });
  const { data: cameras } = useCameras();
  const { data: institutions } = useInstitutions();

  /* "O'quvchi" ↔ "Talaba" — muassasa turiga qarab. */
  const student = useStudentLabel();
  const setActivePage = useAppStore((s) => s.setActivePage);
  const setSelectedTeknikum = useAppStore((s) => s.setSelectedTeknikum);
  const setVoicePersonSearch = useAppStore((s) => s.setVoicePersonSearch);
  const setVoiceCameraCommand = useAppStore((s) => s.setVoiceCameraCommand);
  const setVoiceEventFilter = useAppStore((s) => s.setVoiceEventFilter);

  if (!active) {
    return (
      <div className="hik-input flex w-[240px] items-center gap-2 px-3 py-2">
        <Search size={14} className="flex-none text-slate-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={t.search.placeholder}
          className="w-full bg-transparent text-[12px] outline-none placeholder:text-slate-500"
        />
      </div>
    );
  }

  const q = debounced.toLowerCase();
  const personRows = (persons.data?.items ?? []).filter((p) => p.person_type !== "staff").slice(0, 5);
  const cameraRows = (cameras ?? []).filter((c) => c.name.toLowerCase().includes(q) || (c.location ?? "").toLowerCase().includes(q)).slice(0, 4);
  // Muassasalar — FAQAT kuzatuvdagilar (3D kampusi bor). Respublika
  // texnikumlari qidiruvdan olib tashlandi: ular header select'ida ham yo'q,
  // tanlansa 3D kampus ochilmasdi.
  const institutionRows = (institutions ?? []).filter(
    (i) => i.name.toLowerCase().includes(q) || i.short.toLowerCase().includes(q) || i.region.toLowerCase().includes(q)
  ).slice(0, 4);
  const eventRows = (Object.entries(EVENT_TYPE_LABELS) as [EventTypeCode, string][]).filter(([, label]) => label.toLowerCase().includes(q)).slice(0, 4);
  const hasResults =
    personRows.length > 0 || cameraRows.length > 0 || institutionRows.length > 0 || eventRows.length > 0;

  function close() {
    setQuery("");
    setOpen(false);
  }

  function openPerson(p: (typeof personRows)[number]) {
    const personType = p.person_type === "teacher" ? "teacher" : "student";
    setActivePage("Shaxslar");
    setVoicePersonSearch({ query: p.full_name, personType });
    close();
  }

  function openCamera(c: NonNullable<typeof cameras>[number]) {
    const index = (cameras ?? []).findIndex((cam) => cam.id === c.id) + 1;
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

  function openEventType(code: EventTypeCode) {
    setActivePage("Hodisalar");
    setVoiceEventFilter({ eventType: code });
    close();
  }

  return (
    <div className="relative w-[240px]">
      <div className="hik-input flex items-center gap-2 px-3 py-2">
        <Search size={14} className="flex-none text-slate-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={t.search.placeholder}
          className="w-full bg-transparent text-[12px] outline-none placeholder:text-slate-500"
        />
      </div>

      {open && (
        <div className="hik-glass-blue absolute right-0 top-[calc(100%+8px)] z-50 max-h-[420px] w-[340px] overflow-y-auto rounded-2xl p-2">
          {!hasResults && persons.isLoading && (
            <p className="px-3 py-4 text-center text-[11.5px] text-slate-500">Qidirilmoqda...</p>
          )}
          {!hasResults && !persons.isLoading && (
            <p className="px-3 py-4 text-center text-[11.5px] text-slate-500">Natija topilmadi</p>
          )}

          {personRows.length > 0 && (
            <SearchGroup label={`${student.plural} / O'qituvchilar`}>
              {personRows.map((p) => (
                <SearchRow
                  key={p.id}
                  Icon={p.person_type === "teacher" ? GraduationCap : Users}
                  title={p.full_name}
                  subtitle={p.person_type === "teacher" ? "O'qituvchi" : `Talaba${p.group_name ? " · " + p.group_name : ""}`}
                  onClick={() => openPerson(p)}
                />
              ))}
            </SearchGroup>
          )}

          {cameraRows.length > 0 && (
            <SearchGroup label="Kameralar">
              {cameraRows.map((c) => (
                <SearchRow
                  key={c.id}
                  Icon={CameraIcon}
                  title={c.name}
                  subtitle={c.location ?? (c.is_active ? "Onlayn" : "Oflayn")}
                  onClick={() => openCamera(c)}
                />
              ))}
            </SearchGroup>
          )}

          {institutionRows.length > 0 && (
            <SearchGroup label={msg.header.groupMonitored}>
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

          {eventRows.length > 0 && (
            <SearchGroup label="Hodisa turlari">
              {eventRows.map(([code, label]) => (
                <SearchRow key={code} Icon={AlertTriangle} title={label} subtitle="Hodisalarni filtrlash" onClick={() => openEventType(code)} />
              ))}
            </SearchGroup>
          )}
        </div>
      )}
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
