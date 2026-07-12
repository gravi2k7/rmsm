import { Injectable } from "@nestjs/common";
import {
  prisma,
  OrganizationSubscription,
  OrganizationSubscriptionWithPlan,
  SubscriptionStatus,
  PaymentProviderType,
  BillingCycle,
  DbClient,
} from "@rmsm/database";

export interface CreateOrganizationSubscriptionInput {
  organizationId: string;
  planId: string;
  status?: SubscriptionStatus;
  paymentProvider?: PaymentProviderType;
  providerSubscriptionId?: string;
  billingCycle?: BillingCycle;
  trialEndsAt?: Date;
  gracePeriodEndsAt?: Date;
  renewalDate?: Date;
}

@Injectable()
export class OrganizationSubscriptionRepository {
  create(data: CreateOrganizationSubscriptionInput, client: DbClient = prisma): Promise<OrganizationSubscription> {
    return client.organizationSubscription.create({ data });
  }

  findById(id: string, client: DbClient = prisma): Promise<OrganizationSubscription | null> {
    return client.organizationSubscription.findUnique({ where: { id } });
  }

  /** The primary lookup every billing operation starts from — "does this organization have a subscription, and what plan/status is it." */
  findByOrganizationId(
    organizationId: string,
    client: DbClient = prisma,
  ): Promise<OrganizationSubscriptionWithPlan | null> {
    return client.organizationSubscription.findUnique({
      where: { organizationId },
      include: { plan: true },
    });
  }

  updateStatus(id: string, status: SubscriptionStatus, client: DbClient = prisma): Promise<OrganizationSubscription> {
    return client.organizationSubscription.update({ where: { id }, data: { status } });
  }

  changePlan(id: string, planId: string, client: DbClient = prisma): Promise<OrganizationSubscription> {
    return client.organizationSubscription.update({ where: { id }, data: { planId } });
  }

  updateRenewalDate(id: string, renewalDate: Date, client: DbClient = prisma): Promise<OrganizationSubscription> {
    return client.organizationSubscription.update({ where: { id }, data: { renewalDate } });
  }

  cancel(id: string, cancellationDate: Date, client: DbClient = prisma): Promise<OrganizationSubscription> {
    return client.organizationSubscription.update({
      where: { id },
      data: { status: "CANCELLED", cancellationDate },
    });
  }

  setProviderSubscriptionId(
    id: string,
    providerSubscriptionId: string,
    client: DbClient = prisma,
  ): Promise<OrganizationSubscription> {
    return client.organizationSubscription.update({ where: { id }, data: { providerSubscriptionId } });
  }

  /** For a scheduled job (Phase 3+): trials ending soon, to send reminder notifications or auto-transition to PAST_DUE. */
  findTrialsEndingBefore(cutoff: Date, client: DbClient = prisma): Promise<OrganizationSubscription[]> {
    return client.organizationSubscription.findMany({
      where: { status: "TRIALING", trialEndsAt: { lte: cutoff } },
    });
  }

  /** For a scheduled job: subscriptions whose grace period has lapsed — candidates for transitioning PAST_DUE → EXPIRED. */
  findGracePeriodExpiredBefore(cutoff: Date, client: DbClient = prisma): Promise<OrganizationSubscription[]> {
    return client.organizationSubscription.findMany({
      where: { status: "PAST_DUE", gracePeriodEndsAt: { lte: cutoff } },
    });
  }
}
