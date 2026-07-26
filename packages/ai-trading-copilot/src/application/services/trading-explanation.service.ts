import type { TradingExplanation } from "../../domain/entities/trading-explanation.entity";

/** A thin wrapper around an already-generated narrative from AI-601's
 * `MarketSummary.narrative`, AI-602's `TradeReasoning.narrative`, or any
 * other AI-6xx package's own narrative field — never composes a new
 * explanation itself; the copilot's job here is only to present it. */
export class TradingExplanationService {
  present(subjectId: string, narrative: string): TradingExplanation {
    return { subjectId, narrative };
  }
}
