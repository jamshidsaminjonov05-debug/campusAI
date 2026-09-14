"use client";

/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  SHAXSNING BOSHQA HODISALARI — janjal / chekish / qurol / telefon    ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * 🔵 **2026-09-14, foydalanuvchi so'rovi:** shaxs panelida o'sha odamga
 * tegishli, YUZ TANISHDAN BOSHQA hodisalar ham ko'rinsin.
 *
 * 🔴 **SERVER BU BOG'LANISHNI BERMAYDI.** O'lchandi (`NvrEvent`,
 * `lib/nvrApi.ts`): `face` hodisasida `face_id`/`person` bor, ya'ni KIM
 * ekani ma'lum; `gun`/`janjal`/`smoking` hodisasida esa faqat `targets`,
 * `boxes`, `alert` — odam raqami UMUMAN YO'Q. Ya'ni "bu janjal shu
 * o'quvchiniki" degan xulosa API'da mavjud emas.
 *
 * Vaqt/kamera yaqinligi bilan TAXMIN qilish mumkin edi, lekin bitta
 * kadrda bir necha odam turadi — begona odamning janjali nomi ma'lum
 * bolaga yozilib qolardi. Bola haqidagi ayblov taxminga qurilmaydi,
 * shuning uchun (foydalanuvchi tanlovi bilan) **bog'lanishni OPERATOR
 * tasdiqlaydi**: ro'yxatdan hodisa tanlanadi va shaxsga biriktiriladi.
 *
 * ⚠️ Biriktirilganlar `localStorage` da (`lib/personIncidents.ts`) —
 * SHU BRAUZERDA qoladi. Server hodisa↔shaxs maydonini bergan kunda
 * faqat o'sha fayl almashtiriladi.
 *
 * ⚠️ Tanlash ro'yxatida hodisalar shu odam ko'ringan KAMERALAR bo'yicha
 * tartiblanadi (mos kameradagilari tepada, "shu kamerada" belgisi
 * bilan) — bu YORDAM, isbot emas; qaror baribir operatorniki.
 */

import { useMemo, useState, useSyncExternalStore } from "react";
import { useQueries } from "@tanstack/react-query";
import { useT } from "@/i18n";
import { Plus, Prohibit, X } from "@phosphor-icons/react";
import { DetectionThumb } from "@/components/detections/DetectionThumb";
import { cameraPlaceLabel } from "@/config/cameraPlacements";
import { listEvents, nvrDateTime, type NvrCategory, type NvrEvent } from "@/lib/nvrApi";
import {
  incidentsOf,
  incidentsVersion,
  isLinked,
  linkIncident,
  subscribeIncidents,
  unlinkIncident,
  type PersonIncident,
} from "@/lib/personIncidents";

/** Yuz TANISHDAN boshqa — "zararli" toifalar (serverda mavjud bo'lganlari). */
const INCIDENT_CATEGORIES: NvrCategory[] = ["janjal", "gun", "smoking"];

/** Toifa rangi — `lib/detectionTypes.ts` dagi ranglar bilan mos. */
const CAT_TONE: Record<string, string> = {
  janjal: "#f43f5e",
  gun: "#e879f9",
  smoking: "#e2603a",
  face: "#8FB8FF",
};

/** Tanlash ro'yxatida nechta hodisa ko'rsatiladi (toifa bo'yicha). */
const PICK_LIMIT = 40;

export function PersonIncidents({
  subjectKey,
  cameras,
  onOpenEvent,
}: {
  /** Reyestr kaliti — `personKey(id)` yoki `faceKey(id)`. */
  subjectKey: string;
  /** Shu odam ko'ringan kanallar — tanlash ro'yxatini tartiblash uchun. */
  cameras: string[];
  /** Biriktirilgan hodisa bosilganda — to'liq dossiye. */
  onOpenEvent: (eventId: number) => void;
}) {
  const u = useT().people.panel;
  const [picking, setPicking] = useState(false);
  /* Reyestr React'dan tashqarida (`localStorage`) — o'zgarishi darhol
     ko'rinishi uchun obuna bo'lamiz (`detectionSeen` bilan AYNI naqsh:
     snapshot sifatida OBYEKT emas, VERSIYA sanog'i qaytadi). */
  useSyncExternalStore(subscribeIncidents, incidentsVersion, () => 0);
  const linked = incidentsOf(subjectKey);

  return (
    <>
      <div className="flex flex-col gap-1.5">
        {linked.length === 0 ? (
          <p className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-[10.5px] leading-snug text-slate-500">
            {u.incidentsEmpty}
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {linked.map((i) => (
              <LinkedRow key={i.eventId} i={i} onOpen={() => onOpenEvent(i.eventId)} onRemove={() => unlinkIncident(subjectKey, i.eventId)} />
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={() => setPicking(true)}
          className="mt-0.5 flex items-center justify-center gap-1.5 rounded-lg border border-ice/25 bg-ice/[0.06] px-3 py-2 text-[11px] font-semibold text-ice-bright transition-colors hover:border-ice/50 hover:bg-ice/[0.12]"
        >
          <Plus size={12} weight="bold" />
          {u.incidentAdd}
        </button>
      </div>

      {picking && (
        <IncidentPicker
          subjectKey={subjectKey}
          cameras={cameras}
          onClose={() => setPicking(false)}
        />
      )}
    </>
  );
}

/** Biriktirilgan hodisa qatori. */
function LinkedRow({ i, onOpen, onRemove }: { i: PersonIncident; onOpen: () => void; onRemove: () => void }) {
  const u = useT().people.panel;
  const tone = CAT_TONE[i.category] ?? "#94A3B8";
  return (
    <li className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-2 py-1.5">
      <button type="button" onClick={onOpen} title={u.incidentOpen} className="flex min-w-0 flex-1 items-center gap-2 text-left">
        <DetectionThumb id={i.eventId} className="h-9 w-12 flex-none rounded-md object-cover" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 flex-none rounded-full" style={{ background: tone }} />
            <span className="truncate text-[11.5px] font-semibold text-slate-100">{i.label}</span>
          </span>
          <span className="block truncate text-[9.5px] text-slate-500">
            {cameraPlaceLabel(i.channel, i.camera)} · {nvrDateTime(i.time)}
          </span>
        </span>
      </button>
      <button
        type="button"
        onClick={onRemove}
        title={u.incidentUnlink}
        className="grid h-6 w-6 flex-none place-items-center rounded-md text-slate-500 transition-colors hover:bg-rose-500/15 hover:text-rose-300"
      >
        <X size={11} weight="bold" />
      </button>
    </li>
  );
}

/**
 * Tanlash oynasi — so'nggi janjal/qurol/chekish hodisalari.
 *
 * ⚠️ Uchala toifa ALOHIDA so'raladi: serverda `all` yuz oqimi bilan
 * to'lib ketadi (o'lchandi: 6 919 hodisadan 6 916 tasi yuz), ya'ni kam
 * uchraydiganlari ko'milib qolardi (`useTodayArrivals.ts` dagi AYNI
 * tuzoq). Bu toifalar kichkina — bittadan so'rov yetadi.
 */
function IncidentPicker({
  subjectKey,
  cameras,
  onClose,
}: {
  subjectKey: string;
  cameras: string[];
  onClose: () => void;
}) {
  const t = useT();
  const u = t.people.panel;
  useSyncExternalStore(subscribeIncidents, incidentsVersion, () => 0);
  const qs = useQueries({
    queries: INCIDENT_CATEGORIES.map((c) => ({
      queryKey: ["nvr-incidents-pick", c],
      queryFn: () => listEvents(c, { limit: PICK_LIMIT }),
      staleTime: 60_000,
    })),
  });

  const loading = qs.some((q) => q.isLoading);
  const own = useMemo(() => new Set(cameras), [cameras]);

  /** Hammasi bitta ro'yxatda: shu odam ko'ringan kameradagilari TEPADA. */
  const events = useMemo(() => {
    const all: NvrEvent[] = qs.flatMap((q) => q.data?.events ?? []);
    return all.sort((a, b) => {
      const am = own.has(a.channel) ? 0 : 1;
      const bm = own.has(b.channel) ? 0 : 1;
      if (am !== bm) return am - bm;
      return new Date(b.time).getTime() - new Date(a.time).getTime();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qs.map((q) => q.dataUpdatedAt).join(","), own]);

  return (
    /* ⚠️ `z-[95]` — shaxs paneli (`z-[85]`) USTIDA ochiladi. */
    <div onClick={onClose} className="fixed inset-0 z-[95] grid place-items-center bg-[#03060E]/85 p-4 backdrop-blur-sm">
      <div
        onClick={(e) => e.stopPropagation()}
        className="neon-modal neon-modal--cyan flex h-[min(620px,86vh)] w-[min(560px,96vw)] flex-col overflow-hidden"
      >
        <header className="flex flex-none items-start gap-3 border-b border-white/[0.08] px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-slate-500">{u.incidentAdd}</p>
            <h3 className="truncate text-[15px] font-bold text-white">{u.incidentPickTitle}</h3>
            <p className="mt-0.5 text-[10px] leading-snug text-slate-500">
              {u.incidentPickHint}
            </p>
          </div>
          <button type="button" onClick={onClose} className="neon-icon-btn" aria-label={t.common.close}>
            <X size={14} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2.5">
          {loading ? (
            <div className="grid h-32 place-items-center">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-ice/40 border-t-ice" />
            </div>
          ) : events.length === 0 ? (
            <p className="py-10 text-center text-[11.5px] text-slate-500">
              {u.incidentNone}
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {events.map((ev) => {
                const already = isLinked(subjectKey, ev.id);
                const match = own.has(ev.channel);
                const tone = CAT_TONE[ev.category] ?? "#94A3B8";
                return (
                  <li
                    key={ev.id}
                    className="flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-2 py-1.5"
                  >
                    <DetectionThumb
                      id={ev.id}
                      pictureLost={ev.picture_lost}
                      className="h-11 w-14 flex-none rounded-md object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 flex-none rounded-full" style={{ background: tone }} />
                        <span className="truncate text-[11.5px] font-semibold text-slate-100">{ev.label}</span>
                      </p>
                      <p className="truncate text-[9.5px] text-slate-500">
                        {cameraPlaceLabel(ev.channel, ev.camera)} · {nvrDateTime(ev.time)}
                      </p>
                      {/* ⚠️ "Shu kamerada" — YORDAM, isbot emas: kadrda
                          boshqa odamlar ham bo'lishi mumkin. */}
                      {match && (
                        <p className="mt-0.5 inline-block rounded border border-amber-400/25 bg-amber-400/[0.08] px-1.5 py-px text-[9px] font-semibold text-amber-300">
                          {u.incidentSameCamera}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={already}
                      onClick={() =>
                        linkIncident(subjectKey, {
                          eventId: ev.id,
                          category: ev.category,
                          label: ev.label,
                          time: ev.time,
                          channel: ev.channel,
                          camera: ev.camera,
                        })
                      }
                      className={`flex-none rounded-lg border px-2.5 py-1.5 text-[10.5px] font-semibold transition-colors ${
                        already
                          ? "cursor-default border-white/[0.06] bg-white/[0.02] text-slate-600"
                          : "border-ice/30 bg-ice/[0.08] text-ice-bright hover:border-ice/60 hover:bg-ice/[0.16]"
                      }`}
                    >
                      {already ? u.incidentLinked : u.incidentLink}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <footer className="flex flex-none items-center gap-2 border-t border-white/[0.08] px-4 py-2.5">
          <Prohibit size={12} className="flex-none text-slate-600" />
          <p className="text-[9.5px] leading-snug text-slate-500">
            {u.incidentLocalNote}
          </p>
        </footer>
      </div>
    </div>
  );
}
