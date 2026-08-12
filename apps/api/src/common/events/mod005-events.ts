/**
 * Module 005 (Enterprise Operations Suite) domain event names — the exact
 * 14 strings named in the prompt's own "Events" section, published via the
 * shared DomainEventPublisher (Module 004's EventsModule), same
 * PascalCase-string convention established by USER_EVENTS/RBAC_EVENTS/
 * AUTH_EVENTS (Module 004) — not dot-notation, not camelCase.
 */
export const MOD005_EVENTS = {
  SUBSCRIPTION_CREATED: "SubscriptionCreated",
  SUBSCRIPTION_UPDATED: "SubscriptionUpdated",
  SUBSCRIPTION_CANCELLED: "SubscriptionCancelled",
  INVOICE_GENERATED: "InvoiceGenerated",
  PAYMENT_SUCCEEDED: "PaymentSucceeded",
  PAYMENT_FAILED: "PaymentFailed",
  COUPON_CREATED: "CouponCreated",
  COUPON_REDEEMED: "CouponRedeemed",
  NOTIFICATION_SENT: "NotificationSent",
  NOTIFICATION_FAILED: "NotificationFailed",
  WEBHOOK_DELIVERED: "WebhookDelivered",
  WEBHOOK_FAILED: "WebhookFailed",
  FEATURE_FLAG_CHANGED: "FeatureFlagChanged",
  LICENSE_ASSIGNED: "LicenseAssigned",
} as const;
