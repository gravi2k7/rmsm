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
