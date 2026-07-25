import { describe, expect, it } from "vitest";
import { SequentialGoalDecomposer } from "../sequential-goal.decomposer";
import { EmptyGoalError } from "../../domain/errors/planning-domain.errors";

describe("SequentialGoalDecomposer", () => {
  const decomposer = new SequentialGoalDecomposer();

  it("splits a multi-clause goal into a sequential task chain", async () => {
    const tasks = await decomposer.decompose("goal-1", "Gather requirements. Draft the design. Then implement it.");
    expect(tasks).toHaveLength(3);
    expect(tasks[0]?.dependsOn).toEqual([]);
    expect(tasks[1]?.dependsOn).toEqual([tasks[0]?.id]);
    expect(tasks[2]?.dependsOn).toEqual([tasks[1]?.id]);
  });

  it("produces a single task for a single-clause goal", async () => {
    const tasks = await decomposer.decompose("goal-2", "Write the report");
    expect(tasks).toHaveLength(1);
    expect(tasks[0]?.dependsOn).toEqual([]);
  });

  it("rejects an empty goal description", async () => {
    await expect(decomposer.decompose("goal-3", "   ")).rejects.toThrow(EmptyGoalError);
  });
});
