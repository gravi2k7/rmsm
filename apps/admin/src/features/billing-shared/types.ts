import type { Organization } from "@/features/organizations/types";

export type { Organization };

/**
 * `GET /organizations` (Module 003) is deliberately scoped to
 * "organizations the calling admin account is an active member of," not
 * every tenant on the platform — see that endpoint's own doc comment in
 * `organization.controller.ts`. There is no cross-tenant listing
 * endpoint anywhere in the API (confirmed by reading every billing/admin
 * controller), and this milestone's constraints forbid adding one. Every
 * "all organizations" view on these pages is therefore actually "every
 * organization this admin account can see," which in practice means the
 * admin's own memberships. Real, honest data — never fabricated — but
 * narrower in scope than the label might imply, which is why every page
 * built against this layer surfaces an explicit scope banner.
 */
export interface FanOutResult<T> {
  organization: Organization;
  data: T | undefined;
  /** True when the org-scoped call 403'd — the admin's account holds no
   * active membership/role in that organization sufficient for
   * `OrganizationRoleGuard`, not a real absence of data. */
  restricted: boolean;
  isLoading: boolean;
  error: unknown;
}

export const BILLING_CYCLES = ["MONTHLY", "YEARLY"] as const;
export const SUBSCRIPTION_STATUSES = ["ACTIVE", "TRIALING", "PAST_DUE", "CANCELLED", "EXPIRED", "INCOMPLETE"] as const;
export const PAYMENT_PROVIDERS = ["STRIPE", "MOCK", "RAZORPAY", "PADDLE", "LEMONSQUEEZY", "PAYPAL"] as const;
export const INVOICE_STATUSES = ["DRAFT", "OPEN", "PAID", "VOID", "FAILED"] as const;
export const PAYMENT_STATUSES = ["PENDING", "SUCCESS", "FAILED", "REFUNDED"] as const;
export const PAYMENT_METHODS = ["CARD", "UPI", "BANK", "WALLET"] as const;
export const LICENSE_TYPES = ["PLATFORM", "ENTERPRISE", "TRIAL"] as const;
export const LICENSE_STATUSES = ["UNASSIGNED", "ACTIVE", "EXPIRED", "REVOKED"] as const;
/** Matches `CreateCouponDto`'s own validated values exactly (`"FIXED"`),
 * which do not match the Prisma `CouponType` enum's `FIXED_AMOUNT` — a
 * pre-existing inconsistency in the backend DTO, out of scope to fix
 * here (backend is off-limits this milestone). Submitting anything else
 * would fail this endpoint's own validation, so this list follows the
 * DTO, not the schema. Flagged in the implementation summary. */
export const COUPON_TYPES_DTO = ["PERCENTAGE", "FIXED"] as const;

export interface SubscriptionPlan {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  monthlyPriceCents: number;
  yearlyPriceCents: number;
  currency: string;
  trialDays: number;
  gracePeriodDays: number;
  isVisible: boolean;
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationSubscription {
  id: string;
  organizationId: string;
  planId: string;
  status: (typeof SUBSCRIPTION_STATUSES)[number];
  paymentProvider: (typeof PAYMENT_PROVIDERS)[number];
  providerSubscriptionId?: string | null;
  billingCycle: (typeof BILLING_CYCLES)[number];
  startDate: string;
  renewalDate?: string | null;
  cancellationDate?: string | null;
  trialEndsAt?: string | null;
  gracePeriodEndsAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationSubscriptionWithPlan extends OrganizationSubscription {
  plan: SubscriptionPlan;
}

export interface BillingAccount {
  id: string;
  organizationId: string;
  billingEmail: string;
  companyName?: string | null;
  taxId?: string | null;
  address: Record<string, unknown>;
  country: string;
  currency: string;
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  organizationId: string;
  subscriptionId?: string | null;
  subtotalCents: number;
  taxCents: number;
  discountCents: number;
  totalCents: number;
  currency: string;
  status: (typeof INVOICE_STATUSES)[number];
  pdfUrl?: string | null;
  issueDate: string;
  dueDate: string;
  paymentDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  organizationId: string;
  invoiceId?: string | null;
  provider: (typeof PAYMENT_PROVIDERS)[number];
  providerTransactionId?: string | null;
  amountCents: number;
  currency: string;
  status: (typeof PAYMENT_STATUSES)[number];
  method?: (typeof PAYMENT_METHODS)[number] | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  type: string;
  value: number;
  currency?: string | null;
  expiresAt?: string | null;
  maxRedemptions?: number | null;
  currentRedemptions: number;
  organizationId?: string | null;
  isPublic: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface License {
  id: string;
  key: string;
  type: (typeof LICENSE_TYPES)[number];
  seats?: number | null;
  organizationId?: string | null;
  status: (typeof LICENSE_STATUSES)[number];
  issuedAt: string;
  expiresAt?: string | null;
  assignedAt?: string | null;
  assignedById?: string | null;
  revokedAt?: string | null;
  revokedById?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformSetting {
  id: string;
  key: string;
  value: unknown;
  category: string;
  description?: string | null;
  updatedById?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UsageRecord {
  id: string;
  organizationId: string;
  period: string;
  metric: string;
  value: string | number;
  updatedAt: string;
}

/** `admin/dashboard`'s PlatformCounts — the one genuinely platform-wide,
 * cross-tenant read this API exposes (direct repository aggregation, not
 * gated by `OrganizationRoleGuard`). Used for the Billing Dashboard's
 * Active Subscriptions / Total Organizations cards, the only two
 * platform-accurate numbers available for that page. */
export interface PlatformCounts {
  totalUsers: number;
  activeUsers: number;
  totalOrganizations: number;
  activeSubscriptions: number;
  notificationsSentToday: number;
  activeSessions: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}
