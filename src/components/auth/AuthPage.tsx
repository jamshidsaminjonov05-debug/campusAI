import { useEffect, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import Link from "next/link";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { ThemeSwitcher, useScheme } from "@/theme";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import { useT } from "@/i18n";
import { useAuthStore } from "@/store/useAuthStore";
import { SpaceBackground } from "@/components/common/SpaceBackground";
import { Logo } from "@/components/common/Logo";

/* Glass input — fokus'da yumshoq ko'k halo */
function Field({
  label,
  icon,
  children,
  trailing,
}: {
  label: string;
  icon: ReactNode;
  children: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium tracking-wide text-slate-300">
        {label}
      </span>
      <div className="group/f flex h-[46px] items-center gap-2.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)] transition-all duration-300 focus-within:border-[#8EB7FF]/50 focus-within:bg-white/[0.05] focus-within:shadow-[inset_0_1px_2px_rgba(0,0,0,0.25),0_0_0_4px_rgba(142,183,255,0.09),0_0_24px_-6px_rgba(142,183,255,0.35)]">
        <span className="flex-none text-slate-500 transition-colors duration-300 group-focus-within/f:text-[#8EB7FF]">
          {icon}
        </span>
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

/* Oldin kirgan loginlar — brauzerning oq autofill oynasi o'rniga loyiha
   dizaynidagi taklif ro'yxati uchun localStorage'da saqlanadi */
const RECENT_LOGINS_KEY = "hik_recent_logins";

function loadRecentLogins(): string[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(RECENT_LOGINS_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((v): v is string => typeof v === "string").slice(0, 5) : [];
  } catch {
    return [];
  }
}

function saveRecentLogin(name: string): string[] {
  const next = [name, ...loadRecentLogins().filter((v) => v !== name)].slice(0, 5);
  localStorage.setItem(RECENT_LOGINS_KEY, JSON.stringify(next));
  return next;
}

/* Gologramma yuz — wireframe bosh rasmi; qora fon mix-blend-screen bilan
   yo'qoladi, faqat ko'k to'r qoladi */
function CarouselCard({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  return (
    <motion.div
      initial={false}
      animate={
        active
          ? { y: 0, scale: 1, opacity: 1, filter: "blur(0px)" }
          : {
              // Noaktiv karta markazda qolib, tepaga-orqaga "botadi" — chiqish
              // va kirish nuqtasi bir xil
              y: -34,
              scale: 0.86,
              opacity: 0,
              filter: "blur(6px)",
            }
      }
      transition={{ type: "spring", stiffness: 170, damping: 24 }}
      style={{ zIndex: active ? 2 : 1, transformStyle: "preserve-3d" }}
      className={`col-start-1 row-start-1 w-[92vw] max-w-[460px] justify-self-center ${
        active ? "" : "pointer-events-none"
      }`}
    >
      <div className="relative flex h-full flex-col overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.04] p-8 shadow-[0_40px_90px_-24px_rgba(0,0,0,0.65),0_0_60px_-30px_rgba(142,183,255,0.25)] backdrop-blur-[40px] sm:p-9">
        {/* Ichki yuqori yaltiroq chiziq — frosted glass hissi */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-white/[0.05] to-transparent" />
        <div className="relative flex flex-1 flex-col">{children}</div>
      </div>
    </motion.div>
  );
}

function CardHeader({ icon, title, subtitle }: { icon: ReactNode; title: string; subtitle: string }) {
  return (
    <div className="mb-7 flex flex-col items-center gap-3 text-center">
      <motion.div
        whileHover={{ scale: 1.06, rotate: 3 }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
        className="grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-gradient-to-b from-[#1a2340] to-[#10162b] shadow-[0_10px_30px_-8px_rgba(142,183,255,0.35),inset_0_1px_0_rgba(255,255,255,0.1)]"
      >
        {icon}
      </motion.div>
      <div>
        <h1 className="text-[21px] font-bold tracking-tight text-white">{title}</h1>
        <p className="mt-1 text-[12.5px] text-slate-400">{subtitle}</p>
      </div>
    </div>
  );
}

export function AuthPage() {
  const login = useAuthStore((s) => s.login);
  /* Yorug'/qorong'i — bir nechta rang QORONG'I shisha uchun tanlangan,
     yorug' rejimda ular oqarib ketadi (pastdagi "Parolni unutdingizmi?"). */
  const scheme = useScheme();
  const t = useT();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Login takliflari — oldingi muvaffaqiyatli kirishlar
  const [recents, setRecents] = useState<string[]>(loadRecentLogins);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestIdx, setSuggestIdx] = useState(-1);
  const suggestions = recents.filter(
    (r) => r.toLowerCase().startsWith(username.trim().toLowerCase()) && r !== username.trim(),
  );

  function pickSuggestion(name: string) {
    setUsername(name);
    setSuggestOpen(false);
    setSuggestIdx(-1);
  }

  function removeRecent(name: string) {
    const next = recents.filter((v) => v !== name);
    localStorage.setItem(RECENT_LOGINS_KEY, JSON.stringify(next));
    setRecents(next);
  }

  function onUsernameKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setSuggestOpen(false);
      return;
    }
    if (!suggestOpen || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSuggestIdx((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSuggestIdx((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && suggestIdx >= 0) {
      e.preventDefault();
      pickSuggestion(suggestions[suggestIdx]);
    }
  }

  // Sichqoncha — sahna tilt'i uchun (-1..1, spring bilan silliqlangan)
  const mxRaw = useMotionValue(0);
  const myRaw = useMotionValue(0);
  const mx = useSpring(mxRaw, { stiffness: 50, damping: 20, mass: 0.7 });
  const my = useSpring(myRaw, { stiffness: 50, damping: 20, mass: 0.7 });

  useEffect(() => {
    function onMove(e: MouseEvent) {
      mxRaw.set((e.clientX / window.innerWidth) * 2 - 1);
      myRaw.set((e.clientY / window.innerHeight) * 2 - 1);
    }
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [mxRaw, myRaw]);

  // Butun sahna tilt'i — maksimum 8°
  const rotateX = useTransform(my, [-1, 1], [8, -8]);
  const rotateY = useTransform(mx, [-1, 1], [-8, 8]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await login(username.trim(), password);
      setRecents(saveRecentLogin(username.trim()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Noma'lum xatolik");
    } finally {
      setBusy(false);
    }
  }

  const messages = (
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
      {notice && (
        <motion.p
          key="ok"
          initial={{ opacity: 0, y: -4, height: 0 }}
          animate={{ opacity: 1, y: 0, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-3.5 py-2.5 text-[12px] text-emerald-300"
          role="status"
        >
          {notice}
        </motion.p>
      )}
    </AnimatePresence>
  );

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-10 text-slate-100">
      <SpaceBackground />

      {/* Til tanlagich — login birinchi ekran, tanlov cookie'da qoladi */}
      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <LanguageSwitcher variant="landing" />
        <ThemeSwitcher />
      </div>

      {/* Orqaga — landing sahifasiga qaytish */}
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
          Orqaga
        </Link>
      </motion.div>

      {/* Perspektiv sahna — karusel: aktiv karta markazda, ikkinchisi chetda */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, filter: "blur(10px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{ perspective: 1400 }}
        className="relative z-10"
      >
        <motion.div
          style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
          className="relative"
        >
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformStyle: "preserve-3d" }}
            className="grid"
          >
            {/* Login-parol kartasi */}
            <CarouselCard active>
              <CardHeader
                icon={<ShieldCheck size={26} strokeWidth={1.6} className="text-[#AFCBFF]" />}
                title="Xush kelibsiz"
                subtitle="Campus AI monitoring tizimiga kiring"
              />
              {/* flex-1 + justify-center — kartalar teng balandlikda, forma bo'sh
                  joyni markazda egallaydi */}
              <form onSubmit={handleSubmit} autoComplete="off" className="flex flex-1 flex-col justify-center space-y-4">
                {/* relative — taklif ro'yxati shu maydon ostiga yopishadi */}
                <div className="relative">
                  <Field label="Login" icon={<User size={15} strokeWidth={1.7} />}>
                    <input
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        setSuggestOpen(true);
                        setSuggestIdx(-1);
                      }}
                      onFocus={() => {
                        setSuggestOpen(true);
                        setSuggestIdx(-1);
                      }}
                      onBlur={() => setSuggestOpen(false)}
                      onKeyDown={onUsernameKeyDown}
                      placeholder="Foydalanuvchi nomi"
                      autoComplete="off"
                      name="hik-login"
                      required
                      aria-label="Login"
                      className={inputCls}
                    />
                  </Field>

                  {/* Loyiha uslubidagi login takliflari — brauzer autofill'i o'rniga */}
                  <AnimatePresence>
                    {suggestOpen && suggestions.length > 0 && (
                      <motion.ul
                        initial={{ opacity: 0, y: -6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.98 }}
                        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                        // preventDefault — klik input fokusini yiqitmasin (blur'dan oldin tanlansin)
                        onMouseDown={(e) => e.preventDefault()}
                        className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0D1428]/95 p-1.5 shadow-[0_24px_60px_-18px_rgba(0,0,0,0.7),0_0_40px_-24px_rgba(142,183,255,0.35)] backdrop-blur-2xl"
                      >
                        <li className="px-3 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                          Oldingi kirishlar
                        </li>
                        {suggestions.map((name, i) => (
                          <li key={name} className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => pickSuggestion(name)}
                              onMouseEnter={() => setSuggestIdx(i)}
                              className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] transition-colors duration-150 ${
                                i === suggestIdx ? "bg-white/[0.07] text-slate-100" : "text-slate-300"
                              }`}
                            >
                              <span className="grid h-7 w-7 flex-none place-items-center rounded-lg border border-white/10 bg-gradient-to-b from-[#1a2340] to-[#10162b] text-[#AFCBFF]">
                                <User size={13} strokeWidth={1.8} />
                              </span>
                              <span className="truncate">{name}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => removeRecent(name)}
                              aria-label={`${name} ni ro'yxatdan o'chirish`}
                              className="mr-1 flex-none rounded-lg p-1.5 text-slate-600 transition-colors hover:bg-white/[0.06] hover:text-slate-300"
                            >
                              <X size={12} strokeWidth={2} />
                            </button>
                          </li>
                        ))}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </div>
                <Field
                  label="Parol"
                  icon={<Lock size={15} strokeWidth={1.7} />}
                  trailing={
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPass((v) => !v)}
                      className="flex-none rounded p-0.5 text-slate-500 transition-colors hover:text-slate-200"
                      aria-label={showPass ? "Parolni yashirish" : "Parolni ko'rsatish"}
                    >
                      {showPass ? <EyeOff size={15} strokeWidth={1.7} /> : <Eye size={15} strokeWidth={1.7} />}
                    </button>
                  }
                >
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Parolingizni kiriting"
                    // "new-password" — brauzerning oq saqlangan-parollar oynasini bostiradi
                    autoComplete="new-password"
                    name="hik-parol"
                    required
                    aria-label="Parol"
                    className={inputCls}
                  />
                </Field>

                {/* 🔴 "Eslab qolish" katakchasi OLIB TASHLANDI (2026-10-26, test):
                    qiymati hech qayerda o'qilmasdi — token doim `localStorage`da.
                    Face ID tabi ham olib tashlandi: brauzer kamerasi faqat HTTPS'da,
                    serverda esa yuz orqali kirish yo'li yo'q (`/recognition/identify`). */}
                <div className="flex items-center justify-end pt-0.5 text-[12px]">
                  <button
                    type="button"
                    onClick={() => setNotice(t.auth.forgotNotice)}
                    /* ⚠️ **YORUG' REJIMDA KO'RINMAY QOLGAN EDI** (2026-09-14,
                       foydalanuvchi skrinshot bilan ko'rsatdi): `#AFCBFF` —
                       QORONG'I shisha karta uchun tanlangan och ko'k, karta
                       esa yorug' mavzuda oqaradi va yozuv oq fonda oq
                       ustida qolardi. Qolgan `#AFCBFF` lar (kartochka
                       sarlavhasidagi ikonkalar) o'z QORONG'I gradient
                       qutisi ichida turadi — ular o'zgarmaydi. */
                    className={
                      scheme === "light"
                        ? "font-medium text-[#1D4ED8] transition-colors hover:text-[#1E40AF]"
                        : "font-medium text-[#AFCBFF] transition-colors hover:text-[#C8DAFF]"
                    }
                  >
                    {t.auth.forgot}
                  </button>
                </div>

                {messages}

                <motion.button
                  type="submit"
                  disabled={busy}
                  whileHover={{ y: -2, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 22 }}
                  className={`!mt-6 ${primaryBtnCls}`}
                >
                  {busy && (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0A0F1E]/25 border-t-[#0A0F1E]" />
                  )}
                  Tizimga kirish
                </motion.button>
              </form>
            </CarouselCard>

          </motion.div>
        </motion.div>
      </motion.div>

      {/* Brend belgisi — `public/logo/` dagi "CA" monogrammasi (2026-09-14) */}
      <p className="absolute bottom-5 left-0 right-0 z-10 flex items-center justify-center gap-2 text-center text-[10.5px] tracking-wide text-slate-600">
        <Logo className="h-[13px] w-auto" />
        Campus AI + 3D GIS Monitoring · v1.0
      </p>
    </div>
  );
}
