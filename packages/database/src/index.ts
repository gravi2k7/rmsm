import { PrismaClient } from "@prisma/client";

/**
 * Singleton PrismaClient. In dev, reuse across hot-reloads via globalThis
 * to avoid exhausting the Postgres connection pool.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export * from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────
// Named relation-payload types.
//
// Repository methods that `include` relations return Prisma's inferred
// GetPayload types. Left inferred, those types reference
// @prisma/client/runtime/library internals that TypeScript cannot name in
// a declaration file emitted from a different package (TS2742). Exporting
// them here, by name, from @rmsm/database — a real package boundary both
// apps/api and any future consumer already depend on — is the fix: callers
// annotate with `UserWithProfile` etc. instead of letting the return type
// be inferred structurally.
// ─────────────────────────────────────────────────────────────────────────
import type { Prisma } from "@prisma/client";

export type UserWithProfile = Prisma.UserGetPayload<{ include: { profile: true } }>;

export type UserWithRoles = Prisma.UserGetPayload<{
  include: {
    userRoles: {
      include: {
        role: { include: { rolePermissions: { include: { permission: true } } } };
      };
    };
  };
}>;

export type RoleWithPermissions = Prisma.RoleGetPayload<{
  include: { rolePermissions: { include: { permission: true } } };
}>;

export type UserAccountSummary = Prisma.UserGetPayload<{
  select: {
    id: true;
    email: true;
    status: true;
    emailVerifiedAt: true;
    createdAt: true;
    profile: true;
  };
}>;

// ─────────────────────────────────────────────────────────────────────────
// Module 003 additions
// ─────────────────────────────────────────────────────────────────────────

export type OrganizationMembershipWithUser = Prisma.OrganizationMembershipGetPayload<{
  include: { user: { include: { profile: true } } };
}>;

export type OrganizationMembershipWithOrganization = Prisma.OrganizationMembershipGetPayload<{
  include: { organization: true };
}>;

export type OrganizationInvitationWithOrganization = Prisma.OrganizationInvitationGetPayload<{
  include: { organization: true };
}>;

/**
 * Every Module 003 repository method accepts an optional transaction
 * client as its final parameter, defaulting to the singleton `prisma`.
 * This is what lets Phase 3 services compose atomic multi-table operations
 * across multiple repositories (e.g. "create organization + create owner
 * membership + write a history event" as one `prisma.$transaction`) while
 * every individual repository method stays a single-table primitive with
 * zero orchestration logic of its own — the transaction boundary itself is
 * a service-layer decision, per the repository/service split in
 * MODULE_003_PHASE_2_REPOSITORIES.md.
 */
export type DbClient = PrismaClient | Prisma.TransactionClient;

// ─────────────────────────────────────────────────────────────────────────
// Module 004 additions
// ─────────────────────────────────────────────────────────────────────────

export type SubscriptionPlanWithFeatures = Prisma.SubscriptionPlanGetPayload<{
  include: { planFeatures: { include: { featureFlag: true } } };
}>;

export type PlanFeatureWithFeatureFlag = Prisma.PlanFeatureGetPayload<{
  include: { featureFlag: true };
}>;

export type OrganizationSubscriptionWithPlan = Prisma.OrganizationSubscriptionGetPayload<{
  include: { plan: true };
}>;

export type InvoiceWithLines = Prisma.InvoiceGetPayload<{
  include: { lines: true };
}>;

// ─────────────────────────────────────────────────────────────────────────
// Module 005 additions
// ─────────────────────────────────────────────────────────────────────────

export type NotificationTemplateWithLayout = Prisma.NotificationTemplateGetPayload<{
  include: { layout: true };
}>;

export type NotificationWithDeliveries = Prisma.NotificationGetPayload<{
  include: { deliveries: true };
}>;
