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

  // ── Module 003, Phase 4 additions (additive — nothing above this comment changed) ──
  // These are platform-tier gates only ("does this account tier have this
  // feature at all") — the actual per-organization authorization is
  // OrganizationRoleGuard checking OrganizationMembership.role, not these
  // permissions. See ARCHITECTURE_DECISIONS.md and
  // MODULE_003_PHASE_4_CONTROLLERS.md for the full reasoning.
  { key: "organization.create", group: "organization", description: "Create an organization." },
  { key: "organization.read", group: "organization", description: "View organizations and their members." },
  { key: "organization.update", group: "organization", description: "Update organization details." },
  { key: "organization.delete", group: "organization", description: "Archive or soft-delete an organization." },
  { key: "organization.restore", group: "organization", description: "Restore an archived organization." },
  { key: "organization.member.invite", group: "organization", description: "Invite, resend, or cancel invitations." },
  { key: "organization.member.remove", group: "organization", description: "Remove a member from an organization." },
  { key: "organization.member.update", group: "organization", description: "Change a member's role, suspend, or reactivate them." },
  { key: "organization.owner.transfer", group: "organization", description: "Transfer organization ownership." },
  { key: "organization.settings.update", group: "organization", description: "Update organization settings." },
];

// Role -> permission key grants for the roles that should have elevated
// access out of the box. SUBSCRIBER/FREE_USER/API_CLIENT intentionally get
// no IAM-admin permissions here — their business-facing permissions are
// granted by later modules.
const ORGANIZATION_BASIC_PERMISSIONS = ["organization.create", "organization.read"];
const ORGANIZATION_MANAGEMENT_PERMISSIONS = [
  "organization.update",
  "organization.delete",
  "organization.restore",
  "organization.member.invite",
  "organization.member.remove",
  "organization.member.update",
  "organization.owner.transfer",
  "organization.settings.update",
];

const ROLE_GRANTS: Record<string, string[]> = {
  SUPER_ADMIN: DEFAULT_PERMISSIONS.map((p) => p.key),
  ADMIN: [
    "users.read",
    "users.write",
    "roles.read",
    "sessions.read",
    "sessions.revoke",
    "audit.read",
    ...ORGANIZATION_BASIC_PERMISSIONS,
    ...ORGANIZATION_MANAGEMENT_PERMISSIONS,
  ],
  SUPPORT: ["users.read", "sessions.read", "sessions.revoke"],
  ANALYST: ["users.read", "audit.read", ...ORGANIZATION_BASIC_PERMISSIONS],
  // Judgment call, flagged explicitly (no product spec supplied a tier
  // matrix): every account can create and view organizations; only
  // SUBSCRIBER-tier and above can perform organization *management*
  // actions (update, delete, invite members, transfer ownership, etc.).
  // FREE_USER therefore gets create/read but not the management set.
  // Revisit when a real pricing/tier spec exists.
  SUBSCRIBER: [...ORGANIZATION_BASIC_PERMISSIONS, ...ORGANIZATION_MANAGEMENT_PERMISSIONS],
  FREE_USER: [...ORGANIZATION_BASIC_PERMISSIONS],
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
