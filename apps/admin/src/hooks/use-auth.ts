import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAuthStore } from "@/lib/auth-store";
import type { AuthUser, LoginResponse, RequiresTwoFactorResponse } from "@/types/auth";

export interface LoginCredentials {
  email: string;
  password: string;
  twoFactorCode?: string;
}

export type LoginResult = { status: "success" } | { status: "requires-2fa" };

/**
 * `POST /auth/login` returns `{ requiresTwoFactor: true }` (no tokens
 * yet — the caller resubmits with a `twoFactorCode`) or `{ tokens,
 * sessionId }`. On success, this hook fetches `GET /auth/me` to get the
 * full claim set (roles/permissions) before considering the session
 * established — `setTokens()` first (so the `/auth/me` call itself is
 * authenticated), then `setSession()` once the user's own claims are in
 * hand, avoiding a moment where the store holds tokens but no user.
 */
export function useLogin() {
  const setTokens = useAuthStore((s) => s.setTokens);
  const setSession = useAuthStore((s) => s.setSession);

  return useMutation({
    mutationFn: async (credentials: LoginCredentials): Promise<LoginResult> => {
      const result = await api.post<LoginResponse | RequiresTwoFactorResponse>("/auth/login", credentials, { skipAuth: true });

      if ("requiresTwoFactor" in result) {
        return { status: "requires-2fa" };
      }

      setTokens(result.tokens);
      const user = await api.get<AuthUser>("/auth/me");
      setSession(result.tokens, user);
      return { status: "success" };
    },
  });
}

/** `POST /auth/logout` revokes the session server-side (so a stolen
 * refresh token can't be used after the user explicitly logs out) —
 * the client-side `clear()` happens regardless of whether that call
 * succeeds, since the user's own intent to log out shouldn't be blocked
 * by a network blip. */
export function useLogout() {
  const clear = useAuthStore((s) => s.clear);

  return useMutation({
    mutationFn: async () => {
      try {
        await api.post("/auth/logout");
      } finally {
        clear();
      }
    },
  });
}
