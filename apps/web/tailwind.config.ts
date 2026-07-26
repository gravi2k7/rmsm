import type { Config } from "tailwindcss";

/**
 * The full semantic color token set `@rmsm/ui`'s components already
 * reference (`bg-primary`, `bg-accent`, `bg-popover`, `bg-muted`, `bg-
 * destructive`, `border-input`, `ring-ring`, etc. — see e.g.
 * packages/ui/src/components/button.tsx). Previously only `border`/
 * `background`/`foreground` were mapped here, which meant every one of
 * those classes — already used throughout the existing dashboard
 * (Button/Badge/Card/Alert/...) as well as the new public shell — compiled
 * to no CSS rule at all. Purely additive: no component's markup or logic
 * changes, this only makes the classes they already use actually resolve.
 * CSS variables are defined in `src/app/globals.css`.
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        // WM-003R logo cloud "carousel placeholder" (Section 5) — a
        // CSS-only infinite scroll, no animation library or JS interval.
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
      },
      animation: {
        marquee: "marquee 30s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
