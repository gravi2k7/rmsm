import { ok, err, type Result, InvariantViolationError } from "@rmsm/core";
import { SymbolCode } from "@rmsm/market";
import { Opportunity } from "../entities/opportunity";
import { Signal, type SignalDirection } from "../entities/signal";
import { MarketContext, type Trend, type VolatilityLevel, type LiquidityLevel } from "../entities/market-context";
import { Confidence } from "../value-objects/confidence";
import { SignalStrength } from "../value-objects/signal-strength";
import { InvalidOpportunityError, type OpportunityDomainError } from "../errors/opportunity.errors";

export interface RawOpportunityInput {
  readonly id: string;
  readonly symbolCode: string;
  readonly strategyId: string;
  readonly signalId: string;
  readonly direction: SignalDirection;
  readonly signalMagnitude: number;
  readonly confidenceScore: number;
  readonly trend: Trend;
  readonly volatility: VolatilityLevel;
  readonly liquidity: LiquidityLevel;
  readonly createdAt: Date;
  readonly expiresAt: Date;
}

/** Builds an `Opportunity` (and its own `Signal` + `MarketContext`) from
 * raw primitive input — the same fail-fast, aggregated-`Result`
 * composition pattern `@rmsm/market`'s `SymbolFactory` and
 * `@rmsm/strategy`'s `StrategyFactory` both use. */
export class OpportunityFactory {
  static create(input: RawOpportunityInput): Result<Opportunity, OpportunityDomainError> {
    const symbolCode = SymbolCode.create(input.symbolCode);
    if (!symbolCode.ok) return symbolCode;

    const strength = SignalStrength.fromMagnitude(input.signalMagnitude);
    if (!strength.ok) return strength;

    const confidence = Confidence.create(input.confidenceScore);
    if (!confidence.ok) return confidence;

    try {
      const signal = Signal.generate(input.signalId, {
        symbolCode: symbolCode.value,
        direction: input.direction,
        strength: strength.value,
        sourceId: input.strategyId,
        generatedAt: input.createdAt,
      });

      const marketContext = MarketContext.capture(`${input.id}-context`, {
        trend: input.trend,
        volatility: input.volatility,
        liquidity: input.liquidity,
        capturedAt: input.createdAt,
      });

      const opportunity = Opportunity.create(input.id, {
        symbolCode: symbolCode.value,
        strategyId: input.strategyId,
        signal,
        confidence: confidence.value,
        marketContext,
        createdAt: input.createdAt,
        expiresAt: input.expiresAt,
      });

      return ok(opportunity);
    } catch (error) {
      if (error instanceof InvariantViolationError) return err(new InvalidOpportunityError(error.message));
      throw error;
    }
  }
}
