import type { ReactNode } from "react";
import { AlertCircle, Inbox, Loader2, WifiOff } from "lucide-react";
import { useT } from "@/i18n";

/**
 * Monitoring panelining asosiy primitivlari — sodda va ma'lumotga yo'naltirilgan.
 *
 * Eski `HudKit` dekorativ edi (qavslar, "DATA LOADING 100%" kabi soxta
 * ko'rsatkichlar). Bu yerda dekoratsiya yo'q: ramka, sarlavha va holatlar.
 */

export function Panel({
  title,
  subtitle,
  action,
  children,
  className = "",
  bodyClassName = "",
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`flex min-h-0 flex-col rounded-md border border-white/10 bg-[#0B1220]/80 ${className}`}>
      {(title || action) && (
        <header className="flex flex-none items-center gap-3 border-b border-white/10 px-3.5 py-2.5">
          <div className="min-w-0">
            {title && <h2 className="truncate text-[12.5px] font-semibold text-slate-100">{title}</h2>}
            {subtitle && <p className="truncate text-[10.5px] text-slate-500">{subtitle}</p>}
          </div>
          <div className="ml-auto flex flex-none items-center gap-2">{action}</div>
        </header>
      )}
      <div className={`min-h-0 flex-1 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

/** Holat chipi — rang bilan ajratilgan qisqa yorliq. */
export function Pill({
  children,
  tone = "slate",
  title,
}: {
  children: ReactNode;
  tone?: "slate" | "cyan" | "amber" | "red" | "green";
  title?: string;
}) {
  const map = {
    slate: "border-white/12 bg-white/[0.04] text-slate-300",
    cyan: "border-cyan-400/30 bg-cyan-400/10 text-cyan-200",
    amber: "border-amber-400/30 bg-amber-400/10 text-amber-200",
    red: "border-red-500/40 bg-red-500/12 text-red-200",
    green: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
  } as const;
  return (
    <span
      title={title}
      className={`inline-flex flex-none items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium ${map[tone]}`}
    >
      {children}
    </span>
  );
}

function Centered({ icon, title, hint }: { icon: ReactNode; title: string; hint?: string }) {
  return (
    <div className="grid h-full min-h-[120px] place-items-center px-4 py-8 text-center">
      <div className="flex flex-col items-center gap-2">
        {icon}
        <p className="text-[12.5px] font-medium text-slate-300">{title}</p>
        {hint && <p className="max-w-[320px] text-[11px] leading-relaxed text-slate-500">{hint}</p>}
      </div>
    </div>
  );
}

export function LoadingState({ title }: { title?: string }) {
  const t = useT();
  return (
    <Centered icon={<Loader2 size={22} className="animate-spin text-cyan-400/70" />} title={title ?? t.common.loading} />
  );
}

export function EmptyState({ title, hint }: { title?: string; hint?: string }) {
  const t = useT();
  return <Centered icon={<Inbox size={22} className="text-slate-600" />} title={title ?? t.common.noData} hint={hint} />;
}

/**
 * Xatolik holati. `ApiError`/`DetectError` `status:0` bo'lsa aloqa yo'q —
 * foydalanuvchiga "server javob bermadi" deb aytamiz, texnik matn emas.
 */
export function ErrorState({ error, hint }: { error: unknown; hint?: string }) {
  const t = useT();
  const status = (error as { status?: number } | null)?.status;
  const offline = status === 0 || status === undefined;
  const message = (error as { message?: string } | null)?.message ?? t.common.unknownError;
  return (
    <Centered
      icon={
        offline ? <WifiOff size={22} className="text-amber-400" /> : <AlertCircle size={22} className="text-red-400" />
      }
      title={offline ? t.common.serverNoResponse : message}
      hint={hint ?? (offline ? t.common.checkNetwork : undefined)}
    />
  );
}
