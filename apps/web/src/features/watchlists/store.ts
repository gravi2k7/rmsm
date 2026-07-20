import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Watchlist {
  id: string;
  name: string;
  /** Instrument ids, in display order — drag-and-drop reordering just
   * rewrites this array. */
  instrumentIds: string[];
}

interface WatchlistState {
  watchlists: Watchlist[];
  activeWatchlistId: string | null;
  favoriteInstrumentIds: string[];
  pinnedInstrumentIds: string[];
  recentInstrumentIds: string[];

  createWatchlist: (name: string) => string;
  renameWatchlist: (id: string, name: string) => void;
  deleteWatchlist: (id: string) => void;
  setActiveWatchlist: (id: string) => void;
  addToWatchlist: (watchlistId: string, instrumentId: string) => void;
  removeFromWatchlist: (watchlistId: string, instrumentId: string) => void;
  reorderWatchlist: (watchlistId: string, instrumentIds: string[]) => void;

  toggleFavorite: (instrumentId: string) => void;
  togglePinned: (instrumentId: string) => void;
  recordRecentlyViewed: (instrumentId: string) => void;
}

const DEFAULT_WATCHLIST_ID = "default";
const MAX_RECENT = 20;

function generateId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `wl-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set) => ({
      watchlists: [{ id: DEFAULT_WATCHLIST_ID, name: "My Watchlist", instrumentIds: [] }],
      activeWatchlistId: DEFAULT_WATCHLIST_ID,
      favoriteInstrumentIds: [],
      pinnedInstrumentIds: [],
      recentInstrumentIds: [],

      createWatchlist: (name) => {
        const id = generateId();
        set((s) => ({ watchlists: [...s.watchlists, { id, name, instrumentIds: [] }], activeWatchlistId: id }));
        return id;
      },

      renameWatchlist: (id, name) => set((s) => ({ watchlists: s.watchlists.map((w) => (w.id === id ? { ...w, name } : w)) })),

      deleteWatchlist: (id) =>
        set((s) => {
          const remaining = s.watchlists.filter((w) => w.id !== id);
          const fallback: Watchlist = { id: DEFAULT_WATCHLIST_ID, name: "My Watchlist", instrumentIds: [] };
          const nextWatchlists = remaining.length > 0 ? remaining : [fallback];
          const nextActiveId = s.activeWatchlistId === id ? nextWatchlists[0]?.id ?? fallback.id : s.activeWatchlistId;
          return { watchlists: nextWatchlists, activeWatchlistId: nextActiveId };
        }),

      setActiveWatchlist: (id) => set({ activeWatchlistId: id }),

      addToWatchlist: (watchlistId, instrumentId) =>
        set((s) => ({
          watchlists: s.watchlists.map((w) =>
            w.id === watchlistId && !w.instrumentIds.includes(instrumentId) ? { ...w, instrumentIds: [...w.instrumentIds, instrumentId] } : w,
          ),
        })),

      removeFromWatchlist: (watchlistId, instrumentId) =>
        set((s) => ({
          watchlists: s.watchlists.map((w) => (w.id === watchlistId ? { ...w, instrumentIds: w.instrumentIds.filter((id) => id !== instrumentId) } : w)),
        })),

      reorderWatchlist: (watchlistId, instrumentIds) =>
        set((s) => ({ watchlists: s.watchlists.map((w) => (w.id === watchlistId ? { ...w, instrumentIds } : w)) })),

      toggleFavorite: (instrumentId) =>
        set((s) => ({
          favoriteInstrumentIds: s.favoriteInstrumentIds.includes(instrumentId)
            ? s.favoriteInstrumentIds.filter((id) => id !== instrumentId)
            : [...s.favoriteInstrumentIds, instrumentId],
        })),

      togglePinned: (instrumentId) =>
        set((s) => ({
          pinnedInstrumentIds: s.pinnedInstrumentIds.includes(instrumentId)
            ? s.pinnedInstrumentIds.filter((id) => id !== instrumentId)
            : [...s.pinnedInstrumentIds, instrumentId],
        })),

      recordRecentlyViewed: (instrumentId) =>
        set((s) => ({
          recentInstrumentIds: [instrumentId, ...s.recentInstrumentIds.filter((id) => id !== instrumentId)].slice(0, MAX_RECENT),
        })),
    }),
    { name: "rmsm-web-watchlists" },
  ),
);
