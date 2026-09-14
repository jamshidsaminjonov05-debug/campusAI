"use client";

import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { Broadcast, CalendarBlank, ChartBar, CheckCircle, SecurityCamera, X } from "@phosphor-icons/react";
import { useModalHistory } from "@/hooks/useModalHistory";
import {
  getWeapon2RecentCount,
  getWeapon2Totals,
  listWeapon2Alerts,
  listWeapon2Cameras,
  weapon2DateTime,
  weapon2ImageUrl,
  weapon2Time,
  weapon2VideoUrl,
  type Weapon2Alert,
  type Weapon2Camera,
  type Weapon2Totals,
} from "@/lib/weapon2Api";
import { Pistol } from "@/components/common/PistolIcon";
import { DETECTION_BY_ID } from "@/lib/detectionTypes";
import { Pagination } from "@/components/common/Pagination";
import { KpiTile } from "@/components/common/panels";

/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  "2-VERSIYA" — lokal qurol/janjal aniqlash paneli                    ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * 2026-09-09, foydalanuvchi so'rovi: "Aniqlanganlar qismida yuqori o'ng
 * burchakka 2chi versiya button qo'yiladi, bosilganda esa berilgan apidan
 * aniqlanganlar chiqib beradi, hodisa turlarga moslab chiqarib berishi
 * kerak". `DetectionsPage.tsx`dagi tugma bosilganda ASOSIY kuzatuv posti ro'yxati
 * o'rniga SHU komponent ko'rsatiladi.
 *
 * ⚠️ **BU — BUTUNLAY BOSHQA MANBA, ADASHTIRMANG.** kuzatuv posti (`nvrApi.ts`) —
 * kuzatuv postining tayyor tizimi (yuz/qurol/janjal/chekish). Bu yerdagi
 * "2-versiya" esa `WEAPON2_ORIGIN`dagi (`.env.local`) O'ZIMIZ o'qitgan
 * ALOHIDA server. Shu sabab `DetectionCard`/`EventDossier` ISHLATILMAYDI —
 * ular `NvrEvent` shakliga qurilgan, bu serverning javobi esa BUTUNLAY
 * boshqacha (`Weapon2Alert`, `lib/weapon2Api.ts`).
 *
 * ⚠️ **HOZIRCHA FAQAT QUROL.** Server javobida (`/openapi.json`,
 * 2026-09-09 da tekshirilgan) hodisa TURI degan maydon YO'Q — sarlavhaning
 * o'zi ham "Qurol Aniqlash Tizimi". "Janjal" so'ralgan edi, lekin bu
 * API hozircha uni ALOHIDA belgilamaydi — shuning uchun bu yerda soxta
 * "janjal" yozuvi TO'QILMAYDI (loyihaning "MOCK YO'Q" qoidasi), buning
 * o'rniga panelning o'zida sabab OCHIQ yoziladi. Server keyinchalik tur
 * maydonini qo'shsa — shu faylga (`Weapon2Alert` + kartochka rangi) bitta
 * moslashtirish yetarli bo'ladi.
 *
 * ⚠️ **XAVFSIZLIK** — login/parol va manzil BU FAYLDA HAM, HECH QAYERDA
 * YO'Q: hammasi `/weapon2/...` proxysi orqali (`app/weapon2/[...path]/
 * route.ts`), u login qilib tokenni SERVERDA saqlaydi. Bu komponent faqat
 * `WEAPON2_BASE` (proxy yo'li) ko'radi, xuddi `nvrApi.ts` kuzatuv posti kalitini
 * ko'rmagani kabi.
 */
const PAGE_SIZE = 24;
const WEAPON = DETECTION_BY_ID.get("weapon");
const WEAPON_COLOR = WEAPON?.color ?? "#e879f9";
const WEAPON_LABEL = WEAPON?.label ?? "Qurol";

export function WeaponV2Panel() {
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<Weapon2Alert | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);

  const q = useQuery({
    queryKey: ["weapon2-alerts", page],
    queryFn: () => listWeapon2Alerts(page, PAGE_SIZE),
    placeholderData: (prev) => prev,
    staleTime: 15_000,
  });
  const camerasQ = useQuery({
    queryKey: ["weapon2-cameras"],
    queryFn: () => listWeapon2Cameras(),
    staleTime: 5 * 60_000,
  });
  /* Yuqori KPI qatori — "Aniqlanganlar"ning asosiy kuzatuv posti ko'rinishidagi
     4 ta kartochka bilan AYNI naqsh (2026-09-09, foydalanuvchi so'rovi:
     "yuqori panellar ... ishlasin"), lekin manba to'liq 2-versiyaning
     O'ZI: `alerts-total` (butun tarix) + `alert-statistics?days=1`
     (bugungi). Ma'lumot kelmaguncha kartochka SON ko'rsatmaydi
     (`isLoading` — pastdagi qoidaga qarang, "ma'lumot yo'q bo'lsa
     kelmasin"). */
  const totalsQ = useQuery({
    queryKey: ["weapon2-totals"],
    queryFn: getWeapon2Totals,
    staleTime: 30_000,
  });
  const todayQ = useQuery({
    queryKey: ["weapon2-recent", 1],
    queryFn: () => getWeapon2RecentCount(1),
    staleTime: 30_000,
  });

  const cameraById = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of camerasQ.data ?? []) m.set(c.id, c.location || c.name);
    return m;
  }, [camerasQ.data]);

  const rows = q.data?.data ?? [];
  const total = q.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const activeCameras = camerasQ.data?.filter((c) => c.enabled).length;
  const totals = totalsQ.data;
  const acceptRate =
    totals && totals.total_accepted + totals.total_ignored > 0
      ? Math.round((totals.total_accepted / (totals.total_accepted + totals.total_ignored)) * 100)
      : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* Manba OCHIQ yoziladi — bu boshqa (lokal) tizim, kuzatuv posti EMAS */}
      <div className="flex-none rounded-xl border border-white/[0.1] bg-white/[0.03] px-3 py-2">
        <div className="flex items-start justify-between gap-2">
          <p className="flex items-center gap-1.5 text-[11.5px] font-semibold" style={{ color: WEAPON_COLOR }}>
            <Pistol size={14} weight="fill" color={WEAPON_COLOR} />
            2-versiya — lokal aniqlash tizimi
          </p>
          {/* STATISTIKA — 2026-09-09, foydalanuvchi so'rovi: "statistika
              button qo'shib qo'yishing kerak, bosilganda modal chiqib
              bersin statistikalarini chiqarsin". */}
          <button
            type="button"
            onClick={() => setStatsOpen(true)}
            className="flex flex-none items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.05] px-2 py-1
                       text-[10.5px] font-semibold text-slate-300 transition-colors hover:border-white/25 hover:text-white"
          >
            <ChartBar size={12} weight="bold" />
            Statistika
          </button>
        </div>
        <p className="mt-1 text-[10.5px] leading-snug text-slate-500">
          Bu ro&apos;yxat kuzatuv posti&apos;dan emas, alohida (o&apos;zimiz o&apos;qitgan) serverdan keladi. Hozircha faqat{" "}
          <b className="text-slate-300">{WEAPON_LABEL.toLowerCase()}</b> signalini beradi — server javobida hodisa
          turi (janjal va h.k.) maydoni hali yo&apos;q, qo&apos;shilishi bilan bu yerda o&apos;zi ko&apos;rinadi.
        </p>
      </div>

      {/* Yuqori KPI qatori — asosiy manzara, HAMMASI 2-versiyaning o'zidan */}
      <div className="grid flex-none grid-cols-2 gap-2 xl:grid-cols-4">
        <KpiTile Icon={Broadcast} label="Jami qayd" value={total || "—"} tone={WEAPON_COLOR} />
        <KpiTile
          Icon={CalendarBlank}
          label="Bugungi"
          value={todayQ.data ?? (todayQ.isLoading ? "…" : "—")}
          tone="#F59E0B"
        />
        <KpiTile
          Icon={SecurityCamera}
          label="Faol kameralar"
          value={activeCameras != null ? `${activeCameras}/${camerasQ.data?.length ?? 0}` : "—"}
          tone="#85E0FF"
        />
        <KpiTile
          Icon={CheckCircle}
          label="Qabul qilingan"
          value={acceptRate != null ? `${acceptRate}%` : "—"}
          hint={totals ? `${totals.total_accepted} / ${totals.total_accepted + totals.total_ignored}` : undefined}
          tone="#34D399"
        />
      </div>

      <div className="flex flex-none items-center justify-between">
        <span className="font-mono text-[11px] text-slate-500">{total} ta qayd</span>
        {q.isFetching && (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ice/40 border-t-ice" />
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {q.isLoading && rows.length === 0 ? (
          <div className="grid h-40 place-items-center">
            <span className="h-7 w-7 animate-spin rounded-full border-2 border-ice/40 border-t-ice" />
          </div>
        ) : q.isError ? (
          <p className="py-10 text-center text-[12px] text-rose-300">
            2-versiya serveriga ulanib bo&apos;lmadi — manzil/login .env sozlamasini tekshiring
          </p>
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-[12px] text-slate-500">Hozircha qayd yo&apos;q</p>
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
            {rows.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setOpen(a)}
                title={`${WEAPON_LABEL} — batafsil`}
                className="group overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03] text-left transition-colors hover:border-white/25"
                style={{ ["--c" as string]: WEAPON_COLOR }}
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-black/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={weapon2ImageUrl(a.image_path)}
                    alt={WEAPON_LABEL}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute right-1 top-1 rounded bg-black/70 px-1 py-0.5 font-mono text-[9px] text-slate-200">
                    {Math.round(a.confidence * 100)}%
                  </span>
                  <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1 py-0.5 font-mono text-[9px] text-slate-200">
                    {weapon2Time(a.detected_at)}
                  </span>
                </div>
                <div className="px-2 py-1.5">
                  <p className="flex items-center gap-1 truncate text-[11px] font-medium" style={{ color: WEAPON_COLOR }}>
                    <Pistol size={12} weight="fill" color={WEAPON_COLOR} />
                    {WEAPON_LABEL}
                  </p>
                  <p className="truncate text-[9.5px] text-slate-500">
                    {cameraById.get(a.camera_id) ?? `Kamera #${a.camera_id}`}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        <Pagination
          page={page}
          totalPages={totalPages}
          onChange={setPage}
          prevLabel="Oldingi"
          nextLabel="Keyingi"
          ariaLabel={`${page}-sahifa`}
          className="mt-auto"
        />
      </div>

      {open && (
        <Weapon2Detail alert={open} camera={cameraById.get(open.camera_id)} onClose={() => setOpen(null)} />
      )}
      {statsOpen && (
        <Weapon2StatsModal
          totals={totals}
          today={todayQ.data}
          cameras={camerasQ.data ?? []}
          onClose={() => setStatsOpen(false)}
        />
      )}
    </div>
  );
}

function Weapon2Detail({
  alert,
  camera,
  onClose,
}: {
  alert: Weapon2Alert;
  camera?: string;
  onClose: () => void;
}) {
  useModalHistory(onClose);

  const body = (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[92] grid place-items-center bg-[#03060E]/85 p-4 backdrop-blur-sm"
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="geo-strip-card flex max-h-[92vh] w-[min(900px,96vw)] flex-col overflow-hidden rounded-2xl"
      >
        <header className="flex flex-none items-center gap-3 border-b border-white/[0.08] px-4 py-3">
          <span
            className="grid h-9 w-9 flex-none place-items-center rounded-lg"
            style={{ background: `${WEAPON_COLOR}22`, color: WEAPON_COLOR }}
          >
            <Pistol size={17} weight="fill" color={WEAPON_COLOR} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-bold text-white">{WEAPON_LABEL} aniqlandi</p>
            <p className="truncate text-[10.5px] text-slate-500">
              {camera ?? `Kamera #${alert.camera_id}`} · {weapon2DateTime(alert.detected_at)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex-none text-slate-400 hover:text-white"
            aria-label="Yopish"
          >
            <X size={17} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={weapon2ImageUrl(alert.image_path)} alt={WEAPON_LABEL} className="w-full" />
            </div>
            <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40">
              <video
                src={weapon2VideoUrl(alert.video_path)}
                controls
                playsInline
                preload="metadata"
                className="h-full w-full"
              />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <DetailCell label="Ishonch" value={`${Math.round(alert.confidence * 100)}%`} />
            <DetailCell label="Kamera" value={camera ?? `#${alert.camera_id}`} />
            <DetailCell label="Vaqt" value={weapon2Time(alert.detected_at)} />
            <DetailCell label="Holat" value={alert.is_read ? "Ko'rilgan" : "Yangi"} />
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document === "undefined" ? null : createPortal(body, document.body);
}

function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/[0.07] bg-white/[0.03] px-2.5 py-2">
      <p className="text-[9px] uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="truncate font-mono text-[13px] font-bold text-white">{value}</p>
    </div>
  );
}

/**
 * "STATISTIKA" oynasi — 2026-09-09, foydalanuvchi so'rovi: "statistika
 * button qo'shib qo'yishing kerak bosilganda modal chiqib bersin
 * statistikalarini chiqarsin".
 *
 * Hammasi HAQIQIY, qo'shimcha yuk arzon: `totals`/`today` — DOIM allaqachon
 * so'ralgan (yuqori KPI qatori), `cameras.accepted/ignored` — kamera
 * ro'yxatida ALLAQACHON bor (qo'shimcha so'rov shart emas). Faqat
 * "7 kunlik" son BU OYNA ochilgandagina so'raladi (`enabled` kerak emas —
 * komponent faqat `statsOpen` bo'lganda mount bo'ladi).
 */
function Weapon2StatsModal({
  totals,
  today,
  cameras,
  onClose,
}: {
  totals?: Weapon2Totals;
  today?: number;
  cameras: Weapon2Camera[];
  onClose: () => void;
}) {
  useModalHistory(onClose);
  const weekQ = useQuery({
    queryKey: ["weapon2-recent", 7],
    queryFn: () => getWeapon2RecentCount(7),
    staleTime: 30_000,
  });

  const jami = totals ? totals.total_accepted + totals.total_ignored : null;
  const foiz = totals && jami ? Math.round((totals.total_accepted / jami) * 100) : null;

  const topCameras = useMemo(
    () =>
      [...cameras]
        .filter((c) => c.accepted + c.ignored > 0)
        .sort((a, b) => b.accepted - a.accepted)
        .slice(0, 8),
    [cameras]
  );
  const maxAccepted = Math.max(1, ...topCameras.map((c) => c.accepted));

  const body = (
    <div onClick={onClose} className="fixed inset-0 z-[93] grid place-items-center bg-[#03060E]/85 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="geo-strip-card flex max-h-[90vh] w-[min(640px,96vw)] flex-col overflow-hidden rounded-2xl"
      >
        <header className="flex flex-none items-center gap-3 border-b border-white/[0.08] px-4 py-3">
          <span
            className="grid h-9 w-9 flex-none place-items-center rounded-lg"
            style={{ background: `${WEAPON_COLOR}22`, color: WEAPON_COLOR }}
          >
            <ChartBar size={17} weight="bold" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-bold text-white">2-versiya statistikasi</p>
            <p className="truncate text-[10.5px] text-slate-500">Lokal aniqlash tizimi — butun tarix</p>
          </div>
          <button type="button" onClick={onClose} className="flex-none text-slate-400 hover:text-white" aria-label="Yopish">
            <X size={17} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <DetailCell label="Jami" value={jami != null ? String(jami) : "—"} />
            <DetailCell label="Bugungi" value={today != null ? String(today) : "—"} />
            <DetailCell label="7 kunlik" value={weekQ.data != null ? String(weekQ.data) : weekQ.isLoading ? "…" : "—"} />
            <DetailCell label="Qabul qilingan" value={foiz != null ? `${foiz}%` : "—"} />
          </div>

          {topCameras.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-[9.5px] font-bold uppercase tracking-[0.14em] text-slate-500">
                Kameralar bo&apos;yicha (qabul qilingan)
              </p>
              <div className="space-y-1.5">
                {topCameras.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 text-[11px]">
                    <span className="w-[120px] flex-none truncate text-slate-400" title={c.location || c.name}>
                      {c.location || c.name}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.max(4, (c.accepted / maxAccepted) * 100)}%`, background: WEAPON_COLOR }}
                      />
                    </div>
                    <span className="w-[64px] flex-none text-right font-mono text-slate-400">
                      {c.accepted} / {c.accepted + c.ignored}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {totals && (
            <p className="mt-4 text-[10.5px] leading-snug text-slate-500">
              Butun tarixda <b className="text-slate-300">{totals.total_accepted}</b> ta qayd qabul qilingan,{" "}
              <b className="text-slate-300">{totals.total_ignored}</b> ta e&apos;tiborsiz qoldirilgan.
            </p>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document === "undefined" ? null : createPortal(body, document.body);
}
