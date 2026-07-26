import { describe, expect, it } from "vitest";
import { TrendDirection, type MultiTimeframeAnalysis } from "@rmsm/ai-market-intelligence";
import { MultiTimeframeConfirmationService } from "../services/multi-timeframe-confirmation.service";
import { buildOpportunity } from "./fakes";

function buildAnalysis(overrides: Partial<MultiTimeframeAnalysis> = {}): MultiTimeframeAnalysis {
  return { timeframes: [], aligned: true, dominantDirection: TrendDirection.UP, ...overrides };
}

describe("MultiTimeframeConfirmationService", () => {
  const service = new MultiTimeframeConfirmationService();

  it("confirms a BUY signal when REAL AI-601 multi-timeframe analysis is aligned UP", () => {
    const opportunity = buildOpportunity({ direction: "BUY" });
    const result = service.confirm(opportunity, buildAnalysis({ aligned: true, dominantDirection: TrendDirection.UP }));
    expect(result.confirmed).toBe(true);
  });

  it("does not confirm a BUY signal when the dominant trend is DOWN", () => {
    const opportunity = buildOpportunity({ direction: "BUY" });
    const result = service.confirm(opportunity, buildAnalysis({ aligned: true, dominantDirection: TrendDirection.DOWN }));
    expect(result.confirmed).toBe(false);
  });

  it("does not confirm when timeframes are not aligned", () => {
    const opportunity = buildOpportunity({ direction: "BUY" });
    const result = service.confirm(opportunity, buildAnalysis({ aligned: false }));
    expect(result.confirmed).toBe(false);
  });
});
