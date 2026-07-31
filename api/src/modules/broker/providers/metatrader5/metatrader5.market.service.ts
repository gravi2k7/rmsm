import { Injectable } from "@nestjs/common";
import type { BrokerMarketService } from "../../interfaces/broker-market-service.interface";
import type { BrokerQuote, BrokerTick, BrokerCandle, BrokerHistoricalCandlesRequest } from "../../interfaces/broker-models";
import type { BrokerTimeframe } from "../../contracts/broker.contracts";
import { MetaTrader5Client } from "./metatrader5.client";
import type { Mt5QuoteResponse, Mt5TickResponse, Mt5CandleResponse } from "./metatrader5.types";
import { MT5_TIMEFRAMES } from "./metatrader5.constants";

/** BR-001's Market Service section: Current Price (Bid/Ask/Spread), Tick, Historical Candles (OHLC + Volume) across the 9 named timeframes. Broker-side pricing — see this domain's own note on `BrokerMarketService` about preferring the Market Data domain (MD-001..004) for general market data. */
@Injectable()
export class MetaTrader5MarketService implements BrokerMarketService {
  constructor(private readonly client: MetaTrader5Client) {}

  async getQuote(symbol: string): Promise<BrokerQuote> {
    const raw = await this.client.request<Mt5QuoteResponse>("GET", `/quote/${encodeURIComponent(symbol)}`);
    return {
      symbol: raw.symbol,
      bid: raw.bid,
      ask: raw.ask,
      spread: Number((raw.ask - raw.bid).toFixed(6)),
      eventTime: new Date(raw.time),
    };
  }

  async getTick(symbol: string): Promise<BrokerTick> {
    const raw = await this.client.request<Mt5TickResponse>("GET", `/tick/${encodeURIComponent(symbol)}`);
    return {
      symbol: raw.symbol,
      bid: raw.bid,
      ask: raw.ask,
      last: raw.last,
      volume: raw.volume,
      eventTime: new Date(raw.time),
    };
  }

  async getCandles(request: BrokerHistoricalCandlesRequest): Promise<BrokerCandle[]> {
    this.assertSupportedTimeframe(request.timeframe);
    const params = new URLSearchParams({
      timeframe: request.timeframe,
      from: request.from.toISOString(),
      to: request.to.toISOString(),
    });
    const raw = await this.client.request<Mt5CandleResponse[]>("GET", `/candles/${encodeURIComponent(request.symbol)}?${params.toString()}`);
    return raw.map((c) => ({
      symbol: request.symbol,
      timeframe: request.timeframe,
      eventTime: new Date(c.time),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
    }));
  }

  private assertSupportedTimeframe(timeframe: BrokerTimeframe): void {
    if (!MT5_TIMEFRAMES.includes(timeframe)) {
      throw new Error(`MetaTrader 5 provider does not support timeframe "${timeframe}" — supported: ${MT5_TIMEFRAMES.join(", ")}.`);
    }
  }
}
