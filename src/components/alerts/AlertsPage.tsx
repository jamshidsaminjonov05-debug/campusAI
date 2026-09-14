/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  OGOHLANTIRISHLAR — hali TASDIQLANMAGAN aniqlanishlar                ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * Sidebar'da **ikkinchi** o'rinda: operator ishni "menga nima kutyapti"
 * degan savoldan boshlaydi, keyin tafsilotga tushadi.
 *
 * ── "Aniqlanganlar" dan FARQI ─────────────────────────────────────────
 * | | Ogohlantirishlar | Aniqlanganlar |
 * |---|---|---|
 * | Nima ko'rsatadi | FAQAT tasdiqlanmagani | HAMMASI (butun tarix) |
 * | Vazifasi | ish navbati — ko'rib chiqilishi kerak | arxiv / qidiruv |
 * | Yozuv yo'qoladimi | ha — tasdiqlangach ro'yxatdan chiqadi | yo'q |
 *
 * ── "TASDIQLANGAN" QAYERDA SAQLANADI ──────────────────────────────────
 * `lib/detectionSeen.ts` — `localStorage`, chunki **serverda bunday
 * maydon YO'Q** (`FRONTEND.md` da hodisada `seen`/`acknowledged` yo'q,
 * `BACKEND.md` 5-band bo'lib so'ralgan). Ya'ni hozircha tasdiq SHU
 * BRAUZERDAGI operatorga tegishli: boshqa kompyuterda ochilsa ro'yxat
 * yana to'la ko'rinadi. Server bu maydonni bergan kunda faqat o'sha
 * fayl almashtiriladi, bu sahifa TEGILMAYDI.
 *
 * ⚠️ Manba — `useDetections` (React Query), header'dagi qo'ng'iroq bilan
 * AYNI so'rov kaliti: ikkalasi bitta keshdan o'qiydi, qo'shimcha yuk yo'q.
 */
"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BellRinging, Checks, ListChecks, ShieldWarning, WarningOctagon } from "@phosphor-icons/react";
import { useDetections } from "@/hooks/useDetections";
import { detectionLevel } from "@/lib/detectionLevel";
import { markSeen, seenVersion, subscribeSeen, unseenOf } from "@/lib/detectionSeen";
import type { NvrEvent } from "@/lib/nvrApi";
import { DetectionCard } from "@/components/detections/DetectionCard";
import { EventDossier } from "@/components/detections/EventDossier";
import { Pagination } from "@/components/common/Pagination";
import { KpiTile, StatPanel, TabPill } from "@/components/common/panels";
import { useAppStore } from "@/store/useAppStore";
import { useT } from "@/i18n";

/** Ro'yxat filtri — jiddiylik bo'yicha. */
type Level = "all" | "alarm" | "warn";

/**
 * So'raladigan yozuvlar soni.
 *
 * ⚠️ Qo'ng'iroq bilan AYNI qiymat (`limit: 100`) — bir xil so'rov kaliti
 * bitta keshga tushsin. Sonni o'zgartirsangiz `NotificationBell` dagini
 * ham o'zgartiring, aks holda ikkita alohida so'rov ketadi.
 */
const LIMIT = 100;

/** Bitta sahifada nechta kartochka — "Aniqlanganlar"dagi bilan AYNI (24). */
const PAGE_SIZE = 24;

export function AlertsPage() {
  const t = useT();
  const [level, setLevel] = useState<Level>("all");
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<number | null>(null);
  const setActivePage = useAppStore((s) => s.setActivePage);

  /* Kesim almashsa 1-sahifaga qaytariladi — aks holda "Xavfli" 40 ta
     bo'lsa-yu foydalanuvchi "Hammasi"da 3-sahifada tursa, ro'yxat
     bo'sh ko'rinardi. */
  const changeLevel = (l: Level) => {
    setLevel(l);
    setPage(1);
  };

  /* Tasdiq reyestri React'dan tashqarida — tugma bosilishi bilan ro'yxat
     DARHOL qisqarishi uchun unga obuna bo'lamiz (`seenVersion` snapshot). */
  const seenTick = useSyncExternalStore(subscribeSeen, seenVersion, () => 0);

  const q = useDetections({ category: "all", limit: LIMIT });

  const { pending, alarms, warns } = useMemo(() => {
    const list = unseenOf(q.events as NvrEvent[]);
    return {
      pending: list,
      alarms: list.filter((e) => detectionLevel(e) === "alarm"),
      warns: list.filter((e) => detectionLevel(e) === "warn"),
    };
    // `seenTick` — reyestr o'zgarganda qayta hisoblanadi
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.events, seenTick]);

  const rows = level === "alarm" ? alarms : level === "warn" ? warns : pending;

  /* Sahifalash — KLIENTDA (ro'yxat allaqachon to'liq yuklangan, `LIMIT`
     bilan cheklangan). Tasdiqlash tugmasi bosilganda `rows` qisqaradi —
     `safePage` shu zahoti ortiqcha sahifadan qaytaradi, alohida effekt
     kerak emas (`useNvrEvents`dagi `safePage` bilan AYNI naqsh). */
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = rows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const confirm = (ids: readonly (string | number)[]) => markSeen(ids.map(String));

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* ── Yuqori qator: KPI + amallar ─────────────────────────────── */}
      <div className="grid flex-none gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        <KpiTile
          Icon={BellRinging}
          tone="#F59E0B"
          label={t.alerts.kpi.pending}
          value={pending.length}
          hint={t.alerts.kpi.pendingHint}
        />
        <KpiTile
          Icon={WarningOctagon}
          tone="#FB7185"
          label={t.alerts.kpi.alarm}
          value={alarms.length}
          hint={t.alerts.kpi.alarmHint}
          onClick={() => changeLevel("alarm")}
        />
        <KpiTile
          Icon={ShieldWarning}
          tone="#FBBF24"
          label={t.alerts.kpi.warn}
          value={warns.length}
          hint={t.alerts.kpi.warnHint}
          onClick={() => changeLevel("warn")}
        />
        <KpiTile
          Icon={ListChecks}
          tone="#85E0FF"
          label={t.alerts.kpi.all}
          value={q.total ?? q.events.length}
          hint={t.alerts.kpi.allHint}
          onClick={() => setActivePage("Aniqlanganlar")}
        />
      </div>

      {/* ── Ro'yxat ─────────────────────────────────────────────────── */}
      <StatPanel
        title={t.alerts.listTitle}
        hint={t.alerts.listHint}
        className="min-h-0 flex-1"
        right={
          <div className="flex items-center gap-1.5">
            <TabPill group="alerts-level" active={level === "all"} onClick={() => changeLevel("all")}>
              {t.alerts.level.all}
            </TabPill>
            <TabPill group="alerts-level" active={level === "alarm"} onClick={() => changeLevel("alarm")}>
              {t.alerts.level.alarm}
            </TabPill>
            <TabPill group="alerts-level" active={level === "warn"} onClick={() => changeLevel("warn")}>
              {t.alerts.level.warn}
            </TabPill>
            {/* Hammasini tasdiqlash — KO'RINAYOTGAN kesim uchun */}
            <button
              type="button"
              disabled={rows.length === 0}
              onClick={() => confirm(rows.map((e) => e.id))}
              title={t.alerts.confirmAllHint}
              className="ml-1 flex items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-400/10
                         px-2.5 py-1.5 text-[10.5px] font-semibold text-emerald-300 transition-colors
                         hover:bg-emerald-400/20 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-emerald-400/10"
            >
              <Checks size={13} weight="bold" />
              {t.alerts.confirmAll}
            </button>
          </div>
        }
      >
        <div className="flex h-full flex-col overflow-y-auto pr-1">
          {q.isLoading && rows.length === 0 ? (
            <p className="py-10 text-center text-[11px] text-slate-500">{t.alerts.loading}</p>
          ) : rows.length === 0 ? (
            <Empty allDone={pending.length === 0} />
          ) : (
            <>
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                <AnimatePresence initial={false}>
                  {pageRows.map((ev) => (
                    <motion.div
                      key={ev.id}
                      layout
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col gap-1.5"
                    >
                      <DetectionCard ev={ev} onOpen={() => setOpenId(ev.id)} />
                      {/* Tasdiqlash — kartochkani ro'yxatdan chiqaradi.
                          ⚠️ ma'lumotlarni ochish tasdiqlamaydi: operator ko'rib
                          chiqib, ATAYLAB tasdiqlashi kerak. */}
                      <button
                        type="button"
                        onClick={() => confirm([ev.id])}
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-white/10
                                   bg-white/[0.04] py-1.5 text-[10.5px] font-semibold text-slate-300
                                   transition-colors hover:border-emerald-400/40 hover:bg-emerald-400/10 hover:text-emerald-300"
                      >
                        <Checks size={12} weight="bold" />
                        {t.alerts.confirm}
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
              <Pagination
                page={safePage}
                totalPages={totalPages}
                onChange={setPage}
                prevLabel={t.detections.prev}
                nextLabel={t.detections.next}
                ariaLabel={t.detections.page(safePage)}
                className="mt-auto"
              />
            </>
          )}
        </div>
      </StatPanel>

      {/* Hodisa ma'lumotlari — "Aniqlanganlar" dagi bilan AYNI oyna */}
      <EventDossier eventId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}

/** Bo'sh holat — sabab OCHIQ yoziladi (nol jim turmasin). */
function Empty({ allDone }: { allDone: boolean }) {
  const t = useT();
  return (
    <div className="grid h-full place-items-center py-12 text-center">
      <div className="flex max-w-[320px] flex-col items-center gap-2">
        <Checks size={26} weight="duotone" className={allDone ? "text-emerald-400" : "text-slate-500"} />
        <p className="text-[12px] font-semibold text-slate-200">
          {allDone ? t.alerts.emptyAll : t.alerts.emptyFiltered}
        </p>
        <p className="text-[10.5px] leading-snug text-slate-500">{t.alerts.emptyHint}</p>
      </div>
    </div>
  );
}
