import { Inject, Injectable } from "@nestjs/common";
import { APP_CONFIG } from "../../../config/app-config.module";
import type { Env } from "@rmsm/config";
import { OAuthProfile, OAuthProviderStrategy } from "./oauth-provider.interface";

@Injectable()
export class GitHubOAuthProvider extends OAuthProviderStrategy {
  readonly name = "GITHUB" as const;

  constructor(@Inject(APP_CONFIG) private readonly config: Env) {
    super();
  }

  get enabled(): boolean {
    return Boolean(this.config.OAUTH_GITHUB_CLIENT_ID && this.config.OAUTH_GITHUB_CLIENT_SECRET);
  }

  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.OAUTH_GITHUB_CLIENT_ID ?? "",
      redirect_uri: this.config.OAUTH_GITHUB_CALLBACK_URL ?? "",
      scope: "read:user user:email",
      state,
    });
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  async exchangeCodeForProfile(code: string): Promise<OAuthProfile> {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        code,
        client_id: this.config.OAUTH_GITHUB_CLIENT_ID ?? "",
        client_secret: this.config.OAUTH_GITHUB_CLIENT_SECRET ?? "",
        redirect_uri: this.config.OAUTH_GITHUB_CALLBACK_URL ?? "",
      }),
    });
    const tokens = (await tokenRes.json()) as { access_token: string };

    const profileRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = (await profileRes.json()) as {
      id: number;
      login: string;
      email: string | null;
      avatar_url?: string;
    };

    let email = profile.email;
    if (!email) {
      const emailsRes = await fetch("https://api.github.com/user/emails", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const emails = (await emailsRes.json()) as { email: string; primary: boolean }[];
      email = emails.find((e) => e.primary)?.email ?? emails[0]?.email ?? "";
    }

    return {
      providerAccountId: String(profile.id),
      email,
      name: profile.login,
      avatarUrl: profile.avatar_url,
    };
  }
}
