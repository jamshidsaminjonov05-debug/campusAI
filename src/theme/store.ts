/**
 * Mavzu holati — `src/i18n/store.ts` bilan BIR XIL uslubda (React'siz store).
 *
 * Nega zustand emas: tanlov `<html data-theme>` atributiga yoziladi va uni
 * React'dan tashqarida ham (SSR, `app/layout.tsx`) o'qish kerak. React
 * `useSyncExternalStore` orqali obuna bo'ladi.
 *
 * DIQQAT — cookie'ga ham yoziladi: `app/layout.tsx` (server komponent) uni
 * o'qib `<html data-theme>` ni DARHOL to'g'ri qo'yadi. Aks holda sahifa
 * qorong'i holatda chizilib, hydration'da oqarib "sakraydi".
 *
 * ── OLTITA MAVZU ─────────────────────────────────────────────────────
 * ⚠️ Ikkita ATRIBUT yoziladi:
 *   · `data-theme`  — aniq mavzu (`sand`, `mint` …), ranglar shundan;
 *   · `data-scheme` — OILA (`dark` yoki `light`).
 *
 * CSS dagi barcha yorug' qoidalar `[data-scheme="light"]` ga bog'langan —
 * shuning uchun yangi yorug' mavzu qo'shish uchun FAQAT shu fayldagi
 * jadvalga bitta yozuv kerak, `index.css` tegilmaydi.
 */

export type Theme = "dark" | "light" | "slate" | "sand" | "mint" | "violet";
export type Scheme = "dark" | "light";

/** Bitta mavzuning ta'rifi — nomi, oilasi va rang tokenlari. */
export interface ThemeDef {
  id: Theme;
  label: string;
  scheme: Scheme;
  /** Tanlagichdagi namuna doirasi. */
  swatch: string;
  /**
   * Yorug' oiladagi mavzular uchun `--lm-*` tokenlari.
   * Qorong'ida `null` — u asosiy (tokensiz) sxema.
   */
  tokens: Record<string, string> | null;
}

/**
 * ⚠️ RANG TANLOVI: yorug' mavzularda fon SOF OQ EMAS. Sof oq fonda
 * `text-slate-*` va shaffof urg'ular yuvilib ketardi (o'lchandi — landing
 * sarlavhasi va panel yozuvlari o'qilmasdi). Har bir mavzuda fon biroz
 * TUSLI, matn esa TO'Q — kontrast WCAG AA dan yuqori.
 */
export const THEMES: ThemeDef[] = [
  { id: "dark", label: "Tungi", scheme: "dark", swatch: "#0B1220", tokens: null },
  {
    id: "light",
    label: "Kunduzgi",
    scheme: "light",
    /* 2026-09-11 — volt.ai uslubidagi yorug' dashboard (foydalanuvchi
       so'rovi, skrinshot bilan): och kulrang fon, SOF OQ kartalar,
       `#2584FF` ko'k. Fon baribir sof oq EMAS — kartalar undan ajralsin. */
    swatch: "#f3f5f8",
    tokens: {
      "--lm-bg": "#f3f5f8",
      "--lm-surface": "#ffffff",
      "--lm-surface-2": "#f3f5f8",
      "--lm-line": "#e3e7ee",
      "--lm-text": "#171819",
      "--lm-text-soft": "#3f4448",
      "--lm-text-mute": "#6b7280",
      "--lm-accent": "#2584ff",
      "--lm-grid": "rgba(37, 132, 255, 0.08)",
    },
  },
  {
    id: "slate",
    label: "Grafit",
    scheme: "light",
    swatch: "#dfe4ec",
    tokens: {
      "--lm-bg": "#dde3ec",
      "--lm-surface": "#f4f6fa",
      "--lm-surface-2": "#e7ebf3",
      "--lm-line": "#bcc6d6",
      "--lm-text": "#0f1a28",
      "--lm-text-soft": "#33414f",
      "--lm-text-mute": "#5b6878",
      "--lm-accent": "#0f766e",
      "--lm-grid": "rgba(15, 118, 110, 0.14)",
    },
  },
  {
    id: "sand",
    label: "Qum",
    scheme: "light",
    swatch: "#f0e6d4",
    tokens: {
      "--lm-bg": "#f2e9db",
      "--lm-surface": "#fdfaf4",
      "--lm-surface-2": "#f3ece0",
      "--lm-line": "#ddceb4",
      "--lm-text": "#2a2114",
      "--lm-text-soft": "#4d4030",
      "--lm-text-mute": "#7a6b56",
      "--lm-accent": "#9a3412",
      "--lm-grid": "rgba(154, 52, 18, 0.12)",
    },
  },
  {
    id: "mint",
    label: "Yalpiz",
    scheme: "light",
    swatch: "#dff0e8",
    tokens: {
      "--lm-bg": "#e2f1ea",
      "--lm-surface": "#f7fcf9",
      "--lm-surface-2": "#e9f4ee",
      "--lm-line": "#bcdccb",
      "--lm-text": "#0c2419",
      "--lm-text-soft": "#2c4a3b",
      "--lm-text-mute": "#55705f",
      "--lm-accent": "#047857",
      "--lm-grid": "rgba(4, 120, 87, 0.14)",
    },
  },
  {
    id: "violet",
    label: "Siyoh",
    scheme: "light",
    swatch: "#e7e2f5",
    tokens: {
      "--lm-bg": "#e8e3f6",
      "--lm-surface": "#fbfaff",
      "--lm-surface-2": "#efecfa",
      "--lm-line": "#cdc4e6",
      "--lm-text": "#1b1533",
      "--lm-text-soft": "#3c3363",
      "--lm-text-mute": "#645b87",
      "--lm-accent": "#6d28d9",
      "--lm-grid": "rgba(109, 40, 217, 0.13)",
    },
  },
];

export const THEME_BY_ID = new Map(THEMES.map((t) => [t.id, t]));

/* ⚠️ Kalit "-v2" (2026-09-11): default yorug'ga o'tganda eski cookie'dagi
   `dark` tanlovi uni bosib ketardi — kalit almashgani uchun HAMMA bir
   marta "Kunduzgi"dan boshlaydi, keyingi tanlov esa odatdagidek saqlanadi. */
export const THEME_STORAGE_KEY = "campus-theme-v2";
export const ACCENT_STORAGE_KEY = "campus-accent";
export const DEFAULT_THEME: Theme = "light";

export const isTheme = (v: unknown): v is Theme => typeof v === "string" && THEME_BY_ID.has(v as Theme);

/** Mavzu qaysi oilaga tegishli — CSS shunga qarab qoida qo'llaydi. */
export const schemeOf = (t: Theme): Scheme => THEME_BY_ID.get(t)?.scheme ?? "dark";

function readInitialTheme(): Theme {
  if (typeof document === "undefined") return DEFAULT_THEME;
  // SSR allaqachon qo'ygan bo'lsa — o'shani olamiz (eng ishonchli manba)
  const fromDom = document.documentElement.dataset.theme;
  if (isTheme(fromDom)) return fromDom;
  const fromCookie = document.cookie.match(/(?:^|;\s*)campus-theme-v2=([^;]+)/)?.[1];
  if (isTheme(fromCookie)) return fromCookie;
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (isTheme(stored)) return stored;
  } catch {
    /* localStorage yopiq — default qoladi */
  }
  return DEFAULT_THEME;
}

function readInitialAccent(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(ACCENT_STORAGE_KEY);
  } catch {
    return null;
  }
}

let current: Theme = readInitialTheme();
/** Foydalanuvchi tanlagan urg'u rangi (`null` — mavzu o'z rangi). */
let accent: string | null = readInitialAccent();
const listeners = new Set<() => void>();

export function getTheme(): Theme {
  return current;
}
export function getAccent(): string | null {
  return accent;
}

/** Tanlangan mavzuning tokenlarini `<html>` ga yozadi. */
function applyTokens(next: Theme): void {
  const root = document.documentElement;
  const def = THEME_BY_ID.get(next);
  // Avval eskisini tozalaymiz — mavzular turli tokenlar to'plamiga ega
  for (const t of THEMES) {
    if (!t.tokens) continue;
    for (const k of Object.keys(t.tokens)) root.style.removeProperty(k);
  }
  if (def?.tokens) for (const [k, v] of Object.entries(def.tokens)) root.style.setProperty(k, v);
  // Foydalanuvchi urg'usi mavzu rangidan USTUN
  if (accent) root.style.setProperty("--lm-accent", accent);
}

export function setTheme(next: Theme): void {
  if (!isTheme(next) || next === current) return;
  current = next;
  if (typeof document !== "undefined") {
    const root = document.documentElement;
    const scheme = schemeOf(next);
    root.dataset.theme = next;
    root.dataset.scheme = scheme;
    // Tailwind `darkMode: "class"` — `dark:` variantlari shu sinfga bog'liq
    root.classList.toggle("dark", scheme === "dark");
    applyTokens(next);
    // 1 yil — brauzer yopilsa ham tanlov qoladi
    document.cookie = `${THEME_STORAGE_KEY}=${next}; path=/; max-age=31536000; samesite=lax`;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* kvota/yopiq — cookie yetadi */
    }
  }
  for (const fn of listeners) fn();
}

/** Urg'u rangini o'zgartirish (`null` — mavzu o'z rangiga qaytadi). */
export function setAccent(hex: string | null): void {
  accent = hex;
  if (typeof document !== "undefined") {
    const root = document.documentElement;
    if (hex) root.style.setProperty("--lm-accent", hex);
    else applyTokens(current);
    try {
      if (hex) localStorage.setItem(ACCENT_STORAGE_KEY, hex);
      else localStorage.removeItem(ACCENT_STORAGE_KEY);
    } catch {
      /* kvota — tanlov shu sessiyada qoladi */
    }
  }
  for (const fn of listeners) fn();
}

/** Qorong'i ↔ oxirgi yorug' mavzu (tugmani bir bosish). */
export function toggleTheme(): void {
  setTheme(current === "dark" ? "light" : "dark");
}

export function subscribeTheme(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Sahifa yuklanganda tokenlarni bir marta qo'llash (SSR atributdan keyin). */
export function hydrateTheme(): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.scheme = schemeOf(current);
  applyTokens(current);
}
