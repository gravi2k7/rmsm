import type { BrokerQuote, BrokerTick, BrokerCandle, BrokerHistoricalCandlesRequest } from "./broker-models";

/**
 * BR-001's Market Service section: Current Price, Bid, Ask, Spread, Tick,
 * Historical Candles, OHLC, Volume, across the 9 named timeframes.
 *
 * Per BR-001's own "IMPORTANT IMPLEMENTATION NOTE": this exists because
 * MT5 (and most brokers) expose broker-side pricing that can differ
 * subtly from a market-data provider's feed (spread markup, broker
 * server latency) — genuinely useful for order-execution decisions
 * (what price would MY broker fill me at right now) — but the Trading
 * Engine should still prefer the Market Data domain (MD-001..004) for
 * general market data whenever broker-specific pricing isn't the point.
 */
export interface BrokerMarketService {
  getQuote(symbol: string): Promise<BrokerQuote>;
  getTick(symbol: string): Promise<BrokerTick>;
  getCandles(request: BrokerHistoricalCandlesRequest): Promise<BrokerCandle[]>;
}
