import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Global UI preferences.
 *
 * The sidebar starts collapsed for a first-time user and remembers
 * the user's expand/collapse preference across page reloads.
 */
interface UiState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarOpen: false,
      toggleSidebar: () =>
        set((s) => ({ sidebarOpen: !s.sidebarOpen })),
    }),
    {
      name: "rmsm-ui-preferences",
    },
  ),
);
