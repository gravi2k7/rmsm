import { Injectable } from "@nestjs/common";
import { prisma, OAuthProvider as OAuthProviderEnum } from "@rmsm/database";
import { AuthService, AuthTokens, RequestContext } from "../auth/auth.service";
import { AuditService } from "../auth/services/audit.service";
import { UserRepository } from "../auth/repositories/user.repository";
import type { OAuthProfile } from "./providers/oauth-provider.interface";

@Injectable()
export class OAuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly authService: AuthService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Finds an existing OAuthAccount link, or links/creates a user by email,
   * then issues a normal session — from the rest of the system's
   * perspective, an OAuth login is indistinguishable from a password login
   * once this resolves.
   */
  async handleCallback(
    providerName: string,
    profile: OAuthProfile,
    ctx: RequestContext,
  ): Promise<{ tokens: AuthTokens; sessionId: string }> {
    const provider = providerName.toUpperCase() as OAuthProviderEnum;

    const existingLink = await prisma.oAuthAccount.findUnique({
      where: { provider_providerAccountId: { provider, providerAccountId: profile.providerAccountId } },
    });

    let userId: string;

    if (existingLink) {
      userId = existingLink.userId;
    } else {
      const existingUser = await this.userRepository.findByEmail(profile.email);
      if (existingUser) {
        userId = existingUser.id;
      } else {
        const created = await this.userRepository.create({ email: profile.email, passwordHash: null });
        await this.userRepository.update(created.id, { status: "ACTIVE", emailVerifiedAt: new Date() });
        userId = created.id;
      }
      await prisma.oAuthAccount.create({
        data: { userId, provider, providerAccountId: profile.providerAccountId },
      });
      await this.auditService.log("oauth.account_linked", {
        userId,
        entityType: "OAuthAccount",
        metadata: { provider },
      });
    }

    return this.authService.issueSession(userId, ctx);
  }
}
