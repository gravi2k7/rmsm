import { Injectable } from "@nestjs/common";
import { prisma, UsageRecord, DbClient } from "@rmsm/database";

@Injectable()
export class UsageRecordRepository {
  /**
   * All three key fields (organizationId, period, metric) are required —
   * unlike the RbacService/PermissionHelper cases, this compound unique
   * key has no nullable component, so `upsert` is the correct, safe
   * choice here (see PlanFeatureRepository's comment for the general
   * rule this follows).
   */
  incrementUsage(
    organizationId: string,
    period: Date,
    metric: string,
    amount: bigint,
    client: DbClient = prisma,
  ): Promise<UsageRecord> {
    return client.usageRecord.upsert({
      where: { organizationId_period_metric: { organizationId, period, metric } },
      update: { value: { increment: amount } },
      create: { organizationId, period, metric, value: amount },
    });
  }

  findByMetric(
    organizationId: string,
    period: Date,
    metric: string,
    client: DbClient = prisma,
  ): Promise<UsageRecord | null> {
    return client.usageRecord.findUnique({
      where: { organizationId_period_metric: { organizationId, period, metric } },
    });
  }

  findByPeriod(organizationId: string, period: Date, client: DbClient = prisma): Promise<UsageRecord[]> {
    return client.usageRecord.findMany({ where: { organizationId, period } });
  }

  /** History across multiple periods, e.g. for a usage trend chart. */
  findHistory(
    organizationId: string,
    metric: string,
    fromPeriod: Date,
    client: DbClient = prisma,
  ): Promise<UsageRecord[]> {
    return client.usageRecord.findMany({
      where: { organizationId, metric, period: { gte: fromPeriod } },
      orderBy: { period: "asc" },
    });
  }
}
