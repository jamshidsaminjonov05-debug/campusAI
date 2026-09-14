import { AnimatePresence, motion } from "framer-motion";
import { DETECTION_TYPES, type DetectionId } from "@/lib/detectionTypes";

/* ── Yoy geometriyasi ────────────────────────────────────────────────────────
   SVG `preserveAspectRatio="none"` bilan enига cho'ziladi, LEKIN viewBox
   balandligi (150) element balandligiga (150px) TENG — shuning uchun vertikal
   o'lchov 1:1 qoladi. Natijada tugmalarni yoy ustiga PIKSELMA-PIKSEL qo'yish
   mumkin: x → foiz (cho'zilish bilan birga), y → piksel (o'zgarmaydi).
   Shu sabab ekran eni qanday bo'lmasin, ikonkalar yoydan "uchib ketmaydi". */
const VB_W = 1000;
const SVG_H = 150;
/** Konteyner ichida SVG tepasi (pastda yorliqlar uchun joy qoladi). */
const SVG_TOP = 26;
const BASE_Y = 104; // yassi qanotlar chizig'i
const APEX_Y = 26; // ko'tarilgan platforma balandligi
/* Reference'dagi shakl — gumbaz emas, YASSI USTLI ko'tarma ("mesa"):
   qanot → yelka (kubik) → yassi platforma → yelka → qanot.
   Shu sabab markazdagi uch ikonka bir tekisda, chetdagilari pastroq turadi. */
const WING_L = 180;
const PLATEAU_L = 430;
const PLATEAU_R = 570;
const WING_R = 820;

const LEFT = { x: [WING_L, 300, 320, PLATEAU_L], y: [BASE_Y, BASE_Y, APEX_Y, APEX_Y] };
const RIGHT = { x: [PLATEAU_R, 680, 700, WING_R], y: [APEX_Y, APEX_Y, BASE_Y, BASE_Y] };

const ARC_D =
  `M0,${BASE_Y} H${WING_L} ` +
  `C${LEFT.x[1]},${LEFT.y[1]} ${LEFT.x[2]},${LEFT.y[2]} ${PLATEAU_L},${APEX_Y} ` +
  `H${PLATEAU_R} ` +
  `C${RIGHT.x[1]},${RIGHT.y[1]} ${RIGHT.x[2]},${RIGHT.y[2]} ${WING_R},${BASE_Y} ` +
  `H${VB_W}`;
const ARC_FILL_D = `${ARC_D} V${SVG_H} H0 Z`;

const cubic = (p: number[], t: number) => {
  const u = 1 - t;
  return u * u * u * p[0] + 3 * u * u * t * p[1] + 3 * u * t * t * p[2] + t * t * t * p[3];
};

/** Berilgan x uchun yoy balandligi (viewBox birligida). */
function curveY(x: number): number {
  if (x <= WING_L || x >= WING_R) return BASE_Y;
  if (x >= PLATEAU_L && x <= PLATEAU_R) return APEX_Y;
  const seg = x < PLATEAU_L ? LEFT : RIGHT;
  // x(t) monoton o'sadi — binar qidiruv bilan t topamiz
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 22; i++) {
    const m = (lo + hi) / 2;
    if (cubic(seg.x, m) < x) lo = m;
    else hi = m;
  }
  return cubic(seg.y, (lo + hi) / 2);
}

/** Tugmalar platforma + yelkalar bo'ylab teng taqsimlanadi. */
const SPAN = 340;
const POSITIONS = DETECTION_TYPES.map((_, i, arr) =>
  arr.length === 1 ? 500 : 500 - SPAN / 2 + (SPAN * i) / (arr.length - 1)
);
/** Markaziy uya — tanlangan detektor shu yerga suzib keladi. */
const CENTER_SLOT = Math.floor(DETECTION_TYPES.length / 2);

/**
 * Tanlangan detektor markazga chiqadigan tartib.
 *
 * Aylanma (cyclic) siljish EMAS: tanlangan element ro'yxatdan olinib markazga
 * qo'yiladi, qolganlari tartibini saqlab bir uya siljiydi. Shunda faqat
 * bosilgan ikonka markazga "sayohat" qiladi — chetdagi element butun panelni
 * kesib o'tmaydi, harakat tinch va tushunarli bo'ladi.
 */
function orderFor(activeId: DetectionId | null) {
  if (!activeId) return DETECTION_TYPES;
  const sel = DETECTION_TYPES.find((d) => d.id === activeId);
  if (!sel) return DETECTION_TYPES;
  const rest = DETECTION_TYPES.filter((d) => d.id !== activeId);
  return [...rest.slice(0, CENTER_SLOT), sel, ...rest.slice(CENTER_SLOT)];
}

interface HudFooterProps {
  /** Tanlangan detektor (`null` — hammasi). */
  activeId: DetectionId | null;
  onSelect: (id: DetectionId | null) => void;
  counts: Record<DetectionId, number>;
  /** Faol trevoga bor — asosiy tugma qizil halqa bilan pulsatsiya qiladi. */
  alertActive?: boolean;
}

/**
 * Ramka ostidagi yoysimon footer — AI detektorlari menyusi.
 *
 * Qatlamlar (pastdan yuqoriga): gumbaz ostidagi nafas oluvchi porlash →
 * to'ldirish gradienti → ichki ikkinchi chiziq → qirra yorug'i → yugurib
 * o'tuvchi yorug' (sweep) → chetdagi qiya belgilar va uchuvchi nuqtalar →
 * tugmalar → markaziy kapsula.
 */
export function HudFooter({ activeId, onSelect, counts, alertActive = false }: HudFooterProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 46 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
      className="hud-footer no-print"
    >
      <svg className="hud-footer-arc" viewBox={`0 0 ${VB_W} ${SVG_H}`} preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id="hfBody" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1E4C93" stopOpacity="0.95" />
            <stop offset="38%" stopColor="#0D2450" stopOpacity="0.96" />
            <stop offset="100%" stopColor="#040912" stopOpacity="0.99" />
          </linearGradient>
          {/* Qirra — markazda oq-ko'k, chetга borib so'nadi */}
          <linearGradient id="hfEdge" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#85E0FF" stopOpacity="0" />
            <stop offset="14%" stopColor="#5AA8F0" stopOpacity="0.45" />
            <stop offset="34%" stopColor="#9FD4FF" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#F2F8FF" stopOpacity="1" />
            <stop offset="66%" stopColor="#9FD4FF" stopOpacity="0.85" />
            <stop offset="86%" stopColor="#5AA8F0" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#85E0FF" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="hfInner" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#4E8FD6" stopOpacity="0" />
            <stop offset="50%" stopColor="#7FC0FF" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#4E8FD6" stopOpacity="0" />
          </linearGradient>
          {/* Qirra bo'ylab yugurib o'tuvchi yorug' */}
          <linearGradient id="hfSweep" x1="-0.3" y1="0" x2="-0.1" y2="0">
            <stop offset="0%" stopColor="#DCEEFF" stopOpacity="0" />
            <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#DCEEFF" stopOpacity="0" />
            <animate attributeName="x1" values="-0.3;1.0" dur="7s" repeatCount="indefinite" />
            <animate attributeName="x2" values="-0.1;1.2" dur="7s" repeatCount="indefinite" />
          </linearGradient>
          <radialGradient id="hfGlow" cx="0.5" cy="1" r="0.62">
            <stop offset="0%" stopColor="#4C9BFF" stopOpacity="0.55" />
            <stop offset="55%" stopColor="#2563EB" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
          </radialGradient>
          <filter id="hfBloom" x="-20%" y="-120%" width="140%" height="340%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>

        {/* 1. Gumbaz ostidagi porlash — sekin "nafas oladi" */}
        <ellipse className="hud-arc-glow" cx="500" cy={SVG_H} rx="330" ry="86" fill="url(#hfGlow)" />

        {/* 2. Asosiy jism */}
        <path d={ARC_FILL_D} fill="url(#hfBody)" />

        {/* 3. Ichki ikkinchi chiziq — chuqurlik hissi */}
        <g transform="translate(0,8)" opacity="0.55">
          <path d={ARC_D} fill="none" stroke="url(#hfInner)" strokeWidth="1" />
        </g>

        {/* 4. Qirra: avval yumshoq bloom, ustidan aniq chiziq */}
        <path d={ARC_D} fill="none" stroke="url(#hfEdge)" strokeWidth="6" opacity="0.5" filter="url(#hfBloom)" />
        <path d={ARC_D} fill="none" stroke="url(#hfEdge)" strokeWidth="1.6" />

        {/* 5. Yugurib o'tuvchi yorug' (harakat kamaytirilsa — yashiriladi) */}
        <path className="hud-arc-sweep" d={ARC_D} fill="none" stroke="url(#hfSweep)" strokeWidth="2.2" />

        {/* 6. Qanotlardagi mayda o'lchov belgilari */}
        <path
          d={`M0,${BASE_Y + 6} H${WING_L - 20} M${WING_R + 20},${BASE_Y + 6} H${VB_W}`}
          stroke="#5AA8F0"
          strokeWidth="1"
          strokeDasharray="2 12"
          opacity="0.35"
        />
      </svg>

      {/* Chetdagi qiya belgilar — reference'dagi "////" guruhlari */}
      {(["l", "r"] as const).map((side) => (
        <span key={side} className={`hud-footer-marks hud-footer-marks--${side}`}>
          {[0, 1, 2, 3].map((i) => (
            <i key={i} style={{ animationDelay: `${(side === "l" ? i : 3 - i) * 0.14}s` }} />
          ))}
        </span>
      ))}

      {/* Qanotlar bo'ylab uchuvchi ma'lumot nuqtalari */}
      <span className="hud-footer-flow hud-footer-flow--l" />
      <span className="hud-footer-flow hud-footer-flow--r" />

      {/* Tugmalar — yoy ustida aniq joylashadi, tanlangani markazga suzadi */}
      {orderFor(activeId).map((d, slot) => {
        const x = POSITIONS[slot];
        const left = `${(x / VB_W) * 100}%`;
        const top = `${SVG_TOP + curveY(x)}px`;
        const Icon = d.icon;
        const active = activeId === d.id;
        const center = slot === CENTER_SLOT;
        const count = counts[d.id] ?? 0;
        // Trevoga halqasi doim BEGONA ODAM tugmasida — u qayerda tursa ham
        const hasAlert = !!d.primary && alertActive;
        return (
          <motion.button
            key={d.id}
            type="button"
            onClick={() => onSelect(active ? null : d.id)}
            title={d.label}
            aria-pressed={active}
            // left/top `initial`da ham bor — mount'da joyidan "uchib" kelmasin
            initial={{ opacity: 0, scale: 0.55, left, top }}
            animate={{ opacity: 1, scale: 1, left, top }}
            transition={{
              // Uyani almashtirish — silliq va bir oz "og'ir" spring
              left: { type: "spring", stiffness: 210, damping: 26 },
              top: { type: "spring", stiffness: 210, damping: 26 },
              // Kirish animatsiyasi navbatma-navbat (faqat mount'da ko'rinadi)
              opacity: { delay: 0.24 + slot * 0.07, duration: 0.4 },
              scale: { delay: 0.24 + slot * 0.07, type: "spring", stiffness: 420, damping: 22 },
            }}
            style={{
              // Markazlash CSS'da EMAS, framer transform'ida — aks holda
              // `scale` animatsiyasi translate'ni bosib ketadi va tugma
              // yoydan siljib qoladi.
              x: "-50%",
              y: "-50%",
              ["--c" as string]: d.color,
            }}
            className={`hud-foot-btn${active ? " is-active" : ""}${center ? " is-center" : ""}${
              hasAlert ? " has-alert" : ""
            }`}
          >
            <span className="hud-foot-icon">
              <Icon size={center ? 23 : 18} strokeWidth={1.9} />
            </span>
            <AnimatePresence>
              {count > 0 && (
                <motion.em
                  key={count}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 600, damping: 20 }}
                  className="hud-foot-count"
                >
                  {count}
                </motion.em>
              )}
            </AnimatePresence>
            <span className="hud-foot-label">{d.short}</span>
          </motion.button>
        );
      })}

      {/* Markaziy kapsula — tanlangan detektor nomi */}
      <div className="hud-footer-chip">
        <AnimatePresence mode="wait">
          <motion.span
            key={activeId ?? "all"}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}
          >
            {activeId ? DETECTION_TYPES.find((d) => d.id === activeId)?.label : "Barcha detektorlar"}
          </motion.span>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
