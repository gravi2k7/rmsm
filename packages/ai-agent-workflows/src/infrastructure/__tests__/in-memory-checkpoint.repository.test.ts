import { describe, expect, it } from "vitest";
import { InMemoryCheckpointRepository } from "../in-memory-checkpoint.repository";
import { RunStatus } from "../../domain/enums/run.enum";
import type { WorkflowRunState } from "../../domain/entities/workflow-run-state.entity";

describe("InMemoryCheckpointRepository", () => {
  it("saves and retrieves run state by runId", async () => {
    const repo = new InMemoryCheckpointRepository();
    const state: WorkflowRunState = {
      runId: "run-1",
      workflowId: "wf-1",
      status: RunStatus.RUNNING,
      completedStepIds: [],
      failedStepIds: [],
      startedAt: new Date(),
      updatedAt: new Date(),
    };
    await repo.save(state);
    expect((await repo.findById("run-1"))?.status).toBe(RunStatus.RUNNING);
  });

  it("returns null for an unknown runId", async () => {
    const repo = new InMemoryCheckpointRepository();
    expect(await repo.findById("missing")).toBeNull();
  });
});
