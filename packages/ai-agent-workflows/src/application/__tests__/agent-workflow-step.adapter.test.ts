import { describe, expect, it } from "vitest";
import { DefaultStepHandlerRegistry, InMemoryWorkflowExecutionRepository, InMemoryEventPublisher as WorkflowInMemoryEventPublisher } from "@rmsm/ai-workflows";
import type { WorkflowDefinition } from "@rmsm/ai-workflows";
import type { AgentContext } from "@rmsm/ai-agents";
import { AgentWorkflowRunner } from "../services/agent-workflow-runner.service";
import { createWorkflowStepFn } from "../services/agent-workflow-step.adapter";
import { InMemoryCheckpointRepository } from "../../infrastructure/in-memory-checkpoint.repository";
import { SystemLikeClock, SequentialIdGenerator } from "./fakes";

describe("createWorkflowStepFn (agents may execute workflows)", () => {
  it("produces an AI-401-compatible StepFn that runs the workflow using the agent's variables as input", async () => {
    const handlerRegistry = new DefaultStepHandlerRegistry();
    handlerRegistry.register("summarize", async (input) => `summary of: ${JSON.stringify(input)}`);

    const runner = new AgentWorkflowRunner(
      handlerRegistry,
      new InMemoryWorkflowExecutionRepository(),
      new WorkflowInMemoryEventPublisher(),
      new InMemoryCheckpointRepository(),
      new SystemLikeClock(),
      new SequentialIdGenerator(),
    );

    const definition: WorkflowDefinition = { id: "wf-summarize", name: "summarize", steps: [{ id: "s1", handlerName: "summarize" }] };
    const stepFn = createWorkflowStepFn(runner, definition);

    const context: AgentContext = { agentId: "agent-1", sessionId: null, goals: [], variables: { document: "quarterly report" } };
    const output = await stepFn(context, []);

    const execution = output as { status: string; stepResults: readonly { output?: unknown }[] };
    expect(execution.status).toBe("completed");
    expect(execution.stepResults[0]?.output).toBe('summary of: {"document":"quarterly report"}');
  });
});
