"use client";

import { create } from "zustand";

/**
 * Controls `CommandPalette`'s open/closed state from outside the
 * component itself. Before this, `CommandPalette` managed `open` as
 * local `useState`, reachable only via its own internal Ctrl/Cmd+K
 * listener — there was no way for another component (e.g. a Header
 * "Search" button) to open it. Not persisted: this is transient UI
 * state, the same reason `useThemeStore`/`useAuthStore` persist and this
 * one deliberately doesn't.
 */
interface CommandPaletteState {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

export const useCommandPaletteStore = create<CommandPaletteState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
}));
