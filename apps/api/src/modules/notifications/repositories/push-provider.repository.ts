import { Injectable } from "@nestjs/common";
import { prisma, PushProvider, PushProviderType, Prisma, DbClient } from "@rmsm/database";

export interface CreatePushProviderInput {
  organizationId?: string;
  type: PushProviderType;
  name: string;
  credentialsEnc: string;
  isDefault?: boolean;
  createdById?: string;
}

/** Same shape as EmailProviderRepository/SmsProviderRepository. */
@Injectable()
export class PushProviderRepository {
  create(data: CreatePushProviderInput, client: DbClient = prisma): Promise<PushProvider> {
    return client.pushProvider.create({ data: { ...data, updatedById: data.createdById } });
  }

  findById(id: string, client: DbClient = prisma): Promise<PushProvider | null> {
    return client.pushProvider.findFirst({ where: { id, deletedAt: null } });
  }

  findDefault(organizationId: string | null, client: DbClient = prisma): Promise<PushProvider | null> {
    return client.pushProvider.findFirst({
      where: { organizationId, isDefault: true, isActive: true, deletedAt: null },
    });
  }

  findByOrganization(organizationId: string, client: DbClient = prisma): Promise<PushProvider[]> {
    return client.pushProvider.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { createdAt: "asc" },
    });
  }

  update(
    id: string,
    data: Partial<Pick<PushProvider, "name" | "isActive">>,
    updatedById: string | undefined,
    client: DbClient = prisma,
  ): Promise<PushProvider> {
    return client.pushProvider.update({ where: { id }, data: { ...data, updatedById } });
  }

  unsetAllDefaults(organizationId: string | null, client: DbClient = prisma): Promise<Prisma.BatchPayload> {
    return client.pushProvider.updateMany({
      where: { organizationId, isDefault: true },
      data: { isDefault: false },
    });
  }

  setDefault(id: string, client: DbClient = prisma): Promise<PushProvider> {
    return client.pushProvider.update({ where: { id }, data: { isDefault: true } });
  }

  softDelete(id: string, updatedById: string | undefined, client: DbClient = prisma): Promise<PushProvider> {
    return client.pushProvider.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, updatedById },
    });
  }
}
