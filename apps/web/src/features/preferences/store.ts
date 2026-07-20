import { create } from "zustand";
import { persist } from "zustand/middleware";

export type TableDensity = "compact" | "comfortable";
export type DefaultLandingPage = "/dashboard" | "/market" | "/portfolio" | "/opportunities" | "/decisions" | "/orders";

interface PreferencesState {
  tableDensity: TableDensity;
  defaultTimeframe: string;
  defaultMarket: string;
  defaultLandingPage: DefaultLandingPage;
  reduceMotion: boolean;
  setTableDensity: (density: TableDensity) => void;
  setDefaultTimeframe: (timeframe: string) => void;
  setDefaultMarket: (market: string) => void;
  setDefaultLandingPage: (page: DefaultLandingPage) => void;
  setReduceMotion: (reduce: boolean) => void;
}

/**
 * There is no dashboard/UI-preferences endpoint in the Enterprise API —
 * verified across `modules/users`, `application/*`, and
 * `modules/notifications` — so table density, default timeframe/market,
 * and default landing page are real, working `localStorage`-backed
 * preferences rather than a fabricated server round-trip. Theme
 * (`lib/theme-store.ts`) and Remember Me (`lib/auth-store.ts`) follow the
 * same local-only pattern already established in earlier phases.
 */
export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      tableDensity: "comfortable",
      defaultTimeframe: "ONE_HOUR",
      defaultMarket: "FOREX",
      defaultLandingPage: "/dashboard",
      reduceMotion: false,
      setTableDensity: (tableDensity) => set({ tableDensity }),
      setDefaultTimeframe: (defaultTimeframe) => set({ defaultTimeframe }),
      setDefaultMarket: (defaultMarket) => set({ defaultMarket }),
      setDefaultLandingPage: (defaultLandingPage) => set({ defaultLandingPage }),
      setReduceMotion: (reduceMotion) => set({ reduceMotion }),
    }),
    { name: "rmsm-web-preferences" },
  ),
);
