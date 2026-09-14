"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowCounterClockwise,
  Buildings,
  Gauge as GaugeIcon,
  GraduationCap,
  MagnifyingGlass,
  Siren,
  VideoCamera,
  X,
} from "@phosphor-icons/react";
import { institutionById } from "@/config/institutions";
import { UNIVERSITIES, universityById } from "@/config/universities";
import { INSTITUTION_ROWS, institutionRowById } from "@/lib/institutionRows";
import { useLiveInstitutions } from "@/hooks/useLiveInstitutions";
import { ARRIVAL_PERIODS } from "@/hooks/useTodayArrivals";
import { TodayArrivalsModal } from "@/components/people/TodayArrivalsModal";
import { useAppStore } from "@/store/useAppStore";
import { GeoMap } from "./GeoMap";
import type { MetricKey } from "@/lib/geoScope";
import { SCALE_BAD, SCALE_MID } from "@/lib/geoScope";
import { TabPill } from "@/components/common/panels";

/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  GEO ANALITIKA — xarita + KUZATUVDAGI MUASSASANING HAQIQIY tahlili   ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * ── IKKI REJIM — "ANIQ STATISTIKA" TUGMASI HAL QILADI ─────────────────
 *
 * · **NAMOYISH** (default): respublika kesimi — saralash ko'rsatkichlari,
 *   viloyat nishonlari, statistika lentasi, muassasalar ro'yxati va katta
 *   hisobot modali (`GeoDemoOverlays`). Sonlar `geoAggregate` dan, ya'ni
 *   645 muassasa uchun GENERATSIYA qilingan — backend hudud kesimini
 *   bermaydi.
 *
 * · **ANIQ STATISTIKA** (`lib/exactMode.ts`): namoyish qatlami butunlay
 *   o'chadi, o'rniga **kuzatuvdagi 179-maktabning** haqiqiy sonlari
 *   chiqadi (`GET /api/v1/faces` + aniqlash oqimi), davr tanlovi bilan.
 *
 * Xaritadagi HAQIQIY qatlamlar (chegaralar, kameralar, trevogalar) har
 * ikki rejimda ham turadi — ular o'lchanadigan narsa.
 */
/** Qidiruv natijasi — muassasa (kuzatuv ro'yxati) yoki oliy ta'lim nuqtasi. */
/**
 * Saralash ko'rsatkichlari — xaritadagi nishon shu bo'yicha rang oladi.
 *
 * ⚠️ Ilgari bu ro'yxat `GeoDemoOverlays.tsx` da edi (o'sha fayl mock
 * qatlami bilan birga o'chirildi) va unda **"Kayfiyat"** ham bor edi —
 * serverda kayfiyat moduli umuman o'rnatilmagani uchun u HECH QACHON
 * haqiqiy son bermasdi, shuning uchun olib tashlandi.
 */
const SORT_OPTIONS: { key: MetricKey; label: string; Icon: typeof GaugeIcon; hint: string }[] = [
  { key: "attendance", label: "Davomat", Icon: GaugeIcon, hint: "Darsga qatnashish ulushi" },
  { key: "alerts", label: "Hodisalar", Icon: Siren, hint: "Faol signallar soni" },
  { key: "cameras", label: "Kameralar", Icon: VideoCamera, hint: "Ishlayotgan kameralar ulushi" },
];

interface SearchHit {
  id: string;
  name: string;
  region: string;
  kind: "inst" | "uni";
}

export function GeoAnalyticsPage() {

  /* Rejim + aniq rejim qamrovi (`useExactScope`): kuzatuvdagi maktabning
     HAQIQIY qatori shu yerdan keladi. */
  const rows = useLiveInstitutions();

  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedCampusId, setSelectedCampusId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [mapReset, setMapReset] = useState(0);
  const [periodId, setPeriodId] = useState("today");
  const [listOpen, setListOpen] = useState(false);
  /* Namoyish qatlami holati */
  const [metric, setMetric] = useState<MetricKey>("attendance");
  const [instOpen, setInstOpen] = useState(false);
  /* OLIY TA'LIM qatlami — `config/universities.ts` dagi nuqtalar.
     Default YOQIQ: sahifaning vazifasi respublika ko'lamini ko'rsatish. */
  const [uniOpen, setUniOpen] = useState(true);
  const [selectedUniversityId, setSelectedUniversityId] = useState<string | null>(null);
  /* Universitet nuqtasiga uchish — `nonce` bir xil nuqta qayta tanlanganda
     ham kadr harakatlansin (`focus` obyekti o'zgarmasa MapLibre qimirlamaydi). */
  const [uniFocus, setUniFocus] = useState<{ lat: number; lng: number; zoom?: number; nonce: number } | null>(null);

  // Ovozli buyruq: "Toshkent viloyatini ko'rsat"
  const voiceRegionTarget = useAppStore((s) => s.voiceRegionTarget);
  const setVoiceRegionTarget = useAppStore((s) => s.setVoiceRegionTarget);
  useEffect(() => {
    if (!voiceRegionTarget) return;
    setSelectedRegion(voiceRegionTarget.value);
    setSelectedCampusId(null);
    setVoiceRegionTarget(null);
  }, [voiceRegionTarget, setVoiceRegionTarget]);

  /* "Muassasalar" bo'limidan — "Xaritada ochish" tugmasi shu muassasani
     TANLANGAN holda ochadi (`pickCampus` bilan bir xil: hudud ham birga
     tanlanadi, xaritada belgilanadi). */
  const voiceCampusTarget = useAppStore((s) => s.voiceCampusTarget);
  const setVoiceCampusTarget = useAppStore((s) => s.setVoiceCampusTarget);
  useEffect(() => {
    if (!voiceCampusTarget) return;
    pickCampus(voiceCampusTarget.value);
    setVoiceCampusTarget(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceCampusTarget, setVoiceCampusTarget]);

  /* ── HAQIQIY SONLAR ──
     Odamlar — `GET /api/v1/faces` (server yig'gan shaxslar), hodisalar —
     aniqlash oqimi. Ikkalasi ham kuzatuv postidan, ya'ni kuzatuvdagi maktabga
     tegishli (`resolveCampus` → `NVR_DEFAULT_CAMPUS_ID`). */
  /* Davr tanlovi "Ro'yxat" oynasiga uzatiladi (`TodayArrivalsModal`
     `initialPeriod`), sahifaning o'zi endi son ko'rsatmaydi. */
  /**
   * Qidiruv — kuzatuvdagi muassasalar + oliy ta'lim nuqtalari.
   *
   * ⚠️ Ilgari namoyish rejimida respublika bo'ylab **645 muassasa**
   * qidirilardi; ularning birortasi ham backendda yo'q edi
   * (`lib/regionInstitutes.ts` generatsiya qilardi).
   */
  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (q.length < 2) return null;
    const inst: SearchHit[] = INSTITUTION_ROWS
      .filter((i) => `${i.name} ${i.short} ${i.region}`.toLowerCase().includes(q))
      .slice(0, 20)
      .map((i) => ({ id: i.id, name: i.name, region: i.region, kind: "inst" }));
    /* OLIY TA'LIM ham qidiruvga tushadi — ular xaritada nuqta bo'lib
       turibdi, lekin ro'yxatsiz ularni topib bo'lmasdi. Bu GEOGRAFIYA,
       generatsiya qilingan son emas. */
    const uni: SearchHit[] = UNIVERSITIES.filter((u) =>
      `${u.name} ${u.short} ${u.region}`.toLowerCase().includes(q)
    )
      .slice(0, 12)
      .map((u) => ({ id: u.id, name: u.name, region: u.region, kind: "uni" }));
    return [...inst, ...uni];
  }, [search]);

  /**
   * Muassasa tanlandi — "Muassasalar → Xaritada ochish" ham shu yerga tushadi.
   *
   * ⚠️ **Kampus tanlovi FAQAT 3D konturi bor obyektga qo'yiladi**
   * (`config/institutions.ts` dagi 7 ta). Qolgan 645 muassasada
   * `public/geojson/campus/*.json` yo'q: `selectedCampusId` qo'yilsa
   * xarita HECH QAYERGA bormay qolardi — kampus effekti bunday id'ni
   * topolmaydi, hudud effekti esa "kampus tanlangan" deb kadrni tashlab
   * ketadi (`MapLibreMap` dagi `campusPickedRef`). Shuning uchun
   * konturi yo'q muassasada faqat VILOYAT tanlanadi.
   */
  function pickCampus(id: string) {
    const inst = institutionById(id);
    setSelectedUniversityId(null);
    setUniFocus(null);
    setSearch("");

    if (!inst) {
      const edu = institutionRowById(id);
      setSelectedCampusId(null);
      setSelectedRegion(edu?.regionFull ?? null);
      return;
    }

    setSelectedCampusId(id);
    setSelectedRegion(inst.region === "Toshkent sh." ? "Toshkent shahri" : inst.region);
  }

  /** Universitet tanlandi — kadr o'sha nuqtaga uchadi (kampus konturi yo'q). */
  function pickUniversity(id: string) {
    const u = universityById(id);
    if (!u) return;
    setSelectedCampusId(null);
    setSelectedUniversityId(id);
    setSelectedRegion(u.region);
    setUniFocus({ lat: u.lat, lng: u.lng, zoom: 15.5, nonce: Date.now() });
    setUniOpen(true);
    setSearch("");
  }

  /** UMUMIY HOLAT — tanlov bo'shatiladi VA xarita respublikaga qaytadi. */
  function resetScope() {
    setSelectedRegion(null);
    setSelectedCampusId(null);
    setSelectedUniversityId(null);
    setUniFocus(null);
    setSearch("");
    setMapReset((v) => v + 1);
  }

  const selected = institutionById(selectedCampusId);
  const selectedUniversity = universityById(selectedUniversityId);

  /**
   * ANIQ rejim nishoni — saralash pilyulalari SHU YERDA ma'no oladi.
   * Qiymat `useExactScope()` bergan HAQIQIY qatordan (kuzatuv posti kanallari,
   * jonli hodisalar, davomat); rang uch pog'onali palitradan.
   */
  /**
   * Kuzatuvdagi muassasa ustidagi HAQIQIY nishon.
   *
   * ⚠️ Ko'rsatkichi noma'lum bo'lsa nishon UMUMAN chizilmaydi — "0%"
   * yozilsa u haqiqiy nol bo'lib o'qilardi.
   */
  const exactMarker = useMemo(() => {
    const row = rows.institutions.find((i) => i.monitored && i.attendance !== null) ?? null;
    if (!row) return null;
    const value =
      metric === "attendance"
        ? row.attendance
        : metric === "alerts"
          ? row.alerts
          : row.cameras && row.cameras > 0
            ? (row.activeCameras ?? 0) / row.cameras
            : null;
    if (value === null) return null;
    const label =
      metric === "attendance"
        ? `${value.toFixed(1)}%`
        : metric === "cameras"
          ? `${Math.round(value * 100)}%`
          : String(value);
    /* Rang — ko'rsatkich MA'NOSIGA qarab: taqqoslanadigan ikkinchi
       obyekt yo'q (kuzatuvda bitta maktab). */
    const bad = metric === "alerts" ? value >= 5 : value < 80;
    const mid = metric === "alerts" ? value >= 2 : value < 92;
    return { id: row.id, label, tone: bad ? SCALE_BAD : mid ? SCALE_MID : null };
  }, [rows.institutions, metric]);


  /* ⚠️ **"Jonli tahlil" paneli SAHIFADAN OLIB TASHLANDI** — uning
     kartochkalari (`kpi`) ham shu bilan kerak emas. `useFaces` so'rovi
     esa qoladi: "Ro'yxat" oynasi (`TodayArrivalsModal`) va davr tanlovi
     shundan oziqlanadi. */

  return (
    /* Xarita BUTUN balandlikni oladi, panellar uning USTIDA suzadi. */
    <div className="relative h-full min-h-0 overflow-hidden rounded-3xl">
      <div className="absolute inset-0">
        <GeoMap
          className="absolute inset-0"
          selectedRegion={selectedRegion}
          onSelectRegion={(r) => {
            setSelectedRegion(r);
            setSelectedCampusId(null);
            setUniFocus(null);
          }}
          selectedCampusId={selectedCampusId}
          onSelectCampus={pickCampus}
          resetNonce={mapReset}
          exactMarker={exactMarker}
          showUniversities={uniOpen}
          selectedUniversityId={selectedUniversityId}
          onSelectUniversity={pickUniversity}
          focusPoint={uniFocus}
        />

        {/* ⚠️ **NAMOYISH QATLAMI OLIB TASHLANDI** (`GeoDemoOverlays`,
            2026-09-05): rang izohi, viloyat nishonlari, muassasalar
            ro'yxati va katta hisobot modali — hammasi 645 ta
            generatsiya qilingan muassasadan qurilardi. */}

        {/* ── Yuqori qator: qidiruv (chap) + davr va saralash (o'ng) ── */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex flex-wrap items-start justify-between gap-3 p-3">
          <div className="pointer-events-auto relative">
            <div className="hik-glass-blue flex items-center gap-2 rounded-xl px-3.5 py-2.5">
              <MagnifyingGlass size={15} className="text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Muassasa qidirish..."
                className="w-60 bg-transparent text-[12.5px] outline-none placeholder:text-slate-500"
              />
              {search && (
                <button onClick={() => setSearch("")} title="Tozalash" className="text-slate-500 hover:text-white">
                  <X size={13} />
                </button>
              )}
            </div>


            {/* Tanlangan OLIY TA'LIM nuqtasi — nomi va HALOL izoh.
                Bu obyektlar kuzatuvda emas, shuning uchun kartochkada
                birorta ham son yo'q: faqat joy, viloyat va ogohlantirish. */}
            {selectedUniversity && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="hik-glass-blue mt-2 w-full rounded-xl border border-violet-400/25 px-3.5 py-2.5"
              >
                <div className="flex items-start gap-2">
                  <span className="mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-lg bg-violet-400/20">
                    <GraduationCap size={13} weight="duotone" className="text-violet-200" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-bold leading-tight text-white">{selectedUniversity.name}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">{selectedUniversity.region}</p>
                    <p className="mt-1 text-[9.5px] leading-snug text-violet-200/70">
                      Taxminiy joylashuv · kuzatuvda emas (kamera va davomat ulanmagan)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUniversityId(null);
                      setUniFocus(null);
                    }}
                    title="Tanlovni bekor qilish"
                    className="flex-none text-slate-500 hover:text-white"
                  >
                    <X size={12} />
                  </button>
                </div>
              </motion.div>
            )}

            <AnimatePresence>
              {results && (
                <motion.ul
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="hik-glass-blue absolute left-0 right-0 top-full z-20 mt-1.5 max-h-[280px] overflow-y-auto rounded-xl p-1"
                >
                  {results.length === 0 && (
                    <li className="px-3 py-3 text-center text-[11.5px] text-slate-500">Hech narsa topilmadi</li>
                  )}
                  {results.map((r) => (
                    <li key={r.id}>
                      <button
                        onClick={() => (r.kind === "uni" ? pickUniversity(r.id) : pickCampus(r.id))}
                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-white/[0.07]"
                      >
                        {r.kind === "uni" ? (
                          <GraduationCap size={12} weight="duotone" className="flex-none text-violet-300" />
                        ) : (
                          <Buildings size={12} className="flex-none text-emerald-400" />
                        )}
                        <span className="min-w-0 flex-1 truncate text-[11.5px] font-medium">{r.name}</span>
                        <span className="flex-none text-[9.5px] text-slate-500">
                          {r.kind === "uni" ? "oliy ta'lim" : r.region}
                        </span>
                      </button>
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>

          {/* ── Yuqori o'ng ustun: davr → saralash → panel ──
              ⚠️ `geo-strip-card` bilan o'raladi: pillar ilgari to'g'ridan-to'g'ri
              xarita ustida (fonsiz) turardi — hudud tanlangach ostidagi viloyat
              nomi/chegara chizig'i bilan aralashib, matn o'qilmay qolardi. */}
          <div className="pointer-events-auto flex max-w-[62%] flex-col items-end gap-2 rounded-xl px-3 py-2.5 geo-strip-card">
            {/* DAVR — HAR IKKI rejimda ham, eng yuqorida.
                ⚠️ Ilgari u faqat aniq rejimdagi panel ICHIDA edi va
                namoyishda umuman yo'q edi; endi geo sahifasi uchun
                YAGONA tanlov. */}
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Davr:</span>
              {ARRIVAL_PERIODS.map((p) => (
                <TabPill key={p.id} group="geo-period" active={periodId === p.id} onClick={() => setPeriodId(p.id)}>
                  {p.label}
                </TabPill>
              ))}
            </div>

            {/* QATLAM — oliy ta'lim nuqtalari. HAR IKKI rejimda ham: bu
                geografiya, generatsiya qilingan son emas. Tugmada SONI
                turadi, chunki ro'yxat statik va aniq. */}
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Qatlam:</span>
              <TabPill
                group="geo-layer"
                active={uniOpen}
                onClick={() => setUniOpen((v) => !v)}
                title="Universitet va institutlar — taxminiy joylashuv, kuzatuvda emas"
              >
                Oliy ta'lim · {UNIVERSITIES.length}
              </TabPill>
            </div>

            {/* SARALASH — kuzatuvdagi muassasaning O'Z ko'rsatkichi
                bo'yicha (xaritadagi nishon shunga qarab rang oladi). */}
            <div className="flex flex-wrap items-center justify-end gap-1.5">
              <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Saralash:</span>
              {SORT_OPTIONS.map((opt) => (
                <TabPill
                  key={opt.key}
                  group="geo-sort"
                  active={metric === opt.key && !instOpen}
                  onClick={() => {
                    setMetric(opt.key);
                    setInstOpen(false);
                  }}
                  Icon={opt.Icon}
                  title={opt.hint}
                >
                  {opt.label}
                </TabPill>
              ))}
            </div>
          </div>
        </div>

        

        {/* ── Tanlangan miqyos + umumiy holatga qaytish ── */}
        <AnimatePresence>
          {(selectedRegion || selectedCampusId) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="hik-glass-blue absolute bottom-3 left-3 z-10 flex items-center gap-2 rounded-xl px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-[9px] uppercase tracking-wide text-slate-400">
                  {selected ? selected.region : "O'zbekiston"}
                </p>
                <p className="truncate text-[12px] font-bold">{selected ? selected.name : selectedRegion}</p>
              </div>
              <button
                onClick={resetScope}
                title="Butun respublikaga qaytish"
                className="flex h-7 flex-none items-center gap-1.5 rounded-lg bg-white/[0.06] px-2.5 text-[11px] font-semibold text-slate-300 hover:bg-white/[0.14] hover:text-white"
              >
                <ArrowCounterClockwise size={13} />
                Umumiy holat
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {listOpen && (
        <TodayArrivalsModal
          title="Kameraga tushgan odamlar"
          initialPeriod={periodId}
          onClose={() => setListOpen(false)}
        />
      )}
    </div>
  );
}
