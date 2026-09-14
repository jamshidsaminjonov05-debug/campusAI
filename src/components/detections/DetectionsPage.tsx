"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowsLeftRight,
  BoxingGlove,
  ChartLineUp,
  CheckCircle,
  IdentificationCard,
  ImageBroken,
  MagnifyingGlass,
  SecurityCamera,
  Siren,
  Cigarette,
  DeviceMobile,
  type Icon as PhIcon,
  DoorOpen,
  SquaresFour,
  Trash,
  UserFocus,
  X,
  XCircle,
} from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNvrEvents, type NvrTab } from "@/hooks/useNvrEvents";
import { useArrivals } from "@/hooks/useTodayArrivals";
import { TodayArrivalsModal } from "@/components/people/TodayArrivalsModal";
import { AlertKpiModal, CameraKpiModal, isDangerEvent } from "./DetectionKpiModals";
import {
  deleteNvrEvent,
  getEvent,
  getFace,
  isAlarm,
  listVisit,
  nvrDateTime,
  nvrImageUrl,
  nvrPersonPhotoUrl,
  nvrTime,
  verifyEvent,
  type NvrEvent,
  type NvrVerifyResult,
} from "@/lib/nvrApi";
import { parseCameraName, placeLabel } from "@/lib/cameraNaming";
import { dayMonthLongLabel } from "@/lib/dateLabel";
import { attrLabel, attrValue } from "@/lib/nvrAttributes";
import { resolveCampus } from "@/lib/cameraBinding";
import { CAMPUS_POINTS } from "@/config/campusPoints";
import { Pistol } from "@/components/common/PistolIcon";
import { DetectionCard, NVR_COLOR } from "./DetectionCard";
import { EventVideo } from "./EventVideo";
import { EnrollPerson } from "./EnrollPerson";
import { useAppStore } from "@/store/useAppStore";
import { isSeen, markSeen, seenVersion, subscribeSeen } from "@/lib/detectionSeen";
import { Pagination } from "@/components/common/Pagination";
import { TabPill, fmt } from "@/components/common/panels";
import { LibraryPhoto } from "@/components/people/FaceDatabasePage";
import { ImageLightbox } from "@/components/common/ImageLightbox";
import { FaceHistoryModal } from "@/components/people/FaceHistoryModal";
import { useT } from "@/i18n";
import type { Messages } from "@/i18n";
import { useModalHistory } from "@/hooks/useModalHistory";
import { StatCounting } from "@/components/statistics/StatCounting";

/** Sana tez tanlovi — `date_from`/`date_to` shundan hisoblanadi. `custom` — pastdagi
 *  "dan"/"gacha" sana maydonlaridan biri to'ldirilganda avtomatik yoqiladi. */
type DateRange = "today" | "yesterday" | "7d" | "30d" | "all" | "custom";

const RANGES: { id: DateRange; label: (t: Messages) => string }[] = [
  { id: "today", label: (t) => t.nvr.rangeToday },
  { id: "yesterday", label: (t) => t.nvr.rangeYesterday },
  { id: "7d", label: (t) => t.nvr.range7d },
  { id: "30d", label: (t) => t.nvr.range30d },
  { id: "all", label: (t) => t.nvr.rangeAll },
];

/** `YYYY-MM-DD`. */
function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * "Aniqlanganlar"ning O'Z davr tanlovi (`DateRange`) → `TodayArrivalsModal`
 * kutgan `ARRIVAL_PERIODS` id'si (`today"/"7d"/"30d"/"all"`).
 *
 * ⚠️ `"yesterday"`/`"custom"` bu ro'yxatda YO'Q — ular uchun eng yaqin
 * xavfsiz tanlov "Hammasi" (oynaning ichidagi davr tablari baribir
 * qo'lda o'zgartiriladi, bu faqat BOSHLANG'ICH holat).
 */
function toArrivalPeriod(range: DateRange): string {
  if (range === "today" || range === "7d" || range === "30d" || range === "all") return range;
  return "all";
}

function rangeToDates(range: DateRange): { dateFrom?: string; dateTo?: string } {
  const now = new Date();
  if (range === "today") return { dateFrom: isoDate(now), dateTo: isoDate(now) };
  if (range === "yesterday") {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    return { dateFrom: isoDate(d), dateTo: isoDate(d) };
  }
  if (range === "7d") {
    const d = new Date(now);
    d.setDate(d.getDate() - 6);
    return { dateFrom: isoDate(d), dateTo: isoDate(now) };
  }
  if (range === "30d") {
    const d = new Date(now);
    d.setDate(d.getDate() - 29);
    return { dateFrom: isoDate(d), dateTo: isoDate(now) };
  }
  return {};
}

/**
 * Aniqlanganlar KPI kartochkasi — Kameralar sahifasidagi `.cam-kpi` bilan
 * AYNI ko'rinish (rangli ikonka chipi, katta son, o'ng chetda suv belgisi).
 */
function DetKpi({
  Icon,
  value,
  label,
  hint,
  tone,
}: {
  Icon: PhIcon;
  value: number;
  label: string;
  hint: string;
  tone: string;
}) {
  return (
    <div style={{ ["--c" as string]: tone }} className="cam-kpi">
      <Icon size={58} weight="fill" className="cam-kpi-ghost" />
      <span className="cam-kpi-chip">
        <Icon size={18} weight="fill" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="cam-kpi-num">{value}</span>
        <span className="cam-kpi-label">{label}</span>
        <span className="cam-kpi-hint">{hint}</span>
      </span>
    </div>
  );
}

/** Kategoriya GIF ikonkalari — `public/icons/gif/detect/` (1.5 s qirqilgan). */
const DET_GIF = (name: string) => `/icons/gif/detect/${name}.gif`;

const TABS: { id: NvrTab; label: (t: Messages) => string; Icon: PhIcon; gif?: string }[] = [
  { id: "hammasi", label: (t) => t.nvr.tabAll, Icon: SquaresFour },
  { id: "face", label: (t) => t.nvr.tabFace, Icon: UserFocus, gif: DET_GIF("doodle-black-21-avatar-hover-pinch") },
  /* ⚠️ "Qurol" da GIF ATAYLAB YO'Q. Mavjud GIF — nishonga olish HALQASI
     (`crosshair`), qurolga o'xshamaydi; `TabPill` da esa GIF `Icon` dan
     USTUN turadi, shuning uchun u qolgan ekan pistolet ikonkasi hech
     qachon ko'rinmasdi. Mos GIF topilganda shu yerga qo'yiladi. */
  { id: "gun", label: (t) => t.nvr.tabGun, Icon: Pistol },
  {
    id: "janjal",
    label: (t) => t.nvr.tabFight,
    Icon: BoxingGlove,
    gif: DET_GIF("wired-lineal-1807-boxing-glove-hover-pinch"),
  },
  /* Chekish va telefon SERVERDA bitta kategoriya (`smoking`) — bu yerda
     ikkita tab, ajratish `isPhoneEvent()` orqali (`useNvrEvents`).
     ⚠️ "Hammasi" va "Chekish" uchun GIF YO'Q — ular phosphor ikonkasida
     qoladi (`gif` berilmasa `TabPill` `Icon` ni chizadi). */
  { id: "chekish", label: (t) => t.nvr.tabSmoking, Icon: Cigarette },
  {
    id: "telefon",
    label: (t) => t.nvr.tabPhone,
    Icon: DeviceMobile,
    gif: DET_GIF("wired-lineal-2720-logo-viber-hover-pinch"),
  },
];

/**
 * "Aniqlanganlar" — kuzatuv posti aniqlagan barcha hodisalar bitta joyda.
 *
 * Ma'lumot ichki tarmoqdagi kuzatuv posti API'dan (`FRONTEND.md`), same-origin `/nvr/...`
 * proxy orqali — kalit serverda qoladi. Tarix + jonli oqim (SSE):
 * yangi hodisa kelganda ro'yxat tepasiga qo'shiladi.
 */
/**
 * Kategoriya sarlavhasi — "Hammasi"dan boshqa har bir tab uchun (eyebrow +
 * sarlavha + izoh), `AllPeoplePage`/`FaceDatabasePage` dagi bilan AYNI
 * naqsh (bu sahifalar bilan bir xil "sarlavha" uslubi butun ilovada).
 *
 * ⚠️ Backend/kuzatuv posti tomonida biror AI model "sozlanganmi-yo'qmi" degan holatni
 * FRONTEND BILA OLMAYDI (bunday signal API'da yo'q) — shuning uchun bo'sh
 * natija uchun umumiy, HAQIQATGA mos izoh beriladi ("bu davrda topilma
 * yo'q"), server konfiguratsiyasi haqida hech narsa o'ylab topilmaydi.
 */
const CATEGORY_INTRO: Partial<Record<NvrTab, { eyebrow: string; title: (t: Messages) => string; desc: string }>> = {
  face: {
    eyebrow: "Yuz tanish",
    title: (t) => t.nvr.tabFace,
    desc: "Kameralarda tushgan yuzlar — bazadagi shaxs bilan solishtirilgan holatlar va notanish yuzlar.",
  },
  gun: {
    eyebrow: "AI model topilmalari",
    title: (t) => t.nvr.tabGun,
    desc: "Kamerada qurol ko'ringan barcha holatlar.",
  },
  janjal: {
    eyebrow: "AI model topilmalari",
    title: (t) => t.nvr.tabFight,
    desc: "Janjal yoki zo'ravon harakat sifatida aniqlangan holatlar.",
  },
  chekish: {
    eyebrow: "AI model topilmalari",
    title: (t) => t.nvr.tabSmoking,
    desc: "Chekayotgan odamlar.",
  },
  telefon: {
    eyebrow: "AI model topilmalari",
    title: (t) => t.nvr.tabPhone,
    desc: "Telefonda gaplashayotgan odamlar.",
  },
};

type PageTab = NvrTab | "counting";

export function DetectionsPage() {
  const t = useT();
  /**
   * YUQORI MENYU — 7 ta: 6 ta kategoriya + "Odamlar sanog'i".
   * `"counting"` `NvrTab` ga kirmaydi (u butunlay boshqa manba —
   * `StatCounting`, `FRONTEND.md` 10-A), shuning uchun holat kengroq
   * ittifoqda (`PageTab`) va pastda `tab`ga TORAYTIRILADI — qolgan butun
   * kod (`useNvrEvents` va h.k.) o'zgarishsiz qoladi.
   */
  const [primaryTab, setPrimaryTab] = useState<PageTab>("hammasi");
  const tab: NvrTab = primaryTab === "counting" ? "hammasi" : primaryTab;
  const setTab = (id: NvrTab) => setPrimaryTab(id);
  const [open, setOpen] = useState<NvrEvent | null>(null);

  /**
   * "2-VERSIYA" — `primaryTab`dan MUSTAQIL holat (2026-09-09, foydalanuvchi
   * so'rovi, TO'RT bosqichda aniqlashtirildi):
   *   1) "bularni bosganda ham hamma holatda 2chi versiya chiqsin" —
   *      ilgari `primaryTab === "weapon2"` edi, kategoriya tugmasi
   *      bosilsa REJIM ko'rinishsiz yopilib qolardi;
   *   2) "HAMMASINI va Qurol qismida ko'rinadi, yuz va qolgan
   *      hodisalarga to'g'ri kelmagani uchun chiqmaydi, loyihaga mos
   *      tushishi kerak" — 2-versiya API'si FAQAT qurol beradi, shuning
   *      uchun "Yuz tanish"/"Janjal"/"Chekish"/"Telefon"/"Odamlar
   *      sanog'i" bilan aloqasi yo'q;
   *   3) "ishlamadi" — sabab: kuzatuv postining O'Z "Qurol" tabi HAMISHA BO'SH
   *      (`gun` kategoriyada butun tarixda 0 ta hodisa, jonli serverda
   *      QAYTA o'lchandi). Ya'ni "Qurol" bosilganda avvalgi qoida
   *      (faqat 2-versiya ALLAQACHON yoqilgan bo'lsa saqlash) amalda
   *      HAMISHA bo'sh kuzatuv posti ro'yxatini ko'rsatardi;
   *   4) 🔴 **"IKKI XIL SAHIFA YARATISHING SHART EMAS"** — foydalanuvchi
   *      ANIQ tuzatdi: alohida `WeaponV2Panel` UI (o'z kartochka
   *      to'ri/KPI/statistika oynasi) NOTO'G'RI yondashuv edi. To'g'ri
   *      talab — bitta "Aniqlanganlar" sahifasi (shu kartochkalar,
   *      dossiye, KPI — HAMMASI o'zgarishsiz) 2-versiya yoqilganda
   *      faqat MA'LUMOT MANBASINI `WEAPON2_ORIGIN`ga almashtiradi.
   *      Manba almashtirish `useNvrEvents(tab, pageSize, { source })`
   *      orqali (pastga qarang) — `weapon2ToNvrEvent()` (`weapon2Api.ts`)
   *      xom qurol yozuvini `NvrEvent` shakliga o'giradi, shuning uchun
   *      `DetectionCard`/`DetectionModal` O'ZGARTIRILMAYDI. Maydon
   *      2-versiyada YO'Q bo'lsa (nishon ramkasi, yuz, sinf) — shunchaki
   *      bo'sh/0 (foydalanuvchi so'rovi: "kelmasa 0 qoyib ketaverasan").
   *
   * Yakuniy qoida (tugma xatti-harakati o'zgarmadi, faqat NATIJA endi
   * bitta sahifa ichida ko'rinadi):
   *   · **"Qurol" bosilsa — 2-versiya HAR DOIM yoqiladi** (mavjud
   *     holatidan qat'i nazar) — bu yerda kuzatuv postining o'zida ko'rsatadigan
   *     narsa yo'q;
   *   · **"Hammasi" bosilsa — joriy holat SAQLANADI** (na yoqiladi, na
   *     o'chiriladi) — kuzatuv posti "Hammasi"ning o'zi HAQIQIY (10 000+ yuz
   *     hodisasi bor), shuning uchun majburan o'zgartirilmaydi;
   *   · **Qolgan barcha tab — 2-versiya O'CHIRILADI**, chunki ularda
   *     kuzatuv postining o'z (haqiqiy) ma'lumoti bor.
   *
   * 🔴 **BU QOIDA (oxirgi band) BEKOR QILINDI — 2026-09-11.**
   * Foydalanuvchi `.env.local` izohida aniqlashtirdi: "Qurol"dan
   * boshqa tabga o'tilganda 2-versiya MAJBURAN o'chirilishi operator
   * uchun CHALKASH edi — "Hammasi"da tugmani bosib 2-versiyani yoqib,
   * keyin "Yuz tanish"ga o'tsa, rejim O'ZI bildirmasdan o'chib qolardi
   * (operator hamon "2-versiyadaman" deb o'ylab yurishi mumkin edi).
   * Yangi qoida — pastdagi `selectTab`ga qarang: endi FAQAT "Qurol"
   * bosilganda majburan YOQILADI, boshqa hech qaysi tab uni O'CHIRMAYDI
   * — rejimni FAQAT operatorning O'ZI, "2-versiya" tugmasi bilan
   * boshqaradi. 2-versiya API'si hamon faqat qurol berganligi sababli
   * (`weapon2Api.ts`) endi mos kelmagan tabda (Yuz tanish/Janjal/
   * Chekish/Telefon) ro'yxat OCHIQ-OYDIN BO'SH qaytadi — `useNvrEvents.ts`
   * dagi yangi filtrga qarang — kuzatuv postining o'z ma'lumotiga JIM
   * almashtirilmaydi.
   */
  const [weapon2Mode, setWeapon2Mode] = useState(false);

  /** 🔴 Kategoriya tanlash 2-versiyaga UMUMAN TEGMAYDI (2026-09-14,
   *  foydalanuvchi so'rovi: "janjalni bosganimda version 2ga o'tib
   *  ketyabdi — qachonki version 2 bosilsa shunda o'tishi kerak").
   *  Ilgari "Qurol" tabi rejimni MAJBURAN yoqardi (kuzatuv postining
   *  o'z `gun` kategoriyasi bo'sh degan mulohaza bilan), rejim esa tab
   *  almashganda o'chmagani uchun keyingi "Janjal" ham 2-versiya
   *  manbasidan ochilib qolardi. Endi rejimni FAQAT "2-versiya"
   *  tugmasining o'zi yoqadi/o'chiradi. */
  const selectTab = (id: PageTab) => {
    setPrimaryTab(id);
  };

  /* Muassasa + sana oralig'i + qidiruv — kartochkalar RO'YXATIGA va statistika
     kartalariga BIR XIL qo'llanadi. Server faqat bitta `camera` bo'yicha
     filtrlaydi, kampusda bir nechta kamera bo'lishi mumkin — shuning uchun
     muassasa/qidiruv filtri KLIENT tomonda, sana esa serverga uzatiladi. */
  const [institutionId, setInstitutionId] = useState<string>("all");
  const [range, setRange] = useState<DateRange>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [search, setSearch] = useState("");
  /* "Yuz tanish" tabiga XOS filtr — Tanilganlar/Notanishlar. Boshqa
     tabda ma'nosiz, shuning uchun ular uchun tekshirilmaydi
     (`matchesFilters`). */
  const [knownFilter, setKnownFilter] = useState<"all" | "yes" | "no">("all");
  const { dateFrom, dateTo } = useMemo(
    () => (range === "custom" ? { dateFrom: customFrom || undefined, dateTo: customTo || undefined } : rangeToDates(range)),
    [range, customFrom, customTo]
  );

  /**
   * 🔴 **SAHIFALASH IKKI XIL — KLIENT FILTRI BORMI, SHUNGA QARAB**
   * (2026-09-05 da tuzatildi).
   *
   * ⚠️ **XATO NIMA EDI.** "Tanilganlar"/"Notanishlar" (va muassasa,
   * qidiruv) filtri KLIENTDA, joriy sahifaning 24 yozuviga qo'llanadi;
   * sahifalar soni esa SERVERDAN — butun kategoriya bo'yicha
   * (`face` → 8105 yozuv → **338 sahifa**). Natijada:
   *   · "Tanilganlar" da 10 ta kartochka ko'rinib turib, pastda 338
   *     sahifa yozilardi;
   *   · ba'zi sahifalarda o'sha 24 yozuvning BIRORTASI ham filtrga
   *     tushmay, sahifa BO'SH chiqardi;
   *   · filtr almashganda sahifa 1 ga QAYTMASDI — eski sahifada
   *     qolib ketardi (foydalanuvchi xabar qildi).
   *
   * ⚠️ Serverda bunday filtr YO'Q: `/{category}/events` parametrlari —
   * `limit`, `offset`, `camera`, `date_from`, `date_to`, `images`,
   * `group`, `prefetch` (o'lchandi, `/docs`). `known` yoki
   * `recognized` yo'q, ya'ni filtrni serverga uzatib bo'lmaydi.
   *
   * ✅ **YECHIM.** Klient filtri yoqilganda bitta KATTA oyna olinadi
   * (`WINDOW = 500` — endpointning o'z chegarasi) va sahifalash
   * FILTRLANGAN ro'yxat bo'yicha KLIENTDA qilinadi. Shunda sahifalar
   * soni ham, har sahifaning to'lasi ham haqiqiy bo'ladi.
   * Filtr yo'q bo'lsa avvalgidek server sahifalashi ishlaydi.
   */
  const clientFiltered = institutionId !== "all" || search.trim() !== "" || (tab === "face" && knownFilter !== "all");
  const PAGE = 24;
  const WINDOW = 500;

  const {
    events,
    total,
    loading,
    error,
    live,
    page: serverPage,
    totalPages: serverPages,
    setPage: setServerPage,
  } = useNvrEvents(tab, clientFiltered ? WINDOW : PAGE, {
    dateFrom,
    dateTo,
    source: weapon2Mode ? "weapon2" : "nvr",
  });

  /** Klient rejimidagi sahifa (server rejimida ishlatilmaydi). */
  const [clientPage, setClientPage] = useState(1);
  const n = useCallback((v: number) => fmt(v, t.locale), [t.locale]);
  const currentTabLabel = useMemo(() => (TABS.find((x) => x.id === tab) ?? TABS[0]).label(t), [tab, t]);
  /* Filtrlarning HAR BIRI o'zgarganda 1-sahifaga qaytamiz.
     ⚠️ `knownFilter` ilgari bu ro'yxatda YO'Q edi — "Tanilganlar" ga
     o'tilganda sahifa eski qiymatida qolib, bo'sh ekran chiqardi. */
  useEffect(() => {
    setServerPage(1);
    setClientPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [institutionId, search, knownFilter, tab, dateFrom, dateTo, weapon2Mode]);

  const matchesFilters = useCallback(
    (ev: NvrEvent) => {
      // ⚠️ 2-versiyada muassasa filtri O'TKAZIB YUBORILADI: WEAPON2_ORIGIN
      // kameralari `config/cameraPlacements.ts` jadvalida yo'q
      // (butunlay boshqa tizim), `resolveCampus()` hech qachon mos
      // topmaydi — filtr yoqilgan holda ro'yxat DOIM bo'sh chiqib,
      // "ishlamayapti"dek ko'rinardi.
      if (!weapon2Mode && institutionId !== "all" && resolveCampus(ev.camera, ev.channel)?.id !== institutionId) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = `${ev.name ?? ""} ${ev.camera} ${ev.label}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (tab === "face" && knownFilter !== "all") {
        const known = ev.recognized === true;
        if (knownFilter === "yes" && !known) return false;
        if (knownFilter === "no" && known) return false;
      }
      return true;
    },
    [institutionId, search, tab, knownFilter, weapon2Mode]
  );
  /** Filtrga tushgan HAMMA yozuv (klient rejimida — 500 lik oynadan). */
  const matched = useMemo(() => events.filter(matchesFilters), [events, matchesFilters]);

  /* Ko'rsatiladigan sahifa va lenta — rejimga qarab. */
  const page = clientFiltered ? clientPage : serverPage;
  const totalPages = clientFiltered ? Math.max(1, Math.ceil(matched.length / PAGE)) : serverPages;
  const setPage = clientFiltered ? setClientPage : setServerPage;
  const filteredEvents = useMemo(
    () => (clientFiltered ? matched.slice((clientPage - 1) * PAGE, clientPage * PAGE) : matched),
    [clientFiltered, matched, clientPage]
  );

  /* ⚠️ Oyna TO'LGAN bo'lsa natija QISQARTIRILGAN bo'lishi mumkin —
     buni jim qoldirmaymiz (pastda "kamida shuncha" deb yoziladi). */
  const windowCapped = clientFiltered && events.length >= WINDOW && total > WINDOW;

  /* `lib/detectionSeen.ts` store'iga obuna — kartochka bosilganda uning
     rangi darhol o'chishi uchun qayta chizish kerak.

     ⚠️ Sahifada KO'RINISH "ko'rildi" degani EMAS. Ilgari chizilgan butun
     sahifa avtomatik belgilanardi va operator kartochkalarni ochmasdan ham
     hammasi rangsiz bo'lib qolardi — bildirishnoma rozetkasi ham bekorga
     nolga tushardi. Endi faqat BOSILGANI belgilanadi. */
  useSyncExternalStore(subscribeSeen, seenVersion, () => 0);


  /* Statistika kartalari — SSE'siz, hamma kategoriyadan (jadval tanlagan
     `tab`dan mustaqil), xuddi shu muassasa/sana/qidiruv filtri bilan. */
  /**
   * KPI SONLARI — TANLANGAN DAVRNING HAMMASI.
   *
   * ⚠️ Ilgari bu yerda `useDetections({limit: 100})` turardi, ya'ni sonlar
   * faqat OXIRGI 100 hodisadan hisoblanardi. Natijada (2026-09-02 da
   * o'lchandi) "Tanlangan davrda 100", "Odamlar 56", "Kanallar 2" chiqardi,
   * kunning HAQIQIY raqamlari esa **1082 qayd / 640 shaxs** edi.
   * `useArrivals` oraliqni sahifama-sahifa to'liq o'qiydi.
   *
   * Sana filtri berilmasa (default `range:"all"`) butun tarix o'qiladi.
   */
  const arrivals = useArrivals({ from: dateFrom, to: dateTo });
  /* ⚠️ **TO'RTALA KPI KARTOCHKA BOSILADI** (2026-09-08, foydalanuvchi
     so'rovi: "yuqori tablardagi hamma cardlar bosilishi kerak").
     "Tanlangan davrda" va "Tanilgan yuzlar" — AYNI `TodayArrivalsModal`,
     faqat boshlang'ich Tanish/Notanish filtri farq qiladi
     (`arrivalsKnown` — `null` bo'lsa oyna yopiq, "all" — "Tanlangan
     davrda" kartochkasidan, "yes" — "Tanilgan yuzlar"dan, chunki o'sha
     kartochkaning O'ZI faqat tanilganlarni va'da qiladi). */
  const [arrivalsKnown, setArrivalsKnown] = useState<"all" | "yes" | null>(null);
  const [showAlerts, setShowAlerts] = useState(false);
  const [showCameras, setShowCameras] = useState(false);
  /** "Xavf signali" — foydalanuvchi ta'rifi: janjal + qurol (`isDangerEvent`,
   *  KPI kartochka va oyna BIR XIL sonni ko'rsatsin). */
  const dangerCount = useMemo(() => arrivals.raw.filter(isDangerEvent).length, [arrivals.raw]);

  /* 3D kampus markeridan kelgan fokus: filtr tozalanadi (aks holda hodisa
     joriy kategoriyaga tushmay ro'yxatda ko'rinmasdi) va yozuv topilishi
     bilan tafsiloti ochiladi. Iste'mol qilingach kanal `null` ga qaytadi. */
  const focusedDetectionId = useAppStore((s) => s.focusedDetectionId);
  const setFocusedDetectionId = useAppStore((s) => s.setFocusedDetectionId);
  useEffect(() => {
    if (focusedDetectionId != null) {
      setTab("hammasi");
      // "Hammasi" 2-versiyani saqlab qoladi (yuqoridagi qoida), lekin bu
      // yerda BOSHQA joydan (masalan 3D kampus markeridan) kelgan ANIQ
      // kuzatuv posti hodisasi ko'rsatilishi kerak — 2-versiya ekranini emas.
      setWeapon2Mode(false);
      setInstitutionId("all");
      setSearch("");
      setRange("all");
    }
  }, [focusedDetectionId]);
  const inList = useMemo(
    () => (focusedDetectionId == null ? null : events.find((e) => e.id === focusedDetectionId) ?? null),
    [focusedDetectionId, events]
  );

  /* Ro'yxatda topilmasa hodisani SERVERDAN olamiz (`FRONTEND.md` 8-bo'lim).
     Kerak bo'ladi: marker ko'rsatgan hodisa eski sahifada bo'lishi yoki
     yig'ilgan (`group=true`) ro'yxatga vakil bo'lib tushmasligi mumkin —
     ilgari bunda tafsilot oynasi UMUMAN ochilmasdi. */
  const fetched = useQuery({
    queryKey: ["nvr-event", focusedDetectionId],
    queryFn: () => getEvent(focusedDetectionId as number),
    enabled: focusedDetectionId != null && inList == null,
    staleTime: 60_000,
    retry: false,
  });

  const focused = inList ?? (focusedDetectionId != null ? fetched.data ?? null : null);
  useEffect(() => {
    if (!focused) return;
    setOpen(focused);
    setFocusedDetectionId(null);
  }, [focused, setFocusedDetectionId]);
  // Hodisa umuman topilmadi (o'chirilgan yoki xato id) — kanal osilib qolmasin
  useEffect(() => {
    if (focusedDetectionId != null && fetched.isError) setFocusedDetectionId(null);
  }, [focusedDetectionId, fetched.isError, setFocusedDetectionId]);

  const intro = primaryTab === "counting" ? null : CATEGORY_INTRO[tab];

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* ── YUQORI MENYU — 6 ta kategoriya + "Odamlar sanog'i" ──
          Ilgari kategoriyalar sahifa O'RTASIDA, filtr panelidan pastda
          turardi; endi Statistika/Shaxslar sahifalaridagi kabi ENG
          TEPADA — birinchi navbatda ko'rinadigan navigatsiya.
          ⚠️ Fon YO'Q (`hik-glass-blue` olib tashlangan) — tugmalar
          to'g'ridan-to'g'ri sahifa foniga turadi. */}
      <div className="flex flex-none flex-wrap items-center gap-2">
        <div className="inline-flex flex-wrap gap-1">
          {TABS.map(({ id, label, Icon, gif }) => (
            <TabPill
              key={id}
              group="nvr-primary-tab"
              active={primaryTab === id}
              onClick={() => selectTab(id)}
              Icon={Icon}
              gif={gif}
              iconSize={18}
              tone={NVR_COLOR[id] ?? "#85E0FF"}
            >
              {label(t)}
            </TabPill>
          ))}
          {/* "Odamlar sanog'i" — boshqa manba (`StatCounting`, hodisa
              emas, O'LCHOV), shuning uchun `NvrTab` ro'yxatida emas,
              lekin bir xil yuqori menyuda — foydalanuvchi uchun
              "Aniqlanganlar" ichidagi yana bir kesim. */}
          <TabPill
            group="nvr-primary-tab"
            active={primaryTab === "counting"}
            onClick={() => selectTab("counting")}
            Icon={DoorOpen}
            iconSize={18}
            tone="#A78BFA"
          >
            Odamlar sanog'i
          </TabPill>
        </div>

        {/* "2-VERSIYA" — o'ng burchak, 2026-09-09 foydalanuvchi so'rovi:
            "aniqlanganlar qismida yuqori o'ng burchakka 2chi versiya
            button qo'yiladi". ATAYLAB kategoriya tugmalaridan ALOHIDA
            (`ml-auto`) — bu 6+1 kategoriyadan farqli, BOSHQA (lokal,
            o'zimiz o'qitgan) serverga o'tish tugmasi, asosiy kuzatuv posti
            navigatsiyasi bilan aralashtirilmasin.
            ⚠️ `weapon2Mode`ni boshqaradi (`primaryTab` EMAS) — shu sabab
            kategoriya tugmalaridan biri bosilsa ham (Hammasi/Yuz
            tanish/...) bu rejim O'ZI yopilib qolmaydi (yuqoridagi
            izohga qarang). Yopish — FAQAT shu tugmani qayta bosish. */}
        <button
          type="button"
          onClick={() => setWeapon2Mode((v) => !v)}
          title="Lokal qurol/janjal aniqlash — 2-versiya"
          className={`ml-auto flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition-colors ${
            weapon2Mode
              ? "border-fuchsia-400/50 bg-fuchsia-400/15 text-fuchsia-200"
              : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-fuchsia-400/30 hover:text-fuchsia-200"
          }`}
        >
          <Pistol size={14} weight={weapon2Mode ? "fill" : "regular"} />
          2-versiya
        </button>
      </div>

      {/* ⚠️ 2-versiya BOSHQA sahifa QURMAYDI — shu ostidagi JSX (sarlavha,
          KPI, kartochka to'ri, dossiye) `weapon2Mode`dan qat'i nazar
          BIR XIL, faqat `useNvrEvents(...,{ source })` orqali
          ma'lumot manbasi almashadi (yuqoridagi izohga qarang). */}
      {primaryTab === "counting" ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <StatCounting />
        </div>
      ) : (
        <>
      {/* Kategoriya sarlavhasi — "Hammasi"dan BOSHQA har bir tabda.
          "Hammasi"da o'rniga pastdagi umumiy KPI qatori chiqadi (aynan
          o'sha respublika/kuzatuv umumiy manzarasi). */}
      {intro && (
        <div className="flex-none">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{intro.eyebrow}</p>
          <h2 className="text-[19px] font-bold text-white">{intro.title(t)}</h2>
          <p className="mt-1 max-w-[640px] text-[12px] leading-snug text-slate-400">{intro.desc}</p>
        </div>
      )}

      {/* Statistika kartalari — FAQAT "Hammasi"da: respublika/kuzatuv
          UMUMIY manzarasi, tanlangan kategoriyaga bog'liq emas (pastdagi
          izohga qarang — `arrivals` ATAYLAB `tab`dan mustaqil). Boshqa
          kategoriyada bu qator o'rniga yuqoridagi sarlavha turadi. */}
      {primaryTab === "hammasi" && (
      <>
      {/* Kameralar sahifasidagi KPI qatori bilan AYNI ko'rinish
          (`.cam-kpi` — rangli ikonka chipi + katta son + suv belgisi) */}
      {/* ⚠️ **TO'RTALA KARTOCHKA BOSILADI** (2026-09-08, foydalanuvchi
          so'rovi: "yuqori tablardagi hamma cardlar bosilishi kerak").
          Har biri o'z oynasini ochadi — pastdagi render bo'limiga qarang. */}
      <div className="grid flex-none grid-cols-4 gap-2.5">
        {/* "Tanlangan davrda" — HAMMA (tanish + notanish) ro'yxati */}
        <button
          type="button"
          onClick={() => setArrivalsKnown("all")}
          className="text-left"
          title="Ro'yxatni ochish"
        >
          <DetKpi
            Icon={ChartLineUp}
            value={arrivals.events}
            label={t.nvr.statPeriod}
            /* ⚠️ Ilgari bu yerda `${filteredEvents.length} tasi ro'yxatda`
               turardi — `filteredEvents` esa JORIY SAHIFANING ro'yxati
               (`pageSize=24`), butun davrning emas. Davr o'zgarganda ham
               sahifada doim ≤24 element bo'lgani uchun son deyarli
               qimirlamasdi ("davr o'zgarsa ham o'zgarmayapti" — aynan shu
               sabab). Ustiga `arrivals.capped` (butun davr sonining o'zi
               taxminiy ekanligi, "X tasi ro'yxatda"ga aloqasi yo'q) bitta
               matnga qorishtirilgan edi. Endi ikkalasi to'g'ri: hint
               joriy TABDAGI (Yuz tanish/Qurol/...) server hisoblagan
               `total`ni ko'rsatadi — bu HAM davrga, HAM tabga qarab
               chindan o'zgaradi; "qisman" esa faqat YUQORIDAGI sonning
               o'zi (`arrivals.events`) taxminiy bo'lsa chiqadi. */
            hint={
              arrivals.isLoading
                ? "sanalmoqda…"
                : `${n(total)} ta "${currentTabLabel}"da${arrivals.capped ? " · kamida shuncha" : ""}`
            }
            tone="#22B8E6"
          />
        </button>
        {/* "Tanilgan yuzlar" — FAQAT tanilganlar (nomiga mos, 2026-09-08 da
            tuzatildi: ilgari HAMMASINI ko'rsatuvchi oynani ochardi). */}
        <button type="button" onClick={() => setArrivalsKnown("yes")} className="text-left" title="Ro'yxatni ochish">
          <DetKpi
            Icon={UserFocus}
            value={arrivals.people}
            label={t.nvr.statRecognized}
            hint={
              arrivals.people > 0
                ? `${arrivals.named} tanilgan · ${arrivals.noFace} ajratilmagan`
                : "yuz qayd etilmagan"
            }
            tone="#22C55E"
          />
        </button>
        {/* "Xavf signali" — janjal + qurol (foydalanuvchi ta'rifi,
            `isDangerEvent`). Server `alert` bayrog'i (`arrivals.alarms`)
            KENGROQ — "begona shaxs" kabi boshqa toifalarni ham qamraydi,
            shuning uchun bu yerda ATAYLAB ishlatilmaydi: kartochka soni
            va oynadagi ro'yxat BIR XIL bo'lishi kerak. */}
        <button type="button" onClick={() => setShowAlerts(true)} className="text-left" title="Ro'yxatni ochish">
          <DetKpi
            Icon={Siren}
            value={dangerCount}
            label={t.nvr.statAlarm}
            hint={dangerCount > 0 ? "janjal · qurol" : "trevoga yo'q"}
            tone="#F43F5E"
          />
        </button>
        {/* "Faol kameralar" — shu davrda qaysi kameradan nechta odam
            o'tgani (`arrivals.byChannel`, ALLAQACHON hisoblangan). */}
        <button type="button" onClick={() => setShowCameras(true)} className="text-left" title="Ro'yxatni ochish">
          <DetKpi
            Icon={SecurityCamera}
            value={arrivals.channels}
            label={t.nvr.statCameras}
            hint="hodisa kelgan kanallar"
            tone="#F59E0B"
          />
        </button>
      </div>

      {/* ⚠️ **KANAL KESIMI QATORI OLIB TASHLANDI** (2026-09-05,
          foydalanuvchi so'rovi). U har bir kanal uchun
          "#31 · Kirish posti — 1596 shaxs / 2777 qayd" degan kafel
          chizardi va KPI qatori ostida ikkinchi, undan ham zich sonlar
          qatorini hosil qilardi.

          Kanal ma'lumoti YO'QOLMADI: har bir kartochkada va hodisa
          ma'lumotlarida kamera joyi yozilgan (`cameraPlaceLabel`), kanal
          bo'yicha filtr esa yuqoridagi filtr panelida qoladi. */}

      </>
      )}

      {arrivalsKnown != null && (
        <TodayArrivalsModal
          title={arrivalsKnown === "yes" ? "Tanilgan yuzlar" : "Aniqlangan shaxslar"}
          /* Sahifaning O'Z davr tanlovi bilan boshlanadi — ikkalasi bir
             xil narsani ko'rsatsin (`toArrivalPeriod` izohiga qarang). */
          initialPeriod={toArrivalPeriod(range)}
          initialKnown={arrivalsKnown}
          onClose={() => setArrivalsKnown(null)}
        />
      )}
      {showAlerts && <AlertKpiModal events={arrivals.raw} onClose={() => setShowAlerts(false)} />}
      {showCameras && <CameraKpiModal byChannel={arrivals.byChannel} onClose={() => setShowCameras(false)} />}

      {/* Muassasa + sana + qidiruv */}
      <div className="hik-glass-blue flex flex-none flex-wrap items-center gap-2 rounded-2xl px-3 py-2.5">
        <select
          value={institutionId}
          onChange={(e) => setInstitutionId(e.target.value)}
          className="hik-input h-8 px-2.5 text-[12px] [color-scheme:dark] [&_option]:bg-ink-panel [&_option]:text-slate-100"
        >
          <option value="all">{t.nvr.allInstitutions}</option>
          {CAMPUS_POINTS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <div className="hik-input flex h-8 min-w-[180px] flex-1 items-center gap-1.5 px-2.5 text-[12px]">
          <MagnifyingGlass size={13} className="flex-none text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.nvr.searchPlaceholder}
            className="w-full bg-transparent text-slate-200 outline-none placeholder:text-slate-500"
          />
        </div>

        <div className="flex flex-none flex-wrap gap-1.5">
          {RANGES.map((r) => (
            <TabPill
              key={r.id}
              group="nvr-range"
              active={range === r.id}
              onClick={() => {
                setRange(r.id);
                setCustomFrom("");
                setCustomTo("");
              }}
            >
              {r.label(t)}
            </TabPill>
          ))}
        </div>

        <div className="flex flex-none items-center gap-1.5">
          <label className="text-[10.5px] uppercase tracking-wide text-slate-500">{t.nvr.dateFromLabel}</label>
          <input
            type="date"
            value={customFrom}
            max={customTo || undefined}
            onChange={(e) => {
              setCustomFrom(e.target.value);
              setRange("custom");
            }}
            className="hik-input h-8 px-2 text-[12px] [color-scheme:dark]"
          />
          <label className="text-[10.5px] uppercase tracking-wide text-slate-500">{t.nvr.dateToLabel}</label>
          <input
            type="date"
            value={customTo}
            min={customFrom || undefined}
            onChange={(e) => {
              setCustomTo(e.target.value);
              setRange("custom");
            }}
            className="hik-input h-8 px-2 text-[12px] [color-scheme:dark]"
          />
        </div>

      </div>

      {/* Holat — kategoriya tugmalari YUQORIDA (`nvr-primary-tab`), bu
          yerda jonli oqim belgisi + son, "Yuz tanish"da esa
          Tanilganlar/Notanishlar HAM shu qatorda (yuqori menyuda EMAS —
          faqat shu tabga xos, ustidan aralashtirmaslik uchun pastda). */}
      <div className="flex flex-none flex-wrap items-center gap-3">
        <span className={`nvr-live${live ? " is-on" : ""}`}>
          <i />
          {live ? t.nvr.live : t.nvr.connecting}
        </span>
        {/* ⚠️ Chapdagi son — FILTRGA TUSHGANLAR soni (joriy sahifaniki
            emas), o'ngdagisi — server bergan JAMI. Ilgari bu yerda
            joriy sahifaning uzunligi turardi va u doim ≤24 edi. */}
        <span className="font-mono text-[11px] text-slate-400" title={windowCapped ? t.nvr.capped : undefined}>
          {matched.length}
          {windowCapped ? "+" : ""} / {total || "—"}
        </span>
        {tab === "face" && (
          <div className="inline-flex flex-wrap gap-1 border-l border-white/10 pl-3">
            {(
              [
                ["all", "Hammasi"],
                ["yes", "Tanilganlar"],
                ["no", "Notanishlar"],
              ] as const
            ).map(([id, label]) => (
              <TabPill key={id} group="nvr-known" active={knownFilter === id} onClick={() => setKnownFilter(id)}>
                {label}
              </TabPill>
            ))}
          </div>
        )}
      </div>

      {/* Ro'yxat. Sahifalash `mt-auto` bilan panel PASTIGA tushadi (skroll
          bo'lmaganda), skroll paydo bo'lsa ro'yxat oxirida qoladi —
          `Pagination` izohiga qarang. Shu sabab o'ram `flex flex-col`. */}
      <div className="hik-glass-blue flex min-h-0 flex-1 flex-col overflow-y-auto rounded-2xl p-3">
        {error && (
          <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-300">
            {t.nvr.connectError(error)}
          </p>
        )}
        {loading && filteredEvents.length === 0 && (
          <div className="grid h-40 place-items-center">
            <span className="h-7 w-7 animate-spin rounded-full border-2 border-ice/40 border-t-ice" />
          </div>
        )}
        {!loading && filteredEvents.length === 0 && !error && (
          <p className="py-10 text-center text-[12px] text-slate-500">
            {/* 🔵 2026-09-11: 2-versiya endi tabdan mustaqil yoqiq qolishi
                mumkin (yuqoridagi `selectTab` izohiga qarang) — bu tabda
                u ma'lumot bermasa SABABI aytiladi, umumiy "topilmadi"
                bilan aralashtirilmaydi. */}
            {weapon2Mode && tab !== "gun" && tab !== "hammasi" ? t.nvr.weapon2Unsupported : t.nvr.notFound}
          </p>
        )}

        <div className="nvr-grid">
          <AnimatePresence initial={false}>
            {filteredEvents.map((ev) => (
              <motion.div
                key={ev.id}
                layout
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              >
                <DetectionCard
                  ev={ev}
                  seen={isSeen(String(ev.id))}
                  onOpen={(e) => {
                    markSeen([String(e.id)]);
                    setOpen(e);
                  }}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <Pagination
          page={page}
          totalPages={totalPages}
          onChange={setPage}
          prevLabel={t.detections.prev}
          nextLabel={t.detections.next}
          ariaLabel={t.detections.page(page)}
          className="mt-auto"
        />
      </div>

      {/* To'liq ko'rinish — Nishon/Kadr, yaqinlashtirib ko'rish mumkin */}
      <AnimatePresence>
        {open && <DetectionModal key={open.id} ev={open} onClose={() => setOpen(null)} onSelect={setOpen} />}
      </AnimatePresence>
        </>
      )}
    </div>
  );
}

/**
 * TANISH TO'G'RIMI — kamera nishoni bilan bazadagi rasmni yonma-yon
 * qo'yib, odamning o'zidan tasdiq so'raydi (`verifyEvent()`, `nvrApi.ts`).
 *
 * ⚠️ `true` — MUSTAHKAMLANADI: butun yuz guruhi shu odamga biriktiriladi,
 * ismsiz kadrlarga ham ism qo'yiladi. `false` — DOIMIY rad etish: shu
 * guruhdan kelgan YANGI kadrlarga ham keyinchalik shu ism qo'yilmaydi,
 * bir martalik tuzatish EMAS. Shu sabab ikkala tugma ham bosilgach
 * darhol qulflanadi (`result`) — ikki marta bosib ikki xil javob
 * yuborib bo'lmaydi.
 */
function VerifyRecognition({
  eventId,
  faceId,
  nishonSrc,
  person,
  onZoom,
  verdict,
  verdictScope,
}: {
  eventId: number;
  faceId: number;
  nishonSrc: string | null;
  person: { id: number; full_name: string };
  /** Kamera nishonini kattalashtirish (dossiyedagi rasm ko'ruvchisi). */
  onZoom?: () => void;
  /**
   * Serverning OLDINDAN bergan hukmi (`ev.verdict`, `GUIDE.md` — "Tasdiqlangan
   * odam QAYTA so'ralmaydi"). Bo'sh bo'lmasa savol UMUMAN ko'rsatilmaydi —
   * o'rniga shu hukm read-only ko'rinishda chiziladi.
   */
  verdict?: string;
  /** `"frame"` — aynan shu kadr tekshirilgan; `"person"` — odam ILGARI (boshqa kadrda) tasdiqlangan. */
  verdictScope?: "frame" | "person" | "";
}) {
  const vt = useT().nvr.dossier.verify;
  const qc = useQueryClient();
  const [result, setResult] = useState<NvrVerifyResult & { correct: boolean } | null>(null);
  const mutation = useMutation({
    mutationFn: (correct: boolean) => verifyEvent(eventId, correct),
    onSuccess: (res, correct) => {
      setResult({ ...res, correct });
      qc.invalidateQueries({ queryKey: ["nvr"] });
      qc.invalidateQueries({ queryKey: ["nvr-faces"] });
      qc.invalidateQueries({ queryKey: ["nvr-face", faceId] });
      qc.invalidateQueries({ queryKey: ["nvr-people-map"] });
    },
  });

  /* ⚠️ Serverdan tayyor kelgan hukm — `result` (shu SESSIYADA bosilgan)
     bilan BIR XIL ko'rinishga o'raladi, faqat matni scope'ga qarab
     farqlanadi ("bu kadr tekshirilgan" / "bu odam ilgari tasdiqlangan"). */
  const preVerdict = !result && verdict ? verdict : null;
  /** "Bazada" surati kattalashtirilganda — `ImageLightbox`, alohida bitta rasm bilan. */
  const [zoomLibrary, setZoomLibrary] = useState(false);

  return (
    <section className="nvr-dsr-block">
      <p className="nvr-dsr-h">{vt.title}</p>
      {/* ⚠️ Ikkala rasm KATTA va YONMA-YON (`flex-1`, 1:1) — chap ustun
          shu blokka to'liq beriladi. Ilgari ular 56×64 px edi va o'rta
          ustunda turardi: shunday o'lchamda ikki yuzni ko'z bilan
          solishtirib bo'lmasdi, holbuki butun blokning MA'NOSI shu. */}
      <div className="flex items-stretch gap-2 px-1 py-1">
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
          {nishonSrc ? (
            <button
              type="button"
              onClick={onZoom}
              disabled={!onZoom}
              title={onZoom ? vt.zoom : undefined}
              className="w-full overflow-hidden rounded-lg ring-1 ring-white/10 disabled:cursor-default"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={nishonSrc} alt={vt.camera} className="aspect-[3/4] w-full object-cover" />
            </button>
          ) : (
            <span className="grid aspect-[3/4] w-full place-items-center rounded-lg bg-black/40 text-slate-600">
              <ImageBroken size={16} />
            </span>
          )}
          <span className="text-[9.5px] text-slate-500">{vt.camera}</span>
        </div>
        <ArrowsLeftRight size={14} className="mt-[22%] flex-none text-slate-600" />
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
          {/* Bazadagi surat — kuzatuv posti serverining O'ZIDAN (`/people/{id}/photo`),
              surati bo'lmasa `onError` bosh harflarga qaytaradi.
              🔵 ENDI KATTALASHTIRILADI (2026-09-11, foydalanuvchi so'rovi:
              "yuz baza rasmini bosganda u ham kattalashib bersin") —
              "Kamerada" rasmi bilan AYNI naqsh, faqat o'z lightbox'i
              bilan (kutubxona surati asosiy `images` ro'yxatida yo'q). */}
          <button
            type="button"
            onClick={() => setZoomLibrary(true)}
            title={vt.zoom}
            className="w-full overflow-hidden rounded-lg ring-1 ring-ice/25"
          >
            <LibraryPhoto
              personId={person.id}
              name={person.full_name}
              size={0}
              className="aspect-[3/4] w-full object-cover"
            />
          </button>
          <span className="text-[9.5px] text-slate-500">{vt.library}</span>
        </div>
      </div>

      {/* Ism RASMLAR OSTIDA — chap ustun tor, yonida turganda u ham,
          rasmlar ham siqilib qolardi. */}
      <div className="mt-1.5 px-1">
        <p className="truncate text-[12.5px] font-semibold text-slate-100" title={person.full_name}>
          {person.full_name}
        </p>
        <p className="text-[10px] text-slate-500">{vt.question}</p>
      </div>

      {result ? (
        <div
          className={`mt-1.5 rounded-lg border px-2.5 py-2 text-[11px] ${
            result.correct
              ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
              : "border-rose-400/25 bg-rose-500/10 text-rose-300"
          }`}
        >
          {result.correct ? vt.confirmed(result.events) : vt.rejected(result.events)}
          {result.scope === "event" && (
            <span className="mt-0.5 block text-slate-400">
              {vt.pending}
            </span>
          )}
        </div>
      ) : preVerdict ? (
        /* 🔵 Server OLDINDAN hukm bergan — savol QAYTA ko'rsatilmaydi
           (`GUIDE.md`, 2026-09-10 kunduzi: "Tasdiqlangan odam QAYTA
           so'ralmaydi"). `verdict_scope:"person"` bo'lsa bu ANIQ shu
           kadr emas, odamning O'ZI ilgari tasdiqlangani uchun. */
        <div
          className={`mt-1.5 rounded-lg border px-2.5 py-2 text-[11px] ${
            preVerdict === "ok"
              ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
              : "border-rose-400/25 bg-rose-500/10 text-rose-300"
          }`}
        >
          {preVerdict === "ok" ? vt.preOk : vt.preWrong}
          <span className="mt-0.5 block text-slate-400">
            {verdictScope === "person" ? vt.prePerson : vt.preFrame}
          </span>
        </div>
      ) : (
        /* ⚠️ Tugmalar RASMLAR OSTIDA va BIRI-BIRINING TAGIDA (`flex-col`):
           chap ustun tor, yonma-yon qo'yilganda ikkala matn ham ikki
           qatorga o'ralib, tugmalar o'qilmas bo'lib qolardi. */
        <div className="mt-2 flex flex-col gap-1.5" data-verify-actions>
          <button
            type="button"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-400/10 py-2 text-[12px] font-semibold text-emerald-300 transition-colors hover:bg-emerald-400/20 disabled:opacity-50"
          >
            <CheckCircle size={15} weight="fill" /> {vt.yes}
          </button>
          <button
            type="button"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate(false)}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-rose-400/30 bg-rose-500/10 py-2 text-[12px] font-semibold text-rose-300 transition-colors hover:bg-rose-500/20 disabled:opacity-50"
          >
            <XCircle size={15} weight="fill" /> {vt.no}
          </button>
        </div>
      )}
      {mutation.isError && (
        <p className="mt-1 text-[10.5px] text-rose-400">{(mutation.error as Error)?.message ?? vt.error}</p>
      )}

      {zoomLibrary && (
        <ImageLightbox
          images={[{ src: nvrPersonPhotoUrl(person.id), label: vt.library }]}
          initialIndex={0}
          onClose={() => setZoomLibrary(false)}
        />
      )}
    </section>
  );
}

/**
 * Hodisa MA'LUMOTLARI — HAQIQIY kuzatuv posti kadri, ramkalari, video va o'tish kadrlari.
 *
 * ⚠️ EKSPORT QILINGAN: "Hodisalar" HUD'i ham shu oynani ochadi
 * (`hud/HudEventDetail.tsx`). Ilgari u yerda ESKI `EventsPage` ochilardi va
 * bitta kuzatuv posti hodisasining ustiga respublika ko'rsatkichlari, soxta
 * "ishtirokchilar", stok rasm va o'ylab topilgan yuzlar chiqardi. Endi
 * ikkala bo'lim AYNI oynani, ayni ma'lumot bilan ko'rsatadi.
 */
export function DetectionModal({
  ev,
  onClose,
  onSelect,
}: {
  ev: NvrEvent;
  onClose: () => void;
  onSelect: (ev: NvrEvent) => void;
}) {
  const t = useT();
  /* ◀ "orqaga" avval ma'lumotlarni yopadi. Hook SHU YERDA — dossiye
     "Aniqlanganlar"dan ham, `EventDossier` orqali kamera/odamlar
     ro'yxatidan ham ochiladi; bitta joyda tursa ikki marta ro'yxatga
     olinmaydi. */
  useModalHistory(onClose);
  const campus = resolveCampus(ev.camera, ev.channel);
  const color = NVR_COLOR[ev.category] ?? "#85E0FF";

  /* Yig'ilgan o'tishning QOLGAN kadrlari (`FRONTEND.md` 4-A): `group=true`
     ro'yxatni qisqartiradi, lekin ma'lumotni yashirmaydi — kartochka
     bosilganda o'sha o'tishning hamma kadri shu yerda ko'rinadi. */
  const frames = ev.frames ?? 1;
  const visit = useQuery({
    queryKey: ["nvr-visit", ev.id],
    queryFn: () => listVisit(ev.id),
    enabled: frames > 1,
    staleTime: 60_000,
    retry: false,
  });
  const visitFrames = useMemo(
    () => (visit.data?.events ?? []).filter((e) => e.id !== ev.id && e.image_url),
    [visit.data, ev.id]
  );

  /* SHU SHAXSNING butun tarixi — `face_id` bo'yicha (`FRONTEND.md` 5-B).
     Bitta o'tishning kadrlaridan FARQI: bu odam qachon kelgan bo'lsa,
     BARCHA suratlari chiqadi (bazaga qo'shilmagan bo'lsa ham). */
  const faceId = ev.face_id ?? null;
  /* 🔵 AVTOMATIK QAYTA SO'ROV (2026-09-11, foydalanuvchi savoli: "shaxs
     bazadagi o'zi kelmadi, bitta yangilab kirsam yuzi kelda — sababi
     nimada, keshdami"). Sabab kesh EMAS: `retry:false` faqat TARMOQ
     XATOSIDA qayta urinmaslikni bildiradi, kuzatuv posti esa `200` bilan
     `person:null` qaytaradi — bu xato emas, shuning uchun `retry` unga
     umuman tegishli emas. Haqiqiy sabab — kuzatuv posti yangi hodisaning yuz
     guruhini odamga BOG'LASHNI fonda, biroz KECHIKTIRIB bajaradi
     (`verifyPerson`dagi izohga qarang, "verdict_scope: person" bilan AYNI
     sabab). Oldin bu holatda dossiye shunday QOLIB QOLARDI — foydalanuvchi
     sahifani qo'lda yangilamaguncha. Endi hodisa TANILGAN, lekin shaxs
     hali BOG'LANMAGAN bo'lsa (`ev.recognized && !person`) so'rov 3
     soniyada bir avtomatik TAKRORLANADI (ko'pi bilan 6 marta, ~18 s) —
     kuzatuv posti ulgurgach dossiye O'ZI to'ldiriladi, qayta ochish shart
     emas. Tanilmagan yuzda (`ev.recognized:false`) BUTUNLAY ISHGA
     TUSHMAYDI — u yerda shaxs haqiqatan yo'q, cheksiz so'rov ketardi. */
  const facePollRef = useRef(0);
  const face = useQuery({
    queryKey: ["nvr-face", faceId],
    queryFn: () => getFace(faceId!),
    enabled: faceId != null,
    staleTime: 60_000,
    retry: false,
    refetchInterval: (query) => {
      if (!ev.recognized) return false;
      if (query.state.data?.person || ev.person?.in_library) return false;
      return facePollRef.current < 6 ? 3000 : false;
    },
  });
  useEffect(() => {
    facePollRef.current = 0;
  }, [faceId]);
  useEffect(() => {
    if (face.dataUpdatedAt) facePollRef.current += 1;
  }, [face.dataUpdatedAt]);
  const faceShots = useMemo(() => {
    const list = (face.data?.events ?? []).filter((e) => e.image_url);
    // Bitta o'tish kadrlari yuqorida allaqachon bor — takrorlanmasin
    const seen = new Set([ev.id, ...visitFrames.map((f) => f.id)]);
    return list.filter((e) => !seen.has(e.id));
  }, [face.data, ev.id, visitFrames]);

  /* 🔵 KUN BO'YICHA GURUHLASH (2026-09-11, foydalanuvchi so'rovi:
     "shu shaxsning suratlari kun bo'yicha ketma-ketlikda ishlashi
     kerak"). `/faces/{id}` javobi ALLAQACHON vaqt bo'yicha KAMAYIB
     boruvchi tartibda keladi (o'lchandi, jonli serverda) — ya'ni
     bitta kunning suratlari o'zaro ketma-ket, lekin flat panjarada
     kunlar orasidagi chegara KO'RINMASDI, 24+ surat bitta uzluksiz
     to'r bo'lib ko'rinardi. Guruhlash tartibni O'ZGARTIRMAYDI, faqat
     har kun ustiga sana yorlig'i qo'shadi — server `stats.by_day` bilan
     AYNI kalit (`time.slice(0,10)`, `FaceHistoryModal.tsx`dagi bilan
     bir xil naqsh). */
  const faceShotsByDay = useMemo(() => {
    const groups: { day: string; items: NvrEvent[] }[] = [];
    for (const f of faceShots) {
      const day = f.time.slice(0, 10);
      const last = groups[groups.length - 1];
      if (last && last.day === day) last.items.push(f);
      else groups.push({ day, items: [f] });
    }
    return groups;
  }, [faceShots]);

  /**
   * 🔴 TOPILDI VA TUZATILDI (2026-09-11, foydalanuvchi xabar qildi:
   * "1chi rasmda shaxs bazadagi o'zi kelmadi, bitta yangilab kirsam
   * yuzi kelda"). "Tanish to'g'rimi?" bloki ilgari FAQAT `face.data?.person`
   * ga (alohida `GET /faces/{id}` so'rovi) tayanardi. Kuzatuv posti
   * yangi hodisaning yuz guruhini odamga BOG'LASH ishini fonda,
   * biroz KECHIKTIRIB bajaradi (`GUIDE.md`, "verdict_scope: person" —
   * "guruh hali hisoblanmagan" bilan AYNI sabab) — juda yangi hodisada
   * (masalan shu zahoti tushgan kadr) `getFace()` `person: null`
   * qaytarishi mumkin, garchi `GET /events/{id}` javobidagi `ev.person`
   * (10-D bo'lim) ALLAQACHON to'g'ri bo'lsa ham — u ALOHIDA so'rovsiz,
   * hodisaning O'ZI bilan birga keladi. Endi shu TEZROQ manba ustuvor:
   * `face.data?.person` bo'lmasa (hali yuklanayotgan yoki kechikkan
   * bo'lsa) `ev.person`dan (agar bazada surati bo'lsa) darhol
   * foydalaniladi — foydalanuvchi sahifani qayta ochmasdan ko'radi.
   */
  const verifyPerson = useMemo(() => {
    if (face.data?.person) return face.data.person;
    if (ev.person?.in_library) return { id: ev.person.person_id, full_name: ev.person.full_name, role: ev.person.role ?? "" };
    return null;
  }, [face.data, ev.person]);

  /* Nishon (kesilgan, index 0) va Kadr (butun rasm, index 1) — bor bo'lgan
     rasmlar shu ro'yxatga tushadi. `gun`/`smoking`da odatda bitta rasm bor,
     u ALLAQACHON butun kadr, shuning uchun oxirgi rasm har doim "Kadr". */
  const images = useMemo(() => {
    const out: { src: string; label: string }[] = [];
    const nishon = nvrImageUrl(ev, 0);
    if (nishon) out.push({ src: nishon, label: t.nvr.target });
    if (ev.image_count > 1) {
      const kadr = nvrImageUrl(ev, 1);
      if (kadr) out.push({ src: kadr, label: t.nvr.frame });
    }
    return out;
  }, [ev, t]);
  /* Nishon KICHIK kartochka bo'ladi, butun kadr esa katta maydonda.
     Ikki rasm bo'lsa: 0 — kesilgan yuz, 1 — butun kadr. Bitta rasm bo'lsa
     (gun/janjal/smoking) u ALLAQACHON butun kadr, nishon kartochkasi yo'q. */
  const faceIdx = images.length > 1 ? 0 : -1;
  const frameIdx = images.length - 1;

  /* Kamera nomidan joylashuv: `1-etaj 1-LIFT` → "1-qavat · Lift"
     (`lib/cameraNaming.ts` — nom formati o'zgarsa faqat o'sha fayl tuzatiladi) */
  const place = useMemo(() => {
    const p = parseCameraName(ev.camera || "");
    return [p.floor ? t.nvr.dossier.floor(p.floor) : null, placeLabel(p.kind), p.block]
      .filter(Boolean)
      .join(" · ");
  }, [ev.camera, t]);

  /* Sarlavhadagi nom: yuzda — ism yoki "NOTANISH", boshqasida — hodisa nomi */
  const subject =
    ev.category === "face"
      ? ev.recognized
        ? ev.name || t.nvr.recognizedShort
        : t.nvr.unknownShort
      : ev.label;

  const alarm = isAlarm(ev);
  const d = t.nvr.dossier;
  /* Toifa — server `role_label`ni O'ZBEKCHA yuboradi ("O'quvchi"), shuning
     uchun `role` kodidan lug'atga olinadi; noma'lum kod bo'lsa server matni. */
  const roleText =
    ev.person?.role === "student"
      ? d.roles.student
      : ev.person?.role === "teacher"
        ? d.roles.teacher
        : ev.person?.role_label ?? "";

  /* 🔴 HODISANI O'CHIRISH (2026-09-14, foydalanuvchi so'rovi: "hodisa
     aniqlanganda hodisani ham o'chirish imkonini qo'shishing kerak").
     Panel API `DELETE /api/events/{id}` (`deleteNvrEvent`) — QAYTARIB
     BO'LMAYDI, shuning uchun avval tasdiq oynasi.
     ⚠️ Yig'ilgan O'TISH (`frames > 1`) bitta kartochka bo'lib ko'rinadi —
     faqat vakil kadrni o'chirsak, qolgan kadrlardan biri ro'yxatda
     "o'chmagan" bo'lib qayta chiqardi. Shuning uchun o'tishning barcha
     kadri (`listVisit`) o'chiriladi.
     ⚠️ "2-versiya" (`/weapon2/...`) hodisasi BOSHQA serverniki — bu yo'l
     unga tegishli emas, tugma chizilmaydi. */
  const qc = useQueryClient();
  const deletable = !(ev.image_url ?? "").startsWith("/weapon2");
  const [confirmDel, setConfirmDel] = useState(false);
  /** "Shaxs haqida ma'lumot" — shu shaxsning to'liq tarixi (`FaceHistoryModal`). */
  const [personOpen, setPersonOpen] = useState(false);
  const deleteIds = useMemo(() => {
    const ids = new Set<number>([ev.id]);
    for (const f of visit.data?.events ?? []) ids.add(f.id);
    return [...ids];
  }, [ev.id, visit.data]);
  const del = useMutation({
    mutationFn: async () => {
      for (const id of deleteIds) await deleteNvrEvent(id);
    },
    onSuccess: () => {
      /* Hodisa ko'rinadigan HAMMA ro'yxat/sanoq keshlari */
      for (const k of ["nvr", "detections", "arrivals", "nvr-faces", "nvr-face", "nvr-visit", "nvr-daily-counts", "nvr-category-totals"]) {
        qc.invalidateQueries({ queryKey: [k] });
      }
      setConfirmDel(false);
      onClose();
    },
  });
  const statusText = alarm
    ? d.status.alarm
    : ev.category === "face"
      ? ev.recognized
        ? d.status.recognized
        : d.status.unknown
      : d.status.normal;

  /* Xulosa — FAQAT haqiqiy maydonlardan yig'iladi (hech narsa o'ylab
     topilmaydi). Bo'sh maydon qatorni umuman qo'shmaydi. */
  const summary = useMemo(() => {
    const s = d.summary;
    const out: string[] = [];
    if (ev.category === "face") {
      out.push(ev.recognized && ev.name ? s.recognized(ev.name) : s.unknown);
      if (ev.face_id != null) out.push(s.faceId(ev.face_id));
    }
    if (ev.targets) out.push(s.targets(ev.targets));
    out.push(s.where(ev.camera || t.nvr.channelOf(ev.channel), place));
    if (frames > 1 && ev.visit_from && ev.visit_to) {
      out.push(s.visit(frames, nvrTime(ev.visit_from), nvrTime(ev.visit_to)));
    }
    if (alarm) out.push(s.alarm);
    return out;
  }, [ev, place, frames, alarm, d, t]);

  /* Ma'lumot jadvali — bo'sh qiymatlar TUSHIRIB QOLDIRILADI, "—" chiqmaydi */
  const rows = useMemo(() => {
    const L = d.labels;
    const list: { k: string; label: string; value: string; note?: string; mono?: boolean }[] = [];
    const add = (k: string, label: string, value?: string | null, note?: string, mono?: boolean) => {
      if (value) list.push({ k, label, value, note, mono });
    };
    add("status", L.status, statusText);
    if (ev.category === "face") add("subject", L.subject, subject);
    /* 🔵 "TOIFA" (O'qituvchi/Talaba) — ENG ASOSIY maydonlardan biri
       (2026-09-11, foydalanuvchi so'rovi: "eng asosiy bo'lishi kerak
       bo'lgan narsa O'qituvchi yoki talaba ekanligi"). Shuning uchun
       ism qatoridan DARHOL keyin — matn tig'izligi orasida yo'qolib
       ketmasin. Manba — `ev.person.role_label` (`GUIDE.md` 10-D,
       kadrda TAYYOR keladi, qo'shimcha so'rov kerak emas). */
    if (ev.category === "face" && roleText) add("role", L.role, roleText);
    if (ev.face_id != null) add("faceId", L.faceId, String(ev.face_id), undefined, true);
    if (ev.confidence != null) add("conf", L.confidence, `${ev.confidence}%`);
    /* Hodisa turi ham server matni o'rniga (o'zbekcha keladi) kategoriyadan */
    add(
      "cat",
      L.category,
      ev.category === "face"
        ? t.nvr.tabFace
        : ev.category === "gun"
          ? t.nvr.tabGun
          : ev.category === "janjal"
            ? t.nvr.tabFight
            : ev.category === "smoking"
              ? t.nvr.tabSmoking
              : ev.category_label
    );
    add("cam", L.camera, ev.camera || t.nvr.channelOf(ev.channel), t.nvr.channelOf(ev.channel));
    add("place", L.place, place);
    if (campus) add("campus", L.campus, campus.name, campus.mahalla);
    add("time", L.time, nvrDateTime(ev.time));
    if (frames > 1) {
      add(
        "visit",
        L.visit,
        t.nvr.visitFrames(frames),
        ev.visit_from && ev.visit_to ? `${nvrTime(ev.visit_from)} – ${nvrTime(ev.visit_to)}` : undefined
      );
    }
    if (ev.targets) add("targets", L.detected, ev.targets);
    if (ev.face_library) add("lib", L.library, ev.face_library);
    add("id", L.eventId, String(ev.id), undefined, true);
    add("img", L.images, String(ev.image_count));
    return list;
  }, [ev, d, subject, statusText, place, campus, frames, t, roleText]);

  const attributes = useMemo(() => Object.entries(ev.attributes ?? {}), [ev.attributes]);

  /* Qaysi rasm bosilgan bo'lsa — Nishon bosilsa Nishon, Kadr bosilsa Kadr —
     lightbox O'SHANI birinchi ko'rsatadi. */
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  /* Esc — oynani yopadi. Lightbox ochiq bo'lsa u O'ZI yopiladi, shuning uchun
     bu yerda hech narsa qilinmaydi (aks holda ikkalasi birga yopilardi). */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      /* Rasm ko'ruvchi yoki shaxs oynasi ochiq bo'lsa Esc dossiyeni yopmaydi */
      if (e.key !== "Escape" || lightboxIndex != null || personOpen) return;
      /* Tasdiq oynasi ochiq bo'lsa Esc FAQAT uni yopadi */
      if (confirmDel) {
        if (!del.isPending) setConfirmDel(false);
        return;
      }
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, lightboxIndex, confirmDel, del.isPending, personOpen]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-[60] grid place-items-center bg-[#03060E]/85 p-4 backdrop-blur-md"
    >
      {/* 🔵 OCHILISH ANIMATSIYASI (2026-09-10, foydalanuvchi so'rovi:
          "modal bosilganda animatsiya bo'lishi kerak") — ilgari faqat
          tashqi parda (yuqoridagi) `opacity` bilan paydo bo'lardi, oynaning
          O'ZI esa statik `<div>` edi. Endi u ham kattalashib/pastdan
          ko'tarilib kiradi. */}
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={`${ev.label} — ${ev.category_label}`}
        onClick={(e) => e.stopPropagation()}
        style={{ ["--c" as string]: color }}
        className="nvr-dsr"
        initial={{ opacity: 0, scale: 0.94, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Sarlavha lentasi */}
        <header className="nvr-dsr-top">
          <span className="nvr-dsr-mark">
            <UserFocus size={18} />
          </span>
          <span className="nvr-dsr-brand">
            <b>{d.brand}</b>
            <em>{d.system}</em>
          </span>

          <span className="nvr-dsr-chips">
            <span className="nvr-dsr-chip">
              {d.labels.eventId} <b>{ev.id}</b>
            </span>
            <span className="nvr-dsr-chip">
              {d.labels.channel} <b>{ev.channel}</b>
            </span>
            <span className={`nvr-dsr-flag${alarm ? " is-alarm" : ""}`}>{statusText}</span>
          </span>

          {deletable && (
            <button
              type="button"
              onClick={() => {
                del.reset();
                setConfirmDel(true);
              }}
              className="nvr-dsr-del"
              title={d.del.action}
            >
              <Trash size={15} />
              <span>{d.del.action}</span>
            </button>
          )}
          <button type="button" onClick={onClose} className="nvr-dsr-x" aria-label={t.common.close}>
            <X size={17} />
          </button>
        </header>

        {/* Ism qatori */}
        {/* ⚠️ Tartib: AVVAL holat ("Ma'lumot yig'ildi"), KEYIN shaxs nomi.
            Ilgari ism birinchi turardi va "Notanish shaxs" degan yozuvdan
            keyin kelgan holat izohi unga tegishlidek o'qilardi. */}
        <div className="nvr-dsr-name">
          <i>{d.collecting}</i>
          <b>{subject}</b>
          {/* 🔵 TOIFA — ENG ASOSIY belgi (2026-09-11, foydalanuvchi so'rovi:
              "eng asosiy bo'lishi kerak bo'lgan narsa O'qituvchi yoki
              talaba ekanligi"). Ilgari bu ma'lumot faqat pastdagi 9
              qatorlik jadvalda (yoki umuman) ko'rinmasdi — ism yonida,
              darhol ko'zga tashlanadigan joyda emas edi. `ev.person`
              hodisaning O'ZIDA keladi (10-D), qo'shimcha so'rov kerak
              emas. */}
          {/* ⚠️ `<div>`, `<span>` EMAS — `.nvr-dsr-name > span` CSS qoidasi
              (`index.css`) HAR QANDAY to'g'ridan-to'g'ri bola `span`ga
              (`ml-auto` + rangli fon) tegadi; `<span>` yozilsa bu belgi
              ham beixtiyor `d.tag` bilan bir xil ko'rinib, o'ngga
              suriladi. */}
          {roleText && (
            <div className="rounded-full border border-white/15 bg-white/[0.07] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
              {roleText}
              {ev.person?.note ? ` · ${ev.person.note}` : ""}
            </div>
          )}
          {/* 🔵 SHU SHAXS HAQIDA MA'LUMOT (2026-09-14, foydalanuvchi so'rovi) —
              qachon, qaysi kamerada ko'ringani, kunlar va barcha kadrlar.
              `face_id` bo'lsa u bo'yicha (notanish odam ham), bo'lmasa
              bazadagi shaxs raqami bo'yicha. Ikkalasi ham yo'q — tugma yo'q. */}
          {(faceId != null || verifyPerson) && (
            <button type="button" onClick={() => setPersonOpen(true)} className="nvr-dsr-person">
              <IdentificationCard size={14} weight="duotone" />
              {d.openPerson}
            </button>
          )}
          <span>{d.tag}</span>
        </div>

        <div className="nvr-dsr-body">
          {/* ══ CHAP USTUN: NISHON va uning ostidagi hamma ma'lumot ══
              ⚠️ QAYTA QURILDI. Ilgari nishon 132 px lik kichik kartochka
              bo'lib ma'lumot jadvali YONIDA turardi, jadval esa uch
              ustunga yoyilib ketardi — ko'z qayerdan o'qishni bilmasdi.
              Endi chap ustun bitta VERTIKAL oqim: yuz → kim/qayerda/qachon
              → bazaga qo'shish. O'ng tomon esa faqat KADR va xulosaga
              qoladi. */}
          <aside className="nvr-dsr-rail">
            {/* ── TANISH TO'G'RIMI — `POST /events/{id}/verify` ──
                ⚠️ **CHAP USTUNGA, NISHON KARTOCHKASI O'RNIGA** ko'chirildi
                (2026-09-04). Ilgari u video ostida, O'RTA ustunda edi va
                solishtiriladigan ikkala rasm ekranning ikki chetiga
                bo'linib ketardi: kamera nishoni chapda, bazadagi surat
                esa o'rtada. Endi ikkalasi YONMA-YON, tugmalar esa
                ostida — savol ("bu o'sha odammi?") va javob bitta joyda.
                Nishon kartochkasi ALOHIDA chizilmaydi: u shu blokning
                ICHIDA ("Kamerada"), ya'ni ikki marta ko'rinmaydi. */}
            {ev.category === "face" && ev.recognized && faceId != null && verifyPerson ? (
              <VerifyRecognition
                eventId={ev.id}
                faceId={faceId}
                nishonSrc={faceIdx >= 0 ? images[faceIdx].src : frameIdx >= 0 ? images[frameIdx].src : null}
                person={verifyPerson}
                onZoom={faceIdx >= 0 ? () => setLightboxIndex(faceIdx) : undefined}
                verdict={ev.verdict}
                verdictScope={ev.verdict_scope}
              />
            ) : (
              faceIdx >= 0 && (
                <button
                  type="button"
                  onClick={() => setLightboxIndex(faceIdx)}
                  className="nvr-dsr-face"
                  title={d.hint}
                >
                  <img src={images[faceIdx].src} alt={images[faceIdx].label} />
                  <b>{images[faceIdx].label}</b>
                </button>
              )
            )}

            {/* ── Butun kadr — katta maydon, nishon ramkasi shu yerda ── */}
            {frameIdx >= 0 ? (
              <div className="nvr-dsr-shots">
                <button
                  type="button"
                  onClick={() => setLightboxIndex(frameIdx)}
                  className="nvr-dsr-shot"
                  title={d.hint}
                >
                  <b>{images[frameIdx].label}</b>
                  <span className="nvr-dsr-shot-in">
                    <img src={images[frameIdx].src} alt={images[frameIdx].label} />
                    {/* Ramka FAQAT butun kadrga chiziladi (kesilgan yuzga emas).
                        Koordinatalar 0..1 — ular RASMNING o'zi bo'yicha foizga
                        aylantiriladi, shuning uchun `<img>` alohida o'ramda. */}
                    {(ev.boxes ?? []).map((b, bi) => (
                      <span
                        key={bi}
                        className="nvr-box"
                        style={{
                          left: `${b.x * 100}%`,
                          top: `${b.y * 100}%`,
                          width: `${b.w * 100}%`,
                          height: `${b.h * 100}%`,
                        }}
                      >
                        {b.label && <em>{b.label}</em>}
                      </span>
                    ))}
                  </span>
                  <span className="nvr-dsr-zoom">{d.hint}</span>
                </button>
              </div>
            ) : (
              <div className="grid h-[200px] flex-none place-items-center text-[12px] text-slate-500">
                {t.nvr.noImageForType}
              </div>
            )}


            {/* Notanish yuzni SHU YERDA bazaga qo'shish */}
            {ev.category === "face" && !ev.recognized && <EnrollPerson ev={ev} />}
          </aside>
          {/* ── Markaz: FAQAT video ──
              Kadr lentalari bu yerdan XULOSA ostiga ko'chirildi (pastga
              qarang): ular ro'yxat bo'lgani uchun tor ustunda ikkitadan
              sig'ardi, xulosa esa markazda yolg'iz qolib pastida bo'sh
              joy qolardi. */}
          <aside className="nvr-dsr-side">
            <EventVideo eventId={ev.id} ready={ev.video_ready} />

            {/* ⚠️ "Tanish to'g'rimi?" bloki CHAP USTUNGA ko'chirildi —
                o'sha yerdagi izohga qarang. */}

            {/* ── SHU SHAXSNING BARCHA SURATLARI (`face_id` bo'yicha) ──
                Bitta o'tish kadrlaridan farqi: bu odam BOSHQA kunlarda,
                boshqa kameralarda tushgan suratlar ham shu yerda.
                Odam bazaga qo'shilmagan bo'lsa ham ishlaydi. */}
            {faceId != null && (
              <section className="nvr-dsr-block">
                <p className="nvr-dsr-h">
                  {d.photos.title}
                  {face.data && <span className="ml-auto font-mono text-[10px] text-slate-500">{face.data.total}</span>}
                </p>
                {faceShotsByDay.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {faceShotsByDay.map((g) => (
                      <div key={g.day}>
                        <p className="mb-1 font-mono text-[9.5px] font-semibold uppercase tracking-wide text-slate-500">
                          {dayMonthLongLabel(new Date(`${g.day}T00:00:00`), t)}, {g.day.slice(0, 4)}
                          <span className="ml-1.5 text-slate-600">· {g.items.length}</span>
                        </p>
                        <div className="nvr-dsr-feeds">
                          {g.items.map((f) => (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => onSelect(f)}
                              className="nvr-dsr-feed"
                              title={`${nvrDateTime(f.time)} · ${f.camera} #${f.channel}`}
                            >
                              <img src={nvrImageUrl(f, 0) ?? ""} alt={f.label} loading="lazy" />
                              <b>{`#${f.channel}`}</b>
                              <em>{nvrTime(f.time)}</em>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="nvr-dsr-empty">
                    {face.isLoading ? "…" : face.isError ? d.photos.failed : d.photos.empty}
                  </p>
                )}
              </section>
            )}
          </aside>

          {/* ── O'ng ustun: kadr + xulosa ── */}
          <div className="nvr-dsr-main">
            
            <section className="nvr-dsr-block">
              <p className="nvr-dsr-h">{d.sectionId}</p>
              <dl className="nvr-dsr-list">
                {rows.map((r) => (
                  <div key={r.k} className="nvr-dsr-row">
                    <dt>{r.label}</dt>
                    <dd
                      className={r.mono ? "font-mono" : undefined}
                      /* ⚠️ Ishonch foizi — GRADIENT MATN (`.neon-num`) emas:
                         `.nvr-dsr-row dd` yorug' rejimda `color: ... !important`
                         bilan qayta yoziladi, `.neon-num`ning
                         `-webkit-text-fill-color: transparent`i esa WebKit'da
                         undan USTUN chiqib matnni KO'RINMAS qilib qo'yardi.
                         Shuning uchun oddiy `--c` rangli qalin matn — xavfsiz. */
                      style={r.k === "conf" ? { color: "var(--c)", fontWeight: 800 } : undefined}
                      title={r.value}
                    >
                      {r.value}
                      {r.note && <small>{r.note}</small>}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            {/* Xulosa + yuz belgilari */}
            <section className="nvr-dsr-block nvr-dsr-note">
              <p className="nvr-dsr-h">{d.sectionSummary}</p>
              {summary.map((line) => (
                <p key={line}>{line}</p>
              ))}
              {attributes.length > 0 && (
                <div className="nvr-dsr-tags">
                  {attributes.map(([k, v]) => (
                    <span key={k} className="nvr-dsr-tag">
                      <b>{attrLabel(k)}</b>
                      {attrValue(v)}
                    </span>
                  ))}
                </div>
              )}
            </section>

            {/* ── Kadr lentalari — XULOSA ostida, markazda ──
                Ilgari o'ng ustunda edi va u yerda 320 px ichida ikkitadan
                kadr sig'ardi; markazda esa ular butun enni to'ldiradi va
                xulosa bilan bir o'qish oqimida turadi. */}
            <section className="nvr-dsr-block">
              <p className="nvr-dsr-h">{d.sectionFeeds}</p>
              {visitFrames.length > 0 ? (
                <div className="nvr-dsr-feeds">
                  {visitFrames.map((f, i) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => onSelect(f)}
                      className="nvr-dsr-feed"
                      title={nvrDateTime(f.time)}
                    >
                      <img src={nvrImageUrl(f, 0) ?? ""} alt={f.label} loading="lazy" />
                      <b>{`FEED_${i + 1}`}</b>
                      <em>{nvrTime(f.time)}</em>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="nvr-dsr-empty">{visit.isLoading ? "…" : d.singleFrame}</p>
              )}
            </section>

            
          </div>

          
        </div>

        {/* Texnik lenta */}
        <footer className="nvr-dsr-foot">
          <span>
            ID <b>{ev.id}</b>
          </span>
          <span>
            CH <b>{ev.channel}</b>
          </span>
          <span>
            CAT <b>{ev.category}</b>
          </span>
          <span>
            IMG <b>{ev.image_count}</b>
          </span>
          {ev.face_id != null && (
            <span>
              FACE <b>{ev.face_id}</b>
            </span>
          )}
          <span className="ml-auto normal-case tracking-normal">{d.hint}</span>
        </footer>

        {/* O'chirishni tasdiqlash — ma'lumotlarning O'ZI ustida (alohida portal
            shart emas: u oynaning ichida, fon bosilishi ma'lumotlarni yopmaydi). */}
        <AnimatePresence>
          {confirmDel && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="nvr-dsr-confirm"
              onClick={() => !del.isPending && setConfirmDel(false)}
            >
              <motion.div
                role="alertdialog"
                aria-modal="true"
                aria-label={d.del.title}
                initial={{ scale: 0.95, y: 8 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.97, y: 4 }}
                onClick={(e) => e.stopPropagation()}
                className="nvr-dsr-confirm-box"
              >
                <span className="nvr-dsr-confirm-ico">
                  <Trash size={20} />
                </span>
                <b>{d.del.title}</b>
                <p>{d.del.body(deleteIds.length)}</p>
                {del.isError && <p className="is-err">{d.del.failed}</p>}
                <div className="nvr-dsr-confirm-row">
                  <button type="button" disabled={del.isPending} onClick={() => setConfirmDel(false)} className="is-ghost">
                    {d.del.cancel}
                  </button>
                  <button type="button" disabled={del.isPending} onClick={() => del.mutate()} className="is-danger">
                    {del.isPending ? d.del.busy : d.del.confirm}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ⚠️ Dialog ICHIDA: uning `stopPropagation`i shaxs oynasidagi
            klikni (React hodisasi portal orqali ham daraxt bo'yicha
            ko'tariladi) tashqi `onClick={onClose}` pardaga yetkazmaydi —
            aks holda shaxs oynasi yopilganda dossiye ham yopilardi. */}
        {personOpen && (
          <FaceHistoryModal
            faceId={faceId ?? undefined}
            personId={faceId == null ? verifyPerson?.id : undefined}
            zClass="z-[96]"
            onClose={() => setPersonOpen(false)}
          />
        )}
      </motion.div>

      {lightboxIndex != null && (
        <ImageLightbox images={images} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}
    </motion.div>
  );
}

/**
 * Rasm lightbox'i — bosilgan rasmni (Nishon yoki Kadr) katta ko'rsatadi:
 * yaqinlashtirish (+/-, foiz, "Tiklash"), yaqinlashganda sudrab siljitish,
 * bir nechta rasm bo'lsa ◄► bilan almashtirish va pastda eskiz qatori,
 * "Yangi oynada" yangi tabda ochadi.
 */
/**
 * Rasm ko'ruvchi — yaqinlashtirish (100–500%), sudrab surish va o'q
 * tugmalari bilan.
 *
 * ⚠️ EKSPORT qilingan: `CameraDetectionsModal` ham shu komponentdan
 * foydalanadi. Ikkinchi nusxa yozilsa yaqinlashtirish mantig'i ikki joyda
 * ajralib ketardi.
 */

/* `ImageLightbox` `components/common/ImageLightbox.tsx` ga KO'CHIRILDI
   (aylanma importni yo'q qilish uchun — o'sha fayldagi izohga qarang).
   Eski chaqiruvchilar buzilmasin deb shu yerdan qayta eksport qilinadi. */
export { ImageLightbox };
