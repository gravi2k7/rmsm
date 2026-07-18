"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Milestone 5's own scope explicitly excludes Authentication ("Do NOT
 * implement: Authentication"). But every Strategy Engine endpoint is
 * both bearer-authenticated and org-scoped (`/organizations/:id/...`),
 * so *some* source for those two values is unavoidable for the UI to
 * call the real API at all.
 *
 * This is that real, named gap: a minimal, visible "session" bar
 * (see `components/layout/session-bar.tsx`) lets a developer/tester
 * paste in an access token + organization id obtained from the
 * existing Module 002 auth flow (e.g. via `POST /auth/login` through
 * curl/Postman, or the future login screen once one exists). Nothing
 * here issues, refreshes, or validates tokens — that responsibility
 * stays entirely with the backend and with whatever real login UI is
 * built later. Persisted to localStorage only so a developer doesn't
 * have to repaste it on every reload.
 */
interface SessionState {
  organizationId: string | null;
  accessToken: string | null;
  setOrganizationId: (id: string | null) => void;
  setAccessToken: (token: string | null) => void;
  clear: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      organizationId: null,
      accessToken: null,
      setOrganizationId: (organizationId) => set({ organizationId }),
      setAccessToken: (accessToken) => set({ accessToken }),
      clear: () => set({ organizationId: null, accessToken: null }),
    }),
    { name: "rmsm-session" },
  ),
);
