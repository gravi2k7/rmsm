import { create } from "zustand";
import { persist, type PersistStorage } from "zustand/middleware";
import type { AuthTokens, AuthUser } from "@/types/auth";

const STORAGE_KEY = "rmsm-web-auth";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  /** Whether this session should survive the browser tab closing. When
   * `false`, the session is written to `sessionStorage` instead of
   * `localStorage` — the storage adapter below is what actually acts on
   * this flag. Defaults to `true` so a session started before the login
   * form's own default is read still persists normally. */
  rememberMe: boolean;
  /** Set when a token refresh fails outright (refresh token itself
   * expired or was revoked) rather than merely being momentarily
   * unavailable — distinct from "not authenticated yet", so the UI can
   * show a dedicated "your session has expired" dialog instead of just
   * silently bouncing to /login. */
  sessionExpired: boolean;
  setRememberMe: (rememberMe: boolean) => void;
  setSession: (tokens: AuthTokens, user: AuthUser) => void;
  /** Updates only the access/refresh tokens — used after a silent
   * refresh, where the user's own claims haven't changed. */
  setTokens: (tokens: AuthTokens) => void;
  clear: () => void;
  markSessionExpired: () => void;
  clearSessionExpired: () => void;
  isAuthenticated: () => boolean;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
}

/** The subset of AuthState that's actually written to storage — everything
 * except the action methods. Used to type both `storage` and `partialize`
 * below so they agree with each other (and with what zustand's `persist`
 * middleware itself expects), rather than typing `storage` against the
 * full `AuthState` including methods that never get persisted. */
type PersistedAuthState = Pick<AuthState, "accessToken" | "refreshToken" | "user" | "rememberMe" | "sessionExpired">;

/** Reads/writes the persisted auth slice from whichever of
 * localStorage/sessionStorage actually holds it, and writes new state to
 * `localStorage` when `rememberMe` is true, `sessionStorage` otherwise —
 * removing it from the other store so a stale copy can't be read back
 * after the fact. Same client-side-JWT-storage tradeoff `apps/admin`
 * already accepts (readable by any script on the page), plus the Remember
 * Me choice this app's own spec calls for. */
const rememberAwareStorage: PersistStorage<PersistedAuthState> = {
  getItem: (name) => {
    const raw = window.sessionStorage.getItem(name) ?? window.localStorage.getItem(name);
    return raw ? JSON.parse(raw) : null;
  },
  setItem: (name, value) => {
    const remember = (value.state as PersistedAuthState | undefined)?.rememberMe ?? true;
    const serialized = JSON.stringify(value);
    if (remember) {
      window.localStorage.setItem(name, serialized);
      window.sessionStorage.removeItem(name);
    } else {
      window.sessionStorage.setItem(name, serialized);
      window.localStorage.removeItem(name);
    }
  },
  removeItem: (name) => {
    window.localStorage.removeItem(name);
    window.sessionStorage.removeItem(name);
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      rememberMe: true,
      sessionExpired: false,

      setRememberMe: (rememberMe) => set({ rememberMe }),

      setSession: (tokens, user) => set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, user, sessionExpired: false }),

      setTokens: (tokens) => set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }),

      clear: () => set({ accessToken: null, refreshToken: null, user: null }),

      markSessionExpired: () => set({ accessToken: null, refreshToken: null, sessionExpired: true }),

      clearSessionExpired: () => set({ sessionExpired: false }),

      isAuthenticated: () => get().accessToken !== null,

      hasPermission: (permission) => get().user?.permissions.includes(permission) ?? false,

      hasRole: (role) => get().user?.roles.includes(role) ?? false,
    }),
    {
      name: STORAGE_KEY,
      storage: rememberAwareStorage,
      // sessionExpired is a one-shot in-memory signal for the current
      // page load, not something that should survive a refresh — a
      // reloaded tab with a genuinely-expired refresh token will surface
      // that the normal way (the next authenticated request 401s), not
      // by resurrecting a stale dialog.
      partialize: (state): PersistedAuthState => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        rememberMe: state.rememberMe,
        sessionExpired: false,
      }),
    },
  ),
);
