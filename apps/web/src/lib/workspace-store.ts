"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Workspace, WorkspaceState } from "@/types/dashboard";

/**
 * Implements the `WorkspaceState` contract declared in `types/dashboard.ts`
 * during UD-001.1 Phase 1. A plain, dumb Zustand store — like
 * `useThemeStore` — with no fetch logic of its own.
 *
 * There is currently no frontend API call anywhere in this app that lists
 * a user's workspaces (confirmed by exploration: no `features/workspaces`
 * directory, no `workspace` references outside this store and its Phase 1
 * type contract). Onboarding (WM-020D) does create a workspace
 * server-side, but nothing yet exposes a "list my workspaces" endpoint
 * the way, say, `notificationApi`/`invitationApi` expose their resources.
 * So `availableWorkspaces` starts empty and stays empty until a future
 * module adds that endpoint and a hook that calls `setAvailableWorkspaces`
 * — `WorkspaceSwitcher` (`components/dashboard/header/workspace-switcher.tsx`)
 * is built to render a real, working switcher the moment that happens,
 * and an honest disabled empty state until then.
 */
interface WorkspaceStore extends WorkspaceState {
  setActiveWorkspace: (workspace: Workspace | null) => void;
  setAvailableWorkspaces: (workspaces: Workspace[]) => void;
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set) => ({
      activeWorkspace: null,
      availableWorkspaces: [],
      setActiveWorkspace: (activeWorkspace) => set({ activeWorkspace }),
      setAvailableWorkspaces: (availableWorkspaces) => set({ availableWorkspaces }),
    }),
    { name: "rmsm-web-workspace" },
  ),
);
