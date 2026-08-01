import { Inject, Injectable } from "@nestjs/common";
import { randomBytes, createHash } from "crypto";
import { prisma, UserWithProfile, LoginHistory } from "@rmsm/database";
import { AppError, NotFoundError, UnauthorizedError, ValidationError } from "@rmsm/shared";
import { APP_CONFIG } from "../../config/app-config.module";
import type { Env } from "@rmsm/config";
import { UserRepository } from "./repositories/user.repository";
import { SessionRepository } from "./repositories/session.repository";
import { RefreshTokenRepository } from "./repositories/refresh-token.repository";
import { PasswordService } from "./services/password.service";
import { TokenService, AccessTokenPayload } from "./services/token.service";
import { TwoFactorService } from "./services/two-factor.service";
import { AuditService } from "./services/audit.service";
import { EmailService } from "../email/email.service.interface";
import { DomainEventPublisher } from "../../common/events/domain-event-publisher.service";
import { AUTH_EVENTS } from "./events";
import {
  verificationEmail,
  passwordResetEmail,
  welcomeEmail,
  securityAlertEmail,
} from "../email/templates/auth.templates";

export interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
}

/** WM-020B — input shape for `AuthService.register()`. `firstName`/
 * `lastName` optional to stay backward compatible with the pre-existing
 * email/password-only registration path (see `RegisterDto`). */
export interface RegisterInput {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  /** WM-020D — organization name override; see RegisterDto's own comment. */
  companyName?: string;
  /** WM-020E — see RegisterDto's own comment. */
  invitationToken?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly twoFactorService: TwoFactorService,
    private readonly auditService: AuditService,
    private readonly emailService: EmailService,
    private readonly eventPublisher: DomainEventPublisher,
    @Inject(APP_CONFIG) private readonly config: Env,
  ) {}

  // ── Registration ────────────────────────────────────────────────────

  /**
   * WM-020B — extended for the enterprise `/signup` trial-request flow.
   * `firstName`/`lastName` (optional — see `RegisterDto`'s own doc
   * comment) are persisted onto the user's `Profile`; everything else
   * (password hashing/policy, User row, email-verification issuance,
   * audit logging) is exactly Module 002's existing registration path,
   * reused rather than duplicated.
   *
   * WM-020B Part "Error Handling" — duplicate email now returns a real
   * 400 (`EMAIL_ALREADY_EXISTS`) instead of the prior silent-success
   * anti-enumeration response. That older behavior was never exercised by
   * any existing test or caller (checked before changing it): this
   * endpoint had zero frontend callers until WM-020A/B. A clear "email
   * already registered" error is standard, expected UX for a public B2B
   * trial-signup form, where the previous consumer-auth-style enumeration
   * defense wasn't actually serving a caller that needed it.
   */
  async register(input: RegisterInput, ctx: RequestContext): Promise<{ message: string }> {
    const { email, password, firstName, lastName, companyName, invitationToken } = input;

    const existing = await this.userRepository.findByEmail(email);
    if (existing) {
      throw new AppError("An account with this email already exists.", "EMAIL_ALREADY_EXISTS", 400);
    }

    const passwordHash = await this.passwordService.hash(password);
    const user = await this.userRepository.create({ email, passwordHash, firstName, lastName });

    await this.issueEmailVerification(user.id, email, { companyName, invitationToken });
    await this.auditService.log("user.registered", { userId: user.id, ...ctx });

    return { message: "If that email is available, an account has been created." };
  }

  /**
   * WM-020D/E — `companyName`/`invitationToken` (both optional) are
   * round-tripped through the verification link as query params rather
   * than persisted anywhere, so OnboardingService (a separate module —
   * see its own file for why it isn't injected here directly) can read
   * them back off the `/verify-email` page's URL without a schema change
   * or a new holding table for state that's only needed once, briefly,
   * between these two requests.
   */
  private async issueEmailVerification(
    userId: string,
    email: string,
    opts: { companyName?: string; invitationToken?: string } = {},
  ): Promise<void> {
    const raw = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(raw).digest("hex");
    await prisma.emailVerification.create({
      data: {
        userId,
        tokenHash,
        expiresAt: new Date(Date.now() + this.config.EMAIL_VERIFICATION_TTL_MS),
      },
    });
    const params = new URLSearchParams({ token: raw });
    if (opts.companyName) params.set("companyName", opts.companyName);
    if (opts.invitationToken) params.set("invitationToken", opts.invitationToken);
    const link = `${this.config.WEB_APP_URL}/verify-email?${params.toString()}`;
    const { subject, html } = verificationEmail(link);
    await this.emailService.send({ to: email, subject, html });
  }

  /**
   * WM-020F — this is the single source of truth for validating and
   * consuming an email-verification token. It now also returns the
   * verified user's id: OnboardingService (a separate module that
   * orchestrates what happens right after verification — organization
   * auto-creation or invitation acceptance) needs to know which user was
   * just verified, and the only correct way to get that is from this
   * method's own lookup, since it's the one place that already resolves
   * and validates the token record. There is deliberately no separate
   * "resolve the token first" helper on this service — that would be a
   * second, independent token-hash lookup living outside the single
   * validation path, duplicating the expiry/reuse checks below and
   * risking drift between the two. Callers that only need the message
   * (e.g. AuthController's public `/auth/verify-email` HTTP response)
   * simply ignore the extra field — this is a non-breaking, additive
   * change to the return shape, not a new API surface.
   */
  async verifyEmail(rawToken: string): Promise<{ message: string; userId: string }> {
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const record = await prisma.emailVerification.findUnique({ where: { tokenHash } });
    if (!record || record.verifiedAt || record.expiresAt < new Date()) {
      throw new ValidationError("Invalid or expired verification token.");
    }

    await prisma.$transaction([
      prisma.emailVerification.update({ where: { id: record.id }, data: { verifiedAt: new Date() } }),
      prisma.user.update({
        where: { id: record.userId },
        data: { status: "ACTIVE", emailVerifiedAt: new Date() },
      }),
    ]);

    const user = await this.userRepository.findById(record.userId);
    if (user) {
      const { subject, html } = welcomeEmail();
      await this.emailService.send({ to: user.email, subject, html });
    }
    await this.auditService.log("user.email_verified", { userId: record.userId });

    return { message: "Email verified successfully.", userId: record.userId };
  }

  /**
   * WM-020C — re-issues a verification email for accounts that haven't
   * completed WM-020B's registration verification step yet. Reuses
   * `issueEmailVerification()` (register()'s own helper) rather than
   * duplicating token generation/hashing/email-send logic.
   *
   * Same anti-enumeration shape as `forgotPassword()` — always returns an
   * identical generic message, and does nothing observable if the email
   * doesn't exist or the account is already verified, so this endpoint
   * can't be used to probe which addresses are registered.
   *
   * Any outstanding (unverified, unexpired) tokens from a previous
   * request are deleted first, so at most one verification token is ever
   * valid for a given user — otherwise an earlier resend's token would
   * remain independently redeemable after a later one, since
   * `verifyEmail()` checks the token *record's* own `verifiedAt`, not a
   * user-level "already verified" flag.
   */
  async resendVerification(email: string): Promise<{ message: string }> {
    const user = await this.userRepository.findByEmail(email);
    if (user && !user.emailVerifiedAt) {
      await prisma.emailVerification.deleteMany({ where: { userId: user.id, verifiedAt: null } });
      await this.issueEmailVerification(user.id, user.email);
      await this.auditService.log("user.verification_resent", { userId: user.id });
    }
    return { message: "If that account exists and needs verification, a new link has been sent." };
  }

  // ── Credential validation (used by LocalStrategy) ───────────────────

  async validateCredentials(
    email: string,
    password: string,
    ctx: RequestContext = {},
  ): Promise<UserWithProfile | null> {
    const user = await this.userRepository.findByEmail(email);

    if (!user || !user.passwordHash) {
      await this.recordLoginAttempt(null, email, false, "invalid_credentials", ctx);
      return null;
    }

    if (user.status === "LOCKED" && user.lockedUntil && user.lockedUntil > new Date()) {
      await this.recordLoginAttempt(user.id, email, false, "account_locked", ctx);
      throw new UnauthorizedError(
        `Account temporarily locked due to repeated failed login attempts. Try again later.`,
      );
    }

    if (user.status === "DELETED" || user.status === "SUSPENDED") {
      await this.recordLoginAttempt(user.id, email, false, "account_unavailable", ctx);
      throw new UnauthorizedError("This account is not available.");
    }

    const valid = await this.passwordService.verify(user.passwordHash, password);
    if (!valid) {
      const updated = await this.userRepository.incrementFailedAttempts(user.id);
      if (updated.failedLoginAttempts >= this.config.ACCOUNT_LOCKOUT_MAX_ATTEMPTS) {
        await this.userRepository.lock(
          user.id,
          new Date(Date.now() + this.config.ACCOUNT_LOCKOUT_DURATION_MS),
        );
        const { subject, html } = securityAlertEmail("Account locked after repeated failed logins", ctx.ipAddress);
        await this.emailService.send({ to: user.email, subject, html });
      }
      await this.recordLoginAttempt(user.id, email, false, "invalid_credentials", ctx);
      return null;
    }

    await this.userRepository.resetFailedAttempts(user.id);
    return user;
  }

  private recordLoginAttempt(
    userId: string | null,
    email: string,
    success: boolean,
    reason: string,
    ctx: RequestContext,
  ): Promise<LoginHistory> {
    return prisma.loginHistory.create({
      data: { userId, email, success, reason, ipAddress: ctx.ipAddress, userAgent: ctx.userAgent },
    });
  }

  // ── Login / token issuance ──────────────────────────────────────────

  /**
   * Second stage of login, called by the controller after LocalStrategy
   * (and, if enabled, 2FA verification) succeed. Creates a session +
   * initial refresh-token family and returns signed tokens.
   */
  async issueSession(
    userId: string,
    ctx: RequestContext,
  ): Promise<{ tokens: AuthTokens; sessionId: string }> {
    const userWithRoles = await this.userRepository.findByIdWithRoles(userId);
    if (!userWithRoles) throw new NotFoundError("User");

    const { roles, permissions } = this.extractRolesAndPermissions(userWithRoles);

    const session = await this.sessionRepository.create({
      userId,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      expiresAt: this.tokenService.refreshTokenExpiry(),
    });

    const tokens = await this.mintTokenPair(userId, session.id, roles, permissions, this.tokenService.newTokenFamily());

    await this.userRepository.update(userId, { lastLoginAt: new Date() });
    await this.recordLoginAttempt(userId, userWithRoles.email, true, "success", ctx);
    await this.auditService.log("user.login", { userId, entityType: "Session", entityId: session.id, ...ctx });
    this.eventPublisher.publish(AUTH_EVENTS.SESSION_CREATED, { sessionId: session.id, userId });

    return { tokens, sessionId: session.id };
  }

  /**
   * Extracts role names and deduplicated permission keys from a user
   * fetched via UserRepository.findByIdWithRoles(). Centralized here so
   * issueSession() and refresh() never drift from each other's logic.
   */
  private extractRolesAndPermissions(userWithRoles: NonNullable<
    Awaited<ReturnType<UserRepository["findByIdWithRoles"]>>
  >): { roles: string[]; permissions: string[] } {
    const roles = userWithRoles.userRoles.map((ur) => ur.role.name);
    const permissions = [
      ...new Set(
        userWithRoles.userRoles.flatMap((ur) =>
          ur.role.rolePermissions.map((rp) => rp.permission.key),
        ),
      ),
    ];
    return { roles, permissions };
  }

  private async mintTokenPair(
    userId: string,
    sessionId: string,
    roles: string[],
    permissions: string[],
    family: string,
  ): Promise<AuthTokens> {
    const userForEmail = await this.userRepository.findById(userId);
    const payload: AccessTokenPayload = {
      sub: userId,
      email: userForEmail!.email,
      roles,
      permissions,
      sessionId,
    };
    const accessToken = this.tokenService.signAccessToken(payload);
    const { raw, hash } = this.tokenService.generateRefreshToken();

    await this.refreshTokenRepository.create({
      userId,
      sessionId,
      tokenHash: hash,
      family,
      expiresAt: this.tokenService.refreshTokenExpiry(),
    });

    return { accessToken, refreshToken: raw, expiresIn: this.config.JWT_ACCESS_TTL };
  }

  // ── Refresh rotation (with reuse detection) ─────────────────────────

  async refresh(rawRefreshToken: string, ctx: RequestContext): Promise<AuthTokens> {
    const hash = this.tokenService.hashToken(rawRefreshToken);
    const existing = await this.refreshTokenRepository.findByHash(hash);

    if (!existing) throw new UnauthorizedError("Invalid refresh token.");

    if (existing.revokedAt) {
      // Reuse of an already-rotated/revoked token = likely theft. Revoke
      // the entire rotation family and force re-authentication everywhere.
      await this.refreshTokenRepository.revokeFamily(existing.family);
      await this.auditService.log("auth.refresh_token_reuse_detected", {
        userId: existing.userId,
        entityType: "RefreshToken",
        entityId: existing.id,
        ...ctx,
      });
      throw new UnauthorizedError("Refresh token has already been used. All sessions revoked for safety.");
    }

    if (existing.expiresAt < new Date()) {
      throw new UnauthorizedError("Refresh token expired.");
    }

    const userWithRoles = await this.userRepository.findByIdWithRoles(existing.userId);
    if (!userWithRoles) throw new UnauthorizedError("User no longer exists.");

    const { roles, permissions } = this.extractRolesAndPermissions(userWithRoles);

    const tokens = await this.mintTokenPair(existing.userId, existing.sessionId, roles, permissions, existing.family);
    const newHash = this.tokenService.hashToken(tokens.refreshToken);
    const newRecord = await this.refreshTokenRepository.findByHash(newHash);
    await this.refreshTokenRepository.markRotated(existing.id, newRecord!.id);
    await this.sessionRepository.touch(existing.sessionId);

    return tokens;
  }

  // ── Logout ───────────────────────────────────────────────────────────

  async logout(userId: string, sessionId: string, rawRefreshToken?: string): Promise<void> {
    await this.sessionRepository.revoke(sessionId);
    if (rawRefreshToken) {
      const hash = this.tokenService.hashToken(rawRefreshToken);
      const token = await this.refreshTokenRepository.findByHash(hash);
      if (token) await this.refreshTokenRepository.revoke(token.id);
    }
    await this.auditService.log("user.logout", { userId, entityType: "Session", entityId: sessionId });
    this.eventPublisher.publish(AUTH_EVENTS.SESSION_REVOKED, { sessionId, userId });
  }

  // ── Password management ──────────────────────────────────────────────

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.userRepository.findByEmail(email);
    // Always respond identically whether or not the account exists.
    if (user) {
      const raw = randomBytes(32).toString("base64url");
      const tokenHash = createHash("sha256").update(raw).digest("hex");
      await prisma.passwordReset.create({
        data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + this.config.PASSWORD_RESET_TTL_MS) },
      });
      const link = `${this.config.WEB_APP_URL}/reset-password?token=${raw}`;
      const { subject, html } = passwordResetEmail(link);
      await this.emailService.send({ to: email, subject, html });
      await this.auditService.log("user.password_reset_requested", { userId: user.id });
    }
    return { message: "If that email exists, a reset link has been sent." };
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<{ message: string }> {
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const record = await prisma.passwordReset.findUnique({ where: { tokenHash } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new ValidationError("Invalid or expired reset token.");
    }

    const passwordHash = await this.passwordService.hash(newPassword);
    await prisma.$transaction([
      prisma.passwordReset.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    ]);
    await this.sessionRepository.revokeAllForUser(record.userId);
    await this.auditService.log("user.password_reset_completed", { userId: record.userId });
    this.eventPublisher.publish(AUTH_EVENTS.PASSWORD_RESET, { userId: record.userId });

    return { message: "Password has been reset. Please log in again." };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await this.userRepository.findById(userId);
    if (!user?.passwordHash) throw new ValidationError("This account has no password set.");

    const valid = await this.passwordService.verify(user.passwordHash, currentPassword);
    if (!valid) throw new UnauthorizedError("Current password is incorrect.");

    const passwordHash = await this.passwordService.hash(newPassword);
    await this.userRepository.update(userId, { passwordHash });
    await this.auditService.log("user.password_changed", { userId });

    return { message: "Password changed successfully." };
  }

  // ── Two-Factor Authentication ─────────────────────────────────────────

  async setupTwoFactor(userId: string): Promise<{ otpauthUrl: string; qrCodeDataUrl: string }> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundError("User");

    const { secret, otpauthUrl } = this.twoFactorService.generateSecret(user.email);
    const secretEnc = this.twoFactorService.encryptSecret(secret);

    await prisma.twoFactorSecret.upsert({
      where: { userId },
      update: { secretEnc, enabled: false, verifiedAt: null },
      create: { userId, secretEnc },
    });

    const qrCodeDataUrl = await this.twoFactorService.toQrCodeDataUrl(otpauthUrl);
    return { otpauthUrl, qrCodeDataUrl };
  }

  async confirmTwoFactor(
    userId: string,
    code: string,
  ): Promise<{ message: string; recoveryCodes: string[] }> {
    const record = await prisma.twoFactorSecret.findUnique({ where: { userId } });
    if (!record) throw new ValidationError("2FA setup has not been started.");

    const secret = this.twoFactorService.decryptSecret(record.secretEnc);
    if (!this.twoFactorService.verifyToken(secret, code)) {
      throw new ValidationError("Invalid verification code.");
    }

    await prisma.twoFactorSecret.update({
      where: { userId },
      data: { enabled: true, verifiedAt: new Date() },
    });

    const { raw, hashes } = this.twoFactorService.generateRecoveryCodes();
    await prisma.recoveryCode.createMany({
      data: hashes.map((codeHash) => ({ userId, codeHash })),
    });
    await this.auditService.log("user.two_factor_enabled", { userId });

    return { message: "2FA enabled.", recoveryCodes: raw };
  }

  async disableTwoFactor(userId: string, password: string): Promise<{ message: string }> {
    const user = await this.userRepository.findById(userId);
    if (!user?.passwordHash || !(await this.passwordService.verify(user.passwordHash, password))) {
      throw new UnauthorizedError("Password confirmation failed.");
    }
    await prisma.twoFactorSecret.deleteMany({ where: { userId } });
    await prisma.recoveryCode.deleteMany({ where: { userId } });
    await this.auditService.log("user.two_factor_disabled", { userId });
    return { message: "2FA disabled." };
  }

  /** Returns true if the code matches the user's TOTP secret OR an unused recovery code (which is then consumed). */
  async verifyTwoFactorForLogin(userId: string, code: string): Promise<boolean> {
    const record = await prisma.twoFactorSecret.findUnique({ where: { userId } });
    if (!record?.enabled) return true; // 2FA not enabled — nothing to check

    const secret = this.twoFactorService.decryptSecret(record.secretEnc);
    if (this.twoFactorService.verifyToken(secret, code)) return true;

    const codeHash = this.twoFactorService.hashRecoveryCode(code);
    const recovery = await prisma.recoveryCode.findFirst({ where: { userId, codeHash, usedAt: null } });
    if (recovery) {
      await prisma.recoveryCode.update({ where: { id: recovery.id }, data: { usedAt: new Date() } });
      await this.auditService.log("user.recovery_code_used", { userId });
      return true;
    }

    return false;
  }

  async isTwoFactorEnabled(userId: string): Promise<boolean> {
    const record = await prisma.twoFactorSecret.findUnique({ where: { userId } });
    return Boolean(record?.enabled);
  }
}
