import { useState } from "react";
import { motion } from "framer-motion";
import {
  Home,
  Camera,
  Users,
  Globe,
  AlertTriangle,
  BellRing,
  ScanFace,
  BarChart3,
  Building2,
  FileText,
  Settings,
  Sparkles,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useT } from "@/i18n";
import { Logo } from "@/components/common/Logo";
import { NAV_GIF_ICONS } from "@/config/navIcons";
import { GifIcon } from "@/components/common/GifIcon";
import { LottieIcon } from "@/components/common/LottieIcon";

/**
 * `id` — `activePage` qiymati (o'zgarmaydi), ko'rinadigan nom lug'atdan.
 *
 * `Icon` — `lucide-react` ZAXIRASI: sahifaning GIF ikonkasi bo'lsa
 * (`config/navIcons.ts`) o'sha ko'rsatiladi, bo'lmasa shu SVG qoladi.
 */
const NAV_ITEMS = [
  { id: "Boshqaruv paneli", Icon: Home },
  /* Ogohlantirishlar — IKKINCHI: operator ishni "menga nima kutyapti"
     degan savoldan boshlaydi. Bu yerda FAQAT tasdiqlanmagan yozuvlar
     turadi; butun tarix "Aniqlanganlar" da qoladi. */
  { id: "Ogohlantirishlar", Icon: BellRing },
  /* AI tahlil — YUQORIDA: operator kunni "nima aniqlandi va bu nimani
     anglatadi" degan javobdan boshlaydi, keyin tafsilotga tushadi. */
  { id: "AI tahlil", Icon: Sparkles },
  // Statistika kameralardan OLDIN: umumiy ko'rsatkichdan tafsilotga
  { id: "Statistika", Icon: BarChart3 },
  { id: "Aniqlanganlar", Icon: ScanFace },
  // O'quvchi + o'qituvchi + xodim BITTA bo'limda ("Shaxslar")
  { id: "Shaxslar", Icon: Users },
  /* Muassasalar — Shaxslardan KEYIN: avval odamlar, keyin ular
     tegishli bo'lgan tashkilotlar. Statistika sahifasidan ko'chirilgan
     "Hududlar"/"Muassasalar" kesimlari shu yerda. */
  { id: "Muassasalar", Icon: Building2 },
  { id: "Hodisalar", Icon: AlertTriangle },
  { id: "Geo Analitika", Icon: Globe },
  { id: "Kameralar", Icon: Camera },
  { id: "Hisobotlar", Icon: FileText },
  { id: "Sozlamalar", Icon: Settings },
] as const;

const EXPANDED_WIDTH = 264;
/* Tor holat — faqat ikonkalar (volt.ai uslubidagi ikonka paneli) */
const COLLAPSED_WIDTH = 72;

interface Props {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

/**
 * Doimiy chap panel — hech qachon to'liq yashirinmaydi, faqat torayadi (icon-rail).
 * Navigatsiya paytida ham ekranda qoladi, aktiv element har doim ajratib ko'rsatiladi.
 */
export function Sidebar({ collapsed, onToggleCollapsed }: Props) {
  const t = useT();
  const active = useAppStore((s) => s.activePage);
  const setActivePage = useAppStore((s) => s.setActivePage);
  /* GIF ikonkalar tinch turadi; faqat AKTIV va sichqoncha/fokus ostidagisi
     o'ynaydi (`GifIcon`) — aks holda 8 ta ikonka bir vaqtda qimirlaydi. */
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <motion.aside
      animate={{ width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="nexa-card relative my-3.5 ml-3.5 flex flex-none flex-col overflow-hidden"
    >
      {/* Brend — `public/logo/` dagi "CA" belgisi + nomi (2026-09-14).
          Yig'ilgan holatda faqat belgi qoladi: ilgari "AI" harflari
          turardi va u logo bilan bog'lanmasdi. */}
      <div className="flex-none px-5 pb-5 pt-7">
        {collapsed ? (
          <Logo className="mx-auto h-[18px] w-auto text-ice-bright" />
        ) : (
          <div className="flex items-center gap-2.5">
            <Logo className="h-[22px] w-auto flex-none text-ice-bright" />
            <div className="min-w-0">
              <p className="hik-brand whitespace-nowrap text-[16px]">
                Campus <b>AI</b>
              </p>
              <p className="mt-1 whitespace-nowrap text-[9px] uppercase tracking-[0.32em] text-slate-500">
                {t.sidebar.brandSub}
              </p>
            </div>
          </div>
        )}
      </div>
      <div className="mx-5 h-px flex-none bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden p-3">
        {NAV_ITEMS.map(({ id, Icon }) => {
          const label = t.pages[id].label;
          const isActive = active === id;
          const gif = NAV_GIF_ICONS[id];
          return (
            <button
              key={id}
              type="button"
              title={collapsed ? label : undefined}
              onClick={() => setActivePage(id)}
              onMouseEnter={() => setHovered(id)}
              onMouseLeave={() => setHovered((h) => (h === id ? null : h))}
              onFocus={() => setHovered(id)}
              onBlur={() => setHovered((h) => (h === id ? null : h))}
              className={`group relative flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-left text-[13px] font-medium transition-colors duration-300 ${
                isActive ? "nav-item-active font-semibold text-white" : "text-slate-400 hover:bg-white/[0.03] hover:text-slate-100"
              }`}
            >
              {/* 🔵 AKTIV — GRADIENT PILL (2026-09-10, foydalanuvchi so'rovi:
                  "sidebarni menularini ... o'z designimizga moslashtir").
                  Ilgari yupqa, deyarli shaffof `bg-ice/[0.09]` tint edi;
                  endi to'yingan ko'k→siyanit gradient — o'zimizning
                  `ice`/`cyan` palitramizda (havola skrinshotdagi ko'k→oltin
                  emas — bu ilovada oltin rang hech qayerda ishlatilmaydi). */}
              {isActive && (
                <motion.span
                  layoutId="sidebar-active"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  className="nav-active-pill absolute inset-0 rounded-2xl bg-gradient-to-r from-[#2563EB]/85 via-[#0EA5E9]/80 to-[#22D3EE]/75 shadow-[0_6px_20px_-6px_rgba(34,211,238,0.55),inset_0_1px_0_rgba(255,255,255,0.16)]"
                />
              )}
              <span
                className={`nav-icon relative flex-none transition-all duration-300 ${
                  gif
                    ? /* GIF o'z rangida — matn rangi ta'sir qilmaydi, shuning
                         uchun tinch holatda biroz so'niq turadi.
                         ⚠️ YORUG' rejimda so'niqlik OLIB TASHLANADI
                         (`.nav-icon` — `index.css`): oq fonda 60% shaffoflik
                         ikonkani ko'rinmas darajada xira qilardi. */
                      isActive
                      ? "opacity-100 drop-shadow-[0_0_8px_rgba(143,184,255,0.55)]"
                      : "opacity-60 group-hover:opacity-100"
                    : isActive
                      ? "text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]"
                      : "group-hover:text-ice group-hover:drop-shadow-[0_0_6px_rgba(143,184,255,0.4)]"
                }`}
              >
                {gif ? (
                  /* `.json` — Lottie (vektor), `.gif` — rastr animatsiya.
                     Ikkalasi bir xil ishlaydi: tinch holatda birinchi kadr,
                     aktiv/hover da o'ynaydi. */
                  gif.endsWith(".json") ? (
                    <LottieIcon src={gif} size={20} play={isActive || hovered === id} />
                  ) : (
                    <GifIcon src={gif} size={20} play={isActive || hovered === id} />
                  )
                ) : (
                  /* Zaxira SVG — 2026-09-11 dan ikonkalar KICHIKROQ
                     (GIF 25→20, SVG 21→18): volt.ai uslubidagi ixcham panel */
                  <Icon size={18} strokeWidth={1.8} />
                )}
              </span>
              {!collapsed && <span className="relative truncate">{label}</span>}
              {isActive && !collapsed && (
                <span className="nav-active-dot relative ml-auto h-1.5 w-1.5 flex-none rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)]" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="flex-none px-4 pb-4">
        <button
          type="button"
          onClick={onToggleCollapsed}
          title={collapsed ? t.sidebar.expand : t.sidebar.collapse}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] py-2 text-slate-400 transition-colors hover:border-ice/30 hover:text-ice-bright"
        >
          {collapsed ? <ChevronsRight size={15} /> : <ChevronsLeft size={15} />}
        </button>
      </div>

      {!collapsed && (
        <p className="flex-none px-6 pb-5 text-[9.5px] tracking-wide text-slate-600">
          v1.0 · 3D GIS Monitoring
        </p>
      )}
    </motion.aside>
  );
}
