import { describe, expect, it } from "vitest";
import {
  MarketAnalysisService,
  MarketRegimeService,
  MarketScoringService,
  MarketAlertService,
  MarketSummaryService,
} from "@rmsm/ai-market-intelligence";
import { MarketCommentaryService } from "../services/market-commentary.service";
import { buildCandles, buildSymbolCode, FixedClock, SequentialIdGenerator } from "./fakes";

describe("MarketCommentaryService", () => {
  it("composes a REAL, unmodified AI-601 MarketSummary with news summaries into one commentary", async () => {
    const marketAnalysis = new MarketAnalysisService();
    const summaryService = new MarketSummaryService(
      marketAnalysis,
      new MarketRegimeService(marketAnalysis),
      new MarketScoringService(marketAnalysis),
      new MarketAlertService(marketAnalysis),
      new FixedClock(),
      new SequentialIdGenerator(),
    );

    const symbolCode = buildSymbolCode();
    const candles = buildCandles([1.1, 1.11, 1.12, 1.13, 1.14, 1.15], symbolCode);
    const marketSummary = await summaryService.generate(symbolCode, candles);

    const commentaryService = new MarketCommentaryService(new FixedClock());
    const commentary = commentaryService.compose(marketSummary, [{ articleId: "a1", narrative: "Earnings beat expectations." }]);

    expect(commentary.symbolCode).toBe(symbolCode.value);
    expect(commentary.narrative).toContain(marketSummary.narrative);
    expect(commentary.narrative).toContain("Earnings beat expectations.");
  });
});
