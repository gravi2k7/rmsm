import { describe, expect, it } from "vitest";
import { MemoryService, HeuristicSummarizer, InMemoryMemoryProvider } from "@rmsm/ai-memory";
import { MarketSummaryService } from "../services/market-summary.service";
import { MarketAnalysisService } from "../services/market-analysis.service";
import { MarketRegimeService } from "../services/market-regime.service";
import { MarketScoringService } from "../services/market-scoring.service";
import { MarketAlertService } from "../services/market-alert.service";
import { buildCandles, buildSymbolCode, FixedClock, RecordingEventPublisher, SequentialIdGenerator } from "./fakes";

function buildServices() {
  const marketAnalysis = new MarketAnalysisService();
  const regimeService = new MarketRegimeService(marketAnalysis);
  const scoringService = new MarketScoringService(marketAnalysis);
  const alertService = new MarketAlertService(marketAnalysis);
  return { marketAnalysis, regimeService, scoringService, alertService };
}

describe("MarketSummaryService", () => {
  it("generates a narrative summary composing every other service, without AI-203 wired in", async () => {
    const { marketAnalysis, regimeService, scoringService, alertService } = buildServices();
    const eventPublisher = new RecordingEventPublisher();
    const service = new MarketSummaryService(
      marketAnalysis,
      regimeService,
      scoringService,
      alertService,
      new FixedClock(),
      new SequentialIdGenerator(),
      eventPublisher,
    );

    const symbolCode = buildSymbolCode();
    const candles = buildCandles([1.1, 1.11, 1.12, 1.13, 1.14, 1.15]);
    const summary = await service.generate(symbolCode, candles);

    expect(summary.symbolCode).toBe(symbolCode.value);
    expect(summary.narrative).toContain("EURUSD");
    expect(summary.narrative).toContain(summary.regime.regime);
    expect(eventPublisher.published.some((e) => e.kind === "MarketSummaryGenerated")).toBe(true);
    expect(eventPublisher.published.some((e) => e.kind === "RegimeDetected")).toBe(true);
  });

  it("integrates with a REAL, unmodified @rmsm/ai-memory MemoryService + HeuristicSummarizer: condenses the narrative and persists it as a retrievable SEMANTIC memory", async () => {
    const { marketAnalysis, regimeService, scoringService, alertService } = buildServices();
    const memoryRepository = new InMemoryMemoryProvider();
    const memoryService = new MemoryService(memoryRepository);
    const summarizer = new HeuristicSummarizer();

    const service = new MarketSummaryService(
      marketAnalysis,
      regimeService,
      scoringService,
      alertService,
      new FixedClock(),
      new SequentialIdGenerator(),
      undefined,
      summarizer,
      memoryService,
    );

    const symbolCode = buildSymbolCode("GBPUSD");
    const candles = buildCandles([1.25, 1.26, 1.27, 1.28, 1.29, 1.3]);
    const summary = await service.generate(symbolCode, candles);

    // Real AI-203 retrieval path proves the summary was actually persisted, not just returned.
    const result = await memoryRepository.query({ tags: ["market-intelligence"] });
    const persisted = result.entries.find((entry) => entry.content === summary.narrative);

    expect(persisted).toBeDefined();
    expect(persisted?.metadata.tags).toContain("market-intelligence");
    expect(persisted?.metadata.tags).toContain("GBPUSD");
    expect(persisted?.metadata.source).toBe("ai-market-intelligence");
  });
});
