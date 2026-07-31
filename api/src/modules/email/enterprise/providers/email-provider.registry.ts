import { Injectable } from "@nestjs/common";
import { ValidationError } from "@rmsm/shared";
import type { EmailProviderId } from "../contracts/email-platform.contracts";
import type { EmailProvider } from "./email-provider.interface";

/**
 * EM-001's own Provider Registry section: "Support registering multiple
 * providers. Only one active provider at runtime." Mirrors BR-001's
 * `BrokerRegistryService` shape (Map-based register/get/tryGet), with
 * one addition this milestone specifically asks for: `getActive()` /
 * `setActive()`, since (unlike brokers, where every registered broker
 * can be independently `enabled`) EM-001 wants exactly one provider
 * live at a time regardless of how many are registered.
 */
@Injectable()
export class EmailProviderRegistry {
  private readonly providers = new Map<EmailProviderId, EmailProvider>();
  private activeType: EmailProviderId | undefined;

  register(provider: EmailProvider): void {
    this.providers.set(provider.type, provider);
  }

  setActive(type: EmailProviderId): void {
    if (!this.providers.has(type)) {
      throw new ValidationError(`Cannot activate email provider "${type}" — it is not registered.`);
    }
    this.activeType = type;
  }

  getActive(): EmailProvider {
    if (!this.activeType) {
      throw new ValidationError("No active email provider has been set.");
    }
    const provider = this.providers.get(this.activeType);
    if (!provider) {
      throw new ValidationError(`Active email provider "${this.activeType}" is not registered.`);
    }
    return provider;
  }

  get(type: EmailProviderId): EmailProvider {
    const provider = this.providers.get(type);
    if (!provider) throw new ValidationError(`Email provider "${type}" is not registered.`);
    return provider;
  }

  tryGet(type: EmailProviderId): EmailProvider | null {
    return this.providers.get(type) ?? null;
  }

  listRegistered(): EmailProviderId[] {
    return [...this.providers.keys()];
  }
}
