import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import { useSessionStore } from "@/lib/session-store";
import type { AuthUser, LoginResponse, RequiresTwoFactorResponse } from "@/types/auth";

export interface LoginCredentials {
  email: string;
  password: string;
  twoFactorCode?: string;
}

export type LoginResult = { status: "success" } | { status: "requires-2fa" };

/**
 * `POST /auth/login` returns `{ requiresTwoFactor: true }` (no tokens yet
 * — the caller resubmits with a `twoFactorCode`) or `{ tokens,
 * sessionId }`. On success, this hook fetches `GET /auth/me` to get the
 * full claim set (roles/permissions) before considering the session
 * established — `setTokens()` first (so the `/auth/me` call itself is
 * authenticated), then `setSession()` once the trader's own claims are in
 * hand, avoiding a moment where the store holds tokens but no user.
 */
export function useLogin() {
  const setTokens = useAuthStore((s) => s.setTokens);
  const setSession = useAuthStore((s) => s.setSession);
  const bridgeLegacySessionToken = useSessionStore((s) => s.setAccessToken);

  return useMutation({
    mutationFn: async (credentials: LoginCredentials): Promise<LoginResult> => {
      const result = await api.post<LoginResponse | RequiresTwoFactorResponse>("/auth/login", credentials, { skipAuth: true });

      if ("requiresTwoFactor" in result) {
        return { status: "requires-2fa" };
      }

      setTokens(result.tokens);
      // Bridges into the pre-existing Strategy-Builder-only session store
      // — see api-client.ts's own comment on refreshAccessToken() for why.
      bridgeLegacySessionToken(result.tokens.accessToken);
      const user = await api.get<AuthUser>("/auth/me");
      setSession(result.tokens, user);
      return { status: "success" };
    },
  });
}

/** `POST /auth/logout` revokes the session server-side (so a stolen
 * refresh token can't be used after the trader explicitly logs out) — the
 * client-side `clear()` happens regardless of whether that call succeeds,
 * since the trader's own intent to log out shouldn't be blocked by a
 * network blip. */
export function useLogout() {
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const clear = useAuthStore((s) => s.clear);
  const clearLegacySession = useSessionStore((s) => s.setAccessToken);

  return useMutation({
    mutationFn: async () => {
      try {
        if (refreshToken) {
          await api.post("/auth/logout", { refreshToken });
        }
      } finally {
        clear();
        clearLegacySession(null);
      }
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => api.post<{ message: string }>("/auth/forgot-password", { email }, { skipAuth: true }),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ token, newPassword }: { token: string; newPassword: string }) =>
      api.post<{ message: string }>("/auth/reset-password", { token, newPassword }, { skipAuth: true }),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      api.post<{ message: string }>("/auth/change-password", { currentPassword, newPassword }),
  });
}

/**
 * WM-020B — enterprise trial signup. Maps the `/signup` form's fields onto
 * the backend's exact request contract: `businessEmail` -> `email`,
 * `termsAccepted` -> `acceptTerms`; `companyName`/`confirmPassword`/
 * `marketingOptIn` stay client-only (the backend milestone's request
 * contract and storage list deliberately don't include company — that's
 * deferred to a future organization-creation milestone).
 */
export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  acceptTerms: boolean;
}

export function useRegister() {
  return useMutation({
    mutationFn: (payload: RegisterPayload) => api.post<{ message: string }>("/auth/register", payload, { skipAuth: true }),
  });
}
