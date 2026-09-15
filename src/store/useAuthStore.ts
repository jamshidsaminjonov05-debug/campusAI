import { create } from "zustand";
import { api, loadTokens, saveTokens, setUnauthorizedHandler, syncNvrSession, type UserOut } from "@/lib/api";
import { useAppStore } from "@/store/useAppStore";

interface AuthState {
  /** Tokenlar mavjudmi (sessiya bor deb hisoblanadi). */
  authenticated: boolean;
  /** /auth/me dan olingan joriy foydalanuvchi. */
  user: UserOut | null;
  /** Ilova ochilganda saqlangan token tekshirilmoqda. */
  checking: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  /** Saqlangan token bilan sessiyani tiklash (ilova ochilganda). */
  restore: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  authenticated: !!loadTokens(),
  user: null,
  checking: !!loadTokens(),

  login: async (username, password) => {
    await api.login(username, password);
    const user = await api.me().catch(() => null);
    set({ authenticated: true, user, checking: false });
    // Rahbar (admin) kirganda statistika (Boshqaruv paneli) darhol ochilsin —
    // sahifa qayta yuklanganda (restore) emas, faqat aniq LOGIN paytida.
    /* Yangi serverda bosh administrator roli — `superadmin` */
    if (user?.role === "admin" || user?.role === "superadmin") useAppStore.getState().setActivePage("Boshqaruv paneli");
  },

  logout: () => {
    saveTokens(null);
    set({ authenticated: false, user: null, checking: false });
  },

  restore: async () => {
    if (!loadTokens()) {
      set({ authenticated: false, checking: false });
      return;
    }
    try {
      const user = await api.me();
      set({ authenticated: true, user, checking: false });
      /* ⚠️ SHART — `saveTokens()` bu yo'lda QAYTA chaqirilmaydi (token
         o'zgarmadi), sessiya cookie'si esa brauzer sessiyasi bilan
         cheklangan va yopilib qayta ochilganda o'chadi
         (`lib/api.ts` `syncNvrSession` izohiga qarang). Shusiz panel
         "kirgan" ko'rinardi-yu, kuzatuv posti bo'limlari (Aniqlanganlar, Kameralar,
         xarita) 401 bilan bo'sh turaverardi. */
      syncNvrSession(true);
    } catch {
      // Token yaroqsiz — request() ichida refresh ham urinib bo'lindi
      saveTokens(null);
      set({ authenticated: false, user: null, checking: false });
    }
  },
}));

// 401 (refresh ham ishlamadi) — avtomatik logout
setUnauthorizedHandler(() => {
  useAuthStore.setState({ authenticated: false, user: null, checking: false });
});
