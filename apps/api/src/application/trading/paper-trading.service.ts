import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  Prisma,
  TradingAccountStatus,
  TradingAccountType,
  TradingLedgerEntryType,
  TradingOrderSide,
  TradingOrderStatus,
  TradingOrderType,
  TradingPositionSide,
  TradingPositionStatus,
  type TradingAccount,
  type TradingOrder,
  type TradingPosition,
  type TradingTrade,
} from "@rmsm/database";
import { MarketDataService } from "../../modules/market-data/services/market-data.service";
import { InstrumentAliasRepository } from "../../modules/market-data/repositories/instrument-alias.repository";
import { MarketDataProviderConfigRepository } from "../../modules/market-data/repositories/market-data-provider-config.repository";
import { ProviderRegistryService } from "../../modules/market-data/providers/provider-registry.service";
import { TransactionManager } from "@rmsm/database";
import { PAPER_TRADING_REPOSITORY, TRADING_ACCOUNT_REPOSITORY } from "./trading.tokens";
import type { PaperTradingRepository } from "./paper-trading.repository";
import type { TradingAccountRepository } from "./trading.repository";

export interface PaperOrderInput {
  instrumentId: string;
  side: "BUY" | "SELL";
  type: TradingOrderType;
  quantity: string;
  limitPrice?: string;
  stopPrice?: string;
  stopLossPrice?: string;
  takeProfitPrice?: string;

  /** Internal execution path for an already-created conditional order. */
  existingOrderId?: string;
  executionPrice?: string;
}

export interface PaperOrderResult {
  order: TradingOrder;
  position: TradingPosition | null;
  trade: TradingTrade | null;
  executedPrice: string | null;
  realizedPnl: string;
  balance: string;
}

export type PaperMarketOrderResult = PaperOrderResult;

@Injectable()
export class PaperTradingService {
  constructor(
    @Inject(TRADING_ACCOUNT_REPOSITORY)
    private readonly tradingAccountRepository: TradingAccountRepository,
    @Inject(PAPER_TRADING_REPOSITORY)
    private readonly paperTradingRepository: PaperTradingRepository,
    private readonly marketDataService: MarketDataService,
    private readonly instrumentAliasRepository: InstrumentAliasRepository,
    private readonly providerConfigRepository: MarketDataProviderConfigRepository,
    private readonly providerRegistry: ProviderRegistryService,
    private readonly transactionManager: TransactionManager,
  ) {}

  async requireDemoAccount(
    organizationId: string,
    ownerUserId: string,
    accountId: string,
  ): Promise<TradingAccount> {
    const account = await this.tradingAccountRepository.findById(
      organizationId,
      ownerUserId,
      accountId,
    );

    if (!account) {
      throw new NotFoundException("Trading account not found");
    }

    if (account.type !== TradingAccountType.DEMO) {
      throw new BadRequestException(
        "Paper trading is only available for Demo accounts",
      );
    }

    if (account.status !== TradingAccountStatus.ACTIVE) {
      throw new BadRequestException(
        "Trading account is not active",
      );
    }

    return account;
  }

  async listOrders(
    organizationId: string,
    ownerUserId: string,
    accountId: string,
  ): Promise<TradingOrder[]> {
    await this.requireDemoAccount(
      organizationId,
      ownerUserId,
      accountId,
    );

    return this.paperTradingRepository.listOrders(accountId);
  }

  async listPositions(
    organizationId: string,
    ownerUserId: string,
    accountId: string,
  ): Promise<TradingPosition[]> {
    await this.requireDemoAccount(
      organizationId,
      ownerUserId,
      accountId,
    );

    return this.paperTradingRepository.listPositions(accountId);
  }

  async listTrades(
    organizationId: string,
    ownerUserId: string,
    accountId: string,
  ): Promise<TradingTrade[]> {
    await this.requireDemoAccount(
      organizationId,
      ownerUserId,
      accountId,
    );

    return this.paperTradingRepository.listTrades(accountId);
  }

  async updatePositionRisk(
    organizationId: string,
    ownerUserId: string,
    accountId: string,
    positionId: string,
    input: {
      stopLossPrice?: string | null;
      takeProfitPrice?: string | null;
    },
  ): Promise<TradingPosition> {
    await this.requireDemoAccount(
      organizationId,
      ownerUserId,
      accountId,
    );

    const positions =
      await this.paperTradingRepository.listPositions(
        accountId,
      );

    const position = positions.find(
      (item) =>
        item.id === positionId &&
        item.status === TradingPositionStatus.OPEN,
    );

    if (!position) {
      throw new NotFoundException(
        "Open trading position not found",
      );
    }

    const entryPrice = new Prisma.Decimal(
      position.averageEntryPrice,
    );

    const stopLossPrice =
      input.stopLossPrice === undefined ||
      input.stopLossPrice === null ||
      input.stopLossPrice === ""
        ? null
        : new Prisma.Decimal(input.stopLossPrice);

    const takeProfitPrice =
      input.takeProfitPrice === undefined ||
      input.takeProfitPrice === null ||
      input.takeProfitPrice === ""
        ? null
        : new Prisma.Decimal(input.takeProfitPrice);

    if (
      position.side === TradingPositionSide.LONG &&
      (
        (stopLossPrice !== null &&
          !stopLossPrice.lt(entryPrice)) ||
        (takeProfitPrice !== null &&
          !takeProfitPrice.gt(entryPrice))
      )
    ) {
      throw new BadRequestException(
        "LONG position requires SL below entry and TP above entry",
      );
    }

    if (
      position.side === TradingPositionSide.SHORT &&
      (
        (stopLossPrice !== null &&
          !stopLossPrice.gt(entryPrice)) ||
        (takeProfitPrice !== null &&
          !takeProfitPrice.lt(entryPrice))
      )
    ) {
      throw new BadRequestException(
        "SHORT position requires SL above entry and TP below entry",
      );
    }

    return this.paperTradingRepository.updatePosition(
      position.id,
      {
        stopLossPrice:
          stopLossPrice?.toString() ?? null,
        takeProfitPrice:
          takeProfitPrice?.toString() ?? null,
      },
    );
  }

  async markOrderTriggered(
    organizationId: string,
    ownerUserId: string,
    accountId: string,
    orderId: string,
  ): Promise<TradingOrder> {
    await this.requireDemoAccount(
      organizationId,
      ownerUserId,
      accountId,
    );

    const orders =
      await this.paperTradingRepository.listOrders(
        accountId,
      );

    const order = orders.find(
      (item) =>
        item.id === orderId &&
        item.status === TradingOrderStatus.PENDING &&
        item.type === TradingOrderType.STOP_LIMIT,
    );

    if (!order) {
      throw new NotFoundException(
        "Pending STOP_LIMIT order not found",
      );
    }

    return this.paperTradingRepository.updateOrder(
      order.id,
      {
        triggeredAt: new Date(),
      },
    );
  }

  async executeTriggeredOrder(
    organizationId: string,
    ownerUserId: string,
    accountId: string,
    orderId: string,
    executionPrice: string,
  ): Promise<PaperOrderResult> {
    await this.requireDemoAccount(
      organizationId,
      ownerUserId,
      accountId,
    );

    const orders =
      await this.paperTradingRepository.listOrders(
        accountId,
      );

    const order = orders.find(
      (item) =>
        item.id === orderId &&
        item.status === TradingOrderStatus.PENDING,
    );

    if (!order) {
      throw new NotFoundException(
        "Pending trading order not found",
      );
    }

    return this.placeOrder(
      organizationId,
      ownerUserId,
      accountId,
      {
        instrumentId: order.instrumentId,
        side:
          order.side === TradingOrderSide.BUY
            ? "BUY"
            : "SELL",
        type: order.type,
        quantity: order.quantity.toString(),
        limitPrice:
          order.limitPrice?.toString(),
        stopPrice:
          order.stopPrice?.toString(),
        existingOrderId: order.id,
        executionPrice,
      },
    );
  }

  async closePosition(
    organizationId: string,
    ownerUserId: string,
    accountId: string,
    positionId: string,
  ): Promise<PaperMarketOrderResult> {
    await this.requireDemoAccount(
      organizationId,
      ownerUserId,
      accountId,
    );

    const positions =
      await this.paperTradingRepository.listPositions(
        accountId,
      );

    const position = positions.find(
      (item) =>
        item.id === positionId &&
        item.status === TradingPositionStatus.OPEN &&
        new Prisma.Decimal(item.quantity).gt(0),
    );

    if (!position) {
      throw new NotFoundException(
        "Open trading position not found",
      );
    }

    return this.placeMarketOrder(
      organizationId,
      ownerUserId,
      accountId,
      {
        instrumentId: position.instrumentId,
        side:
          position.side === TradingPositionSide.LONG
            ? "SELL"
            : "BUY",
        quantity: position.quantity.toString(),
      },
    );
  }

  async reversePosition(
    organizationId: string,
    ownerUserId: string,
    accountId: string,
    positionId: string,
  ): Promise<PaperMarketOrderResult> {
    await this.requireDemoAccount(
      organizationId,
      ownerUserId,
      accountId,
    );

    const positions =
      await this.paperTradingRepository.listPositions(
        accountId,
      );

    const position = positions.find(
      (item) =>
        item.id === positionId &&
        item.status === TradingPositionStatus.OPEN &&
        new Prisma.Decimal(item.quantity).gt(0),
    );

    if (!position) {
      throw new NotFoundException(
        "Open trading position not found",
      );
    }

    const quantity = position.quantity.toString();
    const instrumentId = position.instrumentId;

    const reverseSide =
      position.side === TradingPositionSide.LONG
        ? "SELL"
        : "BUY";

    /*
     * Reverse is intentionally two orders using the same side:
     *
     * LONG  -> SELL to close + SELL to open SHORT
     * SHORT -> BUY  to close + BUY  to open LONG
     *
     * The first order closes the existing position. The second order
     * then opens the opposite position because no position remains.
     */
    await this.placeMarketOrder(
      organizationId,
      ownerUserId,
      accountId,
      {
        instrumentId,
        side: reverseSide,
        quantity,
      },
    );

    return this.placeMarketOrder(
      organizationId,
      ownerUserId,
      accountId,
      {
        instrumentId,
        side: reverseSide,
        quantity,
      },
    );
  }

  async cancelAllOrders(
    organizationId: string,
    ownerUserId: string,
    accountId: string,
  ): Promise<TradingOrder[]> {
    await this.requireDemoAccount(
      organizationId,
      ownerUserId,
      accountId,
    );

    const orders =
      await this.paperTradingRepository.listOrders(
        accountId,
      );

    const pendingOrders = orders.filter(
      (order) =>
        order.status === TradingOrderStatus.PENDING,
    );

    const cancelled: TradingOrder[] = [];

    for (const order of pendingOrders) {
      cancelled.push(
        await this.paperTradingRepository.updateOrder(
          order.id,
          {
            status: TradingOrderStatus.CANCELLED,
          },
        ),
      );
    }

    return cancelled;
  }

  async updatePendingOrderPrice(
    organizationId: string,
    ownerUserId: string,
    accountId: string,
    orderId: string,
    price: string,
  ): Promise<TradingOrder> {
    await this.requireDemoAccount(
      organizationId,
      ownerUserId,
      accountId,
    );

    const orders =
      await this.paperTradingRepository.listOrders(
        accountId,
      );

    const order = orders.find(
      (item) =>
        item.id === orderId &&
        item.status === TradingOrderStatus.PENDING,
    );

    if (!order) {
      throw new NotFoundException(
        "Pending trading order not found",
      );
    }

    const decimalPrice = new Prisma.Decimal(price);

    if (decimalPrice.lte(0)) {
      throw new BadRequestException(
        "Price must be greater than zero",
      );
    }

    if (order.type === TradingOrderType.LIMIT) {
      return this.paperTradingRepository.updateOrder(
        order.id,
        {
          limitPrice: decimalPrice.toString(),
        },
      );
    }

    if (order.type === TradingOrderType.STOP) {
      return this.paperTradingRepository.updateOrder(
        order.id,
        {
          stopPrice: decimalPrice.toString(),
        },
      );
    }

    throw new BadRequestException(
      `Order type ${order.type} cannot be modified from the chart`,
    );
  }

  async cancelOrder(
    organizationId: string,
    ownerUserId: string,
    accountId: string,
    orderId: string,
  ): Promise<TradingOrder> {
    await this.requireDemoAccount(
      organizationId,
      ownerUserId,
      accountId,
    );

    const order =
      await this.paperTradingRepository.findOrder(
        accountId,
        orderId,
      );

    if (!order) {
      throw new Error("Trading order not found");
    }

    if (order.status !== TradingOrderStatus.PENDING) {
      throw new Error(
        `Trading order ${orderId} is not pending`,
      );
    }

    return this.paperTradingRepository.updateOrder(
      order.id,
      {
        status: TradingOrderStatus.CANCELLED,
      },
    );
  }

  async flattenAllPositions(
    organizationId: string,
    ownerUserId: string,
    accountId: string,
  ): Promise<PaperMarketOrderResult[]> {
    await this.requireDemoAccount(
      organizationId,
      ownerUserId,
      accountId,
    );

    const positions =
      await this.paperTradingRepository.listPositions(
        accountId,
      );

    const openPositions = positions.filter(
      (position) =>
        position.status === TradingPositionStatus.OPEN &&
        new Prisma.Decimal(position.quantity).gt(0),
    );

    const results: PaperMarketOrderResult[] = [];

    for (const position of openPositions) {
      results.push(
        await this.placeMarketOrder(
          organizationId,
          ownerUserId,
          accountId,
          {
            instrumentId: position.instrumentId,
            side:
              position.side === TradingPositionSide.LONG
                ? "SELL"
                : "BUY",
            quantity: position.quantity.toString(),
          },
        ),
      );
    }

    return results;
  }

  async getExecutionPrice(
    account: TradingAccount,
    instrumentId: string,
    side: "BUY" | "SELL",
  ): Promise<string> {
    if (account.type !== TradingAccountType.DEMO) {
      throw new BadRequestException(
        "Paper trading is only available for Demo accounts",
      );
    }

    const aliases =
      await this.instrumentAliasRepository.findByInstrument(instrumentId);

    if (aliases.length === 0) {
      throw new BadRequestException(
        `No market-data provider alias is configured for instrument ${instrumentId}`,
      );
    }

    // Prefer an alias whose provider is currently registered. This keeps
    // execution tied to the live provider path rather than persisted
    // market_quotes.
    let quote: {
      bidPrice?: string | null;
      askPrice?: string | null;
    } | null = null;

    for (const alias of aliases) {
      const providerConfig =
        await this.providerConfigRepository.findById(alias.providerId);

      if (!providerConfig || !providerConfig.isActive) {
        continue;
      }

      const provider = this.providerRegistry.tryGet(providerConfig.type);

      if (!provider?.quoteClient) {
        continue;
      }

      const liveQuote =
        await provider.quoteClient.fetchLatestQuote(alias.providerSymbol);

      if (liveQuote) {
        quote = liveQuote;
        break;
      }
    }

    if (!quote) {
      throw new BadRequestException(
        "No live market quote is available for this instrument",
      );
    }

    const price =
      side === "BUY"
        ? quote.askPrice
        : quote.bidPrice;

    if (!price) {
      throw new BadRequestException(
        `No executable ${side === "BUY" ? "ask" : "bid"} price is available`,
      );
    }

    return price;
  }

  async placeMarketOrder(
    organizationId: string,
    ownerUserId: string,
    accountId: string,
    input: Omit<PaperOrderInput, "type" | "limitPrice" | "stopPrice">,
  ): Promise<PaperMarketOrderResult> {
    return this.placeOrder(
      organizationId,
      ownerUserId,
      accountId,
      {
        ...input,
        type: TradingOrderType.MARKET,
      },
    );
  }

  async placeOrder(
    organizationId: string,
    ownerUserId: string,
    accountId: string,
    input: PaperOrderInput,
  ): Promise<PaperOrderResult> {
    return this.placeOrderInternal(
      organizationId,
      ownerUserId,
      accountId,
      input,
    );
  }

  private async placeOrderInternal(
    organizationId: string,
    ownerUserId: string,
    accountId: string,
    input: PaperOrderInput,
  ): Promise<PaperOrderResult> {
    const quantity = new Prisma.Decimal(input.quantity);

    if (quantity.lte(0)) {
      throw new BadRequestException(
        "Quantity must be greater than zero",
      );
    }

    if (
      !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(input.quantity)
    ) {
      throw new BadRequestException(
        "Quantity must be a valid positive decimal",
      );
    }

    const account = await this.requireDemoAccount(
      organizationId,
      ownerUserId,
      accountId,
    );

    return this.transactionManager.run(async (client) => {
      const lockedAccount =
        await this.tradingAccountRepository.findById(
          organizationId,
          ownerUserId,
          accountId,
          client,
        );

      if (!lockedAccount) {
        throw new NotFoundException(
          "Trading account not found",
        );
      }

      if (lockedAccount.type !== TradingAccountType.DEMO) {
        throw new BadRequestException(
          "Paper trading is only available for Demo accounts",
        );
      }

      if (
        lockedAccount.status !==
        TradingAccountStatus.ACTIVE
      ) {
        throw new BadRequestException(
          "Trading account is not active",
        );
      }

      /*
       * Conditional orders are accepted and stored as PENDING.
       *
       * They must not fetch an executable quote, create a fill,
       * create/update a position, create a trade, or change balance.
       * A future trigger/execution engine will transition them
       * when their market conditions are satisfied.
       */
      if (
        input.type !== TradingOrderType.MARKET &&
        !input.existingOrderId
      ) {
        const limitPrice =
          input.limitPrice !== undefined
            ? new Prisma.Decimal(input.limitPrice)
            : null;

        const stopPrice =
          input.stopPrice !== undefined
            ? new Prisma.Decimal(input.stopPrice)
            : null;

        if (
          limitPrice !== null &&
          limitPrice.lte(0)
        ) {
          throw new BadRequestException(
            "Limit price must be greater than zero",
          );
        }

        if (
          stopPrice !== null &&
          stopPrice.lte(0)
        ) {
          throw new BadRequestException(
            "Stop price must be greater than zero",
          );
        }

        if (
          input.type === TradingOrderType.LIMIT &&
          limitPrice === null
        ) {
          throw new BadRequestException(
            "Limit price is required for LIMIT orders",
          );
        }

        if (
          input.type === TradingOrderType.STOP &&
          stopPrice === null
        ) {
          throw new BadRequestException(
            "Stop price is required for STOP orders",
          );
        }

        if (
          input.type === TradingOrderType.STOP_LIMIT &&
          (stopPrice === null || limitPrice === null)
        ) {
          throw new BadRequestException(
            "Stop price and limit price are required for STOP_LIMIT orders",
          );
        }

        const pendingOrder =
          await this.paperTradingRepository.createOrder(
            {
              accountId,
              instrumentId: input.instrumentId,
              side:
                input.side === "BUY"
                  ? TradingOrderSide.BUY
                  : TradingOrderSide.SELL,
              type: input.type,
              quantity: quantity.toString(),
              limitPrice:
                limitPrice?.toString(),
              stopPrice:
                stopPrice?.toString(),
              status: TradingOrderStatus.PENDING,
            },
            client,
          );

        return {
          order: pendingOrder,
          position: null,
          trade: null,
          executedPrice: null,
          realizedPnl: "0",
          balance: lockedAccount.balance.toString(),
        };
      }

      let executionPriceText = input.executionPrice;

      if (!executionPriceText) {
        executionPriceText =
          await this.getExecutionPrice(
            lockedAccount,
            input.instrumentId,
            input.side,
          );
      }

      if (!executionPriceText) {
        throw new BadRequestException(
          `No executable ${input.side === "BUY" ? "ask" : "bid"} price is available`,
        );
      }

      const executionPrice =
        new Prisma.Decimal(executionPriceText);

      const stopLossPrice =
        input.stopLossPrice !== undefined
          ? new Prisma.Decimal(input.stopLossPrice)
          : null;

      const takeProfitPrice =
        input.takeProfitPrice !== undefined
          ? new Prisma.Decimal(input.takeProfitPrice)
          : null;

      if (
        stopLossPrice !== null &&
        stopLossPrice.lte(0)
      ) {
        throw new BadRequestException(
          "Stop-loss price must be greater than zero",
        );
      }

      if (
        takeProfitPrice !== null &&
        takeProfitPrice.lte(0)
      ) {
        throw new BadRequestException(
          "Take-profit price must be greater than zero",
        );
      }

      if (
        stopLossPrice !== null &&
        takeProfitPrice !== null &&
        stopLossPrice.eq(takeProfitPrice)
      ) {
        throw new BadRequestException(
          "Stop-loss and take-profit prices must be different",
        );
      }

      if (
        input.side === "BUY" &&
        (
          (stopLossPrice !== null &&
            !stopLossPrice.lt(executionPrice)) ||
          (takeProfitPrice !== null &&
            !takeProfitPrice.gt(executionPrice))
        )
      ) {
        throw new BadRequestException(
          "For BUY orders, stop-loss must be below entry and take-profit must be above entry",
        );
      }

      if (
        input.side === "SELL" &&
        (
          (stopLossPrice !== null &&
            !stopLossPrice.gt(executionPrice)) ||
          (takeProfitPrice !== null &&
            !takeProfitPrice.lt(executionPrice))
        )
      ) {
        throw new BadRequestException(
          "For SELL orders, stop-loss must be above entry and take-profit must be below entry",
        );
      }

      const currentBalance =
        new Prisma.Decimal(lockedAccount.balance);

      const leverage =
        new Prisma.Decimal(lockedAccount.leverage ?? 1);

      if (leverage.lt(1)) {
        throw new BadRequestException(
          "Trading account leverage must be at least 1",
        );
      }

      const existingPositions =
        await this.paperTradingRepository.listPositions(
          accountId,
          client,
        );

      const usedMargin = existingPositions
        .filter(
          (position) =>
            position.status === TradingPositionStatus.OPEN &&
            new Prisma.Decimal(position.quantity).gt(0),
        )
        .reduce(
          (total, position) =>
            total.add(
              new Prisma.Decimal(position.averageEntryPrice)
                .mul(new Prisma.Decimal(position.quantity))
                .div(leverage),
            ),
          new Prisma.Decimal(0),
        );

      const availableMargin =
        currentBalance.sub(usedMargin);

      const now = new Date();

      let order: TradingOrder;

      if (input.existingOrderId) {
        const existingOrder =
          await this.paperTradingRepository.findOrder(
            accountId,
            input.existingOrderId,
            client,
          );

        if (
          !existingOrder ||
          existingOrder.status !== TradingOrderStatus.PENDING
        ) {
          throw new BadRequestException(
            "Pending trading order is no longer executable",
          );
        }

        if (
          existingOrder.instrumentId !== input.instrumentId ||
          existingOrder.quantity.toString() !== quantity.toString() ||
          existingOrder.side !==
            (input.side === "BUY"
              ? TradingOrderSide.BUY
              : TradingOrderSide.SELL)
        ) {
          throw new BadRequestException(
            "Pending trading order does not match execution request",
          );
        }

        order =
          await this.paperTradingRepository.updateOrder(
            existingOrder.id,
            {
              status: TradingOrderStatus.FILLED,
              triggeredAt: existingOrder.triggeredAt ?? now,
              executedPrice: executionPrice.toString(),
              filledAt: now,
            },
            client,
          );
      } else {
        order =
          await this.paperTradingRepository.createOrder(
            {
              accountId,
              instrumentId: input.instrumentId,
              side:
                input.side === "BUY"
                  ? TradingOrderSide.BUY
                  : TradingOrderSide.SELL,
              type: TradingOrderType.MARKET,
              quantity: quantity.toString(),
              status: TradingOrderStatus.FILLED,
              executedPrice: executionPrice.toString(),
              filledAt: now,
            },
            client,
          );
      }

      await this.paperTradingRepository.createFill(
        {
          orderId: order.id,
          price: executionPrice.toString(),
          quantity: quantity.toString(),
          commission: "0",
          filledAt: now,
        },
        client,
      );

      const sameSidePosition =
        await this.paperTradingRepository.findOpenPosition(
          accountId,
          input.instrumentId,
          input.side === "BUY"
            ? TradingPositionSide.LONG
            : TradingPositionSide.SHORT,
          client,
        );

      const oppositePosition =
        await this.paperTradingRepository.findOpenPosition(
          accountId,
          input.instrumentId,
          input.side === "BUY"
            ? TradingPositionSide.SHORT
            : TradingPositionSide.LONG,
          client,
        );

      /*
       * Same-side order:
       *   BUY  + LONG  => add to LONG
       *   SELL + SHORT => add to SHORT
       */
      if (sameSidePosition) {
        const existingQuantity =
          new Prisma.Decimal(
            sameSidePosition.quantity,
          );

        const existingEntry =
          new Prisma.Decimal(
            sameSidePosition.averageEntryPrice,
          );

        const totalQuantity =
          existingQuantity.add(quantity);

        const weightedEntry =
          existingEntry
            .mul(existingQuantity)
            .add(
              executionPrice.mul(quantity),
            )
            .div(totalQuantity);

        const position =
          await this.paperTradingRepository.updatePosition(
            sameSidePosition.id,
            {
              quantity:
                totalQuantity.toString(),
              averageEntryPrice:
                weightedEntry.toString(),
              ...(input.stopLossPrice !== undefined
                ? {
                    stopLossPrice:
                      stopLossPrice?.toString() ?? null,
                  }
                : {}),
              ...(input.takeProfitPrice !== undefined
                ? {
                    takeProfitPrice:
                      takeProfitPrice?.toString() ?? null,
                  }
                : {}),
            },
            client,
          );

        const additionalMargin =
          executionPrice
            .mul(quantity)
            .div(leverage);

        if (availableMargin.lt(additionalMargin)) {
          throw new BadRequestException(
            "Insufficient Demo account margin",
          );
        }

        return {
          order,
          position,
          trade: null,
          executedPrice:
            executionPrice.toString(),
          realizedPnl: "0",
          balance:
            currentBalance.toString(),
        };
      }

      /*
       * Opposite-side order:
       *   SELL + LONG  => close LONG
       *   BUY  + SHORT => close SHORT
       */
      if (oppositePosition) {
        const existingQuantity =
          new Prisma.Decimal(
            oppositePosition.quantity,
          );

        if (existingQuantity.lt(quantity)) {
          throw new BadRequestException(
            "Order quantity exceeds the open Demo position",
          );
        }

        const entryPrice =
          new Prisma.Decimal(
            oppositePosition.averageEntryPrice,
          );

        const proceeds =
          executionPrice.mul(quantity);

        const realizedPnl =
          oppositePosition.side ===
          TradingPositionSide.LONG
            ? executionPrice
                .sub(entryPrice)
                .mul(quantity)
            : entryPrice
                .sub(executionPrice)
                .mul(quantity);

        const remainingQuantity =
          existingQuantity.sub(quantity);

        const nextBalance =
          currentBalance.add(proceeds);

        let position: TradingPosition;
        let trade: TradingTrade | null = null;

        if (remainingQuantity.eq(0)) {
          position =
            await this.paperTradingRepository.updatePosition(
              oppositePosition.id,
              {
                quantity: "0",
                status:
                  TradingPositionStatus.CLOSED,
                closedAt: now,
                averageExitPrice:
                  executionPrice.toString(),
                realizedPnl:
                  realizedPnl.toString(),
              },
              client,
            );

          trade =
            await this.paperTradingRepository.createTrade(
              {
                accountId,
                instrumentId:
                  input.instrumentId,
                side:
                  oppositePosition.side,
                quantity:
                  quantity.toString(),
                entryPrice:
                  entryPrice.toString(),
                exitPrice:
                  executionPrice.toString(),
                realizedPnl:
                  realizedPnl.toString(),
                openedAt:
                  oppositePosition.openedAt,
                closedAt: now,
              },
              client,
            );
        } else {
          const priorRealized =
            new Prisma.Decimal(
              oppositePosition.realizedPnl ?? 0,
            );

          position =
            await this.paperTradingRepository.updatePosition(
              oppositePosition.id,
              {
                quantity:
                  remainingQuantity.toString(),
                realizedPnl:
                  priorRealized
                    .add(realizedPnl)
                    .toString(),
              },
              client,
            );
        }

        await this.paperTradingRepository.updateAccountBalance(
          accountId,
          nextBalance.toString(),
          client,
        );

        await this.paperTradingRepository.createLedgerEntry(
          {
            accountId,
            type: TradingLedgerEntryType.TRADE_CREDIT,
            amount:
              proceeds.toString(),
            balanceAfter:
              nextBalance.toString(),
            reference: `paper-order:${order.id}`,
            metadata: {
              proceeds:
                proceeds.toString(),
              realizedPnl:
                realizedPnl.toString(),
            },
          },
          client,
        );

        return {
          order,
          position,
          trade,
          executedPrice:
            executionPrice.toString(),
          realizedPnl:
            realizedPnl.toString(),
          balance:
            nextBalance.toString(),
        };
      }

      /*
       * No position:
       *   BUY  => open LONG
       *   SELL => open SHORT
       */
      const notional =
        executionPrice.mul(quantity);

      const requiredMargin =
        notional.div(leverage);

      if (availableMargin.lt(requiredMargin)) {
        throw new BadRequestException(
          "Insufficient Demo account margin",
        );
      }

      const position =
        await this.paperTradingRepository.createPosition(
          {
            accountId,
            instrumentId:
              input.instrumentId,
            side:
              input.side === "BUY"
                ? TradingPositionSide.LONG
                : TradingPositionSide.SHORT,
            quantity:
              quantity.toString(),
            averageEntryPrice:
              executionPrice.toString(),
            stopLossPrice:
              stopLossPrice?.toString() ?? null,
            takeProfitPrice:
              takeProfitPrice?.toString() ?? null,
            status:
              TradingPositionStatus.OPEN,
            openedAt: now,
          },
          client,
        );

      const nextBalance =
        currentBalance.sub(notional);

      await this.paperTradingRepository.updateAccountBalance(
        accountId,
        nextBalance.toString(),
        client,
      );

      await this.paperTradingRepository.createLedgerEntry(
        {
          accountId,
          type: TradingLedgerEntryType.TRADE_DEBIT,
          amount: notional.negated().toString(),
          balanceAfter: nextBalance.toString(),
          reference: `paper-order:${order.id}`,
          metadata: {
            notional: notional.toString(),
          },
        },
        client,
      );

      return {
        order,
        position,
        trade: null,
        executedPrice:
          executionPrice.toString(),
        realizedPnl: "0",
        balance:
          nextBalance.toString(),
      };

    });
  }
}
