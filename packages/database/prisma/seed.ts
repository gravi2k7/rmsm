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

  // ── Module 004, Phase 4 additions (additive) ──
  { key: "billing.subscription.read", group: "billing", description: "View an organization's subscription." },
  { key: "billing.subscription.manage", group: "billing", description: "Create, change, or cancel an organization's subscription." },
  { key: "billing.account.read", group: "billing", description: "View an organization's billing account." },
  { key: "billing.account.manage", group: "billing", description: "Create or update an organization's billing account." },
  { key: "billing.invoice.read", group: "billing", description: "View an organization's invoices." },
  { key: "billing.payment.read", group: "billing", description: "View an organization's payments." },
  { key: "billing.usage.read", group: "billing", description: "View an organization's usage records." },
  { key: "billing.coupon.apply", group: "billing", description: "Validate and apply coupons to an organization's invoices." },
  { key: "billing.admin.manage", group: "billing", description: "Manage platform-wide subscription plans, features, and quotas." },

  // ── Module 005, Phase 3 additions (additive) ──
  { key: "notification.read", group: "notification", description: "View an organization's notifications and preferences." },
  { key: "notification.send", group: "notification", description: "Send, bulk-send, or schedule notifications within an organization." },
  { key: "notification.template.manage", group: "notification", description: "Create and update notification templates." },
  { key: "notification.admin.manage", group: "notification", description: "Manage platform-wide notification provider configuration." },

  // ── AI-101, Phase 4 additions (additive) — platform-level, not
  // organization-scoped (AI-101 has no organizationId anywhere, ADR-021)
  // ──
  { key: "market-data.read", group: "market-data", description: "Read exchanges, instruments, candles, quotes, ticks, and corporate actions." },
  { key: "market-data.admin.manage", group: "market-data", description: "View platform-wide provider configuration and synchronization/import status." },

  // ── AI-102, Phase 4 addition (additive) — no organizationId on
  // AI-102 either (ADR-021's own reasoning applies unchanged: indicator
  // metadata/execution is global product data, not per-tenant) ──
  { key: "indicator-engine.read", group: "indicator-engine", description: "List/lookup indicators, validate requests, check health." },
  { key: "indicator-engine.execute", group: "indicator-engine", description: "Execute indicator calculations." },
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

// Module 004 additions — same tier philosophy as the organization
// permissions above: every account can view its organization's billing
// state; only SUBSCRIBER-tier and above can manage it (create/change/
// cancel a subscription, edit the billing account, apply coupons).
// billing.admin.manage (platform-wide plan/feature/quota administration)
// is separate again — ADMIN/SUPER_ADMIN only, same as roles.write.
const BILLING_READ_PERMISSIONS = [
  "billing.subscription.read",
  "billing.account.read",
  "billing.invoice.read",
  "billing.payment.read",
  "billing.usage.read",
];
const BILLING_MANAGE_PERMISSIONS = ["billing.subscription.manage", "billing.account.manage", "billing.coupon.apply"];

// Module 005 additions — same tier philosophy again: every account can
// read notifications/preferences; only SUBSCRIBER-tier and above can
// send/schedule notifications or manage templates (sending can reach an
// organization's entire membership, a meaningfully higher-stakes action
// than reading your own notifications). notification.admin.manage
// (platform-wide provider configuration) is ADMIN/SUPER_ADMIN only, same
// as billing.admin.manage.
const NOTIFICATION_MANAGE_PERMISSIONS = ["notification.send", "notification.template.manage"];

// AI-101, Phase 4: market-data.read is granted as broadly as
// notification.read (even FREE_USER) — browsing exchanges/instruments/
// candles is a core, low-stakes product feature, not a management
// action. market-data.admin.manage (provider configuration and
// synchronization/import status) is ADMIN/SUPER_ADMIN only, same tier as
// notification.admin.manage and billing.admin.manage — platform
// operational visibility, not something every account should see.

// AI-102, Phase 4: indicator-engine.read (list/lookup/validate/health)
// is granted as broadly as market-data.read — pure discovery, no
// compute cost. indicator-engine.execute (actually running a
// calculation) is SUBSCRIBER-tier and above only — a real compute cost
// each call incurs (even though no real Indicator.calculate()
// implementation exists yet to actually spend that cost on), the same
// "compute/send-cost-bearing action needs a paid tier" reasoning
// notification.send and billing.subscription.manage already established.

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
    ...BILLING_READ_PERMISSIONS,
    ...BILLING_MANAGE_PERMISSIONS,
    "billing.admin.manage",
    "notification.read",
    ...NOTIFICATION_MANAGE_PERMISSIONS,
    "notification.admin.manage",
    "market-data.read",
    "market-data.admin.manage",
    "indicator-engine.read",
    "indicator-engine.execute",
  ],
  SUPPORT: ["users.read", "sessions.read", "sessions.revoke"],
  ANALYST: ["users.read", "audit.read", ...ORGANIZATION_BASIC_PERMISSIONS, ...BILLING_READ_PERMISSIONS, "notification.read", "market-data.read", "indicator-engine.read", "indicator-engine.execute"],
  // Judgment call, flagged explicitly (no product spec supplied a tier
  // matrix): every account can create and view organizations; only
  // SUBSCRIBER-tier and above can perform organization *management*
  // actions (update, delete, invite members, transfer ownership, etc.).
  // FREE_USER therefore gets create/read but not the management set.
  // Same split applied to billing and notification permissions this
  // phase, for the same reason. Revisit when a real pricing/tier spec
  // exists.
  SUBSCRIBER: [
    ...ORGANIZATION_BASIC_PERMISSIONS,
    ...ORGANIZATION_MANAGEMENT_PERMISSIONS,
    ...BILLING_READ_PERMISSIONS,
    ...BILLING_MANAGE_PERMISSIONS,
    "notification.read",
    ...NOTIFICATION_MANAGE_PERMISSIONS,
    "market-data.read",
    "indicator-engine.read",
    "indicator-engine.execute",
  ],
  FREE_USER: [...ORGANIZATION_BASIC_PERMISSIONS, ...BILLING_READ_PERMISSIONS, "notification.read", "market-data.read", "indicator-engine.read"],
};

// ─────────────────────────────────────────────────────────────────────────
// Module 004, Phase 5 addition — billing seed data. Without this, GET
// /billing/plans returns an empty list and every FeatureService/
// QuotaService check fails with "no such plan" — the schema and services
// existed since Phases 1–4, but nothing populated the rows they depend on.
// Not new functionality (no new endpoint, no new business rule) — this is
// configuration data for functionality that already existed and was
// untestable without it.
//
// Every price, trial length, and per-plan limit below is a placeholder
// default, not a specified value — no pricing/limits spec was provided in
// any Module 004 prompt. Flagged explicitly so these are recognized as
// "the system needs *some* numbers to be functional" rather than mistaken
// for confirmed business decisions. Plan tiers themselves (5, not 6) match
// ADR-014's resolution of the "Free/Starter/Professional/Enterprise/
// Unlimited/Support" ambiguity from Phase 1.
// ─────────────────────────────────────────────────────────────────────────

const DEFAULT_PLANS: {
  key: string;
  name: string;
  description: string;
  monthlyPriceCents: number;
  yearlyPriceCents: number;
  trialDays: number;
  gracePeriodDays: number;
  displayOrder: number;
}[] = [
  { key: "free", name: "Free", description: "Get started with the basics.", monthlyPriceCents: 0, yearlyPriceCents: 0, trialDays: 0, gracePeriodDays: 0, displayOrder: 0 },
  { key: "starter", name: "Starter", description: "For individual traders getting serious.", monthlyPriceCents: 2900, yearlyPriceCents: 29000, trialDays: 14, gracePeriodDays: 7, displayOrder: 1 },
  { key: "professional", name: "Professional", description: "Full toolset for active traders.", monthlyPriceCents: 9900, yearlyPriceCents: 99000, trialDays: 14, gracePeriodDays: 7, displayOrder: 2 },
  { key: "enterprise", name: "Enterprise", description: "For trading teams and desks.", monthlyPriceCents: 29900, yearlyPriceCents: 299000, trialDays: 14, gracePeriodDays: 14, displayOrder: 3 },
  { key: "unlimited", name: "Unlimited", description: "Every feature, no limits.", monthlyPriceCents: 99900, yearlyPriceCents: 999900, trialDays: 30, gracePeriodDays: 14, displayOrder: 4 },
];

// The exact 11 feature examples named in the original Module 004 prompt.
const DEFAULT_FEATURE_FLAGS: { key: string; name: string; type: "BOOLEAN" | "LIMIT" }[] = [
  { key: "organizations", name: "Organizations", type: "LIMIT" },
  { key: "users", name: "Team Members", type: "LIMIT" },
  { key: "indicators", name: "Custom Indicators", type: "LIMIT" },
  { key: "ai_requests", name: "AI Requests", type: "LIMIT" },
  { key: "storage", name: "Storage (MB)", type: "LIMIT" },
  { key: "alerts", name: "Alerts", type: "LIMIT" },
  { key: "api_calls", name: "API Calls", type: "LIMIT" },
  { key: "historical_data", name: "Historical Data Access", type: "BOOLEAN" },
  { key: "export", name: "Data Export", type: "BOOLEAN" },
  { key: "backtesting", name: "Backtesting", type: "BOOLEAN" },
  { key: "automation", name: "Automation", type: "BOOLEAN" },
];

// Per-plan grants: LIMIT features get a numeric cap (or `null` = unlimited);
// BOOLEAN features get true/false. UNLIMITED plan sets every LIMIT feature
// to `null` and every BOOLEAN feature to `true`, matching its name.
const PLAN_FEATURE_GRANTS: Record<string, Record<string, { enabled: boolean; limit: number | null }>> = {
  free: {
    organizations: { enabled: true, limit: 1 },
    users: { enabled: true, limit: 1 },
    indicators: { enabled: true, limit: 3 },
    ai_requests: { enabled: true, limit: 10 },
    storage: { enabled: true, limit: 100 },
    alerts: { enabled: true, limit: 5 },
    api_calls: { enabled: true, limit: 100 },
    historical_data: { enabled: false, limit: null },
    export: { enabled: false, limit: null },
    backtesting: { enabled: false, limit: null },
    automation: { enabled: false, limit: null },
  },
  starter: {
    organizations: { enabled: true, limit: 1 },
    users: { enabled: true, limit: 3 },
    indicators: { enabled: true, limit: 10 },
    ai_requests: { enabled: true, limit: 100 },
    storage: { enabled: true, limit: 1000 },
    alerts: { enabled: true, limit: 20 },
    api_calls: { enabled: true, limit: 1000 },
    historical_data: { enabled: true, limit: null },
    export: { enabled: false, limit: null },
    backtesting: { enabled: false, limit: null },
    automation: { enabled: false, limit: null },
  },
  professional: {
    organizations: { enabled: true, limit: 3 },
    users: { enabled: true, limit: 10 },
    indicators: { enabled: true, limit: 50 },
    ai_requests: { enabled: true, limit: 1000 },
    storage: { enabled: true, limit: 10000 },
    alerts: { enabled: true, limit: 100 },
    api_calls: { enabled: true, limit: 10000 },
    historical_data: { enabled: true, limit: null },
    export: { enabled: true, limit: null },
    backtesting: { enabled: true, limit: null },
    automation: { enabled: false, limit: null },
  },
  enterprise: {
    organizations: { enabled: true, limit: 10 },
    users: { enabled: true, limit: 50 },
    indicators: { enabled: true, limit: 200 },
    ai_requests: { enabled: true, limit: 10000 },
    storage: { enabled: true, limit: 100000 },
    alerts: { enabled: true, limit: 500 },
    api_calls: { enabled: true, limit: 100000 },
    historical_data: { enabled: true, limit: null },
    export: { enabled: true, limit: null },
    backtesting: { enabled: true, limit: null },
    automation: { enabled: true, limit: null },
  },
  unlimited: {
    organizations: { enabled: true, limit: null },
    users: { enabled: true, limit: null },
    indicators: { enabled: true, limit: null },
    ai_requests: { enabled: true, limit: null },
    storage: { enabled: true, limit: null },
    alerts: { enabled: true, limit: null },
    api_calls: { enabled: true, limit: null },
    historical_data: { enabled: true, limit: null },
    export: { enabled: true, limit: null },
    backtesting: { enabled: true, limit: null },
    automation: { enabled: true, limit: null },
  },
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

  const planByKey = new Map<string, string>();
  for (const plan of DEFAULT_PLANS) {
    const created = await prisma.subscriptionPlan.upsert({
      where: { key: plan.key },
      update: {
        name: plan.name,
        description: plan.description,
        monthlyPriceCents: plan.monthlyPriceCents,
        yearlyPriceCents: plan.yearlyPriceCents,
        trialDays: plan.trialDays,
        gracePeriodDays: plan.gracePeriodDays,
        displayOrder: plan.displayOrder,
      },
      create: plan,
    });
    planByKey.set(plan.key, created.id);
  }

  const featureFlagByKey = new Map<string, string>();
  for (const flag of DEFAULT_FEATURE_FLAGS) {
    const created = await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: { name: flag.name, type: flag.type },
      create: flag,
    });
    featureFlagByKey.set(flag.key, created.id);
  }

  for (const [planKey, grants] of Object.entries(PLAN_FEATURE_GRANTS)) {
    const planId = planByKey.get(planKey);
    if (!planId) continue;
    for (const [featureKey, grant] of Object.entries(grants)) {
      const featureFlagId = featureFlagByKey.get(featureKey);
      if (!featureFlagId) continue;
      await prisma.planFeature.upsert({
        where: { planId_featureFlagId: { planId, featureFlagId } },
        update: { enabled: grant.enabled, limit: grant.limit },
        create: { planId, featureFlagId, enabled: grant.enabled, limit: grant.limit },
      });
    }
  }

  // ── AI-103, Milestone 2: StrategyCategory display metadata ───────────
  // The actual set of valid categories is the domain's own closed
  // StrategyCategoryCode enum (schema.prisma's own AI-103 section) —
  // these rows are DISPLAY metadata only (name/description/sort order
  // for a future UI), seeded once, matching this milestone's own
  // "seed data for Strategy Categories" requirement.
  const STRATEGY_CATEGORIES: { code: string; displayName: string; description: string; sortOrder: number }[] = [
    { code: "TREND_FOLLOWING", displayName: "Trend Following", description: "Enters in the direction of an established price trend.", sortOrder: 1 },
    { code: "MEAN_REVERSION", displayName: "Mean Reversion", description: "Bets on price returning toward a statistical average after an extreme move.", sortOrder: 2 },
    { code: "MOMENTUM", displayName: "Momentum", description: "Follows the strength/speed of a recent price move.", sortOrder: 3 },
    { code: "BREAKOUT", displayName: "Breakout", description: "Enters when price moves decisively beyond a defined range.", sortOrder: 4 },
    { code: "SCALPING", displayName: "Scalping", description: "Very short-holding-period strategies targeting small, frequent gains.", sortOrder: 5 },
    { code: "SWING", displayName: "Swing", description: "Multi-day holding periods capturing intermediate price swings.", sortOrder: 6 },
    { code: "ARBITRAGE", displayName: "Arbitrage", description: "Exploits a price discrepancy between related instruments or venues.", sortOrder: 7 },
    { code: "MARKET_MAKING", displayName: "Market Making", description: "Provides liquidity by quoting both sides of a market.", sortOrder: 8 },
    { code: "CUSTOM", displayName: "Custom", description: "Doesn't fit an existing named category.", sortOrder: 9 },
  ];

  for (const category of STRATEGY_CATEGORIES) {
    await prisma.strategyCategory.upsert({
      where: { code: category.code as never },
      update: { displayName: category.displayName, description: category.description, sortOrder: category.sortOrder },
      create: { code: category.code as never, displayName: category.displayName, description: category.description, sortOrder: category.sortOrder },
    });
  }

  // eslint-disable-next-line no-console -- seed script CLI output, not app runtime logging
  console.log(
    `Seed complete: ${DEFAULT_ROLES.length} roles, ${DEFAULT_PERMISSIONS.length} permissions, ` +
      `${DEFAULT_PLANS.length} plans, ${DEFAULT_FEATURE_FLAGS.length} feature flags, grants applied, ` +
      `${STRATEGY_CATEGORIES.length} strategy categories.`,
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
