import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
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
import { BillingService } from "./services/billing.service";
import { SubscriptionService } from "./services/subscription.service";
import { InvoiceService } from "./services/invoice.service";
import { PaymentService } from "./services/payment.service";
import { CouponService } from "./services/coupon.service";
import { UsageService } from "./services/usage.service";
import { QuotaService } from "./services/quota.service";
import { FeatureService } from "./services/feature.service";
import { WebhookService } from "./services/webhook.service";

/**
 * Phase 2: repositories. Phase 3a: payment providers + registry. Phase 3b
 * (this addition): all 9 services. Controllers, DTOs, and subscription
 * middleware/guards remain Phase 4. Imports AuthModule to reuse
 * AuditService, matching every other feature module's pattern in this
 * codebase (organizations, auth itself).
 */
@Module({
  imports: [AuthModule],
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
    BillingService,
    SubscriptionService,
    InvoiceService,
    PaymentService,
    CouponService,
    UsageService,
    QuotaService,
    FeatureService,
    WebhookService,
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
    BillingService,
    SubscriptionService,
    InvoiceService,
    PaymentService,
    CouponService,
    UsageService,
    QuotaService,
    FeatureService,
    WebhookService,
  ],
})
export class BillingModule {}
