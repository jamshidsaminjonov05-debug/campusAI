/**
 * ╔══════════════════════════════════════════════════════════════════════╗
 * ║  KAMERA OQIMI — JOYIDA OCHILADIGAN OYNA                              ║
 * ╚══════════════════════════════════════════════════════════════════════╝
 *
 * Xaritadagi (yoki 3D kampusdagi) kamera markeri bosilganda oqim SHU
 * SAHIFANING O'ZIDA modal bo'lib ochiladi, oyna yopilganda esa
 * foydalanuvchi o'sha sahifada qoladi.
 *
 * ⚠️ **Ilgari BO'LIM ALMASHARDI** (2026-09-05 da tuzatildi): marker
 * bosilsa `setVoiceCameraCommand({...}) + setActivePage("Kameralar")`
 * chaqirilardi — panel Kameralar bo'limiga sakrab, o'sha yerda oqim
 * ochilardi. Oyna yopilgach foydalanuvchi Kameralar sahifasida qolib
 * ketardi va Geo Analitika/Boshqaruv paneliga qo'lda qaytishi kerak
 * bo'lardi; xaritadagi tanlov (viloyat, kampus, kadr) esa yo'qolardi.
 *
 * Ovozli buyruq yo'li (`voiceCameraCommand`) O'ZGARMADI — u ataylab
 * Kameralar bo'limini ochadi, chunki buyruq "kameralarni ko'rsat"
 * degani.
 *
 * ── Ishlatish ─────────────────────────────────────────────────────────
 * ```tsx
 * const [camChannel, setCamChannel] = useState<string | null>(null);
 * …
 * onClick: () => setCamChannel(ch)
 * …
 * <CameraQuickView channel={camChannel} onClose={() => setCamChannel(null)} />
 * ```
 *
 * ⚠️ Oqim FAQAT shu oyna ochiq turganda ulanadi va yopilishi bilan
 * uziladi (`CameraStreamModal` — MJPEG ulanishini `src` ni bo'shatib
 * to'xtatadi). Har MJPEG ochiq HTTP ulanish, shuning uchun bir vaqtda
 * bittadan ortig'i ochilmaydi.
 */
"use client";

import { AnimatePresence } from "framer-motion";
import { useNvrChannels } from "@/hooks/useNvrChannels";
import { nvrChannelSnapshotUrl, nvrChannelStreamUrl } from "@/lib/nvrApi";
import { CameraStreamModal } from "./CameraStreamModal";

export function CameraQuickView({
  channel,
  onClose,
}: {
  /** kuzatuv posti kanal raqami (`NvrEvent.channel` / `CameraOut.channel`). `null` — oyna yopiq. */
  channel: string | number | null;
  onClose: () => void;
}) {
  const nvr = useNvrChannels();
  const key = channel == null ? null : String(channel);
  const cam = key == null ? null : nvr.cameras.find((c) => String(c.channel) === key) ?? null;

  return (
    <AnimatePresence>
      {cam && (
        <CameraStreamModal
          key={cam.id}
          cam={cam}
          /* 4 fps — panjaradagi stop-kadrdan farqli, bu JONLI oqim.
             `CamerasPage` bilan AYNI qiymat. */
          streamUrl={nvrChannelStreamUrl(cam.channel, 4)}
          posterUrl={nvrChannelSnapshotUrl(cam.channel)}
          onClose={onClose}
        />
      )}
    </AnimatePresence>
  );
}
