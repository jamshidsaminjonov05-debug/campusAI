/**
 * "Muassasalar" bo'limi — Hududlar va Muassasalar kesimlari.
 *
 * ⚠️ ILGARI bu ikkalasi Statistika sahifasining ichida tab bo'lib
 * turardi. Sidebar'ga alohida bo'lim sifatida chiqarildi — Statistika
 * endi faqat Umumiy/Shaxslar/Hodisalar bilan cheklanadi, hudud va
 * muassasa kesimi esa o'z sahifasida.
 *
 * ⚠️ **Tab tartibi: HUDUDLAR birinchi, keyin MUASSASALAR** — tabiiy oqim
 * shu: avval hudud tanlanadi, keyin o'sha hududdagi muassasalar ko'rib
 * chiqiladi. Standart aktiv tab baribir "Muassasalar" (rahbar ko'proq
 * bitta obyektni to'g'ridan-to'g'ri qidiradi), faqat TARTIB o'zgardi.
 *
 * ⚠️ **Hudud → muassasa drill-down BITTA SAHIFA ICHIDA.** Ilgari
 * `StatRegions`dagi qatorga bosish Geo Analitikaga sakrab ketardi.
 * Endi `onSelectRegion` shu yerda ushlanadi: `regionFilter` state'ga
 * yoziladi va tab "institutions"ga almashadi — `StatInstitutions` o'sha
 * hududdagi muassasalarni ko'rsatadi (`EduInstitution.regionFull` bo'yicha,
 * `StatRegions`ning `RegionAnalytics.region`i bilan AYNI manbadan
 * quriladi, shuning uchun aniq mos keladi).
 */
"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { Buildings, MagnifyingGlass, MapTrifold, Printer, X } from "@phosphor-icons/react";
import { useT } from "@/i18n";
import { TabPill } from "@/components/common/panels";
import { StatRegions } from "@/components/statistics/StatRegions";
import { StatInstitutions } from "@/components/statistics/StatInstitutions";
import { STAT_PERIODS, useStatPeriod } from "@/hooks/useStatPeriod";

type Tab = "regions" | "institutions";

export function InstitutionsPage() {
  const t = useT();
  const [tab, setTab] = useState<Tab>("institutions");
  /* Statistika → Umumiy → "Muassasalar" kartochkasi HUDUDLAR kesimini
     so'raydi (`useAppStore.institutionsTab`). Iste'mol qilgach kanal
     `null` ga qaytariladi — `personTypeTarget` bilan ayni naqsh. */
  const tabTarget = useAppStore((st) => st.institutionsTab);
  const setTabTarget = useAppStore((st) => st.setInstitutionsTab);
  useEffect(() => {
    if (!tabTarget) return;
    setTab(tabTarget.value);
    setRegionFilter(null);
    setTabTarget(null);
  }, [tabTarget, setTabTarget]);
  const [query, setQuery] = useState("");
  const [regionFilter, setRegionFilter] = useState<string | null>(null);
  const period = useStatPeriod("today");

  const tabs: { id: Tab; label: string; Icon: typeof Buildings }[] = [
    { id: "regions", label: t.stats.tabs.regions, Icon: MapTrifold },
    { id: "institutions", label: t.stats.tabs.institutions, Icon: Buildings },
  ];

  const selectRegion = (region: string) => {
    setRegionFilter(region);
    setTab("institutions");
  };

  return (
    /* ⚠️ `h-full min-h-0` — `App.tsx` dagi `<main>` flex bo'lgani uchun
       endi `flex-1` ham to'g'ri ishlaydi, lekin barcha sahifa ildizi
       shu qoidaga rioya qiladi (CLAUDE.md). */
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="no-print flex flex-none flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          {tabs.map((x) => (
            <TabPill key={x.id} group="inst-tab" active={tab === x.id} onClick={() => setTab(x.id)} Icon={x.Icon}>
              {x.label}
            </TabPill>
          ))}
        </div>

        <div className="flex-1" />

        <div className="flex flex-wrap items-center gap-1.5">
          {STAT_PERIODS.map((p) => (
            <TabPill key={p.id} group="inst-period" active={period.id === p.id} onClick={() => period.setId(p.id)}>
              {p.label}
            </TabPill>
          ))}
          {period.id === "custom" && (
            <span className="flex items-center gap-1">
              <input
                type="date"
                value={period.from}
                max={period.to}
                onChange={(e) => period.setFrom(e.target.value)}
                className="hik-input h-7 px-2 text-[11px] text-slate-200 [color-scheme:dark]"
              />
              <span className="text-slate-500">—</span>
              <input
                type="date"
                value={period.to}
                min={period.from}
                onChange={(e) => period.setTo(e.target.value)}
                className="hik-input h-7 px-2 text-[11px] text-slate-200 [color-scheme:dark]"
              />
            </span>
          )}
        </div>

        <div className="hik-input flex items-center gap-2 px-2.5 py-1.5">
          <MagnifyingGlass size={14} className="flex-none text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tab === "regions" ? t.stats.searchRegion : t.stats.searchInstitution}
            className="w-[220px] bg-transparent text-[11.5px] text-slate-100 outline-none placeholder:text-slate-600"
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} title={t.common.close} className="flex-none text-slate-500 hover:text-slate-200">
              <X size={12} weight="bold" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          title={t.stats.printHint}
          className="hik-chip px-2.5 py-1.5 text-[11px] text-slate-300 transition-colors hover:text-ice-bright"
        >
          <Printer size={14} weight="duotone" />
          {t.stats.print}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
        {tab === "regions" && <StatRegions query={query} onSelectRegion={selectRegion} />}
        {tab === "institutions" && (
          <StatInstitutions
            query={query}
            regionFilter={regionFilter}
            onClearRegion={() => setRegionFilter(null)}
          />
        )}
      </div>
    </div>
  );
}
