"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, Lock, Presentation, User } from "lucide-react";
import { useT } from "@/i18n/I18nProvider";
import { api, ApiError } from "@/lib/api";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { SpaceBackground } from "@/components/common/SpaceBackground";
import { Logo } from "@/components/common/Logo";

/**
 * Taqdimot kirish oynasi (`/taqdimot-kirish`).
 *
 * Ko'rinishi panel logini (`components/auth/AuthPage.tsx`) bilan AYNI:
 * yulduzli fon, shisha karta, ikonkali maydonlar, gradient tugma — ikki
 * xil "kirish" sahifasi bir xil mahsulotga tegishli ekani bilinsin.
 *
 * Alohida login/parol YO'Q — panel bilan AYNI backend logini (`api.login`).
 * Muvaffaqiyatli bo'lsa `campus-session` cookie qo'yiladi (`app/session`)
 * va brauzer taqdimotga TO'LIQ qayta yuklanadi — middleware cookie'ni shu
 * so'rovning o'zida ko'rishi uchun.
 *
 * ⚠️ `/session` ATAYLAB shu yerda KUTILADI: `api.login` ichidagi
 * `syncNvrSession()` uni kutmasdan yuboradi — darhol yo'naltirilsa cookie
 * hali qo'yilmagan bo'lib, middleware yana login sahifasiga qaytarardi.
 */

function Field({ label, icon, children, trailing }: { label: string; icon: ReactNode; children: ReactNode; trailing?: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium tracking-wide text-slate-300">{label}</span>
      <div className="group/f flex h-[46px] items-center gap-2.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] transition-all duration-300 focus-within:border-[#8EB7FF]/50 focus-within:bg-white/[0.05] focus-within:shadow-[inset_0_1px_2px_rgba(0,0,0,0.25),0_0_0_4px_rgba(142,183,255,0.09),0_0_24px_-6px_rgba(142,183,255,0.35)]">
        <span className="flex-none text-slate-500 transition-colors duration-300 group-focus-within/f:text-[#8EB7FF]">{icon}</span>
        {children}
        {trailing}
      </div>
    </label>
  );
}

const inputCls =
  "w-full bg-transparent text-[13.5px] text-slate-100 outline-none placeholder:text-slate-500/80 placeholder:transition-opacity placeholder:duration-300 focus:placeholder:opacity-50";

const primaryBtnCls =
  "flex h-[46px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[#B7CFFF] to-[#7FA6F2] text-[13.5px] font-bold text-[#0A0F1E] shadow-[0_10px_30px_-8px_rgba(142,183,255,0.5),inset_0_1px_0_rgba(255,255,255,0.5)] transition-shadow duration-300 hover:shadow-[0_16px_42px_-8px_rgba(142,183,255,0.65),inset_0_1px_0_rgba(255,255,255,0.5)] disabled:cursor-not-allowed disabled:opacity-60";

export default function DeckLogin({ next }: { next: string }) {
  const t = useT().deckLogin;
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.login(username.trim(), password);
      await fetch("/session", { method: "POST" });
      window.location.replace(next);
      return;
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) setError(t.network);
      else if (err instanceof ApiError && (err.status === 400 || err.status === 401 || err.status === 403)) setError(t.invalid);
      else setError(err instanceof Error ? err.message : t.invalid);
    }
    setBusy(false);
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-10 text-slate-100">
      <SpaceBackground />

      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <LanguageSwitcher variant="landing" />
      </div>

      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="absolute left-4 top-4 z-20 sm:left-6 sm:top-6"
      >
        <Link
          href="/"
          className="group flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-3.5 py-2.5 text-[12.5px] font-semibold text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-2xl transition-all duration-300 hover:border-[#8EB7FF]/40 hover:text-[#C8DAFF]"
        >
          <ArrowLeft size={15} strokeWidth={2} className="transition-transform duration-300 group-hover:-translate-x-0.5" />
          {t.back}
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.96, filter: "blur(10px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-[92vw] max-w-[440px]"
      >
        <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}>
          <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.04] p-8 shadow-[0_40px_90px_-24px_rgba(0,0,0,0.65),0_0_60px_-30px_rgba(142,183,255,0.25)] backdrop-blur-[40px] sm:p-9">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/[0.05] to-transparent" />

            <div className="relative">
              <div className="mb-7 flex flex-col items-center gap-3 text-center">
                <motion.div
                  whileHover={{ scale: 1.06, rotate: 3 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                  className="grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-gradient-to-b from-[#1a2340] to-[#10162b] shadow-[0_10px_30px_-8px_rgba(142,183,255,0.35),inset_0_1px_0_rgba(255,255,255,0.1)]"
                >
                  <Presentation size={26} strokeWidth={1.6} className="text-[#AFCBFF]" />
                </motion.div>
                <div>
                  <h1 className="text-[21px] font-bold tracking-tight text-white">{t.title}</h1>
                  <p className="mt-1 text-[12.5px] leading-snug text-slate-400">{t.sub}</p>
                </div>
              </div>

              <form onSubmit={submit} className="space-y-4">
                <Field label={t.username} icon={<User size={15} strokeWidth={1.7} />}>
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    autoFocus
                    required
                    aria-label={t.username}
                    className={inputCls}
                  />
                </Field>
                <Field
                  label={t.password}
                  icon={<Lock size={15} strokeWidth={1.7} />}
                  trailing={
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPass((v) => !v)}
                      className="flex-none rounded p-0.5 text-slate-500 transition-colors hover:text-slate-200"
                      aria-label={t.password}
                    >
                      {showPass ? <EyeOff size={15} strokeWidth={1.7} /> : <Eye size={15} strokeWidth={1.7} />}
                    </button>
                  }
                >
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                    aria-label={t.password}
                    className={inputCls}
                  />
                </Field>

                <AnimatePresence>
                  {error && (
                    <motion.p
                      key="err"
                      initial={{ opacity: 0, y: -4, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden rounded-xl border border-red-400/25 bg-red-500/10 px-3.5 py-2.5 text-[12px] text-red-300"
                      role="alert"
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                <motion.button
                  type="submit"
                  disabled={busy}
                  whileHover={{ y: -2, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 22 }}
                  className={`!mt-6 ${primaryBtnCls}`}
                >
                  {busy && <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0A0F1E]/25 border-t-[#0A0F1E]" />}
                  {busy ? t.checking : t.submit}
                </motion.button>
              </form>
            </div>
          </div>
        </motion.div>
      </motion.div>

      <p className="absolute bottom-5 left-0 right-0 z-10 flex items-center justify-center gap-2 text-center text-[10.5px] tracking-wide text-slate-600">
        <Logo className="h-[13px] w-auto" />
        Campus AI
      </p>
    </div>
  );
}
