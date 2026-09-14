import type { ReactNode } from "react";

interface HudFrameProps {
  /** Yuqori markazdagi sarlavha kapsulasi. */
  title: string;
  /** Sarlavha ostidagi kichik izoh (ingliz/lotin). */
  subtitle?: string;
  /** O'ng yuqori burchakdagi yorliq (ikki qatorli: izoh + qiymat). */
  badge?: ReactNode;
  children: ReactNode;
}

/**
 * Burchak bezagi — bitta SVG chiziladi, qolgan uch burchak CSS `scale(-1)`
 * bilan ko'zgulanadi (`.hud-corner--tr/bl/br`).
 *
 * Geometriya ramka chizig'iga BOG'LANGAN: SVG konteynerdan -12px chetlatiladi,
 * shuning uchun ramka radiusi (34px) va bu yerdagi `A34,34` yoyi aynan bir
 * chiziqda yotadi. Ramka radiusini o'zgartirsangiz — bu yoyni ham.
 */
function FrameCorner({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 160 160" aria-hidden>
      <g fill="none" strokeLinecap="round">
        {/* Tashqi yordamchi yoy — ramkadan 10px tashqarida */}
        <path d="M74,2 H46 A44,44 0 0 0 2,46 V74" stroke="#5AA8F0" strokeWidth="1" opacity="0.45" />
        {/* Asosiy qavs — ramka chizig'i ustida, yorqin */}
        <path d="M96,12 H46 A34,34 0 0 0 12,46 V96" stroke="#BFE4FF" strokeWidth="2" />
        {/* Ichki qisqa yoy */}
        <path d="M62,24 H46 A22,22 0 0 0 24,46 V62" stroke="#7FC0FF" strokeWidth="1" opacity="0.6" />
        {/* Diagonal shtrixlar — qavs ichida, tashqariga qarab siyraklashadi */}
        <path
          d="M33.5,26.5 L26.5,33.5 M30.5,23.5 L23.5,30.5 M27.5,20.5 L20.5,27.5"
          stroke="#9FD4FF"
          strokeWidth="1.4"
          opacity="0.5"
        />
        {/* Burchak nuqtasi */}
        <rect x="7" y="7" width="5" height="5" transform="rotate(45 9.5 9.5)" fill="#BFE4FF" opacity="0.85" />
      </g>
    </svg>
  );
}

/**
 * "Katta ekran" HUD ramkasi — burchak qavslari, ikki qatlamli
 * chekka chiziqlari va yuqori sarlavha kapsulasi.
 *
 * Ichida nima bo'lishidan qat'i nazar ishlaydi (hozir — xarita), shuning uchun
 * bezak qatlami butunlay `pointer-events:none`.
 */
export function HudFrame({ title, subtitle, badge, children }: HudFrameProps) {
  return (
    <div className="hud-frame">
      {/* Ekran — kontent shu yerda qirqiladi */}
      <div className="hud-screen">
        {children}
        <span className="hud-vignette" />
      </div>

      {/* Bezak qatlami */}
      <div className="hud-deco">
        {/* Chekka chiziqlari — burchaklardan yorqin, o'rtada so'nadi */}
        <span className="hud-edge hud-edge--t" />
        <span className="hud-edge hud-edge--b" />
        <span className="hud-edge hud-edge--l" />
        <span className="hud-edge hud-edge--r" />

        {/* Ichki ikkinchi ramka */}
        <span className="hud-inner-line" />

        <FrameCorner className="hud-corner hud-corner--tl" />
        <FrameCorner className="hud-corner hud-corner--tr" />
        <FrameCorner className="hud-corner hud-corner--bl" />
        <FrameCorner className="hud-corner hud-corner--br" />

        <div className="hud-cap">
          <b>{title}</b>
          {subtitle && <i>{subtitle}</i>}
        </div>
      </div>

      {badge && <div className="hud-badge">{badge}</div>}
    </div>
  );
}
