import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { reportClientError } from "@/lib/errorReport";

interface Props {
  children: ReactNode;
  /** Ixtiyoriy — bo'lim nomi (xato xabarida ko'rsatiladi). */
  label?: string;
}

interface State {
  hasError: boolean;
  message: string;
}

/**
 * Render paytidagi xatolarni ushlab, butun app oq ekran bo'lib qolishining oldini
 * oladi. Xato bo'lsa tushunarli o'zbekcha panel + "Qayta yuklash" tugmasi ko'rsatiladi.
 * Prezentatsiya barqarorligi uchun majburiy (bitta komponent yiqilsa qolganlari ishlaydi).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, message: error instanceof Error ? error.message : "Kutilmagan xatolik" };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", this.props.label ?? "", error, info.componentStack);
    // Markazga xabar — endpoint hali bo'lmasa jim o'tadi (`lib/errorReport.ts`)
    reportClientError(error, this.props.label ?? "noma'lum", info.componentStack);
  }

  private reset = () => this.setState({ hasError: false, message: "" });

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="grid h-full min-h-[240px] w-full place-items-center p-6">
        <div className="hik-glass-blue max-w-md rounded-2xl border border-rose-500/25 p-6 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-rose-500/15">
            <AlertTriangle size={24} className="text-rose-400" />
          </div>
          <p className="mb-1 text-[15px] font-bold text-white">Xatolik yuz berdi</p>
          <p className="mb-4 text-[12px] leading-relaxed text-slate-400">
            Ushbu bo'limni ko'rsatishda muammo yuz berdi. Iltimos, qayta urinib ko'ring.
          </p>
          <button
            onClick={this.reset}
            className="hik-btn-ice mx-auto flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px]"
          >
            <RotateCcw size={15} /> Qayta yuklash
          </button>
        </div>
      </div>
    );
  }
}
