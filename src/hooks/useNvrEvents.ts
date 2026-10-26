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
import { isAllowedWeapon2Alert } from "@/lib/nvr/v2CameraFilter";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  isPhoneEvent,
  listEvents,
  subscribeNvr,
  type NvrCategory,
  type NvrEvent,
  type NvrQueryCategory,
} from "@/lib/nvr/nvrApi";
import { listWeapon2Alerts, listWeapon2CameraAlerts, listWeapon2Cameras, weapon2ToNvrEvent } from "@/lib/nvr/weapon2Api";
import { listJanjal2Alerts, listJanjal2CameraAlerts, listJanjal2Cameras, janjal2ToNvrEvent } from "@/lib/nvr/janjal2Api";
import type { V2Cameras } from "@/hooks/useV2Cameras";

/**
 * 2-VERSIYADA KAMERA FILTRI (2026-10-24). Lokal serverlarning `alert-list`
 * yo'lida kamera parametri YO'Q (`/openapi.json`: faqat `page`/`page_size`),
 * lekin `get-camera-alerts/{camera_id}` bor. Tanlangan har kamera uchun
 * oxirgi `V2_CAM_WINDOW` ta hodisa olinadi, hammasi vaqt bo'yicha
 * birlashtiriladi va sahifalash KLIENTDA (`DetectionsPage`dagi 500 lik
 * "filtr bor" rejimi bilan AYNI g'oya). `total` — serverlarning haqiqiy
 * yig'indisi, sahifalar soni esa OYNA bilan chegaralangan.
 */
const V2_CAM_WINDOW = 200;
async function fetchByCameras<T extends { detected_at: string }>(
  ids: number[],
  one: (cameraId: number, page: number, pageSize: number) => Promise<{ data: T[]; total: number }>
): Promise<{ data: T[]; total: number }> {
  const pages = await Promise.all(ids.map((id) => one(id, 1, V2_CAM_WINDOW)));
  const data = pages
    .flatMap((p) => p.data)
    .sort((a, b) => (a.detected_at < b.detected_at ? 1 : a.detected_at > b.detected_at ? -1 : 0));
  return { data, total: pages.reduce((s, p) => s + p.total, 0) };
}

/**
 * Kamera tanlanmagan holatda ham OYNA (2026-10-26). Ilgari `alert-list` dan
 * SERVER sahifasi (`page_size=12/24`) olinib, KEYIN klientda yashirin
 * kameralar (tungi klub) chiqarilardi — sahifa 12 o'rniga 2 ta bilan
 * chiqar, sahifalar soni esa filtrlanmagan `total`dan hisoblanardi
 * (foydalanuvchi: "pagination ishlamaydi" — "Jami 28 · Ko'rsatilmoqda 4",
 * 2–3-sahifa bo'sh). Endi 100 tadan `V2_LIST_WINDOW` gacha o'qiladi,
 * filtr va sahifalash KLIENTDA — har sahifa to'la, sahifalar soni aniq.
 */
const V2_LIST_WINDOW = 500;
const V2_PAGE = 100;
async function fetchWindow<T>(
  one: (page: number, pageSize: number) => Promise<{ data: T[]; total: number }>
): Promise<{ data: T[]; total: number }> {
  const first = await one(1, V2_PAGE);
  const want = Math.min(first.total, V2_LIST_WINDOW);
  const more = Math.max(0, Math.ceil(want / V2_PAGE) - 1);
  const rest = await Promise.all(Array.from({ length: more }, (_, i) => one(i + 2, V2_PAGE).catch(() => null)));
  return { data: [...first.data, ...rest.flatMap((r) => r?.data ?? [])], total: first.total };
}

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

/**
 * Bitta o'tishning chegarasi — `FRONTEND.md` 4-A dagi mezon.
 *
 * 🔴 **45s → 180s (2026-09-18, foydalanuvchi xabar qildi: "hodisalar
 * nima sababdan 1 daqiqa 30 soniya keyin ham kelyabdi").** Sabab —
 * mos kelmay qolgan raqam: server (backend) `group=true` uchun bu
 * mezonni ALLAQACHON **2026-09-03 da 45'dan 180 soniyaga ko'targan edi**
 * (`FRONTEND.md` 4-A: "eng ko'p uchraydigan tanaffus **46–90 soniya** —
 * eski 45 soniyalik oynadan tashqarida qolib, bitta odam jurnalda
 * o'nlab kartochka bo'lib chiqardi"), lekin BU FAYLDAGI qiymat
 * yangilanmay, eski 45 000 da qolib ketgan edi.
 *
 * Oqibat: kamera oldida turib qolgan (qorovul, gaplashayotganlar) odam
 * 46–90 soniyadan keyin YANA kadr yuborsa — SERVER buni HALI HAM o'sha
 * o'tishning davomi deb hisoblardi (180s ichida), lekin bizning JONLI
 * (SSE) birlashtiruvchimiz 45s'dan keyin kelgan kadrni YANGI, ALOHIDA
 * o'tish deb qo'shib qo'yardi — ya'ni bitta odamning davomiy turishi
 * ekranda "yana bir hodisa 90 soniyadan keyin ham kelyapti" bo'lib
 * ko'rinardi. Endi ikkalasi (server va klient) BIR XIL 180 soniya.
 */
const VISIT_GAP_MS = 180_000;

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
 * ODAM BO'YICHA YIG'ISH — 10 daqiqa (2026-10-24, UX tahlili 2-band).
 *
 * Server o'tishni 180 s bilan yig'adi (yuqorida), lekin o'quvchi kirish
 * postidan 4–8 daqiqa oralig'ida yana o'tsa (chiqdi-kirdi, do'stini kutdi)
 * bu IKKI alohida server o'tishi bo'ladi va lentada BITTA odam ketma-ket
 * ikki-uch kartochka bo'lib chiqardi (skrinshotda o'lchandi: Nuritdinov
 * 18:17:45 va 18:21:38, Zafarova 17:20:13 va 17:27:23 — oltita odam
 * ikki martadan). Endi shunday o'tishlar BITTA kartochkaga yig'iladi:
 * yozuv — ENG OXIRGI o'tish (uning `id`, kadri, `frames`i o'zgarmaydi,
 * dossiye ham o'shaniki), `passes` — nechta o'tish, `passes_from` —
 * birinchisining vaqti. Kartochka "Oxirgi 18:21 · +1 o'tish" deb yozadi.
 *
 * ⚠️ `VISIT_GAP_MS` ga TEGILMADI — u serverning kadr-yig'ish mezoni
 * bilan teng bo'lishi shart (yuqoridagi izoh). Bu alohida, KARTOCHKA
 * darajasidagi qoida; `frames` (kadr soni) o'tishlar bo'ylab QO'SHILMAYDI
 * — "11 kadr" hamon oxirgi o'tishniki, `listVisit()` bilan mos.
 */
const PASS_GAP_MS = 10 * 60_000;

function samePass(a: NvrEvent, b: NvrEvent): boolean {
  const k = visitKey(a);
  if (!k || k !== visitKey(b)) return false;
  /* Notanishlar bitta "unknown" kalitga tushadi — ularni 10 daqiqa bo'yicha
     yig'ish TURLI odamlarni bitta kartochkaga qo'shib yuborardi. Faqat
     ANIQ shaxs (`face_id` yoki ism) yig'iladi. */
  if (a.face_id == null && !a.name) return false;
  const [aF, aT] = span(a);
  const [bF, bT] = span(b);
  return Math.max(aF, bF) - Math.min(aT, bT) <= PASS_GAP_MS;
}

const passStart = (e: NvrEvent) => e.passes_from ?? e.visit_from ?? e.time;

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
export function merge(group: boolean, ...lists: NvrEvent[][]): NvrEvent[] {
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
      /* Bir xil ODAM, boshqa o'tish, 10 daqiqa ichida — ENG OXIRGISI vakil
         bo'ladi (jonli oqim tarixdan oldin keladi, lekin tartibga
         ishonmaymiz — vaqt bo'yicha tanlanadi). */
      const j = out.findIndex((x) => samePass(x, ev));
      if (j >= 0) {
        const old = out[j];
        const newer = ms(ev.time) > ms(old.time) ? ev : old;
        const first = Math.min(ms(passStart(old)), ms(passStart(ev)));
        out[j] = {
          ...newer,
          passes: (old.passes ?? 1) + (ev.passes ?? 1),
          passes_from: new Date(first).toISOString(),
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
  /** Kalit (tab/sana/sahifa) ALMASHDI va yangi so'rov hali kelmadi —
   *  `events` ESKI kalitning placeholder'i (`keepPreviousData`). Sahifa shu
   *  paytda eski ro'yxatni ko'rsatmasdan `PanelLoader` chizadi (2026-10-23,
   *  foydalanuvchi: "qurol/janjal/chekish bir-biriga o'tganda eskisida
   *  qotib qolyapti"). */
  switching: boolean;
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
   * qoyib ketaverasan"). `"weapon2"`/`"janjal2"` bo'lsa — quyida
   * BUTUNLAY ALOHIDA, SODDAROQ yo'l ishlaydi: kuzatuv posti SSE/
   * guruhlash/offset mantig'i BUTUNLAY chetlab o'tiladi (ular kuzatuv
   * postiga xos, u yerda ma'nosi yo'q), o'rniga tegishli lokal serverdan
   * sahifalab olinadi va `weapon2ToNvrEvent()`/`janjal2ToNvrEvent()`
   * orqali xuddi shu `NvrFeed` shakliga o'giriladi — chaqiruvchi
   * (`DetectionsPage.tsx`) hech narsani BILMAYDI, bir xil interfeys.
   *
   * 2026-09-17: `"janjal2"` qo'shildi — `weapon2` (qurol) qanday
   * ishlagan bo'lsa, "Janjal" 2-versiyasi ham AYNI naqshda (alohida
   * server, `janjal2Api.ts`).
   */
  /** `"v2all"` — 2-versiya "Hammasi": qurol (weapon2) + janjal (janjal2) birga */
  source?: "nvr" | "weapon2" | "janjal2" | "v2all";
  /** 2-versiyada FAQAT shu kameralar (`useV2Cameras`); bo'sh — hammasi. */
  v2Cameras?: V2Cameras;
}

/** Sahifalash — server `offset`/`limit` va `total` beradi, ya'ni ANIQ. */
export function useNvrEvents(tab: NvrTab, pageSize = 24, opts: NvrEventsOptions = {}): NvrFeed {
  const { dateFrom, dateTo, group = true, source = "nvr", v2Cameras } = opts;
  const weapon2Cams = v2Cameras?.weapon2 ?? [];
  const janjal2Cams = v2Cameras?.janjal2 ?? [];
  const camsKey = `${weapon2Cams.join(",")}|${janjal2Cams.join(",")}`;
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
  // `camsKey` ham — 2-versiya kamera tanlovi o'zgarsa 1-sahifaga qaytiladi.
  const rangeRef = useRef(`${dateFrom ?? ""}:${dateTo ?? ""}:${group}:${pageSize}:${source}:${camsKey}`);
  useEffect(() => {
    const range = `${dateFrom ?? ""}:${dateTo ?? ""}:${group}:${pageSize}:${source}:${camsKey}`;
    if (tabRef.current !== tab || rangeRef.current !== range) {
      tabRef.current = tab;
      rangeRef.current = range;
      setLiveEvents([]);
      setPageRaw(1);
    }
  }, [tab, dateFrom, dateTo, group, pageSize, source, camsKey]);

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
           video HAR DOIM foydalanuvchi ma'lumotlarni OCHGAN paytda
           aylantirila boshlaydi (`EventVideo.tsx` → `probeVideo()` →
           `state:"preparing"` → har 5 soniyada QAYTA so'raladigan
           `refetchInterval`). Endi ro'yxat yuklanishi bilanoq server
           birinchi 10 tasini fonda tayyorlab qo'yadi — dossiye
           ochilganda video ko'pincha ALLAQACHON `"ready"` bo'ladi,
           ya'ni 5 soniyalik qayta-qayta so'rov sikli ishga tushmaydi. */
        /* 🔴 `prefetch: 10` OLIB TASHLANDI (2026-10-26): har sahifa/filtr
           almashishida server 10 videoni fonda konvertatsiya qilardi va
           keyingi so'rovlar sekinlashardi (server bazaga so'rovlarni navbat
           bilan bajaradi). Kuzatuv postining o'z paneli prefetch'siz. Video
           dossiye ochilganda tayyorlanadi (`EventVideo` 5 s so'rov sikli). */
      });
      return { events: merge(group, p.events), total: p.total };
    },
    // ⚠️ "2-versiya"da (weapon2/janjal2) bu so'rov UMUMAN kerak emas —
    // behuda tarmoq safarini oldini olish uchun o'chiriladi (pastdagi
    // "2-VERSIYA" filialiga qarang).
    enabled: source === "nvr",
    staleTime: 15_000,
    placeholderData: keepPreviousData,
  });

  /* Jonli oqim — BITTA SSE (server `all` ni qo'llaydi). "2-versiya"da
     jonli oqim YO'Q (bunday imkoniyat u serverda umuman yo'q) — effekt
     shunchaki hech narsa qilmaydi. */
  useEffect(() => {
    if (source !== "nvr") return;
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
  /* 2-versiya "Hammasi" — ikkala server birga, har biridan sahifaning
     YARMI (2026-10-21, foydalanuvchi so'rovi: "2-versiyada hammasi, janjal
     va qurol"). Ikki serverni vaqt bo'yicha aniq birlashtirib sahifalash
     uchun umumiy `offset` yo'q — shuning uchun har sahifada ikkalasining
     o'z N-sahifasi olinadi va vaqt bo'yicha saralanadi. */
  const v2all = source === "v2all";
  const weapon2On = (source === "weapon2" || v2all) && weapon2Relevant;
  /* 🔴 2026-09-18, foydalanuvchi so'rovi: "yuz tanish, chek va telefonda
     2-versiya uchun bo'sh turishi kerak va hech qanday so'rov kerak
     emas". Ilgari bu yerda `weapon2Relevant` YO'Q edi — faqat
     `source === "weapon2"` tekshirilardi. `DetectionsPage.tsx`dagi
     `weapon2Source` formulasi ("janjal" bo'lmasa DOIM "weapon2")
     tufayli `source` Yuz tanish/Chekish/Telefon tabida ham "weapon2"
     bo'lib qolaveradi — ya'ni kameralar ro'yxati (`listWeapon2Cameras()`)
     bu tablarda ham SO'RALARDI, natija hech qayerda ishlatilmasa ham
     (`weapon2Q` o'ZI to'g'ri `weapon2Relevant` bilan yopilgan edi, faqat
     kameralar so'rovi unutilgan). Endi ikkalasi BIR XIL shartga bo'ysunadi. */
  const weapon2CamerasQ = useQuery({
    queryKey: ["weapon2-cameras"],
    queryFn: () => listWeapon2Cameras(),
    enabled: weapon2On,
    staleTime: 5 * 60_000,
  });
  /* Kamera tanlangan bo'lsa — oyna BIR MARTA olinadi (kalitda sahifa yo'q),
     sahifalash quyida klientda (`fetchByCameras` izohi). */
  const weapon2ByCam = weapon2Cams.length > 0;
  /* Oyna BIR MARTA olinadi (kalitda sahifa yo'q) — filtr va sahifalash
     klientda (`fetchWindow` izohi). */
  const weapon2Q = useQuery({
    queryKey: ["weapon2-alerts-window", weapon2Cams.join(",")],
    queryFn: () =>
      weapon2ByCam ? fetchByCameras(weapon2Cams, listWeapon2CameraAlerts) : fetchWindow(listWeapon2Alerts),
    enabled: weapon2On,
    staleTime: 15_000,
    placeholderData: keepPreviousData,
  });
  const weapon2CameraLabel = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of weapon2CamerasQ.data ?? []) if (!c.hidden) m.set(c.id, c.location || c.name);
    return m;
  }, [weapon2CamerasQ.data]);
  /* Yashirin (tungi klub kabi) kameralarning hodisalari ro'yxatga tushmaydi
     (`v2CameraFilter.ts`). Kamera ro'yxati hali kelmagan bo'lsa to'plam bo'sh
     — hech narsa yashirilmaydi (noma'lum kamera ≠ yashirin kamera). */
  const weapon2Hidden = useMemo(
    () => new Set((weapon2CamerasQ.data ?? []).filter((c) => c.hidden).map((c) => c.id)),
    [weapon2CamerasQ.data]
  );
  /**
   * ⚠️ **`weapon2Relevant` BU YERDA HAM SHART** (2026-09-18, foydalanuvchi
   * xabar qildi: "u oyna bo'sh bo'lsin, u yerda hozir qurolniki
   * chiqyabdi"). `weapon2Q`ning `queryKey`si (`["weapon2-alerts",
   * safePage, pageSize]`) `tab`ni O'Z ICHIGA OLMAYDI — ya'ni "Qurol"
   * tabida bir marta muvaffaqiyatli kelgan `weapon2Q.data` "Yuz
   * tanish"ga o'tilganda ham KESHDA QOLAVERADI (`enabled:false` faqat
   * yangi so'rovni to'xtatadi, ESKI natijani TOZALAMAYDI — React
   * Query'ning o'zi shunday ishlaydi). So'rov to'g'ri o'chirilgan bo'lsa
   * ham, shu tekshiruvsiz "Qurol" tabidagi eski hodisalar boshqa
   * (mos kelmagan) tabda ko'rinaverardi. */
  /* Ruxsat ro'yxati (`WEAPON2_ALLOWED_ALERT_IDS` — faqat 2 hodisa) va yashirin
     kameralar SAHIFALASHDAN OLDIN qo'llanadi — aks holda ruxsatli hodisa
     2-sahifaga tushib, 1-sahifa bo'sh ko'rinardi. Kamera rejimida (`byCam`,
     qurolda doim) butun oyna qo'lda, ya'ni `total` ham filtrdan keyingi son. */
  const weapon2Rows = useMemo(
    () =>
      (weapon2Q.data?.data ?? []).filter((a) => !weapon2Hidden.has(a.camera_id) && isAllowedWeapon2Alert(a.id)),
    [weapon2Q.data, weapon2Hidden]
  );
  /** Filtrlangan BUTUN oyna (sahifalanmagan) — "Hammasi"da janjal bilan birlashadi. */
  const weapon2All = useMemo(
    () =>
      !weapon2Relevant
        ? []
        : weapon2Rows.map((a) => weapon2ToNvrEvent(a, weapon2CameraLabel.get(a.camera_id) ?? `Kamera #${a.camera_id}`)),
    [weapon2Rows, weapon2CameraLabel, weapon2Relevant]
  );
  const weapon2Events = useMemo(
    () => weapon2All.slice((safePage - 1) * pageSize, safePage * pageSize),
    [weapon2All, safePage, pageSize]
  );
  /* `total` — FILTRDAN KEYINGI son: sahifalar soni ham, "Jami topildi" ham
     ekranda ko'rinadigan kartochkalar bilan mos. */
  const weapon2Total = weapon2All.length;
  const weapon2TotalPages = Math.max(1, Math.ceil(weapon2Total / pageSize));

  /**
   * ── "JANJAL — 2-VERSIYA" — weapon2 bilan AYNI naqsh, ALOHIDA server
   * ──────────────────────────────────────────────────────────────────
   * 2026-09-17, foydalanuvchi so'rovi: "aniqlanganlar qismida 2chi
   * versida janjalni bosganimizda berilgan backend swageridan olib
   * kelishi kerak". `janjal2ToNvrEvent()` HAR DOIM `category:"janjal"`
   * qaytaradi (server faqat janjal beradi) — ya'ni bu manba FAQAT
   * "Janjal" tabiga mos; `DetectionsPage.tsx` shu sabab `source` ni
   * FAQAT o'sha tab uchun `"janjal2"` qiladi (`weapon2Relevant` bilan
   * AYNI himoya — mos kelmagan tabda so'rov UMUMAN yuborilmaydi).
   */
  const janjal2Relevant = tab === "janjal" || (v2all && tab === "hammasi");
  const janjal2On = (source === "janjal2" || v2all) && janjal2Relevant;
  /* `weapon2CamerasQ` bilan AYNI himoya (yuqoridagi izohga qarang) —
     amalda `source` faqat "janjal" tabida "janjal2" bo'ladi, lekin
     ikkala shart bir joyda ANIQ ko'rinib tursin, tasodifan
     mos kelmay qolishdan himoyalansin. */
  const janjal2CamerasQ = useQuery({
    queryKey: ["janjal2-cameras"],
    queryFn: () => listJanjal2Cameras(),
    enabled: janjal2On,
    staleTime: 5 * 60_000,
  });
  const janjal2ByCam = janjal2Cams.length > 0;
  const janjal2Q = useQuery({
    queryKey: ["janjal2-alerts-window", janjal2Cams.join(",")],
    queryFn: () =>
      janjal2ByCam ? fetchByCameras(janjal2Cams, listJanjal2CameraAlerts) : fetchWindow(listJanjal2Alerts),
    enabled: janjal2On,
    staleTime: 15_000,
    placeholderData: keepPreviousData,
  });
  const janjal2CameraLabel = useMemo(() => {
    const m = new Map<number, string>();
    for (const c of janjal2CamerasQ.data ?? []) if (!c.hidden) m.set(c.id, c.location || c.name);
    return m;
  }, [janjal2CamerasQ.data]);
  const janjal2Hidden = useMemo(
    () => new Set((janjal2CamerasQ.data ?? []).filter((c) => c.hidden).map((c) => c.id)),
    [janjal2CamerasQ.data]
  );
  /* `weapon2Events`dagi bilan AYNI himoya (yuqoridagi izohga qarang) —
     amalda `source==="janjal2"` faqat "Janjal" tabida bo'ladi, lekin
     eski keshdan tasodifan sizib chiqmasin deb ANIQ tekshiriladi. */
  /* Yashirin kameralar SAHIFALASHDAN OLDIN chiqariladi (qurol bilan AYNI). */
  const janjal2All = useMemo(
    () =>
      !janjal2Relevant
        ? []
        : (janjal2Q.data?.data ?? [])
            .filter((a) => !janjal2Hidden.has(a.camera_id))
            .map((a) => janjal2ToNvrEvent(a, janjal2CameraLabel.get(a.camera_id) ?? `Kamera #${a.camera_id}`)),
    [janjal2Q.data, janjal2CameraLabel, janjal2Hidden, janjal2Relevant]
  );
  const janjal2Events = useMemo(
    () => janjal2All.slice((safePage - 1) * pageSize, safePage * pageSize),
    [janjal2All, safePage, pageSize]
  );
  const janjal2Total = janjal2All.length;
  const janjal2TotalPages = Math.max(1, Math.ceil(janjal2Total / pageSize));

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
      switching: weapon2Q.isPlaceholderData && weapon2Q.isFetching,
      error: weapon2Q.error ? String((weapon2Q.error as Error).message ?? weapon2Q.error) : null,
      live: false,
      page: safePage,
      pageSize,
      totalPages: weapon2TotalPages,
      setPage: (p) => setPageRaw(Math.min(Math.max(1, p), weapon2TotalPages)),
    };
  }
  if (v2all) {
    /* Ikki oyna BIRLASHTIRILIB vaqt bo'yicha saralanadi, KEYIN sahifalanadi —
       ilgari har serverdan sahifaga 12 tadan olinib, filtrdan keyin 4 ta
       qolardi, sahifalar soni esa xom `total`dan edi. */
    const all = [...weapon2All, ...janjal2All].sort((a, b) => (a.time < b.time ? 1 : a.time > b.time ? -1 : 0));
    const pages = Math.max(1, Math.ceil(all.length / pageSize));
    const merged = all.slice((Math.min(safePage, pages) - 1) * pageSize, Math.min(safePage, pages) * pageSize);
    const err = weapon2Q.error ?? janjal2Q.error;
    return {
      events: merged,
      total: weapon2Total + janjal2Total,
      loading: weapon2Q.isLoading || janjal2Q.isLoading,
      switching: (weapon2Q.isPlaceholderData && weapon2Q.isFetching) || (janjal2Q.isPlaceholderData && janjal2Q.isFetching),
      error: err ? String((err as Error).message ?? err) : null,
      live: false,
      page: safePage,
      pageSize,
      totalPages: pages,
      setPage: (p) => setPageRaw(Math.min(Math.max(1, p), pages)),
    };
  }
  if (source === "janjal2") {
    return {
      events: janjal2Events,
      total: janjal2Total,
      loading: janjal2Q.isLoading,
      switching: janjal2Q.isPlaceholderData && janjal2Q.isFetching,
      error: janjal2Q.error ? String((janjal2Q.error as Error).message ?? janjal2Q.error) : null,
      live: false,
      page: safePage,
      pageSize,
      totalPages: janjal2TotalPages,
      setPage: (p) => setPageRaw(Math.min(Math.max(1, p), janjal2TotalPages)),
    };
  }

  return {
    events,
    total,
    loading: query.isLoading,
    switching: query.isPlaceholderData && query.isFetching,
    error: query.error ? String((query.error as Error).message ?? query.error) : null,
    live: connected,
    page: safePage,
    pageSize,
    totalPages,
    setPage: (p) => setPageRaw(Math.min(Math.max(1, p), totalPages)),
  };
}
