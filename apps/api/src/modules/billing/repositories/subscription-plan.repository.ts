import { Injectable } from "@nestjs/common";
import { prisma, SubscriptionPlan, SubscriptionPlanWithFeatures, DbClient } from "@rmsm/database";

export interface CreateSubscriptionPlanInput {
  key: string;
  name: string;
  description?: string;
  monthlyPriceCents: number;
  yearlyPriceCents: number;
  currency?: string;
  trialDays?: number;
  gracePeriodDays?: number;
  isVisible?: boolean;
  isActive?: boolean;
  displayOrder?: number;
}

export interface UpdateSubscriptionPlanInput {
  name?: string;
  description?: string | null;
  monthlyPriceCents?: number;
  yearlyPriceCents?: number;
  currency?: string;
  trialDays?: number;
  gracePeriodDays?: number;
  isVisible?: boolean;
  displayOrder?: number;
}

/**
 * Repository Pattern (Module 002/003 precedent): SubscriptionService
 * (Phase 3) depends on this, never on `prisma` directly. Single-table
 * (`subscription_plans` only) with an optional `client: DbClient` on every
 * method for transaction composition — same shape as every prior module's
 * repositories.
 */
@Injectable()
export class SubscriptionPlanRepository {
  create(data: CreateSubscriptionPlanInput, client: DbClient = prisma): Promise<SubscriptionPlan> {
    return client.subscriptionPlan.create({ data });
  }

  findById(id: string, client: DbClient = prisma): Promise<SubscriptionPlan | null> {
    return client.subscriptionPlan.findUnique({ where: { id } });
  }

  findByKey(key: string, client: DbClient = prisma): Promise<SubscriptionPlan | null> {
    return client.subscriptionPlan.findUnique({ where: { key } });
  }

  findByKeyWithFeatures(key: string, client: DbClient = prisma): Promise<SubscriptionPlanWithFeatures | null> {
    return client.subscriptionPlan.findUnique({
      where: { key },
      include: { planFeatures: { include: { featureFlag: true } } },
    });
  }

  /** Public plan listing (GET /billing/plans) — visible AND active only, ordered for display. */
  findVisible(client: DbClient = prisma): Promise<SubscriptionPlan[]> {
    return client.subscriptionPlan.findMany({
      where: { isVisible: true, isActive: true },
      orderBy: { displayOrder: "asc" },
    });
  }

  /** Admin listing — includes inactive/hidden plans. */
  findAll(client: DbClient = prisma): Promise<SubscriptionPlan[]> {
    return client.subscriptionPlan.findMany({ orderBy: { displayOrder: "asc" } });
  }

  update(id: string, data: UpdateSubscriptionPlanInput, client: DbClient = prisma): Promise<SubscriptionPlan> {
    return client.subscriptionPlan.update({ where: { id }, data });
  }

  setActive(id: string, isActive: boolean, client: DbClient = prisma): Promise<SubscriptionPlan> {
    return client.subscriptionPlan.update({ where: { id }, data: { isActive } });
  }
}
