import { describe, it, expect, beforeEach } from "vitest";
import { ResearchPlanner } from "../services/research-planner.service";
import { InMemoryResearchPlanRepository } from "../../infrastructure/in-memory-research-plan.repository";
import { InvalidResearchQueryError } from "../../domain/errors/research-domain.errors";
import { ResearchPlanStatus } from "../../domain/enums/research.enum";
import { FixedClock, SequentialIdGenerator, RecordingEventPublisher } from "./fakes";

describe("ResearchPlanner", () => {
  let repository: InMemoryResearchPlanRepository;
  let events: RecordingEventPublisher;
  let planner: ResearchPlanner;

  beforeEach(() => {
    repository = new InMemoryResearchPlanRepository();
    events = new RecordingEventPublisher();
    planner = new ResearchPlanner(repository, new FixedClock(new Date("2026-01-01T00:00:00.000Z")), new SequentialIdGenerator(), events);
  });

  it("creates a plan with one step per sub-query and publishes ResearchPlanCreated", async () => {
    const plan = await planner.createPlan("cats", ["what do cats eat", "how long do cats live"]);

    expect(plan.status).toBe(ResearchPlanStatus.DRAFT);
    expect(plan.steps).toHaveLength(2);
    expect(await repository.findById(plan.id)).toEqual(plan);
    expect(events.published.map((e) => e.kind)).toEqual(["ResearchPlanCreated"]);
  });

  it("rejects an empty topic", async () => {
    await expect(planner.createPlan("   ", ["q1"])).rejects.toThrow(InvalidResearchQueryError);
  });

  it("rejects a plan with no non-empty sub-queries", async () => {
    await expect(planner.createPlan("cats", ["   ", ""])).rejects.toThrow(InvalidResearchQueryError);
  });
});
