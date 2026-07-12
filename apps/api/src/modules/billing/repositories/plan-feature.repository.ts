import { Injectable } from "@nestjs/common";
import { prisma, PlanFeature, PlanFeatureWithFeatureFlag, DbClient } from "@rmsm/database";

export interface UpsertPlanFeatureInput {
  planId: string;
  featureFlagId: string;
  enabled: boolean;
  limit?: number | null;
}

@Injectable()
export class PlanFeatureRepository {
  findByPlan(planId: string, client: DbClient = prisma): Promise<PlanFeatureWithFeatureFlag[]> {
    return client.planFeature.findMany({
      where: { planId },
      include: { featureFlag: true },
    });
  }

  /**
   * The join FeatureService/QuotaService (Phase 3) actually need: "does
   * plan X grant feature key Y, and if so what's the limit." Goes through
   * the FeatureFlag relation since callers only know the feature's stable
   * key, not its internal id.
   */
  findByPlanAndFeatureKey(
    planId: string,
    featureKey: string,
    client: DbClient = prisma,
  ): Promise<PlanFeatureWithFeatureFlag | null> {
    return client.planFeature.findFirst({
      where: { planId, featureFlag: { key: featureKey } },
      include: { featureFlag: true },
    });
  }

  /**
   * Not `upsert` on the [planId, featureFlagId] compound key — both
   * fields are required (non-nullable), so this compound key does NOT
   * hit the Prisma 5.22 nullable-compound-key limitation that forced
   * findFirst+create patterns elsewhere in this project (RbacService,
   * PermissionHelper). A real `upsert` is safe and used here deliberately,
   * for contrast with those other cases — the workaround pattern is only
   * needed when a key component is nullable.
   */
  upsert(input: UpsertPlanFeatureInput, client: DbClient = prisma): Promise<PlanFeature> {
    return client.planFeature.upsert({
      where: { planId_featureFlagId: { planId: input.planId, featureFlagId: input.featureFlagId } },
      update: { enabled: input.enabled, limit: input.limit },
      create: input,
    });
  }

  delete(planId: string, featureFlagId: string, client: DbClient = prisma): Promise<PlanFeature> {
    return client.planFeature.delete({
      where: { planId_featureFlagId: { planId, featureFlagId } },
    });
  }
}
