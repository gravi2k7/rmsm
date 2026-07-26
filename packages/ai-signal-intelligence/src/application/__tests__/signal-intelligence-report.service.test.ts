import { describe, expect, it } from "vitest";
import { MemoryService, HeuristicSummarizer, InMemoryMemoryProvider } from "@rmsm/ai-memory";
import { SignalQualityService } from "../services/signal-quality.service";
import { SignalExplanationService } from "../services/signal-explanation.service";
import { SignalIntelligenceReportService } from "../services/signal-intelligence-report.service";
import { buildOpportunity, FixedClock, RecordingEventPublisher, SequentialIdGenerator } from "./fakes";

describe("SignalIntelligenceReportService", () => {
  it("composes quality assessment + explanation into one report and publishes a domain event", async () => {
    const eventPublisher = new RecordingEventPublisher();
    const service = new SignalIntelligenceReportService(
      new SignalQualityService(),
      new SignalExplanationService(),
      new FixedClock(),
      new SequentialIdGenerator(),
      eventPublisher,
    );

    const opportunity = buildOpportunity({ direction: "BUY", symbolCode: "EURUSD" });
    const report = await service.generate(opportunity);

    expect(report.opportunityId).toBe(opportunity.id);
    expect(report.narrative).toContain("BUY");
    expect(eventPublisher.published.some((e) => e.kind === "SignalQualityAssessed")).toBe(true);
  });

  it("integrates with a REAL, unmodified @rmsm/ai-memory MemoryService + HeuristicSummarizer: condenses the report narrative and persists it as a retrievable SEMANTIC memory", async () => {
    const memoryRepository = new InMemoryMemoryProvider();
    const memoryService = new MemoryService(memoryRepository);
    const summarizer = new HeuristicSummarizer();

    const service = new SignalIntelligenceReportService(
      new SignalQualityService(),
      new SignalExplanationService(),
      new FixedClock(),
      new SequentialIdGenerator(),
      undefined,
      summarizer,
      memoryService,
    );

    const opportunity = buildOpportunity({ id: "opp-memory-test", symbolCode: "GBPUSD" });
    const report = await service.generate(opportunity);

    const result = await memoryRepository.query({ tags: ["signal-intelligence"] });
    const persisted = result.entries.find((entry) => entry.content === report.narrative);

    expect(persisted).toBeDefined();
    expect(persisted?.metadata.tags).toContain("opp-memory-test");
    expect(persisted?.metadata.source).toBe("ai-signal-intelligence");
  });
});
