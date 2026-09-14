import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, ScanFace, ShieldAlert, X } from "lucide-react";
import { SEVERITY_COLOR } from "@/lib/alertTypes";
import type { DetectionEvent } from "@/lib/detectionEvents";
import { DETECTION_BY_ID, type DetectionId } from "@/lib/detectionTypes";
import { useMemo } from "react";
import { useNvrChannels } from "@/hooks/useNvrChannels";
import { eventChannel } from "@/lib/eventCamera";

interface DetectionPanelProps {
  /** Footer'da tanlangan detektor (`null` — begona shaxs ogohlantirish rejimi). */
  activeId: DetectionId | null;
  /** Joriy sessiyadagi begona shaxs ogohlantirishlari. */
  alerts: DetectionEvent[];
  /** Tanlangan detektor hodisalari — uzunligi rozetka raqamiga TENG. */
  list: DetectionEvent[];
  knownCount: number;
  live: boolean;
  /** Yozuvga bosilganda — eski Hodisalar bo'limida to'liq ma'lumot ochiladi. */
  onOpen: (e: DetectionEvent) => void;
  onDismiss: (id: string) => void;
  onClearAll: () => void;
}

/**
 * O'ng paneldagi hodisalar ro'yxati — ikki rejim:
 *
 *  - **Ogohlantirish** (detektor tanlanmagan): faqat joriy sessiyada aniqlangan
 *    begona shaxslar. Takroriy tashrif — doimiy, birinchi marta ko'ringan
 *    ~20 soniyada so'nadi.
 *  - **Ro'yxat** (footer'dan detektor tanlangan): o'sha turdagi BARCHA hodisalar.
 *    Uzunligi footer rozetkasidagi raqam bilan bir xil — ikkalasi ham
 *    `useDetectionFeed` dagi bitta oqimdan hisoblanadi.
 *
 * Har qanday yozuvga bosilsa — eski Hodisalar bo'limi to'liq ma'lumot bilan ochiladi.
 */
export function DetectionPanel({
  activeId,
  alerts,
  list,
  knownCount,
  live,
  onOpen,
  onDismiss,
  onClearAll,
}: DetectionPanelProps) {
  /* Hodisa → kanal: xarita markeri bilan AYNI hisob. Kanallar ro'yxati
     bo'sh bo'lsa (kuzatuv posti javob bermasa) raqam ko'rsatilmaydi. */
  const nvr = useNvrChannels();
  const channels = useMemo(() => nvr.channels.map((c) => String(c.id)), [nvr.channels]);
  const channelOf = (e: { id: string }) => eventChannel(e, channels);

  const det = activeId ? DETECTION_BY_ID.get(activeId) : null;
  const alertMode = !det;
  const items = alertMode ? alerts : list;
  const repeats = alertMode ? alerts.filter((a) => a.repeat).length : 0;

  return (
    <div className="hud-alerts no-print">
      <header className="hud-alerts-head">
        <ShieldAlert size={15} className={repeats > 0 ? "text-rose-400" : "text-ice-cyan"} />
        <b>{det ? det.label.toUpperCase() : "BEGONA SHAXS"}</b>
        <span className="hud-alerts-count">{items.length}</span>
        {!live && <span className="hud-alerts-demo">DEMO</span>}
        {alertMode && items.length > 0 && (
          <button type="button" onClick={onClearAll} className="hud-alerts-clear">
            Tozalash
          </button>
        )}
      </header>

      <div className="hud-alerts-list">
        <AnimatePresence initial={false}>
          {items.map((e) => (
            <motion.article
              key={e.id}
              layout
              initial={{ opacity: 0, x: 28, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 28, scale: 0.96 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              onClick={() => onOpen(e)}
              className={`hud-alert${e.repeat ? " hud-alert--repeat" : ""}`}
            >
              {alertMode ? (
                <div className="hud-alert-face">
                  <ScanFace size={20} />
                </div>
              ) : (
                <span className="hud-alert-sev" style={{ background: SEVERITY_COLOR[e.severity] }} />
              )}

              <div className="min-w-0 flex-1">
                <p className="hud-alert-title">
                  {alertMode && e.personKey ? `Begona shaxs #${e.personKey}` : e.title}
                </p>
                <p className="hud-alert-sub">
                  {e.campus} · {e.mahalla}
                </p>
                <p className="hud-alert-meta">
                  {/* Kanal raqami xaritadagi marker bilan AYNI
                      (`lib/eventCamera.ts`) — operator hodisani qaysi
                      kamerada ko'rishini biladi. kuzatuv postida 30 ta kanal bir xil
                      "Camera 01" deb ataladi, nomning o'zi yetmaydi. */}
                  <span className="truncate">
                    {channelOf(e) && <b className="text-ice-soft">#{channelOf(e)} · </b>}
                    {e.camera}
                  </span>
                  <span className="flex-none">{e.time}</span>
                </p>
                {e.repeat && <p className="hud-alert-flag">TAKRORIY TASHRIF — DOIMIY OGOHLANTIRISH</p>}
              </div>

              {alertMode ? (
                <button
                  type="button"
                  title="Yopish"
                  onClick={(ev) => {
                    ev.stopPropagation();
                    onDismiss(e.id);
                  }}
                  className="hud-alert-x"
                >
                  <X size={13} />
                </button>
              ) : (
                <ChevronRight size={14} className="hud-alert-go" />
              )}
            </motion.article>
          ))}
        </AnimatePresence>

        {items.length === 0 && (
          <p className="hud-alerts-idle">
            {det
              ? `${det.label} bo'yicha hodisa yo'q`
              : "Kuzatuv faol — joriy oynada begona shaxs aniqlanmadi"}
          </p>
        )}
      </div>

      <footer className="hud-alerts-foot">
        {alertMode ? (
          <>
            Bazadagi tanilgan begonalar: <b>{knownCount}</b>
          </>
        ) : (
          <>To'liq ma'lumot uchun hodisaga bosing</>
        )}
      </footer>
    </div>
  );
}
