import { useMemo, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import {
  Activity, Database, RefreshCcw, ScanFace, ServerCog, ShieldCheck, UserPlus, Users as UsersIcon,
  CheckCircle2, XCircle,
} from "lucide-react";
import { useAdminMutations, useAdminStatus, useDashboard, useUsers } from "@/hooks/useApi";
import { useDetections } from "@/hooks/useDetections";
import { useAuthStore } from "@/store/useAuthStore";
import { usePermissions } from "@/lib/permissions";
import { useT } from "@/i18n";

function StatusDot({ ok }: { ok: boolean }) {
  return ok ? (
    <CheckCircle2 size={14} className="flex-none text-emerald-400" />
  ) : (
    <XCircle size={14} className="flex-none text-red-400" />
  );
}

export function SettingsPage() {
  const t = useT();
  const status = useAdminStatus();
  const users = useUsers();
  const { resync, reloadFaceIndex, createUser } = useAdminMutations();
  const currentUser = useAuthStore((s) => s.user);
  const { can, deniedMessage } = usePermissions();

  const [msg, setMsg] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({ username: "", password: "", full_name: "", role: "viewer" });

  function report(label: string) {
    return {
      onSuccess: () => setMsg(`${label} — muvaffaqiyatli bajarildi`),
      onError: (e: Error) => setMsg(`${label} — xato: ${e.message}`),
    };
  }

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
          setMsg(`"${u.username}" foydalanuvchisi yaratildi`);
          setNewUser({ username: "", password: "", full_name: "", role: "viewer" });
        },
        onError: (err) => setMsg(`Foydalanuvchi yaratish xatosi: ${err.message}`),
      }
    );
  }

  const s = status.data;
  /* Modul BAYROG'I emas, HAQIQIY ma'lumot oqimi muhim: backendda
     `onnxruntime` o'rnatilmagan bo'lsa ham yuz hodisalari kuzatuv postidan kelaveradi
     (u tanishni o'zi bajaradi). Shuning uchun holat shu ikkala manbadan
     birga chiqariladi. */
  const faceFeed = useDetections({ category: "face", limit: 1 });
  const dash = useDashboard();

  /**
   * Holat qatorlari.
   *
   * IKKI QOIDA:
   * 1. **Xom Python xatosi ekranga chiqmaydi.** Server modul yo'q bo'lsa
   *    `ModuleNotFoundError: No module named 'onnxruntime'` qaytaradi; bu
   *    foydalanuvchiga hech narsa demaydi, shuning uchun odam o'qiydigan
   *    holatga aylantiriladi. Asl matn faqat `title` da (sichqoncha ostida).
   * 2. **MA'LUMOT KELAYOTGAN bo'lsa — "Ishlayapti".** Modul bayrog'i `false`
   *    bo'lsa ham, agar o'sha imkoniyat bo'yicha haqiqiy ma'lumot kelayotgan
   *    bo'lsa (yuz hodisalari kuzatuv postidan), qator ISHLAYAPTI deb ko'rsatiladi va
   *    yonida manbasi yoziladi. Umuman ma'lumot yo'q bo'lsa — qator
   *    CHIZILMAYDI (bo'sh indeks, bo'sh oqim, ishlamayotgan ovoz moduli).
   */
  const rows = useMemo(() => {
    if (!s) return [];
    const out: {
      key: string;
      label: string;
      value: string;
      tone: string;
      note?: string;
      hint?: string;
      Icon?: typeof Database;
    }[] = [];

    const ON = { value: t.settings.stateOn, tone: "text-emerald-400" };

    // 1) Aniqlash serveri (kuzatuv posti) — hodisalar shundan keladi
    if (!faceFeed.isLoading) {
      const nvrOk = !faceFeed.error;
      out.push({
        key: "nvr",
        label: t.settings.detectServer,
        Icon: Activity,
        value: nvrOk ? t.settings.stateConnected : t.settings.stateDisconnected,
        tone: nvrOk ? "text-emerald-400" : "text-amber-400",
      });
    }

    // 2) Ma'lumotlar bazasi
    out.push({
      key: "db",
      label: t.settings.dbEngine,
      Icon: Database,
      value: s.postgres_available ? t.settings.stateConnected : t.settings.stateDisconnected,
      tone: s.postgres_available ? "text-emerald-400" : "text-amber-400",
    });
    if (s.postgres_available) {
      out.push({
        key: "resync",
        label: t.settings.needsResync,
        value: s.needs_resync ? t.settings.yes : t.settings.no,
        tone: s.needs_resync ? "text-amber-400" : "text-emerald-400",
      });
    }

    // 3) Yuz tanish — kuzatuv posti hodisalari kelayotgan bo'lsa ISHLAYAPTI
    const faceLive = faceFeed.total > 0 || faceFeed.events.length > 0;
    if (s.face_engine.available || faceLive) {
      out.push({
        key: "face",
        label: t.settings.faceEngine,
        Icon: ScanFace,
        ...ON,
        note: s.face_engine.available ? undefined : t.settings.viaNvr,
        hint: s.face_engine.error,
      });
    }

    // 4) Hissiyot tahlili — yozuv bo'lmasa qator umuman chizilmaydi
    if (s.emotion_engine.available || (dash.data?.emotions_today.total ?? 0) > 0) {
      out.push({ key: "emotion", label: t.settings.emotionEngine, ...ON, hint: s.emotion_engine.error });
    }

    // 5) Ovoz modullari — faqat ishlayotgani ko'rsatiladi
    if (s.stt_engine?.available) out.push({ key: "stt", label: t.settings.sttEngine, ...ON });
    if (s.tts_engine?.available) out.push({ key: "tts", label: t.settings.ttsEngine, ...ON });

    // 6) Sonlar — nolga teng bo'lsa ko'rsatilmaydi
    if (s.face_index_size > 0) {
      out.push({
        key: "index",
        label: t.settings.faceIndexSize,
        value: String(s.face_index_size),
        tone: "font-mono text-slate-200",
      });
    }
    if (s.active_streams.length > 0) {
      out.push({
        key: "streams",
        label: t.settings.activeStreams,
        value: String(s.active_streams.length),
        tone: "font-mono text-slate-200",
      });
    }
    return out;
  }, [s, t, faceFeed.isLoading, faceFeed.error, faceFeed.total, faceFeed.events.length, dash.data]);

  const inputCls =
    "w-full rounded-lg border border-blue-500/20 bg-slate-900/60 px-3 py-2 text-[12px] text-slate-200 outline-none placeholder:text-slate-500";
  const btnCls =
    "flex items-center gap-2 rounded-lg border border-blue-500/20 bg-slate-900/60 px-3 py-2 text-[11.5px] text-slate-200 transition-colors hover:bg-slate-800/70 disabled:opacity-50";

  return (
    <div className="hik-glass-blue flex h-full min-h-0 flex-col gap-3 overflow-y-auto rounded-3xl p-4">
      <div className="flex flex-none items-center gap-2">
        <ServerCog size={16} className="text-ice-soft" />
        <p className="text-[13px] font-bold">Tizim sozlamalari va administrator paneli</p>
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
          {s && (
            <div className="space-y-1.5 text-[12px]">
              {rows.length > 0 ? (
                rows.map((r) => (
                  <div key={r.key} className="flex items-center justify-between gap-3" title={r.hint}>
                    <span className="flex min-w-0 items-center gap-1.5 truncate text-slate-300">
                      {r.Icon && <r.Icon size={13} className="flex-none" />}
                      {r.label}
                    </span>
                    <span className={`flex-none ${r.tone}`}>
                      {r.value}
                      {/* Manba — modul o'chiq bo'lsa ham ma'lumot qayerdan kelayotgani */}
                      {r.note && <small className="ml-1.5 text-[9.5px] font-normal text-slate-500">{r.note}</small>}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-[11.5px] text-slate-500">{t.settings.statusEmpty}</p>
              )}
            </div>
          )}

          <div className="mt-auto space-y-2 border-t border-slate-700/30 pt-3">
            <button
              className={btnCls}
              disabled={resync.isPending}
              onClick={() => resync.mutate("to_backup", report("Resync (asosiy → zaxira)"))}
            >
              <RefreshCcw size={14} className={resync.isPending ? "animate-spin text-ice-soft" : "text-ice-soft"} />
              Resync: asosiy → zaxira
            </button>
            <button
              className={btnCls}
              disabled={resync.isPending}
              onClick={() => resync.mutate("to_primary", report("Resync (zaxira → asosiy)"))}
            >
              <RefreshCcw size={14} className={resync.isPending ? "animate-spin text-amber-300" : "text-amber-300"} />
              Resync: zaxira → asosiy
            </button>
            <button
              className={btnCls}
              disabled={reloadFaceIndex.isPending}
              onClick={() => reloadFaceIndex.mutate(undefined, report("Yuz indeksini qayta yuklash"))}
            >
              <ScanFace size={14} className={reloadFaceIndex.isPending ? "animate-pulse text-emerald-300" : "text-emerald-300"} />
              Yuz indeksini qayta yuklash
            </button>
          </div>
        </div>

        {/* Foydalanuvchilar */}
        <div className="hik-glass-blue flex min-h-0 flex-col gap-2.5 rounded-2xl px-4 py-3.5">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            <UsersIcon size={13} /> Foydalanuvchilar ({users.data?.length ?? 0})
          </p>
          <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto">
            {(users.data ?? []).map((u) => (
              <div key={u.id} className="flex items-center gap-2.5 rounded-lg border border-slate-700/30 bg-slate-900/40 px-3 py-2">
                <div className="grid h-8 w-8 flex-none place-items-center rounded-full bg-ice/15 text-[11px] font-bold text-ice-soft ring-1 ring-ice/25">
                  {u.username.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold">
                    {u.full_name || u.username}
                    {currentUser?.id === u.id && <span className="ml-1.5 text-[9.5px] text-ice-soft">(siz)</span>}
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
              <p className="py-6 text-center text-[11px] text-slate-500">Foydalanuvchilar topilmadi</p>
            )}
            {users.isError && (
              <p className="py-6 text-center text-[11px] text-red-400">
                Ro'yxatni olishda xato — admin huquqi kerak bo'lishi mumkin
              </p>
            )}
          </div>
        </div>

        {/* Yangi foydalanuvchi */}
        <div className="hik-glass-blue flex flex-col gap-3 rounded-2xl px-4 py-3.5">
          <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            <UserPlus size={13} /> Yangi foydalanuvchi qo'shish
          </p>
          <form onSubmit={handleCreateUser} className="flex flex-col gap-2.5">
            <input
              value={newUser.username}
              onChange={(e) => setNewUser((v) => ({ ...v, username: e.target.value }))}
              placeholder="Login *"
              required
              className={inputCls}
            />
            <input
              type="password"
              value={newUser.password}
              onChange={(e) => setNewUser((v) => ({ ...v, password: e.target.value }))}
              placeholder="Parol *"
              required
              className={inputCls}
            />
            <input
              value={newUser.full_name}
              onChange={(e) => setNewUser((v) => ({ ...v, full_name: e.target.value }))}
              placeholder="To'liq ism"
              className={inputCls}
            />
            <select
              value={newUser.role}
              onChange={(e) => setNewUser((v) => ({ ...v, role: e.target.value }))}
              className={inputCls}
            >
              <option value="viewer">Kuzatuvchi (viewer)</option>
              <option value="operator">Operator</option>
              <option value="admin">Administrator</option>
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
              Yaratish
            </button>
          </form>
          <p className="mt-auto flex items-start gap-1.5 rounded-lg bg-slate-900/50 px-2.5 py-2 text-[10px] leading-relaxed text-slate-400">
            <ShieldCheck size={13} className="mt-0.5 flex-none text-ice-soft" />
            Foydalanuvchi yaratish uchun administrator huquqi kerak. Rollar: viewer — faqat ko'rish,
            operator — hodisalarni boshqarish, admin — to'liq huquq.
          </p>
        </div>
      </div>
    </div>
  );
}
