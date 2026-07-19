import type { Confidence } from "../value-objects/confidence";
import type { SignalStrength } from "../value-objects/signal-strength";
import type { MarketContext } from "../entities/market-context";

export interface CompositeScore {
  /** 0-100, the final blended score. */
  readonly value: number;
  readonly confidenceComponent: number;
  readonly strengthComponent: number;
  readonly contextMultiplier: number;
}

/**
 * Computes a single composite score from an opportunity's own
 * confidence, signal strength, and market context — a genuine domain
 * calculation, not infrastructure. Weighting: confidence and signal
 * strength contribute equally (they measure different things — "how
 * sure is the source" vs. "how strong is the underlying move" — neither
 * should dominate); market context then scales the blended result up or
 * down rather than contributing its own additive share, since
 * unfavorable conditions should meaningfully discount an otherwise
 * strong, confident signal rather than being just one ingredient among
 * equals.
 */
export class ScoringService {
  score(confidence: Confidence, strength: SignalStrength, context: MarketContext): CompositeScore {
    const confidenceComponent = confidence.score;
    const strengthComponent = strength.magnitude * 100;
    const blended = (confidenceComponent + strengthComponent) / 2;

    const contextMultiplier = this.contextMultiplierFor(context);
    const value = Math.max(0, Math.min(100, blended * contextMultiplier));

    return { value, confidenceComponent, strengthComponent, contextMultiplier };
  }

  private contextMultiplierFor(context: MarketContext): number {
    if (!context.isFavorable()) return 0.5;
    if (context.volatility === "HIGH") return 0.85;
    if (context.liquidity === "LOW") return 0.85;
    return 1;
  }
}
