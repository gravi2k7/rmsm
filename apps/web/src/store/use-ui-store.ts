import { create } from "zustand";

/**
 * Example-shaped global UI store (sidebar/theme state). No domain state
 * lives here — this exists to prove Zustand is wired correctly per
 * Module 001 scope. Domain stores are added per-feature starting Module 004+.
 */
interface UiState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
