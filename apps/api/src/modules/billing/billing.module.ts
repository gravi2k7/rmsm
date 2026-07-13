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
import { MockProvider } from "./providers/mock.provider";
import { StripeProvider } from "./providers/stripe.provider";
import { RazorpayProvider } from "./providers/razorpay.provider";
import { PayPalProvider } from "./providers/paypal.provider";
import { PaymentProviderRegistry } from "./providers/payment-provider.registry";

/**
 * Phase 2 scope: repositories. Phase 3 (this addition): payment provider
 * implementations (Mock/Stripe/Razorpay/PayPal) + PaymentProviderRegistry.
 * Services, controllers, DTOs, and guards remain later phases. No business
 * logic lives in the repositories; providers are pure integration
 * adapters (no billing decisions — SubscriptionService, a later phase,
 * decides *when* to call them).
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
    MockProvider,
    StripeProvider,
    RazorpayProvider,
    PayPalProvider,
    PaymentProviderRegistry,
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
    PaymentProviderRegistry,
  ],
})
export class BillingModule {}
