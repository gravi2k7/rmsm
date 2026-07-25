import { describe, it, expect, beforeEach } from "vitest";
import { HeuristicSummarizer } from "@rmsm/ai-memory";
import { ResearchReportBuilder } from "../services/research-report-builder.service";
import { EvidenceRankingService } from "../services/evidence-ranking.service";
import { FixedClock, SequentialIdGenerator, RecordingEventPublisher } from "./fakes";
import type { Evidence } from "../../domain/entities/evidence.entity";

describe("ResearchReportBuilder", () => {
  let events: RecordingEventPublisher;
  let builder: ResearchReportBuilder;

  beforeEach(() => {
    events = new RecordingEventPublisher();
    builder = new ResearchReportBuilder(
      new HeuristicSummarizer(),
      new EvidenceRankingService(),
      new FixedClock(new Date("2026-01-01T00:00:00.000Z")),
      new SequentialIdGenerator(),
      events,
    );
  });

  it("builds a report summarizing ranked evidence using @rmsm/ai-memory's real HeuristicSummarizer, with one citation per evidence item", async () => {
    const evidence: readonly Evidence[] = [
      { id: "e1", stepId: "s1", source: { id: "src1", title: "Cat Diet", url: "https://example.com/diet" }, excerpt: "Cats eat meat.", relevanceScore: 0.5 },
      { id: "e2", stepId: "s1", source: { id: "src2", title: "Cat Lifespan" }, excerpt: "Cats live long lives.", relevanceScore: 0.9 },
    ];

    const report = await builder.build("plan-1", evidence);

    expect(report.planId).toBe("plan-1");
    expect(report.summary.length).toBeGreaterThan(0);
    expect(report.citations).toHaveLength(2);
    expect(report.citations[0]?.evidenceId).toBe("e2"); // ranked highest-relevance first
    expect(report.citations.find((c) => c.evidenceId === "e1")?.locator).toBe("https://example.com/diet");
    expect(report.citations.find((c) => c.evidenceId === "e2")?.locator).toBe("src2"); // falls back to source id when no url

    expect(events.published.map((e) => e.kind)).toEqual(["ResearchSummarized", "ResearchCompleted"]);
  });
});
