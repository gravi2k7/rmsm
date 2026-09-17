import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { SymbolCode } from "@rmsm/market";
import {
  Position,
  Trade,
  type PortfolioRepository,
} from "@rmsm/portfolio";
import { MarketDataService } from "../../modules/market-data/services/market-data.service";
import { PORTFOLIO_REPOSITORY } from "../portfolio/portfolio.tokens";
import { DEFAULT_PORTFOLIO_ID } from "../../infrastructure/persistence/memory/portfolio/portfolio.seed";

export interface ManualOrderResult {
  orderId: string;
  portfolioId: string;
  instrumentId: string;
  symbolCode: string;
  side: "BUY" | "SELL";
  type: "MARKET";
  quantityUnits: number;
  executionPrice: number;
  status: "FILLED" | "CLOSED";
  positionId?: string;
  tradeId?: string;
  realizedPnl?: number;
  bidPrice?: number;
  askPrice?: number;
  executedAt: string;
}

@Injectable()
export class ManualTradingService {
  constructor(
    @Inject(PORTFOLIO_REPOSITORY)
    private readonly portfolioRepository: PortfolioRepository,
    private readonly marketDataService: MarketDataService,
  ) {}

  async executeOrder(
    instrumentId: string,
    side: "BUY" | "SELL",
    quantityUnits: number,
  ): Promise<ManualOrderResult> {
    const instrument =
      await this.marketDataService.getInstrument(instrumentId);

    const quote =
      await this.marketDataService.getLatestQuote(instrumentId);

    const bidPrice =
      quote.bidPrice === null ? undefined : Number(quote.bidPrice);

    const askPrice =
      quote.askPrice === null ? undefined : Number(quote.askPrice);

    if (side === "BUY" && askPrice === undefined) {
      throw new Error(`No ASK price available for ${instrument.symbol}`);
    }

    if (side === "SELL" && bidPrice === undefined) {
      throw new Error(`No BID price available for ${instrument.symbol}`);
    }

    const executionPrice =
      side === "BUY" ? askPrice! : bidPrice!;

    if (!Number.isFinite(executionPrice) || executionPrice <= 0) {
      throw new Error(
        `Invalid execution price for ${instrument.symbol}`,
      );
    }

    const symbolResult = SymbolCode.create(instrument.symbol);

    if (!symbolResult.ok) {
      throw symbolResult.error;
    }

    const symbolCode = symbolResult.value;

    const portfolio =
      await this.portfolioRepository.findById(DEFAULT_PORTFOLIO_ID);

    if (!portfolio) {
      throw new Error(
        `Demo portfolio ${DEFAULT_PORTFOLIO_ID} was not found`,
      );
    }

    const now = quote.eventTime ?? new Date();

    /*
     * First DEMO vertical slice:
     *
     * BUY  -> open LONG
     * SELL -> close matching LONG
     *
     * If no matching LONG exists, SELL opens SHORT.
     *
     * Margin is zero temporarily. Real leverage/margin rules will be
     * introduced when account/instrument trading rules are connected.
     */

    if (side === "BUY") {
      const position = Position.open(randomUUID(), {
        symbolCode,
        side: "LONG",
        quantityUnits,
        averageEntryPrice: executionPrice,
        openedAt: now,
      });

      portfolio.openPosition(position, 0, now);

      await this.portfolioRepository.save(portfolio);

      return {
        orderId: randomUUID(),
        portfolioId: portfolio.id,
        instrumentId,
        symbolCode: symbolCode.value,
        side,
        type: "MARKET",
        quantityUnits,
        executionPrice,
        status: "FILLED",
        positionId: position.id,
        bidPrice,
        askPrice,
        executedAt: now.toISOString(),
      };
    }

    const existingPosition = portfolio.openPositions.find(
      (position) =>
        position.symbolCode.value === symbolCode.value &&
        position.side === "LONG" &&
        position.quantityUnits === quantityUnits,
    );

    if (existingPosition) {
      const positionId = existingPosition.id;

      portfolio.closePosition(
        positionId,
        executionPrice,
        0,
        now,
      );

      const trade = Trade.fromClosedPosition(
        `${positionId}-trade`,
        existingPosition,
      );

      await this.portfolioRepository.save(portfolio);
      await this.portfolioRepository.saveTrade(trade);

      return {
        orderId: randomUUID(),
        portfolioId: portfolio.id,
        instrumentId,
        symbolCode: symbolCode.value,
        side,
        type: "MARKET",
        quantityUnits,
        executionPrice,
        status: "CLOSED",
        positionId,
        tradeId: trade.id,
        realizedPnl: trade.realizedPnl,
        bidPrice,
        askPrice,
        executedAt: now.toISOString(),
      };
    }

    const position = Position.open(randomUUID(), {
      symbolCode,
      side: "SHORT",
      quantityUnits,
      averageEntryPrice: executionPrice,
      openedAt: now,
    });

    portfolio.openPosition(position, 0, now);

    await this.portfolioRepository.save(portfolio);

    return {
      orderId: randomUUID(),
      portfolioId: portfolio.id,
      instrumentId,
      symbolCode: symbolCode.value,
      side,
      type: "MARKET",
      quantityUnits,
      executionPrice,
      status: "FILLED",
      positionId: position.id,
      bidPrice,
      askPrice,
      executedAt: now.toISOString(),
    };
  }
}
