import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence } from "framer-motion";
import { MapLibreMap, type YMarker } from "@/map/maplibre/MapLibreMap";
import { CAMPUS_CENTER, CAMPUS_FOCUS_REGION, CAMPUS_POINTS, CAMPUS_ZOOM } from "@/config/campusPoints";
import { buildingAnchors, loadCampusAreas, type CampusArea } from "@/lib/campusAreas";
import { cameraHeading, placementFor } from "@/config/cameraPlacements";
import { useDetectionCameras } from "@/hooks/useDetections";
import { useNvrChannels } from "@/hooks/useNvrChannels";
import { eventChannel } from "@/lib/eventCamera";
import { MapPin } from "@phosphor-icons/react";
import { CameraPlacer } from "./CameraPlacer";
import { placementsVersion, setPlacement, subscribePlacements } from "@/lib/cameraPlacementStore";
import { INSTITUTIONS, institutionById } from "@/config/institutions";
import { DEFAULT_INSTITUTION_ID } from "@/config/institutions";
import { useDetectionFeed } from "@/hooks/useDetectionFeed";
import type { DetectionEvent } from "@/lib/detectionEvents";
import { DETECTION_BY_ID, detectionIdByCode, type DetectionId } from "@/lib/detectionTypes";
import { useAppStore } from "@/store/useAppStore";
import { CameraQuickView } from "@/components/cameras/CameraQuickView";
import { HudEventDetail } from "./HudEventDetail";
import { HudFrame } from "./HudFrame";
import { HudFooter } from "./HudFooter";
import { DetectionPanel } from "./DetectionPanel";

/** HUD rejimida xarita tugmalari yashiriladi (ramka toza tursin). */
const EMPTY_CONTROLS: string[] = [];

/**
 * Hodisalar bo'limi — "katta ekran" HUD ko'rinishi: orqa fonda xarita, ustida
 * ramka, pastda detektorlar footer'i, o'ngda hodisalar paneli.
 *
 * **Kampus yorlig'iga bosilsa o'sha muassasaning HUDUDI chiqadi** — haqiqiy
 * chegara poligoni 3D ko'tarilgan holda (`campusAreas="selected"`,
 * `src/lib/campusAreas.ts`). Tanlanmagunicha hech qanday hudud chizilmaydi.
 *
 * Yozuvga bosilsa — ustidan o'sha hodisaning MA'LUMOTLARI ochiladi
 * (`HudEventDetail` → "Aniqlanganlar" bo'limidagi bilan AYNI oyna).
 */
/**
 * Marker nuqtasi — bino markazidan kichik, BARQAROR siljish.
 *
 * Bir binoga bir nechta kamera/hodisa tushishi mumkin; siljishsiz ular
 * ustma-ust chiqadi. Burchak indeksdan hisoblanadi, ya'ni har renderda bir xil
 * joyda turadi (tasodifiy EMAS — aks holda markerlar sakrardi).
 */
const RING_M = 11; // siljish radiusi, metr
function spread(a: { lng: number; lat: number }, i: number, lap: number) {
  if (lap === 0) return a;
  const ang = (i * 2.399 + lap) % (Math.PI * 2); // oltin burchak — teng tarqaladi
  const dLat = (RING_M * lap * Math.sin(ang)) / 111320;
  const dLng = (RING_M * lap * Math.cos(ang)) / (111320 * Math.cos((a.lat * Math.PI) / 180));
  return { lng: a.lng + dLng, lat: a.lat + dLat };
}

export function EventsHudScreen() {
  const { eventsByType, counts, alerts, knownCount, dismiss, clearAll, live } = useDetectionFeed();
  const [activeId, setActiveId] = useState<DetectionId | null>(null);
  const [focus, setFocus] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
  const [detail, setDetail] = useState<DetectionEvent | null>(null);
  /** Ko'rsatilayotgan kampus — header'dagi muassasa tanlovidan yoki yorliqdan. */
  const selectedTeknikum = useAppStore((s) => s.selectedTeknikum);
  const [pickedCampusId, setPickedCampusId] = useState<string | null>(null);
  /* Kamera joylashtirish rejimi: panel ochiqmi va qaysi kanal tanlangan. */
  const [placerOpen, setPlacerOpen] = useState(false);
  const [placing, setPlacing] = useState<string | null>(null);
  // Joylar o'zgarsa markerlar qayta chizilsin
  useSyncExternalStore(subscribePlacements, placementsVersion, () => 0);
  // Header'da muassasa almashsa HUD ham o'sha kampusga o'tadi
  useEffect(() => {
    if (selectedTeknikum) setPickedCampusId(selectedTeknikum);
  }, [selectedTeknikum]);
  /* HUD DOIM biror kampusni ko'rsatadi: "barcha muassasalar" holatida ham
     kuzatuvdagi BIRINCHISI (Chilonzor 179-maktab) ochiladi — kamera va
     hodisa oqimi faqat o'sha yerda bor, kampussiz ekran bo'sh qolardi. */
  const selectedCampusId = pickedCampusId ?? selectedTeknikum ?? DEFAULT_INSTITUTION_ID ?? INSTITUTIONS[0]?.id ?? null;

  /** Tanlangan kampusning hududi va binolari (`public/geojson/campus/`). */
  const [area, setArea] = useState<CampusArea | null>(null);
  useEffect(() => {
    let alive = true;
    loadCampusAreas()
      .then((list) => alive && setArea(list.find((a) => a.id === selectedCampusId) ?? null))
      .catch(() => alive && setArea(null));
    return () => {
      alive = false;
    };
  }, [selectedCampusId]);

  /** Bino markazlari — kamera va hodisa markerlari shularga taqsimlanadi. */
  const anchors = useMemo(() => (area ? buildingAnchors(area) : []), [area]);

  /** HAQIQIY kameralar — kuzatuv posti kanallari (koordinata yo'q, binoga bog'lanadi). */
  /* ⚠️ `useDetectionCameras()` faqat HODISA KELGAN kanallarni beradi
     (hodisalardan yig'iladi), ya'ni xaritada 32 tadan bir nechtasi
     ko'rinardi. Kanallar ro'yxati esa `useNvrChannels()` da to'liq —
     shuning uchun markerlar shundan quriladi, hodisa sanog'i esa
     `useDetectionCameras()` dan qo'shiladi. */
  const nvr = useNvrChannels();
  const { cameras: eventCams } = useDetectionCameras();
  const cameras = useMemo(() => {
    const counts = new Map(eventCams.map((c) => [c.channel, c.count]));
    if (nvr.channels.length === 0) return eventCams.map((c) => ({ ...c, name: c.name }));
    return nvr.channels.map((c) => ({
      channel: String(c.id),
      name: c.name,
      count: counts.get(String(c.id)) ?? 0,
      people: 0,
      last: "",
    }));
  }, [nvr.channels, eventCams]);

  // Kamera markeri mavjud kamera oqimini ochadi (yangi logika yozilmaydi)
  const setActivePage = useAppStore((s) => s.setActivePage);
  /* Kamera oqimi SHU ekranda ochiladi (`CameraQuickView`). */
  const [camChannel, setCamChannel] = useState<string | null>(null);

  /** Marker `onClick` i quyida e'lon qilinadigan `openDetail` ni chaqiradi —
   *  ref bo'lgani uchun markerlar har hodisada qayta qurilmaydi. */
  const openDetailRef = useRef<(e: DetectionEvent) => void>(() => {});
  const [clock, setClock] = useState("");

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString("uz-UZ", { hour12: false }));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  // Ovozli buyruq / global qidiruvdan kelgan hodisa filtri — footer tanlovi
  // bo'lib tushadi va kanal tozalanadi.
  const voiceEventFilter = useAppStore((s) => s.voiceEventFilter);
  const setVoiceEventFilter = useAppStore((s) => s.setVoiceEventFilter);
  useEffect(() => {
    if (!voiceEventFilter) return;
    // `eventType: null` — "barcha hodisalar" buyrug'i (filtrni tozalash)
    const code = voiceEventFilter.value.eventType;
    setActiveId(code ? detectionIdByCode(code) : null);
    setVoiceEventFilter(null);
  }, [voiceEventFilter, setVoiceEventFilter]);

  // Esc — detal oynasini yopadi
  useEffect(() => {
    if (!detail) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDetail(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detail]);

  // Panelda ko'rinayotgan yozuvlarning kampuslari — yorlig'i qizarib pulsatsiya qiladi
  const shownList = activeId ? eventsByType[activeId] : alerts;
  const alertedCampuses = useMemo(() => new Set(shownList.map((e) => e.campusId)), [shownList]);

  /** Shu kampusdagi hodisalar — marker sifatida binolarga qo'yiladi. */
  const campusEvents = useMemo(
    () => shownList.filter((e) => e.campusId === selectedCampusId).slice(0, 12),
    [shownList, selectedCampusId]
  );

  /** Kanal ro'yxati va kanal → kamera — hodisani kameraga bog'lash uchun. */
  const camChannels = useMemo(() => cameras.map((c) => c.channel), [cameras]);
  const camByChannel = useMemo(() => new Map(cameras.map((c) => [c.channel, c])), [cameras]);

  const markers = useMemo<YMarker[]>(() => {
    // 1) Muassasa yorliqlari — nom plitasi, bosilsa o'sha kampusga o'tadi
    const campusMarkers: YMarker[] = CAMPUS_POINTS.map((c) => {
      const alerted = alertedCampuses.has(c.id);
      return {
        id: c.id,
        lat: c.lat,
        lng: c.lng,
        kind: "campus" as const,
        color: alerted ? "#ff4d4d" : "#85E0FF",
        alert: alerted,
        label: c.name,
        sub: c.mahalla,
        // Hover popup ATAYLAB yo'q — nom faqat yorliqda ko'rinadi.
        // Bosilganda shu muassasaning HUDUDI (chegara poligoni) chiqadi.
        onClick: () => {
          setPickedCampusId(c.id);
          setFocus({ lat: c.lat, lng: c.lng, zoom: 16 });
        },
      };
    });

    // Kameraning ANIQ joyi bo'lsa (`config/cameraPlacements.ts`) u ishlatiladi;
    // bo'lmasa binolarga taqsimlanadi — ya'ni jadval bo'sh bo'lsa ham xarita
    // avvalgidek ishlaydi.
    const hasFixed = cameras.some((c) => placementFor(c.channel));
    if (!anchors.length && !hasFixed) return campusMarkers;

    /* Kamera JOYLARI oldindan hisoblanadi: hodisa markeri ham AYNI
       koordinatani ishlatadi, ya'ni hodisa o'zi kelgan kamera ustida
       ko'rinadi (ilgari ular alohida taqsimlanardi va hodisa boshqa
       binoda paydo bo'lardi). */
    const camPos = new Map<string, { lat: number; lng: number }>();
    cameras.forEach((cam, i) => {
      const fixed = placementFor(cam.channel);
      if (!fixed && !anchors.length) return;
      const a = anchors.length ? anchors[i % anchors.length] : null;
      camPos.set(cam.channel, fixed ?? spread(a!, i, Math.floor(i / anchors.length)));
    });

    /* Ko'rish yo'nalishi/konusi va onlayn holati — Geo Analitikadagi bilan
       AYNI (2026-09-08, foydalanuvchi so'rovi: "geo analitikadagi
       kameralar ko'rinish zonasini ko'rsatib turibdi, huddi shuni...
       qo'sh"). `cameras` massivi `online` maydonini saqlamaydi (yuqoridagi
       moslashtirishda tashlab qoldirilgan), shuning uchun `nvr.channels`
       dan alohida qidiriladi. */
    const campusCenter = institutionById(selectedCampusId);
    const headingCenter = campusCenter ? { lat: campusCenter.lat, lng: campusCenter.lng } : null;
    const onlineByChannel = new Map(nvr.channels.map((c) => [String(c.id), c.online]));

    // 2) HAQIQIY kameralar. Bosilganda mavjud kamera oqimi ochiladi.
    const camMarkers: YMarker[] = cameras.flatMap((cam) => {
      const p = camPos.get(cam.channel);
      if (!p) return [];
      const dir = cameraHeading(cam.channel, headingCenter);
      return {
        id: `cam-${cam.channel}`,
        lat: p.lat,
        lng: p.lng,
        kind: "camera" as const,
        color: placing === cam.channel ? "#C9DAFF" : "#85E0FF",
        /* Joylashtirish rejimida marker SUDRALADI — surilgach yangi
           koordinata `cameraPlacementStore` ga yoziladi. */
        draggable: placerOpen,
        onDragEnd: placerOpen
          ? (at: { lat: number; lng: number }) =>
              setPlacement(cam.channel, { lat: at.lat, lng: at.lng, campusId: selectedCampusId ?? undefined })
          : undefined,
        /* Hodisa soni — nuqta yonidagi rozetka. `0` bo'lsa chizilmaydi. */
        label: cam.count > 0 ? String(cam.count) : undefined,
        /* Nomlar takrorlanadi ("Camera 01" ×30) — kanal raqami YAGONA
           ajratuvchi belgi, shuning uchun u tooltipda oldinda turadi. */
        tooltip:
          `#${cam.channel} · ${cam.name}${cam.count > 0 ? ` · ${cam.count} hodisa` : ""}` +
          (dir ? ` · ${Math.round(dir.deg)}°${dir.approx ? " (taxminiy)" : ""}` : ""),
        /* ⚠️ Yo'nalish BERILMASA konus chizilmaydi — kuzatuv posti uni bermaydi. */
        heading: dir?.deg,
        headingApprox: dir?.approx,
        status: onlineByChannel.get(cam.channel) ? "online" : "offline",
        /* PTZ — kanal NOMIDAN (kuzatuv posti alohida bayroq bermaydi). */
        ptz: /ptz/i.test(cam.name ?? ""),
        selected: cam.channel === camChannel,
        /* Bo'lim ALMASHMAYDI — oqim HUD ustida modal bo'lib ochiladi
           va yopilganda operator shu ekranda qoladi. */
        onClick: () => setCamChannel(String(cam.channel)),
      };
    });

    // 3) Hodisa markerlari — turi bo'yicha rangi saqlanadi, bosilsa mavjud
    //    tafsilot oqimi (AlertCard → Aniqlanganlar) ochiladi
    const eventMarkers: YMarker[] = campusEvents.map((e, i) => {
      /* Hodisa QAYSI kamerada sodir bo'lgani — `eventChannel()` bilan
         BARQAROR aniqlanadi (aniqlash API'si hodisada kanal bermaydi,
         `lib/eventCamera.ts` izohiga qarang). Marker o'sha kameraning
         ustida, ozgina yuqoriroqda turadi — nuqtalar ustma-ust tushmasin. */
      /* ⚠️ HAQIQIY kanal BIRINCHI: kuzatuv posti hodisasi `channel` beradi
         (`fromNvr`), ya'ni trevoga nuqtasi hodisa sodir bo'lgan
         KAMERANING o'zida paydo bo'ladi. Taxminiy taqsimlash faqat
         zaxira: demo va backend yozuvlarida kanal yo'q. */
      const ch = e.channel ?? eventChannel(e, camChannels);
      const at = ch ? camPos.get(ch) : undefined;
      const p = at
        ? // ~3 m siljish: kamera nuqtasi ostida qolib ketmasin
          { lat: at.lat + 0.000_03, lng: at.lng + 0.000_03 }
        : spread(anchors[(anchors.length - 1 - (i % anchors.length)) || 0], i + 3, 1);
      const camName = ch ? camByChannel.get(ch)?.name ?? e.camera : e.camera;
      return {
        id: `ev-${e.id}`,
        lat: p.lat,
        lng: p.lng,
        kind: "alert" as const,
        color: DETECTION_BY_ID.get(e.type)?.color ?? "#f59e0b",
        tooltip: `${e.title} · ${ch ? `#${ch} · ` : ""}${camName} · ${e.time}`,
        onClick: () => openDetailRef.current(e),
      };
    });

    return [...campusMarkers, ...camMarkers, ...eventMarkers];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alertedCampuses, anchors, cameras, campusEvents, camChannels, camByChannel, setActivePage, placerOpen, placing, selectedCampusId, nvr.channels, camChannel]);

  /**
   * Hodisa bosildi (ro'yxatdan yoki 3D marker orqali) — kampus shu hodisaga
   * o'tadi va ustidan mavjud tafsilot oynasi ochiladi. Bu oqim
   * (AlertCard → DetectionModal) O'ZGARMAGAN.
   */
  const openDetail = useCallback((e: DetectionEvent) => {
    setPickedCampusId(e.campusId);
    setFocus({ lat: e.lat, lng: e.lng, zoom: 16 });
    setDetail(e);
  }, []);
  openDetailRef.current = openDetail;

  /**
   * Footer'dan detektor tanlansa (yoki bekor qilinsa) — kampus hodisa
   * markerlari faqat TANLANGAN kampusga taqsimlanadi (`campusEvents` yuqorida),
   * shuning uchun boshqa kampusdagi hodisani ko'rish uchun avval o'sha
   * kampusni topish kerak. Foydalanuvchi buni bilishi uchun xarita avtomatik
   * Toshkent umumiy ko'rinishiga qaytadi — shu yerdan qaysi muassasa yorlig'i
   * qizarganini (alert) ko'rib, o'sha yorliqqa bosib aniq joyga o'tadi.
   */
  const handleSelectDetector = useCallback((id: DetectionId | null) => {
    setActiveId(id);
    setFocus({ lat: CAMPUS_CENTER[0], lng: CAMPUS_CENTER[1], zoom: CAMPUS_ZOOM });
  }, []);

  return (
    <HudFrame
      title="CAMPUS AI — HODISALAR MONITORINGI"
      subtitle="REAL-TIME EVENT DETECTION · TOSHKENT"
      badge={
        <>
          <i>
            <span className="hud-badge-dot" />
            So'nggi yangilanish
          </i>
          <b>{clock}</b>
        </>
      }
    >
      <MapLibreMap
        className="absolute inset-0"
        center={CAMPUS_CENTER}
        zoom={CAMPUS_ZOOM}
        markers={markers}
        spotlightRegion={CAMPUS_FOCUS_REGION}
        focus={focus}
        campusAreas="selected"
        selectedCampusId={selectedCampusId}
        onSelectCampus={setPickedCampusId}
        /* Joylashtirish rejimida BOSILGAN nuqta tanlangan kanalga
           biriktiriladi. Rejim yopiq bo'lsa `undefined` — xarita
           avvalgidek ishlaydi (kursor ham o'zgarmaydi). */
        onMapClick={
          placerOpen && placing
            ? (at) => {
                setPlacement(placing, { lat: at.lat, lng: at.lng, campusId: selectedCampusId ?? undefined });
                setPlacing(null);
              }
            : undefined
        }
        controls={EMPTY_CONTROLS}
        show3DToggle
        toggle3DClassName="left-4 top-24"
        initial3D
        dim
        /* ⚠️ `themeOverride="dark"` OLIB TASHLANDI — HUD endi yorug'
           mavzuga ham ergashadi (`index.css` dagi `.hud-*` qoidalari
           ramka va panellarni oq sirtga o'tkazadi). Ilgari xarita
           majburan qorong'i edi. */
      />

      {/* Kamera joylashtirish — panel va uni ochadigan tugma */}
      <button
        type="button"
        onClick={() => {
          setPlacerOpen((v) => !v);
          setPlacing(null);
        }}
        title="Kamera joylashtirish rejimi"
        className={`absolute left-4 top-36 z-30 grid h-9 w-9 place-items-center rounded-lg border backdrop-blur-xl transition-colors ${
          placerOpen
            ? "border-ice/70 bg-ice/20 text-white"
            : "border-white/15 bg-[#0C1020]/85 text-slate-300 hover:text-white"
        }`}
      >
        <MapPin size={16} weight={placerOpen ? "fill" : "duotone"} />
      </button>

      <AnimatePresence>
        {placerOpen && (
          <CameraPlacer
            cameras={cameras.map((c) => ({ channel: c.channel, name: c.name }))}
            active={placing}
            onPick={setPlacing}
            onClose={() => {
              setPlacerOpen(false);
              setPlacing(null);
            }}
          />
        )}
      </AnimatePresence>

      <DetectionPanel
        activeId={activeId}
        alerts={alerts}
        list={activeId ? eventsByType[activeId] : []}
        knownCount={knownCount}
        live={live}
        onOpen={openDetail}
        onDismiss={dismiss}
        onClearAll={clearAll}
      />

      <HudFooter activeId={activeId} onSelect={handleSelectDetector} counts={counts} alertActive={alerts.length > 0} />

      {/* Detal — ESKI Hodisalar bo'limi, tanlangan hodisa ochilgan holda */}
      {/* Tafsilot — AYNAN o'sha hodisaning ma'lumotlari (modal).
          ⚠️ Ilgari bu yerda eski `EventsPage` to'liq ekran bo'lib ochilardi;
          `HudEventDetail` izohida nima uchun olib tashlangani yozilgan. */}
      <HudEventDetail ev={detail} onClose={() => setDetail(null)} />

      {/* Kamera oqimi — HUD ustida, bo'lim almashmasdan. */}
      <CameraQuickView channel={camChannel} onClose={() => setCamChannel(null)} />
    </HudFrame>
  );
}
