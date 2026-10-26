import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import {
  Activity, Clock, Mic, ScanFace, ServerCog, ShieldCheck, UserPlus, Users as UsersIcon, Video,
  CheckCircle2, XCircle,
} from "lucide-react";
import { useAdminMutations, useUsers } from "@/hooks/useApi";
import { useDetections } from "@/hooks/useDetections";
import { getNvrStatus } from "@/lib/nvr/nvrApi";
import { voiceApi } from "@/services/voice/VoiceService";
import { useAuthStore } from "@/store/useAuthStore";
import { usePermissions } from "@/lib/permissions";
import { useT } from "@/i18n";
import { EmptyState } from "@/components/common/EmptyState";

function StatusDot({ ok }: { ok: boolean }) {
  return ok ? (
    <CheckCircle2 size={14} className="flex-none text-emerald-400" />
  ) : (
    <XCircle size={14} className="flex-none text-red-400" />
  );
}

/** Qurilma soati serverdan shunchadan ko'p farq qilsa — ogohlantirish. */
const CLOCK_SKEW_WARN_S = 60;

/**
 * Sozlamalar — "Tizim holati" + foydalanuvchilar.
 *
 * 🔴 **"TIZIM HOLATI" MANBASI ALMASHTIRILDI (2026-10-26, test).** Ilgari
 * eski backend `/api/v1/admin/status` (`useAdminStatus`) edi — hozirgi
 * kuzatuv posti serveri bu yo'lga HTML qaytaradi, karta BO'M-BO'SH turardi,
 * "Resync"/"Yuz indeksi" tugmalari ham o'sha o'lik serverga yozardi.
 * Endi manba kuzatuv postining o'z `GET /api/status`i (`getNvrStatus`):
 * qurilmaga ulanish (`nvr_ok`, model), soat farqi (`clock.skew_seconds`),
 * yuz oqimi (`useDetections`), nutq serveri (`/speech/health`, JSON bo'lsa).
 * Foydalanuvchilar ro'yxati va yaratish — shu serverning `GET/POST /api/users`
 * (admin JWT bilan ishlaydi, `openapi.json`da bor).
 */
export function SettingsPage() {
  const t = useT();
  const status = useQuery({ queryKey: ["nvr-status"], queryFn: getNvrStatus, refetchInterval: 60_000 });
  /* Kalit `FloatingVoiceButton` bilan umumiy — bitta so'rov. */
  const speech = useQuery({ queryKey: ["speech-health"], queryFn: () => voiceApi.checkHealth(), staleTime: 10 * 60_000, retry: false });
  const faceFeed = useDetections({ category: "face", limit: 1 });
  const users = useUsers();
  const { createUser } = useAdminMutations();
  const currentUser = useAuthStore((s) => s.user);
  const { can, deniedMessage } = usePermissions();

  const [msg, setMsg] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({ username: "", password: "", full_name: "", role: "viewer" });

  function handleCreateUser(e: FormEvent) {
    e.preventDefault();
    if (!can("user.create")) {
      setMsg(deniedMessage);
      return;
    }
    createUser.mutate(
      {
        username: newUser.username.trim(),
        password: newUser.password,
        full_name: newUser.full_name.trim() || undefined,
        role: newUser.role,
      },
      {
        onSuccess: (u) => {
          setMsg(t.settings.userCreated(u.username));
          setNewUser({ username: "", password: "", full_name: "", role: "viewer" });
        },
        onError: (err) => setMsg(t.settings.userCreateError(err.message)),
      }
    );
  }

  const s = status.data;
  const skew = s?.clock?.skew_seconds;
  const faceLive = !faceFeed.isLoading && !faceFeed.error && (faceFeed.total > 0 || faceFeed.events.length > 0);
  /* Holat qatorlari — sabab/izoh ekranda (`note`), xom matn faqat `title`da. */
  const rows: { key: string; label: string; value: string; tone: string; note?: string; hint?: string; Icon: typeof Activity }[] = s
    ? [
        {
          key: "server",
          label: t.settings.detectServer,
          Icon: Activity,
          value: t.settings.stateConnected,
          tone: "text-emerald-400",
        },
        {
          key: "device",
          label: t.settings.device,
          Icon: Video,
          value: s.nvr_ok ? t.settings.stateConnected : t.settings.stateDisconnected,
          tone: s.nvr_ok ? "text-emerald-400" : "text-amber-400",
          note: s.nvr_ok && s.nvr?.model ? s.nvr.model : t.settings.deviceHint,
          hint: s.nvr_host ? `ISAPI: ${s.nvr_host}` : undefined,
        },
        ...(typeof skew === "number"
          ? [{
              key: "clock",
              label: t.settings.clockSkew,
              Icon: Clock,
              value: t.settings.seconds(skew),
              tone: Math.abs(skew) > CLOCK_SKEW_WARN_S ? "font-mono text-amber-400" : "font-mono text-slate-200",
              note: Math.abs(skew) > CLOCK_SKEW_WARN_S ? t.settings.clockSkewHint : undefined,
              hint: s.clock?.nvr_time && s.clock?.server_time ? `${s.clock.nvr_time} / ${s.clock.server_time}` : undefined,
            }]
          : []),
        {
          key: "face",
          label: t.settings.faceEngine,
          Icon: ScanFace,
          value: faceLive ? t.settings.stateOn : t.settings.stateOff,
          tone: faceLive ? "text-emerald-400" : "text-amber-400",
          note: faceLive ? t.settings.viaNvr : undefined,
        },
        {
          key: "speech",
          label: t.settings.speech,
          Icon: Mic,
          value: speech.data ? t.settings.stateOn : t.settings.stateNotInstalled,
          tone: speech.data ? "text-emerald-400" : "text-slate-500",
          note: speech.data ? undefined : t.settings.speechHint,
        },
      ]
    : [];

  const inputCls =
    "w-full rounded-lg border border-blue-500/20 bg-slate-900/60 px-3 py-2 text-[12px] text-slate-200 outline-none placeholder:text-slate-500 focus:border-ice/50";

  return (
    <div className="hik-glass-blue flex h-full min-h-0 flex-col gap-3 overflow-y-auto rounded-3xl p-4">
      <div className="flex flex-none items-center gap-2">
        <ServerCog size={16} className="text-ice-soft" />
        <p className="text-[13px] font-bold">{t.settings.heading}</p>
        {msg && (
          <motion.span
            key={msg}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            className="ml-auto rounded-lg bg-ice/15 px-3 py-1.5 text-[11px] text-ice-bright"
          >
            {msg}
          </motion.span>
        )}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-3 gap-3">
        {/* Tizim holati */}
        <div className="hik-glass-blue flex flex-col gap-3 rounded-2xl px-4 py-3.5">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            <Activity size={13} /> {t.settings.systemStatus}
          </p>
          {status.isLoading && <p className="text-[11.5px] text-slate-500">{t.common.loading}</p>}
          {status.isError && (
            <p className="flex items-center gap-2 text-[12px] text-red-300" title={String(status.error)}>
              <XCircle size={14} className="flex-none" /> {t.settings.statusError}
            </p>
          )}
          {rows.length > 0 && (
            <div className="space-y-2 text-[12px]">
              {rows.map((r) => (
                <div key={r.key} className="flex items-start justify-between gap-3" title={r.hint}>
                  <span className="flex min-w-0 flex-1 items-center gap-1.5 text-slate-300">
                    <r.Icon size={13} className="flex-none" />
                    {r.label}
                  </span>
                  <span className={`flex-none text-right ${r.tone}`}>
                    {r.value}
                    {r.note && <small className="block text-[9.5px] font-normal text-slate-500">{r.note}</small>}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Foydalanuvchilar */}
        <div className="hik-glass-blue flex min-h-0 flex-col gap-2.5 rounded-2xl px-4 py-3.5">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            <UsersIcon size={13} /> {t.settings.users} ({users.data?.length ?? 0})
          </p>
          <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
            {users.isLoading && <p className="text-[11.5px] text-slate-500">{t.common.loading}</p>}
            {(users.data ?? []).map((u) => (
              <div key={u.id} className="flex items-center gap-2.5 rounded-lg border border-slate-700/30 bg-slate-900/40 px-3 py-2">
                <div className="grid h-8 w-8 flex-none place-items-center rounded-full bg-ice/15 text-[11px] font-bold text-ice-soft ring-1 ring-ice/25">
                  {u.username.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold">
                    {u.full_name || u.username}
                    {currentUser?.id === u.id && <span className="ml-1.5 text-[9.5px] text-ice-soft">{t.settings.you}</span>}
                  </p>
                  <p className="text-[10px] text-slate-400">@{u.username}</p>
                </div>
                <span
                  className={`flex-none rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase ${
                    u.role === "admin" ? "bg-ice/15 text-ice-bright" : "bg-blue-500/10 text-ice-soft"
                  }`}
                >
                  {u.role}
                </span>
                <StatusDot ok={u.is_active} />
              </div>
            ))}
            {users.data && users.data.length === 0 && (
              <EmptyState compact className="py-6" title={t.settings.usersEmpty} />
            )}
            {users.isError && (
              <p className="py-6 text-center text-[11px] text-red-400">{t.settings.usersError}</p>
            )}
          </div>
        </div>

        {/* Yangi foydalanuvchi */}
        <div className="hik-glass-blue flex flex-col gap-3 rounded-2xl px-4 py-3.5">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            <UserPlus size={13} /> {t.settings.newUser}
          </p>
          <form onSubmit={handleCreateUser} className="flex flex-col gap-2.5">
            <input
              value={newUser.username}
              onChange={(e) => setNewUser((v) => ({ ...v, username: e.target.value }))}
              placeholder={t.settings.login}
              aria-label={t.settings.login}
              required
              autoComplete="off"
              className={inputCls}
            />
            <input
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser((v) => ({ ...v, password: e.target.value }))}
              placeholder={t.settings.password}
              aria-label={t.settings.password}
              required
              autoComplete="new-password"
              className={inputCls}
            />
            <input
              value={newUser.full_name}
              onChange={(e) => setNewUser((v) => ({ ...v, full_name: e.target.value }))}
              placeholder={t.settings.fullName}
              aria-label={t.settings.fullName}
              className={inputCls}
            />
            <select
              value={newUser.role}
              onChange={(e) => setNewUser((v) => ({ ...v, role: e.target.value }))}
              aria-label={t.settings.roleViewer}
              className={`${inputCls} [color-scheme:dark] [&_option]:bg-ink-panel [&_option]:text-slate-100`}
            >
              <option value="viewer">{t.settings.roleViewer}</option>
              <option value="operator">{t.settings.roleOperator}</option>
              <option value="admin">{t.settings.roleAdmin}</option>
            </select>
            <button
              type="submit"
              disabled={createUser.isPending}
              className="mt-1 flex items-center justify-center gap-2 hik-btn-ice rounded-xl py-2.5 text-[12.5px] disabled:opacity-50"
            >
              {createUser.isPending ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <UserPlus size={15} />
              )}
              {t.settings.create}
            </button>
          </form>
          <p className="mt-auto flex items-start gap-1.5 rounded-lg bg-slate-900/50 px-2.5 py-2 text-[10px] leading-relaxed text-slate-400">
            <ShieldCheck size={13} className="mt-0.5 flex-none text-ice-soft" />
            {t.settings.rolesNote}
          </p>
        </div>
      </div>
    </div>
  );
}
