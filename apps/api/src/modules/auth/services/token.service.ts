import { Inject, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { createHash, randomBytes, randomUUID } from "crypto";
import { APP_CONFIG } from "../../../config/app-config.module";
import type { Env } from "@rmsm/config";

export interface AccessTokenPayload {
  sub: string; // userId
  email: string;
  roles: string[];
  permissions: string[];
  sessionId: string;
}

/**
 * Handles JWT access-token signing/verification and opaque refresh-token
 * generation. Refresh tokens are random opaque strings (not JWTs) — only
 * their SHA-256 hash is ever persisted, so a database leak alone cannot be
 * used to mint new sessions.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    @Inject(APP_CONFIG) private readonly config: Env,
  ) {}

  signAccessToken(payload: AccessTokenPayload): string {
    return this.jwt.sign(payload, {
      secret: this.config.JWT_ACCESS_SECRET,
      expiresIn: this.config.JWT_ACCESS_TTL,
    });
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    return this.jwt.verify<AccessTokenPayload>(token, { secret: this.config.JWT_ACCESS_SECRET });
  }

  /** Generates a new opaque refresh token + its hash. Raw value is returned once, never stored. */
  generateRefreshToken(): { raw: string; hash: string } {
    const raw = randomBytes(48).toString("base64url");
    return { raw, hash: this.hashToken(raw) };
  }

  hashToken(raw: string): string {
    return createHash("sha256").update(raw).digest("hex");
  }

  newTokenFamily(): string {
    return randomUUID();
  }

  refreshTokenExpiry(): Date {
    return new Date(Date.now() + this.parseTtlMs(this.config.JWT_REFRESH_TTL));
  }

  private parseTtlMs(ttl: string): number {
    const match = /^(\d+)([smhd])$/.exec(ttl);
    if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7d
    const value = Number(match[1]);
    const unit = match[2] as "s" | "m" | "h" | "d" | undefined;
    const multipliers: Record<"s" | "m" | "h" | "d", number> = {
      s: 1000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
    };
    return value * (unit ? multipliers[unit] : multipliers.d);
  }
}
