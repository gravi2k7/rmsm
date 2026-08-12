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

  /**
   * Module 005 additions — Domain 1's Feature Flag Management needs
   * update (name/description) and a toggle (isEnabled), neither of which
   * existed here before (this repository was definition-only: create/
   * find). Additive methods on the existing repository, not a duplicate
   * one, per the "no duplicate repositories" rule.
   */
  update(
    id: string,
    data: { name?: string; description?: string; updatedById?: string },
    client: DbClient = prisma,
  ): Promise<FeatureFlag> {
    return client.featureFlag.update({ where: { id }, data });
  }

  setEnabled(id: string, isEnabled: boolean, updatedById: string | undefined, client: DbClient = prisma): Promise<FeatureFlag> {
    return client.featureFlag.update({ where: { id }, data: { isEnabled, updatedById } });
  }

  delete(id: string, client: DbClient = prisma): Promise<FeatureFlag> {
    return client.featureFlag.delete({ where: { id } });
  }
}
