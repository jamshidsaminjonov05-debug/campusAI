import { nvrEventLabel } from "@/lib/eventLabels";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Map as MapIcon, Radar, X } from "lucide-react";
import { useT, type Messages } from "@/i18n";
import { useScheme } from "@/theme";
import { useAppStore } from "@/store/useAppStore";
import { useDetections } from "@/hooks/useDetections";
import { detectionLevel, LEVEL_TONE } from "@/lib/detectionLevel";
import { seenVersion, subscribeSeen, unseenOf } from "@/lib/detectionSeen";
import { cameraHeading, cameraPlaceLabel, placementFor } from "@/config/cameraPlacements";
import { DEFAULT_INSTITUTION_ID, INSTITUTIONS, institutionById } from "@/config/institutions";
import { CAMPUS_CENTER, CAMPUS_ZOOM } from "@/config/campusPoints";
import { MapLibreMap, type YMarker } from "@/map/maplibre/MapLibreMap";
import { nvrImageUrl, type NvrEvent } from "@/lib/nvrApi";
import { useNvrChannels } from "@/hooks/useNvrChannels";
import { useModalHistory } from "@/hooks/useModalHistory";

/*
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  BOSHQARUV PANELI RADARI                                             ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * Panel ochilganda avval shu sahna. Ortida — HAQIQIY 3D kampus
 * (`MapLibreMap`, sekin aylanadi), ustida radar halqasi va
 * **"Aniqlangan hodisalar"** ro'yxati.
 *
 * 🔵 **2026-09-13 DA QAYTA QURILDI** (foydalanuvchi maket rasmi bilan —
 * harbiy HUD uslubi: chapda yopishgan ro'yxat, sahnada esa nishonlar):
 *
 *   · **Ro'yxat CHAPDA, `left-0`** — panel chetiga yopishgan, to'liq
 *     balandlikda. O'NGDAGI ikkinchi ro'yxat OLIB TASHLANDI (ikkala
 *     tomonda bir xil sarlavha turishi chalkashtirardi).
 *   · **Kameralar — XARITANING O'ZIDA**, haqiqiy koordinatasida
 *     (`config/cameraPlacements.ts`), ya'ni ular kampus binolari ustida
 *     turadi va xarita bilan BIRGA aylanadi. Ilgari ular radar ichida
 *     SVG spiral bo'lib chizilardi — joyi geometriyadan olingan, ya'ni
 *     "31-kanal" xaritada bir joyda, radarda butunlay boshqa joyda
 *     ko'rinardi.
 *   · **Hodisa kartochkasi O'SHA KAMERADAN chiqadi**: kameraning
 *     EKRANDAGI nuqtasidan chiziq tortiladi, kadr paydo bo'ladi, so'ng
 *     kartochka KICHRAYIB chapdagi ro'yxatga uchib boradi va o'sha yerda
 *     ro'yxatning birinchi qatori bo'lib qoladi.
 *
 * ⚠️ **Kameraning ekrandagi joyi `map.project()` orqali** — `MapLibreMap`
 * ga shu maqsadda `onMapReady` propi qo'shilgan (xaritaning O'ZIGA
 * tegilmaydi, faqat proyeksiya o'qiladi). Joy animatsiya BOSHLANGANDA
 * bir marta hisoblanadi: xarita sekin aylanadi (2.5°/s), ya'ni ~2.5
 * soniyalik animatsiya davomida siljish sezilmaydi, har kadrda qayta
 * hisoblash esa React'ni bekorga qayta chizardi.
 *
 * ⚠️ **SOXTA HODISA GENERATORI OLIB TASHLANDI** — bir muddat bu yerda
 * tasodifiy "Yuz tanish / Qurol aniqlandi / Janjal" yorliqlari
 * chizilardi. Loyiha qoidasi: manbasi yo'q ma'lumot O'YLAB TOPILMAYDI
 * (`CLAUDE.md`, "MOCK YO'Q"). Endi faqat HAQIQIY tasdiqlanmagan
 * hodisalar ko'rsatiladi; ular bo'lmasa sahna jim turadi.
 *
 * Manba — "Ogohlantirishlar" va header qo'ng'irog'i bilan AYNI so'rov
 * (`category:"all"`, `limit:100`) → bitta React Query keshi. Ro'yxatga
 * faqat `alarm`/`warn` darajasi tushadi: oddiy tanilgan yuz (`info`)
 * ro'yxatni to'ldirib yuborardi.
 *
 * ⚠️ Nuqtani/kartochkani bosish hodisani TASDIQLAMAYDI.
 */

const C = 300;
const R = 190;
/** Ro'yxatda ko'rinadigan hodisalar soni. */
const MAX_BLIPS = 20;
const BARS = 24;
const TRAIL = 8; // nur izi bo'laklari
/** Chap ro'yxat kengligi (px) — kartochka shu tomonga uchadi. */
const LIST_W = 228;

function polar(r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
}

function arc(r: number, a0: number, a1: number): string {
  const [x0, y0] = polar(r, a0);
  const [x1, y1] = polar(r, a1);
  return `M${x0.toFixed(1)},${y0.toFixed(1)} A${r},${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(1)},${y1.toFixed(1)}`;
}

/** Markazdan chiqadigan sektor (pirog bo'lagi) */
function wedge(r: number, a0: number, a1: number): string {
  const [x0, y0] = polar(r, a0);
  const [x1, y1] = polar(r, a1);
  return `M${C},${C} L${x0.toFixed(1)},${y0.toFixed(1)} A${r},${r} 0 0 1 ${x1.toFixed(1)},${y1.toFixed(1)} Z`;
}

function spin(seconds: number, reverse = false): CSSProperties {
  return {
    transformOrigin: `${C}px ${C}px`,
    transformBox: "view-box",
    animation: `${reverse ? "radar-spin-rev" : "radar-spin"} ${seconds}s linear infinite`,
  };
}

const SWAY: CSSProperties = {
  transformOrigin: `${C}px ${C}px`,
  transformBox: "view-box",
  animation: "radar-sway 7s ease-in-out infinite alternate",
};

const PALETTE = {
  light: {
    ring: "#3B9CF5",
    soft: "rgba(59,156,245,0.45)",
    faint: "rgba(59,156,245,0.22)",
    bar: "#1D8FF2",
    marker: "#FFFFFF",
    iconBg: "rgba(59,156,245,0.14)",
    line: "rgba(100,116,139,0.36)",
    lineLit: "rgba(71,85,105,0.9)",
    core: "rgba(255,255,255,0.86)",
    /* Parda — markaz ochiqroq (kampus ko'rinsin), chetlari quyuq (matn o'qilsin) */
    veil: "radial-gradient(60% 62% at 50% 55%, rgba(243,245,248,0.42) 0%, rgba(243,245,248,0.8) 62%, rgba(243,245,248,0.95) 100%)",
  },
  dark: {
    ring: "#4AA8FF",
    soft: "rgba(120,180,255,0.5)",
    faint: "rgba(120,180,255,0.22)",
    bar: "#38BDF8",
    marker: "#0B1220",
    iconBg: "rgba(74,168,255,0.16)",
    line: "rgba(148,163,184,0.3)",
    lineLit: "rgba(203,213,225,0.85)",
    core: "rgba(7,11,20,0.82)",
    veil: "radial-gradient(60% 62% at 50% 55%, rgba(7,11,20,0.4) 0%, rgba(7,11,20,0.8) 62%, rgba(7,11,20,0.95) 100%)",
  },
} as const;

/** Xaritadagi kamera nishoni rangi — Boshqaruv panelidagi bilan AYNI (`Map3D`). */
const CAMERA_COLOR = "#333333";
/** Hodisa chiqqan kamera — shu rangda yonadi. */
const CAMERA_FIRING = "#F59E0B";

/** Uchayotgan kartochka: qaysi hodisa, qayerdan (kamera ekrandagi nuqtasi). */
interface Flight {
  key: number;
  ev: NvrEvent;
  from: { x: number; y: number };
  channel: string;
}

export function RadarScreen({ onPick, onOpenMap }: { onPick: (id: number) => void; onOpenMap: () => void }) {
  const t = useT();
  const r = t.dashboard.radar;
  const p = PALETTE[useScheme()];
  const selectedTeknikum = useAppStore((s) => s.selectedTeknikum);
  /* Map3D bilan AYNI zaxira zanjiri — fon hech qachon bo'sh qolmasin */
  const campusId = selectedTeknikum ?? DEFAULT_INSTITUTION_ID ?? INSTITUTIONS[0]?.id ?? null;
  const campus = useMemo(() => institutionById(campusId), [campusId]);
  const seenTick = useSyncExternalStore(subscribeSeen, seenVersion, () => 0);
  const q = useDetections({ category: "all", limit: 100 });
  const [modalEv, setModalEv] = useState<NvrEvent | null>(null);

  const blips = useMemo(
    () => unseenOf(q.events as NvrEvent[]).filter((e) => detectionLevel(e) !== "info").slice(0, MAX_BLIPS),
    // `seenTick` — tasdiqlanganlar reyestri o'zgarganda qayta hisoblanadi
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q.events, seenTick]
  );

  /* ── Kameralar: HAQIQIY joyida, XARITANING O'ZIDA ──
     Faqat koordinatasi bor kanal chiziladi — taxminiy joyga qo'yish
     "kamera aslida qayerda" degan savolga yolg'on javob bo'lardi
     (`Map3D.tsx` dagi bilan AYNI qoida). */
  const nvr = useNvrChannels();
  /**
   * ⚠️ **Markerlar QAT'IY — hodisa chiqqanda QAYTA QURILMAYDI.**
   * `MapLibreMap` marker ro'yxati o'zgarganda hammasini o'chirib qaytadan
   * yasaydi; hodisa har ~3.4 s da kelgani uchun 32 ta marker doim
   * "sakrab" turardi. Yonayotgan kamera o'rniga USTKI qatlamda
   * (`FlightLayer`) o'sha nuqtada to'lqin chiziladi — natija bir xil,
   * xarita esa tinch qoladi.
   */
  const camMarkers = useMemo<YMarker[]>(() => {
    const out: YMarker[] = [];
    for (const c of nvr.channels) {
      const at = placementFor(c.id);
      if (!at) continue;
      const head = cameraHeading(c.id, campus ? { lat: campus.lat, lng: campus.lng } : null);
      out.push({
        id: `cam-${c.id}`,
        lat: at.lat,
        lng: at.lng,
        kind: "camera",
        color: CAMERA_COLOR,
        tooltip: cameraPlaceLabel(c.id, c.name),
        heading: head?.deg,
        headingApprox: head?.approx,
        status: c.online ? "online" : "offline",
        ptz: /ptz/i.test(c.name ?? ""),
      });
    }
    return out;
  }, [nvr.channels, campus]);

  /* ── Xarita proyeksiyasi — kameraning EKRANDAGI nuqtasi ──
     `MapLibreMap` ning `onMapReady` propi (faqat shu maqsadda qo'shilgan). */
  const mapRef = useRef<{ project: (c: [number, number]) => { x: number; y: number } } | null>(null);
  const onMapReady = useCallback((m: unknown) => {
    mapRef.current = (m as typeof mapRef.current) ?? null;
  }, []);

  /** Kanalning ekrandagi joyi (xarita hali tayyor bo'lmasa `null`). */
  const screenOf = useCallback((channel: string): { x: number; y: number } | null => {
    const at = placementFor(channel);
    const map = mapRef.current;
    if (!at || !map) return null;
    try {
      const pt = map.project([at.lng, at.lat]);
      return { x: pt.x, y: pt.y };
    } catch {
      return null;
    }
  }, []);

  /* ── NAVBAT: har ~3.4 s da bitta hodisa kamerasidan "uchib chiqadi" ──
     Kartochka kameradan chiqadi → kadr ko'rinadi → kichrayib chapdagi
     ro'yxatga qo'shiladi. Faqat KADRI BOR hodisa navbatga tushadi:
     `picture_lost` da qop-qora to'rtburchak chiqardi. */
  const withImg = useMemo(() => blips.filter((b) => !b.picture_lost && nvrImageUrl(b)), [blips]);
  const [flight, setFlight] = useState<Flight | null>(null);
  const seq = useRef(0);
  useEffect(() => {
    if (withImg.length === 0) {
      setFlight(null);
      return;
    }
    let last: number | null = null;
    const spawn = () => {
      const pool = withImg.filter((b) => b.id !== last);
      const ev = (pool.length ? pool : withImg)[Math.floor(Math.random() * (pool.length || withImg.length))];
      if (!ev) return;
      last = ev.id;
      const from = screenOf(ev.channel);
      /* Joyi noma'lum kamera (jadvalda yo'q) — animatsiya QILINMAYDI:
         taxminiy nuqtadan chiziq tortish yolg'on bog'lanish bo'lardi. */
      if (!from) return;
      seq.current += 1;
      setFlight({ key: seq.current, ev, from, channel: ev.channel });
    };
    spawn();
    const iv = window.setInterval(spawn, 3400);
    return () => window.clearInterval(iv);
  }, [withImg, screenOf]);

  /** Uchish tugagach — kartochka olib tashlanadi (ro'yxatda qoladi). */
  const endFlight = useCallback((key: number) => {
    setFlight((f) => (f?.key === key ? null : f));
  }, []);

  const time = (iso: string) => new Date(iso).toLocaleTimeString(t.locale, { hour: "2-digit", minute: "2-digit" });
  const [mx, my] = polar(R, -90);

  return (
    <div className="nexa-card relative flex min-h-0 flex-1 flex-col overflow-hidden p-5">
      {/* ── FON: sekin aylanadigan 3D kampus + kameralar + parda ── */}
      <div className="pointer-events-none absolute inset-0">
        <MapLibreMap
          className="absolute inset-0"
          center={CAMPUS_CENTER}
          zoom={CAMPUS_ZOOM}
          campusAreas="selected"
          selectedCampusId={campusId}
          markers={camMarkers}
          initial3D
          interactive={false}
          autoRotate={2.5}
          controls={[]}
          onMapReady={onMapReady}
        />
        <div className="absolute inset-0" style={{ background: p.veil }} />
      </div>

      {/* Sarlavha */}
      <div className="relative z-20 flex flex-wrap items-center justify-between gap-3">
        {/* Sarlavha chapdagi ro'yxat ostida qolmasin */}
        <div className="flex items-center gap-3" style={{ paddingLeft: LIST_W - 12 }}>
          <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: p.iconBg, color: p.ring }}>
            <Radar size={20} />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{r.kicker}</p>
            <h2 className="text-[17px] font-semibold text-slate-100">{r.title}</h2>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="hik-chip flex items-center gap-2 px-3 py-1.5 text-[12px] text-slate-300">
            <span className="h-2 w-2 animate-pulse rounded-full" style={{ background: blips.length ? LEVEL_TONE.alarm : "#22C55E" }} />
            {blips.length ? r.pending(blips.length) : r.scanning}
          </span>
          <button
            type="button"
            onClick={onOpenMap}
            className="inline-flex items-center gap-2 rounded-full bg-[#2584FF] px-4 py-2 text-[12.5px] font-semibold text-[#FFFFFF] shadow-[0_10px_24px_-12px_rgba(37,132,255,0.8)] transition-transform hover:-translate-y-0.5"
          >
            <MapIcon size={15} />
            {r.openMap}
          </button>
        </div>
      </div>

      {/* Radar — ro'yxat ostida qolmasin deb chapdan joy qoldiriladi */}
      <div className="relative z-10 flex min-h-0 flex-1 items-center justify-center py-3" style={{ paddingLeft: LIST_W }}>
        <div className="relative aspect-square h-full max-h-[640px]">
          <svg viewBox="0 0 600 600" className="absolute inset-0 h-full w-full overflow-visible" role="img" aria-label={r.title}>
            <defs>
              <radialGradient id="radar-fill" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={p.ring} stopOpacity="0.16" />
                <stop offset="70%" stopColor={p.ring} stopOpacity="0.05" />
                <stop offset="100%" stopColor={p.ring} stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx={C} cy={C} r={R} fill="url(#radar-fill)" />

            {/* Markazdan tarqaluvchi to'lqinlar (ping) */}
            {["0s", "1.6s"].map((begin) => (
              <circle key={begin} cx={C} cy={C} r={62} fill="none" stroke={p.ring} strokeWidth={1.5}>
                <animate attributeName="r" values={`62;${R}`} dur="3.2s" begin={begin} repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.55;0" dur="3.2s" begin={begin} repeatCount="indefinite" />
              </circle>
            ))}

            {/* Nur — oldingi qirrasi yorqin, orqasida so'nib boruvchi iz */}
            <g style={spin(5)}>
              {Array.from({ length: TRAIL }, (_, k) => (
                <path key={k} d={wedge(R, -40 - 8 * (k + 1), -40 - 8 * k)} fill={p.ring} opacity={0.2 * (1 - k / TRAIL)} />
              ))}
              <line x1={C} y1={C} x2={polar(R, -40)[0]} y2={polar(R, -40)[1]} stroke={p.ring} strokeOpacity={0.85} strokeWidth={2} />
            </g>

            {/* Nozik kesishgan chiziqlar — sekin aylanadi */}
            <g style={spin(60)}>
              {[0, 45, 90, 135].map((a) => {
                const [x0, y0] = polar(R, a);
                const [x1, y1] = polar(R, a + 180);
                return <line key={a} x1={x0} y1={y0} x2={x1} y2={y1} stroke={p.faint} strokeWidth={0.8} strokeDasharray="2 6" />;
              })}
            </g>

            {/* Ichki punktir halqa — teskari aylanadi, ustida o'z nuqtasi */}
            <g style={spin(22, true)}>
              <circle cx={C} cy={C} r={150} fill="none" stroke={p.faint} strokeWidth={1} strokeDasharray="2 10" />
              <circle cx={C} cy={C - 150} r={3.5} fill={p.ring} opacity={0.8} />
            </g>

            {/* ── RADARNING O'ZI AYLANADI: darajali shkala halqasi ── */}
            <g style={spin(36)}>
              {Array.from({ length: 72 }, (_, k) => {
                const a = k * 5;
                const long = k % 6 === 0;
                const [x0, y0] = polar(R + 5, a);
                const [x1, y1] = polar(R + (long ? 16 : 10), a);
                return <line key={k} x1={x0} y1={y0} x2={x1} y2={y1} stroke={long ? p.ring : p.soft} strokeWidth={long ? 2 : 1} />;
              })}
              {[0, 90, 180, 270].map((a) => {
                const [tx, ty] = polar(R + 24, a);
                return (
                  <polygon
                    key={a}
                    points="0,-5 4.5,4 -4.5,4"
                    fill={p.ring}
                    transform={`translate(${tx.toFixed(1)},${ty.toFixed(1)}) rotate(${a - 90})`}
                  />
                );
              })}
            </g>
            {/* Uzilgan yoy halqasi — teskari */}
            <circle cx={C} cy={C} r={R - 9} fill="none" stroke={p.soft} strokeWidth={1.4} strokeDasharray="60 22 10 22" style={spin(28, true)} />

            {/* Asosiy halqa */}
            <circle cx={C} cy={C} r={R} fill="none" stroke={p.ring} strokeWidth={3} />
            {/* Halqa bo'ylab yuguruvchi nuqtalar */}
            <g style={spin(9)}>
              <circle cx={C} cy={C - R} r={4.5} fill={p.ring} />
            </g>
            <g style={spin(15, true)}>
              <circle cx={C} cy={C + R} r={3.5} fill={p.bar} />
            </g>

            {/* Yon qavslar + ustunlar — sekin chayqaladi */}
            <g style={SWAY}>
              {[
                [142, 218],
                [-38, 38],
              ].map(([a0, a1], s) => (
                <g key={s}>
                  <path d={arc(240, a0, a1)} fill="none" stroke={p.soft} strokeWidth={1.2} />
                  <path d={arc(247, a0 + 8, a1 - 8)} fill="none" stroke={p.faint} strokeWidth={1} />
                  {[a0 - 3, a1 + 3].map((a, i) => {
                    const [x0, y0] = polar(236, a);
                    const [x1, y1] = polar(254, a + (i === 0 ? -5 : 5));
                    return <line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke={p.soft} strokeWidth={1.2} />;
                  })}
                </g>
              ))}
              {[148, -32].map((start, s) =>
                Array.from({ length: BARS }, (_, k) => {
                  const a = start + (64 * (k + 0.5)) / BARS;
                  const [x0, y0] = polar(213, a);
                  const [x1, y1] = polar(228, a);
                  return (
                    <line
                      key={`${s}-${k}`}
                      x1={x0}
                      y1={y0}
                      x2={x1}
                      y2={y1}
                      stroke={p.bar}
                      strokeWidth={5}
                      style={{ animation: `radar-bar 2.2s ease-in-out ${(k * 0.07).toFixed(2)}s infinite` }}
                    />
                  );
                })
              )}
            </g>

            {/* Markazdan yonlarga oqib turuvchi nuqtali chiziqlar */}
            {[`M120,${C} L236,${C}`, `M364,${C} L480,${C}`].map((d) => (
              <path
                key={d}
                d={d}
                stroke={p.soft}
                strokeWidth={1.4}
                strokeDasharray="1.5 7"
                strokeLinecap="round"
                style={{ animation: "radar-dash 1.2s linear infinite" }}
              />
            ))}

            {/* Ichki halqa: nafas oluvchi markaz + AYLANUVCHI yashil qavslar */}
            <circle cx={C} cy={C} r={61} fill={p.core} />
            <circle cx={C} cy={C} r={62} fill={p.ring}>
              <animate attributeName="opacity" values="0.04;0.14;0.04" dur="3.2s" repeatCount="indefinite" />
            </circle>
            <circle cx={C} cy={C} r={62} fill="none" stroke={p.soft} strokeWidth={1.2} />
            <circle cx={C} cy={C} r={72} fill="none" stroke={p.faint} strokeWidth={1} strokeDasharray="3 6" style={spin(18, true)} />
            {[180, 0].map((a) => {
              const [x0, y0] = polar(62, a);
              const [x1, y1] = polar(76, a);
              return <line key={a} x1={x0} y1={y0} x2={x1} y2={y1} stroke={p.soft} strokeWidth={1.2} />;
            })}
            <g style={spin(8)}>
              {[arc(48, 150, 210), arc(48, -30, 30)].map((d) => (
                <path
                  key={d}
                  d={d}
                  fill="none"
                  stroke="#22C55E"
                  strokeWidth={4}
                  strokeLinecap="round"
                  style={{ animation: "radar-blink 2.8s ease-in-out infinite" }}
                />
              ))}
            </g>

            {/* Tepadagi marker (pufakcha shunga ishora qiladi) */}
            <circle cx={mx} cy={my} r={13} fill="none" stroke={p.ring} strokeWidth={2}>
              <animate attributeName="r" values="13;26;13" dur="2.6s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.6;0;0.6" dur="2.6s" repeatCount="indefinite" />
            </circle>
            <circle cx={mx} cy={my} r={13} fill={p.marker} stroke={p.ring} strokeWidth={3} />
            <circle cx={mx} cy={my} r={6.5} fill="none" stroke={p.ring} strokeWidth={2.5} />
          </svg>

          {/* Hodisa yo'q — marker yonidagi ko'k pufakcha */}
          <AnimatePresence>
            {blips.length === 0 && (
              <motion.div
                key="bubble"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="pointer-events-none absolute"
                style={{ left: `${(mx + 28) / 6}%`, top: `${my / 6}%` }}
              >
                <div className="relative w-max max-w-[260px] -translate-y-1/2 rounded-xl bg-[#2352E6] px-4 py-2.5 text-[13px] font-semibold leading-snug text-[#FFFFFF] shadow-[0_14px_30px_-14px_rgba(35,82,230,0.9)]">
                  <span className="absolute -left-1.5 top-1/2 h-3 w-3 -translate-y-1/2 rotate-45 rounded-[2px] bg-[#2352E6]" />
                  <span className="relative">{r.empty}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── UCHUVCHI KARTOCHKA: kameradan chiqib chapdagi ro'yxatga qo'shiladi ── */}
      <FlightLayer flight={flight} listX={LIST_W / 2} onDone={endFlight} time={time} p={p} />

      {/* ── CHAPDAGI RO'YXAT — panel chetiga YOPISHGAN (`left-0`) ── */}
      <BlipList
        items={blips}
        r={r}
        width={LIST_W}
        justLanded={flight?.ev.id ?? null}
        onPick={setModalEv}
        time={time}
      />

      {/* Hodisa modali — kartochka bosilganda: vaqt va qisqa ma'lumot,
          "Batafsil" esa to'liq dossiyega (`onPick`) o'tkazadi. */}
      <AnimatePresence>
        {modalEv && (
          <RadarEventModal
            ev={modalEv}
            r={r}
            onClose={() => setModalEv(null)}
            onDetail={() => {
              const id = modalEv.id;
              setModalEv(null);
              onPick(id);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────────────── Uchuvchi kartochka ────────────────────────── */

/**
 * Kameradan chiqib ro'yxatga uchadigan kadr.
 *
 * Uch bosqich (bitta `keyframes` bilan): kameraning ustida PAYDO bo'ladi
 * → bir lahza turadi → KICHRAYIB chapdagi ro'yxat tomon uchadi.
 * Chiziq kamera nuqtasidan kartochkagacha tortiladi va kartochka
 * uchganda so'nadi.
 */
function FlightLayer({
  flight,
  listX,
  onDone,
  time,
  p,
}: {
  flight: Flight | null;
  /** Ro'yxat markazi — kartochka shu yerga uchadi. */
  listX: number;
  onDone: (key: number) => void;
  time: (iso: string) => string;
  p: (typeof PALETTE)[keyof typeof PALETTE];
}) {
  return (
    <AnimatePresence>
      {flight && (
        <div key={flight.key} className="pointer-events-none absolute inset-0 z-[25] overflow-hidden">
          {/* Kameradan chiqayotgan chiziq */}
          <svg className="absolute inset-0 h-full w-full">
            <motion.line
              x1={flight.from.x}
              y1={flight.from.y}
              x2={flight.from.x}
              y2={flight.from.y}
              stroke={p.lineLit}
              strokeWidth={1.2}
              strokeDasharray="4 4"
              initial={{ opacity: 0 }}
              animate={{ x2: flight.from.x - 46, y2: flight.from.y - 34, opacity: [0, 1, 1, 0] }}
              transition={{ duration: 2.8, times: [0, 0.15, 0.55, 1], ease: "easeOut" }}
            />
            {/* Kamera nuqtasida to'lqin */}
            <circle cx={flight.from.x} cy={flight.from.y} r={6} fill="none" stroke={CAMERA_FIRING} strokeWidth={2}>
              <animate attributeName="r" values="6;22" dur="1.4s" repeatCount="2" />
              <animate attributeName="opacity" values="0.9;0" dur="1.4s" repeatCount="2" />
            </circle>
          </svg>

          {/* Kadr — kameradan chiqadi, so'ng kichrayib ro'yxatga uchadi */}
          <motion.div
            className="absolute left-0 top-0"
            initial={{ x: flight.from.x - 60, y: flight.from.y - 40, scale: 0.55, opacity: 0 }}
            animate={{
              x: [flight.from.x - 60, flight.from.x - 106, listX - 74],
              y: [flight.from.y - 40, flight.from.y - 118, 120],
              scale: [0.55, 1, 0.24],
              opacity: [0, 1, 0],
            }}
            transition={{ duration: 2.8, times: [0, 0.22, 1], ease: [0.4, 0, 0.2, 1] }}
            onAnimationComplete={() => onDone(flight.key)}
          >
            <div
              className="w-[148px] overflow-hidden rounded-xl border-2 bg-[#0B1220] shadow-[0_18px_38px_-14px_rgba(0,0,0,0.8)]"
              style={{ borderColor: LEVEL_TONE[detectionLevel(flight.ev)] }}
            >
              <img
                src={nvrImageUrl(flight.ev) ?? ""}
                alt=""
                className="h-[94px] w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
              <div className="px-2 py-1">
                <p className="truncate text-[11px] font-semibold text-slate-100">{nvrEventLabel(flight.ev)}</p>
                <p className="text-[10px] text-slate-400">{time(flight.ev.time)}</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ──────────────────────────── Chapdagi ro'yxat ─────────────────────────── */

/**
 * "Aniqlangan hodisalar" — panel chetiga YOPISHGAN ro'yxat (`left-0`).
 *
 * Kartochka bosilsa hodisa modali ochiladi. Uchib kelgan yozuv bir
 * lahza yonib turadi (`justLanded`) — foydalanuvchi qaysi qator yangi
 * qo'shilganini ko'rsin.
 */
function BlipList({
  items,
  r,
  width,
  justLanded,
  onPick,
  time,
}: {
  items: NvrEvent[];
  r: Messages["dashboard"]["radar"];
  width: number;
  justLanded: number | null;
  onPick: (ev: NvrEvent) => void;
  time: (iso: string) => string;
}) {
  return (
    <div
      className="absolute bottom-0 left-0 top-0 z-20 flex flex-col gap-2 border-r border-white/[0.06] bg-[rgba(6,11,22,0.55)] px-3 py-4 backdrop-blur-[2px]"
      style={{ width }}
    >
      <p className="px-1 text-[11px] font-bold uppercase leading-tight tracking-[0.14em] text-slate-400">{r.list}</p>
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-0.5">
        {items.length === 0 ? (
          <p className="px-1 text-[11.5px] leading-snug text-slate-500">{r.empty}</p>
        ) : (
          items.map((ev) => {
            const landed = justLanded === ev.id;
            return (
              <motion.button
                key={ev.id}
                type="button"
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => onPick(ev)}
                className={`flex flex-none flex-col items-start gap-0.5 rounded-lg border bg-[rgba(11,18,32,0.86)] px-2.5 py-2 text-left transition-colors hover:border-white/25 ${
                  landed ? "border-amber-400/70" : "border-white/[0.09]"
                }`}
              >
                <span className="flex w-full items-center gap-2">
                  <span className="h-2 w-2 flex-none rounded-full" style={{ background: LEVEL_TONE[detectionLevel(ev)] }} />
                  <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-slate-100">{nvrEventLabel(ev)}</span>
                </span>
                <span className="w-full truncate pl-4 text-[10.5px] text-slate-400">
                  {cameraPlaceLabel(ev.channel, ev.camera)} · {time(ev.time)}
                </span>
              </motion.button>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ───────────────────────────── Hodisa modali ───────────────────────────── */

/** Vaqti va qisqa ma'lumoti, "Batafsil" to'liq dossiyega o'tkazadi. */
function RadarEventModal({
  ev,
  r,
  onClose,
  onDetail,
}: {
  ev: NvrEvent;
  r: Messages["dashboard"]["radar"];
  onClose: () => void;
  onDetail: () => void;
}) {
  const t = useT();
  useModalHistory(onClose);
  const img = !ev.picture_lost ? nvrImageUrl(ev) : null;
  const when = new Date(ev.time).toLocaleString(t.locale, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  return createPortal(
    <div className="fixed inset-0 z-[92] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.97 }}
        transition={{ duration: 0.2 }}
        className="hik-glass-blue w-full max-w-[360px] overflow-hidden rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {img && (
          <div className="relative h-[170px] w-full bg-[#0B1220]">
            <img
              src={img}
              alt=""
              className="h-full w-full object-cover"
              onError={(e2) => {
                e2.currentTarget.style.display = "none";
              }}
            />
          </div>
        )}
        <div className="flex items-start justify-between gap-3 px-5 pt-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[15px] font-semibold text-slate-100">
              <span className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: LEVEL_TONE[detectionLevel(ev)] }} />
              <span className="truncate">{nvrEventLabel(ev)}</span>
            </p>
            <p className="mt-1 truncate text-[12.5px] text-slate-400">{cameraPlaceLabel(ev.channel, ev.camera)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 flex-none place-items-center rounded-full text-slate-400 transition-colors hover:bg-white/10 hover:text-slate-100"
            aria-label={t.common.close}
          >
            <X size={16} />
          </button>
        </div>
        <p className="px-5 pt-2 text-[13px] text-slate-400">{when}</p>
        <div className="px-5 pb-5 pt-4">
          <button
            type="button"
            onClick={onDetail}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2584FF] px-4 py-2.5 text-[13.5px] font-semibold text-[#FFFFFF] transition-transform hover:-translate-y-0.5"
          >
            {r.detail}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
