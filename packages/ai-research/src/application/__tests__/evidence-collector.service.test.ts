import { describe, it, expect, beforeEach } from "vitest";
import { ResearchPlanner } from "../services/research-planner.service";
import { EvidenceCollector } from "../services/evidence-collector.service";
import { InMemoryResearchPlanRepository } from "../../infrastructure/in-memory-research-plan.repository";
import { StubSearchProvider } from "../../infrastructure/stub-search.provider";
import { ResearchPlanNotFoundError } from "../../domain/errors/research-domain.errors";
import { ResearchPlanStatus, ResearchStepStatus } from "../../domain/enums/research.enum";
import { FixedClock, SequentialIdGenerator, RecordingEventPublisher } from "./fakes";

describe("EvidenceCollector", () => {
  let repository: InMemoryResearchPlanRepository;
  let searchProvider: StubSearchProvider;
  let events: RecordingEventPublisher;
  let collector: EvidenceCollector;
  let planner: ResearchPlanner;

  beforeEach(() => {
    repository = new InMemoryResearchPlanRepository();
    searchProvider = new StubSearchProvider();
    events = new RecordingEventPublisher();
    const clock = new FixedClock(new Date("2026-01-01T00:00:00.000Z"));
    planner = new ResearchPlanner(repository, clock, new SequentialIdGenerator());
    collector = new EvidenceCollector(repository, searchProvider, clock, new SequentialIdGenerator(), events);
  });

  it("collects evidence for every step and marks the plan RUNNING", async () => {
    const plan = await planner.createPlan("cats", ["diet", "lifespan"]);
    searchProvider.seed("diet", [{ source: { id: "s1", title: "Cat Diet" }, snippet: "Cats eat meat." }]);
    searchProvider.seed("lifespan", [{ source: { id: "s2", title: "Cat Lifespan" }, snippet: "Cats live 15 years." }]);

    const evidence = await collector.collectForPlan(plan.id);

    expect(evidence).toHaveLength(2);
    const updated = await repository.findById(plan.id);
    expect(updated?.status).toBe(ResearchPlanStatus.RUNNING);
    expect(updated?.steps.every((s) => s.status === ResearchStepStatus.COMPLETED)).toBe(true);
    expect(events.published.map((e) => e.kind)).toEqual(["EvidenceCollected", "EvidenceCollected"]);
  });

  it("throws ResearchPlanNotFoundError for an unknown plan", async () => {
    await expect(collector.collectForPlan("missing")).rejects.toThrow(ResearchPlanNotFoundError);
  });
});
