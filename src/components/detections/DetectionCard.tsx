import { useEffect, useState } from "react";
import { ImageBroken as ImageOff, ShieldWarning as ShieldAlert, UserCheck, UserFocus as ScanFace, UserMinus as UserX } from "@phosphor-icons/react";
import { nvrImageUrl, nvrTime, type NvrEvent } from "@/lib/nvrApi";
import { LEVEL_TONE, detectionLevel } from "@/lib/detectionLevel";
import { resolveCampus } from "@/lib/cameraBinding";
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
  const campus = resolveCampus(ev.camera, ev.channel);
  const unknown = ev.category === "face" && ev.recognized === false;

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
  useEffect(() => setBroken(false), [ev.id]);
  const img = ev.picture_lost || broken ? null : nvrImageUrl(ev, 0);

  return (
    <button
      type="button"
      onClick={() => onOpen(ev)}
      style={{ ["--c" as string]: color }}
      className={`nvr-card${ev.alert && !seen ? " nvr-card--alert" : ""}${seen ? " is-seen" : ""}`}
    >
      <div className="nvr-card-media">
        {img ? (
          <>
            <img src={img} alt={ev.label} loading="lazy" onError={() => setBroken(true)} />
            {/* Ramka FAQAT butun kadr ustiga chiziladi (`FRONTEND.md` 5-bo'lim).
                Kartochkada `index=0` ko'rsatiladi: yuz hodisasida u KESILGAN
                yuz, ya'ni koordinatalar unga to'g'ri kelmaydi. Bitta rasm
                bo'lsa (`gun`/`janjal`/`smoking`) o'sha rasm butun kadr. */}
            {ev.image_count <= 1 &&
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
            <p>{ev.picture_lost || broken ? tr().nvr.pictureLost : tr().nvr.noImageForType}</p>
          </div>
        )}

        <span className="nvr-card-time">{nvrTime(ev.time)}</span>
        {ev.confidence != null && <span className="nvr-card-conf">{ev.confidence}%</span>}
        {/* Yig'ilgan o'tish: bitta yozuv ortida bir necha kadr turibdi
            (`group=true`, `FRONTEND.md` 4-A) — foydalanuvchi buni bilsin */}
        {(ev.frames ?? 1) > 1 && <span className="nvr-card-frames">{tr().nvr.visitFrames(ev.frames ?? 1)}</span>}
      </div>

      <div className="nvr-card-body">
        <p className="nvr-card-title">
          {/* Ko'rilmagan hodisa — sarlavha oldida xavflilik nuqtasi.
              Ko'rilgach CSS uni yashiradi (`.is-seen .nvr-card-dot`). */}
          <i className="nvr-card-dot" />
          {ev.category === "face" ? (
            unknown ? (
              <>
                <UserX size={13} /> {tr().detect.unknownPerson}
              </>
            ) : (
              <>
                <UserCheck size={13} /> {ev.name || "Tanildi"}
              </>
            )
          ) : ev.alert ? (
            <>
              <ShieldAlert size={13} /> {ev.label}
            </>
          ) : (
            <>
              <ScanFace size={13} /> {ev.label}
            </>
          )}
        </p>
        <p className="nvr-card-sub">
          {ev.camera}
          {campus && <> · {campus.name}</>}
        </p>
      </div>
    </button>
  );
}
