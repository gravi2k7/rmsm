# Module 004 — Architecture Diagrams

## Entity-Relationship Diagram

```mermaid
erDiagram
    Organization ||--o| OrganizationSubscription : has
    Organization ||--o| BillingAccount : has
    Organization ||--o{ Invoice : owns
    Organization ||--o{ Payment : makes
    Organization ||--o{ UsageRecord : accrues
    Organization ||--o{ Coupon : "org-specific coupons"
    Organization ||--o{ CouponRedemption : redeems
    SubscriptionPlan ||--o{ OrganizationSubscription : "subscribed via"
    SubscriptionPlan ||--o{ PlanFeature : grants
    FeatureFlag ||--o{ PlanFeature : "referenced by"
    Invoice ||--o{ InvoiceLine : itemizes
    Invoice ||--o{ Payment : "paid by"
    Invoice ||--o{ CouponRedemption : "discount applied to"
    Coupon ||--o{ CouponRedemption : redeemed

    OrganizationSubscription {
        string organizationId UK "exactly one per org"
        enum status
        enum paymentProvider
        string providerSubscriptionId
    }
    Payment {
        enum provider
        string providerTransactionId "unique with provider"
    }
    PaymentWebhook {
        string providerEventId UK "idempotency key, ADR-015"
    }
    PlanFeature {
        boolean enabled
        int limit "null = unlimited"
    }
```

## Sequence: Subscription Creation ("Checkout")

```mermaid
sequenceDiagram
    participant C as Client
    participant API as SubscriptionController
    participant S as SubscriptionService
    participant Reg as PaymentProviderRegistry
    participant P as Provider Adapter (e.g. Mock/Stripe)
    participant DB as Database

    C->>API: POST /billing/organizations/:id/subscription
    API->>S: createSubscription(orgId, planKey, cycle, email)
    S->>DB: findByOrganizationId (uniqueness check)
    alt subscription already exists
        S-->>C: 409 Conflict
    end
    S->>DB: findByKey(planKey)
    alt plan not found/inactive
        S-->>C: 404 Not Found
    end
    S->>Reg: get(provider)
    Reg->>P: createCustomer(orgId, email)
    P-->>Reg: providerCustomerId
    S->>P: createSubscription({customerId, priceId, trialDays})
    P-->>S: {providerSubscriptionId, status, currentPeriodEnd}
    S->>DB: create OrganizationSubscription (TRIALING or ACTIVE)
    S->>DB: AuditService.log("billing.subscription.created")
    S-->>C: 201 Created
```

## Sequence: Webhook Processing (with idempotency)

```mermaid
sequenceDiagram
    participant Prov as Payment Provider
    participant WC as WebhookController
    participant WS as WebhookService
    participant PA as Provider Adapter
    participant DB as Database
    participant PS as PaymentService / SubscriptionService

    Prov->>WC: POST /billing/webhooks/:provider (raw body + signature headers)
    WC->>WS: handleWebhook(provider, rawBody, signatureHeader)
    WS->>PA: verifyWebhookSignature(rawBody, signatureHeader)
    alt signature invalid
        PA-->>WS: false
        WS-->>Prov: 400 Bad Request
    end
    WS->>PA: parseWebhookEvent(rawBody)
    PA-->>WS: NormalizedWebhookEvent
    WS->>DB: findByProviderEventId (idempotency check, ADR-015)
    alt event already processed
        DB-->>WS: existing row
        WS-->>Prov: 200 {status: "duplicate"}
    end
    WS->>DB: create PaymentWebhook (status=PENDING)
    WS->>WS: resolveOrganizationId (via providerSubscriptionId)
    WS->>PS: recordPayment(...) / syncStatusFromProvider(...) / cancelSubscription(...)
    alt dispatch succeeds
        WS->>DB: markProcessed
        WS-->>Prov: 200 {status: "processed"}
    else dispatch throws
        WS->>DB: markFailed
        WS->>DB: AuditService.log("billing.webhook.processing_failed")
        WS-->>Prov: 5xx (provider will retry — idempotency check above ensures the retry is safe)
    end
```

## Authorization Layering (every organization-scoped billing endpoint)

```mermaid
flowchart LR
    A[Request] --> B{JwtAuthGuard<br/>valid token?}
    B -- no --> R401[401]
    B -- yes --> C{PermissionsGuard<br/>has billing.*.* permission?}
    C -- no --> R403a[403]
    C -- yes --> D{OrganizationRoleGuard<br/>active member with sufficient org role?}
    D -- no --> R403b[403]
    D -- yes --> E[Controller handler]
```

## Module Dependency Graph

```mermaid
flowchart TD
    Billing[BillingModule] --> Auth[AuthModule<br/>AuditService, PermissionsGuard]
    Billing --> Orgs[OrganizationsModule<br/>OrganizationRoleGuard]
    Billing --> DB[(packages/database)]
    Billing --> Shared[packages/shared<br/>domain errors]
    Billing --> Config[packages/config<br/>provider credentials]
```

No module outside `BillingModule` depends on it yet — this module is a leaf in the current
dependency graph, ready for future modules (Strategy Builder, AI Analysis Engine, etc.) to
depend on it for `QuotaGuard`/`FeatureGuard` without `BillingModule` needing to know anything
about them.
