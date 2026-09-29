import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  TradingOrderStatus,
  TradingPositionSide,
  TradingPositionStatus,
} from "@rmsm/database";
import { TransactionManager } from "@rmsm/database";

import { BrokerConnectionService } from "../broker-connection.service";
import { BrokerExecutionService } from "../../trading/broker-execution.service";
import type { BrokerInstrumentMappingRepository } from "../contracts/broker-instrument-mapping.repository";
import type { PaperTradingRepository } from "../../trading/paper-trading.repository";
import type { TradingAccountRepository } from "../../trading/trading.repository";

import {
  BROKER_INSTRUMENT_MAPPING_REPOSITORY,
  PAPER_TRADING_REPOSITORY,
  TRADING_ACCOUNT_REPOSITORY,
} from "../../trading/trading.tokens";

@Injectable()
export class BrokerSyncService {
  constructor(
    private readonly brokerConnectionService: BrokerConnectionService,
    private readonly brokerExecutionService: BrokerExecutionService,
    @Inject(TRADING_ACCOUNT_REPOSITORY)
    private readonly tradingAccountRepository: TradingAccountRepository,
    @Inject(BROKER_INSTRUMENT_MAPPING_REPOSITORY)
    private readonly mappingRepository: BrokerInstrumentMappingRepository,
    @Inject(PAPER_TRADING_REPOSITORY)
    private readonly tradingRepository: PaperTradingRepository,
    private readonly transactionManager: TransactionManager,
  ) {}

  async syncAccount(
    organizationId: string,
    accountId: string,
  ): Promise<{
    ordersProcessed: number;
    fillsCreated: number;
    positionsReconciled: number;
    balance: string | null;
  }> {
    const account = await this.tradingAccountRepository.findByAccountId(
      organizationId,
      accountId,
    );

    if (!account) {
      throw new NotFoundException("Trading account not found");
    }

    if (
      !account.brokerConnectionId ||
      !account.brokerAccountId
    ) {
      throw new BadRequestException(
        "Trading account is not bound to a broker account",
      );
    }

    const adapter =
      await this.brokerConnectionService.getAdapterForExecution(
        organizationId,
        account.brokerConnectionId,
      );

    const tradeSyncStart = new Date(
      Date.now() - 24 * 60 * 60 * 1000,
    ).toISOString();

    const [orders, trades, brokerAccounts, brokerPositions] =
      await Promise.all([
        adapter.getOrders(account.brokerAccountId, tradeSyncStart),
        adapter.getTrades(account.brokerAccountId, tradeSyncStart),
        adapter.getAccounts(),
        adapter.getPositions(account.brokerAccountId),
      ]);

    const brokerAccount = brokerAccounts.find(
      (item) => item.id === account.brokerAccountId,
    );

    if (!brokerAccount) {
      throw new BadRequestException(
        "Bound broker account was not returned by the broker",
      );
    }

    if (brokerAccount.balance === undefined) {
      throw new BadRequestException(
        "Broker account balance is unavailable",
      );
    }

    const brokerBalance = brokerAccount.balance;

    const result = {
      ordersProcessed: 0,
      fillsCreated: 0,
      positionsReconciled: 0,
      balance: String(brokerBalance),
    };

    /*
     * Reconcile broker orders through BrokerExecutionService.
     *
     * Do this outside the position transaction because
     * reconcileBrokerOrder() owns its own transaction and is the
     * canonical broker-fill -> position/P&L path.
     *
     * This also makes broker sync idempotent:
     * broker trades are deduplicated by brokerTradeId inside the
     * canonical reconciliation service.
     */
    for (const brokerOrder of orders) {
      const localOrder =
        await this.tradingRepository.findOrderByBrokerOrderId(
          accountId,
          brokerOrder.id,
        );

      if (!localOrder) {
        continue;
      }

      const orderTrades = trades.filter(
        (brokerTrade) => brokerTrade.orderId === brokerOrder.id,
      );

      /*
       * Count only genuinely new broker trades for the sync result.
       * reconcileBrokerOrder() itself remains responsible for the
       * actual deduplication and persistence.
       */
      let newFillCount = 0;

      for (const brokerTrade of orderTrades) {
        const existingFill =
          await this.tradingRepository.findFillByBrokerTradeId(
            brokerTrade.id,
          );

        if (!existingFill) {
          newFillCount += 1;
        }
      }

      await this.brokerExecutionService.reconcileBrokerOrder(
        organizationId,
        accountId,
        localOrder.id,
        brokerOrder.id,
        trades.map((brokerTrade) => ({
          id: brokerTrade.id,
          orderId: brokerTrade.orderId,
          instrumentId: brokerTrade.instrumentId,
          side: brokerTrade.side === "BUY" ? "BUY" : "SELL",
          quantity: brokerTrade.quantity,
          price: brokerTrade.price,
          commission: brokerTrade.commission,
          timestamp: brokerTrade.timestamp,
        })),
        brokerOrder.status,
        brokerOrder.filledQuantity,
        brokerOrder.filledPrice,
        brokerOrder.updatedAt ?? brokerOrder.createdAt,
      );

      result.ordersProcessed += 1;
      result.fillsCreated += newFillCount;
    }

    await this.transactionManager.run(async (client) => {
      const brokerPositionState = new Map<
        string,
        {
          instrumentId: string;
          side: TradingPositionSide;
          quantity: string;
          averageEntryPrice: string;
        }
      >();

      for (const brokerPosition of brokerPositions) {
        const mapping =
          await this.mappingRepository.findByConnectionAndBrokerInstrument(
            account.brokerConnectionId!,
            brokerPosition.instrumentId,
          );

        if (!mapping) {
          continue;
        }

        if (
          !Number.isFinite(brokerPosition.quantity) ||
          brokerPosition.quantity <= 0 ||
          !Number.isFinite(brokerPosition.averagePrice) ||
          brokerPosition.averagePrice <= 0
        ) {
          console.error(
            "[BrokerSyncService] Skipping broker position with invalid quantity/average price",
            {
              accountId,
              brokerPositionId: brokerPosition.id,
              instrumentId: brokerPosition.instrumentId,
              side: brokerPosition.side,
              quantity: brokerPosition.quantity,
              averagePrice: brokerPosition.averagePrice,
            },
          );
          continue;
        }

        const side =
          brokerPosition.side === "BUY"
            ? TradingPositionSide.LONG
            : TradingPositionSide.SHORT;

        const key = `${mapping.instrumentId}:${side}`;

        const existing = brokerPositionState.get(key);

        if (!existing) {
          brokerPositionState.set(key, {
            instrumentId: mapping.instrumentId,
            side,
            quantity: String(brokerPosition.quantity),
            averageEntryPrice: String(brokerPosition.averagePrice),
          });
          continue;
        }

        const existingQuantity = Number(existing.quantity);
        const nextQuantity = Number(brokerPosition.quantity);
        const totalQuantity = existingQuantity + nextQuantity;

        if (totalQuantity <= 0) {
          continue;
        }

        const weightedAverage =
          (Number(existing.averageEntryPrice) * existingQuantity +
            Number(brokerPosition.averagePrice) * nextQuantity) /
          totalQuantity;

        existing.quantity = String(totalQuantity);
        existing.averageEntryPrice = String(weightedAverage);
      }

      const localOpenPositions =
        await this.tradingRepository.listPositions(
          accountId,
          client,
        );

      for (const localPosition of localOpenPositions.filter(
        (position) => position.status === TradingPositionStatus.OPEN,
      )) {
        const key = `${localPosition.instrumentId}:${localPosition.side}`;
        const brokerPosition = brokerPositionState.get(key);

        if (!brokerPosition) {
          await this.tradingRepository.updatePosition(
            localPosition.id,
            {
              quantity: "0",
              status: TradingPositionStatus.CLOSED,
              closedAt: new Date(),
            },
            client,
          );

          result.positionsReconciled += 1;
          continue;
        }

        await this.tradingRepository.updatePosition(
          localPosition.id,
          {
            quantity: brokerPosition.quantity,
            averageEntryPrice: brokerPosition.averageEntryPrice,
          },
          client,
        );

        result.positionsReconciled += 1;
        brokerPositionState.delete(key);
      }

      for (const brokerPosition of brokerPositionState.values()) {
        await this.tradingRepository.createPosition(
          {
            accountId,
            instrumentId: brokerPosition.instrumentId,
            side: brokerPosition.side,
            quantity: brokerPosition.quantity,
            averageEntryPrice: brokerPosition.averageEntryPrice,
            stopLossPrice: null,
            takeProfitPrice: null,
            status: TradingPositionStatus.OPEN,
            openedAt: new Date(),
          },
          client,
        );

        result.positionsReconciled += 1;
      }

      await this.tradingAccountRepository.updateBalance(
        organizationId,
        account.ownerUserId,
        accountId,
        brokerBalance,
        undefined,
        client,
      );
    });

    return result;
  }

  /**
   * Reconcile every active trading account currently bound to a broker.
   *
   * Used by the background broker reconciliation worker.
   * Individual account failures are isolated so one broken broker
   * connection cannot prevent other accounts from being reconciled.
   */
  async syncAllBrokerAccounts(): Promise<{
    accountsProcessed: number;
    accountsSucceeded: number;
    accountsFailed: number;
  }> {
    const accounts =
      await this.tradingAccountRepository.findBrokerBoundActive();

    let accountsSucceeded = 0;
    let accountsFailed = 0;

    for (const account of accounts) {
      if (!account.brokerConnectionId || !account.brokerAccountId) {
        continue;
      }

      try {
        await this.syncAccount(account.organizationId, account.id);
        accountsSucceeded += 1;
      } catch (error) {
        accountsFailed += 1;

        console.error(
          `[BrokerSyncService] Failed to reconcile account ${account.id}`,
          error,
        );
      }
    }

    return {
      accountsProcessed: accounts.length,
      accountsSucceeded,
      accountsFailed,
    };
  }

  private mapOrderStatus(status: string): TradingOrderStatus {
    const normalized = status.trim().toUpperCase();

    if (
      normalized.includes("CANCEL") ||
      normalized === "CANCELED"
    ) {
      return TradingOrderStatus.CANCELLED;
    }

    if (
      normalized.includes("REJECT") ||
      normalized.includes("FAIL")
    ) {
      return TradingOrderStatus.REJECTED;
    }

    if (
      normalized.includes("FILL") ||
      normalized.includes("EXECUT")
    ) {
      return TradingOrderStatus.FILLED;
    }

    return TradingOrderStatus.PENDING;
  }
}
