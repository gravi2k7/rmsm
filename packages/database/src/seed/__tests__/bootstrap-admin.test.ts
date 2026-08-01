import { describe, expect, it, beforeEach } from "vitest";
import { randomUUID } from "crypto";
import { ValidationError } from "@rmsm/shared";
import { bootstrapAdministrator, SUPER_ADMIN_ROLE_NAME } from "../bootstrap-admin";

/**
 * A minimal, in-memory fake implementing only the PrismaClient surface
 * `bootstrapAdministrator`/`createBootstrapAdmin` actually calls — same
 * "fake delegate, not a mock framework" convention already used by
 * `packages/database/src/__tests__/prisma-repository.test.ts`.
 * `$transaction` just runs the callback against `this` (no real
 * isolation needed for these tests — nothing here exercises rollback
 * behavior, only what gets written on the happy path vs. what's rejected
 * before any write happens).
 */
class FakePrisma {
  roles = new Map<string, { id: string; name: string }>();
  users = new Map<string, { id: string; email: string; passwordHash: string; status: string; emailVerifiedAt: Date | null }>();
  profiles: { userId: string; firstName: string; lastName: string }[] = [];
  userRoles: { userId: string; roleId: string }[] = [];
  organizations = new Map<string, { id: string; name: string; slug: string; createdById: string | null }>();
  memberships: { organizationId: string; userId: string; role: string }[] = [];
  auditLogs: { userId: string; action: string; entityType: string; entityId: string; metadata: unknown }[] = [];

  seedRole(name: string): string {
    const id = randomUUID();
    this.roles.set(id, { id, name });
    return id;
  }

  role = {
    findUnique: async ({ where }: { where: { name: string } }) => {
      return [...this.roles.values()].find((r) => r.name === where.name) ?? null;
    },
  };

  user = {
    findUnique: async ({ where }: { where: { email: string } }) => {
      return [...this.users.values()].find((u) => u.email === where.email) ?? null;
    },
    create: async ({ data }: { data: { email: string; passwordHash: string; status: string; emailVerifiedAt: Date; profile: { create: { firstName: string; lastName: string } }; userRoles: { create: { roleId: string } } } }) => {
      const id = randomUUID();
      const user = { id, email: data.email, passwordHash: data.passwordHash, status: data.status, emailVerifiedAt: data.emailVerifiedAt };
      this.users.set(id, user);
      this.profiles.push({ userId: id, firstName: data.profile.create.firstName, lastName: data.profile.create.lastName });
      this.userRoles.push({ userId: id, roleId: data.userRoles.create.roleId });
      return user;
    },
  };

  userRole = {
    findFirst: async ({ where }: { where: { role: { name: string } } }) => {
      const roleIds = new Set([...this.roles.values()].filter((r) => r.name === where.role.name).map((r) => r.id));
      return this.userRoles.find((ur) => roleIds.has(ur.roleId)) ?? null;
    },
  };

  organization = {
    findUnique: async ({ where }: { where: { slug: string } }) => {
      return [...this.organizations.values()].find((o) => o.slug === where.slug) ?? null;
    },
    create: async ({ data }: { data: { name: string; slug: string; createdById: string } }) => {
      const id = randomUUID();
      const org = { id, name: data.name, slug: data.slug, createdById: data.createdById };
      this.organizations.set(id, org);
      return org;
    },
  };

  organizationMembership = {
    create: async ({ data }: { data: { organizationId: string; userId: string; role: string } }) => {
      this.memberships.push(data);
      return data;
    },
  };

  auditLog = {
    create: async ({ data }: { data: { userId: string; action: string; entityType: string; entityId: string; metadata: unknown } }) => {
      this.auditLogs.push(data);
      return data;
    },
  };

  async $transaction<T>(fn: (tx: this) => Promise<T>): Promise<T> {
    return fn(this);
  }
}

const VALID_PASSWORD = "Str0ng!Passw0rd";

describe("bootstrapAdministrator", () => {
  let prisma: FakePrisma;

  beforeEach(() => {
    prisma = new FakePrisma();
    prisma.seedRole(SUPER_ADMIN_ROLE_NAME);
  });

  it("first seed: creates the SUPER_ADMIN user when none exists", async () => {
    const result = await bootstrapAdministrator(prisma as never, {
      email: "admin@rmsm.ai",
      password: VALID_PASSWORD,
      firstName: "Ravi",
      lastName: "Gopal",
    });

    expect(result).toMatchObject({ status: "created", email: "admin@rmsm.ai" });
    expect(prisma.users.size).toBe(1);
    const user = [...prisma.users.values()][0];
    expect(user).toBeDefined();
    expect(user?.email).toBe("admin@rmsm.ai");
    expect(user?.status).toBe("ACTIVE");
    expect(user?.emailVerifiedAt).toBeInstanceOf(Date);
  });

  it("second seed: running again is a no-op and does not create a duplicate user", async () => {
    await bootstrapAdministrator(prisma as never, { email: "admin@rmsm.ai", password: VALID_PASSWORD });
    const secondResult = await bootstrapAdministrator(prisma as never, { email: "admin@rmsm.ai", password: VALID_PASSWORD });

    expect(secondResult).toEqual({ status: "already_exists" });
    expect(prisma.users.size).toBe(1);
  });

  it("duplicate prevention: a second run with different bootstrap env vars still does not create a second admin", async () => {
    await bootstrapAdministrator(prisma as never, { email: "admin@rmsm.ai", password: VALID_PASSWORD });
    const secondResult = await bootstrapAdministrator(prisma as never, { email: "someone-else@rmsm.ai", password: "An0ther!Passw0rd" });

    expect(secondResult).toEqual({ status: "already_exists" });
    expect(prisma.users.size).toBe(1);
    expect([...prisma.users.values()][0]?.email).toBe("admin@rmsm.ai");
  });

  it("role assignment: assigns the SUPER_ADMIN role to the created user", async () => {
    const result = await bootstrapAdministrator(prisma as never, { email: "admin@rmsm.ai", password: VALID_PASSWORD });
    expect(result.status).toBe("created");
    if (result.status !== "created") throw new Error("unreachable");

    const superAdminRole = [...prisma.roles.values()].find((r) => r.name === SUPER_ADMIN_ROLE_NAME);
    expect(superAdminRole).toBeDefined();
    expect(prisma.userRoles).toContainEqual({ userId: result.userId, roleId: superAdminRole?.id });
  });

  it("password hashing: stores an Argon2id hash, never the plaintext password", async () => {
    await bootstrapAdministrator(prisma as never, { email: "admin@rmsm.ai", password: VALID_PASSWORD });
    const user = [...prisma.users.values()][0];
    expect(user).toBeDefined();

    expect(user?.passwordHash).not.toBe(VALID_PASSWORD);
    expect(user?.passwordHash.startsWith("$argon2id$")).toBe(true);
  });

  it("environment validation: aborts with a clear ValidationError when the password is missing", async () => {
    await expect(bootstrapAdministrator(prisma as never, { email: "admin@rmsm.ai" })).rejects.toThrow(ValidationError);
    expect(prisma.users.size).toBe(0);
  });

  it("environment validation: aborts with a clear ValidationError when the email is missing but password is set", async () => {
    await expect(bootstrapAdministrator(prisma as never, { password: VALID_PASSWORD })).rejects.toThrow(ValidationError);
    expect(prisma.users.size).toBe(0);
  });

  it("environment validation: aborts when the password fails the platform's password policy", async () => {
    await expect(bootstrapAdministrator(prisma as never, { email: "admin@rmsm.ai", password: "short" })).rejects.toThrow(ValidationError);
    expect(prisma.users.size).toBe(0);
  });

  it("skips cleanly (not an error) when neither email nor password is set", async () => {
    const result = await bootstrapAdministrator(prisma as never, {});
    expect(result).toEqual({ status: "skipped_not_configured" });
    expect(prisma.users.size).toBe(0);
  });

  it("defaults firstName/lastName to System/Administrator when unset", async () => {
    await bootstrapAdministrator(prisma as never, { email: "admin@rmsm.ai", password: VALID_PASSWORD });
    expect(prisma.profiles).toContainEqual(expect.objectContaining({ firstName: "System", lastName: "Administrator" }));
  });

  it("creates an organization and OWNER membership when BOOTSTRAP_ADMIN_ORGANIZATION is set", async () => {
    const result = await bootstrapAdministrator(prisma as never, {
      email: "admin@rmsm.ai",
      password: VALID_PASSWORD,
      organization: "RMSM Platform",
    });
    expect(result.status).toBe("created");
    if (result.status !== "created") throw new Error("unreachable");

    expect(result.organizationId).toBeDefined();
    expect(prisma.organizations.size).toBe(1);
    expect(prisma.memberships).toContainEqual({ organizationId: result.organizationId, userId: result.userId, role: "OWNER" });
  });

  it("does not create any organization when BOOTSTRAP_ADMIN_ORGANIZATION is unset", async () => {
    await bootstrapAdministrator(prisma as never, { email: "admin@rmsm.ai", password: VALID_PASSWORD });
    expect(prisma.organizations.size).toBe(0);
    expect(prisma.memberships).toHaveLength(0);
  });

  it("writes an audit log entry for the bootstrap creation", async () => {
    const result = await bootstrapAdministrator(prisma as never, { email: "admin@rmsm.ai", password: VALID_PASSWORD });
    if (result.status !== "created") throw new Error("unreachable");

    expect(prisma.auditLogs).toContainEqual(
      expect.objectContaining({ userId: result.userId, action: "admin.bootstrap_created", entityType: "User", entityId: result.userId }),
    );
  });

  it("rejects with a clear error if a non-admin user already exists with the bootstrap email", async () => {
    // Simulate a pre-existing, unrelated account with the same email —
    // reached only because no SUPER_ADMIN exists yet.
    const preexisting = { id: randomUUID(), email: "admin@rmsm.ai", passwordHash: "irrelevant", status: "ACTIVE", emailVerifiedAt: null };
    prisma.users.set(preexisting.id, preexisting);

    await expect(bootstrapAdministrator(prisma as never, { email: "admin@rmsm.ai", password: VALID_PASSWORD })).rejects.toThrow(ValidationError);
    expect(prisma.users.size).toBe(1);
  });

  it("throws if the SUPER_ADMIN role has not been seeded yet (seed-ordering guard)", async () => {
    const emptyPrisma = new FakePrisma(); // no seedRole() call
    await expect(bootstrapAdministrator(emptyPrisma as never, { email: "admin@rmsm.ai", password: VALID_PASSWORD })).rejects.toThrow(ValidationError);
  });
});
