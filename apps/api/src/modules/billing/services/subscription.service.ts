import { Inject, Injectable } from "@nestjs/common";
import { prisma, OrganizationSubscription, OrganizationSubscriptionWithPlan, PaymentProviderType, Prisma } from "@rmsm/database";
import { ConflictError, NotFoundError } from "@rmsm/shared";
import type { Env } from "@rmsm/config";
import { APP_CONFIG } from "../../../config/app-config.module";
import { AuditService, AuditContext } from "../../auth/services/audit.service";
import { OrganizationSubscriptionRepository } from "../repositories/organization-subscription.repository";
import { SubscriptionPlanRepository } from "../repositories/subscription-plan.repository";
import { PaymentProviderRegistry } from "../providers/payment-provider.registry";

/**
 * Owns the subscription lifecycle: creation (via a provider), plan
 * changes, cancellation. "Each organization owns exactly one subscription"
 * (ADR, Phase 1) is enforced here at the application layer — checked
 * before creating — backed by the database-level @unique on
 * OrganizationSubscription.organizationId as the defense-in-depth layer,
 * same philosophy as Decision 1 in Module 003.
 */
@Injectable()
export class SubscriptionService {
  constructor(
    private readonly subscriptionRepository: OrganizationSubscriptionRepository,
    private readonly planRepository: SubscriptionPlanRepository,
    private readonly providerRegistry: PaymentProviderRegistry,
    private readonly auditService: AuditService,
    @Inject(APP_CONFIG) private readonly config: Env,
  ) {}

  async getSubscription(organizationId: string): Promise<OrganizationSubscriptionWithPlan> {
    const subscription = await this.subscriptionRepository.findByOrganizationId(organizationId);
    if (!subscription) throw new NotFoundError("OrganizationSubscription", organizationId);
    return subscription;
  }

  async createSubscription(
    organizationId: string,
    planKey: string,
    billingCycle: "MONTHLY" | "YEARLY",
    billingEmail: string,
    actorId: string,
    provider: PaymentProviderType = "MOCK",
    ctx: AuditContext = {},
  ): Promise<OrganizationSubscription> {
    const existing = await this.subscriptionRepository.findByOrganizationId(organizationId);
    if (existing) {
      throw new ConflictError("This organization already has a subscription.");
    }

    const plan = await this.planRepository.findByKey(planKey);
    if (!plan || !plan.isActive) {
      throw new NotFoundError("SubscriptionPlan", planKey);
    }

    const adapter = this.providerRegistry.get(provider);
    const customer = await adapter.createCustomer(organizationId, billingEmail);
    const providerPriceId = billingCycle === "YEARLY" ? `${plan.key}_yearly` : `${plan.key}_monthly`;
    const providerResult = await adapter.createSubscription({
      providerCustomerId: customer.providerCustomerId,
      planProviderPriceId: providerPriceId,
      billingCycle,
      trialDays: plan.trialDays,
    });

    const trialEndsAt =
      plan.trialDays > 0 ? new Date(Date.now() + plan.trialDays * 24 * 60 * 60 * 1000) : undefined;

    const subscription = await this.subscriptionRepository.create({
      organizationId,
      planId: plan.id,
      status: providerResult.status === "trialing" ? "TRIALING" : "ACTIVE",
      paymentProvider: provider,
      providerSubscriptionId: providerResult.providerSubscriptionId,
      billingCycle,
      trialEndsAt,
      renewalDate: providerResult.currentPeriodEnd,
    });

    await this.auditService.log("billing.subscription.created", {
      userId: actorId,
      entityType: "OrganizationSubscription",
      entityId: subscription.id,
      metadata: { organizationId, planKey, billingCycle, provider },
      ...ctx,
    });

    return subscription;
  }

  async changePlan(organizationId: string, newPlanKey: string, actorId: string, ctx: AuditContext = {}): Promise<OrganizationSubscription> {
    const subscription = await this.getSubscription(organizationId);
    const newPlan = await this.planRepository.findByKey(newPlanKey);
    if (!newPlan || !newPlan.isActive) throw new NotFoundError("SubscriptionPlan", newPlanKey);

    if (subscription.planId === newPlan.id) {
      throw new ConflictError(`Organization is already on plan "${newPlanKey}".`);
    }

    const updated = await this.subscriptionRepository.changePlan(subscription.id, newPlan.id);
    await this.auditService.log("billing.subscription.plan_changed", {
      userId: actorId,
      entityType: "OrganizationSubscription",
      entityId: subscription.id,
      metadata: { organizationId, previousPlan: subscription.plan.key, newPlan: newPlanKey },
      ...ctx,
    });
    return updated;
  }

  async cancelSubscription(
    organizationId: string,
    actorId: string | null,
    ctx: AuditContext = {},
  ): Promise<OrganizationSubscription> {
    const subscription = await this.getSubscription(organizationId);
    if (subscription.status === "CANCELLED") {
      throw new ConflictError("Subscription is already cancelled.");
    }

    if (subscription.providerSubscriptionId) {
      const adapter = this.providerRegistry.get(subscription.paymentProvider);
      await adapter.cancelSubscription(subscription.providerSubscriptionId);
    }

    const cancelled = await this.subscriptionRepository.cancel(subscription.id, new Date());
    await this.auditService.log("billing.subscription.cancelled", {
      userId: actorId,
      entityType: "OrganizationSubscription",
      entityId: subscription.id,
      metadata: { organizationId },
      ...ctx,
    });
    return cancelled;
  }

  /**
   * Called by WebhookService when a `subscription.updated`/`invoice.paid`
   * event confirms the provider's own state — not a general-purpose status
   * setter for arbitrary callers, since bypassing the provider round-trip
   * for anything other than webhook-confirmed state would let application
   * state drift from the provider's actual billing state.
   */
  async syncStatusFromProvider(
    organizationId: string,
    status: OrganizationSubscription["status"],
    renewalDate: Date | undefined,
    ctx: AuditContext = {},
  ): Promise<OrganizationSubscription> {
    const subscription = await this.getSubscription(organizationId);
    const updated = await prisma.$transaction(
      async (tx: Prisma.TransactionClient): Promise<OrganizationSubscription | null> => {
        await this.subscriptionRepository.updateStatus(subscription.id, status, tx);
        if (renewalDate) {
          return this.subscriptionRepository.updateRenewalDate(subscription.id, renewalDate, tx);
        }
        return this.subscriptionRepository.findById(subscription.id, tx);
      },
    );
    if (!updated) throw new NotFoundError("OrganizationSubscription", subscription.id);

    await this.auditService.log("billing.subscription.status_synced", {
      entityType: "OrganizationSubscription",
      entityId: subscription.id,
      metadata: { organizationId, status },
      ...ctx,
    });
    return updated;
  }
}
