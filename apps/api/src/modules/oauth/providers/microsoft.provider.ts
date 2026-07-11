import { Inject, Injectable } from "@nestjs/common";
import { APP_CONFIG } from "../../../config/app-config.module";
import type { Env } from "@rmsm/config";
import { OAuthProfile, OAuthProviderStrategy } from "./oauth-provider.interface";

@Injectable()
export class MicrosoftOAuthProvider extends OAuthProviderStrategy {
  readonly name = "MICROSOFT" as const;

  constructor(@Inject(APP_CONFIG) private readonly config: Env) {
    super();
  }

  get enabled(): boolean {
    return Boolean(this.config.OAUTH_MICROSOFT_CLIENT_ID && this.config.OAUTH_MICROSOFT_CLIENT_SECRET);
  }

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.OAUTH_MICROSOFT_CLIENT_ID ?? "",
      redirect_uri: this.config.OAUTH_MICROSOFT_CALLBACK_URL ?? "",
      response_type: "code",
      scope: "openid email profile User.Read",
      state,
    });
    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
  }

  async exchangeCodeForProfile(code: string): Promise<OAuthProfile> {
    const tokenRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: this.config.OAUTH_MICROSOFT_CLIENT_ID ?? "",
        client_secret: this.config.OAUTH_MICROSOFT_CLIENT_SECRET ?? "",
        redirect_uri: this.config.OAUTH_MICROSOFT_CALLBACK_URL ?? "",
        grant_type: "authorization_code",
      }),
    });
    const tokens = (await tokenRes.json()) as { access_token: string };

    const profileRes = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = (await profileRes.json()) as {
      id: string;
      mail?: string;
      userPrincipalName: string;
      displayName?: string;
    };

    return {
      providerAccountId: profile.id,
      email: profile.mail ?? profile.userPrincipalName,
      name: profile.displayName,
    };
  }
}
