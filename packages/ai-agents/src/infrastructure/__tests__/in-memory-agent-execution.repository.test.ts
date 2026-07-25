import { describe, it, expect } from "vitest";
import { InMemoryAgentExecutionRepository } from "../in-memory-agent-execution.repository";
import { AgentStatus } from "../../domain/enums/agent.enum";

describe("InMemoryAgentExecutionRepository", () => {
  it("saves and finds an execution state by id", async () => {
    const repository = new InMemoryAgentExecutionRepository();
    const state = { executionId: "e1", agentId: "a1", status: AgentStatus.RUNNING, currentStepIndex: 0, startedAt: new Date(), completedAt: null };
    await repository.save(state);
    expect(await repository.findById("e1")).toEqual(state);
  });

  it("returns null for a missing execution", async () => {
    expect(await new InMemoryAgentExecutionRepository().findById("missing")).toBeNull();
  });
});
