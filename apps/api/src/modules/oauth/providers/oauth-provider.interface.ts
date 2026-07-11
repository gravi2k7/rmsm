export interface OAuthProfile {
  providerAccountId: string;
  email: string;
  name?: string;
  avatarUrl?: string;
}

/**
 * Every OAuth provider (Google, GitHub, Microsoft, and any added later)
 * implements this exact shape. OAuthService and OAuthController depend
 * only on this interface — adding a new provider means writing one class
 * and registering it in OAuthProviderRegistry, nothing else changes.
 */
export abstract class OAuthProviderStrategy {
  abstract readonly name: "GOOGLE" | "GITHUB" | "MICROSOFT";
  abstract readonly enabled: boolean;
  abstract getAuthorizationUrl(state: string): string;
  abstract exchangeCodeForProfile(code: string): Promise<OAuthProfile>;
}
