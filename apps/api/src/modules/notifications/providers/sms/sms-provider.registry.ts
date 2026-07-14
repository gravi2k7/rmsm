import { Injectable } from "@nestjs/common";
import { ValidationError } from "@rmsm/shared";
import type { SmsProviderType } from "@rmsm/database";
import { SmsProviderAdapter } from "../../interfaces/providers/sms-provider.interface";
import { SmsProviderRepository } from "../../repositories/sms-provider.repository";
import { ProviderFactory } from "../provider-factory";

/** Structurally identical to EmailProviderRegistry — see that file's class comment for the full reasoning (async-by-necessity, no caching yet). */
@Injectable()
export class SmsProviderRegistry {
  constructor(
    private readonly repository: SmsProviderRepository,
    private readonly factory: ProviderFactory,
  ) {}

  async get(organizationId: string | null, type: SmsProviderType): Promise<SmsProviderAdapter> {
    const row =
      (organizationId ? await this.repository.findByOrgAndType(organizationId, type) : null) ??
      (await this.repository.findByOrgAndType(null, type));
    if (!row) {
      throw new ValidationError(`SMS provider "${type}" is not configured${organizationId ? " for this organization or the platform" : ""}.`);
    }
    return this.factory.createSmsAdapter(row.type, row.credentialsEnc);
  }

  async getDefault(organizationId: string | null): Promise<SmsProviderAdapter> {
    const row = (organizationId ? await this.repository.findDefault(organizationId) : null) ?? (await this.repository.findDefault(null));
    if (!row) throw new ValidationError("No default SMS provider is configured for this organization or the platform.");
    return this.factory.createSmsAdapter(row.type, row.credentialsEnc);
  }

  async listEnabled(organizationId: string | null): Promise<SmsProviderType[]> {
    const orgRows = organizationId ? await this.repository.findByOrganization(organizationId) : [];
    const platformRows = await this.repository.findPlatformProviders();
    return [...new Set([...orgRows, ...platformRows].map((r) => r.type))];
  }
}
