import { describe, expect, it } from "vitest";
import {
  DefaultStepHandlerRegistry,
  InMemoryWorkflowExecutionRepository,
  InMemoryEventPublisher as WorkflowInMemoryEventPublisher,
} from "@rmsm/ai-workflows";
import type { WorkflowDefinition } from "@rmsm/ai-workflows";
import { AgentWorkflowRunner } from "../services/agent-workflow-runner.service";
import { InMemoryCheckpointRepository } from "../../infrastructure/in-memory-checkpoint.repository";
import { RunStatus } from "../../domain/enums/run.enum";
import { RunNotFoundError, RunNotRetryableError } from "../../domain/errors/agent-workflow-domain.errors";
import { SystemLikeClock, SequentialIdGenerator, RecordingEventPublisher, waitUntil } from "./fakes";

function buildRunner(eventPublisher?: RecordingEventPublisher) {
  const handlerRegistry = new DefaultStepHandlerRegistry();
  const executionRepository = new InMemoryWorkflowExecutionRepository();
  const workflowEventPublisher = new WorkflowInMemoryEventPublisher();
  const checkpointRepository = new InMemoryCheckpointRepository();
  const runner = new AgentWorkflowRunner(
    handlerRegistry,
    executionRepository,
    workflowEventPublisher,
    checkpointRepository,
    new SystemLikeClock(),
    new SequentialIdGenerator(),
    eventPublisher,
  );
  return { runner, handlerRegistry, checkpointRepository };
}

const sequentialDefinition: WorkflowDefinition = {
  id: "wf-1",
  name: "two-step workflow",
  steps: [
    { id: "step1", handlerName: "step1-handler" },
    { id: "step2", handlerName: "step2-handler", dependsOn: ["step1"] },
  ],
};

describe("AgentWorkflowRunner", () => {
  it("runs a workflow in the background, checkpointing each step, and completes", async () => {
    const events = new RecordingEventPublisher();
    const { runner, handlerRegistry } = buildRunner(events);
    handlerRegistry.register("step1-handler", async () => "a");
    handlerRegistry.register("step2-handler", async () => "b");

    const runId = await runner.runAsync(sequentialDefinition, { go: true });

    const initial = await runner.getState(runId);
    expect(initial.status).toBe(RunStatus.RUNNING);

    await waitUntil(async () => (await runner.getState(runId)).status !== RunStatus.RUNNING);

    const final = await runner.getState(runId);
    expect(final.status).toBe(RunStatus.COMPLETED);
    expect(final.completedStepIds).toEqual(["step1", "step2"]);

    const kinds = events.published.map((e) => e.kind);
    expect(kinds[0]).toBe("WorkflowRunStarted");
    expect(kinds).toContain("WorkflowCheckpointed");
    expect(kinds[kinds.length - 1]).toBe("WorkflowRunCompleted");
  });

  it("marks a run FAILED when a step handler throws, and supports retry", async () => {
    const { runner, handlerRegistry } = buildRunner();
    let attempt = 0;
    handlerRegistry.register("step1-handler", async () => {
      attempt += 1;
      if (attempt === 1) throw new Error("boom");
      return "recovered";
    });
    handlerRegistry.register("step2-handler", async () => "b");

    const runId = await runner.runAsync(sequentialDefinition, {});
    await waitUntil(async () => (await runner.getState(runId)).status !== RunStatus.RUNNING);
    expect((await runner.getState(runId)).status).toBe(RunStatus.FAILED);

    const retryRunId = await runner.retry(runId, sequentialDefinition, {});
    await waitUntil(async () => (await runner.getState(retryRunId)).status !== RunStatus.RUNNING);

    const retryState = await runner.getState(retryRunId);
    expect(retryState.status).toBe(RunStatus.COMPLETED);
    expect(retryState.retriedFromRunId).toBe(runId);
  });

  it("throws RunNotRetryableError when retrying a run that is not FAILED", async () => {
    const { runner, handlerRegistry } = buildRunner();
    handlerRegistry.register("step1-handler", async () => "a");
    handlerRegistry.register("step2-handler", async () => "b");

    const runId = await runner.runAsync(sequentialDefinition, {});
    await waitUntil(async () => (await runner.getState(runId)).status !== RunStatus.RUNNING);
    expect((await runner.getState(runId)).status).toBe(RunStatus.COMPLETED);

    await expect(runner.retry(runId, sequentialDefinition, {})).rejects.toThrow(RunNotRetryableError);
  });

  it("cancels a run in progress, stopping downstream steps at the next wave boundary", async () => {
    const { runner, handlerRegistry } = buildRunner();
    handlerRegistry.register("step1-handler", async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return "a";
    });
    handlerRegistry.register("step2-handler", async () => "b");

    const runId = await runner.runAsync(sequentialDefinition, {});
    // Let step1's handler actually start (and begin its 20ms delay)
    // before cancelling — cancelling too early would catch step1 itself
    // at its own pre-attempt cancellation check, before its handler ever
    // runs, which isn't what this test means to exercise.
    await new Promise((resolve) => setTimeout(resolve, 5));
    await runner.cancel(runId);

    await waitUntil(async () => (await runner.getState(runId)).status !== RunStatus.RUNNING);

    const final = await runner.getState(runId);
    expect(final.status).toBe(RunStatus.CANCELLED);
    expect(final.completedStepIds).toEqual(["step1"]);
  });

  it("throws RunNotFoundError for getState/cancel on an unknown runId", async () => {
    const { runner } = buildRunner();
    await expect(runner.getState("missing")).rejects.toThrow(RunNotFoundError);
    await expect(runner.cancel("missing")).rejects.toThrow(RunNotFoundError);
  });

  it("runSync runs a workflow synchronously to completion, with no checkpoint created", async () => {
    const { runner, handlerRegistry, checkpointRepository } = buildRunner();
    handlerRegistry.register("step1-handler", async () => "a");
    handlerRegistry.register("step2-handler", async () => "b");

    const execution = await runner.runSync(sequentialDefinition, {});
    expect(execution.stepResults).toHaveLength(2);
    expect(await checkpointRepository.findById(execution.id)).toBeNull();
  });
});
