-- AI-103 Strategy Engine — Milestone 2: persistence layer
-- Hand-written, following Prisma's own generated migration format and
-- ordering convention. `prisma migrate dev`/`prisma generate` cannot run
-- in this sandbox (network-blocked, the same standing limitation
-- documented since AI-101 Phase 1) — this SQL is what a real `prisma
-- migrate dev` run against this schema.prisma would produce, written by
-- hand and reviewed for correctness rather than generated.
--
-- No destructive operation anywhere in this file — every statement is
-- CREATE TYPE / CREATE TABLE / ALTER TABLE ... ADD CONSTRAINT. Nothing
-- in AI-101/AI-102/EP's own existing tables is touched.

-- ── Enums ───────────────────────────────────────────────────────────────

CREATE TYPE "StrategyStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

CREATE TYPE "StrategyVersionStatus" AS ENUM ('DRAFT', 'PENDING_VALIDATION', 'VALIDATED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PUBLISHED', 'SUPERSEDED');

CREATE TYPE "StrategyCategoryCode" AS ENUM ('TREND_FOLLOWING', 'MEAN_REVERSION', 'MOMENTUM', 'BREAKOUT', 'SCALPING', 'SWING', 'ARBITRAGE', 'MARKET_MAKING', 'CUSTOM');

CREATE TYPE "RuleTreeRole" AS ENUM ('ENTRY', 'EXIT');

CREATE TYPE "LogicalOperatorType" AS ENUM ('AND', 'OR', 'NOT');

CREATE TYPE "ComparisonOperatorType" AS ENUM ('GREATER_THAN', 'GREATER_THAN_OR_EQUAL', 'LESS_THAN', 'LESS_THAN_OR_EQUAL', 'EQUAL', 'NOT_EQUAL', 'CROSSES_ABOVE', 'CROSSES_BELOW', 'BETWEEN');

CREATE TYPE "StrategyParameterType" AS ENUM ('INTEGER', 'DECIMAL', 'BOOLEAN', 'ENUM', 'STRING');

CREATE TYPE "ApprovalDecision" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TYPE "StrategyHistoryActionType" AS ENUM ('STRATEGY_CREATED', 'VERSION_DRAFTED', 'VERSION_VALIDATED', 'VERSION_APPROVAL_REQUESTED', 'VERSION_APPROVED', 'VERSION_REJECTED', 'VERSION_PUBLISHED', 'STRATEGY_ARCHIVED');

-- ── Reference / lookup tables ──────────────────────────────────────────

CREATE TABLE "strategy_categories" (
    "code" "StrategyCategoryCode" NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "strategy_categories_pkey" PRIMARY KEY ("code")
);

CREATE TABLE "strategy_tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "strategy_tags_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "strategy_tags_name_key" ON "strategy_tags"("name");

-- ── Strategy (created before StrategyVersion; the circular FK to
--    StrategyVersion.currentPublishedVersionId is added via ALTER TABLE
--    once StrategyVersion also exists, below) ────────────────────────────

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
CREATE UNIQUE INDEX "strategies_currentPublishedVersionId_key" ON "strategies"("currentPublishedVersionId");
CREATE UNIQUE INDEX "strategies_organizationId_slug_key" ON "strategies"("organizationId", "slug");
CREATE INDEX "strategies_organizationId_status_idx" ON "strategies"("organizationId", "status");
CREATE INDEX "strategies_organizationId_categoryCode_idx" ON "strategies"("organizationId", "categoryCode");
CREATE INDEX "strategies_organizationId_createdAt_idx" ON "strategies"("organizationId", "createdAt");
CREATE INDEX "strategies_organizationId_updatedAt_idx" ON "strategies"("organizationId", "updatedAt");
CREATE INDEX "strategies_organizationId_name_idx" ON "strategies"("organizationId", "name");

CREATE TABLE "strategy_tag_assignments" (
    "strategyId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "strategy_tag_assignments_pkey" PRIMARY KEY ("strategyId", "tagId")
);
CREATE INDEX "strategy_tag_assignments_tagId_idx" ON "strategy_tag_assignments"("tagId");

-- ── StrategyVersion and its owned tree (RuleGroup/Rule/Condition/
--    StrategyParameter) ───────────────────────────────────────────────

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
CREATE UNIQUE INDEX "strategy_versions_strategyId_versionNumber_key" ON "strategy_versions"("strategyId", "versionNumber");
CREATE INDEX "strategy_versions_organizationId_status_idx" ON "strategy_versions"("organizationId", "status");
CREATE INDEX "strategy_versions_strategyId_status_idx" ON "strategy_versions"("strategyId", "status");
CREATE INDEX "strategy_versions_organizationId_createdAt_idx" ON "strategy_versions"("organizationId", "createdAt");

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
CREATE INDEX "rule_groups_strategyVersionId_parentGroupId_idx" ON "rule_groups"("strategyVersionId", "parentGroupId");
CREATE INDEX "rule_groups_organizationId_idx" ON "rule_groups"("organizationId");

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
CREATE INDEX "rules_ruleGroupId_idx" ON "rules"("ruleGroupId");
CREATE INDEX "rules_organizationId_idx" ON "rules"("organizationId");

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
CREATE UNIQUE INDEX "conditions_ruleId_key" ON "conditions"("ruleId");
CREATE INDEX "conditions_organizationId_idx" ON "conditions"("organizationId");

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
CREATE UNIQUE INDEX "strategy_parameters_strategyVersionId_name_key" ON "strategy_parameters"("strategyVersionId", "name");
CREATE INDEX "strategy_parameters_organizationId_idx" ON "strategy_parameters"("organizationId");

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
CREATE UNIQUE INDEX "execution_profiles_strategyVersionId_name_key" ON "execution_profiles"("strategyVersionId", "name");
CREATE INDEX "execution_profiles_organizationId_idx" ON "execution_profiles"("organizationId");

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
CREATE INDEX "strategy_validations_strategyVersionId_ranAt_idx" ON "strategy_validations"("strategyVersionId", "ranAt");
CREATE INDEX "strategy_validations_organizationId_idx" ON "strategy_validations"("organizationId");

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
CREATE INDEX "strategy_approvals_strategyVersionId_decision_idx" ON "strategy_approvals"("strategyVersionId", "decision");
CREATE INDEX "strategy_approvals_organizationId_decision_idx" ON "strategy_approvals"("organizationId", "decision");

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
CREATE INDEX "strategy_publications_strategyVersionId_idx" ON "strategy_publications"("strategyVersionId");
CREATE INDEX "strategy_publications_organizationId_publishedAt_idx" ON "strategy_publications"("organizationId", "publishedAt");

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
CREATE INDEX "strategy_history_strategyId_occurredAt_idx" ON "strategy_history"("strategyId", "occurredAt");
CREATE INDEX "strategy_history_organizationId_occurredAt_idx" ON "strategy_history"("organizationId", "occurredAt");

-- ── Foreign keys ────────────────────────────────────────────────────────
-- strategies.currentPublishedVersionId -> strategy_versions.id is added
-- here, AFTER strategy_versions exists, resolving the circular
-- reference between the two tables.

ALTER TABLE "strategies" ADD CONSTRAINT "strategies_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "strategies" ADD CONSTRAINT "strategies_categoryCode_fkey" FOREIGN KEY ("categoryCode") REFERENCES "strategy_categories"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "strategies" ADD CONSTRAINT "strategies_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "strategies" ADD CONSTRAINT "strategies_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "strategies" ADD CONSTRAINT "strategies_currentPublishedVersionId_fkey" FOREIGN KEY ("currentPublishedVersionId") REFERENCES "strategy_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "strategy_tag_assignments" ADD CONSTRAINT "strategy_tag_assignments_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "strategies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "strategy_tag_assignments" ADD CONSTRAINT "strategy_tag_assignments_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "strategy_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "strategy_versions" ADD CONSTRAINT "strategy_versions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "strategy_versions" ADD CONSTRAINT "strategy_versions_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "strategies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "strategy_versions" ADD CONSTRAINT "strategy_versions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "strategy_versions" ADD CONSTRAINT "strategy_versions_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "rule_groups" ADD CONSTRAINT "rule_groups_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rule_groups" ADD CONSTRAINT "rule_groups_strategyVersionId_fkey" FOREIGN KEY ("strategyVersionId") REFERENCES "strategy_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rule_groups" ADD CONSTRAINT "rule_groups_parentGroupId_fkey" FOREIGN KEY ("parentGroupId") REFERENCES "rule_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rule_groups" ADD CONSTRAINT "rule_groups_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "rule_groups" ADD CONSTRAINT "rule_groups_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "rules" ADD CONSTRAINT "rules_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rules" ADD CONSTRAINT "rules_ruleGroupId_fkey" FOREIGN KEY ("ruleGroupId") REFERENCES "rule_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rules" ADD CONSTRAINT "rules_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "rules" ADD CONSTRAINT "rules_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "conditions" ADD CONSTRAINT "conditions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conditions" ADD CONSTRAINT "conditions_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conditions" ADD CONSTRAINT "conditions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "conditions" ADD CONSTRAINT "conditions_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "strategy_parameters" ADD CONSTRAINT "strategy_parameters_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "strategy_parameters" ADD CONSTRAINT "strategy_parameters_strategyVersionId_fkey" FOREIGN KEY ("strategyVersionId") REFERENCES "strategy_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "strategy_parameters" ADD CONSTRAINT "strategy_parameters_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "strategy_parameters" ADD CONSTRAINT "strategy_parameters_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "execution_profiles" ADD CONSTRAINT "execution_profiles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "execution_profiles" ADD CONSTRAINT "execution_profiles_strategyVersionId_fkey" FOREIGN KEY ("strategyVersionId") REFERENCES "strategy_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "execution_profiles" ADD CONSTRAINT "execution_profiles_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "execution_profiles" ADD CONSTRAINT "execution_profiles_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "strategy_validations" ADD CONSTRAINT "strategy_validations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "strategy_validations" ADD CONSTRAINT "strategy_validations_strategyVersionId_fkey" FOREIGN KEY ("strategyVersionId") REFERENCES "strategy_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "strategy_validations" ADD CONSTRAINT "strategy_validations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "strategy_approvals" ADD CONSTRAINT "strategy_approvals_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "strategy_approvals" ADD CONSTRAINT "strategy_approvals_strategyVersionId_fkey" FOREIGN KEY ("strategyVersionId") REFERENCES "strategy_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "strategy_approvals" ADD CONSTRAINT "strategy_approvals_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "strategy_approvals" ADD CONSTRAINT "strategy_approvals_decidedByUserId_fkey" FOREIGN KEY ("decidedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "strategy_publications" ADD CONSTRAINT "strategy_publications_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "strategy_publications" ADD CONSTRAINT "strategy_publications_strategyVersionId_fkey" FOREIGN KEY ("strategyVersionId") REFERENCES "strategy_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "strategy_publications" ADD CONSTRAINT "strategy_publications_supersedesVersionId_fkey" FOREIGN KEY ("supersedesVersionId") REFERENCES "strategy_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "strategy_publications" ADD CONSTRAINT "strategy_publications_publishedByUserId_fkey" FOREIGN KEY ("publishedByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "strategy_history" ADD CONSTRAINT "strategy_history_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "strategy_history" ADD CONSTRAINT "strategy_history_strategyId_fkey" FOREIGN KEY ("strategyId") REFERENCES "strategies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "strategy_history" ADD CONSTRAINT "strategy_history_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
