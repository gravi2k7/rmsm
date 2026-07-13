import { Injectable } from "@nestjs/common";
import { prisma, EmailProvider, EmailProviderType, Prisma, DbClient } from "@rmsm/database";

export interface CreateEmailProviderInput {
  organizationId?: string;
  type: EmailProviderType;
  name: string;
  /// Already-encrypted — encryption happens at the service layer
  /// (Phase 2c's ProviderFactory), matching Module 002's TwoFactorService
  /// pattern. This repository never sees plaintext credentials.
  credentialsEnc: string;
  fromAddress: string;
  fromName?: string;
  isDefault?: boolean;
  createdById?: string;
}

/**
 * Repository Pattern — single-table (`email_providers`). "Set as default"
 * is deliberately exposed as two primitives (`unsetAllDefaults` +
 * `update`), not a single transactional method — composing them inside
 * one `prisma.$transaction` is EmailProviderService's job (Phase 2c),
 * matching this project's established "transaction orchestration belongs
 * in services" rule (Module 003's Decision 1, Module 004's
 * SubscriptionService).
 */
@Injectable()
export class EmailProviderRepository {
  create(data: CreateEmailProviderInput, client: DbClient = prisma): Promise<EmailProvider> {
    return client.emailProvider.create({ data: { ...data, updatedById: data.createdById } });
  }

  findById(id: string, client: DbClient = prisma): Promise<EmailProvider | null> {
    return client.emailProvider.findFirst({ where: { id, deletedAt: null } });
  }

  /** `organizationId: null` resolves the platform default. */
  findDefault(organizationId: string | null, client: DbClient = prisma): Promise<EmailProvider | null> {
    return client.emailProvider.findFirst({
      where: { organizationId, isDefault: true, isActive: true, deletedAt: null },
    });
  }

  findByOrganization(organizationId: string, client: DbClient = prisma): Promise<EmailProvider[]> {
    return client.emailProvider.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { createdAt: "asc" },
    });
  }

  update(
    id: string,
    data: Partial<Pick<EmailProvider, "name" | "fromAddress" | "fromName" | "isActive">>,
    updatedById: string | undefined,
    client: DbClient = prisma,
  ): Promise<EmailProvider> {
    return client.emailProvider.update({ where: { id }, data: { ...data, updatedById } });
  }

  unsetAllDefaults(organizationId: string | null, client: DbClient = prisma): Promise<Prisma.BatchPayload> {
    return client.emailProvider.updateMany({
      where: { organizationId, isDefault: true },
      data: { isDefault: false },
    });
  }

  setDefault(id: string, client: DbClient = prisma): Promise<EmailProvider> {
    return client.emailProvider.update({ where: { id }, data: { isDefault: true } });
  }

  softDelete(id: string, updatedById: string | undefined, client: DbClient = prisma): Promise<EmailProvider> {
    return client.emailProvider.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, updatedById },
    });
  }
}
