import { Home, Camera, Users, Globe, AlertTriangle, ScanFace, BarChart3, Building2, FileText, Settings } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useT } from "@/i18n";

/**
 * Header'ning chap tomonida joriy bo'lim nomi + bir qatorli izoh.
 * Maqsad — har qanday foydalanuvchi (jumladan texnikaga uzoq odam) qaysi
 * bo'limda ekanini va u nima uchun kerakligini bir qarashda tushunsin.
 */
/** Bo'lim ikonkasi. Nom va izoh lug'atdan (`t.pages`) — uch tilli. */
const PAGE_ICON: Record<string, typeof Home> = {
  "Boshqaruv paneli": Home,
  Kameralar: Camera,
  Shaxslar: Users,
  Muassasalar: Building2,
  "Geo Analitika": Globe,
  Hodisalar: AlertTriangle,
  Aniqlanganlar: ScanFace,
  Statistika: BarChart3,
  Hisobotlar: FileText,
  Sozlamalar: Settings,
};

const DEFAULT_PAGE = "Boshqaruv paneli";

export function PageHeading() {
  const t = useT();
  const activePage = useAppStore((s) => s.activePage);
  const page = activePage in t.pages ? (activePage as keyof typeof t.pages) : DEFAULT_PAGE;
  const meta = t.pages[page];
  const Icon = PAGE_ICON[page] ?? Home;

  return (
    <div className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 flex-none place-items-center rounded-xl bg-ice/10 text-ice-bright">
        <Icon size={18} strokeWidth={1.9} />
      </span>
      <div className="leading-tight">
        <p className="text-[14px] font-bold text-white">{meta.label}</p>
        <p className="text-[10.5px] text-slate-400">{meta.desc}</p>
      </div>
    </div>
  );
}
