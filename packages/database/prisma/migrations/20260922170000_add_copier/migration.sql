-- CreateEnum
CREATE TYPE "CopyGroupStatus" AS ENUM ('ACTIVE', 'PAUSED', 'DISABLED');

-- CreateEnum
CREATE TYPE "CopyMemberRole" AS ENUM ('MASTER', 'FOLLOWER');

-- CreateEnum
CREATE TYPE "CopyExecutionStatus" AS ENUM (
    'PENDING',
    'SENT',
    'ACCEPTED',
    'REJECTED',
    'FAILED',
    'CANCELLED'
);

-- CreateTable
CREATE TABLE "copy_groups" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "CopyGroupStatus" NOT NULL DEFAULT 'ACTIVE',
    "masterAccountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "copy_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "copy_group_members" (
    "id" TEXT NOT NULL,
    "copyGroupId" TEXT NOT NULL,
    "tradingAccountId" TEXT NOT NULL,
    "role" "CopyMemberRole" NOT NULL,
    "quantityMultiplier" DECIMAL(12,4) NOT NULL DEFAULT 1,
    "fixedQuantity" DECIMAL(30,10),
    "maxQuantity" DECIMAL(30,10),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "copy_group_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "copy_rules" (
    "id" TEXT NOT NULL,
    "copyGroupMemberId" TEXT NOT NULL,
    "copyEntries" BOOLEAN NOT NULL DEFAULT true,
    "copyExits" BOOLEAN NOT NULL DEFAULT true,
    "copyStopLoss" BOOLEAN NOT NULL DEFAULT true,
    "copyTakeProfit" BOOLEAN NOT NULL DEFAULT true,
    "copyLimitOrders" BOOLEAN NOT NULL DEFAULT true,
    "copyStopOrders" BOOLEAN NOT NULL DEFAULT true,
    "maxPositionQuantity" DECIMAL(30,10),
    "dailyLossLimit" DECIMAL(24,8),
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "copy_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "copy_executions" (
    "id" TEXT NOT NULL,
    "copyGroupMemberId" TEXT NOT NULL,
    "sourceOrderId" TEXT NOT NULL,
    "followerOrderId" TEXT,
    "status" "CopyExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "requestedQuantity" DECIMAL(30,10) NOT NULL,
    "executedQuantity" DECIMAL(30,10),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "copy_executions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "copy_groups_organizationId_idx"
ON "copy_groups"("organizationId");

CREATE INDEX "copy_groups_organizationId_status_idx"
ON "copy_groups"("organizationId", "status");

CREATE INDEX "copy_groups_masterAccountId_idx"
ON "copy_groups"("masterAccountId");

CREATE INDEX "copy_group_members_copyGroupId_role_idx"
ON "copy_group_members"("copyGroupId", "role");

CREATE INDEX "copy_group_members_tradingAccountId_idx"
ON "copy_group_members"("tradingAccountId");

CREATE UNIQUE INDEX "copy_group_members_copyGroupId_tradingAccountId_key"
ON "copy_group_members"("copyGroupId", "tradingAccountId");

CREATE UNIQUE INDEX "copy_rules_copyGroupMemberId_key"
ON "copy_rules"("copyGroupMemberId");

CREATE INDEX "copy_executions_sourceOrderId_idx"
ON "copy_executions"("sourceOrderId");

CREATE INDEX "copy_executions_followerOrderId_idx"
ON "copy_executions"("followerOrderId");

CREATE INDEX "copy_executions_copyGroupMemberId_status_idx"
ON "copy_executions"("copyGroupMemberId", "status");

CREATE UNIQUE INDEX "copy_executions_copyGroupMemberId_sourceOrderId_key"
ON "copy_executions"("copyGroupMemberId", "sourceOrderId");

-- AddForeignKey
ALTER TABLE "copy_groups"
ADD CONSTRAINT "copy_groups_organizationId_fkey"
FOREIGN KEY ("organizationId")
REFERENCES "organizations"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "copy_groups"
ADD CONSTRAINT "copy_groups_masterAccountId_fkey"
FOREIGN KEY ("masterAccountId")
REFERENCES "trading_accounts"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "copy_group_members"
ADD CONSTRAINT "copy_group_members_copyGroupId_fkey"
FOREIGN KEY ("copyGroupId")
REFERENCES "copy_groups"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "copy_group_members"
ADD CONSTRAINT "copy_group_members_tradingAccountId_fkey"
FOREIGN KEY ("tradingAccountId")
REFERENCES "trading_accounts"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "copy_rules"
ADD CONSTRAINT "copy_rules_copyGroupMemberId_fkey"
FOREIGN KEY ("copyGroupMemberId")
REFERENCES "copy_group_members"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "copy_executions"
ADD CONSTRAINT "copy_executions_copyGroupMemberId_fkey"
FOREIGN KEY ("copyGroupMemberId")
REFERENCES "copy_group_members"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "copy_executions"
ADD CONSTRAINT "copy_executions_sourceOrderId_fkey"
FOREIGN KEY ("sourceOrderId")
REFERENCES "trading_orders"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "copy_executions"
ADD CONSTRAINT "copy_executions_followerOrderId_fkey"
FOREIGN KEY ("followerOrderId")
REFERENCES "trading_orders"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
