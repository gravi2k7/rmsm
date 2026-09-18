import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import {
  prisma,
  TradingAccountStatus,
  TradingAccountType,
  TradingOrderSide,
  TradingOrderStatus,
  TradingOrderType,
  TradingPositionSide,
  TradingPositionStatus,
} from "@rmsm/database";
import {
  MarketDataStreamPublisher,
  type MarketDataQuoteStreamPayload,
} from "../../modules/market-data/services/market-data-stream.publisher";
import { PaperTradingService } from "./paper-trading.service";

@Injectable()
export class PaperTradingRiskMonitorService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(
    PaperTradingRiskMonitorService.name,
  );

  private readonly closingPositionIds = new Set<string>();
  private readonly processingQuotes = new Set<string>();
  private readonly pendingQuotes = new Map<
    string,
    MarketDataQuoteStreamPayload
  >();

  constructor(
    private readonly streamPublisher: MarketDataStreamPublisher,
    private readonly paperTradingService: PaperTradingService,
  ) {}

  onModuleInit(): void {
    this.streamPublisher.onQuote(this.handleQuote);
    this.logger.log("Paper-trading SL/TP risk monitor started");
  }

  private async processPendingOrders(
    quote: MarketDataQuoteStreamPayload,
  ): Promise<void> {
    const orders = await prisma.tradingOrder.findMany({
      where: {
        instrumentId: quote.instrumentId,
        status: TradingOrderStatus.PENDING,
      },
      include: {
        account: {
          select: {
            id: true,
            organizationId: true,
            ownerUserId: true,
            type: true,
            status: true,
          },
        },
      },
    });

    const bid =
      quote.bidPrice === undefined ||
      quote.bidPrice === null ||
      quote.bidPrice === ""
        ? null
        : Number(quote.bidPrice);

    const ask =
      quote.askPrice === undefined ||
      quote.askPrice === null ||
      quote.askPrice === ""
        ? null
        : Number(quote.askPrice);

    for (const order of orders) {
      if (
        order.account.type !== TradingAccountType.DEMO ||
        order.account.status !== TradingAccountStatus.ACTIVE
      ) {
        continue;
      }

      const executable =
        order.side === TradingOrderSide.BUY ? ask : bid;

      if (
        executable === null ||
        !Number.isFinite(executable) ||
        executable <= 0
      ) {
        continue;
      }

      const limit =
        order.limitPrice === null
          ? null
          : Number(order.limitPrice);

      const stop =
        order.stopPrice === null
          ? null
          : Number(order.stopPrice);

      let triggered = false;
      let shouldExecute = false;

      if (order.type === TradingOrderType.LIMIT) {
        triggered =
          order.side === TradingOrderSide.BUY
            ? executable <= (limit ?? NaN)
            : executable >= (limit ?? NaN);

        shouldExecute = triggered;
      } else if (order.type === TradingOrderType.STOP) {
        triggered =
          order.side === TradingOrderSide.BUY
            ? executable >= (stop ?? NaN)
            : executable <= (stop ?? NaN);

        shouldExecute = triggered;
      } else if (order.type === TradingOrderType.STOP_LIMIT) {
        if (!order.triggeredAt) {
          triggered =
            order.side === TradingOrderSide.BUY
              ? executable >= (stop ?? NaN)
              : executable <= (stop ?? NaN);

          if (triggered) {
            await this.paperTradingService.markOrderTriggered(
              order.account.organizationId,
              order.account.ownerUserId,
              order.account.id,
              order.id,
            );
          }

          continue;
        }

        shouldExecute =
          order.side === TradingOrderSide.BUY
            ? executable <= (limit ?? NaN)
            : executable >= (limit ?? NaN);
      }

      if (!shouldExecute) {
        continue;
      }

      try {
        await this.paperTradingService.executeTriggeredOrder(
          order.account.organizationId,
          order.account.ownerUserId,
          order.account.id,
          order.id,
          executable.toString(),
        );
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : String(error);

        this.logger.error(
          `Conditional order execution failed for order=${order.id}: ${message}`,
        );
      }
    }
  }

  onModuleDestroy(): void {
    this.streamPublisher.offQuote(this.handleQuote);
    this.closingPositionIds.clear();
    this.processingQuotes.clear();
    this.pendingQuotes.clear();
    this.logger.log("Paper-trading SL/TP risk monitor stopped");
  }

  private readonly handleQuote = (
    quote: MarketDataQuoteStreamPayload,
  ): void => {
    const instrumentId = quote.instrumentId;

    if (this.processingQuotes.has(instrumentId)) {
      this.pendingQuotes.set(instrumentId, quote);
      return;
    }

    this.processingQuotes.add(instrumentId);

    void this.processQuoteLoop(instrumentId, quote);
  };

  private async processQuoteLoop(
    instrumentId: string,
    quote: MarketDataQuoteStreamPayload,
  ): Promise<void> {
    try {
      let currentQuote = quote;

      while (true) {
        try {
          await this.processQuote(currentQuote);
        } catch (error: unknown) {
          const message =
            error instanceof Error
              ? error.message
              : String(error);

          this.logger.error(
            `Failed to process risk quote for ${currentQuote.instrumentId}: ${message}`,
          );
        }

        const nextQuote = this.pendingQuotes.get(instrumentId);

        if (!nextQuote) {
          return;
        }

        this.pendingQuotes.delete(instrumentId);
        currentQuote = nextQuote;
      }
    } finally {
      this.processingQuotes.delete(instrumentId);
    }
  }

  private async processQuote(
    quote: MarketDataQuoteStreamPayload,
  ): Promise<void> {
    await this.processPendingOrders(quote);

    const bid =
      quote.bidPrice === undefined ||
      quote.bidPrice === null ||
      quote.bidPrice === ""
        ? null
        : Number(quote.bidPrice);

    const ask =
      quote.askPrice === undefined ||
      quote.askPrice === null ||
      quote.askPrice === ""
        ? null
        : Number(quote.askPrice);

    const positions =
      await prisma.tradingPosition.findMany({
        where: {
          instrumentId: quote.instrumentId,
          status: TradingPositionStatus.OPEN,
          OR: [
            { stopLossPrice: { not: null } },
            { takeProfitPrice: { not: null } },
          ],
        },
        include: {
          account: {
            select: {
              id: true,
              organizationId: true,
              ownerUserId: true,
              type: true,
              status: true,
            },
          },
        },
      });

    for (const position of positions) {
      if (
        position.account.type !== TradingAccountType.DEMO ||
        position.account.status !== TradingAccountStatus.ACTIVE
      ) {
        continue;
      }

      if (this.closingPositionIds.has(position.id)) {
        continue;
      }

      const stopLoss =
        position.stopLossPrice === null
          ? null
          : Number(position.stopLossPrice);

      const takeProfit =
        position.takeProfitPrice === null
          ? null
          : Number(position.takeProfitPrice);

      let trigger: "STOP_LOSS" | "TAKE_PROFIT" | null =
        null;

      /*
       * Use the executable side of the market:
       *
       * LONG closes with SELL -> BID
       * SHORT closes with BUY -> ASK
       */
      const executablePrice =
        position.side === TradingPositionSide.LONG
          ? bid
          : ask;

      if (
        executablePrice === null ||
        !Number.isFinite(executablePrice)
      ) {
        continue;
      }

      if (position.side === TradingPositionSide.LONG) {
        if (
          stopLoss !== null &&
          Number.isFinite(stopLoss) &&
          executablePrice <= stopLoss
        ) {
          trigger = "STOP_LOSS";
        } else if (
          takeProfit !== null &&
          Number.isFinite(takeProfit) &&
          executablePrice >= takeProfit
        ) {
          trigger = "TAKE_PROFIT";
        }
      } else {
        if (
          stopLoss !== null &&
          Number.isFinite(stopLoss) &&
          executablePrice >= stopLoss
        ) {
          trigger = "STOP_LOSS";
        } else if (
          takeProfit !== null &&
          Number.isFinite(takeProfit) &&
          executablePrice <= takeProfit
        ) {
          trigger = "TAKE_PROFIT";
        }
      }

      if (!trigger) {
        continue;
      }

      this.closingPositionIds.add(position.id);

      try {
        this.logger.log(
          `${trigger} triggered: position=${position.id} ` +
            `instrument=${position.instrumentId} ` +
            `side=${position.side} ` +
            `price=${executablePrice}`,
        );

        await this.paperTradingService.closePosition(
          position.account.organizationId,
          position.account.ownerUserId,
          position.account.id,
          position.id,
        );

        this.logger.log(
          `${trigger} closed position=${position.id}`,
        );
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : String(error);

        this.logger.error(
          `${trigger} close failed for position=${position.id}: ${message}`,
        );
      } finally {
        this.closingPositionIds.delete(position.id);
      }
    }
  };
}
