import { describe, expect, it } from "vitest";
import { SystemClock } from "@rmsm/core";
import {
  ResearchPlanner,
  EvidenceCollector,
  ResearchReportBuilder,
  EvidenceRankingService,
  InMemoryResearchPlanRepository,
  StubSearchProvider,
} from "@rmsm/ai-research";
import { HeuristicSummarizer } from "@rmsm/ai-memory";
import { ResearchAssistanceService } from "../services/research-assistance.service";
import { SequentialIdGenerator } from "./fakes";

describe("ResearchAssistanceService", () => {
  it("orchestrates the REAL, unmodified AI-303 planner -> evidence collector -> report builder pipeline end to end", async () => {
    const repository = new InMemoryResearchPlanRepository();
    const searchProvider = new StubSearchProvider();
    searchProvider.seed("What is EURUSD's current trend?", [
      { source: { id: "src-1", title: "EURUSD Market Report", url: "https://example.com/eurusd" }, snippet: "EURUSD has been trending upward for three sessions." },
    ]);

    const idGenerator = new SequentialIdGenerator();
    const clock = new SystemClock();

    const planner = new ResearchPlanner(repository, clock, idGenerator);
    const evidenceCollector = new EvidenceCollector(repository, searchProvider, clock, idGenerator);
    const reportBuilder = new ResearchReportBuilder(new HeuristicSummarizer(), new EvidenceRankingService(), clock, idGenerator);

    const service = new ResearchAssistanceService();
    const result = await service.research({ planner, evidenceCollector, reportBuilder }, "EURUSD outlook", ["What is EURUSD's current trend?"]);

    expect(result.topic).toBe("EURUSD outlook");
    expect(result.citationCount).toBeGreaterThan(0);
    expect(result.reportNarrative.length).toBeGreaterThan(0);
  });
});
