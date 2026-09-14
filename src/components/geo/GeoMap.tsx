import { memo, useMemo, useState } from "react";
import { MapLibreMap, type YMarker } from "@/map/maplibre/MapLibreMap";
import { INSTITUTIONS, institutionById } from "@/config/institutions";
import { UNIVERSITIES } from "@/config/universities";
import { UZ_CENTER, UZ_ZOOM } from "@/config/mapConfig";
import { cameraHeading, cameraPlaceLabel, placementFor } from "@/config/cameraPlacements";
import { useNvrChannels } from "@/hooks/useNvrChannels";
import { CameraQuickView } from "@/components/cameras/CameraQuickView";
import type { MetricKey } from "@/lib/geoScope";

/**
 * Geo Analitika xaritasi — BUTUN O'ZBEKISTON, to'liq fon rejimida.
 *
 * ⚠️ **VILOYAT USTIDAGI RAQAMLI NISHONLAR OLIB TASHLANDI**
 * (2026-09-05). Ular `geoAggregate` dan — 645 muassasa uchun
 * GENERATSIYA qilingan davomat/hodisa/kayfiyat/kamera sonlaridan
 * kelardi. Backend hudud kesimini bermaydi (`BACKEND.md` 1-band),
 * shuning uchun butun qatlam o'chirildi; kuzatuvdagi muassasa ustidagi
 * HAQIQIY nishon (`exactMarker`) joyida qoldi.
 *
 * Xaritada chiziladigan HAQIQIY narsalar:
 *   · viloyat va kampus chegaralari (geografiya — bu ma'lumot emas);
 *   · KAMERALAR — `config/cameraPlacements.ts` dagi aniq koordinatalar.
 *
 * ⚠️ **TREVOGA MARKERLARI BU SAHIFADA YO'Q.** Ular Hodisalar HUD'ida va
 * Boshqaruv paneli xaritasida — o'z kontekstida turadi. Bu yerda esa
 * respublika ko'lami: bitta maktabning o'nlab trevoga uchburchagi
 * ko'rsatkich nishonlari bilan aralashib, ekranni shovqin qilardi.
 */
interface Props {
  selectedRegion: string | null;
  onSelectRegion: (region: string) => void;
  /** Tanlangan muassasa id'si (`edu-…`) — hududi ajratib ko'rsatiladi. */
  selectedCampusId: string | null;
  onSelectCampus: (id: string) => void;
  /**
   * Qiymati o'zgarganda kadr RESPUBLIKA ko'rinishiga qaytadi.
   *
   * ⚠️ Tanlovni bo'shatishning O'ZI yetmaydi: `MapLibreMap` faqat
   * `selectedRegion` berilganda `fitBounds` qiladi, bo'shatilganda esa
   * kamera qayerda bo'lsa o'sha yerda qolaveradi.
   */
  resetNonce?: number;
  /**
   * NAMOYISH rejimi — viloyat ustidagi RAQAMLI NISHONLAR chiziladi.
   *
   * ⚠️ Ular `geoAggregate` dan, ya'ni GENERATSIYA qilingan ma'lumotdan
   * keladi. "Aniq statistika" yoqilganda `demo:false` bo'ladi va
   * nishonlar butunlay o'chadi — ekranda faqat o'lchanadigan narsa
   * (kamera, trevoga, chegaralar) qoladi.
   */
  demo?: boolean;
  /** Nishonlar qaysi ko'rsatkichni ko'rsatadi (namoyish rejimida). */
  metric?: MetricKey;
  /** Muassasa SONI nishonlari ("Muassasalar" tugmasi yoqilganda). */
  showCampuses?: boolean;
  /**
   * ANIQ rejimdagi ko'rsatkich nishoni — kuzatuvdagi maktabning HAQIQIY
   * qiymati (`useExactScope`). `demo:false` da viloyat nishonlari
   * chizilmaydi, lekin saralash pilyulalari baribir ishlashi kerak:
   * shu nishon tanlangan ko'rsatkichni ko'rsatadi.
   */
  exactMarker?: { id: string; label: string; tone: string | null } | null;
  /**
   * OLIY TA'LIM nuqtalari (`config/universities.ts`) chizilsinmi.
   *
   * ⚠️ Ular KUZATUVDA EMAS: kamera, davomat, hodisa yo'q va koordinatasi
   * ham TAXMINIY. Shuning uchun ular boshqa rangda (binafsha) va faqat
   * JOY sifatida chiziladi — ustiga hech qanday son qo'yilmaydi.
   */
  showUniversities?: boolean;
  selectedUniversityId?: string | null;
  onSelectUniversity?: (id: string) => void;
  /**
   * Kadrni ANIQ nuqtaga olib boradi (universitet tanlanganda).
   *
   * Berilgan bo'lsa respublika ko'rinishidan ustun turadi; `nonce`
   * o'zgarganda qayta uchadi (bir xil nuqta ikki marta tanlansa ham).
   */
  focusPoint?: { lat: number; lng: number; zoom?: number; nonce: number } | null;
  className?: string;
}


/** `INSTITUTIONS.region` qisqa yozuv → GeoJSON'dagi to'liq viloyat nomi. */
const fullRegion = (short: string) =>
  short === "Toshkent sh." ? "Toshkent shahri" : short === "Toshkent viloyati" ? "Toshkent viloyati" : short;

export const GeoMap = memo(function GeoMap({
  selectedRegion,
  onSelectRegion,
  selectedCampusId,
  onSelectCampus,
  resetNonce = 0,
  exactMarker = null,
  showUniversities = true,
  selectedUniversityId = null,
  onSelectUniversity,
  focusPoint = null,
  className = "relative h-full w-full",
}: Props) {
  const nvr = useNvrChannels();
  /* Oqim SHU SAHIFANING O'ZIDA ochiladi — bo'lim almashmaydi. */
  const [camChannel, setCamChannel] = useState<string | null>(null);

  const markers = useMemo<YMarker[]>(() => {
    const out: YMarker[] = [];

    if (exactMarker) {
      const inst = INSTITUTIONS.find((i) => i.id === exactMarker.id);
      if (inst) {
        out.push({
          id: `exact-stat-${inst.id}`,
          lat: inst.lat,
          lng: inst.lng,
          kind: "stat",
          color: exactMarker.tone ?? "#8FB8FF",
          label: exactMarker.label,
          tooltip: `${inst.name} — ${exactMarker.label}`,
          onClick: () => onSelectCampus(inst.id),
        });
      }
    }

    /* Kuzatuvdagi muassasalar — nuqta + nomi. Ular 3D kampus konturi bor
       yagona obyektlar, shuning uchun xaritada belgilanadi. */
    for (const i of INSTITUTIONS) {
      out.push({
        id: `campus-${i.id}`,
        lat: i.lat,
        lng: i.lng,
        kind: "dot",
        color: selectedCampusId === i.id ? "#C9DAFF" : "#34D399",
        tooltip: `${i.name} · ${i.region}`,
        onClick: () => {
          onSelectCampus(i.id);
          onSelectRegion(fullRegion(i.region));
        },
      });
    }

    /* ── OLIY TA'LIM MUASSASALARI ──
       Respublika bo'ylab universitet/institut nuqtalari. Ular
       KUZATUVDA EMAS — hech qanday son ko'rsatilmaydi, faqat joy va
       nom. Rangi ATAYLAB boshqacha (binafsha): kuzatuvdagi 7 obyekt
       (yashil) bilan adashtirmaslik uchun. */
    if (showUniversities) {
      for (const u of UNIVERSITIES) {
        out.push({
          id: `uni-${u.id}`,
          lat: u.lat,
          lng: u.lng,
          kind: "dot",
          color: selectedUniversityId === u.id ? "#E9D5FF" : "#A78BFA",
          tooltip: `${u.name} · ${u.region} — taxminiy joylashuv (kuzatuvda emas)`,
          onClick: () => {
            onSelectUniversity?.(u.id);
            onSelectRegion(u.region);
          },
        });
      }
    }

    /* ── KAMERALAR ──
       ⚠️ **FAQAT KAMPUS TANLANGANDA** (2026-09-05). Ilgari ular
       respublika ko'rinishida ham chizilardi: butun O'zbekiston
       xaritasida Chilonzor 179-maktabning 32 ta kamerasi bitta nuqtaga
       yig'ilib, ma'nosiz "tugma uyumi" bo'lib turardi. Endi
       foydalanuvchi muassasani TANLAGANDAN keyin, ya'ni kadr o'sha
       kampusga tushganda chiqadi.

       Faqat KOORDINATASI BOR kanal chiziladi: taxminiy joyga qo'yish
       noto'g'ri bo'lardi (`config/cameraPlacements.ts`). */
    const camPos = new Map<string, { lat: number; lng: number }>();
    (selectedCampusId ? nvr.channels : []).forEach((c) => {
      const at = placementFor(c.id);
      if (!at) return;
      /* Kanal boshqa kampusga bog'langan bo'lsa chizilmaydi. */
      if (at.campusId && at.campusId !== selectedCampusId) return;
      /* Ko'rish yo'nalishi — kampus markaziga qarab (taxminiy) yoki
         jadvalda yozilgan aniq burchak. */
      const inst = institutionById(selectedCampusId);
      const dir = cameraHeading(c.id, inst ? { lat: inst.lat, lng: inst.lng } : null);
      camPos.set(String(c.id), at);
      out.push({
        id: `cam-${c.id}`,
        lat: at.lat,
        lng: at.lng,
        kind: "camera",
        color: "#85E0FF",
        tooltip:
          `#${c.id} · ${cameraPlaceLabel(c.id, c.name)}` +
          (dir ? ` · ${Math.round(dir.deg)}°${dir.approx ? " (taxminiy)" : ""}` : ""),
        /* ⚠️ Yo'nalish BERILMASA konus chizilmaydi — kuzatuv posti uni bermaydi,
           o'ylab topilmaydi (`cameraHeading()` izohiga qarang). */
        heading: dir?.deg,
        headingApprox: dir?.approx,
        status: c.online ? "online" : "offline",
        /* PTZ — kanal NOMIDAN aniqlanadi (kuzatuv posti alohida bayroq bermaydi;
           o'lchandi: 32 kanaldan 2 tasi "IP PTZ Camera" deb ataladi). */
        ptz: /ptz/i.test(c.name ?? ""),
        selected: String(c.id) === camChannel,
        /* Bo'lim ALMASHMAYDI — oqim shu sahifada modal bo'lib ochiladi. */
        onClick: () => setCamChannel(String(c.id)),
      });
    });

    /* ⚠️ Hodisa (trevoga) markerlari bu sahifada CHIZILMAYDI — ular
       Hodisalar HUD'i va Boshqaruv paneli xaritasida bor. Geo Analitika
       respublika ko'lamidagi sahifa: bitta maktabning o'nlab trevoga
       uchburchagi xarita ustida shovqin bo'lib qolardi. */

    return out;
  }, [
    camChannel,
    exactMarker,
    selectedCampusId,
    onSelectCampus,
    onSelectRegion,
    nvr.channels,
    showUniversities,
    selectedUniversityId,
    onSelectUniversity,
  ]);

  /* Kadr:
     1. universitet tanlangan bo'lsa — o'sha nuqta (`focusPoint`);
     2. hudud yoki kampus tanlangan bo'lsa — `MapLibreMap` o'zi
        `fitBounds` qiladi, bu yerdan aralashilmaydi;
     3. tanlov yo'q — respublika ko'rinishi (`nonce` bilan qayta uchadi). */
  const focus = focusPoint
    ? focusPoint
    : selectedRegion || selectedCampusId
      ? null
      : { lat: UZ_CENTER[0], lng: UZ_CENTER[1], zoom: UZ_ZOOM, nonce: resetNonce };

  return (
    <>
    <MapLibreMap
      className={className}
      focus={focus}
      regions
      /* Rang jadvali BERILMAYDI — viloyatlar o'z standart rangida qoladi. */
      selectedRegion={selectedRegion}
      onSelectRegion={onSelectRegion}
      markers={markers}
      campusAreas="all"
      /* Kadr kampuslarga MOSLANMAYDI — sahifa respublika ko'lamida
         ochiladi; 7 ta kampus (hammasi Toshkentda) kadrni o'ziga tortsa
         viloyat xaritasi ko'rinmay qolardi. */
      fitCampusBounds={false}
      selectedCampusId={selectedCampusId}
      onSelectCampus={(id) => {
        onSelectCampus(id);
        const inst = institutionById(id);
        if (inst) onSelectRegion(fullRegion(inst.region));
      }}
      show3DToggle
      /* Geo Analitika ATAYLAB 3D holatda ochiladi — hudud maydonchalari va
         binolar tekis ko'rinishda sezilmaydi (`fill-extrusion`). */
      initial3D
      /* 3D tugmasi zoom boshqaruvidan YUQORIDA — ikkalasi ham pastki-chapda */
      toggle3DClassName="left-3 bottom-24"
      /* +/− pastki-CHAPDA. Yuqori-o'ngda tahlil paneli, pastki-o'ngda esa
         OVOZLI BOSHQARUV tugmasi (`fixed bottom-6 right-6`) turibdi. */
      controlPosition="bottom-left"
    />

    {/* Kamera oqimi — SHU sahifada. Yopilganda foydalanuvchi shu yerda
        qoladi (xarita kadri, tanlangan viloyat va kampus saqlanadi). */}
    <CameraQuickView channel={camChannel} onClose={() => setCamChannel(null)} />
    </>
  );
});
