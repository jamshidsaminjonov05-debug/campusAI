/**
 * kuzatuv posti hodisalari oqimi — tarix (React Query) + jonli qo'shimchalar (SSE).
 *
 * Tartib `FRONTEND.md` tavsiya qilgandek: avval TARIX yuklanadi (ekran bo'sh
 * qolmasin), keyin jonli oqim ulanadi va faqat YANGI hodisalar tepaga
 * qo'shiladi.
 *
 * `"hammasi"` → serverdagi **`all`** kategoriyasi: BITTA so'rov, bitta SSE.
 * Ilgari server `all` ni qo'llamasdi va klient 4 ta parallel so'rov + 4 ta SSE
 * ochardi; sahifalash ham shuning uchun taxminiy edi (4 ta mustaqil oqim bir
 * xil `offset` bilan). Endi `total` va sahifa chegaralari ANIQ.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  isPhoneEvent,
  listEvents,
  subscribeNvr,
  type NvrCategory,
  type NvrEvent,
  type NvrQueryCategory,
} from "@/lib/nvrApi";
import { listWeapon2Alerts, listWeapon2Cameras, weapon2ToNvrEvent } from "@/lib/weapon2Api";

export const NVR_CATEGORIES: NvrCategory[] = ["face", "gun", "janjal", "smoking"];

/**
 * UI tabi. `chekish` va `telefon` — SERVERDA alohida EMAS: ikkalasi ham
 * `smoking` kategoriyasida keladi (`FRONTEND.md` 0-bo'lim: "Telefonda
 * gaplashish va chekish") va matn bo'yicha ajratiladi (`isPhoneEvent`).
 */
export type NvrTab = NvrCategory | "hammasi" | "chekish" | "telefon";

/** UI tabi → server kategoriyasi. */
const queryCategory = (tab: NvrTab): NvrQueryCategory =>
  tab === "hammasi" ? "all" : tab === "chekish" || tab === "telefon" ? "smoking" : tab;

/** Tab ichidagi qo'shimcha saralash — faqat chekish/telefon uchun. */
function tabFilter(tab: NvrTab): (e: NvrEvent) => boolean {
  if (tab === "telefon") return isPhoneEvent;
  if (tab === "chekish") return (e) => !isPhoneEvent(e);
  return () => true;
}

/** Bitta o'tishning chegarasi — `FRONTEND.md` 4-A dagi mezon (45 soniya). */
const VISIT_GAP_MS = 45_000;

const ms = (iso: string) => new Date(iso).getTime();

/** Yig'ilgan yozuvning vaqt oralig'i (yig'ilmagan hodisa uchun — bir nuqta). */
function span(e: NvrEvent): [number, number] {
  const from = ms(e.visit_from ?? e.time);
  const to = ms(e.visit_to ?? e.time);
  return from <= to ? [from, to] : [to, from];
}

/**
 * O'tish kaliti: **kamera + SHAXS**. Faqat `face` uchun — boshqa
 * kategoriyalarni server ham yig'maydi (jonli serverda tekshirildi).
 *
 * `face_id` — serverning shaxs raqami (`FRONTEND.md` 5-B): bir xil yuz doim bir
 * xil raqamni oladi, odam bazada bo'lmasa ham. U bo'lmasa ism, u ham bo'lmasa
 * hammasi bitta "notanish" guruhiga tushadi — qurilma notanishlarni
 * bir-biridan ajratmaydi.
 */
function visitKey(e: NvrEvent): string | null {
  if (e.category !== "face") return null;
  const who = e.face_id != null ? `f${e.face_id}` : e.name || "unknown";
  return `${e.channel}|${who}`;
}

/** Ikki yozuv BITTA o'tishmi — bir xil kalit va oraliqlar orasi ≤ 45 soniya. */
function sameVisit(a: NvrEvent, b: NvrEvent): boolean {
  const k = visitKey(a);
  if (!k || k !== visitKey(b)) return false;
  const [aF, aT] = span(a);
  const [bF, bT] = span(b);
  return Math.max(aF, bF) - Math.min(aT, bT) <= VISIT_GAP_MS;
}

/**
 * Eng yangisi boshida bo'lgan, TAKRORSIZ ro'yxat.
 *
 * Ikki xil takror bo'ladi:
 *
 * 1. **Bir xil `id`** (`FRONTEND.md` 12-bo'lim): rasmsiz kelgan hodisaga rasm
 *    biriktirilgach u o'sha `id` bilan yana yuboriladi. BIRINCHI uchragani
 *    saqlanadi va chaqiruvchi yangi yozuvni birinchi ro'yxatga qo'yadi — ya'ni
 *    yangi nusxa eskisini almashtiradi, takror qator paydo bo'lmaydi.
 * 2. **Bir xil O'TISH** (`group` yoqilganda, `FRONTEND.md` 4-A ogohlantirishi):
 *    jonli oqim hodisani HAR KADR uchun bittadan yuboradi, tarix esa allaqachon
 *    yig'ilgan holda keladi. Ularni faqat `id` bo'yicha birlashtirsak, bitta
 *    odamning o'tishi ro'yxatda o'nlab qator bo'lib qaytadi. Shuning uchun
 *    kamera + shaxs + 45 soniya mezoni bo'yicha ham tekshiriladi.
 */
function merge(group: boolean, ...lists: NvrEvent[][]): NvrEvent[] {
  const seen = new Set<number>();
  const out: NvrEvent[] = [];
  for (const ev of lists.flat()) {
    if (seen.has(ev.id)) continue;
    seen.add(ev.id);
    if (group) {
      const i = out.findIndex((x) => sameVisit(x, ev));
      if (i >= 0) {
        // O'sha o'tishning yana bir kadri — yangi qator EMAS, mavjudini boyitamiz
        const [oF, oT] = span(out[i]);
        const [nF, nT] = span(ev);
        const a = out[i].frames;
        const b = ev.frames;
        /* ⚠️ **RASM ALMASHTIRISH — 2026-09-07 da qo'shildi.** Vakil
           yozuvning rasmi `picture_lost` (halqa bufer ustidan yozib
           yuborgan, `FRONTEND.md` 5-D) bo'lsa-yu, SHU o'tishning yangi
           kelgan kadri rasmga ega bo'lsa — vakil rasmi shu YANGI kadrga
           ALMASHTIRILADI. Aks holda 26 kadrli o'tishning FAQAT birinchi
           (vakil) kadri baxtsizlikdan yo'qolgan bo'lsa, qolgan 25 tasida
           yaxshi rasm turgani holda butun kartochka "Rasm saqlanmagan"
           bo'lib qolaverardi — foydalanuvchi buni ko'rib "nega bunча
           kadr bo'lib rasm yo'q" deb so'radi. Faqat JONLI (SSE) birlashuv
           uchun ishlaydi — server o'zi TARIXIY ro'yxatni GURUHLAGANDA
           qaysi kadrni vakil qilib tanlashi klientdan mustaqil, unga
           bu yerdan ta'sir qilib bo'lmaydi. */
        const swapImage = out[i].picture_lost && !ev.picture_lost;
        out[i] = {
          ...out[i],
          // Ikkalasi ham server yig'gani bo'lsa — bitta o'tishning ikki nusxasi
          // (jonli va tarixiy), qo'shilmaydi. Aks holda kadr QO'SHILDI.
          frames: a != null && b != null ? Math.max(a, b) : (a ?? 1) + (b ?? 1),
          visit_from: new Date(Math.min(oF, nF)).toISOString(),
          visit_to: new Date(Math.max(oT, nT)).toISOString(),
          ...(swapImage
            ? {
                image_url: ev.image_url,
                picture_lost: ev.picture_lost,
                image_count: ev.image_count,
                boxes: ev.boxes,
              }
            : null),
        };
        continue;
      }
    }
    out.push(ev);
  }
  return out.sort((a, b) => ms(b.time) - ms(a.time));
}

export interface NvrFeed {
  events: NvrEvent[];
  total: number;
  loading: boolean;
  error: string | null;
  /** SSE ulangan (jonli). */
  live: boolean;
  /** 1 dan boshlanadi. */
  page: number;
  pageSize: number;
  totalPages: number;
  setPage: (p: number) => void;
}

export interface NvrEventsOptions {
  /** `YYYY-MM-DD` — tarixiy ro'yxatni shu oraliqqa cheklaydi (jonli SSE'ga tegmaydi). */
  dateFrom?: string;
  dateTo?: string;
  /**
   * Takroriy kadrlarni yig'ish (`FRONTEND.md` 4-A) — DEFAULT YOQIQ.
   *
   * Yuz kamerasi odam kadrda turgan har soniyada surat yuboradi: yig'masdan
   * ro'yxat bitta odamning o'nlab bir xil surati bilan to'lib ketadi
   * (jonli serverda 2131 xom hodisa → 698 o'tish). Yig'ilgan yozuvda `frames`,
   * `visit_from`, `visit_to` bo'ladi; qolgan kadrlar `listVisit()` da.
   * Faqat `face` ga ta'sir qiladi — boshqa kategoriyalarda son o'zgarmaydi.
   */
  group?: boolean;
  /**
   * ⚠️ **"2-VERSIYA"** (2026-09-09, foydalanuvchi so'rovi: "ikki xil
   * sahifa yaratishing shart emas, 2-versiya bosilganda TO'LIQ
   * Aniqlanganlar sahifasi ikkinchi versiya uchun bo'ladi, kelmasa 0
   * qoyib ketaverasan"). `"weapon2"` bo'lsa — quyida BUTUNLAY ALOHIDA,
   * SODDAROQ yo'l ishlaydi: kuzatuv posti SSE/guruhlash/offset mantig'i BUTUNLAY
   * chetlab o'tiladi (ular kuzatuv postiga xos, u yerda ma'nosi yo'q), o'rniga
   * `WEAPON2_ORIGIN`dan sahifalab olinadi va `weapon2ToNvrEvent()`
   * orqali xuddi shu `NvrFeed` shakliga o'giriladi — chaqiruvchi
   * (`DetectionsPage.tsx`) hech narsani BILMAYDI, bir xil interfeys.
   */
  source?: "nvr" | "weapon2";
}

/** Sahifalash — server `offset`/`limit` va `total` beradi, ya'ni ANIQ. */
export function useNvrEvents(tab: NvrTab, pageSize = 24, opts: NvrEventsOptions = {}): NvrFeed {
  const { dateFrom, dateTo, group = true, source = "nvr" } = opts;
  const cat = queryCategory(tab);
  const [page, setPageRaw] = useState(1);
  const [liveEvents, setLiveEvents] = useState<NvrEvent[]>([]);
  const [connected, setConnected] = useState(false);
  /** Oxirgi so'ralgan sahifa o'lchami — `offset` ni himoyalash uchun. */
  const lastSizeRef = useRef(pageSize);

  /* Kategoriya, sana oralig'i YOKI SAHIFA O'LCHAMI almashsa 1-sahifaga
     qaytiladi, jonli ro'yxat tozalanadi.

     ⚠️ **`pageSize` ham SHU RO'YXATDA** (2026-09-05 da qo'shildi):
     `offset = (page - 1) * pageSize`, ya'ni o'lcham 24 dan 500 ga
     o'zgarganda eski sahifa raqami bilan `offset` **20 barobar**
     sakrardi (5-sahifa → `offset=2000`) va chaqiruvchi hech qachon
     so'ramagan oyna tortilardi. Chaqiruvchi o'z tomonidan sahifani
     tiklashi YETMAYDI — u effektda, ya'ni bitta renderdan KEYIN
     ishlaydi va oradagi renderda noto'g'ri so'rov ketardi. */
  const tabRef = useRef(tab);
  // ⚠️ `source` ham SHU KALITDA — "2-versiya" yoqilsa/o'chsa ham 1-sahifaga qaytiladi.
  const rangeRef = useRef(`${dateFrom ?? ""}:${dateTo ?? ""}:${group}:${pageSize}:${source}`);
  useEffect(() => {
    const range = `${dateFrom ?? ""}:${dateTo ?? ""}:${group}:${pageSize}:${source}`;
    if (tabRef.current !== tab || rangeRef.current !== range) {
      tabRef.current = tab;
      rangeRef.current = range;
      setLiveEvents([]);
      setPageRaw(1);
    }
  }, [tab, dateFrom, dateTo, group, pageSize, source]);

  /* ⚠️ `offset` sahifa TIKLANGUNCHA ham to'g'ri bo'lsin: `pageSize`
     o'zgargan renderda `page` hali eski qiymatda turadi (yuqoridagi
     effekt keyingi renderda ishlaydi). Shuning uchun chegaradan
     oshgan sahifa 1 deb hisoblanadi — bo'sh javob o'rniga birinchi
     oyna keladi. */
  const safePage = pageSize !== lastSizeRef.current ? 1 : page;
  const offset = (safePage - 1) * pageSize;
  lastSizeRef.current = pageSize;

  const query = useQuery({
    /* ⚠️ Kalitda `safePage` — `offset` ham shundan hisoblanadi.
       Ikkalasi ajralib qolsa bir xil kalit ostida BOSHQA oyna
       keshlanardi. */
    queryKey: ["nvr", cat, safePage, pageSize, dateFrom, dateTo, group],
    queryFn: async () => {
      const p = await listEvents(cat, {
        limit: pageSize,
        offset,
        date_from: dateFrom,
        date_to: dateTo,
        group,
        /* ⚠️ **2026-09-07 da qo'shildi** — `/docs` (OpenAPI) qayta
           tekshirilganda topildi: `prefetch` parametri (0–10) allaqachon
           `nvrApi.ts`da qo'llab-quvvatlanardi (`NvrQuery.prefetch`), lekin
           HECH QAYERDAN chaqirilmasdi. Server bu son bo'yicha ro'yxatning
           DASTLABKI hodisalarining VIDEOSINI FON rejimida oldindan H.265
           dan MP4'ga aylantirib qo'yadi — so'rovning o'zi bundan
           sekinlashmaydi.

           Buning O'RNI YO'QLIGI aynan "bitta kartochka bosilganda
           qo'shimcha so'rovlar" muammosining sababi edi: prefetch'siz
           video HAR DOIM foydalanuvchi dossiyeni OCHGAN paytda
           aylantirila boshlaydi (`EventVideo.tsx` → `probeVideo()` →
           `state:"preparing"` → har 5 soniyada QAYTA so'raladigan
           `refetchInterval`). Endi ro'yxat yuklanishi bilanoq server
           birinchi 10 tasini fonda tayyorlab qo'yadi — dossiye
           ochilganda video ko'pincha ALLAQACHON `"ready"` bo'ladi,
           ya'ni 5 soniyalik qayta-qayta so'rov sikli ishga tushmaydi. */
        prefetch: 10,
      });
      return { events: merge(group, p.events), total: p.total };
    },
    // ⚠️ "2-versiya"da bu so'rov UMUMAN kerak emas — behuda tarmoq
    // safarini oldini olish uchun o'chiriladi (pastdagi weapon2 filialiga qarang).
    enabled: source !== "weapon2",
    staleTime: 15_000,
    placeholderData: keepPreviousData,
  });

  /* Jonli oqim — BITTA SSE (server `all` ni qo'llaydi). "2-versiya"da
     jonli oqim YO'Q (bunday imkoniyat u serverda umuman yo'q) — effekt
     shunchaki hech narsa qilmaydi. */
  useEffect(() => {
    if (source === "weapon2") return;
    const stop = subscribeNvr(
      cat,
      (ev) => setLiveEvents((prev) => merge(group, [ev], prev).slice(0, 100)),
      setConnected
    );
    return () => {
      stop();
      setConnected(false);
    };
  }, [cat, group, source]);

  /**
   * ── "2-VERSIYA" — BUTUNLAY ALOHIDA, SODDAROQ YO'L ──────────────────
   * kuzatuv postining guruhlash/SSE/offset mantig'i bu yerda MA'NOSIZ (WEAPON2
   * o'zining `page`/`page_size`sini beradi, jonli oqimi yo'q). Ikkita
   * so'rov: kameralar (nom/joylashuv uchun, uzoq keshlanadi) va joriy
   * sahifadagi hodisalar — `weapon2ToNvrEvent()` bilan `NvrEvent`
   * shakliga o'giriladi, shundan keyin QOLGAN BUTUN sahifa (kartochka,
   * dossiye, KPI) buni oddiy kuzatuv posti hodisasidan farqlamaydi.
   *
   * 🔵 **TAB BILAN MOSLIK (2026-09-11).** `weapon2ToNvrEvent()` HAR DOIM
   * `category:"gun"` qaytaradi (server faqat qurol beradi,
   * `weapon2Api.ts` boshidagi izoh) — ya'ni bu manba faqat "Qurol" va
   * "Hammasi" tabiga MOS. Ilgari `DetectionsPage.tsx` boshqa tabga
   * o'tilganda 2-versiyani MAJBURAN o'chirar edi, endi rejim tabdan
   * MUSTAQIL (operator "2-versiya" tugmasi bilan boshqaradi) — shuning
   * uchun moslik shu YERGA ko'chirildi: `weapon2Relevant` yolg'on bo'lsa
   * (Yuz tanish/Janjal/Chekish/Telefon) so'rov UMUMAN yuborilmaydi va
   * natija tabiiy ravishda BO'SH qaytadi (`weapon2Q.data` — `undefined`),
   * kuzatuv postining o'z ma'lumotiga hech qachon JIM almashtirilmaydi.
   */
  const weapon2Relevant = tab === "hammasi" || tab === "gun";
  const weapon2CamerasQ = useQuery({
    queryKey: ["weapon2-cameras"],
    queryFn: () => listWeapon2Cameras(),
    enabled: source === "weapon2",
    staleTime: 5 * 60_000,
  });
  const weapon2Q = useQuery({
    queryKey: ["weapon2-alerts", safePage, pageSize],
    queryFn: () => listWeapon2Alerts(safePage, pageSize),
    enabled: source === "weapon2" && weapon2Relevant,
    staleTime: 15_000,
    placeholderData: keepPreviousData,
  });
  const weapon2CameraLabel = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of weapon2CamerasQ.data ?? []) m.set(c.id, c.location || c.name);
    return m;
  }, [weapon2CamerasQ.data]);
  const weapon2Events = useMemo(
    () =>
      (weapon2Q.data?.data ?? []).map((a) =>
        weapon2ToNvrEvent(a, weapon2CameraLabel.get(a.camera_id) ?? `Kamera #${a.camera_id}`)
      ),
    [weapon2Q.data, weapon2CameraLabel]
  );
  const weapon2Total = weapon2Q.data?.total ?? 0;
  const weapon2TotalPages = Math.max(1, Math.ceil(weapon2Total / pageSize));

  const total = query.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const events = useMemo(() => {
    // Yangi jonli hodisalar faqat 1-sahifada (eng yangilar) ko'rsatiladi
    const base = safePage !== 1 ? (query.data?.events ?? []) : merge(group, liveEvents, query.data?.events ?? []);
    /* Chekish/telefon KLIENT tomonda ajratiladi (server ikkalasini bitta
       kategoriyada beradi), shuning uchun `total` — birlashgan son; sahifada
       ko'rinadigan soni esa filtrdan keyingisi. Bu sahifadagi muassasa va
       qidiruv filtrlari bilan bir xil naqsh. */
    return base.filter(tabFilter(tab)).slice(0, pageSize);
  }, [liveEvents, query.data, safePage, pageSize, group, tab]);

  /* ⚠️ Shu yergacha HAMMA hook (ikkala filial ham) chaqirilib bo'lindi —
     endi shartli `return` Hooks qoidasini buzmaydi. */
  if (source === "weapon2") {
    return {
      events: weapon2Events,
      total: weapon2Total,
      loading: weapon2Q.isLoading,
      error: weapon2Q.error ? String((weapon2Q.error as Error).message ?? weapon2Q.error) : null,
      live: false,
      page: safePage,
      pageSize,
      totalPages: weapon2TotalPages,
      setPage: (p) => setPageRaw(Math.min(Math.max(1, p), weapon2TotalPages)),
    };
  }

  return {
    events,
    total,
    loading: query.isLoading,
    error: query.error ? String((query.error as Error).message ?? query.error) : null,
    live: connected,
    page: safePage,
    pageSize,
    totalPages,
    setPage: (p) => setPageRaw(Math.min(Math.max(1, p), totalPages)),
  };
}
