import { describe, it, expect } from "vitest";
import { WorkflowEngine } from "../services/workflow-engine.service";
import { DefaultStepHandlerRegistry } from "../../infrastructure/default-step-handler.registry";
import { InMemoryWorkflowExecutionRepository } from "../../infrastructure/in-memory-workflow-execution.repository";
import { SimpleCancellationToken } from "../../infrastructure/simple-cancellation.token";
import { StepStatus, WorkflowStatus } from "../../domain/enums/workflow.enum";
import { StepHandlerNotFoundError, CyclicWorkflowError, UnknownStepDependencyError } from "../../domain/errors/workflow-domain.errors";
import { SystemLikeClock, SequentialIdGenerator, RecordingEventPublisher } from "./fakes";
import type { WorkflowDefinition } from "../../domain/entities/workflow-definition.entity";

function makeEngine(registry: DefaultStepHandlerRegistry, events?: RecordingEventPublisher) {
  return new WorkflowEngine(registry, new InMemoryWorkflowExecutionRepository(), new SystemLikeClock(), new SequentialIdGenerator(), events);
}

describe("WorkflowEngine", () => {
  it("runs a linear chain in dependency order, threading each step's output into the next via context.results", async () => {
    const registry = new DefaultStepHandlerRegistry();
    registry.register("double", async (input) => (input as number) * 2);
    registry.register("addOne", async (_input, context) => (context.results["step1"] as number) + 1);

    const definition: WorkflowDefinition = {
      id: "wf1",
      name: "chain",
      steps: [
        { id: "step1", handlerName: "double" },
        { id: "step2", handlerName: "addOne", dependsOn: ["step1"] },
      ],
    };

    const execution = await makeEngine(registry).run(definition, 5);

    expect(execution.status).toBe(WorkflowStatus.COMPLETED);
    expect(execution.stepResults.find((r) => r.stepId === "step1")?.output).toBe(10);
    expect(execution.stepResults.find((r) => r.stepId === "step2")?.output).toBe(11);
  });

  it("runs independent steps in the same wave concurrently", async () => {
    const registry = new DefaultStepHandlerRegistry();
    const order: string[] = [];
    registry.register("slow", async () => {
      order.push("slow-start");
      await new Promise((resolve) => setTimeout(resolve, 20));
      order.push("slow-end");
      return "slow";
    });
    registry.register("fast", async () => {
      order.push("fast-start");
      return "fast";
    });

    const definition: WorkflowDefinition = {
      id: "wf2",
      name: "parallel",
      steps: [
        { id: "a", handlerName: "slow" },
        { id: "b", handlerName: "fast" },
      ],
    };

    await makeEngine(registry).run(definition, null);

    // Both started before the slow one finished — proves they ran concurrently, not sequentially.
    expect(order.indexOf("fast-start")).toBeLessThan(order.indexOf("slow-end"));
  });

  it("skips a step whose condition returns false, and skips its downstream dependents", async () => {
    const registry = new DefaultStepHandlerRegistry();
    registry.register("noop", async () => "ran");

    const definition: WorkflowDefinition = {
      id: "wf3",
      name: "conditional",
      steps: [
        { id: "gate", handlerName: "noop", condition: () => false },
        { id: "downstream", handlerName: "noop", dependsOn: ["gate"] },
      ],
    };

    const execution = await makeEngine(registry).run(definition, null);

    expect(execution.stepResults.find((r) => r.stepId === "gate")?.status).toBe(StepStatus.SKIPPED);
    expect(execution.stepResults.find((r) => r.stepId === "downstream")?.status).toBe(StepStatus.SKIPPED);
  });

  it("retries a failing step up to maxAttempts and succeeds on the last try", async () => {
    const registry = new DefaultStepHandlerRegistry();
    let attempts = 0;
    registry.register("flaky", async () => {
      attempts += 1;
      if (attempts < 3) throw new Error("not yet");
      return "ok";
    });
    const events = new RecordingEventPublisher();

    const definition: WorkflowDefinition = {
      id: "wf4",
      name: "retry",
      steps: [{ id: "s1", handlerName: "flaky", retry: { maxAttempts: 3 } }],
    };

    const execution = await makeEngine(registry, events).run(definition, null);

    expect(execution.stepResults[0]?.status).toBe(StepStatus.SUCCEEDED);
    expect(execution.stepResults[0]?.attempts).toBe(3);
    expect(events.published.filter((e) => e.kind === "StepRetried")).toHaveLength(2);
  });

  it("marks a step FAILED and the workflow FAILED after exhausting retries", async () => {
    const registry = new DefaultStepHandlerRegistry();
    registry.register("alwaysFails", async () => {
      throw new Error("boom");
    });

    const definition: WorkflowDefinition = {
      id: "wf5",
      name: "always-fails",
      steps: [{ id: "s1", handlerName: "alwaysFails", retry: { maxAttempts: 2 } }],
    };

    const execution = await makeEngine(registry).run(definition, null);

    expect(execution.stepResults[0]?.status).toBe(StepStatus.FAILED);
    expect(execution.stepResults[0]?.error).toBe("boom");
    expect(execution.status).toBe(WorkflowStatus.FAILED);
  });

  it("times out a step that exceeds timeoutMs", async () => {
    const registry = new DefaultStepHandlerRegistry();
    registry.register("hangs", () => new Promise(() => {})); // never resolves

    const definition: WorkflowDefinition = {
      id: "wf6",
      name: "timeout",
      steps: [{ id: "s1", handlerName: "hangs", timeoutMs: 20 }],
    };

    const execution = await makeEngine(registry).run(definition, null);

    expect(execution.stepResults[0]?.status).toBe(StepStatus.TIMED_OUT);
  });

  it("cancels remaining waves once the CancellationToken is triggered", async () => {
    const registry = new DefaultStepHandlerRegistry();
    const token = new SimpleCancellationToken();
    registry.register("cancelThenRun", async () => {
      token.cancel();
      return "first wave done";
    });
    registry.register("shouldNotRun", async () => "should not run");

    const definition: WorkflowDefinition = {
      id: "wf7",
      name: "cancellation",
      steps: [
        { id: "a", handlerName: "cancelThenRun" },
        { id: "b", handlerName: "shouldNotRun", dependsOn: ["a"] },
      ],
    };

    const execution = await makeEngine(registry).run(definition, null, token);

    expect(execution.stepResults.find((r) => r.stepId === "a")?.status).toBe(StepStatus.SUCCEEDED);
    expect(execution.stepResults.find((r) => r.stepId === "b")?.status).toBe(StepStatus.CANCELLED);
    expect(execution.status).toBe(WorkflowStatus.CANCELLED);
  });

  it("persists the full execution history via WorkflowExecutionRepository", async () => {
    const registry = new DefaultStepHandlerRegistry();
    registry.register("noop", async () => "done");
    const repository = new InMemoryWorkflowExecutionRepository();
    const engine = new WorkflowEngine(registry, repository, new SystemLikeClock(), new SequentialIdGenerator());

    const definition: WorkflowDefinition = { id: "wf8", name: "history", steps: [{ id: "s1", handlerName: "noop" }] };
    const execution = await engine.run(definition, null);

    expect(await repository.findById(execution.id)).toEqual(execution);
  });

  it("publishes WorkflowStarted and a terminal WorkflowCompleted event", async () => {
    const registry = new DefaultStepHandlerRegistry();
    registry.register("noop", async () => "done");
    const events = new RecordingEventPublisher();

    const definition: WorkflowDefinition = { id: "wf9", name: "events", steps: [{ id: "s1", handlerName: "noop" }] };
    await makeEngine(registry, events).run(definition, null);

    expect(events.published[0]?.kind).toBe("WorkflowStarted");
    expect(events.published[events.published.length - 1]?.kind).toBe("WorkflowCompleted");
  });

  it("throws StepHandlerNotFoundError when a step's handlerName isn't registered", async () => {
    const registry = new DefaultStepHandlerRegistry();
    const definition: WorkflowDefinition = { id: "wf10", name: "missing-handler", steps: [{ id: "s1", handlerName: "missing" }] };

    await expect(makeEngine(registry).run(definition, null)).rejects.toThrow(StepHandlerNotFoundError);
  });

  it("throws UnknownStepDependencyError when a step depends on an undeclared step id", async () => {
    const registry = new DefaultStepHandlerRegistry();
    registry.register("noop", async () => "done");
    const definition: WorkflowDefinition = { id: "wf11", name: "bad-dep", steps: [{ id: "s1", handlerName: "noop", dependsOn: ["ghost"] }] };

    await expect(makeEngine(registry).run(definition, null)).rejects.toThrow(UnknownStepDependencyError);
  });

  it("throws CyclicWorkflowError for a workflow whose steps depend on each other cyclically", async () => {
    const registry = new DefaultStepHandlerRegistry();
    registry.register("noop", async () => "done");
    const definition: WorkflowDefinition = {
      id: "wf12",
      name: "cyclic",
      steps: [
        { id: "a", handlerName: "noop", dependsOn: ["b"] },
        { id: "b", handlerName: "noop", dependsOn: ["a"] },
      ],
    };

    await expect(makeEngine(registry).run(definition, null)).rejects.toThrow(CyclicWorkflowError);
  });
});
