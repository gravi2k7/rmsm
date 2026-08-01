import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { AuthModule } from "../auth/auth.module";
import { OrganizationsModule } from "../organizations/organizations.module";
import { LicensingModule } from "../licensing/licensing.module";
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
import { ActiveSubscriptionGuard } from "./guards/active-subscription.guard";
import { FeatureGuard } from "./guards/feature.guard";
import { PlanGuard } from "./guards/plan.guard";
import { QuotaGuard } from "./guards/quota.guard";
import { PlansController } from "./plans.controller";
import { SubscriptionController } from "./subscription.controller";
import { BillingAccountController } from "./billing-account.controller";
import { InvoiceController } from "./invoice.controller";
import { PaymentController } from "./payment.controller";
import { UsageController } from "./usage.controller";
import { CouponController } from "./coupon.controller";
import { AdminBillingController } from "./admin.controller";
import { WebhookController } from "./webhook.controller";
import { LicenseBillingController } from "./license-billing.controller";
import { RenewalService } from "./services/renewal.service";
import { BillingRenewalProcessor } from "./workers/billing-renewal.processor";
import { BillingCronRegistrar } from "./workers/billing-cron.registrar";

/**
 * Phase 2: repositories. Phase 3a: payment providers + registry. Phase 3b:
 * all 9 services. Phase 4 (this addition): controllers, DTOs (not listed
 * here — DTOs are consumed by controllers, not providers), and the
 * subscription middleware guards (ActiveSubscriptionGuard/FeatureGuard/
 * PlanGuard/QuotaGuard). Imports OrganizationsModule so
 * OrganizationRoleGuard's own dependency (OrganizationMembershipRepository)
 * resolves — every billing controller reuses that guard exactly as-is,
 * not a parallel implementation.
 */
@Module({
  imports: [
    AuthModule,
    OrganizationsModule,
    // Module 005: License Assignment (/billing/licenses) + the renewal
    // sweep's license-expiry check both need LicenseService.
    LicensingModule,
    BullModule.registerQueue({ name: "billing-renewal" }),
  ],
  controllers: [
    PlansController,
    SubscriptionController,
    BillingAccountController,
    InvoiceController,
    PaymentController,
    UsageController,
    CouponController,
    AdminBillingController,
    WebhookController,
    LicenseBillingController,
  ],
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
    ActiveSubscriptionGuard,
    FeatureGuard,
    PlanGuard,
    QuotaGuard,
    RenewalService,
    BillingRenewalProcessor,
    BillingCronRegistrar,
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
