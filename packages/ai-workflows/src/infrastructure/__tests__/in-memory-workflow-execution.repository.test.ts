import { describe, it, expect } from "vitest";
import { InMemoryWorkflowExecutionRepository } from "../in-memory-workflow-execution.repository";
import { WorkflowStatus } from "../../domain/enums/workflow.enum";

describe("InMemoryWorkflowExecutionRepository", () => {
  it("saves and finds an execution by id", async () => {
    const repository = new InMemoryWorkflowExecutionRepository();
    const execution = { id: "e1", workflowId: "wf1", status: WorkflowStatus.COMPLETED, stepResults: [], startedAt: new Date(), completedAt: new Date() };
    await repository.save(execution);
    expect(await repository.findById("e1")).toEqual(execution);
  });

  it("returns null for a missing execution", async () => {
    const repository = new InMemoryWorkflowExecutionRepository();
    expect(await repository.findById("missing")).toBeNull();
  });
});
