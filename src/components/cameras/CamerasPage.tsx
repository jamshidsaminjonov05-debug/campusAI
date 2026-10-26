import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowsClockwise as RefreshCcw, MagnifyingGlass as Search, SquaresFour, Play, SecurityCamera, UserFocus, X } from "@phosphor-icons/react";
import { useCameras } from "@/hooks/useApi";
import { useNvrChannels } from "@/hooks/useNvrChannels";
import { useDetectionCameras } from "@/hooks/useDetections";
import { type CameraOut } from "@/lib/api";
import { nvrChannelSnapshotUrl, nvrChannelStreamUrl } from "@/lib/nvr/nvrApi";
import { clearThumbs } from "@/lib/nvr/cameraThumbs";
import { CamThumb } from "./CamThumb";
import { useAppStore } from "@/store/useAppStore";
import { useT } from "@/i18n";
import { Pagination } from "@/components/common/Pagination";
import { INSTITUTIONS } from "@/config/institutions";
import { resolveCampus } from "@/lib/nvr/cameraBinding";
import { CameraStreamModal } from "./CameraStreamModal";
import { CameraDetectionsModal } from "./CameraDetectionsModal";
import { CameraKpiRow } from "./CameraKpiRow";
import { Skeleton } from "@/components/common/panels";
import { EmptyState } from "@/components/common/EmptyState";

/** Kameralar ro'yxati filtri. */
/* ⚠️ Holat filtri ("Hammasi / Onlayn / Oflayn") OLIB TASHLANDI — 32 ta
   kanalning hammasi doim onlayn, filtr hech qachon hech narsani kesmasdi
   va qatorda o'rinni egallab turardi. Kartochkadagi yashil/kulrang nuqta
   holatni allaqachon ko'rsatadi. */

/**
 * Panjara — QATORDAGI kamera soni.
 *
 * ⚠️ Ilgari "Mayda / O'rta / Yirik" tanlovi bor edi va u kartochkaning
 * minimal ENINI berardi (`auto-fill`), ya'ni qatorga nechta sig'ishini
 * foydalanuvchi BILMASDI — ekran eniga qarab o'zi o'zgarardi. Endi son
 * to'g'ridan-to'g'ri beriladi: `grid-template-columns: repeat(N, 1fr)`.
 */
const CAM_COLS_MIN = 2;
const CAM_COLS_MAX = 8;
const CAM_COLS_DEFAULT = 6;
const CAM_COLS_KEY = "hik-cam-grid-cols";

/* Barqaror bo'sh ro'yxat — `[]` literal har renderda yangi massiv bo'lib
   `useMemo` bog'liqliklarini buzardi (eslint exhaustive-deps). */
const NO_CAMERAS: CameraOut[] = [];

export function CamerasPage() {
  const t = useT();
  const { data: backendCameras, isLoading: backendLoading } = useCameras();
  /* Asosiy backend'da kamera ro'yxati BO'SH, kuzatuv posti qurilmasida esa 32 ta kanal
     ro'yxatga olingan. Backend bo'sh bo'lsa o'sha kanallarga tushamiz —
     ular `CameraOut` shakliga o'giriladi, shuning uchun quyidagi butun UI
     o'zgarishsiz ishlaydi (`hooks/useNvrChannels.ts`). */
  const nvr = useNvrChannels();
  /* 🔴 KUZATUV POSTI KANALLARI USTUN (2026-10-26, "kameralar ishlamay qoldi").
     Ilgari `usingNvr` faqat backend ro'yxati BO'SH bo'lganda yoqilardi.
     `NEXT_PUBLIC_API_ORIGIN` kuzatuv postiga (7007) o'tgach `/api/v1/cameras`
     endi HODISA STATISTIKASINI qaytaradi (o'lchandi: `{cameras:[{id:"31",
     name:"Camera 01",count:242565,last:…}]}`, 2.5 s) — `listCameras()`
     adapteri uni `CameraOut[]` qilib bergani uchun ro'yxat "to'ldi", sahifa
     32 kanal o'rniga faqat hodisa bo'lgan 3–4 kamerani chizdi, stop-kadr
     (`usingNvr` shart) yo'qoldi, oqim esa mavjud bo'lmagan
     `/cameras/{id}/mjpeg` ga ketdi. Qurilma kanallari — yagona haqiqiy
     ro'yxat (onlayn bayrog'i bilan); backend ro'yxati faqat kanal
     umuman bo'lmaganda zaxira. */
  /* 🔴 ESKI TARTIB QAYTARILDI (2026-10-26 kechqurun, foydalanuvchi: "kameralarni
     eski usulda olib kel"): qurilma kanallari kelsa — o'sha 32 ta; kanal
     so'rovi XATO bo'lsa (kuzatuv posti qurilmaga ulana olmadi — `/api/status`
     `nvr_ok:false`, `/api/channels` 502) — `/api/v1/cameras` ro'yxati
     (hodisa bo'lgan kameralar, `channel = id`) ZAXIRA sifatida, bo'sh ekran
     o'rniga. Ikkala manba ham kuzatuv posti (7007) — stop-kadr/oqim
     `channel` raqami bilan bir xil yo'ldan, shuning uchun `usingNvr`
     ro'yxat bo'sh bo'lmasa DOIM `true`. Xato faqat IKKALASI ham bo'sh
     bo'lganda ko'rsatiladi — qisqa "Server bilan aloqa yo'q" (xom texnik
     matn `title`da, ekranda emas — "Tizim holati" qoidasi). */
  const channelsFailed = !nvr.isLoading && nvr.error != null && nvr.cameras.length === 0;
  const cameras = nvr.cameras.length > 0 ? nvr.cameras : nvr.isLoading ? NO_CAMERAS : backendCameras;
  const usingNvr = (cameras?.length ?? 0) > 0;
  const isLoading = nvr.isLoading || (channelsFailed && backendLoading);
  const noSource = channelsFailed && !backendLoading && (backendCameras?.length ?? 0) === 0;
  /* 🔴 Kamera QO'SHISH/TAHRIRLASH/O'CHIRISH OLIB TASHLANDI (2026-10-26, test):
     ular eski backend `/api/v1/cameras` ga yozardi — hozirgi serverda bu
     resurs yo'q, tugmalar faqat xato berardi. Kameralar kuzatuv posti
     qurilmasining o'zida sozlanadi. */

  const [selectedCamId, setSelectedCamId] = useState<string | null>(null);
  const [camSearch, setCamSearch] = useState("");
  /* Qatordagi kamera soni. Tanlov `localStorage` da — sahifaga qaytganda
     avtomatik tiklanadi. */
  const [camCols, setCamCols] = useState<number>(() => {
    if (typeof window === "undefined") return CAM_COLS_DEFAULT;
    const n = Number(window.localStorage.getItem(CAM_COLS_KEY));
    return Number.isFinite(n) && n >= CAM_COLS_MIN && n <= CAM_COLS_MAX ? n : CAM_COLS_DEFAULT;
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(CAM_COLS_KEY, String(camCols));
    } catch {
      /* kvota/private rejim — tanlov shu sessiyada qoladi */
    }
  }, [camCols]);
  /* Header'da tanlangan muassasa — kameralar filtri shundan boshlanadi. */
  const selectedTeknikum = useAppStore((s) => s.selectedTeknikum);
  /* Muassasa filtri — "all" yoki `institutions.ts` id'si. Ochilishda header'da
     tanlangan muassasa (`selectedTeknikum`) qo'yiladi, ya'ni sahifaga
     o'tilganda darhol o'sha maktabning kameralari ko'rinadi. */
  /* ⚠️ "Barcha muassasalar" varianti YO'Q va default — kuzatuvdagi
     BIRINCHI muassasa (Chilonzor 179-maktab). Kamera faqat o'sha yerda
     bor; "hammasi" tanlovi ayni ro'yxatni berardi, lekin qaysi maktab
     ekani noaniq qolardi. */
  const [camInst, setCamInst] = useState<string>(
    () => selectedTeknikum ?? INSTITUTIONS[0]?.id ?? ""
  );
  const [camPage, setCamPage] = useState(1);
  /* Qaysi kameraning aniqlangan tasvirlari ochilgan (kanal raqami). */
  const [infoCam, setInfoCam] = useState<CameraOut | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  /* Jonli oqim MODALDA ochiladi (`CameraStreamModal`): panjaradagi 32 ta
     kartochka bir vaqtda oqim ko'rsatsa brauzer ham, kuzatuv posti ham yiqiladi —
     har MJPEG oqimi ochiq HTTP ulanish. Modal yopilishi bilan oqim uziladi. */
  const [liveCamId, setLiveCamId] = useState<string | null>(null);
  /* Ovozli buyruq ochiq modalga uzatiladi (och/to'xtat/to'liq ekran). */
  const [camAction, setCamAction] = useState<"play" | "pause" | "fullscreen" | null>(null);
  /* Stop-kadrlar keshdan emas, sahifa ochilganda YANGI olinsin. */
  const [snapBust, setSnapBust] = useState(() => Date.now());

  const selectedCam = cameras?.find((c) => c.id === selectedCamId) ?? cameras?.[0] ?? null;

  /** Kamera qaysi muassasada (`lib/cameraBinding.ts` — yagona qatlam). */
  const instOf = useCallback(
    (c: CameraOut) => resolveCampus(c.name, String(c.channel))?.id ?? null,
    []
  );

  /**
   * Muassasalar ro'yxati — KAMERASI BORLARI BIRINCHI.
   *
   * Kamerasi yo'q muassasa ham ko'rinadi (ro'yxat to'liq bo'lsin), lekin
   * pastda va soni `0` bilan — tanlansa "kamera qo'shilmagan" chiqadi.
   */
  const instOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of cameras ?? []) {
      const id = instOf(c);
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    const rows = INSTITUTIONS.map((i) => ({ id: i.id, name: i.name, short: i.short, count: counts.get(i.id) ?? 0 }));
    rows.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    return rows;
  }, [cameras, instOf]);

  /* Muassasa + holat + qidiruv. Qidiruv kamera nomi, kanali, IP'si VA
     muassasa nomi bo'yicha ishlaydi — "179" yozilsa o'sha maktab kameralari
     chiqadi. */
  const filteredCameras = useMemo(() => {
    const q = camSearch.trim().toLowerCase();
    const nameById = new Map(INSTITUTIONS.map((i) => [i.id, `${i.name} ${i.short}`.toLowerCase()]));
    return (cameras ?? [])
      .filter((c) => !camInst || instOf(c) === camInst)
      .filter((c) => {
        if (!q) return true;
        const inst = instOf(c);
        const hay = `${c.name} ${c.channel} ${c.ip_address ?? ""} ${inst ? nameById.get(inst) ?? "" : ""}`;
        return hay.toLowerCase().includes(q);
      });
  }, [cameras, camSearch, camInst, instOf]);

  /* Sahifalash — "Aniqlanganlar" bilan bir xil komponent. Sahifa hajmi
     panjara zichligiga bog'liq: yirik kartochkada qatorga kamroq sig'adi. */
  // 3 qator — qatordagi son o'zgarsa sahifa hajmi ham moslashadi
  const camPageSize = camCols * 3;
  const camTotalPages = Math.max(1, Math.ceil(filteredCameras.length / camPageSize));
  // Filtr o'zgarsa 1-sahifaga qaytamiz — ko'rinmas sahifada turib qolmaslik uchun
  useEffect(() => {
    setCamPage(1);
  }, [camSearch, camInst, camCols]);
  const shownCameras = useMemo(
    () => filteredCameras.slice((camPage - 1) * camPageSize, camPage * camPageSize),
    [filteredCameras, camPage, camPageSize]
  );

  const camStats = useMemo(
    () => ({ total: cameras?.length ?? 0, online: (cameras ?? []).filter((c) => c.is_active).length }),
    [cameras]
  );

  /* Qaysi kanaldan nechta hodisa kelgan — kartochkadagi rozetka.
     Aniqlash API kanal bo'yicha guruhlangan ro'yxat bermaydi, shuning uchun
     mavjud hodisalardan hisoblanadi (`useDetectionCameras`). */
  const { cameras: eventCams } = useDetectionCameras();
  /** Kanal → {hodisa soni, aniqlangan ODAM soni}. */
  const camCounts = useMemo(
    () => new Map(eventCams.map((c) => [c.channel, { events: c.count, people: c.people }])),
    [eventCams]
  );

  /* Oqim manzili MANBAGA qarab: kuzatuv posti kanali bo'lsa panel API'sining MJPEG
     oqimi (`/nvr/panel/channels/{id}/stream`), aks holda backend MJPEG.
     Faqat OCHIQ modal uchun hisoblanadi — panjarada oqim yo'q. */
  const liveCam = cameras?.find((c) => c.id === liveCamId) ?? null;
  const liveStreamUrl = liveCam ? nvrChannelStreamUrl(liveCam.channel, 4) : null;

  /** Kartochka bosildi — kamera tanlanadi va jonli oqim oynasi ochiladi. */
  function openStream(id: string) {
    setSelectedCamId(id);
    setLiveCamId(id);
  }

  // Ovozli buyruq: "Kamera 15 ni och" / "Birinchi kamerani och" / "Jonli efirni och/to'xtat" / "To'liq ekranga o't"
  const voiceCameraCommand = useAppStore((s) => s.voiceCameraCommand);
  const setVoiceCameraCommand = useAppStore((s) => s.setVoiceCameraCommand);
  useEffect(() => {
    if (!voiceCameraCommand || !cameras) return;
    const { selectIndex, selectName, action } = voiceCameraCommand.value;
    if (selectName !== undefined) {
      /* 3D kampusdagi kamera nuqtasidan keladi: kuzatuv posti kanal NOMI ma'lum, lekin
         ro'yxatdagi tartib raqami emas. Avval aniq nom, keyin kanal raqami,
         oxirida qismiy moslik bo'yicha qidiramiz. */
      const q = selectName.trim().toLowerCase();
      const target =
        cameras.find((c) => c.name.trim().toLowerCase() === q) ??
        cameras.find((c) => String(c.channel) === q) ??
        cameras.find((c) => c.name.toLowerCase().includes(q));
      if (target) openStream(target.id);
      else flash(`Kamera topilmadi: ${selectName}`);
    } else if (selectIndex !== undefined) {
      const target = cameras[selectIndex - 1];
      if (target) openStream(target.id);
      else flash("Kamera topilmadi");
    } else if (action) {
      /* Buyruq ochiq oynaga tegishli; oyna yopiq bo'lsa tanlangan kamera
         ochiladi (ovoz bilan "jonli efirni och" deyilganda shu kutiladi). */
      if (!liveCamId && selectedCam) setLiveCamId(selectedCam.id);
      setCamAction(action);
    }
    setVoiceCameraCommand(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceCameraCommand, cameras]);

  function flash(msg: string) {
    setActionMsg(msg);
    window.setTimeout(() => setActionMsg(null), 3000);
  }

  /* Stop-kadrlar sessiya davomida saqlanadi (`lib/cameraThumbs.ts`), ya'ni
     sahifa qayta ochilganda ular yangilanmaydi. Yangi kadr kerak bo'lsa —
     shu tugma: kesh tozalanadi va suratlar qaytadan olinadi. */
  function refreshThumbs() {
    clearThumbs();
    setSnapBust(Date.now());
  }

  return (
    /* ⚠️ Sahifa ildizida `hik-glass-blue` YO'Q — u butun ekranni qoplab,
       orqadagi blueprint setkasini bekitib qo'yardi. Endi kartochka va
       panellar to'g'ridan-to'g'ri fon ustida "suzadi", setka esa ularning
       shaffof sirtidan ko'rinib turadi. */
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-y-auto">
      {/* Amal xabari */}
      <AnimatePresence>
        {actionMsg && (
          <motion.p
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed left-1/2 top-4 z-50 -translate-x-1/2 rounded-xl border border-ice/30 bg-[#16213C]/90 px-4 py-2 text-[12px] font-semibold text-ice-bright shadow-xl backdrop-blur-xl"
          >
            {actionMsg}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Asosiy tartib: kameralar panjarasi + o'ng panel.
          Ilgari chapda DOIMIY jonli sahna turardi (bitta kamera oqimi ochiq
          holda). Endi panjarada hamma kamera ketma-ket, oqim esa faqat
          kartochka bosilganda modalda ochiladi va yopilishi bilan uziladi. */}
      {/* Sahifaga TEGISHLI ko'rsatkichlar — kanallar va aniqlash oqimidan */}
      <div className="flex-none">
        <CameraKpiRow cameras={cameras ?? []} />
      </div>

      {/* O'ng ustun (davomat + so'nggi kirishlar) OLIB TASHLANDI — u
          kameralarga tegishli emas edi; o'sha sonlar Dashboard va Statistika
          bo'limlarida bor. Panjara endi butun enni egallaydi. */}
      <div className="flex min-h-0 flex-1 flex-col">
        {/* ── Kameralar ro'yxati ──────────────────────────────────────────────
            Ilgari bu gorizontal lenta edi va har kartochkaga BITTA soxta rasm
            (`/imges/cam-scene.webp`) turli siljish bilan qo'yilardi — 32 ta
            haqiqiy kamera paydo bo'lgach bu ham yolg'on, ham o'qib bo'lmas
            ko'rinishga aylandi. Endi: qidiruv + holat filtri + panjara, har
            kartochkada HAQIQIY ma'lumot (kanal, IP, hodisa soni). */}
        <div className="hik-glass-blue flex min-h-0 flex-1 flex-col gap-2.5 rounded-2xl p-3">
          <div className="flex flex-none flex-wrap items-center gap-2">
            <p className="text-[12.5px] font-bold">
              Kameralar
              <span className="ml-2 font-mono text-[11px] font-normal text-slate-400">
                {camStats.online}/{camStats.total} onlayn
              </span>
            </p>

            {/* Muassasa tanlash — TABLAR EMAS, `select`: muassasa 645 tagacha
                o'sishi mumkin va tablar qatorga sig'masdi. Kamerasi borlari
                ro'yxat boshida (`instOptions` shunday saralangan). */}
            <select
              value={camInst}
              onChange={(e) => setCamInst(e.target.value)}
              title="Qaysi muassasa kameralari"
              className="hik-input h-8 max-w-[260px] cursor-pointer px-2.5 text-[12px] [color-scheme:dark] [&_option]:bg-ink-panel [&_option]:text-slate-100"
            >
              {instOptions.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.short} ({i.count})
                </option>
              ))}
            </select>

            <div className="hik-input ml-auto flex h-8 min-w-[190px] items-center gap-1.5 px-2.5 text-[12px]">
              <Search size={13} className="flex-none text-slate-500" />
              <input
                value={camSearch}
                onChange={(e) => setCamSearch(e.target.value)}
                placeholder="Kamera nomi, kanal, IP yoki muassasa..."
                className="w-full bg-transparent text-slate-200 outline-none placeholder:text-slate-500"
              />
              {camSearch && (
                <button onClick={() => setCamSearch("")} className="text-slate-500 hover:text-white">
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Qatordagi kamera soni — slider. Qiymat DARHOL ko'rinadi va
                `localStorage` da saqlanadi. */}
            <label
              className="flex flex-none items-center gap-2 border-l border-white/[0.08] pl-2.5"
              title="Qatordagi kamera soni"
            >
              <SquaresFour size={14} weight="duotone" className="flex-none text-slate-400" />
              <input
                type="range"
                min={CAM_COLS_MIN}
                max={CAM_COLS_MAX}
                step={1}
                value={camCols}
                onChange={(e) => setCamCols(Number(e.target.value))}
                aria-label="Qatordagi kamera soni"
                className="cam-cols-range"
              />
              <span className="w-4 flex-none text-center font-mono text-[11.5px] font-bold text-ice-soft">
                {camCols}
              </span>
            </label>

            {/* Stop-kadrlarni qayta olish — ular sessiya davomida saqlanadi */}
            {usingNvr && (
              <button
                onClick={refreshThumbs}
                title="Kartochkalardagi suratlarni yangilash"
                className="flex flex-none items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[11.5px] font-semibold text-slate-300 transition-colors hover:border-ice/40 hover:text-white"
              >
                <RefreshCcw size={13} /> {t.common.refresh}
              </button>
            )}

          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            {isLoading && (
              <div className="cam-grid" style={{ ["--cam-cols" as string]: camCols }}>
                {Array.from({ length: camCols * 2 }, (_, i) => (
                  <Skeleton key={i} className="aspect-video w-full rounded-xl" />
                ))}
              </div>
            )}

            {!isLoading && noSource && (
              <div
                className="mx-auto my-8 max-w-[460px] rounded-2xl border border-rose-500/30 bg-rose-500/[0.06] px-5 py-4 text-center"
                title={String((nvr.error as Error)?.message ?? nvr.error)}
              >
                <p className="text-[13px] font-bold text-rose-200">{t.cameras.noConnection}</p>
                <p className="mt-1 text-[11.5px] text-slate-400">{t.cameras.noConnectionHint}</p>
                <button
                  type="button"
                  onClick={() => nvr.refetch()}
                  disabled={nvr.isFetching}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11.5px] font-semibold text-slate-200 transition-colors hover:border-ice/40 hover:text-white disabled:opacity-60"
                >
                  <RefreshCcw size={13} className={nvr.isFetching ? "animate-spin" : ""} /> {t.common.retry}
                </button>
              </div>
            )}

            {!isLoading && channelsFailed && !noSource && (
              <p
                className="mb-2 rounded-lg border border-amber-400/30 bg-amber-400/[0.08] px-3 py-1.5 text-center text-[11.5px] text-amber-200"
                title={String((nvr.error as Error)?.message ?? nvr.error)}
              >
                {t.cameras.noConnectionFallback}
              </p>
            )}

            {!isLoading && !noSource && shownCameras.length === 0 && (
              <EmptyState fill title={camSearch ? "Mos kamera topilmadi" : "Kamera qo'shilmagan"} />
            )}

            <div className="cam-grid" style={{ ["--cam-cols" as string]: camCols }}>
              {shownCameras.map((cam) => {
                /* Faqat HAQIQATAN tanlangani ajratiladi. `selectedCam` da
                   birinchi kameraga tushish (fallback) bor — u ishlatilsa
                   sahifa ochilishi bilan 1-kartochka "tanlangan" bo'lib
                   ko'rinardi. */
                const active = selectedCamId === cam.id;
                const stat = camCounts.get(String(cam.channel));
                return (
                  <button
                    key={cam.id}
                    type="button"
                    onClick={() => openStream(cam.id)}
                    title={cam.is_active ? t.cameras.openStream : t.cameras.liveOfflineHint}
                    className={`cam-card${active ? " is-active" : ""}${cam.is_active ? "" : " is-off"}`}
                  >
                    {/* Stop-kadr (oqim EMAS) — kartochka qop-qora turmasin */}
                    {usingNvr && cam.is_active && <CamThumb key={snapBust} channel={cam.channel} bust={snapBust} />}

                    {/* Vizir bezaklari — burchak qavslari va markaz nishoni */}
                    <span className="cam-vf-c cam-vf-c1" />
                    <span className="cam-vf-c cam-vf-c2" />
                    <span className="cam-vf-c cam-vf-c3" />
                    <span className="cam-vf-c cam-vf-c4" />

                    {/* ── Yuqori qator: holat nuqtasi + NOM (chapda), kanal (o'ngda) ──
                        Ilgari nom pastda, kanal ham pastda edi; boshqaruv
                        ikonkalari esa YUQORI-O'NGDA hover'da chiqardi va
                        kanal bilan bir joyga tushardi. */}
                    <span className="cam-card-top">
                      <span className="cam-tag">
                        <i className={`cam-dot${cam.is_active ? " is-on" : ""}`} />
                        <span className="cam-name">{cam.name}</span>
                      </span>
                      <span className="cam-ch ml-auto flex-none">#{cam.channel}</span>
                    </span>

                    {/* Markazdagi ochish belgisi — vizir nishoni o'rnida */}
                    <span className="cam-play">
                      <Play size={16} weight="fill" />
                    </span>

                    {/* ── Pastki qator: IP (chapda) + boshqaruv (o'ngda) ── */}
                    <span className="cam-card-bottom">
                      <span className="cam-tag min-w-0">
                        <SecurityCamera size={12} weight="duotone" className="flex-none text-slate-400" />
                        <span className="cam-meta">{cam.ip_address ?? cam.location ?? "—"}</span>
                      </span>

                      {/* Rozetkalar IP yonida — boshqaruv tugmalari hover'da
                          chiqadi, bu sonlar esa DOIM ko'rinishi kerak.
                          Yuqorida turolmasdi: u yerda nom va kanal bor. */}
                      {/* Rozetkalar BOSILADI — aniqlangan tasvirlar ochiladi.
                          Ilgari buning uchun alohida "ⓘ" tugmasi bor edi;
                          son bosilishi tabiiyroq va bitta tugma kamayadi. */}
                      {stat && stat.people > 0 && (
                        <span
                          role="button"
                          tabIndex={-1}
                          onClick={(e) => { e.stopPropagation(); setInfoCam(cam); }}
                          title={`${stat.people} ta odam aniqlangan — tasvirlarni ko'rish`}
                          className="cam-count is-link"
                        >
                          <UserFocus size={11} weight="duotone" />
                          {stat.people}
                        </span>
                      )}
                      {stat && stat.events > 0 && (
                        <span
                          role="button"
                          tabIndex={-1}
                          onClick={(e) => { e.stopPropagation(); setInfoCam(cam); }}
                          title={`${stat.events} ta hodisa — tasvirlarni ko'rish`}
                          className="cam-count is-event is-link"
                        >
                          {stat.events}
                        </span>
                      )}

                    </span>
                  </button>
                );
              })}
            </div>

            {/* Sahifalash panjara OQIMIDA — "Aniqlanganlar" bilan AYNI
                komponent va ayni xatti-harakat. */}
            <Pagination
              page={camPage}
              totalPages={camTotalPages}
              onChange={setCamPage}
              prevLabel={t.detections.prev}
              nextLabel={t.detections.next}
              ariaLabel={`${filteredCameras.length} ta kamera`}
              className="mt-auto"
            />
          </div>
        </div>
      </div>

      {/* Shu kamera aniqlagan tasvirlar — scroll bilan */}
      <AnimatePresence>
        {infoCam && (
          <CameraDetectionsModal
            key={infoCam.id}
            channel={infoCam.channel}
            cameraName={infoCam.name}
            onClose={() => setInfoCam(null)}
          />
        )}
      </AnimatePresence>

      {/* Jonli oqim — FAQAT shu oynada. Yopilishi bilan MJPEG ulanishi uziladi. */}
      <AnimatePresence>
        {liveCam && liveStreamUrl && (
          <CameraStreamModal
            key={liveCam.id}
            cam={liveCam}
            streamUrl={liveStreamUrl}
            posterUrl={usingNvr ? nvrChannelSnapshotUrl(liveCam.channel, snapBust) : null}
            onClose={() => setLiveCamId(null)}
            action={camAction}
            onActionDone={() => setCamAction(null)}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
