import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Buildings, MagnifyingGlass, UsersThree, VideoCamera } from "@phosphor-icons/react";
import { useT } from "@/i18n";
import { searchInstitutionRows, type InstitutionRow } from "@/lib/institutionRows";
import { useLiveInstitutions } from "@/hooks/useLiveInstitutions";
import { useAppStore } from "@/store/useAppStore";
import { DashPanel } from "./DashPanel";

/**
 * Dashboard xaritasi ustida suzuvchi — KUZATUVDAGI o'quv muassasalari
 * qidiruvi/ro'yxati.
 *
 * ⚠️ **645 ta "respublika texnikumi" OLIB TASHLANDI** (2026-09-05): ular
 * `lib/regionInstitutes.ts` da GENERATSIYA qilinardi (talaba/kamera/
 * signal sonlari deterministik psevdo-tasodif bilan) va backendda
 * birortasi ham yo'q edi. Ro'yxat endi `config/institutions.ts` dan —
 * haqiqiy obyektlar; ko'rsatkichi bo'lmagani QIZIL belgi bilan turadi.
 *
 * Tanlov `useAppStore.selectedTeknikum` kanaliga yoziladi — o'sha kanaldan
 * header'dagi select, xarita (`Map3D`), 3D kampus va tafsilot paneli
 * (`InstitutionDetail`) oziqlanadi. Shu sabab bu yerda hech qanday lokal
 * "tanlangan" holat YO'Q: qaerdan tanlansa ham hammasi birga o'zgaradi.
 *
 * 🔵 **QIDIRUV-DROPDOWN — 2026-09-07 da qayta qurildi** (foydalanuvchi
 * so'rovi): xarita endi TO'LIQ orqa fonda (`DashboardScreen.tsx`), bu
 * panel esa ustida suzuvchi kichik karta. Ilgari ro'yxat DOIM ochiq edi
 * va butun ustun balandligini olardi — xaritaning katta qismini
 * bekitib turardi. Endi DEFAULT holatda faqat qidiruv maydoni ko'rinadi;
 * unga bosilganda (`onFocus`) ro'yxat PASTDAN sekin animatsiya bilan
 * ochiladi (`AnimatePresence` + `height`), tashqariga bosilsa yoki
 * `Esc` bosilsa yopiladi (`NotificationBell.tsx` dagi bilan AYNI
 * "mousedown tashqarida" naqshi). Muassasa tanlansa ham ro'yxat yopiladi
 * — xarita darhol ko'rinsin.
 */
export function InstitutionsPanel() {
  const t = useT();
  const [query, setQuery] = useState("");
  // Ro'yxat uzun bo'lishi mumkin — yozish paytida input tormozlamasin
  const deferred = useDeferredValue(query);
  const selected = useAppStore((s) => s.selectedTeknikum);
  const setSelected = useAppStore((s) => s.setSelectedTeknikum);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const { institutions: all } = useLiveInstitutions();
  const found = useMemo(() => searchInstitutionRows(deferred, all), [deferred, all]);

  /* Tashqariga bosish yoki Esc — ro'yxatni yopadi. */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (id: string | null) => {
    setSelected(id);
    setOpen(false);
  };

  return (
    <div  ref={rootRef}>
      <DashPanel title={t.institutions.title} subtitle={t.institutions.subtitle} delay={0.05} surface="map-glass-card">
        <div className="flex flex-col gap-2">
          <div className="dv-slot flex flex-none items-center gap-2 py-1.5">
            <MagnifyingGlass size={14} className="flex-none text-ice-cyan/60" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setOpen(true)}
              placeholder={t.institutions.searchPlaceholder}
              className="min-w-0 flex-1 bg-transparent text-[12px] outline-none placeholder:text-slate-500"
            />
          </div>

          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="overflow-hidden"
              >
                <p className="flex-none pb-1.5 text-[9.5px] uppercase tracking-wider text-ice-cyan/50">
                  {t.institutions.count(found.length, all.length)}
                </p>

                <div className="-mr-1.5 max-h-[360px] space-y-2 overflow-y-auto pr-1.5">
                  {found.length === 0 && (
                    <p className="px-1 py-6 text-center text-[11.5px] text-slate-500">{t.institutions.notFound}</p>
                  )}
                  {found.length > 0 && (
                    <Group label={t.institutions.groupMonitored}>
                      {found.map((inst) => (
                        <Row key={inst.id} inst={inst} active={inst.id === selected} onPick={pick} />
                      ))}
                    </Group>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bosish nima berishini aytib turadi — birinchi marta ochgan
              foydalanuvchi ro'yxatni oddiy sanoq deb o'ylamasin. Ro'yxat
              YOPIQ bo'lganda ham ko'rinadi — bu qidiruv nima uchunligini
              tushuntiruvchi doimiy izoh. */}
          {!open && !selected && found.length > 0 && (
            <p className="flex-none border-t border-ice-cyan/15 pt-2 text-[9.5px] leading-snug text-slate-500">
              {t.institutions.emptyHint}
            </p>
          )}
        </div>
      </DashPanel>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="mb-1 px-0.5 text-[9px] uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

const fmt = (n: number, locale: string) => n.toLocaleString(locale).replace(/,/g, " ");

interface RowProps {
  inst: InstitutionRow;
  active: boolean;
  onPick: (id: string | null) => void;
}

function Row({ inst, active, onPick }: RowProps) {
  const t = useT();
  /* Kuzatuv ISHLAYAPTIMI — kamida bitta jonli ko'rsatkich bormi.
     `alerts` hisobga OLINMAYDI: u oqim bo'sh bo'lganda ham `0` bo'lib
     kelishi mumkin va "ulangan" degan yolg'on belgi berardi. */
  const connected = inst.cameras !== null || inst.students !== null;
  return (
    <button
      type="button"
      /* Qayta bosilsa tanlov bekor qilinadi — ro'yxatdan chiqishning eng tez yo'li */
      onClick={() => onPick(active ? null : inst.id)}
      title={inst.monitored ? t.institutions.monitoredHint : inst.name}
      className={`flex w-full items-center gap-2 rounded border px-2 py-1.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ice-cyan/50 ${
        active
          ? "border-ice-cyan/50 bg-ice-cyan/[0.12]"
          : "border-transparent hover:border-ice-cyan/25 hover:bg-ice-cyan/[0.06]"
      }`}
    >
      {/* ── HOLAT NUQTASI — kuzatuv ISHLAYAPTIMI ──
          🟢 yashil — obyektdan jonli ma'lumot kelmoqda (kamera va/yoki
             davomat), 🔴 qizil — hali ulanmagan.

          ⚠️ Ilgari bu yerda `status` (normal/warning/critical) turardi,
          ya'ni "davomat qanday" degan savolga javob berardi. Amalda esa
          faqat 179-maktabda manba bor, qolgan oltitasida yo'q —
          nuqta hammasida bir xil kulrang bo'lib, hech narsa
          ko'rsatmasdi. Endi u ULANISH holatini bildiradi. */}
      <span
        className="h-2 w-2 flex-none rounded-full"
        title={connected ? t.dashboard.ui.inst.live : t.dashboard.ui.inst.notLive}
        style={
          connected
            ? { background: "#22C55E", boxShadow: "0 0 8px #22C55E80" }
            : { background: "#EF4444", boxShadow: "0 0 8px #EF444480" }
        }
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="min-w-0 truncate text-[11.5px] font-semibold text-slate-100">{inst.short}</span>
          {inst.monitored && <Buildings size={11} className="flex-none text-ice-cyan/70" />}
        </span>
        <span className="mt-0.5 flex items-center gap-2 text-[9px] text-slate-500">
          <span className="min-w-0 truncate">{inst.region}</span>
          {/* ⚠️ **FAQAT MANBASI BOR SON CHIZILADI** (2026-09-05,
              foydalanuvchi so'rovi). Ilgari ikkala ustun ham DOIM
              turardi va ulanmagan olti muassasada qatorlar qizil "0"
              lar bilan to'lib ketardi — ro'yxat o'qib bo'lmas edi. */}
          {inst.students !== null && (
            <span className="flex flex-none items-center gap-0.5 font-mono" title={t.dashboard.ui.inst.people}>
              <UsersThree size={9} />
              {fmt(inst.students, t.locale)}
            </span>
          )}
          {inst.cameras !== null && (
            <span className="flex flex-none items-center gap-0.5 font-mono" title={t.common.cameras}>
              <VideoCamera size={9} />
              {inst.cameras}
            </span>
          )}
        </span>
      </span>
      {inst.alerts !== null && inst.alerts > 0 && (
        <span className="flex-none rounded bg-rose-500/15 px-1.5 py-0.5 font-mono text-[9.5px] font-bold text-rose-300">
          {inst.alerts}
        </span>
      )}
    </button>
  );
}
