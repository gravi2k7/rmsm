import { Injectable } from "@nestjs/common";
import type { MarketRepository, SymbolCode, Timeframe, Candle, Tick, Quote } from "@rmsm/market";

/** In-memory `MarketRepository` (time-series candle/tick/quote data) —
 * see `exchange.memory-repository.ts`'s own doc comment for the shared
 * Phase 4A persistence rationale. Candles are keyed by
 * `symbolCode:timeframe`; a real time-series store (the intended Prisma/
 * TimescaleDB replacement — see PERSISTENCE_ROADMAP.md) would index this
 * very differently for range-scan performance, which this in-memory
 * stand-in doesn't need to replicate. */
@Injectable()
export class InMemoryMarketRepository implements MarketRepository {
  private readonly candles = new Map<string, Candle[]>();
  private readonly latestTicks = new Map<string, Tick>();
  private readonly latestQuotes = new Map<string, Quote>();

  private candleKey(symbolCode: SymbolCode, timeframe: Timeframe): string {
    return `${symbolCode.value}:${timeframe}`;
  }

  async saveCandle(candle: Candle): Promise<void> {
    const key = this.candleKey(candle.symbolCode, candle.timeframe);
    const existing = this.candles.get(key) ?? [];
    this.candles.set(key, [...existing.filter((c) => c.id !== candle.id), candle]);
  }

  async getCandles(symbolCode: SymbolCode, timeframe: Timeframe, from: Date, to: Date): Promise<Candle[]> {
    const key = this.candleKey(symbolCode, timeframe);
    const all = this.candles.get(key) ?? [];
    return all.filter((c) => c.timestamp.getTime() >= from.getTime() && c.timestamp.getTime() <= to.getTime());
  }

  async getLatestCandle(symbolCode: SymbolCode, timeframe: Timeframe): Promise<Candle | null> {
    const key = this.candleKey(symbolCode, timeframe);
    const all = this.candles.get(key) ?? [];
    if (all.length === 0) return null;
    return all.reduce((latest, c) => (c.timestamp.getTime() > latest.timestamp.getTime() ? c : latest));
  }

  async saveTick(tick: Tick): Promise<void> {
    this.latestTicks.set(tick.symbolCode.value, tick);
  }

  async getLatestTick(symbolCode: SymbolCode): Promise<Tick | null> {
    return this.latestTicks.get(symbolCode.value) ?? null;
  }

  async saveQuote(quote: Quote): Promise<void> {
    this.latestQuotes.set(quote.symbolCode.value, quote);
  }

  async getLatestQuote(symbolCode: SymbolCode): Promise<Quote | null> {
    return this.latestQuotes.get(symbolCode.value) ?? null;
  }
}
