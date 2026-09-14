"use client";

import { useT } from "@/i18n";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { GlobeHemisphereEast, MapPinArea } from "@phosphor-icons/react";
import { MapLibreMap, type YMarker } from "@/map/maplibre/MapLibreMap";
import { useAppStore } from "@/store/useAppStore";
import { CameraQuickView } from "@/components/cameras/CameraQuickView";
import { BuildingInterior } from "@/components/dashboard/BuildingInterior";
import { DEFAULT_INSTITUTION_ID, INSTITUTIONS, institutionById } from "@/config/institutions";
import { CAMPUS_CENTER, CAMPUS_ZOOM } from "@/config/campusPoints";
import { buildingAnchors, loadCampusAreas, type CampusArea, type CampusBuilding } from "@/lib/campusAreas";
import { useNvrChannels } from "@/hooks/useNvrChannels";
import { useDetectionFeed } from "@/hooks/useDetectionFeed";
import { cameraHeading, placementFor } from "@/config/cameraPlacements";
import { DETECTION_BY_ID } from "@/lib/detectionTypes";

/**
 * 🔴 **BOSHQARUV PANELINING XARITASI — Hodisalar HUD'idagi bilan AYNI
 * XARITA** (2026-09-07, foydalanuvchi so'rovi: "loyihamda faqat bitta
 * hodisalardagi xarita qolishi kerak").
 *
 * Ilgari bu yerda IKKI xil sahna bor edi: respublika ko'lamidagi tekis
 * xarita (`Map3D`, shu fayl) va alohida SVG izometrik sahna
 * (`Campus3D.tsx`), ular tab bilan almashardi. Endi loyihada bitta 3D
 * kampus RENDERI qoldi — `MapLibreMap` ning `campusAreas` qatlami
 * (haqiqiy bino konturi, 179-maktab fasadi — tom, deraza, poydevor).
 * `EventsHudScreen.tsx` shu RENDERNI ishlatadi, bu komponent esa
 * uning KICHRAYTIRILGAN nusxasi: HUD ramkasi, footer, "boshqa
 * hodisalar" paneli va institut NOM PLITALARI (7 ta kartochka) — HECH
 * BIRI YO'Q. Faqat:
 *
 *   · **kamera nuqtalari** — TO'Q RANGDA (`CAMERA_ICON_COLOR`), holat
 *     nuqtasi (yashil/qizil) va ko'rish KONUSI bilan (2026-09-08 dan —
 *     Geo Analitikadagi bilan AYNI, pastdagi izohga qarang);
 *   · **hodisa/trevoga nuqtalari** — tur rangida, bosilsa dossiye.
 *
 * ⚠️ **Muassasa TANLASH hamon mumkin** — chap ustundagi
 * `InstitutionsPanel` yoki header'dagi select orqali
 * (`useAppStore.selectedTeknikum`). Xarita tanlovga O'ZI uchadi
 * (`MapLibreMap` ning `selectedCampusId` effekti — `fitBounds`,
 * qo'shimcha `focus` prop kerak emas).
 *
 * ⚠️ **HECH QACHON "bo'sh" holatga tushmaydi** — `EventsHudScreen`
 * dagi bilan AYNI zaxira zanjiri: tanlov bo'lmasa ham kuzatuvdagi
 * BIRINCHI muassasa (Chilonzor 179-maktab) ko'rsatiladi, chunki
 * kamera/hodisa oqimi faqat o'sha yerda bor.
 *
 * ⚠️ **"Umumiy xarita" tugmasi** (2026-09-07, foydalanuvchi so'rovi:
 * "umumiy xaritani ham ko'rish mumkin bo'lsin"). Kampusga yaqinlashtirib
 * qo'yilgan kadr respublika miqyosini ko'rsatmaydi, shuning uchun
 * o'ng-yuqoridagi tugma `overview` holatini yoqadi:
 *   · `campusAreas` — `"selected"` (bitta kampus) ↔ `"all"` (barcha
 *     kuzatuvdagi hududlar chegarasi);
 *   · `selectedCampusId` MapLibreMap'ga `overview` da `null` beriladi —
 *     aks holda "3c) Tanlangan hudud" effekti (MapLibreMap.tsx) HAR
 *     DOIM shu kampusga qaytarib uchib ketardi (`selectedCampusId`
 *     bo'sh bo'lmasa effekt kadrni majburan tor kadrga tortadi).
 *   · trevoga markerlari umumiy ko'rinishda CHIZILMAYDI — bitta
 *     maktabning o'nlab uchburchagi respublika kadrida shovqin bo'lardi
 *     (Geo Analitikadagi bilan AYNI qoida).
 * Institut NOM PLITALARI bu rejimda ham chizilmaydi (Map3D ularni
 * umuman qurmaydi) — faqat kadr kengayadi, boshqa hech narsa
 * qo'shilmaydi. Xaritadagi kampus hududiga bosish (yoki ro'yxatdan
 * tanlash) `overview`ni o'chirib, o'sha kampusga qaytadi.
 */

/** Kamera nuqtasining rangi — foydalanuvchi so'rovi bilan to'q (#333). */
const CAMERA_ICON_COLOR = "#333333";

/**
 * Marker nuqtasi — bino markazidan kichik, BARQAROR siljish.
 *
 * ⚠️ `EventsHudScreen.tsx` dagi `spread()` bilan AYNI (nusxa, import
 * EMAS): Hodisalar HUD'i o'zgarmasligi kerak bo'lgan REFERENS sahifa,
 * shuning uchun umumiy util faylga chiqarish o'RNIGA shu yerda mustaqil
 * saqlanadi — HUD faylini tegmasdan qoldirish uchun.
 */
const RING_M = 11;
function spread(a: { lng: number; lat: number }, i: number, lap: number) {
  if (lap === 0) return a;
  const ang = (i * 2.399 + lap) % (Math.PI * 2); // oltin burchak — teng tarqaladi
  const dLat = (RING_M * lap * Math.sin(ang)) / 111320;
  const dLng = (RING_M * lap * Math.cos(ang)) / (111320 * Math.cos((a.lat * Math.PI) / 180));
  return { lng: a.lng + dLng, lat: a.lat + dLat };
}

/**
 * `key` — `buildingsToGeoJson()` (`lib/campusAreas.ts`) bergan
 * `"${campusId}-${buildingIndex}"`. `campusId` o'zi ham `-` bo'lishi
 * mumkin (`edu-mk-179`), shuning uchun bo'linish OXIRGI `-` bo'yicha:
 * indeks har doim oddiy son, campusId esa nima qolsa shu.
 */
function parseBuildingKey(key: string): { campusId: string; index: number } | null {
  const i = key.lastIndexOf("-");
  if (i < 0) return null;
  const index = Number(key.slice(i + 1));
  if (!Number.isFinite(index)) return null;
  return { campusId: key.slice(0, i), index };
}

export const Map3D = memo(function Map3D({ onOpenAlerts }: { onOpenAlerts?: () => void }) {
  const tm = useT().dashboard.ui.map;
  const selectedTeknikum = useAppStore((s) => s.selectedTeknikum);
  const setSelectedTeknikum = useAppStore((s) => s.setSelectedTeknikum);

  /* HUD bilan AYNI qoida: hech narsa tanlanmasa ham kuzatuvdagi BIRINCHI
     muassasa ko'rsatiladi. */
  const selectedCampusId = selectedTeknikum ?? DEFAULT_INSTITUTION_ID ?? INSTITUTIONS[0]?.id ?? null;

  /** `true` — respublika bo'yicha barcha kuzatuvdagi hududlar ko'rinadi. */
  const [overview, setOverview] = useState(false);

  /**
   * 🔴 **TASHQI TANLOV — `overview`ni O'ZI o'chiradi** (2026-09-07 da
   * topilgan va tuzatilgan bug, foydalanuvchi xabari: "umumiy bosganimdan
   * keyin kampus bosmagunimcha kolejlarni bossam ham u lokatsiyaga
   * o'tmayabdi"). Xaritaning O'Z click handleri (`onSelectCampus`)
   * tanlaganda `overview`ni o'zi `false` qiladi — lekin `selectedTeknikum`
   * BOSHQA joydan ham o'zgarishi mumkin (chap paneldagi qidiruv ro'yxati,
   * header select, ovozli buyruq) va o'sha yo'llar `overview` holatidan
   * BEXABAR: ular faqat `useAppStore.setSelectedTeknikum`ni chaqiradi.
   * Natijada "Umumiy xarita" yoqilgan holda ro'yxatdan boshqa muassasa
   * tanlansa, `selectedCampusId` o'zgarardi-yu, xarita `overview:true`
   * bo'lgani uchun BARIBIR respublika ko'rinishida qolib ketardi —
   * foydalanuvchi tanlagan joyga UCHMASDI. Yechim: `selectedTeknikum`
   * QAYERDAN o'zgarmasin, o'zgarishning O'ZI `overview`ni yopadi. */
  const prevSelectedRef = useRef(selectedTeknikum);
  useEffect(() => {
    if (prevSelectedRef.current !== selectedTeknikum) {
      prevSelectedRef.current = selectedTeknikum;
      setOverview(false);
    }
  }, [selectedTeknikum]);

  /** Tanlangan kampusning hududi/binolari — kamera FALLBACK joylari uchun. */
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

  const anchors = useMemo(() => (area ? buildingAnchors(area) : []), [area]);

  const nvr = useNvrChannels();
  const feed = useDetectionFeed();
  /* Oqim SHU SAHIFADA ochiladi — bo'lim almashmaydi (`CameraQuickView`). */
  const [camChannel, setCamChannel] = useState<string | null>(null);

  /**
   * Bino ichki ko'rinishi — 2026-09-08, foydalanuvchi so'rovi: "binoni
   * bosganimizda... modal ochilishi kerak va binoning 3d modeli
   * chiqishi kerak... qavatlar va alohida honalar kesimida ham ichki
   * ko'rinishini ko'rish mumkin bo'lsin". `BuildingInterior` allaqachon
   * mavjud (ilgari faqat `Campus3D.tsx`da ishlatilgan, endi o'chirilgan
   * SVG sahna) — shu yerdan qayta ishlatiladi, `CampusBuilding.raw`
   * (metr-fazoda `{p,h,n}`) uning kutgan shakliga aynan mos keladi.
   */
  const [interiorBuilding, setInteriorBuilding] = useState<{
    building: CampusBuilding;
    campusName?: string;
  } | null>(null);

  const handleBuildingClick = (key: string) => {
    const parsed = parseBuildingKey(key);
    if (!parsed) return;
    // `loadCampusAreas()` keshlangan — bu chaqiruv qayta tarmoq so'rovi
    // qilmaydi, `area` state (faqat TANLANGAN kampus) yetarli emas,
    // chunki "Umumiy xarita" rejimida bosilgan bino BOSHQA kampusga
    // tegishli bo'lishi mumkin.
    loadCampusAreas().then((list) => {
      const a = list.find((x) => x.id === parsed.campusId);
      const b = a?.buildings[parsed.index];
      if (b) setInteriorBuilding({ building: b, campusName: a?.name });
    });
  };

  const markers = useMemo<YMarker[]>(() => {
    /* Kameraning ANIQ joyi bo'lsa (`config/cameraPlacements.ts`) u
       ishlatiladi; bo'lmasa bino markazlariga taqsimlanadi
       (`buildingAnchors`) — HUD'dagi bilan AYNI mantiq. */
    const hasFixed = nvr.channels.some((c) => placementFor(c.id));
    if (!anchors.length && !hasFixed) return [];

    const camPos = new Map<string, { lat: number; lng: number }>();
    nvr.channels.forEach((c, i) => {
      const fixed = placementFor(c.id);
      if (!fixed && !anchors.length) return;
      const a = anchors.length ? anchors[i % anchors.length] : null;
      camPos.set(String(c.id), fixed ?? spread(a!, i, Math.floor(i / anchors.length)));
    });

    /* Ko'rish yo'nalishi/konusi — Geo Analitikadagi bilan AYNI (2026-09-08,
       foydalanuvchi so'rovi: "geo analitikadagi kameralar ko'rinish
       zonasini ko'rsatib turibdi, huddi shuni... qo'sh"). Markaz —
       tanlangan kampusning O'ZI, chunki kamera odatda kampus hovlisiga
       qarab o'rnatiladi (`cameraHeading()` izohiga qarang — aniq burchak
       bo'lmasa GEOMETRIYADAN taxmin qilinadi, tooltipda "(taxminiy)"
       deb yoziladi). */
    const inst = institutionById(selectedCampusId);
    const center = inst ? { lat: inst.lat, lng: inst.lng } : null;
    const chById = new Map(nvr.channels.map((c) => [String(c.id), c]));

    const cam: YMarker[] = [];
    camPos.forEach((p, ch) => {
      const dir = cameraHeading(ch, center);
      const c = chById.get(ch);
      cam.push({
        id: `cam-${ch}`,
        lat: p.lat,
        lng: p.lng,
        kind: "camera",
        color: CAMERA_ICON_COLOR,
        tooltip: `#${ch}${dir ? ` · ${Math.round(dir.deg)}°${dir.approx ? ` (${tm.approx})` : ""}` : ""}`,
        /* ⚠️ Yo'nalish BERILMASA konus chizilmaydi — kuzatuv posti uni bermaydi. */
        heading: dir?.deg,
        headingApprox: dir?.approx,
        status: c?.online ? "online" : "offline",
        /* PTZ — kanal NOMIDAN (kuzatuv posti alohida bayroq bermaydi). */
        ptz: /ptz/i.test(c?.name ?? ""),
        selected: ch === camChannel,
        /* Bo'lim ALMASHMAYDI — oqim shu sahifada modal bo'lib ochiladi. */
        onClick: () => setCamChannel(ch),
      });
    });

    /* Hodisa/trevoga markerlari — FAQAT tanlangan kampusda, o'zi kelgan
       kamera ustida, va FAQAT yaqinlashtirilgan (`!overview`) kadrda —
       umumiy ko'rinishda ular shovqin bo'lardi (yuqoridagi izohga
       qarang). Eng yangi 12 tasi (ko'proq bo'lsa nuqtalar bir-birini
       bosardi — HUD'dagi bilan AYNI chegara). */
    const alerts: YMarker[] = overview
      ? []
      : feed.events
          .filter((e) => e.campusId === selectedCampusId && e.channel && camPos.has(e.channel))
          .slice(0, 12)
          .map((e) => {
            const at = camPos.get(e.channel as string)!;
            return {
              id: `alert-${e.id}`,
              // ~3 m siljish — kamera nuqtasi ostida qolib ketmasin
              lat: at.lat + 0.000_03,
              lng: at.lng + 0.000_03,
              kind: "alert" as const,
              color: DETECTION_BY_ID.get(e.type)?.color ?? "#f59e0b",
              tooltip: `${e.title} · #${e.channel} · ${e.time}`,
              /* ⚠️ **ENDI ma'lumotlarni EMAS, TAHLIL PANELINI OCHADI**
                 (2026-09-09, foydalanuvchi so'rovi): xaritadagi bitta
                 nishonni bosish ilgari darhol o'sha HODISANING ma'lumotlarini
                 ochardi. Endi o'ng tomondan "Ogohlantirishlar" tahlil
                 paneli (KPI + tur kesimi + vaqt bo'yicha ro'yxat) ochiladi
                 — dossiye esa o'sha panel ICHIDAGI qatorlardan biri
                 bosilganda (`MapDetailOverlay` → `AlertsOverviewPanel`). */
              onClick: () => onOpenAlerts?.(),
            };
          });

    return [...cam, ...alerts];
  }, [anchors, nvr.channels, feed.events, selectedCampusId, overview, camChannel, onOpenAlerts, tm.approx]);

  return (
    /* ⚠️ `.nexa-card` OLIB TASHLANDI (2026-09-07, foydalanuvchi so'rovi:
       "xarita to'liq orqa fonda bo'lishi kerak") — u chegara/soya/blur
       bilan xaritani "kartochka" qilib ko'rsatardi. Endi xarita
       `DashboardScreen.tsx`ning butun markaziy maydonini TO'LIQ orqa fon
       sifatida egallaydi, InstitutionsPanel/MapDetailOverlay esa ustida
       suzadi — dumaloq burchak va qirqish endi o'sha tashqi o'ramda. */
    <div className="relative h-full w-full overflow-hidden">
      <MapLibreMap
        className="absolute inset-0"
        center={CAMPUS_CENTER}
        zoom={CAMPUS_ZOOM}
        markers={markers}
        campusAreas={overview ? "all" : "selected"}
        selectedCampusId={overview ? null : selectedCampusId}
        onSelectCampus={(id) => {
          setSelectedTeknikum(id);
          setOverview(false);
        }}
        onBuildingClick={handleBuildingClick}
        /* ⚠️ **`forceCitySkyline3D` QAYTARILDI — 2026-09-07 da SINAB
           KO'RILGAN va RAD ETILGAN** (foydalanuvchi: "3d holatda 3d
           kampusimizni bino surilib ketadi... huddi shuni oldin
           qilganmiz, yana to'g'rila"). Bir muddat bu yerda `true` edi
           ("xarita to'liq 3d bo'lishi kerak" so'roviga javoban), lekin
           natija AYNAN oldin tuzatilgan bug edi: tayl binosi (OSM) va
           kampusning O'Z bino konturi (`mk-179.json`) bir joyda, turli
           manbadan — chegaralari bir-biriga TO'LIQ mos kelmaydi, ya'ni
           179-maktab fasadi "surilib", bino qirralari noto'g'ri
           joylardan chiqib ko'rinadi. `MapLibreMap.tsx`da bu holat
           qaytadan tekshirildi: MUAMMONI TO'G'RI hal qiluvchi yo'l —
           kampus konturini `building-3d`dan CHIQARIB tashlaydigan
           filtr — MapLibre poligon uchun `within`ni qo'llab-
           quvvatlamaydi (faqat nuqta/chiziq) va kampus geojson'ida
           tegishli binoning OSM id'si SAQLANMAGAN (faqat metr
           koordinatalari), ya'ni buni klientda hal qilib bo'lmaydi —
           TO'G'RI yechim tayl serveri tomonda. Shu sabab BOSTIRISH
           (default, `forceCitySkyline3D` berilmagan holat) qaytarildi:
           atrofdagi shahar yana TEKIS, lekin 179-maktabning O'ZI —
           ma'lumotlarni ochish uchun ENG MUHIM obyekt — to'g'ri, buzilmagan
           ko'rinishda. */
        /* ⚠️ **2026-09-07, foydalanuvchi so'rovi**: "umumiy xaritani
           bosganida butun o'zbekiston xaritasni chiqarishi kerak".
           Bu bo'lmasa "Umumiy xarita" kuzatuvdagi 7 muassasa
           klasteriga (hammasi Toshkentda) fit qilardi — respublika
           EMAS, shahar ko'rinardi. `MapLibreMap.tsx`dagi izohga
           qarang. */
        overviewFitsCountry
        show3DToggle
        initial3D
        /* ⚠️ **2026-09-08, foydalanuvchi so'rovi**: "boshqaruv panelidagi
           katta kichik +-ni pastga chapga qo'y". Default `"top-right"`
           bo'sh burchak edi, lekin pastki-chap ham bo'sh (3D tugmasi
           yuqorida, "Batafsil ma'lumot" o'ng-pastda, "Umumiy xarita"
           o'ng-yuqorida) — Geo Analitikadagi bilan AYNI joy
           (`GeoMap.tsx` `controlPosition="bottom-left"`). */
        controlPosition="bottom-left"
      />

      {/* "Umumiy xarita" ↔ "Tanlangan kampus" — 3D tugmasi bilan bir xil
          uslub, qarama-qarshi (o'ng-yuqori) burchakda. */}
      <button
        onClick={() => setOverview((v) => !v)}
        title={overview ? tm.campusHint : tm.overviewHint}
        className={`absolute right-3 top-3 z-30 flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-[11px] font-bold backdrop-blur-xl transition-colors ${
          overview
            ? "border-ice/50 bg-ice/20 text-ice-bright"
            : "border-white/10 bg-[#0C1020]/80 text-slate-200 hover:text-white"
        }`}
      >
        {overview ? <MapPinArea size={14} weight="bold" /> : <GlobeHemisphereEast size={14} weight="bold" />}
        {overview ? tm.campus : tm.overview}
      </button>

      {/* Kamera oqimi — SHU sahifada, Boshqaruv panelidan chiqmasdan. */}
      <CameraQuickView channel={camChannel} onClose={() => setCamChannel(null)} />

      {/* Bino ichki ko'rinishi — bino poligoniga bosilganda. */}
      {interiorBuilding && (
        <BuildingInterior
          building={interiorBuilding.building.raw}
          campusName={interiorBuilding.campusName}
          onClose={() => setInteriorBuilding(null)}
        />
      )}
    </div>
  );
});
