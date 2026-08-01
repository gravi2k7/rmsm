import { Injectable } from "@nestjs/common";
import { toInputJsonValue } from "@rmsm/shared";
import { prisma, PlatformSetting, DbClient } from "@rmsm/database";

export interface UpsertPlatformSettingInput {
  key: string;
  value: unknown;
  category: string;
  description?: string;
  updatedById?: string;
}

@Injectable()
export class PlatformSettingRepository {
  findByKey(key: string, client: DbClient = prisma): Promise<PlatformSetting | null> {
    return client.platformSetting.findUnique({ where: { key } });
  }

  findAll(category: string | undefined, client: DbClient = prisma): Promise<PlatformSetting[]> {
    return client.platformSetting.findMany({
      where: category ? { category } : undefined,
      orderBy: { key: "asc" },
    });
  }

  upsert(data: UpsertPlatformSettingInput, client: DbClient = prisma): Promise<PlatformSetting> {
    return client.platformSetting.upsert({
      where: { key: data.key },
      create: {
        key: data.key,
        value: toInputJsonValue(data.value as object),
        category: data.category,
        description: data.description,
        updatedById: data.updatedById,
      },
      update: {
        value: toInputJsonValue(data.value as object),
        category: data.category,
        description: data.description,
        updatedById: data.updatedById,
      },
    });
  }

  delete(key: string, client: DbClient = prisma): Promise<PlatformSetting> {
    return client.platformSetting.delete({ where: { key } });
  }
}
