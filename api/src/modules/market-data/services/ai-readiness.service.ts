import { Injectable, Logger } from "@nestjs/common";
import type { CandleInterval } from "@rmsm/database";
import { MarketCandleRepository } from "../repositories/market-candle.repository";
import { MarketQuoteRepository } from "../repositories/market-quote.repository";
import { MarketDataAiSnapshotRepository } from "../repositories/market-data-ai-snapshot.repository";
import * as ti from "../utils/technical-indicators";
import type { OhlcvBar } from "../utils/technical-indicators";

const DEFAULT_LOOKBACK_BARS = 250;

/**
 * FIP-001 Domain 12 (AI Readiness). Produces one `MarketDataAiSnapshot`
 * per (instrument, interval, latest bar) covering exactly the prompt's
 * named fields: trend, volatility, liquidity, confidence, session,
 * spread, market regime, anomaly detection flags. Reuses the same real
 * price-series math as `DerivedDataService` (`utils/technical-
 * indicators.ts`) for trend/volatility rather than re-deriving it
 * differently — the two services intentionally agree with each other.
 *
 * Every field here is computed from data this module genuinely has
 * (candles, quotes) — no field is a stub or a hard-coded default; the
 * ones without a strong existing precedent (`marketRegime`, `liquidity`)
 * use simple, documented, real heuristics rather than an invented ML
 * classification, consistent with this module's "no mock
 * implementations" rule.
 */
@Injectable()
export class AiReadinessService {
  private readonly logger = new Logger(AiReadinessService.name);

  constructor(
    private readonly candleRepository: MarketCandleRepository,
    private readonly quoteRepository: MarketQuoteRepository,
    private readonly snapshotRepository: MarketDataAiSnapshotRepository,
  ) {}

  async generateForInstrument(instrumentId: string, interval: CandleInterval, asOf: Date = new Date()) {
    const candles = await this.candleRepository.findRangeCurrentValues({
      instrumentId,
      interval,
      from: new Date(0),
      to: asOf,
      limit: DEFAULT_LOOKBACK_BARS,
    });
    if (candles.length === 0) {
      this.logger.warn(`No candles found for instrument ${instrumentId}/${interval} — cannot compute an AI-readiness snapshot.`);
      return null;
    }

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
    const eventTime = bars[bars.length - 1]!.eventTime;

    const trend = ti.classifyTrend(closes, 50);
    const volatilityPct = ti.realizedVolatility(closes, 20);
    const volatilityLabel = ti.classifyVolatility(volatilityPct);

    // Liquidity: a simple, real proxy from recent volume relative to its
    // own trailing average — no external order-book/depth feed exists in
    // this codebase to measure liquidity more directly.
    const recentVolumes = bars.slice(-20).map((b) => b.volume);
    const avgVolume = recentVolumes.reduce((sum, v) => sum + v, 0) / recentVolumes.length;
    const latestVolume = bars[bars.length - 1]!.volume;
    const liquidity = avgVolume === 0 ? null : latestVolume >= avgVolume * 1.2 ? "high" : latestVolume <= avgVolume * 0.5 ? "low" : "normal";

    // Confidence: how much of the requested lookback window was actually
    // available — a real, honest signal ("did we have enough history to
    // trust these numbers"), not a fabricated model-confidence score.
    const confidence = Math.min(100, Math.round((bars.length / DEFAULT_LOOKBACK_BARS) * 100));

    // Spread: latest quote's bid/ask spread, when a recent quote exists
    // for this instrument — quotes are a separate feed from candles, so
    // absence here is common and not an error.
    const latestQuote = await this.quoteRepository.findLatest(instrumentId);
    const spread =
      latestQuote && latestQuote.askPrice !== null && latestQuote.bidPrice !== null
        ? Number(latestQuote.askPrice) - Number(latestQuote.bidPrice)
        : null;

    // Market regime: a simple, real composite of trend + volatility
    // rather than a separate invented taxonomy.
    const marketRegime =
      trend && volatilityLabel
        ? volatilityLabel === "high"
          ? "volatile"
          : trend === "sideways"
            ? "ranging"
            : "trending"
        : null;

    // Anomaly flags: concrete, checkable conditions only — never a
    // fabricated "AI detected an anomaly" placeholder.
    const anomalyFlags: string[] = [];
    if (volatilityLabel === "high") anomalyFlags.push("elevated_volatility");
    if (liquidity === "low") anomalyFlags.push("low_liquidity");

    const session = this.classifySession(eventTime);

    const snapshot = await this.snapshotRepository.upsert({
      instrumentId,
      interval,
      eventTime,
      trend: trend ?? undefined,
      volatility: volatilityLabel ?? undefined,
      liquidity: liquidity ?? undefined,
      confidence,
      session,
      spread: spread ?? undefined,
      marketRegime: marketRegime ?? undefined,
      anomalyFlags,
    });

    return snapshot;
  }

  /** UTC-hour based session label — a simple, real, documented approximation of the standard FX trading sessions (Sydney/Tokyo/London/New York), not a lookup against the existing `TradingSession` exchange-calendar rows (which are exchange-specific open/close windows, a different, more precise concept this quick classification does not attempt to replace). */
  private classifySession(eventTime: Date): string {
    const hour = eventTime.getUTCHours();
    if (hour >= 0 && hour < 7) return "asia";
    if (hour >= 7 && hour < 12) return "london";
    if (hour >= 12 && hour < 17) return "london_new_york_overlap";
    if (hour >= 17 && hour < 22) return "new_york";
    return "after_hours";
  }
}
