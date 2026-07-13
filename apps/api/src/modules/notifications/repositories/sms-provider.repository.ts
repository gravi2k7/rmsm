import { Injectable } from "@nestjs/common";
import { prisma, SmsProvider, SmsProviderType, Prisma, DbClient } from "@rmsm/database";

export interface CreateSmsProviderInput {
  organizationId?: string;
  type: SmsProviderType;
  name: string;
  credentialsEnc: string;
  fromNumber: string;
  isDefault?: boolean;
  createdById?: string;
}

/** Same shape as EmailProviderRepository — see that file's class comment for the "setDefault is two primitives, not one transactional method" reasoning, which applies identically here. */
@Injectable()
export class SmsProviderRepository {
  create(data: CreateSmsProviderInput, client: DbClient = prisma): Promise<SmsProvider> {
    return client.smsProvider.create({ data: { ...data, updatedById: data.createdById } });
  }

  findById(id: string, client: DbClient = prisma): Promise<SmsProvider | null> {
    return client.smsProvider.findFirst({ where: { id, deletedAt: null } });
  }

  findDefault(organizationId: string | null, client: DbClient = prisma): Promise<SmsProvider | null> {
    return client.smsProvider.findFirst({
      where: { organizationId, isDefault: true, isActive: true, deletedAt: null },
    });
  }

  findByOrganization(organizationId: string, client: DbClient = prisma): Promise<SmsProvider[]> {
    return client.smsProvider.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { createdAt: "asc" },
    });
  }

  /** Phase 2b addition (additive) — same reasoning as EmailProviderRepository's equivalent method. */
  /** Phase 2b addition (additive) — same reasoning as EmailProviderRepository's equivalent method. */
  findPlatformProviders(client: DbClient = prisma): Promise<SmsProvider[]> {
    return client.smsProvider.findMany({
      where: { organizationId: null, deletedAt: null },
      orderBy: { createdAt: "asc" },
    });
  }

  findByOrgAndType(organizationId: string | null, type: SmsProviderType, client: DbClient = prisma): Promise<SmsProvider | null> {
    return client.smsProvider.findFirst({
      where: { organizationId, type, isActive: true, deletedAt: null },
    });
  }

  update(
    id: string,
    data: Partial<Pick<SmsProvider, "name" | "fromNumber" | "isActive">>,
    updatedById: string | undefined,
    client: DbClient = prisma,
  ): Promise<SmsProvider> {
    return client.smsProvider.update({ where: { id }, data: { ...data, updatedById } });
  }

  unsetAllDefaults(organizationId: string | null, client: DbClient = prisma): Promise<Prisma.BatchPayload> {
    return client.smsProvider.updateMany({
      where: { organizationId, isDefault: true },
      data: { isDefault: false },
    });
  }

  setDefault(id: string, client: DbClient = prisma): Promise<SmsProvider> {
    return client.smsProvider.update({ where: { id }, data: { isDefault: true } });
  }

  softDelete(id: string, updatedById: string | undefined, client: DbClient = prisma): Promise<SmsProvider> {
    return client.smsProvider.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, updatedById },
    });
  }
}
