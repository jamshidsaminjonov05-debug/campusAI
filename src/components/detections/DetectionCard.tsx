import { useEffect, useState, type CSSProperties } from "react";
import {
  ImageBroken as ImageOff,
  MagnifyingGlassPlus,
  Play,
  ShieldWarning as ShieldAlert,
  UserFocus as ScanFace,
  UserMinus as UserX,
} from "@phosphor-icons/react";
import {
  eventPerson,
  isLocalModelEvent,
  nvrImageUrl,
  nvrPersonPhotoUrl,
  nvrTime,
  type NvrBox,
  type NvrEvent,
} from "@/lib/nvr/nvrApi";
import { LEVEL_TONE, detectionLevel } from "@/lib/nvr/detectionLevel";
import { resolveCampus } from "@/lib/nvr/cameraBinding";
import { cameraPlaceLabel } from "@/config/cameraPlacements";
import { dayMonthLabel } from "@/lib/dateLabel";
import { tr } from "@/i18n";

/** Kategoriya rangi — kartochka chegarasi va yorlig'i uchun. */
export const NVR_COLOR: Record<string, string> = {
  face: "#38bdf8",
  gun: "#ff4d4d",
  janjal: "#f43f5e",
  smoking: "#f59e0b",
  /* Tab id'lari — chekish/telefon serverda bitta kategoriya, UI'da ikkita */
  chekish: "#f59e0b",
  telefon: "#a78bfa",
};

interface Props {
  ev: NvrEvent;
  onOpen: (ev: NvrEvent) => void;
  /** Ko'rilgan (bosilgan) — rang ketadi, surat kulrang bo'ladi. */
  seen?: boolean;
}

/**
 * KADRNI YUZGA YAQINLASHTIRISH — faqat BITTA rasmli yuz hodisasi uchun.
 *
 * Odatda yuz hodisasida ikki rasm bo'ladi (`index=0` kesilgan yuz, `index=1`
 * butun kadr) va kartochka kesilgan yuzni ko'rsatadi. Lekin ba'zi hodisada
 * rasm BITTA — butun kadr (`image_count<=1`): uzoqdan olingan umumiy
 * ko'rinishda 10–15 odam turadi va qaysi biri tanilgani bilinmaydi
 * (UX tahlili, 2026-10-24: "Nuritdinov Asliddin" kartochkasi). Server
 * `boxes` bilan yuzning joyini aytadi — shu joy CSS `transform` bilan
 * kattalashtiriladi, ya'ni kartochkada HAMMA yuz hodisasi bir xil
 * "yaqindan" ko'rinishda. Butun kadr dossiyeda avvalgidek to'liq turadi.
 *
 * Hisob: ramka markazi konteyner markaziga suriladi, masshtab ramkani
 * ~55% ga yetkazadi (1.2…4 oralig'ida); rasm konteynerni to'liq qoplab
 * turishi uchun siljish chegaralanadi (chetdagi yuzda bo'sh joy chiqmasin).
 */
function zoomToBox(b: NvrBox): CSSProperties {
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const s = Math.min(4, Math.max(1.2, Math.min(0.55 / Math.max(b.w, 0.01), 0.55 / Math.max(b.h, 0.01))));
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  /* Markazning yakuniy o'rni — 0.5 ga intiladi, lekin rasm cheti ichkariga kirmasin */
  const tx = clamp(0.5, 1 - s * (1 - cx), s * cx) - cx;
  const ty = clamp(0.5, 1 - s * (1 - cy), s * cy) - cy;
  return {
    transformOrigin: `${cx * 100}% ${cy * 100}%`,
    transform: `translate(${(tx * 100).toFixed(2)}%, ${(ty * 100).toFixed(2)}%) scale(${s.toFixed(3)})`,
  };
}

/**
 * Bazadagi (etalon) surat — 36 px dumaloq, ism yonida. Operator kameradagi
 * yuz bilan bazadagi rasmni BIR QARASHDA solishtiradi (UX tahlili 1-band:
 * "81%/92% to'g'rimi — tekshirishning iloji yo'q edi"). Surat yo'q bo'lsa
 * (`404`) bosh harflar — hech narsa o'ylab topilmaydi.
 * ⚠️ `LibraryPhoto` (`FaceDatabasePage`) ATAYLAB import qilinmadi: u
 * `FaceHistoryModal` → `EventDossier` → `DetectionsPage` → shu fayl
 * zanjiri bilan AYLANMA import hosil qilardi.
 */
function PersonAvatar({ id, name }: { id: number; name: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [id]);
  if (failed) {
    const initials = name
      .split(" ")
      .filter(Boolean)
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
    return (
      <span className="nvr-card-avatar is-fallback" aria-hidden>
        {initials || "?"}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className="nvr-card-avatar"
      src={nvrPersonPhotoUrl(id, "thumb")}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

/**
 * Bitta aniqlanish kartochkasi — HAQIQIY kuzatuv posti kadri bilan.
 *
 * Rasm `<img>` orqali alohida so'rov bo'lib keladi (JSON ichida base64 EMAS):
 * ro'yxat yengil bo'ladi va brauzer rasmni 1 kun keshlaydi.
 * `boxes` — nishon ramkasi, koordinatalar 0..1 → foizga aylantiriladi.
 */
export function DetectionCard({ ev, onOpen, seen = false }: Props) {
  /* Rang XAVFLILIK darajasidan (`lib/detectionLevel.ts`), kategoriyadan emas:
     operator uchun "qanchalik jiddiy" muhimroq. Kartochka BOSILGANDAN keyin
     rang butunlay ketadi (`is-seen`) — qaysi biriga hali qaramaganini bir
     qarashda ko'rish uchun. */
  const color = LEVEL_TONE[detectionLevel(ev)];
  /* 2-versiya (qurol/janjal lokal serverlari) kameralari muassasa
     jadvalida YO'Q — `resolveCampus` ularni noto'g'ri 179-maktabga
     bog'lardi. Ularda faqat kameraning o'z joyi ko'rsatiladi. */
  const campus = isLocalModelEvent(ev) ? null : resolveCampus(ev.camera, ev.channel);
  const face = ev.category === "face";
  const unknown = face && ev.recognized === false;

  /* Qurilma HALQA BUFER'da rasmni ustidan yozib yuborgan bo'lishi mumkin
     (`FRONTEND.md` 5-D — o'lchandi: 1585 tadan 646 tasi, 41%). Bunday
     paytda `image_url` hali BOR ko'rinishi mumkin, lekin qurilma so'rovga
     `200` bilan javob berib, ichiga JPEG o'rniga tasodifiy bayt solib
     yuboradi — brauzer buni oddiy `<img>` bilan QOP-QORA to'rtburchak
     qilib ko'rsatardi, `onError` esa ISHGA TUSHMASDI (fayl "muvaffaqiyatli
     yuklandi", faqat mazmuni buzuq). `picture_lost:true` shu holatni
     OLDINDAN bildiradi — server o'zi tekshirib qo'ygan. Ikkinchi himoya
     qatlami — `onError`: server hali `picture_lost` qo'ymagan, lekin fayl
     haqiqatan HAM ochilmaydigan (masalan `Content-Type` mos kelmaydigan)
     holatlar uchun. */
  const [broken, setBroken] = useState(false);
  /** Rasm yuklanguncha media qutisida skelet to'lqini — kelgach o'chadi (animatsiya to'xtaydi). */
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  useEffect(() => setBroken(false), [ev.id]);
  const img = ev.picture_lost || broken ? null : nvrImageUrl(ev, 0);
  /* 🔴 XIRA FON (blur-up) OLIB TASHLANDI (2026-10-26). U `position: absolute`
     bo'lgani uchun oddiy oqimdagi to'liq rasmning USTIDA chizilib, kartochkalar
     DOIM xira ko'rinardi (foydalanuvchi: "rasmlar nega xira"). Endi faqat to'liq
     rasm (lazy) — har kartochkada bitta so'rov kam, yuklanguncha qorong'i fon. */

  /* ── KARTOCHKA ANATOMIYASI (2026-10-23 UX tahlili, 2026-10-24 ikkinchi tahlil) ──
     · JOY — odam o'qiydigan yorliq (`cameraPlaceLabel`: "Kirish posti" /
       "2-qavat · yo'lak" / "31-kanal"), xom "Camera 01" EMAS — kuzatuv
       posti o'ttizdan ortiq kanalni shu nom bilan ataydi. 2-versiya
       kameralari jadvalda yo'q — ularda kameraning o'z nomi qoladi.
     · VAQT va ISHONCH FOIZI — RASM OSTIDAGI blokda (2026-10-24). Ilgari
       rasmning to'rt burchagida to'rt yorliq turardi: "2 kadr" kameraning
       o'z oq-qora sanasi ustiga, "90%" esa "Camera 01" yozuvi ustiga tushib
       o'qib bo'lmas edi. Rasm ustida endi FAQAT "N kadr" (ko'p kadrli
       o'tishda) va hodisa turi (yuzdan boshqasida).
     · "TANILDI"/"NOTANISH" NISHONI OLIB TASHLANDI — sarlavhada ISM yoki
       "Notanish shaxs" allaqachon shuni aytadi, "Yuz tanish" tabida esa
       Tanilganlar/Notanishlar filtri bor; har rasmda ko'k "TANILDI"
       takrorlanishi vizual shovqin edi. Yuz hodisasini xavf nishoni
       bilan ADASHTIRMASLIK uchun qolgan kategoriyalarda nishon turibdi.
     · ROL — ism ostida "O'quvchi · 6-A" / "O'qituvchi" (`ev.person` —
       ro'yxat javobida 2026-09-11 dan bor, qo'shimcha so'rov YO'Q);
       bazadagi 36 px surat ism chapida — taqqoslash uchun.
     · SARLAVHA — yuz hodisasida ODAM (ism / notanish), qolganida JOY.
     · HOVER — rasm markazida "Videoni ko'rish" (video bo'lsa) yoki
       "Dossiyeni ochish": bosilganda nima bo'lishi oldindan ko'rinsin. */
  const t = tr();
  const local = isLocalModelEvent(ev);
  const place = local ? ev.camera : cameraPlaceLabel(ev.channel, ev.camera);
  const location = [place, campus?.name].filter(Boolean).join(" · ");
  const when = new Date(ev.time);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const dayTag = Number.isNaN(when.getTime()) ? "" : sameDay(when, new Date()) ? t.nvr.rangeToday : dayMonthLabel(when, t);
  const hasVideo = Boolean(ev.video_url) || ev.video_ready === true;
  const person = face && !unknown ? eventPerson(ev) : null;
  const roleLine = person ? [person.roleLabel, person.klass].filter(Boolean).join(" · ") : "";
  /* Faqat bitta (butun) kadr bo'lsa — yuz joyiga yaqinlashtiramiz (yuqoridagi izoh) */
  const zoomBox = face && ev.image_count <= 1 ? (ev.boxes ?? [])[0] : undefined;
  const zoom = zoomBox && zoomBox.w > 0 && zoomBox.h > 0 ? zoomToBox(zoomBox) : undefined;
  /* Bir odamning 10 daqiqa ichidagi bir necha o'tishi BITTA kartochkada
     (`useNvrEvents` `samePass`) — vaqt OXIRGI o'tishniki */
  const passes = ev.passes ?? 1;
  /* Nishon — FAQAT yuzdan boshqa kategoriyada, mazmuni haqiqiy maydonlardan */
  const badge = face ? null : ev.alert ? (
    <>
      <ShieldAlert size={11} weight="bold" /> {ev.label}
    </>
  ) : (
    <>
      <ScanFace size={11} weight="bold" /> {ev.label}
    </>
  );
  const title = face ? (unknown ? t.detect.unknownPerson : ev.name || t.nvr.recognizedShort) : location;
  /* Joy qatori: yuzda — joy; boshqasida — kameraning xom nomi + kanal
     (texnik tafsilot, yorliq joyni allaqachon aytgan) */
  const sub = face ? location : local ? ev.channel : `${ev.camera} · ${t.nvr.channelOf(ev.channel)}`;

  return (
    <button
      type="button"
      onClick={() => onOpen(ev)}
      style={{ ["--c" as string]: color }}
      className={`nvr-card${ev.alert && !seen ? " nvr-card--alert" : ""}${seen ? " is-seen" : ""}`}
    >
      <div className={`nvr-card-media${img && loadedSrc !== img ? " skeleton-shimmer" : ""}`}>
        {img ? (
          <>
            <img src={img} alt={ev.label} loading="lazy" decoding="async" style={zoom} onLoad={() => setLoadedSrc(img)} onError={() => setBroken(true)} />
            {/* Ramka FAQAT butun kadr ustiga chiziladi (`FRONTEND.md` 5-bo'lim).
                Kartochkada `index=0` ko'rsatiladi: yuz hodisasida u KESILGAN
                yuz, ya'ni koordinatalar unga to'g'ri kelmaydi. Bitta rasm
                bo'lsa (`gun`/`janjal`/`smoking`) o'sha rasm butun kadr.
                Yuzda yaqinlashtirilgan (`zoom`) kadrda ramka CHIZILMAYDI —
                u butun yuzni egallab, ko'rinishni berkitardi. */}
            {ev.image_count <= 1 &&
              !zoom &&
              (ev.boxes ?? []).map((b, i) => (
                <span
                  key={i}
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
          </>
        ) : (
          /* Rasmsiz hodisa ham bo'ladi (`image_url: null`) — kartochka
             baribir chiroyli ko'rinsin (`FRONTEND.md` 12-bo'lim).
             `picture_lost`/`broken` bo'lsa aniqroq sabab yoziladi — bu
             "bu turdagi hodisada rasm umuman yo'q" degani EMAS. */
          <div className="nvr-card-count">
            <ImageOff size={20} />
            <p>{ev.picture_lost || broken ? t.nvr.pictureLost : t.nvr.noImageForType}</p>
          </div>
        )}

        {/* Hodisa TURI — rangli nishon, o'ng yuqori burchak (yuzda YO'Q) */}
        {badge && <span className="nvr-card-badge">{badge}</span>}
        {/* Yig'ilgan o'tish: bitta yozuv ortida bir necha kadr turibdi
            (`group=true`, `FRONTEND.md` 4-A) — foydalanuvchi buni bilsin */}
        {(ev.frames ?? 1) > 1 && <span className="nvr-card-frames">{t.nvr.visitFrames(ev.frames ?? 1)}</span>}
        {/* Hover — nima ochilishini aytadi */}
        <span className="nvr-card-play">
          {hasVideo ? <Play size={18} weight="fill" /> : <MagnifyingGlassPlus size={18} weight="bold" />}
          <span>{hasVideo ? t.nvr.openVideo : t.nvr.openDossier}</span>
        </span>
      </div>

      <div className="nvr-card-body">
        <div className="nvr-card-head">
          {face &&
            (person ? (
              <PersonAvatar id={person.id} name={person.name || title} />
            ) : (
              <span className="nvr-card-avatar is-unknown" aria-hidden>
                <UserX size={15} weight="bold" />
              </span>
            ))}
          <div className="min-w-0 flex-1">
            <p className="nvr-card-title">{title}</p>
            {roleLine && <p className="nvr-card-role">{roleLine}</p>}
          </div>
          {ev.confidence != null && (
            <span className="nvr-card-conf" title={t.nvr.confidenceTitle}>
              {Math.round(ev.confidence)}%
            </span>
          )}
        </div>
        <p className="nvr-card-sub">{sub}</p>
        <p className="nvr-card-meta">
          <span className="nvr-card-time">
            {passes > 1 && <b>{t.nvr.lastPass} </b>}
            {dayTag && <b>{dayTag} · </b>}
            {nvrTime(ev.time)}
          </span>
          {passes > 1 && (
            <span className="nvr-card-passes" title={t.nvr.firstPassAt(ev.passes_from ? nvrTime(ev.passes_from) : "—")}>
              {t.nvr.morePasses(passes - 1)}
            </span>
          )}
        </p>
      </div>
    </button>
  );
}
