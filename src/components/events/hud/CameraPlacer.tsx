"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { Copy, Crosshair, MapPin, Trash, X } from "@phosphor-icons/react";
import { hasStaticPlacement, placementFor } from "@/config/cameraPlacements";
import {
  clearPlacement,
  exportPlacements,
  placedCount,
  placementsVersion,
  resetPlacements,
  setPlacement,
  subscribePlacements,
} from "@/lib/cameraPlacementStore";

export interface PlacerCamera {
  channel: string;
  name: string;
}

/**
 * KAMERA JOYLASHTIRISH paneli — Hodisalar HUD'ida.
 *
 * NEGA kerak: aniqlash API kamera koordinatasini BERMAYDI (`FRONTEND.md`),
 * shuning uchun markerlar binolarga taxminan taqsimlanadi. Operator esa
 * kameraning HAQIQIY joyini biladi — shu panel orqali uni xaritaga qo'yadi.
 *
 * Ish tartibi:
 *   1. kanal tanlanadi → xaritaning kerakli nuqtasiga BOSILADI;
 *   2. marker sudrab suriladi (aniqlash uchun);
 *   3. koordinata qo'lda ham kiritiladi (aniq lat/lng bo'lsa);
 *   4. "o'chirish" — kamera avvalgidek taqsimlashga qaytadi.
 *
 * ⚠️ Joylar SHU BRAUZERDA (`localStorage`) saqlanadi. Hamma uchun doimiy
 * qilish uchun "nusxalash" tugmasi bor: chiqqan matn
 * `config/cameraPlacements.ts` ga qo'yiladi.
 */
export function CameraPlacer({
  cameras,
  active,
  onPick,
  onClose,
}: {
  cameras: PlacerCamera[];
  /** Hozir joylashtirilayotgan kanal (`null` — tanlanmagan). */
  active: string | null;
  onPick: (channel: string | null) => void;
  onClose: () => void;
}) {
  useSyncExternalStore(subscribePlacements, placementsVersion, () => 0);
  const [copied, setCopied] = useState(false);

  const rows = useMemo(
    () => cameras.map((c) => ({ ...c, at: placementFor(c.channel) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cameras, placementsVersion()]
  );
  const placed = placedCount();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(exportPlacements());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard ruxsati yo'q — foydalanuvchi qo'lda nusxalaydi */
    }
  };

  return (
    <motion.aside
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="geo-strip-card pointer-events-auto absolute bottom-3 left-3 top-[76px] z-30 flex w-[300px] max-w-[92vw] flex-col gap-2 rounded-2xl px-3.5 py-3"
    >
      <header className="flex flex-none items-baseline gap-2">
        <p className="text-[10px] uppercase tracking-wider text-ice-cyan/70">Kamera joylashtirish</p>
        <span className="truncate text-[9.5px] text-slate-500">{placed} ta belgilangan</span>
        <button onClick={onClose} className="ml-auto flex-none text-slate-400 hover:text-white" title="Yopish">
          <X size={14} />
        </button>
      </header>

      <p className="flex-none rounded-lg border border-ice/25 bg-ice/[0.07] px-2.5 py-1.5 text-[10.5px] leading-snug text-ice-soft">
        {active
          ? `#${active} tanlandi — xaritaning kerakli nuqtasiga bosing. Qo'yilgach markerni sudrab suring.`
          : "Kanalni tanlang, so'ng xaritaga bosing."}
      </p>

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-0.5">
        {rows.map((c) => {
          const isActive = active === c.channel;
          return (
            <div
              key={c.channel}
              className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 transition-colors ${
                isActive
                  ? "border-ice/60 bg-ice/[0.12]"
                  : c.at
                    ? "border-emerald-400/30 bg-emerald-400/[0.06]"
                    : "border-white/[0.07] bg-white/[0.02]"
              }`}
            >
              <button
                type="button"
                onClick={() => onPick(isActive ? null : c.channel)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
                title={isActive ? "Tanlovni bekor qilish" : "Shu kanalni joylashtirish"}
              >
                {c.at ? (
                  <MapPin size={13} weight="fill" className="flex-none text-emerald-400" />
                ) : (
                  <Crosshair size={13} weight="duotone" className="flex-none text-slate-500" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11.5px] font-semibold text-slate-100">
                    #{c.channel} · {c.name}
                  </span>
                  {c.at && (
                    <span className="block truncate font-mono text-[9px] text-slate-500">
                      {c.at.lat.toFixed(6)}, {c.at.lng.toFixed(6)}
                    </span>
                  )}
                </span>
              </button>

              {c.at && (
                <button
                  type="button"
                  onClick={() => clearPlacement(c.channel, hasStaticPlacement(c.channel))}
                  title="Joyni olib tashlash"
                  className="flex-none text-slate-500 transition-colors hover:text-rose-400"
                >
                  <Trash size={13} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Aniq koordinata qo'lda — o'lchov asbobidan kelgan lat/lng uchun */}
      {active && <ManualEntry channel={active} />}

      <div className="flex flex-none gap-1.5">
        <button
          type="button"
          onClick={copy}
          title="`config/cameraPlacements.ts` uchun tayyor matnni nusxalash"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.04] py-1.5 text-[10.5px] font-semibold text-slate-300 transition-colors hover:border-ice/40 hover:text-white"
        >
          <Copy size={12} />
          {copied ? "Nusxalandi" : "Kodga ko'chirish"}
        </button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Qo'lda qo'yilgan barcha joylar o'chirilsinmi?")) resetPlacements();
          }}
          title="Hammasini tozalash"
          className="flex-none rounded-lg border border-white/[0.1] bg-white/[0.04] px-2.5 py-1.5 text-slate-400 transition-colors hover:border-rose-400/50 hover:text-rose-300"
        >
          <Trash size={13} />
        </button>
      </div>
    </motion.aside>
  );
}

/** Koordinatani QO'LDA kiritish — o'lchangan aniq lat/lng bo'lsa. */
function ManualEntry({ channel }: { channel: string }) {
  const at = placementFor(channel);
  const [lat, setLat] = useState(at ? String(at.lat) : "");
  const [lng, setLng] = useState(at ? String(at.lng) : "");

  const apply = () => {
    const la = Number(lat);
    const ln = Number(lng);
    // O'zbekiston chegarasidan tashqari qiymat — xato kiritilgan
    if (!Number.isFinite(la) || !Number.isFinite(ln) || la < 37 || la > 46 || ln < 55 || ln > 74) return;
    setPlacement(channel, { lat: la, lng: ln, campusId: at?.campusId, note: at?.note });
  };

  return (
    <div className="flex flex-none items-center gap-1.5">
      <input
        value={lat}
        onChange={(e) => setLat(e.target.value)}
        placeholder="lat"
        inputMode="decimal"
        className="hik-input h-7 w-full px-2 font-mono text-[10.5px] text-slate-200 outline-none placeholder:text-slate-600"
      />
      <input
        value={lng}
        onChange={(e) => setLng(e.target.value)}
        placeholder="lng"
        inputMode="decimal"
        className="hik-input h-7 w-full px-2 font-mono text-[10.5px] text-slate-200 outline-none placeholder:text-slate-600"
      />
      <button
        type="button"
        onClick={apply}
        title="Koordinatani qo'llash"
        className="flex-none rounded-lg border border-ice/35 bg-ice/10 px-2 py-1 text-[10.5px] font-semibold text-ice-soft transition-colors hover:border-ice/70 hover:text-white"
      >
        OK
      </button>
    </div>
  );
}
