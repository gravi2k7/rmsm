import { describe, it, expect } from "vitest";
import { InMemoryResearchPlanRepository } from "../in-memory-research-plan.repository";
import { ResearchPlanStatus } from "../../domain/enums/research.enum";

describe("InMemoryResearchPlanRepository", () => {
  it("saves and finds a plan by id", async () => {
    const repository = new InMemoryResearchPlanRepository();
    const plan = { id: "p1", topic: "cats", status: ResearchPlanStatus.DRAFT, steps: [], createdAt: new Date() };
    await repository.save(plan);
    expect(await repository.findById("p1")).toEqual(plan);
  });

  it("returns null for a missing plan", async () => {
    const repository = new InMemoryResearchPlanRepository();
    expect(await repository.findById("missing")).toBeNull();
  });
});
