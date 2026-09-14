"use client";

import { useEffect, useState } from "react";
import { ImageBroken, MagnifyingGlass } from "@phosphor-icons/react";
import { DetectionThumb } from "@/components/detections/DetectionThumb";
import { FaceHistoryModal } from "./FaceHistoryModal";
import { useFaces } from "@/hooks/useFaces";
import { useNvrPeopleMap } from "@/hooks/useNvrPeople";
import { nvrDateTime } from "@/lib/nvrApi";
import { cameraPlaceLabel } from "@/config/cameraPlacements";
import { Pagination } from "@/components/common/Pagination";
import { TabPill, fmt } from "@/components/common/panels";
import { useViewMode, ViewToggle } from "@/components/common/ViewToggle";
import { useT } from "@/i18n";
import type { NvrFaceRow } from "@/lib/nvrApi";

const PAGE_SIZE = 20;

/**
 * "Hammasi" — kamerada ko'ringan HAR BIR odam, bazaga qo'shilgani ham,
 * notanishi ham (`GET /api/v1/faces`, `FRONTEND.md` 5-C).
 *
 * ⚠️ **RO'YXATDAGI ODAMLARDAN FARQI:** `PeoplePage` (O'qituvchi/Xodim/
 * O'quvchi tablari) faqat QO'LDA qo'shilganlarni ko'rsatadi. Bu yerda esa
 * kamera oldidan o'tgan HAMMA — 3000 dan ortiq notanish "Begona shaxs"
 * ham. Ikkalasi ARALASHTIRILMAYDI: manba bitta emas.
 */
export function AllPeoplePage() {
  const t = useT();
  const n = (v: number) => fmt(v, t.locale);

  const [known, setKnown] = useState<"all" | "yes" | "no">("all");
  const [sort, setSort] = useState<"last_seen" | "count" | "first_seen">("last_seen");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(0);
  const [openFaceId, setOpenFaceId] = useState<number | null>(null);
  /** Ro'yxat/kartochka — `AttendanceListModal`dagi bilan AYNI naqsh (2026-09-11). */
  const [viewMode, setViewMode] = useViewMode("people-all");

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search]);
  useEffect(() => setPage(0), [known, sort, debounced]);

  const q = useFaces({
    known: known === "all" ? undefined : known,
    sort,
    search: debounced || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const totalPages = Math.max(1, Math.ceil(q.total / PAGE_SIZE));

  /* Sinfi/Toifa — kuzatuv posti o'z tizimidagi `NvrPerson.note`/`role_label`,
     `person.id` orqali ANIQ FK bilan (`NvrFaceRow.person.id` AYNI
     `NvrPerson.id` — ikkalasi bitta tizim, taxminiy ism moslashtirish
     EMAS). "Bugungi holat" ustuni ATAYLAB YO'Q — u backend `Person`/
     `Attendance` tizimini (`useStudentDay` × 2, har biri to'liq
     ro'yxat+davomat tortadi) shu sahifaga qo'shar edi, holbuki bu
     sahifaning o'zi kuzatuv posti yuz oqimi haqida (butunlay boshqa tizim, ism
     bo'yicha TAXMINIY ko'prik). O'lchandi (2026-09-04): shu ikki hook
     "Hammasi" sahifasini QOTIRIB QO'YDI — bir martalik tekshiruv uchun
     narxi juda katta edi, olib tashlandi. Kerak bo'lsa "Yuz bazasi"
     kartochkasidan `FaceHistoryModalByName` orqali BITTA odamning
     tarixi ochiladi — bu yerda 20 qatorlik sahifa uchun butun backend
     davomat tizimini tortish shart emas. */
  const peopleMap = useNvrPeopleMap();

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <header className="flex-none">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Shaxslar</p>
        <h2 className="text-[19px] font-bold text-white">Hamma odamlar</h2>
       
      </header>

      <div className="flex flex-none flex-wrap items-center gap-1.5">
        <span className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 font-mono text-[11px] text-slate-300">
          {n(q.total)} ta odam
        </span>
        <span className="rounded-lg border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1.5 font-mono text-[11px] text-emerald-300">
          {n(q.known)} tanish
        </span>
        <span className="rounded-lg border border-amber-400/25 bg-amber-400/10 px-2.5 py-1.5 font-mono text-[11px] text-amber-300">
          {n(q.unknown)} notanish
        </span>

        <span className="mx-1 h-4 w-px flex-none bg-white/10" />
        {(
          [
            ["all", "Hammasi"],
            ["yes", "Tanish"],
            ["no", "Notanish"],
          ] as const
        ).map(([id, label]) => (
          <TabPill key={id} group="all-people-known" active={known === id} onClick={() => setKnown(id)}>
            {label}
          </TabPill>
        ))}

        <span className="mx-1 h-4 w-px flex-none bg-white/10" />
        {(
          [
            ["last_seen", "Oxirgi ko'ringan"],
            ["count", "Eng ko'p"],
            ["first_seen", "Birinchi ko'ringan"],
          ] as const
        ).map(([id, label]) => (
          <TabPill key={id} group="all-people-sort" active={sort === id} onClick={() => setSort(id)}>
            {label}
          </TabPill>
        ))}

        <label className="hik-input ml-auto flex h-8 items-center gap-1.5 px-2.5">
          <MagnifyingGlass size={13} className="flex-none text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ism bo'yicha..."
            className="w-[160px] bg-transparent text-[11.5px] outline-none placeholder:text-slate-600"
          />
        </label>

        <ViewToggle mode={viewMode} onChange={setViewMode} />
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-white/[0.07]">
        {q.isLoading ? (
          <div className="grid h-40 place-items-center">
            <span className="h-7 w-7 animate-spin rounded-full border-2 border-ice/40 border-t-ice" />
          </div>
        ) : q.faces.length === 0 ? (
          <p className="py-14 text-center text-[12px] text-slate-500">
            {debounced ? "Qidiruvga mos yozuv yo'q" : "Hech kim qayd etilmagan"}
          </p>
        ) : viewMode === "card" ? (
          <div className="grid grid-cols-3 gap-2 p-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
            {q.faces.map((f) => (
              <PersonCardTile
                key={f.face_id}
                f={f}
                sinf={f.person ? peopleMap.get(f.person.id)?.note : undefined}
                onOpen={() => setOpenFaceId(f.face_id)}
              />
            ))}
          </div>
        ) : (
          <table className="w-full min-w-[980px] text-[11.5px]">
            <thead className="sticky top-0 z-10 bg-ink-panel text-[9.5px] uppercase tracking-wide text-slate-500">
              <tr className="border-b border-white/[0.08]">
                <th className="px-3 py-2 text-left font-medium">Rasm</th>
                <th className="px-3 py-2 text-left font-medium">Kim</th>
                <th className="px-3 py-2 text-left font-medium">Sinfi</th>
                <th className="px-3 py-2 text-left font-medium">Toifa</th>
                <th className="px-3 py-2 text-right font-medium">Necha marta</th>
                <th className="px-3 py-2 text-left font-medium">Qaysi kameralarda</th>
                <th className="px-3 py-2 text-right font-medium">Birinchi marta</th>
                <th className="px-3 py-2 text-right font-medium">Oxirgi marta</th>
              </tr>
            </thead>
            <tbody>
              {q.faces.map((f) => {
                const nvrPerson = f.person ? peopleMap.get(f.person.id) : undefined;
                return (
                  <tr
                    key={f.face_id}
                    onClick={() => setOpenFaceId(f.face_id)}
                    className="cursor-pointer border-b border-white/[0.04] transition-colors hover:bg-white/[0.04]"
                  >
                    <td className="px-3 py-1.5">
                      {f.has_picture ? (
                        <DetectionThumb id={f.last_event_id} className="h-[42px] w-[34px] rounded-md" alt="" />
                      ) : (
                        <span className="grid h-[42px] w-[34px] place-items-center rounded-md bg-black/40 text-slate-600">
                          <ImageBroken size={13} />
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-1.5">
                      <p className="font-semibold text-slate-100">{f.known && f.name ? f.name : `Begona shaxs #${f.face_id}`}</p>
                      <p className="font-mono text-[9.5px] text-slate-600">yuz #{f.face_id}</p>
                    </td>
                    <td className="px-3 py-1.5 text-slate-300">{nvrPerson?.note || "—"}</td>
                    <td className="px-3 py-1.5 text-slate-300">{f.person?.role_label ?? "—"}</td>
                    <td className="px-3 py-1.5 text-right">
                      <p className="font-mono font-semibold text-slate-200">{n(f.count)} marta</p>
                      <p className="text-[9.5px] text-slate-500">{n(f.camera_count)} kamera</p>
                    </td>
                    <td className="px-3 py-1.5">
                      <div className="flex flex-wrap gap-1">
                        {f.cameras.slice(0, 2).map((c) => (
                          <span
                            key={c.channel}
                            className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[9.5px] text-slate-400"
                          >
                            {cameraPlaceLabel(c.channel, c.camera)} · {n(c.count)}
                          </span>
                        ))}
                        {f.camera_count > 2 && (
                          <span className="rounded border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[9.5px] text-slate-500">
                            +{f.camera_count - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-[10.5px] text-slate-500">
                      {nvrDateTime(f.first_seen)}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-[10.5px] text-slate-500">
                      {nvrDateTime(f.last_seen)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex-none">
        <Pagination
          page={page + 1}
          totalPages={totalPages}
          onChange={(p) => setPage(p - 1)}
          prevLabel={t.detections.prev}
          nextLabel={t.detections.next}
          ariaLabel={`${page + 1} / ${totalPages}`}
        />
      </div>

      {openFaceId != null && <FaceHistoryModal faceId={openFaceId} onClose={() => setOpenFaceId(null)} />}
    </div>
  );
}

/**
 * KARTOCHKA ko'rinishi — jadval qatori bilan AYNI ma'lumot, panjara
 * shaklida (`AttendanceListModal.tsx`dagi `CardTile` bilan AYNI naqsh,
 * 2026-09-11, foydalanuvchi so'rovi).
 *
 * ⚠️ Rasm quti `aspect-[3/4] w-full` — piksel EMAS: rasmi bo'lmagan
 * odamda `DetectionThumb` o'rniga zaxira belgi chiqadi, ikkalasi ham
 * BIR XIL qutida bo'lgani uchun kartochkalar balandligi farq qilmaydi
 * (`AttendanceListModal.tsx`dagi topilgan xatoning AYNI oldini olish).
 */
function PersonCardTile({ f, sinf, onOpen }: { f: NvrFaceRow; sinf: string | null | undefined; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      title={f.known && f.name ? f.name : `Begona shaxs #${f.face_id}`}
      className="flex flex-col items-center gap-1.5 rounded-xl border border-white/[0.07] bg-white/[0.02] p-2.5 text-center transition-colors hover:border-ice/30 hover:bg-ice/[0.06]"
    >
      <span className="grid aspect-[3/4] w-full flex-none place-items-center overflow-hidden rounded-lg bg-black/40 ring-1 ring-white/10">
        {f.has_picture ? (
          <DetectionThumb id={f.last_event_id} className="h-full w-full object-cover" alt="" />
        ) : (
          <ImageBroken size={18} className="text-slate-600" />
        )}
      </span>
      <span className="line-clamp-2 flex h-[28px] w-full items-center justify-center text-[11px] font-semibold leading-tight text-slate-100">
        {f.known && f.name ? f.name : `#${f.face_id}`}
      </span>
      <span className="w-full truncate text-[9px] text-slate-500">{sinf || f.person?.role_label || "—"}</span>
      <span className="font-mono text-[9px] text-slate-500">{f.count} marta</span>
    </button>
  );
}
