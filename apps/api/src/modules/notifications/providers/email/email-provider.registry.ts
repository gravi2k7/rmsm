import { Injectable } from "@nestjs/common";
import { ValidationError } from "@rmsm/shared";
import type { EmailProviderType } from "@rmsm/database";
import { EmailProviderAdapter } from "../../interfaces/providers/email-provider.interface";
import { EmailProviderRepository } from "../../repositories/email-provider.repository";
import { ProviderFactory } from "../provider-factory";

/**
 * Async by design (Phase 1 interface correction — see
 * notification-infra.service.interface.ts's comment): resolving "the
 * SendGrid adapter for organization X" is a database lookup for that
 * org's `EmailProvider` row before it's an adapter construction. Falls
 * back to the platform default (organizationId = null row) when an
 * organization hasn't configured its own instance of a given provider
 * type — same nullable-scope-means-platform-default convention as every
 * other Module 005 config table.
 *
 * No caching in this phase — every call re-decrypts credentials and
 * constructs a fresh adapter. Flagged explicitly as a real, intentional
 * scope boundary (not a correctness gap): request-scoped or TTL-based
 * adapter caching is a legitimate Phase 2c/3 performance follow-up once
 * this is running against real traffic, not guessed at speculatively
 * here.
 */
@Injectable()
export class EmailProviderRegistry {
  constructor(
    private readonly repository: EmailProviderRepository,
    private readonly factory: ProviderFactory,
  ) {}

  async get(organizationId: string | null, type: EmailProviderType): Promise<EmailProviderAdapter> {
    const row =
      (organizationId ? await this.repository.findByOrgAndType(organizationId, type) : null) ??
      (await this.repository.findByOrgAndType(null, type));
    if (!row) {
      throw new ValidationError(`Email provider "${type}" is not configured${organizationId ? " for this organization or the platform" : ""}.`);
    }
    return this.factory.createEmailAdapter(row.type, row.credentialsEnc);
  }

  async getDefault(organizationId: string | null): Promise<EmailProviderAdapter> {
    const row = (organizationId ? await this.repository.findDefault(organizationId) : null) ?? (await this.repository.findDefault(null));
    if (!row) {
      throw new ValidationError("No default email provider is configured for this organization or the platform.");
    }
    return this.factory.createEmailAdapter(row.type, row.credentialsEnc);
  }

  async listEnabled(organizationId: string | null): Promise<EmailProviderType[]> {
    const orgRows = organizationId ? await this.repository.findByOrganization(organizationId) : [];
    const platformRows = await this.repository.findPlatformProviders();
    return [...new Set([...orgRows, ...platformRows].map((r) => r.type))];
  }
}
