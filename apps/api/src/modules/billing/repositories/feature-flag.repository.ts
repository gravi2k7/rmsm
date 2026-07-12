import { Injectable } from "@nestjs/common";
import { prisma, FeatureFlag, FeatureType, DbClient } from "@rmsm/database";

export interface CreateFeatureFlagInput {
  key: string;
  name: string;
  description?: string;
  type: FeatureType;
}

@Injectable()
export class FeatureFlagRepository {
  create(data: CreateFeatureFlagInput, client: DbClient = prisma): Promise<FeatureFlag> {
    return client.featureFlag.create({ data });
  }

  findById(id: string, client: DbClient = prisma): Promise<FeatureFlag | null> {
    return client.featureFlag.findUnique({ where: { id } });
  }

  findByKey(key: string, client: DbClient = prisma): Promise<FeatureFlag | null> {
    return client.featureFlag.findUnique({ where: { key } });
  }

  findAll(client: DbClient = prisma): Promise<FeatureFlag[]> {
    return client.featureFlag.findMany({ orderBy: { key: "asc" } });
  }
}
