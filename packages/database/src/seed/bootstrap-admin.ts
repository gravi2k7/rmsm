/**
 * AUTH-004 — Bootstrap Administrator.
 *
 * The seed script (`prisma/seed.ts`) populates roles, permissions, plans,
 * feature flags, and strategy categories, but none of that creates a
 * user — a fresh deployment therefore has zero accounts and nobody can
 * ever log in. This module is that seed's missing step: it creates the
 * first SUPER_ADMIN account, exactly once, from environment variables.
 *
 * Idempotency (the prompt's own primary requirement — "running seed
 * multiple times must never create duplicate users"): the ENTIRE
 * creation path is gated on "does any user already hold the SUPER_ADMIN
 * role" — not "does a user with this specific email already exist."
 * That's deliberate: it means re-running the seed after a bootstrap
 * admin already exists is always a safe no-op (the common case — seed
 * runs on every deploy), and it also means an operator who later
 * promotes some other account to SUPER_ADMIN through the product itself
 * causes this step to stand down too, rather than trying to create a
 * second one.
 *
 * This lives under `src/` (not `prisma/`) so it is typechecked by
 * `pnpm typecheck` and unit-testable with a fake Prisma client the same
 * way every other `packages/database/src/__tests__` file already is —
 * `prisma/seed.ts` itself stays a thin script that only reads
 * `process.env` and calls this.
 */
import type { PrismaClient, Prisma } from "@prisma/client";
import { checkPasswordPolicy, DEFAULT_PASSWORD_POLICY, hashPassword, slugify, ValidationError, toInputJsonValue } from "@rmsm/shared";

export const SUPER_ADMIN_ROLE_NAME = "SUPER_ADMIN";

export interface BootstrapAdminEnv {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  organization?: string;
}

export type BootstrapAdminOutcome =
  | { status: "already_exists" }
  | { status: "skipped_not_configured" }
  | { status: "created"; userId: string; email: string; organizationId?: string };

/** Every write happens inside one transaction — a partial bootstrap admin (user with no role, or role with no organization) is exactly the kind of half-created state this milestone exists to prevent. */
async function createBootstrapAdmin(
  tx: Prisma.TransactionClient,
  input: { email: string; passwordHash: string; firstName: string; lastName: string; organization?: string },
): Promise<{ userId: string; organizationId?: string }> {
  const role = await tx.role.findUnique({ where: { name: SUPER_ADMIN_ROLE_NAME } });
  if (!role) {
    // Cannot happen in a normal seed run (main() seeds DEFAULT_ROLES,
    // SUPER_ADMIN included, before calling this) — guarded explicitly
    // rather than letting a foreign-key error surface instead, since
    // that would be a confusing failure mode for what's actually a
    // seed-ordering bug.
    throw new ValidationError(`Cannot bootstrap an administrator — the "${SUPER_ADMIN_ROLE_NAME}" role is not seeded yet.`);
  }

  const existingUser = await tx.user.findUnique({ where: { email: input.email } });
  if (existingUser) {
    // Reached this branch means no SUPER_ADMIN exists yet (the caller
    // already checked), so this is a *different*, pre-existing,
    // non-admin account that happens to share the bootstrap email. Bail
    // out with a clear, actionable error instead of either silently
    // promoting an unrelated account to SUPER_ADMIN or crashing on the
    // `email` unique-constraint violation `user.create` would otherwise
    // throw.
    throw new ValidationError(
      `Cannot bootstrap administrator — a user with email "${input.email}" already exists and does not hold the ${SUPER_ADMIN_ROLE_NAME} role. ` +
        "Choose a different BOOTSTRAP_ADMIN_EMAIL, or grant that account the role manually.",
    );
  }

  const user = await tx.user.create({
    data: {
      email: input.email,
      passwordHash: input.passwordHash,
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
      profile: {
        create: {
          firstName: input.firstName,
          lastName: input.lastName,
        },
      },
      userRoles: {
        create: { roleId: role.id },
      },
    },
  });

  let organizationId: string | undefined;
  if (input.organization) {
    organizationId = await findOrCreateOrganization(tx, input.organization, user.id);
    await tx.organizationMembership.create({
      data: { organizationId, userId: user.id, role: "OWNER" },
    });
  }

  await tx.auditLog.create({
    data: {
      userId: user.id,
      action: "admin.bootstrap_created",
      entityType: "User",
      entityId: user.id,
      metadata: toInputJsonValue({ email: user.email, role: SUPER_ADMIN_ROLE_NAME, organizationId: organizationId ?? null, source: "seed" }),
    },
  });

  return { userId: user.id, organizationId };
}

/** Same candidate-slug-with-retry-suffix approach as `OnboardingService.generateUniqueSlug()` (`api/src/modules/onboarding/onboarding.service.ts`) — reimplemented here rather than imported, since `packages/database` (a lower-level package `apps/api` depends on) cannot depend back on `apps/api`'s own application layer. */
async function findOrCreateOrganization(tx: Prisma.TransactionClient, name: string, ownerId: string): Promise<string> {
  const base = slugify(name) || "organization";
  let candidate = base.length >= 3 ? base : `${base}-org`;

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const existing = await tx.organization.findUnique({ where: { slug: candidate } });
    if (!existing) {
      const created = await tx.organization.create({
        data: { name, slug: candidate, createdById: ownerId },
      });
      return created.id;
    }
    // A name collision here means an organization with this slug was
    // created by something other than this bootstrap step (e.g. a
    // previous manual run) — reuse it rather than endlessly minting new
    // ones, matching this module's overall "prefer reuse over
    // duplication" stance.
    if (existing.name === name) return existing.id;
    candidate = `${base}-${(attempt + 1).toString(36)}`;
  }

  throw new ValidationError(`Could not generate a unique organization slug for bootstrap administrator organization "${name}".`);
}

/**
 * Entry point `prisma/seed.ts` calls. Reads nothing from `process.env`
 * itself (that stays in `seed.ts`, matching this package's existing
 * "seed.ts is the one script, everything else is a plain function"
 * shape) — every value arrives already resolved via `env`, which is
 * what makes this testable with plain objects instead of environment
 * mutation.
 */
export async function bootstrapAdministrator(prisma: PrismaClient, env: BootstrapAdminEnv): Promise<BootstrapAdminOutcome> {
  const alreadyExists = await prisma.userRole.findFirst({ where: { role: { name: SUPER_ADMIN_ROLE_NAME } } });
  if (alreadyExists) {
    // eslint-disable-next-line no-console -- seed script CLI output, not app runtime logging
    console.log("✓ Bootstrap administrator already exists");
    return { status: "already_exists" };
  }

  if (!env.email && !env.password) {
    // Neither var set at all: this run isn't opting into bootstrap-admin
    // creation (e.g. a throwaway/CI database seeded only for its
    // roles/permissions/plans data). Not an error — only a genuine
    // deployment needs this, and forcing every seed invocation
    // everywhere to always set these would make the vars mandatory,
    // which the prompt never asks for.
    // eslint-disable-next-line no-console -- seed script CLI output, not app runtime logging
    console.log("Skipping bootstrap administrator — BOOTSTRAP_ADMIN_EMAIL / BOOTSTRAP_ADMIN_PASSWORD not set.");
    return { status: "skipped_not_configured" };
  }

  if (!env.email) {
    throw new ValidationError("BOOTSTRAP_ADMIN_EMAIL is required to create the bootstrap administrator (BOOTSTRAP_ADMIN_PASSWORD is set).");
  }
  if (!env.password) {
    throw new ValidationError("BOOTSTRAP_ADMIN_PASSWORD is required to create the bootstrap administrator.");
  }

  const policy = checkPasswordPolicy(env.password, DEFAULT_PASSWORD_POLICY);
  if (!policy.valid) {
    throw new ValidationError("BOOTSTRAP_ADMIN_PASSWORD does not meet the platform's password policy.", { failures: policy.failures });
  }

  // Hashed with @rmsm/shared's hashPassword() — the exact same Argon2id
  // implementation api/src/modules/auth/services/password.service.ts
  // uses (AUTH-004's own "reuse, don't invent another hashing
  // implementation" requirement).
  const passwordHash = await hashPassword(env.password);

  const { userId, organizationId } = await prisma.$transaction((tx) =>
    createBootstrapAdmin(tx, {
      email: env.email as string,
      passwordHash,
      firstName: env.firstName?.trim() || "System",
      lastName: env.lastName?.trim() || "Administrator",
      organization: env.organization?.trim() || undefined,
    }),
  );

  // eslint-disable-next-line no-console -- seed script CLI output, not app runtime logging; never logs the password
  console.log(`✓ Bootstrap administrator created\n\nEmail:\n${env.email}\n\nRole:\n${SUPER_ADMIN_ROLE_NAME}`);

  return { status: "created", userId, email: env.email, organizationId };
}
