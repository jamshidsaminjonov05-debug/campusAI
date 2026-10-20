import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowsClockwise as RefreshCw, Broadcast as Radio, CircleNotch as Loader2, DownloadSimple as Download, Play, VideoCameraSlash as VideoOff } from "@phosphor-icons/react";
import { getVideoInfo, nvrPanelUrl, probeVideo, type NvrVideoState } from "@/lib/nvr/nvrApi";
import { useT } from "@/i18n";

/**
 * Hodisa VIDEOSI — "Aniqlanganlar" tafsilot oynasining pastki bo'limi.
 *
 * Manba — OCHIQ API: `GET /nvr/events/{id}/video` (`FRONTEND.md` 5-A).
 * Ilgari bu yo'l yo'q edi va biz kuzatuv posti panelining ichki `/mp4` manzilini
 * so'rardik; endi rasmiy API MP4 (H.264) ni o'zi beradi.
 *
 * Oqim:
 *  1. `HEAD .../video?wait=0` — tayyormi (`probeVideo`): `200` tayyor,
 *     `202` aylantirilmoqda, qolgani — video yo'q;
 *  2. tayyor bo'lsa `<video>` MP4 ni o'ynaydi (proxy `Range` ni o'tkazgani
 *     uchun oldinga-orqaga surish ishlaydi);
 *  3. aylantirilayotgan bo'lsa har 5 soniyada o'zi qayta so'raydi.
 *
 * NEGA manzil `<video>` ga darrov berilmaydi: kuzatuv posti lavhasi yopiq IMKH va odatda
 * H.265 — server uni MP4 ga aylantirguncha `202` qaytaradi, `<video>` esa
 * `202` ni XATO deb bilib qayta so'ramaydi (`FRONTEND.md` 5-A ogohlantirishi).
 *
 * Kodek va jonli oqim — panel API'sida (`/nvr/panel/...`), ochiq API'da
 * yo'q. Shuning uchun u ALOHIDA va IXTIYORIY so'rov: yiqilsa ham video
 * baribir ko'rsatiladi.
 *
 * 🔵 "Videoni yuklab olish" — MP4, asl `.dav` EMAS (2026-09-11,
 * foydalanuvchi so'rovi: "asl lavhani bossam video mp4 formatda
 * yuklanishi kerak"). Ilgari tugma panel API'ning `.dav` klipini
 * (VLC talab qiladigan yopiq kodek) yuklardi. Endi u `<video>` allaqachon
 * o'ynatayotgan XUDDI SHU manzildan — `nvrEventVideoUrl()`, ochiq API'ning
 * MP4 (H.264) ga aylantirilgan nusxasi — yuklaydi: qo'shimcha so'rov
 * yo'q, brauzerning o'zi allaqachon shu faylni bir marta olgan bo'lishi
 * mumkin (keshdan). Shuning uchun `state === "ready"` bo'lgandagina
 * ko'rinadi — aks holda server hali `202` qaytaradi, fayl emas.
 *
 * 🔴 **"2-VERSIYA" (`weapon2`/`janjal2`) — BUTUNLAY BOSHQA VIDEO OQIMI**
 * (2026-09-17, foydalanuvchi so'rovi: "2chi versiyada rasm kelayabdi
 * lekin videolari kelmayabdi"). Sabab: bu komponent ILGARI faqat
 * `eventId`ni olardi va undan doim kuzatuv posti manzilini qurardi
 * (`nvrEventVideoUrl(eventId)` — raqam berilsa `NVR_BASE`dan
 * `/events/{id}/video`) — 2-versiya alertining `id`si kuzatuv posti
 * `id` fazosiga ALOQASI YO'Q, ya'ni bu manzil noto'g'ri (yo boshqa
 * hodisaning videosi, yo umuman yo'q) edi. Ustiga `probeVideo()`/
 * `getVideoInfo()` — ikkalasi ham kuzatuv postining O'Z aylantirish/panel
 * API'siga so'rov yuboradi, 2-versiya bunday API'ga EGA EMAS.
 *
 * Endi chaqiruvchi (`DetectionsPage.tsx`) to'liq manzilni
 * (`nvrEventVideoUrl(ev)` — `ev.video_url` bo'lsa O'SHANI oladi, ya'ni
 * `/weapon2/...`/`/janjal2/...` uchun ALLAQACHON to'g'ri) va `external`
 * bayrog'ini (`isLocalModelEvent(ev)`) beradi: `external` bo'lsa
 * probe/panel so'rovlari UMUMAN yuborilmaydi — 2-versiya videosi statik
 * fayl (kuzatuv postidagi H.265→MP4 konvertatsiya bosqichi yo'q),
 * shuning uchun holat DOIM "tayyor".
 */
/** `Content-Disposition: attachment; filename="..."` dan fayl nomini oladi. */
function filenameFromDisposition(v: string | null): string | null {
  const m = v?.match(/filename="?([^";]+)"?/i);
  return m ? m[1] : null;
}

export function EventVideo({
  eventId,
  ready,
  videoUrl,
  external = false,
}: {
  eventId: number;
  ready?: boolean;
  /** To'liq `<video src>` manzili — `nvrEventVideoUrl(ev)` (chaqiruvchida hisoblanadi). */
  videoUrl: string;
  /** `true` — "2-versiya" (`weapon2`/`janjal2`) hodisasi: probe/panel API o'tkazib yuboriladi. */
  external?: boolean;
}) {
  const v = useT().nvr.dossier.video;
  const [live, setLive] = useState(false);
  /* Asl lavha (`.dav`) bir necha MB — kuzatuv posti uni RTSP manbadan REAL VAQTDA
     o'qib beradi (tayyor fayl emas), ya'ni bir necha soniya jim turishi
     mumkin. Oddiy `<a href>` bu vaqt ichida HECH QANDAY belgi bermasdi —
     foydalanuvchi "bosdim, hech narsa bo'lmadi" deb o'ylardi. Endi
     `fetch()` bilan o'zimiz yuklab, tugagach brauzerga saqlashni
     BUYURAMIZ — shu oraliqda aylanuvchi belgi ko'rsatiladi. */
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(false);
  /* `<video>` MP4 tayyor bo'lsa ham brauzer uni hali OLIB KELMAGAN bo'lishi
     mumkin (lokal tarmoq bo'lsa ham fayl bir necha MB) — shuncha vaqt ekran
     qop-qora turmasin, aylanuvchi belgi + matn ko'rsatiladi
     (onWaiting/onCanPlay). */
  const [buffering, setBuffering] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  /* Tayyorlik — ochiq API. Hodisadagi `video_ready` boshlang'ich qiymat
     bo'lib xizmat qiladi: tayyor bo'lsa qo'shimcha so'rov yuborilmaydi.
     ⚠️ `external` (2-versiya) bo'lsa BUTUNLAY o'chiriladi — video statik
     fayl, kuzatuv postining aylantirish holati unga tegishli emas
     (yuqoridagi izohga qarang). */
  const q = useQuery({
    queryKey: ["nvr-video", eventId],
    queryFn: () => probeVideo(eventId),
    initialData: ready ? ("ready" as NvrVideoState) : undefined,
    // "Aylantirilmoqda" bo'lsa o'zi qayta so'raydi — foydalanuvchi "Yangilash"ni bosib o'tirmasin
    refetchInterval: (query) => (query.state.data === "preparing" ? 5000 : false),
    staleTime: 30_000,
    retry: false,
    enabled: !external,
  });

  /* Qo'shimcha (kodek / jonli oqim / asl lavha) — panel API. Ixtiyoriy,
     va `external`da UMUMAN so'ralmaydi — bu API 2-versiya `id`sini
     bilmaydi (kuzatuv postining O'Z hodisa raqamlariga tegishli). */
  const extra = useQuery({
    queryKey: ["nvr-video-info", eventId],
    queryFn: () => getVideoInfo(eventId),
    staleTime: 60_000,
    retry: false,
    enabled: !external,
  });

  // 2-versiya videosi — statik fayl, DOIM "tayyor" (konvertatsiya/probe yo'q).
  const state = external ? "ready" : q.data;
  const info = external ? undefined : extra.data;
  const liveUrl = nvrPanelUrl(info?.live_url);

  const toggleLive = useCallback(() => setLive((v) => !v), []);

  /* Yangi hodisa ochilganda (yoki video endigina "tayyor" bo'lganda)
     yuklanish belgisi qaytadan ko'rsatilsin — eski hodisaning "tayyor"
     holati keyingisiga o'tib qolmasin. */
  useEffect(() => {
    setBuffering(true);
  }, [eventId, state]);

  /* Videoni o'zimiz `fetch()` bilan olib, tayyor bo'lgach brauzerga
     BLOB sifatida saqlashni buyuramiz — oddiy `<a href>` dan farqli,
     shu yo'l bilan tugagunicha aylanuvchi belgi ko'rsatish mumkin. */
  const downloadClip = useCallback(async () => {
    if (state !== "ready" || downloading) return;
    setDownloading(true);
    setDownloadError(false);
    try {
      const res = await fetch(videoUrl, { cache: "no-store" });
      if (!res.ok) throw new Error(`${res.status}`);
      const filename = filenameFromDisposition(res.headers.get("content-disposition")) ?? `hodisa-${eventId}.mp4`;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      /* ⚠️ `revokeObjectURL` DARHOL emas — bir zumdan keyin (2026-09-07).
         Ba'zi brauzerlarda `click()` yuklashni FONDA boshlaydi-yu,
         funksiya darhol qaytadi; obyekt manzili shu yerdayoq bekor
         qilinsa (ayniqsa bir necha MB'lik fayl uchun) yuklash "sabab
         bilinmasdan" uzilib qolishi mumkin. Sahifa allaqachon boshqa
         joyga o'tgan bo'lsa ham xavfsiz — brauzer bloblarni o'zi
         tozalaydi. */
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setDownloadError(true);
    } finally {
      setDownloading(false);
    }
  }, [state, downloading, eventId, videoUrl]);

  return (
    <section className="nvr-video">
      <header className="nvr-video-head">
        <b>VIDEO</b>
        <div className="ml-auto flex items-center gap-1">
          {liveUrl && (
            <button type="button" onClick={toggleLive} className={`nvr-video-btn${live ? " is-on" : ""}`}>
              {live ? <Radio size={12} /> : <Play size={12} />}
              {live ? v.backToRecord : v.live}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              // `external`da `q`/`extra` o'chirilgan (yuqoridagi izohga
              // qarang) — ularga qayta so'rov yubormaymiz, faqat elementni
              // qayta yuklaymiz (kesh/uzilgan ulanishdan tiklash uchun).
              if (!external) {
                q.refetch();
                extra.refetch();
              }
              setBuffering(true);
              videoRef.current?.load();
            }}
            disabled={q.isFetching}
            className="nvr-video-btn"
          >
            <RefreshCw size={12} className={q.isFetching ? "animate-spin" : undefined} />
            {v.refresh}
          </button>
          {/* ⚠️ FAQAT `state === "ready"` — video hali "tayyorlanmoqda" yoki
              UMUMAN yo'q bo'lsa yuklab olinadigan MP4 fayl ham yo'q (server
              `202`/`404` qaytaradi). Tugma bo'lsa-yu, bosilganda xato
              qaytarsa — "bosdim, ishlamadi" degan bo'sh interaksiya
              bo'lardi (2026-09-10, foydalanuvchi so'rovi: "video kelmasa
              nvr yozuvi kelmasin" — o'sha qoida shu yerga ham tegishli). */}
          {state === "ready" && (
            <button
              type="button"
              onClick={downloadClip}
              disabled={downloading}
              className="nvr-video-btn"
              title={downloadError ? v.downloadFailed : v.downloadHint}
            >
              {downloading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
              {downloading ? v.downloading : downloadError ? v.retry : v.download}
            </button>
          )}
        </div>
      </header>

      <div className="nvr-video-stage">
        {state == null && q.isLoading && (
          <div className="nvr-video-note">
            <Loader2 size={18} className="animate-spin" />
            {v.infoLoading}
          </div>
        )}

        {q.error != null && (
          <div className="nvr-video-note">
            <VideoOff size={18} />
            {v.infoFailed}
          </div>
        )}

        {/* Jonli oqim — MJPEG, oddiy `<img>` bilan ko'rsatiladi */}
        {live && liveUrl && <img src={liveUrl} alt={v.liveAlt} className="nvr-video-el" />}

        {/* Yozuv — MP4 tayyor bo'lganda. Fayl kelguncha (`buffering`) ustidan
            aylanuvchi belgi turadi — foydalanuvchi ekran qop-qora ko'rinsa
            ham video YO'Q deb o'ylamasin, u shunchaki yuklanmoqda. */}
        {!live && state === "ready" && (
          <>
            <video
              key={eventId}
              ref={videoRef}
              src={videoUrl}
              controls
              playsInline
              preload="auto"
              className="nvr-video-el"
              onLoadStart={() => setBuffering(true)}
              onWaiting={() => setBuffering(true)}
              onCanPlay={() => setBuffering(false)}
              onLoadedData={() => setBuffering(false)}
              onPlaying={() => setBuffering(false)}
              // `video_ready` eskirgan bo'lsa (202 qaytsa) holatni qaytadan so'raymiz
              onError={() => {
                setBuffering(false);
                q.refetch();
              }}
            />
            {buffering && (
              <div className="nvr-video-loading">
                <Loader2 size={26} className="animate-spin" />
                <span>{v.loading}</span>
              </div>
            )}
          </>
        )}

        {/* Aylantirish davom etyapti — server H.265 lavhani MP4'ga o'girib
            bo'lguncha shu holat turadi. Ilgari bu yerda faqat SKELET
            effekt (jim shimmer) bor edi — foydalanuvchi video umuman
            yo'qmi yoki hali kelayaptimi, farqini bilolmasdi. Endi aniq
            aylanuvchi belgi + matn bilan: video BOR, faqat sekin ochilyapti. */}
        {!live && state === "preparing" && (
          <div className="nvr-video-skeleton">
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 text-center">
              <Loader2 size={26} className="animate-spin text-ice-bright" />
              <span className="text-[12px] font-semibold text-slate-200">{v.preparing}</span>
              <span className="max-w-[260px] text-[10.5px] leading-snug text-slate-500">
                {v.preparingHint}
              </span>
            </div>
          </div>
        )}

        {/* Umuman video yo'q — sababi (bo'lsa) panel ma'lumotidan */}
        {!live && state === "none" && (
          <div className="nvr-video-note">
            <VideoOff size={18} />
            <span>
              {v.none}
              {info?.reason && (
                <em className="block text-[10.5px] not-italic leading-snug text-slate-500">{info.reason}</em>
              )}
            </span>
          </div>
        )}
      </div>

      {info && (
        <footer className="nvr-video-foot">
          <span>
            {v.channel}: <b>{info.channel_name || info.channel}</b>
          </span>
          {info.codec && (
            <span>
              {v.codec}: <b>{info.codec}</b>
            </span>
          )}
          {info.replay_frames > 0 && (
            <span>
              {v.frames}: <b>{info.replay_frames}</b>
            </span>
          )}
        </footer>
      )}
    </section>
  );
}
