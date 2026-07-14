import { Injectable } from "@nestjs/common";
import { ValidationError } from "@rmsm/shared";
import type { PushProviderType } from "@rmsm/database";
import { PushProviderAdapter } from "../../interfaces/providers/push-provider.interface";
import { PushProviderRepository } from "../../repositories/push-provider.repository";
import { ProviderFactory } from "../provider-factory";

/** Structurally identical to EmailProviderRegistry/SmsProviderRegistry — see EmailProviderRegistry's class comment for the full reasoning. */
@Injectable()
export class PushProviderRegistry {
  constructor(
    private readonly repository: PushProviderRepository,
    private readonly factory: ProviderFactory,
  ) {}

  async get(organizationId: string | null, type: PushProviderType): Promise<PushProviderAdapter> {
    const row =
      (organizationId ? await this.repository.findByOrgAndType(organizationId, type) : null) ??
      (await this.repository.findByOrgAndType(null, type));
    if (!row) {
      throw new ValidationError(`Push provider "${type}" is not configured${organizationId ? " for this organization or the platform" : ""}.`);
    }
    return this.factory.createPushAdapter(row.type, row.credentialsEnc);
  }

  async getDefault(organizationId: string | null): Promise<PushProviderAdapter> {
    const row = (organizationId ? await this.repository.findDefault(organizationId) : null) ?? (await this.repository.findDefault(null));
    if (!row) throw new ValidationError("No default push provider is configured for this organization or the platform.");
    return this.factory.createPushAdapter(row.type, row.credentialsEnc);
  }

  async listEnabled(organizationId: string | null): Promise<PushProviderType[]> {
    const orgRows = organizationId ? await this.repository.findByOrganization(organizationId) : [];
    const platformRows = await this.repository.findPlatformProviders();
    return [...new Set([...orgRows, ...platformRows].map((r) => r.type))];
  }
}
