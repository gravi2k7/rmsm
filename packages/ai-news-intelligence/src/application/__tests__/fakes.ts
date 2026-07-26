import type { Clock, IdGenerator } from "@rmsm/core";
import { unwrap } from "@rmsm/core";
import { SymbolCode, Candle, Price, Volume, Timeframe } from "@rmsm/market";
import type { NewsProvider } from "../../repositories/news-provider.interface";
import type { EconomicCalendarProvider } from "../../repositories/economic-calendar-provider.interface";
import type { NewsArticle } from "../../domain/entities/news-article.entity";
import type { EconomicCalendarEvent } from "../../domain/entities/economic-calendar-event.entity";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { NewsIntelligenceDomainEvent } from "../../events/news-intelligence-domain-events.interface";

export class FixedClock implements Clock {
  constructor(private current: Date = new Date("2026-01-01T00:00:00.000Z")) {}
  now(): Date {
    return this.current;
  }
}

export class SequentialIdGenerator implements IdGenerator {
  private counter = 0;
  generate(): string {
    this.counter += 1;
    return `id-${this.counter}`;
  }
}

export class RecordingEventPublisher implements EventPublisher {
  public readonly published: NewsIntelligenceDomainEvent[] = [];
  async publish(events: readonly NewsIntelligenceDomainEvent[]): Promise<void> {
    this.published.push(...events);
  }
}

export function buildSymbolCode(value = "EURUSD"): SymbolCode {
  return unwrap(SymbolCode.create(value));
}

export function buildArticle(overrides: Partial<NewsArticle> = {}): NewsArticle {
  return {
    id: overrides.id ?? "article-1",
    headline: overrides.headline ?? "Company reports strong quarterly earnings beat",
    body: overrides.body ?? "The company posted record revenue growth and a strong earnings beat, surging past analyst estimates.",
    source: overrides.source ?? "Test Wire",
    publishedAt: overrides.publishedAt ?? new Date("2026-01-01T00:00:00.000Z"),
    relatedSymbols: overrides.relatedSymbols ?? ["EURUSD"],
  };
}

export class FakeNewsProvider implements NewsProvider {
  constructor(private readonly articles: readonly NewsArticle[]) {}
  async fetchLatest(): Promise<readonly NewsArticle[]> {
    return this.articles;
  }
}

export class FakeEconomicCalendarProvider implements EconomicCalendarProvider {
  constructor(private readonly events: readonly EconomicCalendarEvent[]) {}
  async getUpcomingEvents(): Promise<readonly EconomicCalendarEvent[]> {
    return this.events;
  }
}

function price(amount: number): Price {
  return unwrap(Price.create(amount, 5));
}

function volume(units: number): Volume {
  return unwrap(Volume.create(units));
}

/** Builds a deterministic candle series for feeding a REAL
 * `@rmsm/ai-market-intelligence` (AI-601) `MarketSummaryService` in
 * tests — this package never computes market summaries itself. */
export function buildCandles(closes: readonly number[], symbolCode: SymbolCode = buildSymbolCode()): Candle[] {
  return closes.map((close, index) => {
    const open = index === 0 ? close : closes[index - 1]!;
    const high = Math.max(open, close) + 0.0005;
    const low = Math.min(open, close) - 0.0005;
    const timestamp = new Date(Date.UTC(2026, 0, 1, 0, index));
    return Candle.hydrate(`candle-${index}`, symbolCode, Timeframe.M1, timestamp, price(open), price(high), price(low), price(close), volume(1000));
  });
}
