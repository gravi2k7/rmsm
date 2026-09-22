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

    await this.transactionManager.run(async (client) => {
      for (const brokerOrder of orders) {
        const localOrder =
          await this.tradingRepository.findOrderByBrokerOrderId(
            accountId,
            brokerOrder.id,
            client,
          );

        if (!localOrder) {
          continue;
        }

        const status = this.mapOrderStatus(brokerOrder.status);

        await this.tradingRepository.updateOrder(
          localOrder.id,
          {
            status,
            executedPrice:
              brokerOrder.filledPrice !== undefined
                ? String(brokerOrder.filledPrice)
                : undefined,
            filledAt:
              status === TradingOrderStatus.FILLED
                ? brokerOrder.updatedAt ?? brokerOrder.createdAt ?? new Date()
                : undefined,
          },
          client,
        );

        result.ordersProcessed += 1;
      }

      for (const brokerTrade of trades) {
        const existingFill =
          await this.tradingRepository.findFillByBrokerTradeId(
            brokerTrade.id,
            client,
          );

        if (existingFill) {
          continue;
        }

        const mapping =
          await this.mappingRepository.findByConnectionAndBrokerInstrument(
            account.brokerConnectionId!,
            brokerTrade.instrumentId,
          );

        if (!mapping) {
          continue;
        }

        const localOrder =
          brokerTrade.orderId
            ? await this.tradingRepository.findOrderByBrokerOrderId(
                accountId,
                brokerTrade.orderId,
                client,
              )
            : null;

        if (!localOrder) {
          continue;
        }

        if (localOrder.instrumentId !== mapping.instrumentId) {
          continue;
        }

        await this.tradingRepository.createFill(
          {
            orderId: localOrder.id,
            brokerTradeId: brokerTrade.id,
            price: String(brokerTrade.price),
            quantity: String(brokerTrade.quantity),
            commission: String(brokerTrade.commission ?? 0),
            filledAt: brokerTrade.timestamp,
          },
          client,
        );

        await this.tradingRepository.updateOrder(
          localOrder.id,
          {
            status: TradingOrderStatus.FILLED,
            executedPrice: String(brokerTrade.price),
            filledAt: brokerTrade.timestamp,
          },
          client,
        );

        result.fillsCreated += 1;
      }

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
