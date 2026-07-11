import { Controller, Get, Param, Query, Req } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { randomBytes } from "crypto";
import { OAuthProviderRegistry } from "./oauth-provider.registry";
import { OAuthService } from "./oauth.service";
import { Public } from "../auth/decorators/public.decorator";
import type { AuthTokens } from "../auth/auth.service";

@ApiTags("OAuth")
@Controller("auth/oauth")
export class OAuthController {
  constructor(
    private readonly registry: OAuthProviderRegistry,
    private readonly oauthService: OAuthService,
  ) {}

  @Public()
  @Get("providers")
  @ApiOperation({ summary: "List OAuth providers enabled on this environment." })
  listProviders(): { providers: string[] } {
    return { providers: this.registry.listEnabled() };
  }

  @Public()
  @Get(":provider/redirect")
  @ApiOperation({ summary: "Get the authorization URL to redirect the user to for the given provider." })
  redirect(@Param("provider") provider: string): { authorizationUrl: string; state: string } {
    const strategy = this.registry.get(provider);
    const state = randomBytes(16).toString("hex");
    // Production note: `state` should be persisted (e.g. in a short-lived
    // Redis key or signed cookie) and verified on callback to prevent CSRF
    // on the OAuth flow. Wiring that store is a Module 002 follow-up once
    // this architecture is approved — flagged explicitly in the module doc.
    return { authorizationUrl: strategy.getAuthorizationUrl(state), state };
  }

  @Public()
  @Get(":provider/callback")
  @ApiOperation({ summary: "OAuth provider callback — exchanges the code and issues a session." })
  async callback(
    @Param("provider") provider: string,
    @Query("code") code: string,
    @Req() req: Request,
  ): Promise<{ tokens: AuthTokens; sessionId: string }> {
    const strategy = this.registry.get(provider);
    const profile = await strategy.exchangeCodeForProfile(code);
    return this.oauthService.handleCallback(provider, profile, {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });
  }
}
