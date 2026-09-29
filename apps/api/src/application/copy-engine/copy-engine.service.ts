import { Injectable, Logger } from "@nestjs/common";
import {
  CopyExecutionStatus,
  CopyGroupStatus,
  CopyMemberRole,
  TradingOrderStatus,
  TradingPositionSide,
} from "@rmsm/database";
import { prisma } from "@rmsm/database";
import { DomainEventPublisher } from "../../common/events/domain-event-publisher.service";
import { BrokerExecutionService } from "../trading/broker-execution.service";

import {
  applyCopyPositionRisk,
  calculateCopyQuantity,
  COPY_ENGINE_EVENTS,
  shouldCopyOrder,
  type CopyOrderFilledEvent,
} from "./copy-engine.types";

@Injectable()
export class CopyEngineService {
  private readonly logger = new Logger(CopyEngineService.name);

  constructor(
    private readonly domainEventPublisher: DomainEventPublisher,
    private readonly brokerExecutionService: BrokerExecutionService,
  ) {
    this.domainEventPublisher.on(
      COPY_ENGINE_EVENTS.ORDER_FILLED,
      (payload) => {
        void this.prepareCopies(payload as unknown as CopyOrderFilledEvent).catch(
          (error) => {
            this.logger.error(
              "Copy preparation failed.",
              error instanceof Error ? error.stack : String(error),
            );
          },
        );
      },
    );
  }

  async prepareCopies(event: CopyOrderFilledEvent): Promise<void> {
    const sourceOrder = await prisma.tradingOrder.findUnique({
      where: { id: event.sourceOrderId },
      select: {
        id: true,
        accountId: true,
        instrumentId: true,
        side: true,
        type: true,
        quantity: true,
        status: true,
      },
    });

    if (!sourceOrder || sourceOrder.status !== TradingOrderStatus.FILLED) {
      return;
    }

    const groups = await prisma.copyGroup.findMany({
      where: {
        organizationId: event.organizationId,
        masterAccountId: event.accountId,
        status: CopyGroupStatus.ACTIVE,
      },
      include: {
        members: {
          where: {
            role: CopyMemberRole.FOLLOWER,
            enabled: true,
          },
          include: {
            rule: true,
            tradingAccount: {
              select: {
                id: true,
                status: true,
              },
            },
          },
        },
      },
    });

    for (const group of groups) {
      for (const member of group.members) {
        if (!member.tradingAccount || member.tradingAccount.status !== "ACTIVE") {
          continue;
        }

        if (!member.rule?.enabled) {
          continue;
        }

        if (
          !shouldCopyOrder({
            executionKind: event.executionKind,
            orderType: event.type,
            copyEntries: member.rule.copyEntries,
            copyExits: member.rule.copyExits,
            copyLimitOrders: member.rule.copyLimitOrders,
            copyStopOrders: member.rule.copyStopOrders,
          })
        ) {
          this.logger.log({
            msg: "copy.execution.skipped_by_rule",
            copyGroupId: group.id,
            copyGroupMemberId: member.id,
            sourceOrderId: sourceOrder.id,
            executionKind: event.executionKind,
            orderType: event.type,
          });
          continue;
        }

        const requestedQuantity = calculateCopyQuantity({
          sourceQuantity: String(sourceOrder.quantity),
          quantityMultiplier: String(member.quantityMultiplier),
          fixedQuantity:
            member.fixedQuantity === null
              ? null
              : String(member.fixedQuantity),
          maxQuantity:
            member.maxQuantity === null
              ? null
              : String(member.maxQuantity),
        });

        const riskDecision = await this.applyRiskLimits({
          executionKind: event.executionKind,
          accountId: member.tradingAccount.id,
          instrumentId: sourceOrder.instrumentId,
          side: sourceOrder.side === "BUY" ? "BUY" : "SELL",
          requestedQuantity,
          maxPositionQuantity:
            member.rule.maxPositionQuantity === null
              ? null
              : String(member.rule.maxPositionQuantity),
          dailyLossLimit:
            member.rule.dailyLossLimit === null
              ? null
              : String(member.rule.dailyLossLimit),
        });

        if (!riskDecision.allowed) {
          this.logger.log({
            msg: "copy.execution.skipped_by_risk",
            copyGroupId: group.id,
            copyGroupMemberId: member.id,
            sourceOrderId: sourceOrder.id,
            requestedQuantity,
            reason: riskDecision.reason,
          });
          continue;
        }

        const copyQuantity = riskDecision.quantity;

        const copyExecution = await prisma.copyExecution.upsert({
          where: {
            copyGroupMemberId_sourceOrderId: {
              copyGroupMemberId: member.id,
              sourceOrderId: sourceOrder.id,
            },
          },
          create: {
            copyGroupMemberId: member.id,
            sourceOrderId: sourceOrder.id,
            requestedQuantity: copyQuantity,
            status: CopyExecutionStatus.PENDING,
          },
          update: {},
        });

        if (
          copyExecution.status !== CopyExecutionStatus.PENDING ||
          copyExecution.followerOrderId
        ) {
          continue;
        }

        await prisma.copyExecution.update({
          where: { id: copyExecution.id },
          data: {
            status: CopyExecutionStatus.SENT,
            sentAt: new Date(),
            errorMessage: null,
          },
        });

        this.logger.log({
          msg: "copy.execution.sent",
          copyGroupId: group.id,
          copyGroupMemberId: member.id,
          sourceOrderId: sourceOrder.id,
          copyExecutionId: copyExecution.id,
          requestedQuantity: copyQuantity,
        });

        try {
          /*
           * The source event is emitted after the source order has already
           * filled. Reproduce that fill with a MARKET follower order rather
           * than submitting the original conditional order after its trigger.
           */
          const followerResult =
            await this.brokerExecutionService.placeOrder(
              event.organizationId,
              member.tradingAccount.id,
              {
                instrumentId: sourceOrder.instrumentId,
                side:
                  sourceOrder.side === "BUY"
                    ? "BUY"
                    : "SELL",
                type: "MARKET",
                quantity: copyQuantity,
                clientOrderId: `RMSM-COPY-${copyExecution.id}`,
              },
              {
                suppressCopyEvent: true,
              },
            );

          await prisma.copyExecution.update({
            where: { id: copyExecution.id },
            data: {
              followerOrderId: followerResult.order.id,
              status: followerResult.accepted
                ? CopyExecutionStatus.ACCEPTED
                : CopyExecutionStatus.REJECTED,
              ...(followerResult.accepted
                ? {
                    executedQuantity:
                      followerResult.order.status ===
                      TradingOrderStatus.FILLED
                        ? copyQuantity
                        : null,
                    completedAt:
                      followerResult.order.status ===
                      TradingOrderStatus.FILLED
                        ? new Date()
                        : null,
                    errorMessage: null,
                  }
                : {
                    errorMessage:
                      followerResult.message ??
                      "Follower broker rejected order.",
                  }),
            },
          });

          this.logger.log({
            msg: followerResult.accepted
              ? "copy.execution.accepted"
              : "copy.execution.rejected",
            copyGroupId: group.id,
            copyGroupMemberId: member.id,
            copyExecutionId: copyExecution.id,
            sourceOrderId: sourceOrder.id,
            followerOrderId: followerResult.order.id,
            requestedQuantity: copyQuantity,
            status: followerResult.status,
          });
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : "Follower order submission failed.";

          await prisma.copyExecution.update({
            where: { id: copyExecution.id },
            data: {
              status: CopyExecutionStatus.FAILED,
              errorMessage: message,
            },
          });

          this.logger.error(
            "Copy execution failed.",
            error instanceof Error ? error.stack : String(error),
          );
        }
      }
    }
  }

  private async applyRiskLimits(input: {
    executionKind: "ENTRY" | "EXIT" | "REVERSAL";
    accountId: string;
    instrumentId: string;
    side: "BUY" | "SELL";
    requestedQuantity: string;
    maxPositionQuantity: string | null;
    dailyLossLimit: string | null;
  }): Promise<{
    allowed: boolean;
    quantity: string;
    reason?: string;
  }> {
    const existingPosition = await prisma.tradingPosition.findFirst({
      where: {
        accountId: input.accountId,
        instrumentId: input.instrumentId,
        side:
          input.side === "BUY"
            ? TradingPositionSide.LONG
            : TradingPositionSide.SHORT,
        status: "OPEN",
      },
      select: {
        quantity: true,
      },
    });

    const positionRisk = applyCopyPositionRisk({
      executionKind: input.executionKind,
      requestedQuantity: input.requestedQuantity,
      existingPositionQuantity: existingPosition
        ? String(existingPosition.quantity)
        : "0",
      maxPositionQuantity: input.maxPositionQuantity,
    });

    if (!positionRisk.allowed) {
      return positionRisk;
    }

    if (input.dailyLossLimit !== null) {
      const dailyLossLimit = Number(input.dailyLossLimit);

      if (!Number.isFinite(dailyLossLimit) || dailyLossLimit <= 0) {
        return {
          allowed: false,
          quantity: "0",
          reason: "Invalid dailyLossLimit.",
        };
      }

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const dailyTrades = await prisma.tradingTrade.findMany({
        where: {
          accountId: input.accountId,
          closedAt: {
            gte: startOfDay,
          },
        },
        select: {
          realizedPnl: true,
        },
      });

      const dailyRealizedPnl = dailyTrades.reduce(
        (total, trade) => total + Number(trade.realizedPnl),
        0,
      );

      if (dailyRealizedPnl <= -dailyLossLimit) {
        return {
          allowed: false,
          quantity: "0",
          reason: "Daily loss limit reached.",
        };
      }
    }

    return positionRisk;
  }
}

