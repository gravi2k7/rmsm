import type { Clock } from "@rmsm/core";
import { SystemClock } from "@rmsm/core";
import type { MarketSummary } from "@rmsm/ai-market-intelligence";
import type { NewsSummary } from "../../domain/entities/news-summary.entity";
import type { MarketCommentary } from "../../domain/entities/market-commentary.entity";

/**
 * Cross-package AI-6xx reuse: composes a REAL, unmodified
 * `@rmsm/ai-market-intelligence` (AI-601) `MarketSummary` with recent
 * `NewsSummary` items (produced elsewhere in this package) into one
 * commentary narrative — never recomputes the market summary itself.
 */
export class MarketCommentaryService {
  constructor(private readonly clock: Clock = new SystemClock()) {}

  compose(marketSummary: MarketSummary, newsSummaries: readonly NewsSummary[]): MarketCommentary {
    const parts = [marketSummary.narrative];
    if (newsSummaries.length > 0) {
      parts.push(`Recent news: ${newsSummaries.map((s) => s.narrative).join(" ")}`);
    }
    return { symbolCode: marketSummary.symbolCode, narrative: parts.join(" "), generatedAt: this.clock.now() };
  }
}
