import { describe, expect, it } from "vitest";
import { MemoryService, HeuristicSummarizer, InMemoryMemoryProvider } from "@rmsm/ai-memory";
import { PortfolioSummaryService } from "../services/portfolio-summary.service";
import { PortfolioHealthVerdict, DiversificationLevel } from "../../domain/enums/portfolio-intelligence.enum";
import { buildPortfolio, FixedClock, RecordingEventPublisher, SequentialIdGenerator } from "./fakes";

const health = { portfolioId: "p1", verdict: PortfolioHealthVerdict.HEALTHY, reasons: ["All health checks passed."] };
const diversification = { portfolioId: "p1", level: DiversificationLevel.WELL_DIVERSIFIED, herfindahlIndex: 0.1, reason: "Exposure is spread broadly across symbols." };

describe("PortfolioSummaryService", () => {
  it("composes health + diversification into one narrative and publishes a domain event", async () => {
    const eventPublisher = new RecordingEventPublisher();
    const service = new PortfolioSummaryService(new FixedClock(), new SequentialIdGenerator(), eventPublisher);

    const portfolio = buildPortfolio("p1", 100_000);
    const summary = await service.generate(portfolio, health, diversification);

    expect(summary.portfolioId).toBe("p1");
    expect(summary.narrative).toContain("HEALTHY");
    expect(eventPublisher.published.some((e) => e.kind === "PortfolioHealthAssessed")).toBe(true);
  });

  it("integrates with a REAL, unmodified @rmsm/ai-memory MemoryService + HeuristicSummarizer: condenses the narrative and persists it as a retrievable SEMANTIC memory", async () => {
    const memoryRepository = new InMemoryMemoryProvider();
    const memoryService = new MemoryService(memoryRepository);
    const summarizer = new HeuristicSummarizer();

    const service = new PortfolioSummaryService(new FixedClock(), new SequentialIdGenerator(), undefined, summarizer, memoryService);
    const portfolio = buildPortfolio("p-memory-test", 100_000);
    const summary = await service.generate(portfolio, { ...health, portfolioId: "p-memory-test" }, diversification);

    const result = await memoryRepository.query({ tags: ["portfolio-intelligence"] });
    const persisted = result.entries.find((entry) => entry.content === summary.narrative);

    expect(persisted).toBeDefined();
    expect(persisted?.metadata.tags).toContain("p-memory-test");
    expect(persisted?.metadata.source).toBe("ai-portfolio-intelligence");
  });
});
