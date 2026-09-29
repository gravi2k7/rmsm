import { Inject, Injectable, Logger } from "@nestjs/common";
import { CopyExecutionStatus, TradingOrderStatus } from "@rmsm/database";
import { BrokerConnectionService } from "../../brokers/broker-connection.service";
import { BrokerExecutionService } from "../../trading/broker-execution.service";
import type {
  CopyExecutionRecoveryRepository,
} from "./copy-execution-recovery.repository";
import { COPY_EXECUTION_RECOVERY_REPOSITORY } from "./copy-execution-recovery.tokens";

@Injectable()
export class CopyExecutionRecoveryService {
  private readonly logger = new Logger(
    CopyExecutionRecoveryService.name,
  );

  private static readonly STALE_AFTER_MS = 30_000;
  private static readonly LOOKBACK_MS = 5 * 60_000;

  constructor(
    private readonly brokerConnectionService: BrokerConnectionService,
    private readonly brokerExecutionService: BrokerExecutionService,
    @Inject(COPY_EXECUTION_RECOVERY_REPOSITORY)
    private readonly recoveryRepository: CopyExecutionRecoveryRepository,
  ) {}

  async recoverStaleSentExecutions(): Promise<void> {
    const staleBefore = new Date(
      Date.now() - CopyExecutionRecoveryService.STALE_AFTER_MS,
    );

    const executions =
      await this.recoveryRepository.findStaleSentExecutions(
        staleBefore,
      );

    if (executions.length === 0) {
      return;
    }

    this.logger.log(
      `Inspecting ${executions.length} stale SENT copy execution(s).`,
    );

    for (const execution of executions) {
      await this.inspectExecution(execution);
    }
  }

  private async inspectExecution(execution: {
    id: string;
    copyGroupMemberId: string;
    followerOrderId: string | null;
    requestedQuantity: unknown;
    sentAt: Date | null;
    member: {
      tradingAccount: {
        id: string;
        organizationId: string;
        brokerConnectionId: string | null;
        brokerAccountId: string | null;
        status: string;
      } | null;
    };
  }): Promise<void> {
    const account = execution.member.tradingAccount;

    if (!account) {
      this.logger.warn(
        `Copy execution ${execution.id}: follower trading account no longer exists.`,
      );
      return;
    }

    if (!account.brokerConnectionId || !account.brokerAccountId) {
      this.logger.warn(
        `Copy execution ${execution.id}: follower account has no broker binding.`,
      );
      return;
    }

    if (account.status !== "ACTIVE") {
      this.logger.warn(
        `Copy execution ${execution.id}: follower account is not ACTIVE.`,
      );
      return;
    }

    const clientOrderId = `RMSM-COPY-${execution.id}`;

    try {
      const adapter =
        await this.brokerConnectionService.getAdapterForExecution(
          account.organizationId,
          account.brokerConnectionId,
        );

      const from = new Date(
        (execution.sentAt?.getTime() ?? Date.now()) -
          CopyExecutionRecoveryService.LOOKBACK_MS,
      );

      const to = new Date();

      /*
       * Resolve the local follower order first when the original copy
       * submission already created one. Its brokerOrderId is the
       * authoritative correlation key and is independent of whether
       * the broker preserves RMSM's clientOrderId.
       *
       * The clientOrderId lookup remains a legacy fallback for
       * executions where followerOrderId was never persisted.
       */
      const followerOrder = execution.followerOrderId
        ? await this.recoveryRepository.findFollowerOrderById(
            execution.followerOrderId,
            account.id,
          )
        : await this.recoveryRepository.findFollowerOrderByClientOrderId(
            account.id,
            clientOrderId,
          );

      const orders = await adapter.getOrders(
        account.brokerAccountId,
        from.toISOString(),
        to.toISOString(),
      );

      const brokerOrder = followerOrder?.brokerOrderId
        ? orders.find(
            (order) => order.id === followerOrder.brokerOrderId,
          )
        : orders.find(
            (order) => order.clientOrderId === clientOrderId,
          );

      if (!brokerOrder) {
        this.logger.log({
          msg: "copy.execution.recovery.broker_order_not_found",
          copyExecutionId: execution.id,
          clientOrderId,
          localFollowerOrderId: followerOrder?.id ?? null,
          localBrokerOrderId: followerOrder?.brokerOrderId ?? null,
        });

        return;
      }

      this.logger.warn({
        msg: "copy.execution.recovery.broker_order_found",
        copyExecutionId: execution.id,
        clientOrderId,
        brokerOrderId: brokerOrder.id,
        brokerStatus: brokerOrder.status,
      });

      /*
       * The broker order already exists.
       *
       * NEVER call adapter.placeOrder() here.
       *
       * followerOrder was resolved before broker-order correlation so
       * its brokerOrderId could be used as the primary correlation key.
       */

      if (!followerOrder) {
        this.logger.error({
          msg: "copy.execution.recovery.local_order_missing",
          copyExecutionId: execution.id,
          clientOrderId,
          brokerOrderId: brokerOrder.id,
        });

        /*
         * Do not create another local order and do not submit another
         * broker order. Manual investigation/recovery is required.
         */
        return;
      }

      if (
        followerOrder.clientOrderId &&
        followerOrder.clientOrderId !== clientOrderId
      ) {
        this.logger.error({
          msg: "copy.execution.recovery.client_order_mismatch",
          copyExecutionId: execution.id,
          expectedClientOrderId: clientOrderId,
          actualClientOrderId: followerOrder.clientOrderId,
          brokerOrderId: brokerOrder.id,
        });

        return;
      }

      /*
       * Fetch broker trades so reconciliation can use the same fill,
       * position and realized-P&L path as normal broker execution.
       */
      const trades = await adapter.getTrades(
        account.brokerAccountId,
        from.toISOString(),
        to.toISOString(),
      );

      const reconciliation =
        await this.brokerExecutionService.reconcileBrokerOrder(
          account.organizationId,
          account.id,
          followerOrder.id,
          brokerOrder.id,
          trades,
          brokerOrder.status,
          brokerOrder.filledQuantity,
          brokerOrder.filledPrice,
          brokerOrder.updatedAt ?? brokerOrder.createdAt,
        );

      if (reconciliation.order.status === TradingOrderStatus.FILLED) {
        await this.recoveryRepository.updateCopyExecution(
          execution.id,
          {
            followerOrderId: reconciliation.order.id,
            status: CopyExecutionStatus.ACCEPTED,
            executedQuantity:
              String(reconciliation.executedQuantity),
            completedAt: new Date(),
            errorMessage: null,
          },
        );

        this.logger.log({
          msg: "copy.execution.recovery.reconciled_filled",
          copyExecutionId: execution.id,
          followerOrderId: reconciliation.order.id,
          brokerOrderId: brokerOrder.id,
        });

        return;
      }

      if (reconciliation.order.status === TradingOrderStatus.REJECTED) {
        await this.recoveryRepository.updateCopyExecution(
          execution.id,
          {
            followerOrderId: reconciliation.order.id,
            status: CopyExecutionStatus.REJECTED,
            completedAt: new Date(),
            errorMessage:
              reconciliation.order.rejectionReason ??
              `Broker order ${brokerOrder.id} was rejected.`,
          },
        );

        this.logger.warn({
          msg: "copy.execution.recovery.reconciled_rejected",
          copyExecutionId: execution.id,
          followerOrderId: reconciliation.order.id,
          brokerOrderId: brokerOrder.id,
        });

        return;
      }

      /*
       * Broker order exists but is not filled yet.
       *
       * Bind the local follower order, but intentionally leave the
       * CopyExecution as SENT so the next 30s recovery cycle can poll it.
       */
      await this.recoveryRepository.updateCopyExecution(
        execution.id,
        {
          followerOrderId: reconciliation.order.id,
          status: CopyExecutionStatus.SENT,
          errorMessage: null,
        },
      );

      this.logger.log({
        msg: "copy.execution.recovery.broker_order_pending",
        copyExecutionId: execution.id,
        followerOrderId: reconciliation.order.id,
        brokerOrderId: brokerOrder.id,
      });
    } catch (error) {
      this.logger.error(
        `Copy execution ${execution.id} recovery failed.`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
