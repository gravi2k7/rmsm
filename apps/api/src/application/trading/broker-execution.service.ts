import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  TradingAccountStatus,
  TradingOrderSide,
  TradingOrderStatus,
  TradingOrderType,
  TradingPositionSide,
  TradingPositionStatus,
  TransactionManager,
  type TradingPosition,
  type TradingAccount,
  type TradingOrder,
} from "@rmsm/database";
import { randomUUID } from "node:crypto";

import type { BrokerAdapter } from "../brokers/contracts/broker-adapter";
import { BrokerConnectionService } from "../brokers/broker-connection.service";
import { DomainEventPublisher } from "../../common/events/domain-event-publisher.service";
import { COPY_ENGINE_EVENTS } from "../copy-engine/copy-engine.types";
import type { BrokerInstrumentMappingRepository } from "../brokers/contracts/broker-instrument-mapping.repository";
import { TRADING_ACCOUNT_REPOSITORY } from "./trading.tokens";
import {
  PAPER_TRADING_REPOSITORY,
  BROKER_INSTRUMENT_MAPPING_REPOSITORY,
} from "./trading.tokens";
import type { TradingAccountRepository } from "./trading.repository";
import type { PaperTradingRepository } from "./paper-trading.repository";

export interface BrokerOrderInput {
  instrumentId: string;
  side: "BUY" | "SELL";
  type: "MARKET" | "LIMIT" | "STOP" | "STOP_LIMIT";
  quantity: string;
  limitPrice?: string;
  stopPrice?: string;
  stopLossPrice?: string;
  takeProfitPrice?: string;
  clientOrderId?: string;
}

export interface BrokerOrderResult {
  order: TradingOrder;
  brokerOrderId: string | null;
  accepted: boolean;
  status: string;
  message?: string;
}

@Injectable()
export class BrokerExecutionService {
  constructor(
    @Inject(TRADING_ACCOUNT_REPOSITORY)
    private readonly tradingAccountRepository: TradingAccountRepository,
    @Inject(PAPER_TRADING_REPOSITORY)
    private readonly tradingRepository: PaperTradingRepository,
    private readonly brokerConnectionService: BrokerConnectionService,
    @Inject(BROKER_INSTRUMENT_MAPPING_REPOSITORY)
    private readonly mappingRepository: BrokerInstrumentMappingRepository,
    private readonly transactionManager: TransactionManager,
    private readonly domainEventPublisher: DomainEventPublisher,
  ) {}

  async placeOrder(
    organizationId: string,
    accountId: string,
    input: BrokerOrderInput,
    context?: {
      suppressCopyEvent?: boolean;
    },
  ): Promise<BrokerOrderResult> {
    const account =
      await this.tradingAccountRepository.findByAccountId(
        organizationId,
        accountId,
      );

    this.requireBrokerAccount(account);

    if (!account.brokerConnectionId || !account.brokerAccountId) {
      throw new BadRequestException(
        "Trading account is not bound to a broker account.",
      );
    }

    const mapping =
      await this.mappingRepository.findByConnectionAndInstrument(
        account.brokerConnectionId,
        input.instrumentId,
      );

    if (!mapping) {
      throw new BadRequestException(
        `No broker instrument mapping exists for instrument ${input.instrumentId}.`,
      );
    }

    const quantity = Number(input.quantity);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      throw new BadRequestException(
        "Quantity must be a positive number.",
      );
    }

    const limitPrice =
      input.limitPrice !== undefined
        ? Number(input.limitPrice)
        : undefined;

    const stopPrice =
      input.stopPrice !== undefined
        ? Number(input.stopPrice)
        : undefined;

    const stopLossPrice =
      input.stopLossPrice !== undefined
        ? Number(input.stopLossPrice)
        : undefined;

    const takeProfitPrice =
      input.takeProfitPrice !== undefined
        ? Number(input.takeProfitPrice)
        : undefined;

    if (
      limitPrice !== undefined &&
      (!Number.isFinite(limitPrice) || limitPrice <= 0)
    ) {
      throw new BadRequestException(
        "Limit price must be greater than zero.",
      );
    }

    if (
      stopPrice !== undefined &&
      (!Number.isFinite(stopPrice) || stopPrice <= 0)
    ) {
      throw new BadRequestException(
        "Stop price must be greater than zero.",
      );
    }

    if (
      stopLossPrice !== undefined &&
      (!Number.isFinite(stopLossPrice) || stopLossPrice <= 0)
    ) {
      throw new BadRequestException(
        "Stop-loss price must be greater than zero.",
      );
    }

    if (
      takeProfitPrice !== undefined &&
      (!Number.isFinite(takeProfitPrice) || takeProfitPrice <= 0)
    ) {
      throw new BadRequestException(
        "Take-profit price must be greater than zero.",
      );
    }

    const order = await this.tradingRepository.createOrder({
      accountId: account.id,
      instrumentId: input.instrumentId,
      side:
        input.side === "BUY"
          ? TradingOrderSide.BUY
          : TradingOrderSide.SELL,
      type: this.mapOrderType(input.type),
      quantity: input.quantity,
      limitPrice: input.limitPrice,
      stopPrice: input.stopPrice,
      status: TradingOrderStatus.PENDING,
      ...(input.clientOrderId
        ? { clientOrderId: input.clientOrderId }
        : {}),
    });

    let adapter: BrokerAdapter;

    try {
      adapter =
        await this.brokerConnectionService.getAdapterForExecution(
          organizationId,
          account.brokerConnectionId,
        );
    } catch (error) {
      await this.tradingRepository.updateOrder(order.id, {
        status: TradingOrderStatus.REJECTED,
        rejectionReason:
          error instanceof Error
            ? error.message
            : "Broker connection unavailable.",
      });

      throw error;
    }

    try {
      const brokerResult = await adapter.placeOrder({
        accountId: account.brokerAccountId,
        instrumentId: mapping.brokerInstrumentId,
        brokerSymbol: mapping.brokerSymbol,
        side: input.side,
        type: input.type,
        quantity,
        ...(limitPrice !== undefined ? { limitPrice } : {}),
        ...(stopPrice !== undefined ? { stopPrice } : {}),
        ...(stopLossPrice !== undefined ? { stopLossPrice } : {}),
        ...(takeProfitPrice !== undefined ? { takeProfitPrice } : {}),
        clientOrderId:
          input.clientOrderId ??
          `RMSM-${order.id}-${randomUUID()}`,
      });

      let updatedOrder: TradingOrder;

      if (
        brokerResult.accepted &&
        brokerResult.fills &&
        brokerResult.fills.length > 0
      ) {
        const fills = brokerResult.fills;

        const filledQuantity = fills.reduce(
          (total, fill) => total + fill.quantity,
          0,
        );

        const weightedPrice =
          fills.reduce(
            (total, fill) =>
              total + fill.price * fill.quantity,
            0,
          ) / filledQuantity;

        const latestFill = fills.reduce(
          (latest, fill) =>
            fill.timestamp > latest.timestamp
              ? fill
              : latest,
        );

        let executionKind:
          | "ENTRY"
          | "EXIT"
          | "REVERSAL" = "ENTRY";

        updatedOrder = await this.transactionManager.run(
          async (client) => {
            const oppositeSide =
              input.side === "BUY"
                ? TradingPositionSide.SHORT
                : TradingPositionSide.LONG;

            const oppositePosition =
              await this.tradingRepository.findOpenPosition(
                account.id,
                input.instrumentId,
                oppositeSide,
                client,
              );

            executionKind = this.classifyExecution(
              filledQuantity,
              oppositePosition,
            );
            const filledOrder =
              await this.tradingRepository.updateOrder(
                order.id,
                {
                  brokerOrderId: brokerResult.brokerOrderId,
                  status: TradingOrderStatus.FILLED,
                  executedPrice: String(weightedPrice),
                  filledAt: latestFill.timestamp,
                },
                client,
              );

            for (const fill of brokerResult.fills!) {
              const existingFill =
                fill.id
                  ? await this.tradingRepository.findFillByBrokerTradeId(
                      fill.id,
                      client,
                    )
                  : null;

              if (existingFill) {
                continue;
              }

              await this.tradingRepository.createFill(
                {
                  orderId: order.id,
                  brokerTradeId: fill.id,
                  price: String(fill.price),
                  quantity: String(fill.quantity),
                  commission: String(fill.commission ?? 0),
                  filledAt: fill.timestamp,
                },
                client,
              );

              await this.applyBrokerFill(
                account.id,
                input.instrumentId,
                fill.side,
                fill.quantity,
                fill.price,
                fill.timestamp,
                client,
              );
            }

            return filledOrder;
          },
        );

        if (!context?.suppressCopyEvent) {
          this.domainEventPublisher.publish(
            COPY_ENGINE_EVENTS.ORDER_FILLED,
            {
              organizationId,
              sourceOrderId: order.id,
              accountId: account.id,
              instrumentId: input.instrumentId,
              side: input.side,
              type: input.type,
              executionKind,
              quantity: String(filledQuantity),
              executedPrice: String(weightedPrice),
              filledAt: latestFill.timestamp,
            },
          );
        }
      } else {
        updatedOrder =
          await this.tradingRepository.updateOrder(order.id, {
            brokerOrderId: brokerResult.brokerOrderId,
            status: brokerResult.accepted
              ? TradingOrderStatus.PENDING
              : TradingOrderStatus.REJECTED,
            ...(brokerResult.accepted
              ? {}
              : {
                  rejectionReason:
                    brokerResult.message ?? "Broker rejected order.",
                }),
          });
      }

      return {
        order: updatedOrder,
        brokerOrderId: brokerResult.brokerOrderId,
        accepted: brokerResult.accepted,
        status: brokerResult.status ?? "UNKNOWN",
        ...(brokerResult.message
          ? { message: brokerResult.message }
          : {}),
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Broker order submission failed.";

      await this.tradingRepository.updateOrder(order.id, {
        status: TradingOrderStatus.REJECTED,
        rejectionReason: message,
      });

      throw error;
    }
  }

  async reconcileBrokerOrder(
    organizationId: string,
    accountId: string,
    orderId: string,
    brokerOrderId: string,
    brokerTrades: Array<{
      id: string;
      orderId?: string;
      instrumentId: string;
      side: "BUY" | "SELL";
      quantity: number;
      price: number;
      commission?: number;
      timestamp: Date;
    }>,
    brokerOrderStatus: string,
    brokerFilledQuantity?: number,
    brokerFilledPrice?: number,
    brokerFilledAt?: Date,
  ): Promise<{
    order: TradingOrder;
    executedQuantity: number;
  }> {
    const account =
      await this.tradingAccountRepository.findByAccountId(
        organizationId,
        accountId,
      );

    this.requireBrokerAccount(account);

    const localOrder = await this.tradingRepository.findOrder(
      account.id,
      orderId,
    );

    if (!localOrder) {
      throw new NotFoundException(
        `Trading order ${orderId} not found.`,
      );
    }

    if (localOrder.accountId !== account.id) {
      throw new BadRequestException(
        "Trading order does not belong to the trading account.",
      );
    }

    if (localOrder.brokerOrderId && localOrder.brokerOrderId !== brokerOrderId) {
      throw new BadRequestException(
        "Trading order is already bound to a different broker order.",
      );
    }

    if (brokerTrades.length === 0) {
      const normalizedStatus = brokerOrderStatus.toUpperCase();

      const rejected =
        normalizedStatus.includes("REJECT") ||
        normalizedStatus.includes("CANCEL") ||
        normalizedStatus.includes("FAIL");

      const updatedOrder = await this.tradingRepository.updateOrder(
        localOrder.id,
        {
          brokerOrderId,
          status: rejected
            ? TradingOrderStatus.REJECTED
            : TradingOrderStatus.PENDING,
          ...(rejected
            ? {
                rejectionReason:
                  `Broker order ${brokerOrderId} status: ${brokerOrderStatus}`,
              }
            : {}),
          ...(brokerFilledPrice !== undefined
            ? { executedPrice: String(brokerFilledPrice) }
            : {}),
          ...(brokerFilledAt
            ? { filledAt: brokerFilledAt }
            : {}),
        },
      );

      return {
        order: updatedOrder,
        executedQuantity: 0,
      };
    }

    const fills = brokerTrades.filter(
      (trade) => trade.orderId === brokerOrderId,
    );

    if (fills.length === 0) {
      const updatedOrder = await this.tradingRepository.updateOrder(
        localOrder.id,
        {
          brokerOrderId,
          status: TradingOrderStatus.PENDING,
        },
      );

      return {
        order: updatedOrder,
        executedQuantity: 0,
      };
    }

    const filledQuantity = fills.reduce(
      (total, fill) => total + fill.quantity,
      0,
    );

    if (!Number.isFinite(filledQuantity) || filledQuantity <= 0) {
      throw new BadRequestException(
        `Broker order ${brokerOrderId} returned an invalid filled quantity.`,
      );
    }

    const weightedPrice =
      fills.reduce(
        (total, fill) =>
          total + fill.price * fill.quantity,
        0,
      ) / filledQuantity;

    const latestFill = fills.reduce(
      (latest, fill) =>
        fill.timestamp > latest.timestamp
          ? fill
          : latest,
    );

    await this.transactionManager.run(async (client) => {
      for (const fill of fills) {
        const existingFill =
          await this.tradingRepository.findFillByBrokerTradeId(
            fill.id,
            client,
          );

        if (existingFill) {
          continue;
        }

        await this.tradingRepository.createFill(
          {
            orderId: localOrder.id,
            brokerTradeId: fill.id,
            price: String(fill.price),
            quantity: String(fill.quantity),
            commission: String(fill.commission ?? 0),
            filledAt: fill.timestamp,
          },
          client,
        );

        await this.applyBrokerFill(
          account.id,
          localOrder.instrumentId,
          fill.side,
          fill.quantity,
          fill.price,
          fill.timestamp,
          client,
        );
      }

      await this.tradingRepository.updateOrder(
        localOrder.id,
        {
          brokerOrderId,
          status: TradingOrderStatus.FILLED,
          executedPrice: String(weightedPrice),
          filledAt: latestFill.timestamp,
        },
        client,
      );
    });

    const result = await this.tradingRepository.findOrder(
      account.id,
      localOrder.id,
    );

    if (!result) {
      throw new NotFoundException(
        `Trading order ${localOrder.id} disappeared during reconciliation.`,
      );
    }

    return {
      order: result,
      executedQuantity: filledQuantity,
    };
  }

  private classifyExecution(
    quantity: number,
    oppositePosition: TradingPosition | null,
  ): "ENTRY" | "EXIT" | "REVERSAL" {
    if (!oppositePosition) {
      return "ENTRY";
    }

    const oppositeQuantity = Number(oppositePosition.quantity);

    if (quantity <= oppositeQuantity) {
      return "EXIT";
    }

    return "REVERSAL";
  }

  private async applyBrokerFill(
    accountId: string,
    instrumentId: string,
    side: "BUY" | "SELL",
    quantity: number,
    price: number,
    filledAt: Date,
    client: Parameters<TransactionManager["run"]>[0] extends (
      client: infer C,
    ) => unknown
      ? C
      : never,
  ): Promise<void> {
    let remaining = quantity;
    const positionSide =
      side === "BUY"
        ? TradingPositionSide.LONG
        : TradingPositionSide.SHORT;

    const oppositeSide =
      side === "BUY"
        ? TradingPositionSide.SHORT
        : TradingPositionSide.LONG;

    const opposite =
      await this.tradingRepository.findOpenPosition(
        accountId,
        instrumentId,
        oppositeSide,
        client,
      );

    if (opposite) {
      const positionQuantity = Number(opposite.quantity);
      const closingQuantity = Math.min(
        remaining,
        positionQuantity,
      );

      const entryPrice = Number(opposite.averageEntryPrice);

      const realizedPnl =
        oppositeSide === TradingPositionSide.LONG
          ? (price - entryPrice) * closingQuantity
          : (entryPrice - price) * closingQuantity;

      const cumulativePnl =
        Number(opposite.realizedPnl ?? 0) + realizedPnl;

      const remainingPositionQuantity =
        positionQuantity - closingQuantity;

      await this.tradingRepository.createTrade(
        {
          accountId,
          instrumentId,
          side: oppositeSide,
          quantity: String(closingQuantity),
          entryPrice: String(entryPrice),
          exitPrice: String(price),
          realizedPnl: String(realizedPnl),
          openedAt: opposite.openedAt,
          closedAt: filledAt,
        },
        client,
      );

      if (remainingPositionQuantity <= 0) {
        await this.tradingRepository.updatePosition(
          opposite.id,
          {
            quantity: "0",
            status: TradingPositionStatus.CLOSED,
            closedAt: filledAt,
            averageExitPrice: String(price),
            realizedPnl: String(cumulativePnl),
          },
          client,
        );
      } else {
        await this.tradingRepository.updatePosition(
          opposite.id,
          {
            quantity: String(remainingPositionQuantity),
            realizedPnl: String(cumulativePnl),
            averageExitPrice: String(price),
          },
          client,
        );
      }

      remaining -= closingQuantity;
    }

    if (remaining <= 0) {
      return;
    }

    const sameSide =
      await this.tradingRepository.findOpenPosition(
        accountId,
        instrumentId,
        positionSide,
        client,
      );

    if (!sameSide) {
      await this.tradingRepository.createPosition(
        {
          accountId,
          instrumentId,
          side: positionSide,
          quantity: String(remaining),
          averageEntryPrice: String(price),
          status: TradingPositionStatus.OPEN,
          openedAt: filledAt,
        },
        client,
      );

      return;
    }

    const existingQuantity = Number(sameSide.quantity);
    const totalQuantity = existingQuantity + remaining;
    const weightedEntry =
      (existingQuantity *
        Number(sameSide.averageEntryPrice) +
        remaining * price) /
      totalQuantity;

    await this.tradingRepository.updatePosition(
      sameSide.id,
      {
        quantity: String(totalQuantity),
        averageEntryPrice: String(weightedEntry),
      },
      client,
    );
  }

  private requireBrokerAccount(
    account: TradingAccount | null,
  ): asserts account is TradingAccount {
    if (!account) {
      throw new NotFoundException("Trading account not found.");
    }

    if (account.status !== TradingAccountStatus.ACTIVE) {
      throw new BadRequestException(
        "Trading account is not active.",
      );
    }
  }

  private mapOrderType(
    type: BrokerOrderInput["type"],
  ): TradingOrderType {
    switch (type) {
      case "MARKET":
        return TradingOrderType.MARKET;
      case "LIMIT":
        return TradingOrderType.LIMIT;
      case "STOP":
        return TradingOrderType.STOP;
      case "STOP_LIMIT":
        return TradingOrderType.STOP_LIMIT;
      default:
        throw new BadRequestException(
          `Unsupported broker order type: ${type}`,
        );
    }
  }
}
