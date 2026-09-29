import {
  prisma,
  type CopyExecution,
  type CopyGroup,
  type CopyGroupMember,
  type CopyRule,
  type CopyMemberRole,
  type CopyGroupStatus,
  type DbClient,
  type TradingAccount,
  Prisma,
} from "@rmsm/database";
import type {
  CopyGroupRepository,
  CopyGroupWithDetails,
} from "../../../../application/copy-engine/management/copy-group.repository";

export class PrismaCopyGroupRepository implements CopyGroupRepository {
  async create(
    data: {
      organizationId: string;
      name: string;
      masterAccountId: string;
    },
    client: DbClient = prisma,
  ): Promise<CopyGroup> {
    return client.copyGroup.create({
      data: {
        organizationId: data.organizationId,
        name: data.name,
        masterAccountId: data.masterAccountId,
      },
    });
  }

  async findById(
    organizationId: string,
    id: string,
    client: DbClient = prisma,
  ): Promise<CopyGroupWithDetails | null> {
    return client.copyGroup.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        masterAccount: true,
        members: {
          include: {
            tradingAccount: true,
            rule: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });
  }

  async findMany(
    organizationId: string,
    client: DbClient = prisma,
  ): Promise<CopyGroupWithDetails[]> {
    return client.copyGroup.findMany({
      where: {
        organizationId,
      },
      include: {
        masterAccount: true,
        members: {
          include: {
            tradingAccount: true,
            rule: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async update(
    organizationId: string,
    id: string,
    data: {
      name?: string;
      status?: CopyGroupStatus;
    },
    client: DbClient = prisma,
  ): Promise<CopyGroup> {
    const group = await client.copyGroup.findFirst({
      where: {
        id,
        organizationId,
      },
      select: {
        id: true,
      },
    });

    if (!group) {
      throw new Error("Copy group not found");
    }

    return client.copyGroup.update({
      where: {
        id: group.id,
      },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
      },
    });
  }

  async addMember(
    data: {
      copyGroupId: string;
      tradingAccountId: string;
      role: CopyMemberRole;
      quantityMultiplier: string;
      fixedQuantity?: string | null;
      maxQuantity?: string | null;
      enabled: boolean;
    },
    client: DbClient = prisma,
  ): Promise<CopyGroupMember> {
    return client.copyGroupMember.create({
      data: {
        copyGroupId: data.copyGroupId,
        tradingAccountId: data.tradingAccountId,
        role: data.role,
        quantityMultiplier: new Prisma.Decimal(data.quantityMultiplier),
        fixedQuantity:
          data.fixedQuantity == null
            ? null
            : new Prisma.Decimal(data.fixedQuantity),
        maxQuantity:
          data.maxQuantity == null
            ? null
            : new Prisma.Decimal(data.maxQuantity),
        enabled: data.enabled,
      },
    });
  }

  async updateMember(
    id: string,
    data: {
      quantityMultiplier?: string;
      fixedQuantity?: string | null;
      maxQuantity?: string | null;
      enabled?: boolean;
    },
    client: DbClient = prisma,
  ): Promise<CopyGroupMember> {
    return client.copyGroupMember.update({
      where: {
        id,
      },
      data: {
        ...(data.quantityMultiplier !== undefined
          ? {
              quantityMultiplier: new Prisma.Decimal(
                data.quantityMultiplier,
              ),
            }
          : {}),
        ...(data.fixedQuantity !== undefined
          ? {
              fixedQuantity:
                data.fixedQuantity == null
                  ? null
                  : new Prisma.Decimal(data.fixedQuantity),
            }
          : {}),
        ...(data.maxQuantity !== undefined
          ? {
              maxQuantity:
                data.maxQuantity == null
                  ? null
                  : new Prisma.Decimal(data.maxQuantity),
            }
          : {}),
        ...(data.enabled !== undefined
          ? {
              enabled: data.enabled,
            }
          : {}),
      },
    });
  }

  async removeMember(
    id: string,
    client: DbClient = prisma,
  ): Promise<void> {
    await client.copyGroupMember.delete({
      where: {
        id,
      },
    });
  }

  async createRule(
    data: {
      copyGroupMemberId: string;
      copyEntries: boolean;
      copyExits: boolean;
      copyStopLoss: boolean;
      copyTakeProfit: boolean;
      copyLimitOrders: boolean;
      copyStopOrders: boolean;
      maxPositionQuantity?: string | null;
      dailyLossLimit?: string | null;
      enabled: boolean;
    },
    client: DbClient = prisma,
  ): Promise<CopyRule> {
    return client.copyRule.create({
      data: {
        copyGroupMemberId: data.copyGroupMemberId,
        copyEntries: data.copyEntries,
        copyExits: data.copyExits,
        copyStopLoss: data.copyStopLoss,
        copyTakeProfit: data.copyTakeProfit,
        copyLimitOrders: data.copyLimitOrders,
        copyStopOrders: data.copyStopOrders,
        maxPositionQuantity:
          data.maxPositionQuantity == null
            ? null
            : new Prisma.Decimal(data.maxPositionQuantity),
        dailyLossLimit:
          data.dailyLossLimit == null
            ? null
            : new Prisma.Decimal(data.dailyLossLimit),
        enabled: data.enabled,
      },
    });
  }

  async updateRule(
    copyGroupMemberId: string,
    data: {
      copyEntries?: boolean;
      copyExits?: boolean;
      copyStopLoss?: boolean;
      copyTakeProfit?: boolean;
      copyLimitOrders?: boolean;
      copyStopOrders?: boolean;
      maxPositionQuantity?: string | null;
      dailyLossLimit?: string | null;
      enabled?: boolean;
    },
    client: DbClient = prisma,
  ): Promise<CopyRule> {
    return client.copyRule.upsert({
      where: {
        copyGroupMemberId,
      },
      create: {
        copyGroupMemberId,
        copyEntries: data.copyEntries ?? true,
        copyExits: data.copyExits ?? true,
        copyStopLoss: data.copyStopLoss ?? true,
        copyTakeProfit: data.copyTakeProfit ?? true,
        copyLimitOrders: data.copyLimitOrders ?? true,
        copyStopOrders: data.copyStopOrders ?? true,
        maxPositionQuantity:
          data.maxPositionQuantity == null
            ? null
            : new Prisma.Decimal(data.maxPositionQuantity),
        dailyLossLimit:
          data.dailyLossLimit == null
            ? null
            : new Prisma.Decimal(data.dailyLossLimit),
        enabled: data.enabled ?? true,
      },
      update: {
        ...(data.copyEntries !== undefined
          ? { copyEntries: data.copyEntries }
          : {}),
        ...(data.copyExits !== undefined
          ? { copyExits: data.copyExits }
          : {}),
        ...(data.copyStopLoss !== undefined
          ? { copyStopLoss: data.copyStopLoss }
          : {}),
        ...(data.copyTakeProfit !== undefined
          ? { copyTakeProfit: data.copyTakeProfit }
          : {}),
        ...(data.copyLimitOrders !== undefined
          ? { copyLimitOrders: data.copyLimitOrders }
          : {}),
        ...(data.copyStopOrders !== undefined
          ? { copyStopOrders: data.copyStopOrders }
          : {}),
        ...(data.maxPositionQuantity !== undefined
          ? {
              maxPositionQuantity:
                data.maxPositionQuantity == null
                  ? null
                  : new Prisma.Decimal(data.maxPositionQuantity),
            }
          : {}),
        ...(data.dailyLossLimit !== undefined
          ? {
              dailyLossLimit:
                data.dailyLossLimit == null
                  ? null
                  : new Prisma.Decimal(data.dailyLossLimit),
            }
          : {}),
        ...(data.enabled !== undefined
          ? { enabled: data.enabled }
          : {}),
      },
    });
  }

  async listExecutions(
    organizationId: string,
    copyGroupId: string,
    client: DbClient = prisma,
  ): Promise<CopyExecution[]> {
    return client.copyExecution.findMany({
      where: {
        member: {
          copyGroup: {
            id: copyGroupId,
            organizationId,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 500,
    });
  }
}
