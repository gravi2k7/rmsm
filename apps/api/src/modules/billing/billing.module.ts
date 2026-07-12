import { Module } from "@nestjs/common";
import { SubscriptionPlanRepository } from "./repositories/subscription-plan.repository";
import { FeatureFlagRepository } from "./repositories/feature-flag.repository";
import { PlanFeatureRepository } from "./repositories/plan-feature.repository";
import { OrganizationSubscriptionRepository } from "./repositories/organization-subscription.repository";
import { BillingAccountRepository } from "./repositories/billing-account.repository";
import { InvoiceRepository } from "./repositories/invoice.repository";
import { InvoiceLineRepository } from "./repositories/invoice-line.repository";
import { PaymentRepository } from "./repositories/payment.repository";
import { CouponRepository } from "./repositories/coupon.repository";
import { CouponRedemptionRepository } from "./repositories/coupon-redemption.repository";
import { UsageRecordRepository } from "./repositories/usage-record.repository";
import { PaymentWebhookRepository } from "./repositories/payment-webhook.repository";

/**
 * Phase 2 scope: repositories only, per the Module 003 phasing precedent
 * this module follows. Services, controllers, DTOs, guards, and provider
 * implementations (Mock/Stripe) are Phases 3–4. No business logic lives
 * here — every repository is a single-table primitive; invariant
 * enforcement (e.g. "an organization has exactly one subscription" is
 * already a database-level @unique — see Phase 1) and transaction
 * orchestration across repositories are Phase 3 concerns.
 */
@Module({
  providers: [
    SubscriptionPlanRepository,
    FeatureFlagRepository,
    PlanFeatureRepository,
    OrganizationSubscriptionRepository,
    BillingAccountRepository,
    InvoiceRepository,
    InvoiceLineRepository,
    PaymentRepository,
    CouponRepository,
    CouponRedemptionRepository,
    UsageRecordRepository,
    PaymentWebhookRepository,
  ],
  exports: [
    SubscriptionPlanRepository,
    FeatureFlagRepository,
    PlanFeatureRepository,
    OrganizationSubscriptionRepository,
    BillingAccountRepository,
    InvoiceRepository,
    InvoiceLineRepository,
    PaymentRepository,
    CouponRepository,
    CouponRedemptionRepository,
    UsageRecordRepository,
    PaymentWebhookRepository,
  ],
})
export class BillingModule {}
