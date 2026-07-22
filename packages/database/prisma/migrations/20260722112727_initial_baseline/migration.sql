-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'LOCKED', 'SUSPENDED', 'ARCHIVED', 'DELETED');

-- CreateEnum
CREATE TYPE "OAuthProvider" AS ENUM ('GOOGLE', 'GITHUB', 'MICROSOFT');

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('ACTIVE', 'ARCHIVED', 'DELETED');

-- CreateEnum
CREATE TYPE "OrganizationRole" AS ENUM ('OWNER', 'ADMINISTRATOR', 'MANAGER', 'ANALYST', 'TRADER', 'VIEWER');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'LEFT', 'REMOVED');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MembershipEventAction" AS ENUM ('INVITED', 'INVITATION_ACCEPTED', 'JOINED', 'ROLE_CHANGED', 'SUSPENDED', 'REACTIVATED', 'LEFT', 'REMOVED', 'OWNERSHIP_TRANSFERRED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELLED', 'EXPIRED', 'INCOMPLETE');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'OPEN', 'PAID', 'VOID', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentProviderType" AS ENUM ('STRIPE', 'MOCK', 'RAZORPAY', 'PADDLE', 'LEMONSQUEEZY', 'PAYPAL');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CARD', 'UPI', 'BANK', 'WALLET');

-- CreateEnum
CREATE TYPE "CouponType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- CreateEnum
CREATE TYPE "FeatureType" AS ENUM ('BOOLEAN', 'LIMIT');

-- CreateEnum
CREATE TYPE "WebhookProcessingStatus" AS ENUM ('PENDING', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL', 'SMS', 'PUSH', 'IN_APP', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED', 'READ', 'ARCHIVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('DIRECT', 'BROADCAST', 'ROLE', 'PERMISSION', 'TOPIC', 'DIGEST');

-- CreateEnum
CREATE TYPE "EmailProviderType" AS ENUM ('SMTP', 'SES', 'SENDGRID', 'MAILGUN', 'RESEND');

-- CreateEnum
CREATE TYPE "SmsProviderType" AS ENUM ('TWILIO', 'MESSAGEBIRD', 'VONAGE', 'AWS_SNS');

-- CreateEnum
CREATE TYPE "PushProviderType" AS ENUM ('FCM', 'APNS');

-- CreateEnum
CREATE TYPE "QueueStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'DEAD_LETTER');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED', 'OPENED', 'CLICKED');

-- CreateEnum
CREATE TYPE "ScheduleFrequency" AS ENUM ('ONCE', 'DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM_CRON');

-- CreateEnum
CREATE TYPE "DevicePlatform" AS ENUM ('IOS', 'ANDROID', 'WEB');

-- CreateEnum
CREATE TYPE "TemplateFormat" AS ENUM ('HTML', 'TEXT', 'MARKDOWN');

-- CreateEnum
CREATE TYPE "AssetClass" AS ENUM ('EQUITY', 'ETF', 'CRYPTO', 'FOREX', 'COMMODITY', 'INDEX', 'BOND', 'OPTION', 'FUTURE');

-- CreateEnum
CREATE TYPE "InstrumentStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELISTED', 'PENDING');

-- CreateEnum
CREATE TYPE "MarketDataProviderType" AS ENUM ('BINANCE', 'POLYGON', 'TWELVE_DATA', 'ALPHA_VANTAGE', 'YAHOO_FINANCE', 'TRADINGVIEW_BRIDGE', 'BROKER_BRIDGE', 'INTERNAL_FEED');

-- CreateEnum
CREATE TYPE "MarketDataSource" AS ENUM ('LIVE', 'DELAYED', 'HISTORICAL_IMPORT', 'BACKFILL', 'MANUAL_CORRECTION');

-- CreateEnum
CREATE TYPE "CandleInterval" AS ENUM ('ONE_MINUTE', 'FIVE_MINUTES', 'FIFTEEN_MINUTES', 'THIRTY_MINUTES', 'ONE_HOUR', 'FOUR_HOURS', 'ONE_DAY', 'ONE_WEEK', 'ONE_MONTH');

-- CreateEnum
CREATE TYPE "DataQualityStatus" AS ENUM ('CLEAN', 'FLAGGED', 'UNDER_REVIEW', 'CORRECTED', 'IGNORED');

-- CreateEnum
CREATE TYPE "ImportJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'PARTIAL', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DataGapStatus" AS ENUM ('DETECTED', 'BACKFILLING', 'RESOLVED', 'UNRESOLVED', 'IGNORED');

-- CreateEnum
CREATE TYPE "CorporateActionType" AS ENUM ('SPLIT', 'REVERSE_SPLIT', 'DIVIDEND', 'MERGER', 'SPINOFF', 'SYMBOL_CHANGE', 'DELISTING');

-- CreateEnum
CREATE TYPE "TradingSessionType" AS ENUM ('PRE_MARKET', 'REGULAR', 'AFTER_HOURS', 'OVERNIGHT');

-- CreateEnum
CREATE TYPE "StrategyStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "StrategyVersionStatus" AS ENUM ('DRAFT', 'PENDING_VALIDATION', 'VALIDATED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PUBLISHED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "StrategyCategoryCode" AS ENUM ('TREND_FOLLOWING', 'MEAN_REVERSION', 'MOMENTUM', 'BREAKOUT', 'SCALPING', 'SWING', 'ARBITRAGE', 'MARKET_MAKING', 'CUSTOM');

-- CreateEnum
CREATE TYPE "RuleTreeRole" AS ENUM ('ENTRY', 'EXIT');

-- CreateEnum
CREATE TYPE "LogicalOperatorType" AS ENUM ('AND', 'OR', 'NOT');

-- CreateEnum
CREATE TYPE "ComparisonOperatorType" AS ENUM ('GREATER_THAN', 'GREATER_THAN_OR_EQUAL', 'LESS_THAN', 'LESS_THAN_OR_EQUAL', 'EQUAL', 'NOT_EQUAL', 'CROSSES_ABOVE', 'CROSSES_BELOW', 'BETWEEN');

-- CreateEnum
CREATE TYPE "StrategyParameterType" AS ENUM ('INTEGER', 'DECIMAL', 'BOOLEAN', 'ENUM', 'STRING');

-- CreateEnum
CREATE TYPE "ApprovalDecision" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "StrategyHistoryActionType" AS ENUM ('STRATEGY_CREATED', 'STRATEGY_UPDATED', 'VERSION_DRAFTED', 'VERSION_VALIDATED', 'VERSION_APPROVAL_REQUESTED', 'VERSION_APPROVED', 'VERSION_REJECTED', 'VERSION_PUBLISHED', 'STRATEGY_ARCHIVED');

-- CreateEnum
CREATE TYPE "OutboxEventStatus" AS ENUM ('PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED', 'POISON');

-- CreateTable
CREATE TABLE "system_health" (
    "id" TEXT NOT NULL,
    "component" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_health_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "emailVerifiedAt" TIMESTAMP(3),
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "avatarUrl" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "language" TEXT NOT NULL DEFAULT 'en',
    "phone" TEXT,
    "notificationPreferences" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "locale" TEXT,
    "country" TEXT,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "dashboardLayout" JSONB,
    "defaultOrganizationId" TEXT,
    "securityPreferences" JSONB NOT NULL DEFAULT '{}',
    "tradingPreferences" JSONB NOT NULL DEFAULT '{}',
    "accessibilityPreferences" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "parentRoleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "group" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "tenantId" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "deviceLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "family" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "replacedByTokenId" TEXT,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "reason" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_resets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_verifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "two_factor_secrets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "secretEnc" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "two_factor_secrets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recovery_codes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recovery_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "OAuthProvider" NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "accessTokenEnc" TEXT,
    "refreshTokenEnc" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oauth_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "description" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "country" TEXT,
    "website" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "status" "OrganizationStatus" NOT NULL DEFAULT 'ACTIVE',
    "billingCustomerId" TEXT,
    "seatsLimit" INTEGER,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_memberships" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "OrganizationRole" NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "invitedById" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_invitations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "OrganizationRole" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "invitedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_membership_events" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,
    "action" "MembershipEventAction" NOT NULL,
    "previousRole" "OrganizationRole",
    "newRole" "OrganizationRole",
    "actorId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_membership_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "monthlyPriceCents" INTEGER NOT NULL,
    "yearlyPriceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "trialDays" INTEGER NOT NULL DEFAULT 0,
    "gracePeriodDays" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "FeatureType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_features" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "featureFlagId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "limit" INTEGER,

    CONSTRAINT "plan_features_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_subscriptions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "paymentProvider" "PaymentProviderType" NOT NULL DEFAULT 'MOCK',
    "providerSubscriptionId" TEXT,
    "billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "renewalDate" TIMESTAMP(3),
    "cancellationDate" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "gracePeriodEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_accounts" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "billingEmail" TEXT NOT NULL,
    "companyName" TEXT,
    "taxId" TEXT,
    "address" JSONB NOT NULL DEFAULT '{}',
    "country" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "subtotalCents" INTEGER NOT NULL,
    "taxCents" INTEGER NOT NULL DEFAULT 0,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "pdfUrl" TEXT,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paymentDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_lines" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitAmountCents" INTEGER NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "provider" "PaymentProviderType" NOT NULL,
    "providerTransactionId" TEXT,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "method" "PaymentMethod",
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "CouponType" NOT NULL,
    "value" INTEGER NOT NULL,
    "currency" TEXT,
    "expiresAt" TIMESTAMP(3),
    "maxRedemptions" INTEGER,
    "currentRedemptions" INTEGER NOT NULL DEFAULT 0,
    "organizationId" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_redemptions" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_records" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "period" TIMESTAMP(3) NOT NULL,
    "metric" TEXT NOT NULL,
    "value" BIGINT NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_webhooks" (
    "id" TEXT NOT NULL,
    "provider" "PaymentProviderType" NOT NULL,
    "eventType" TEXT NOT NULL,
    "providerEventId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "WebhookProcessingStatus" NOT NULL DEFAULT 'PENDING',
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_categories" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "defaultChannel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_providers" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "type" "EmailProviderType" NOT NULL,
    "name" TEXT NOT NULL,
    "credentialsEnc" TEXT NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "fromName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "email_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sms_providers" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "type" "SmsProviderType" NOT NULL,
    "name" TEXT NOT NULL,
    "credentialsEnc" TEXT NOT NULL,
    "fromNumber" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "sms_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_providers" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "type" "PushProviderType" NOT NULL,
    "name" TEXT NOT NULL,
    "credentialsEnc" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "push_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "categoryId" TEXT,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "channel" "NotificationChannel" NOT NULL,
    "format" "TemplateFormat" NOT NULL DEFAULT 'HTML',
    "subjectTemplate" TEXT,
    "bodyTemplate" TEXT NOT NULL,
    "layoutId" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'DIRECT',
    "channel" "NotificationChannel" NOT NULL,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "categoryId" TEXT,
    "templateId" TEXT,
    "recipientUserId" TEXT,
    "recipientRole" "OrganizationRole",
    "recipientPermission" TEXT,
    "topic" TEXT,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "locale" TEXT NOT NULL DEFAULT 'en',
    "scheduledFor" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_attachments" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_deliveries" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "emailProviderId" TEXT,
    "smsProviderId" TEXT,
    "pushProviderId" TEXT,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "providerMessageId" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "bouncedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_events" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "deliveryId" TEXT,
    "eventType" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "notificationId" TEXT,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_queue" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "queueName" TEXT NOT NULL,
    "status" "QueueStatus" NOT NULL DEFAULT 'PENDING',
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "scheduledFor" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "lastError" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_schedules" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "frequency" "ScheduleFrequency" NOT NULL,
    "cronExpression" TEXT,
    "nextRunAt" TIMESTAMP(3) NOT NULL,
    "lastRunAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "targetType" "NotificationType" NOT NULL,
    "targetValue" JSONB NOT NULL DEFAULT '{}',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "notification_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_digests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "frequency" "ScheduleFrequency" NOT NULL,
    "categoryKeys" JSONB NOT NULL DEFAULT '[]',
    "lastSentAt" TIMESTAMP(3),
    "nextScheduledAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_digests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "categoryId" TEXT,
    "channel" "NotificationChannel",
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "quietHoursStart" TEXT,
    "quietHoursEnd" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "digestFrequency" "ScheduleFrequency",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "platform" "DevicePlatform" NOT NULL,
    "token" TEXT NOT NULL,
    "pushProviderId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_webhooks" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secretEnc" TEXT NOT NULL,
    "eventTypes" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggeredAt" TIMESTAMP(3),
    "lastStatus" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "notification_webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_data_provider_configs" (
    "id" TEXT NOT NULL,
    "type" "MarketDataProviderType" NOT NULL,
    "name" TEXT NOT NULL,
    "baseUrl" TEXT,
    "credentialReference" TEXT,
    "rateLimitPerMinute" INTEGER,
    "supportedAssetClasses" "AssetClass"[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "market_data_provider_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exchanges" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "country" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exchanges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trading_sessions" (
    "id" TEXT NOT NULL,
    "exchangeId" TEXT NOT NULL,
    "type" "TradingSessionType" NOT NULL,
    "openTime" TEXT NOT NULL,
    "closeTime" TEXT NOT NULL,
    "dayOfWeek" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trading_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supported_timeframes" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "interval" "CandleInterval" NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supported_timeframes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instruments" (
    "id" TEXT NOT NULL,
    "exchangeId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "assetClass" "AssetClass" NOT NULL,
    "status" "InstrumentStatus" NOT NULL DEFAULT 'ACTIVE',
    "currency" TEXT NOT NULL,
    "isin" TEXT,
    "cusip" TEXT,
    "tickSize" DECIMAL(20,10),
    "lotSize" DECIMAL(20,10),
    "listedAt" TIMESTAMP(3),
    "delistedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instruments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instrument_aliases" (
    "id" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "providerSymbol" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instrument_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_candles" (
    "id" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "interval" "CandleInterval" NOT NULL,
    "eventTime" TIMESTAMP(3) NOT NULL,
    "open" DECIMAL(24,10) NOT NULL,
    "high" DECIMAL(24,10) NOT NULL,
    "low" DECIMAL(24,10) NOT NULL,
    "close" DECIMAL(24,10) NOT NULL,
    "volume" DECIMAL(30,10) NOT NULL,
    "providerId" TEXT NOT NULL,
    "source" "MarketDataSource" NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "importJobId" TEXT,
    "sourceTimestamp" TIMESTAMP(3),
    "normalizationVersion" INTEGER NOT NULL DEFAULT 1,
    "isCorrection" BOOLEAN NOT NULL DEFAULT false,
    "supersedesId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "market_candles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_quotes" (
    "id" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "bidPrice" DECIMAL(24,10),
    "askPrice" DECIMAL(24,10),
    "lastPrice" DECIMAL(24,10),
    "bidSize" DECIMAL(30,10),
    "askSize" DECIMAL(30,10),
    "eventTime" TIMESTAMP(3) NOT NULL,
    "providerId" TEXT NOT NULL,
    "source" "MarketDataSource" NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceTimestamp" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_ticks" (
    "id" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "price" DECIMAL(24,10) NOT NULL,
    "size" DECIMAL(30,10) NOT NULL,
    "eventTime" TIMESTAMP(3) NOT NULL,
    "providerId" TEXT NOT NULL,
    "source" "MarketDataSource" NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceTimestamp" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_ticks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_actions" (
    "id" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "type" "CorporateActionType" NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "value" DECIMAL(20,10) NOT NULL,
    "announcedAt" TIMESTAMP(3),
    "providerId" TEXT NOT NULL,
    "source" "MarketDataSource" NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "corporate_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_import_jobs" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "status" "ImportJobStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "recordsProcessed" INTEGER NOT NULL DEFAULT 0,
    "recordsFailed" INTEGER NOT NULL DEFAULT 0,
    "errorSummary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_quality_issues" (
    "id" TEXT NOT NULL,
    "instrumentId" TEXT,
    "importJobId" TEXT,
    "issueType" TEXT NOT NULL,
    "status" "DataQualityStatus" NOT NULL DEFAULT 'FLAGGED',
    "severity" TEXT NOT NULL DEFAULT 'medium',
    "description" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "data_quality_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_gaps" (
    "id" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "interval" "CandleInterval" NOT NULL,
    "gapStart" TIMESTAMP(3) NOT NULL,
    "gapEnd" TIMESTAMP(3) NOT NULL,
    "status" "DataGapStatus" NOT NULL DEFAULT 'DETECTED',
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "backfilledAt" TIMESTAMP(3),

    CONSTRAINT "data_gaps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strategy_categories" (
    "code" "StrategyCategoryCode" NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "strategy_categories_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "strategy_tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "strategy_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strategy_tag_assignments" (
    "strategyId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "strategy_tag_assignments_pkey" PRIMARY KEY ("strategyId","tagId")
);

-- CreateTable
CREATE TABLE "strategies" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "categoryCode" "StrategyCategoryCode" NOT NULL,
    "status" "StrategyStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentPublishedVersionId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "strategies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strategy_versions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" "StrategyVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "strategy_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rule_groups" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "strategyVersionId" TEXT NOT NULL,
    "parentGroupId" TEXT,
    "treeRole" "RuleTreeRole",
    "operator" "LogicalOperatorType" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "rule_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rules" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "ruleGroupId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conditions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "leftOperand" JSONB NOT NULL,
    "operator" "ComparisonOperatorType" NOT NULL,
    "rightOperand" JSONB NOT NULL,
    "rightOperandUpper" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "conditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strategy_parameters" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "strategyVersionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "StrategyParameterType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "defaultValueText" TEXT,
    "minText" TEXT,
    "maxText" TEXT,
    "allowedValues" JSONB,
    "maxLength" INTEGER,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "strategy_parameters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "execution_profiles" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "strategyVersionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parameters" JSONB NOT NULL DEFAULT '{}',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "execution_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strategy_validations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "strategyVersionId" TEXT NOT NULL,
    "ranAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "passed" BOOLEAN NOT NULL,
    "findings" JSONB NOT NULL DEFAULT '[]',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "strategy_validations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strategy_approvals" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "strategyVersionId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decision" "ApprovalDecision" NOT NULL DEFAULT 'PENDING',
    "decidedByUserId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "comments" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "strategy_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strategy_publications" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "strategyVersionId" TEXT NOT NULL,
    "publishedByUserId" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supersedesVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "strategy_publications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strategy_history" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "action" "StrategyHistoryActionType" NOT NULL,
    "actorId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "strategy_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strategy_outbox_events" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "correlationId" TEXT NOT NULL,
    "causationId" TEXT,
    "userId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "OutboxEventStatus" NOT NULL DEFAULT 'PENDING',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "strategy_outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "system_health_component_key" ON "system_health"("component");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_userId_key" ON "profiles"("userId");

-- CreateIndex
CREATE INDEX "profiles_defaultOrganizationId_idx" ON "profiles"("defaultOrganizationId");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE INDEX "roles_parentRoleId_idx" ON "roles"("parentRoleId");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_key_key" ON "permissions"("key");

-- CreateIndex
CREATE INDEX "permissions_group_idx" ON "permissions"("group");

-- CreateIndex
CREATE INDEX "user_roles_userId_idx" ON "user_roles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_userId_roleId_tenantId_key" ON "user_roles"("userId", "roleId", "tenantId");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_family_idx" ON "refresh_tokens"("family");

-- CreateIndex
CREATE INDEX "login_history_userId_idx" ON "login_history"("userId");

-- CreateIndex
CREATE INDEX "login_history_email_idx" ON "login_history"("email");

-- CreateIndex
CREATE INDEX "login_history_createdAt_idx" ON "login_history"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "password_resets_tokenHash_key" ON "password_resets"("tokenHash");

-- CreateIndex
CREATE INDEX "password_resets_userId_idx" ON "password_resets"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "email_verifications_tokenHash_key" ON "email_verifications"("tokenHash");

-- CreateIndex
CREATE INDEX "email_verifications_userId_idx" ON "email_verifications"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "two_factor_secrets_userId_key" ON "two_factor_secrets"("userId");

-- CreateIndex
CREATE INDEX "recovery_codes_userId_idx" ON "recovery_codes"("userId");

-- CreateIndex
CREATE INDEX "oauth_accounts_userId_idx" ON "oauth_accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_accounts_provider_providerAccountId_key" ON "oauth_accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_billingCustomerId_key" ON "organizations"("billingCustomerId");

-- CreateIndex
CREATE INDEX "organizations_status_idx" ON "organizations"("status");

-- CreateIndex
CREATE INDEX "organizations_slug_idx" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "organization_memberships_userId_idx" ON "organization_memberships"("userId");

-- CreateIndex
CREATE INDEX "organization_memberships_organizationId_status_idx" ON "organization_memberships"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "organization_memberships_organizationId_userId_key" ON "organization_memberships"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "organization_invitations_tokenHash_key" ON "organization_invitations"("tokenHash");

-- CreateIndex
CREATE INDEX "organization_invitations_organizationId_status_idx" ON "organization_invitations"("organizationId", "status");

-- CreateIndex
CREATE INDEX "organization_invitations_email_idx" ON "organization_invitations"("email");

-- CreateIndex
CREATE INDEX "organization_membership_events_organizationId_createdAt_idx" ON "organization_membership_events"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "organization_membership_events_userId_idx" ON "organization_membership_events"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_key_key" ON "subscription_plans"("key");

-- CreateIndex
CREATE INDEX "subscription_plans_isActive_isVisible_idx" ON "subscription_plans"("isActive", "isVisible");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_key_key" ON "feature_flags"("key");

-- CreateIndex
CREATE UNIQUE INDEX "plan_features_planId_featureFlagId_key" ON "plan_features"("planId", "featureFlagId");

-- CreateIndex
CREATE UNIQUE INDEX "organization_subscriptions_organizationId_key" ON "organization_subscriptions"("organizationId");

-- CreateIndex
CREATE INDEX "organization_subscriptions_status_idx" ON "organization_subscriptions"("status");

-- CreateIndex
CREATE INDEX "organization_subscriptions_planId_idx" ON "organization_subscriptions"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "billing_accounts_organizationId_key" ON "billing_accounts"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "invoices_organizationId_status_idx" ON "invoices"("organizationId", "status");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoice_lines_invoiceId_idx" ON "invoice_lines"("invoiceId");

-- CreateIndex
CREATE INDEX "payments_organizationId_status_idx" ON "payments"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_providerTransactionId_key" ON "payments"("provider", "providerTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");

-- CreateIndex
CREATE INDEX "coupons_isActive_isPublic_idx" ON "coupons"("isActive", "isPublic");

-- CreateIndex
CREATE UNIQUE INDEX "coupon_redemptions_couponId_organizationId_key" ON "coupon_redemptions"("couponId", "organizationId");

-- CreateIndex
CREATE INDEX "usage_records_organizationId_period_idx" ON "usage_records"("organizationId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "usage_records_organizationId_period_metric_key" ON "usage_records"("organizationId", "period", "metric");

-- CreateIndex
CREATE UNIQUE INDEX "payment_webhooks_providerEventId_key" ON "payment_webhooks"("providerEventId");

-- CreateIndex
CREATE INDEX "payment_webhooks_provider_eventType_idx" ON "payment_webhooks"("provider", "eventType");

-- CreateIndex
CREATE INDEX "payment_webhooks_status_idx" ON "payment_webhooks"("status");

-- CreateIndex
CREATE INDEX "notification_categories_organizationId_isActive_idx" ON "notification_categories"("organizationId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "notification_categories_organizationId_key_key" ON "notification_categories"("organizationId", "key");

-- CreateIndex
CREATE INDEX "email_providers_organizationId_isActive_idx" ON "email_providers"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "sms_providers_organizationId_isActive_idx" ON "sms_providers"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "push_providers_organizationId_isActive_idx" ON "push_providers"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "notification_templates_organizationId_channel_isActive_idx" ON "notification_templates"("organizationId", "channel", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_organizationId_key_locale_key" ON "notification_templates"("organizationId", "key", "locale");

-- CreateIndex
CREATE INDEX "notifications_organizationId_status_idx" ON "notifications"("organizationId", "status");

-- CreateIndex
CREATE INDEX "notifications_recipientUserId_status_idx" ON "notifications"("recipientUserId", "status");

-- CreateIndex
CREATE INDEX "notifications_organizationId_scheduledFor_idx" ON "notifications"("organizationId", "scheduledFor");

-- CreateIndex
CREATE INDEX "notifications_organizationId_createdAt_idx" ON "notifications"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "notification_attachments_notificationId_idx" ON "notification_attachments"("notificationId");

-- CreateIndex
CREATE INDEX "notification_deliveries_notificationId_idx" ON "notification_deliveries"("notificationId");

-- CreateIndex
CREATE INDEX "notification_deliveries_providerMessageId_idx" ON "notification_deliveries"("providerMessageId");

-- CreateIndex
CREATE INDEX "notification_deliveries_status_idx" ON "notification_deliveries"("status");

-- CreateIndex
CREATE INDEX "notification_events_notificationId_eventType_idx" ON "notification_events"("notificationId", "eventType");

-- CreateIndex
CREATE INDEX "notification_events_occurredAt_idx" ON "notification_events"("occurredAt");

-- CreateIndex
CREATE INDEX "notification_logs_organizationId_createdAt_idx" ON "notification_logs"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "notification_logs_notificationId_idx" ON "notification_logs"("notificationId");

-- CreateIndex
CREATE INDEX "notification_queue_queueName_status_idx" ON "notification_queue"("queueName", "status");

-- CreateIndex
CREATE INDEX "notification_queue_status_scheduledFor_idx" ON "notification_queue"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "notification_schedules_organizationId_isActive_idx" ON "notification_schedules"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "notification_schedules_isActive_nextRunAt_idx" ON "notification_schedules"("isActive", "nextRunAt");

-- CreateIndex
CREATE INDEX "notification_digests_isActive_nextScheduledAt_idx" ON "notification_digests"("isActive", "nextScheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "notification_digests_userId_organizationId_frequency_key" ON "notification_digests"("userId", "organizationId", "frequency");

-- CreateIndex
CREATE INDEX "notification_preferences_userId_organizationId_idx" ON "notification_preferences"("userId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_userId_organizationId_categoryId_c_key" ON "notification_preferences"("userId", "organizationId", "categoryId", "channel");

-- CreateIndex
CREATE UNIQUE INDEX "device_tokens_token_key" ON "device_tokens"("token");

-- CreateIndex
CREATE INDEX "device_tokens_userId_isActive_idx" ON "device_tokens"("userId", "isActive");

-- CreateIndex
CREATE INDEX "notification_webhooks_organizationId_isActive_idx" ON "notification_webhooks"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "market_data_provider_configs_type_isActive_idx" ON "market_data_provider_configs"("type", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "exchanges_code_key" ON "exchanges"("code");

-- CreateIndex
CREATE INDEX "exchanges_isActive_idx" ON "exchanges"("isActive");

-- CreateIndex
CREATE INDEX "trading_sessions_exchangeId_type_isActive_idx" ON "trading_sessions"("exchangeId", "type", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "supported_timeframes_providerId_interval_key" ON "supported_timeframes"("providerId", "interval");

-- CreateIndex
CREATE INDEX "instruments_assetClass_status_idx" ON "instruments"("assetClass", "status");

-- CreateIndex
CREATE INDEX "instruments_status_idx" ON "instruments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "instruments_exchangeId_symbol_key" ON "instruments"("exchangeId", "symbol");

-- CreateIndex
CREATE INDEX "instrument_aliases_instrumentId_idx" ON "instrument_aliases"("instrumentId");

-- CreateIndex
CREATE UNIQUE INDEX "instrument_aliases_providerId_providerSymbol_key" ON "instrument_aliases"("providerId", "providerSymbol");

-- CreateIndex
CREATE UNIQUE INDEX "market_candles_supersedesId_key" ON "market_candles"("supersedesId");

-- CreateIndex
CREATE INDEX "market_candles_instrumentId_interval_eventTime_idx" ON "market_candles"("instrumentId", "interval", "eventTime");

-- CreateIndex
CREATE INDEX "market_candles_importJobId_idx" ON "market_candles"("importJobId");

-- CreateIndex
CREATE INDEX "market_candles_providerId_idx" ON "market_candles"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "market_candles_instrumentId_interval_eventTime_source_key" ON "market_candles"("instrumentId", "interval", "eventTime", "source");

-- CreateIndex
CREATE INDEX "market_quotes_instrumentId_eventTime_idx" ON "market_quotes"("instrumentId", "eventTime");

-- CreateIndex
CREATE INDEX "market_quotes_providerId_idx" ON "market_quotes"("providerId");

-- CreateIndex
CREATE INDEX "market_ticks_instrumentId_eventTime_idx" ON "market_ticks"("instrumentId", "eventTime");

-- CreateIndex
CREATE INDEX "market_ticks_providerId_idx" ON "market_ticks"("providerId");

-- CreateIndex
CREATE INDEX "corporate_actions_instrumentId_effectiveDate_idx" ON "corporate_actions"("instrumentId", "effectiveDate");

-- CreateIndex
CREATE INDEX "data_import_jobs_providerId_status_idx" ON "data_import_jobs"("providerId", "status");

-- CreateIndex
CREATE INDEX "data_import_jobs_status_idx" ON "data_import_jobs"("status");

-- CreateIndex
CREATE INDEX "data_quality_issues_status_detectedAt_idx" ON "data_quality_issues"("status", "detectedAt");

-- CreateIndex
CREATE INDEX "data_quality_issues_instrumentId_status_idx" ON "data_quality_issues"("instrumentId", "status");

-- CreateIndex
CREATE INDEX "data_gaps_instrumentId_interval_status_idx" ON "data_gaps"("instrumentId", "interval", "status");

-- CreateIndex
CREATE INDEX "data_gaps_status_idx" ON "data_gaps"("status");

-- CreateIndex
CREATE UNIQUE INDEX "strategy_tags_name_key" ON "strategy_tags"("name");

-- CreateIndex
CREATE INDEX "strategy_tag_assignments_tagId_idx" ON "strategy_tag_assignments"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "strategies_currentPublishedVersionId_key" ON "strategies"("currentPublishedVersionId");

-- CreateIndex
CREATE INDEX "strategies_organizationId_status_idx" ON "strategies"("organizationId", "status");

-- CreateIndex
CREATE INDEX "strategies_organizationId_categoryCode_idx" ON "strategies"("organizationId", "categoryCode");

-- CreateIndex
CREATE INDEX "strategies_organizationId_createdAt_idx" ON "strategies"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "strategies_organizationId_updatedAt_idx" ON "strategies"("organizationId", "updatedAt");

-- CreateIndex
CREATE INDEX "strategies_organizationId_name_idx" ON "strategies"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "strategies_organizationId_slug_key" ON "strategies"("organizationId", "slug");

-- CreateIndex
CREATE INDEX "strategy_versions_organizationId_status_idx" ON "strategy_versions"("organizationId", "status");

-- CreateIndex
CREATE INDEX "strategy_versions_strategyId_status_idx" ON "strategy_versions"("strategyId", "status");

-- CreateIndex
CREATE INDEX "strategy_versions_organizationId_createdAt_idx" ON "strategy_versions"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "strategy_versions_strategyId_versionNumber_key" ON "strategy_versions"("strategyId", "versionNumber");

-- CreateIndex
CREATE INDEX "rule_groups_strategyVersionId_parentGroupId_idx" ON "rule_groups"("strategyVersionId", "parentGroupId");

-- CreateIndex
CREATE INDEX "rule_groups_organizationId_idx" ON "rule_groups"("organizationId");

-- CreateIndex
CREATE INDEX "rules_ruleGroupId_idx" ON "rules"("ruleGroupId");

-- CreateIndex
CREATE INDEX "rules_organizationId_idx" ON "rules"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "conditions_ruleId_key" ON "conditions"("ruleId");

-- CreateIndex
CREATE INDEX "conditions_organizationId_idx" ON "conditions"("organizationId");

-- CreateIndex
CREATE INDEX "strategy_parameters_organizationId_idx" ON "strategy_parameters"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "strategy_parameters_strategyVersionId_name_key" ON "strategy_parameters"("strategyVersionId", "name");

-- CreateIndex
CREATE INDEX "execution_profiles_organizationId_idx" ON "execution_profiles"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "execution_profiles_strategyVersionId_name_key" ON "execution_profiles"("strategyVersionId", "name");

-- CreateIndex
CREATE INDEX "strategy_validations_strategyVersionId_ranAt_idx" ON "strategy_validations"("strategyVersionId", "ranAt");

-- CreateIndex
CREATE INDEX "strategy_validations_organizationId_idx" ON "strategy_validations"("organizationId");

-- CreateIndex
CREATE INDEX "strategy_approvals_strategyVersionId_decision_idx" ON "strategy_approvals"("strategyVersionId", "decision");

-- CreateIndex
CREATE INDEX "strategy_approvals_organizationId_decision_idx" ON "strategy_approvals"("organizationId", "decision");

-- CreateIndex
CREATE INDEX "strategy_publications_strategyVersionId_idx" ON "strategy_publications"("strategyVersionId");

-- CreateIndex
CREATE INDEX "strategy_publications_organizationId_publishedAt_idx" ON "strategy_publications"("organizationId", "publishedAt");

-- CreateIndex
CREATE INDEX "strategy_history_strategyId_occurredAt_idx" ON "strategy_history"("strategyId", "occurredAt");

-- CreateIndex
CREATE INDEX "strategy_history_organizationId_occurredAt_idx" ON "strategy_history"("organizationId", "occurredAt");

-- CreateIndex
CREATE INDEX "strategy_outbox_events_status_createdAt_idx" ON "strategy_outbox_events"("status", "createdAt");

-- CreateIndex
CREATE INDEX "strategy_outbox_events_organizationId_aggregateId_idx" ON "strategy_outbox_events"("organizationId", "aggregateId");

-- CreateIndex
CREATE INDEX "strategy_outbox_events_correlationId_idx" ON "strategy_outbox_events"("correlationId");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_defaultOrganizationId_fkey" FOREIGN KEY ("defaultOrganizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_parentRoleId_fkey" FOREIGN KEY ("parentRoleId") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_history" ADD CONSTRAINT "login_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_verifications" ADD CONSTRAINT "email_verifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "two_factor_secrets" ADD CONSTRAINT "two_factor_secrets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recovery_codes" ADD CONSTRAINT "recovery_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_invitations" ADD CONSTRAINT "organization_invitations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_invitations" ADD CONSTRAINT "organization_invitations_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_membership_events" ADD CONSTRAINT "organization_membership_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_membership_events" ADD CONSTRAINT "organization_membership_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_membership_events" ADD CONSTRAINT "organization_membership_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_features" ADD CONSTRAINT "plan_features_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_features" ADD CONSTRAINT "plan_features_featureFlagId_fkey" FOREIGN KEY ("featureFlagId") REFERENCES "feature_flags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_subscriptions" ADD CONSTRAINT "organization_subscriptions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_subscriptions" ADD CONSTRAINT "organization_subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_accounts" ADD CONSTRAINT "billing_accounts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "organization_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_categories" ADD CONSTRAINT "notification_categories_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_providers" ADD CONSTRAINT "email_providers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sms_providers" ADD CONSTRAINT "sms_providers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_providers" ADD CONSTRAINT "push_providers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "notification_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_layoutId_fkey" FOREIGN KEY ("layoutId") REFERENCES "notification_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "notification_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "notification_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipientUserId_fkey" FOREIGN KEY ("recipientUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_attachments" ADD CONSTRAINT "notification_attachments_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_emailProviderId_fkey" FOREIGN KEY ("emailProviderId") REFERENCES "email_providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_smsProviderId_fkey" FOREIGN KEY ("smsProviderId") REFERENCES "sms_providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_pushProviderId_fkey" FOREIGN KEY ("pushProviderId") REFERENCES "push_providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_events" ADD CONSTRAINT "notification_events_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_events" ADD CONSTRAINT "notification_events_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "notification_deliveries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_queue" ADD CONSTRAINT "notification_queue_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_schedules" ADD CONSTRAINT "notification_schedules_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_schedules" ADD CONSTRAINT "notification_schedules_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "notification_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_digests" ADD CONSTRAINT "notification_digests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_digests" ADD CONSTRAINT "notification_digests_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "notification_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_pushProviderId_fkey" FOREIGN KEY ("pushProviderId") REFERENCES "push_providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_webhooks" ADD CONSTRAINT "notification_webhooks_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trading_sessions" ADD CONSTRAINT "trading_sessions_exchangeId_fkey" FOREIGN KEY ("exchangeId") REFERENCES "exchanges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supported_timeframes" ADD CONSTRAINT "supported_timeframes_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "market_data_provider_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instruments" ADD CONSTRAINT "instruments_exchangeId_fkey" FOREIGN KEY ("exchangeId") REFERENCES "exchanges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_aliases" ADD CONSTRAINT "instrument_aliases_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "instruments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instrument_aliases" ADD CONSTRAINT "instrument_aliases_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "market_data_provider_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_candles" ADD CONSTRAINT "market_candles_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "instruments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_candles" ADD CONSTRAINT "market_candles_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "market_data_provider_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_candles" ADD CONSTRAINT "market_candles_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "data_import_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_candles" ADD CONSTRAINT "market_candles_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "market_candles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_quotes" ADD CONSTRAINT "market_quotes_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "instruments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_quotes" ADD CONSTRAINT "market_quotes_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "market_data_provider_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_ticks" ADD CONSTRAINT "market_ticks_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "instruments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_ticks" ADD CONSTRAINT "market_ticks_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "market_data_provider_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_actions" ADD CONSTRAINT "corporate_actions_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "instruments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_actions" ADD CONSTRAINT "corporate_actions_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "market_data_provider_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_import_jobs" ADD CONSTRAINT "data_import_jobs_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "market_data_provider_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_quality_issues" ADD CONSTRAINT "data_quality_issues_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "instruments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_quality_issues" ADD CONSTRAINT "data_quality_issues_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "data_import_jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_gaps" ADD CONSTRAINT "data_gaps_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "instruments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategy_tag_assignments" ADD CONSTRAINT "strategy_tag_assignments_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "strategies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategy_tag_assignments" ADD CONSTRAINT "strategy_tag_assignments_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "strategy_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategies" ADD CONSTRAINT "strategies_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategies" ADD CONSTRAINT "strategies_categoryCode_fkey" FOREIGN KEY ("categoryCode") REFERENCES "strategy_categories"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategies" ADD CONSTRAINT "strategies_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategies" ADD CONSTRAINT "strategies_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategies" ADD CONSTRAINT "strategies_currentPublishedVersionId_fkey" FOREIGN KEY ("currentPublishedVersionId") REFERENCES "strategy_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategy_versions" ADD CONSTRAINT "strategy_versions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategy_versions" ADD CONSTRAINT "strategy_versions_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "strategies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategy_versions" ADD CONSTRAINT "strategy_versions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategy_versions" ADD CONSTRAINT "strategy_versions_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rule_groups" ADD CONSTRAINT "rule_groups_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rule_groups" ADD CONSTRAINT "rule_groups_strategyVersionId_fkey" FOREIGN KEY ("strategyVersionId") REFERENCES "strategy_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rule_groups" ADD CONSTRAINT "rule_groups_parentGroupId_fkey" FOREIGN KEY ("parentGroupId") REFERENCES "rule_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rule_groups" ADD CONSTRAINT "rule_groups_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rule_groups" ADD CONSTRAINT "rule_groups_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rules" ADD CONSTRAINT "rules_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rules" ADD CONSTRAINT "rules_ruleGroupId_fkey" FOREIGN KEY ("ruleGroupId") REFERENCES "rule_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rules" ADD CONSTRAINT "rules_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rules" ADD CONSTRAINT "rules_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conditions" ADD CONSTRAINT "conditions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conditions" ADD CONSTRAINT "conditions_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conditions" ADD CONSTRAINT "conditions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conditions" ADD CONSTRAINT "conditions_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategy_parameters" ADD CONSTRAINT "strategy_parameters_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategy_parameters" ADD CONSTRAINT "strategy_parameters_strategyVersionId_fkey" FOREIGN KEY ("strategyVersionId") REFERENCES "strategy_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategy_parameters" ADD CONSTRAINT "strategy_parameters_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategy_parameters" ADD CONSTRAINT "strategy_parameters_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_profiles" ADD CONSTRAINT "execution_profiles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_profiles" ADD CONSTRAINT "execution_profiles_strategyVersionId_fkey" FOREIGN KEY ("strategyVersionId") REFERENCES "strategy_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_profiles" ADD CONSTRAINT "execution_profiles_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_profiles" ADD CONSTRAINT "execution_profiles_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategy_validations" ADD CONSTRAINT "strategy_validations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategy_validations" ADD CONSTRAINT "strategy_validations_strategyVersionId_fkey" FOREIGN KEY ("strategyVersionId") REFERENCES "strategy_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategy_validations" ADD CONSTRAINT "strategy_validations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategy_approvals" ADD CONSTRAINT "strategy_approvals_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategy_approvals" ADD CONSTRAINT "strategy_approvals_strategyVersionId_fkey" FOREIGN KEY ("strategyVersionId") REFERENCES "strategy_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategy_approvals" ADD CONSTRAINT "strategy_approvals_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategy_approvals" ADD CONSTRAINT "strategy_approvals_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategy_publications" ADD CONSTRAINT "strategy_publications_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategy_publications" ADD CONSTRAINT "strategy_publications_strategyVersionId_fkey" FOREIGN KEY ("strategyVersionId") REFERENCES "strategy_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategy_publications" ADD CONSTRAINT "strategy_publications_supersedesVersionId_fkey" FOREIGN KEY ("supersedesVersionId") REFERENCES "strategy_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategy_publications" ADD CONSTRAINT "strategy_publications_publishedByUserId_fkey" FOREIGN KEY ("publishedByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategy_history" ADD CONSTRAINT "strategy_history_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategy_history" ADD CONSTRAINT "strategy_history_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "strategies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategy_history" ADD CONSTRAINT "strategy_history_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategy_outbox_events" ADD CONSTRAINT "strategy_outbox_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
