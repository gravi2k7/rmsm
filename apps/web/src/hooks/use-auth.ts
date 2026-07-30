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

/**
 * WM-020C — verifies the token from a `/verify-email?token=...` link
 * (see the WM-020B `register()` flow, which is what issues it).
 *
 * Superseded as of WM-020D by `useCompleteOnboarding()` for the actual
 * `/verify-email` page, which needs the richer organization/workspace
 * result — kept here, unchanged, since `/auth/verify-email` itself still
 * exists as a plain verification endpoint for any other caller.
 */
export function useVerifyEmail() {
  return useMutation({
    mutationFn: (token: string) => api.post<{ message: string }>("/auth/verify-email", { token }, { skipAuth: true }),
  });
}

export type OnboardingSource = "invitation_accepted" | "existing_membership" | "created";

export interface OnboardingResult {
  message: string;
  organizationId: string;
  organizationName: string;
  role: string;
  source: OnboardingSource;
}

/**
 * WM-020D/E — verifies email and completes onboarding in one call:
 * accepts a pending invitation if `invitationToken` is present (carried
 * through from the invite link via registration — see `useRegister()`),
 * otherwise auto-creates the trader's first organization and assigns
 * them Owner. `companyName`/`invitationToken` are read straight off the
 * `/verify-email` page's own URL, since that's where the backend embeds
 * them (see `AuthService.issueEmailVerification()`).
 */
export function useCompleteOnboarding() {
  return useMutation({
    mutationFn: (payload: { token: string; invitationToken?: string; companyName?: string }) =>
      api.post<OnboardingResult>("/onboarding/verify-email", payload, { skipAuth: true }),
  });
}

/**
 * WM-020C — re-sends the verification email. Same anti-enumeration
 * contract as `useForgotPassword()`: the backend always returns an
 * identical generic message regardless of whether the account exists or
 * is already verified.
 */
export function useResendVerification() {
  return useMutation({
    mutationFn: (email: string) => api.post<{ message: string }>("/auth/resend-verification", { email }, { skipAuth: true }),
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
  /** WM-020D — optional; falls back to "<firstName>'s Organization" server-side when omitted. */
  companyName?: string;
  /** WM-020E — set when this signup started from an invitation link, so OnboardingService accepts that invitation instead of creating a new organization. */
  invitationToken?: string;
}

export function useRegister() {
  return useMutation({
    mutationFn: (payload: RegisterPayload) => api.post<{ message: string }>("/auth/register", payload, { skipAuth: true }),
  });
}
