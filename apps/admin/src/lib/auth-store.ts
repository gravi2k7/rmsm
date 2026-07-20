import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthTokens, AuthUser } from "@/types/auth";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  setSession: (tokens: AuthTokens, user: AuthUser) => void;
  /** Updates only the access/refresh tokens — used after a silent
   * refresh, where the user's own claims haven't changed. */
  setTokens: (tokens: AuthTokens) => void;
  clear: () => void;
  isAuthenticated: () => boolean;
  hasPermission: (permission: string) => boolean;
}

/** Persisted to `localStorage` (via zustand's own `persist` middleware) —
 * the standard tradeoff for a JWT stored client-side rather than an
 * httpOnly cookie: readable by any script on the page (a real XSS risk
 * this admin console accepts, matching the platform's existing
 * `apps/web` pattern rather than introducing a second, inconsistent
 * auth storage strategy for one app). */
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,

      setSession: (tokens, user) => set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, user }),

      setTokens: (tokens) => set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }),

      clear: () => set({ accessToken: null, refreshToken: null, user: null }),

      isAuthenticated: () => get().accessToken !== null,

      hasPermission: (permission) => get().user?.permissions.includes(permission) ?? false,
    }),
    { name: "rmsm-admin-auth" },
  ),
);
