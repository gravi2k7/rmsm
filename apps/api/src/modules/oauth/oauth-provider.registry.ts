import { Injectable } from "@nestjs/common";
import { ValidationError } from "@rmsm/shared";
import { GoogleOAuthProvider } from "./providers/google.provider";
import { GitHubOAuthProvider } from "./providers/github.provider";
import { MicrosoftOAuthProvider } from "./providers/microsoft.provider";
import { OAuthProviderStrategy } from "./providers/oauth-provider.interface";

/**
 * Registry mapping a provider name to its strategy implementation.
 * Adding provider #4 (e.g. Apple, LinkedIn) means: write a class
 * implementing OAuthProviderStrategy, list it in `providers` below.
 * No controller, service, or DTO changes required.
 */
@Injectable()
export class OAuthProviderRegistry {
  private readonly providers: Map<string, OAuthProviderStrategy>;

  constructor(google: GoogleOAuthProvider, github: GitHubOAuthProvider, microsoft: MicrosoftOAuthProvider) {
    this.providers = new Map<string, OAuthProviderStrategy>([
      [google.name, google],
      [github.name, github],
      [microsoft.name, microsoft],
    ]);
  }

  get(name: string): OAuthProviderStrategy {
    const provider = this.providers.get(name.toUpperCase());
    if (!provider) throw new ValidationError(`Unknown OAuth provider "${name}".`);
    if (!provider.enabled) {
      throw new ValidationError(`OAuth provider "${name}" is not configured on this environment.`);
    }
    return provider;
  }

  listEnabled(): string[] {
    return [...this.providers.values()].filter((p) => p.enabled).map((p) => p.name);
  }
}
