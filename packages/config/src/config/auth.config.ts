import { loadConfig } from "../env/env.loader";
import type { Env } from "../env/env.validator";

export interface AuthConfig {
  readonly jwt: {
    readonly accessSecret: string;
    readonly refreshSecret: string;
    readonly accessTtl: string;
    readonly refreshTtl: string;
  };
  readonly accountLockout: {
    readonly maxAttempts: number;
    readonly durationMs: number;
  };
  readonly password: {
    readonly minLength: number;
    readonly resetTtlMs: number;
  };
  readonly emailVerificationTtlMs: number;
  readonly twoFactor: {
    readonly encryptionKey: string;
    readonly issuer: string;
  };
  readonly cookieSecret: string;
  readonly oauth: {
    readonly google: { readonly clientId?: string; readonly clientSecret?: string; readonly callbackUrl?: string };
    readonly github: { readonly clientId?: string; readonly clientSecret?: string; readonly callbackUrl?: string };
    readonly microsoft: { readonly clientId?: string; readonly clientSecret?: string; readonly callbackUrl?: string };
  };
  readonly email: {
    readonly provider: "console" | "smtp" | "resend";
    readonly from: string;
    readonly smtp: {
      readonly host?: string;
      readonly port?: number;
      readonly user?: string;
      readonly password?: string;
    };
  };
}

export function getAuthConfig(env: Env = loadConfig()): AuthConfig {
  return {
    jwt: {
      accessSecret: env.JWT_ACCESS_SECRET,
      refreshSecret: env.JWT_REFRESH_SECRET,
      accessTtl: env.JWT_ACCESS_TTL,
      refreshTtl: env.JWT_REFRESH_TTL,
    },
    accountLockout: {
      maxAttempts: env.ACCOUNT_LOCKOUT_MAX_ATTEMPTS,
      durationMs: env.ACCOUNT_LOCKOUT_DURATION_MS,
    },
    password: {
      minLength: env.PASSWORD_MIN_LENGTH,
      resetTtlMs: env.PASSWORD_RESET_TTL_MS,
    },
    emailVerificationTtlMs: env.EMAIL_VERIFICATION_TTL_MS,
    twoFactor: {
      encryptionKey: env.TWO_FACTOR_ENCRYPTION_KEY,
      issuer: env.TWO_FACTOR_ISSUER,
    },
    cookieSecret: env.COOKIE_SECRET,
    oauth: {
      google: {
        clientId: env.OAUTH_GOOGLE_CLIENT_ID,
        clientSecret: env.OAUTH_GOOGLE_CLIENT_SECRET,
        callbackUrl: env.OAUTH_GOOGLE_CALLBACK_URL,
      },
      github: {
        clientId: env.OAUTH_GITHUB_CLIENT_ID,
        clientSecret: env.OAUTH_GITHUB_CLIENT_SECRET,
        callbackUrl: env.OAUTH_GITHUB_CALLBACK_URL,
      },
      microsoft: {
        clientId: env.OAUTH_MICROSOFT_CLIENT_ID,
        clientSecret: env.OAUTH_MICROSOFT_CLIENT_SECRET,
        callbackUrl: env.OAUTH_MICROSOFT_CALLBACK_URL,
      },
    },
    email: {
      provider: env.EMAIL_PROVIDER,
      from: env.EMAIL_FROM,
      smtp: {
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        user: env.SMTP_USER,
        password: env.SMTP_PASSWORD,
      },
    },
  };
}
