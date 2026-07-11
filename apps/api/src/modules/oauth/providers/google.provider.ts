import { Inject, Injectable } from "@nestjs/common";
import { APP_CONFIG } from "../../../config/app-config.module";
import type { Env } from "@rmsm/config";
import { OAuthProfile, OAuthProviderStrategy } from "./oauth-provider.interface";

@Injectable()
export class GoogleOAuthProvider extends OAuthProviderStrategy {
  readonly name = "GOOGLE" as const;

  constructor(@Inject(APP_CONFIG) private readonly config: Env) {
    super();
  }

  get enabled(): boolean {
    return Boolean(this.config.OAUTH_GOOGLE_CLIENT_ID && this.config.OAUTH_GOOGLE_CLIENT_SECRET);
  }

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.OAUTH_GOOGLE_CLIENT_ID ?? "",
      redirect_uri: this.config.OAUTH_GOOGLE_CALLBACK_URL ?? "",
      response_type: "code",
      scope: "openid email profile",
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async exchangeCodeForProfile(code: string): Promise<OAuthProfile> {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: this.config.OAUTH_GOOGLE_CLIENT_ID ?? "",
        client_secret: this.config.OAUTH_GOOGLE_CLIENT_SECRET ?? "",
        redirect_uri: this.config.OAUTH_GOOGLE_CALLBACK_URL ?? "",
        grant_type: "authorization_code",
      }),
    });
    const tokens = (await tokenRes.json()) as { access_token: string };

    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = (await profileRes.json()) as {
      id: string;
      email: string;
      name?: string;
      picture?: string;
    };

    return {
      providerAccountId: profile.id,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.picture,
    };
  }
}
