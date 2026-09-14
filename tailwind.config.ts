import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "'SF Pro Display'", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      colors: {
        hik: { red: "#E4002B", cyan: "#00B3E3" },
        // Muzli ko'k aksent palitra — dizayn-tizimning asosiy rangi
        ice: { DEFAULT: "#8FB8FF", soft: "#A8C7FF", bright: "#C9DAFF", cyan: "#85E0FF" },
        ink: { DEFAULT: "#090B14", panel: "#0C1020", card: "#101522" },
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
} satisfies Config;
