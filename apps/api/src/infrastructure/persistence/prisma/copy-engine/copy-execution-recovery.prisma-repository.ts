import {
  CopyExecutionStatus,
  TradingOrder,
} from "@rmsm/database";
import { prisma } from "@rmsm/database";
import {
  CopyExecutionRecoveryRecord,
  CopyExecutionRecoveryRepository,
} from "../../../../application/copy-engine/recovery/copy-execution-recovery.repository";

export class PrismaCopyExecutionRecoveryRepository
  implements CopyExecutionRecoveryRepository
{
  async findStaleSentExecutions(
    staleBefore: Date,
  ): Promise<CopyExecutionRecoveryRecord[]> {
    return prisma.copyExecution.findMany({
      where: {
        status: CopyExecutionStatus.SENT,
        sentAt: {
          lte: staleBefore,
        },
      },
      include: {
        member: {
          include: {
            tradingAccount: {
              select: {
                id: true,
                organizationId: true,
                brokerConnectionId: true,
                brokerAccountId: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: {
        sentAt: "asc",
      },
      take: 100,
    });
  }

  async findFollowerOrderById(
    orderId: string,
    accountId: string,
  ): Promise<TradingOrder | null> {
    return prisma.tradingOrder.findFirst({
      where: {
        id: orderId,
        accountId,
      },
    });
  }

  async findFollowerOrderByClientOrderId(
    accountId: string,
    clientOrderId: string,
  ): Promise<TradingOrder | null> {
    return prisma.tradingOrder.findFirst({
      where: {
        accountId,
        clientOrderId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async updateCopyExecution(
    copyExecutionId: string,
    data: {
      followerOrderId?: string;
      status: CopyExecutionStatus;
      executedQuantity?: string;
      completedAt?: Date;
      errorMessage?: string | null;
    },
  ): Promise<void> {
    await prisma.copyExecution.update({
      where: {
        id: copyExecutionId,
      },
      data,
    });
  }
}
