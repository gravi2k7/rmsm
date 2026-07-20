export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

/** The decoded JWT access-token claims — same shape `GET /auth/me`
 * returns, and what every `@RequirePermissions()`-guarded endpoint checks
 * against server-side. This app uses `permissions` for client-side UI
 * gating (hiding actions a trader can't perform) purely as a UX
 * convenience — every mutation is still enforced server-side regardless
 * of what the UI shows. */
export interface AuthUser {
  sub: string;
  email: string;
  roles: string[];
  permissions: string[];
  sessionId: string;
}

export interface LoginResponse {
  tokens: AuthTokens;
  sessionId: string;
}

export interface RequiresTwoFactorResponse {
  requiresTwoFactor: true;
}

/** Matches `@rmsm/database`'s real `Session` Prisma model field names. */
export interface Session {
  id: string;
  userId: string;
  ipAddress: string | null;
  userAgent: string | null;
  deviceLabel: string | null;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  revokedAt: string | null;
}
