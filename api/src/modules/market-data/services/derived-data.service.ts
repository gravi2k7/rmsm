import { Injectable, Logger } from "@nestjs/common";
import type { CandleInterval } from "@rmsm/database";
import { MarketCandleRepository } from "../repositories/market-candle.repository";
import { DerivedIndicatorSnapshotRepository } from "../repositories/derived-indicator-snapshot.repository";
import { DomainEventPublisher } from "../../../common/events/domain-event-publisher.service";
import { MarketDataStreamPublisherService, MARKET_DATA_STREAMS } from "./market-data-stream-publisher.service";
import { FIP001_EVENTS } from "../../../common/events/fip001-events";
import * as ti from "../utils/technical-indicators";
import type { OhlcvBar } from "../utils/technical-indicators";

const DEFAULT_LOOKBACK_BARS = 250;

/**
 * FIP-001 Domain 10 (Derived Data Pipeline). Reads a bounded trailing
 * window of persisted candles for one instrument/interval, computes the
 * 8 named indicators (ATR, RSI, EMA, SMA, MACD, Bollinger Bands, VWAP,
 * Pivot Points) plus Trend/Volatility labels via `utils/technical-
 * indicators.ts` (see that file's header comment for why this doesn't
 * delegate to the separate `indicator-engine` module), and persists one
 * `DerivedIndicatorSnapshot` row per indicator for the latest bar.
 * "Session Labels" (the prompt's 3rd label) reuses the existing
 * `TradingSession`-derived session concept already computed elsewhere in
 * this module (`AiReadinessService` — see that service for the actual
 * session-window lookup) rather than being duplicated here; this service
 * owns purely price/volume-derived indicators.
 */
@Injectable()
export class DerivedDataService {
  private readonly logger = new Logger(DerivedDataService.name);

  constructor(
    private readonly candleRepository: MarketCandleRepository,
    private readonly snapshotRepository: DerivedIndicatorSnapshotRepository,
    private readonly eventPublisher: DomainEventPublisher,
    private readonly streamPublisher: MarketDataStreamPublisherService,
  ) {}

  async generateForInstrument(instrumentId: string, interval: CandleInterval, asOf: Date = new Date()): Promise<number> {
    const candles = await this.candleRepository.findRangeCurrentValues({
      instrumentId,
      interval,
      from: new Date(0),
      to: asOf,
      limit: DEFAULT_LOOKBACK_BARS,
    });
    if (candles.length === 0) {
      this.logger.warn(`No candles found for instrument ${instrumentId}/${interval} — nothing to derive.`);
      return 0;
    }

    // findRangeCurrentValues orders however the repository defines it; sort
    // ascending by eventTime here so every array-index-based calculation
    // below (ema/rsi/macd/etc., which all assume oldest-first) is correct
    // regardless of that repository's own internal ordering.
    const sorted = [...candles].sort((a, b) => a.eventTime.getTime() - b.eventTime.getTime());
    const bars: OhlcvBar[] = sorted.map((c) => ({
      eventTime: c.eventTime,
      open: Number(c.open),
      high: Number(c.high),
      low: Number(c.low),
      close: Number(c.close),
      volume: Number(c.volume),
    }));
    const closes = bars.map((b) => b.close);
    const latestBar = bars[bars.length - 1]!;
    const eventTime = latestBar.eventTime;

    const outputs: Array<{ key: string; values: Record<string, unknown> | null }> = [
      { key: "sma", values: this.wrapNullable("value", ti.sma(closes, 20)) },
      { key: "ema", values: this.wrapNullable("value", ti.ema(closes, 20)) },
      { key: "rsi", values: this.wrapNullable("value", ti.rsi(closes, 14)) },
      { key: "atr", values: this.wrapNullable("value", ti.atr(bars, 14)) },
      // ti.macd()/ti.bollingerBands()/ti.pivotPoints() return named-field result interfaces
      // (MacdResult/BollingerBandsResult/PivotPointsResult), not Record<string, unknown> — they're
      // plain, flat, JSON-safe data objects, structurally interchangeable with Record<string,
      // unknown> at runtime, so this cast (not a type-safety-losing `any` cast, just a named-shape
      // -> index-signature-shape cast for a JSON-safe DTO) is honest.
      { key: "macd", values: ti.macd(closes) as unknown as Record<string, unknown> | null },
      { key: "bollinger_bands", values: ti.bollingerBands(closes) as unknown as Record<string, unknown> | null },
      { key: "vwap", values: this.wrapNullable("value", ti.vwap(bars)) },
      {
        key: "pivot_points",
        values: bars.length >= 2 ? (ti.pivotPoints(bars[bars.length - 2]!) as unknown as Record<string, unknown>) : null,
      },
    ];

    let written = 0;
    for (const output of outputs) {
      if (!output.values) continue;
      await this.snapshotRepository.upsert({ instrumentId, interval, eventTime, indicatorKey: output.key, outputs: output.values });
      written += 1;
    }

    const volatilityPct = ti.realizedVolatility(closes, 20);
    const trend = ti.classifyTrend(closes, 50);
    if (volatilityPct !== null) {
      await this.snapshotRepository.upsert({
        instrumentId,
        interval,
        eventTime,
        indicatorKey: "volatility",
        outputs: { percent: volatilityPct, label: ti.classifyVolatility(volatilityPct) },
      });
      written += 1;
    }
    if (trend !== null) {
      await this.snapshotRepository.upsert({ instrumentId, interval, eventTime, indicatorKey: "trend", outputs: { label: trend } });
      written += 1;
    }

    if (written > 0) {
      const payload = { instrumentId, interval, eventTime: eventTime.toISOString(), indicatorCount: written };
      this.eventPublisher.publish(FIP001_EVENTS.DERIVED_DATA_GENERATED, payload);
      await this.streamPublisher.publish(MARKET_DATA_STREAMS.DERIVED, FIP001_EVENTS.DERIVED_DATA_GENERATED, payload);
    }

    return written;
  }

  private wrapNullable(key: string, value: number | null): Record<string, unknown> | null {
    return value === null ? null : { [key]: value };
  }
}
