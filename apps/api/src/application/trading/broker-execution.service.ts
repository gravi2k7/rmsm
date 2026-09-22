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
  type TradingAccount,
  type TradingOrder,
} from "@rmsm/database";
import { randomUUID } from "node:crypto";

import type { BrokerAdapter } from "../brokers/contracts/broker-adapter";
import { BrokerConnectionService } from "../brokers/broker-connection.service";
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
  ) {}

  async placeOrder(
    organizationId: string,
    accountId: string,
    input: BrokerOrderInput,
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
        side: input.side,
        type: input.type,
        quantity,
        ...(limitPrice !== undefined ? { limitPrice } : {}),
        ...(stopPrice !== undefined ? { stopPrice } : {}),
        clientOrderId: `RMSM-${order.id}-${randomUUID()}`,
      });

      const updatedOrder =
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
