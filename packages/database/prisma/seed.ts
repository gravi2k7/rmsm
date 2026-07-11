/**
 * Seeds:
 *  - Module 001 system_health baseline row
 *  - Module 002 default roles + a starter permission set + role→permission grants
 *
 * Idempotent — safe to re-run (upsert throughout).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_ROLES = [
  { name: "SUPER_ADMIN", description: "Full unrestricted platform access.", isSystem: true },
  { name: "ADMIN", description: "Administrative access, excludes platform-owner actions.", isSystem: true },
  { name: "SUPPORT", description: "Customer support tooling access.", isSystem: true },
  { name: "ANALYST", description: "Internal analytics and reporting access.", isSystem: true },
  { name: "SUBSCRIBER", description: "Paying customer with full product access.", isSystem: true },
  { name: "FREE_USER", description: "Registered user on the free tier.", isSystem: true },
  { name: "API_CLIENT", description: "Machine-to-machine API credential.", isSystem: true },
] as const;

// Starter permission set. Business-module permissions (trading, billing,
// etc.) are added incrementally by the modules that own them — this module
// only seeds IAM-scoped permissions plus placeholders for the groups every
// future module will extend.
const DEFAULT_PERMISSIONS: { key: string; group: string; description: string }[] = [
  { key: "users.read", group: "users", description: "View user accounts." },
  { key: "users.write", group: "users", description: "Create/update user accounts." },
  { key: "users.delete", group: "users", description: "Soft-delete user accounts." },
  { key: "roles.read", group: "roles", description: "View roles and permissions." },
  { key: "roles.write", group: "roles", description: "Create/update roles and grants." },
  { key: "sessions.read", group: "sessions", description: "View any user's sessions." },
  { key: "sessions.revoke", group: "sessions", description: "Revoke any user's sessions." },
  { key: "audit.read", group: "audit", description: "View audit logs." },
];

// Role -> permission key grants for the roles that should have elevated
// access out of the box. SUBSCRIBER/FREE_USER/API_CLIENT intentionally get
// no IAM-admin permissions here — their business-facing permissions are
// granted by later modules.
const ROLE_GRANTS: Record<string, string[]> = {
  SUPER_ADMIN: DEFAULT_PERMISSIONS.map((p) => p.key),
  ADMIN: [
    "users.read",
    "users.write",
    "roles.read",
    "sessions.read",
    "sessions.revoke",
    "audit.read",
  ],
  SUPPORT: ["users.read", "sessions.read", "sessions.revoke"],
  ANALYST: ["users.read", "audit.read"],
};

async function main() {
  await prisma.systemHealth.upsert({
    where: { component: "database" },
    update: { status: "ok", checkedAt: new Date() },
    create: { component: "database", status: "ok" },
  });

  const roleByName = new Map<string, string>();
  for (const role of DEFAULT_ROLES) {
    const created = await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description, isSystem: role.isSystem },
      create: role,
    });
    roleByName.set(role.name, created.id);
  }

  const permByKey = new Map<string, string>();
  for (const perm of DEFAULT_PERMISSIONS) {
    const created = await prisma.permission.upsert({
      where: { key: perm.key },
      update: { description: perm.description, group: perm.group },
      create: perm,
    });
    permByKey.set(perm.key, created.id);
  }

  for (const [roleName, permKeys] of Object.entries(ROLE_GRANTS)) {
    const roleId = roleByName.get(roleName);
    if (!roleId) continue;
    for (const key of permKeys) {
      const permissionId = permByKey.get(key);
      if (!permissionId) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId } },
        update: {},
        create: { roleId, permissionId },
      });
    }
  }

  // eslint-disable-next-line no-console -- seed script CLI output, not app runtime logging
  console.log(
    `Seed complete: ${DEFAULT_ROLES.length} roles, ${DEFAULT_PERMISSIONS.length} permissions, grants applied.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
