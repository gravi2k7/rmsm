# Module 005 — Architecture Diagrams

## Entity-Relationship Diagram (core relationships)

```mermaid
erDiagram
    Organization ||--o{ Notification : owns
    Organization ||--o{ NotificationTemplate : "org or platform-wide"
    Organization ||--o{ NotificationCategory : "org or platform-wide"
    Organization ||--o{ EmailProvider : configures
    Organization ||--o{ SmsProvider : configures
    Organization ||--o{ PushProvider : configures
    Organization ||--o{ NotificationWebhook : subscribes
    User ||--o{ Notification : receives
    User ||--o{ NotificationPreference : sets
    User ||--o{ DeviceToken : registers
    User ||--o{ NotificationDigest : subscribes

    NotificationTemplate ||--o{ Notification : renders
    NotificationTemplate ||--o| NotificationTemplate : "layout (self-relation)"
    NotificationCategory ||--o{ NotificationTemplate : organizes
    NotificationCategory ||--o{ Notification : classifies
    NotificationCategory ||--o{ NotificationPreference : "opt-in/out scope"

    Notification ||--o{ NotificationDelivery : "fans out to"
    Notification ||--o{ NotificationEvent : logs
    Notification ||--o{ NotificationQueue : "queued as"
    Notification ||--o{ NotificationAttachment : carries
    NotificationDelivery ||--o{ NotificationEvent : "tracked by"
    EmailProvider ||--o{ NotificationDelivery : sends
    SmsProvider ||--o{ NotificationDelivery : sends
    PushProvider ||--o{ NotificationDelivery : sends
    PushProvider ||--o{ DeviceToken : targets

    Notification {
        string organizationId FK
        enum type "DIRECT|BROADCAST|ROLE|PERMISSION|TOPIC|DIGEST"
        enum channel
        enum status
        string recipientUserId FK "nullable"
    }
    NotificationDelivery {
        enum status
        string providerMessageId "correlates inbound webhooks"
    }
    NotificationCategory {
        string organizationId FK "nullable = platform-wide"
        string key "unique per scope, see Phase 1 doc Section 2"
    }
```

## Sequence: Direct Notification Send (Email Channel)

```mermaid
sequenceDiagram
    participant C as Caller (future module or API client)
    participant NS as NotificationService
    participant PS as PreferenceService
    participant TS as TemplateService
    participant QS as QueueService
    participant Worker as Queue Worker (Phase 2)
    participant ES as EmailService
    participant Reg as EmailProviderRegistry
    participant P as Email Provider Adapter
    participant DB as Database

    C->>NS: send({type: DIRECT, channel: EMAIL, recipientUserId, templateKey, variables})
    NS->>PS: isAllowed(userId, orgId, categoryKey, EMAIL)
    alt user opted out / quiet hours active
        PS-->>NS: {allowed: false}
        NS-->>C: Notification (status=CANCELLED)
    end
    NS->>TS: render(orgId, templateKey, locale, variables)
    TS-->>NS: {subject, body}
    NS->>DB: create Notification (status=PENDING)
    NS->>QS: enqueue({notificationId}, {queueName: "email", priority})
    QS->>DB: create NotificationQueue (status=PENDING)
    NS-->>C: Notification (status=QUEUED)

    Worker->>QS: (picks up job)
    Worker->>ES: send(orgId, message)
    ES->>Reg: get(orgId, providerType)
    Reg-->>ES: EmailProviderAdapter
    ES->>P: send(message)
    P-->>ES: {providerMessageId}
    ES->>DB: create NotificationDelivery (status=SENT, providerMessageId)
    Worker->>DB: update NotificationQueue (status=COMPLETED)
    Worker->>DB: update Notification (status=SENT, sentAt)
```

## Sequence: Inbound Provider Webhook (Delivery Tracking)

```mermaid
sequenceDiagram
    participant Prov as Email/SMS Provider
    participant WC as WebhookController (Phase 2)
    participant TrS as TrackingService
    participant P as Provider Adapter
    participant DB as Database
    participant NW as NotificationWebhook (outbound, org-configured)

    Prov->>WC: POST /notifications/webhook/:provider (bounce/open/click event)
    WC->>P: verifyWebhookSignature(rawBody, signatureHeader)
    alt invalid signature
        P-->>WC: false
        WC-->>Prov: 400
    end
    WC->>P: parseWebhookEvent(rawBody)
    P-->>WC: {providerMessageId, eventType, occurredAt}
    WC->>DB: findByProviderMessageId (correlate to NotificationDelivery)
    WC->>TrS: recordOpen / recordClick / recordBounce
    TrS->>DB: update NotificationDelivery, create NotificationEvent
    TrS->>NW: triggerForEvent(orgId, eventType, payload)
    Note over NW: fires any org-configured outbound<br/>webhook subscribed to this event type
    WC-->>Prov: 200
```

## Sequence: Digest Generation

```mermaid
sequenceDiagram
    participant Sched as NotificationScheduler (BullMQ repeatable job)
    participant DS as DigestService
    participant DB as Database
    participant NS as NotificationService

    Sched->>DS: processDueDigests(now)
    DS->>DB: findDueForSend(now) → NotificationDigest[]
    loop each due digest
        DS->>DB: find Notifications for user/org since lastSentAt, matching categoryKeys
        DS->>DS: buildDigest() — aggregate into one subject/body
        alt itemCount > 0
            DS->>NS: send({type: DIGEST, channel: EMAIL, recipientUserId, ...})
            DS->>DB: update NotificationDigest (lastSentAt, nextScheduledAt)
        else nothing to digest
            DS->>DB: update nextScheduledAt only (skip send)
        end
    end
```

## Authorization Layering (organization-scoped notification endpoints, Phase 2)

```mermaid
flowchart LR
    A[Request] --> B{JwtAuthGuard}
    B -- no --> R401[401]
    B -- yes --> C{PermissionsGuard<br/>notification.*.* permission}
    C -- no --> R403a[403]
    C -- yes --> D{OrganizationRoleGuard<br/>Module 003, reused as-is}
    D -- no --> R403b[403]
    D -- yes --> E[Controller handler]
```

## Module Dependency Graph

```mermaid
flowchart TD
    Notif[NotificationsModule — Phase 2] --> Auth[AuthModule<br/>AuditService, PermissionsGuard]
    Notif --> Orgs[OrganizationsModule<br/>OrganizationRoleGuard]
    Notif --> Queue[Module 001 QueueModule<br/>BullMQ/Redis, via QueueAdapter]
    Notif --> DB[(packages/database)]
    Notif --> Shared[packages/shared<br/>domain errors]
    Notif --> Config[packages/config<br/>provider credentials]

    Billing[BillingModule — Module 004] -.future caller.-> Notif
    Notif -.does NOT depend on.-> Billing
```

`BillingModule` will eventually call into `NotificationsModule` (e.g. "payment failed" →
notify the org owner) once both exist — the dependency arrow only goes one direction, matching
the layering this project has kept consistent since Module 003 (`OrganizationsModule` has no
dependency on anything built after it either).
