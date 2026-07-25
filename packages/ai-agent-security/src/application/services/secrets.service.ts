import type { SecretsProvider } from "../../repositories/secrets-provider.interface";
import { SecretNotFoundError } from "../../domain/errors/agent-security-domain.errors";

/** The "secrets abstraction" capability's application-layer entry
 * point — callers depend on this, never on a `SecretsProvider`
 * directly, so swapping the (currently non-existent, per this
 * codebase's "no external calls" discipline) real provider never
 * touches call sites. */
export class SecretsService {
  constructor(private readonly provider: SecretsProvider) {}

  async getSecret(name: string): Promise<string> {
    const value = await this.provider.getSecret(name);
    if (value === null) {
      throw new SecretNotFoundError(name);
    }
    return value;
  }
}
