import type { Clock, IdGenerator } from "@rmsm/core";
import {
  WorkflowEngine,
  WorkflowStatus,
  SimpleCancellationToken,
} from "@rmsm/ai-workflows";
import type {
  WorkflowDefinition,
  WorkflowExecution,
  StepHandlerRegistry,
  WorkflowExecutionRepository,
  CancellationToken as WorkflowCancellationToken,
  WorkflowDomainEvent,
  InMemoryEventPublisher as WorkflowEnginePublisher,
} from "@rmsm/ai-workflows";
import { RunStatus } from "../../domain/enums/run.enum";
import type { WorkflowRunState } from "../../domain/entities/workflow-run-state.entity";
import { RunNotFoundError, RunNotRetryableError } from "../../domain/errors/agent-workflow-domain.errors";
import type { CheckpointRepository } from "../../repositories/checkpoint-repository.interface";
import { RunIdSeededIdGenerator } from "../../infrastructure/run-id-seeded-id.generator";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type {
  WorkflowRunStartedEvent,
  WorkflowCheckpointedEvent,
  WorkflowRunCompletedEvent,
  WorkflowRunFailedEvent,
  WorkflowRunCancelledEvent,
  WorkflowRunRetriedEvent,
} from "../../events/agent-workflow-domain-events.interface";

/**
 * AI-406's core service: wraps AI-310's `WorkflowEngine` to add
 * long-running execution, pollable workflow state, event-driven
 * checkpointing, workflow-level retry, and cancellation — WITHOUT
 * reimplementing DAG resolution, per-step retry, timeouts, or
 * cancellation checks, all of which stay exactly where AI-310 already
 * built them. Every `runAsync` call constructs its own `WorkflowEngine`
 * over a `RunIdSeededIdGenerator` so AI-310's own `executionId`
 * deterministically equals this run's `runId` — the correlation this
 * class needs to attribute AI-310's events to the right checkpoint,
 * with no shared mutable state and no event-ordering race across
 * concurrent runs.
 */
export class AgentWorkflowRunner {
  private readonly cancellationTokens = new Map<string, SimpleCancellationToken>();

  constructor(
    private readonly handlerRegistry: StepHandlerRegistry,
    private readonly executionRepository: WorkflowExecutionRepository,
    private readonly workflowEventPublisher: WorkflowEnginePublisher,
    private readonly checkpointRepository: CheckpointRepository,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly eventPublisher?: EventPublisher,
  ) {
    this.workflowEventPublisher.subscribe((event) => {
      void this.handleWorkflowEvent(event);
    });
  }

  /** "Long-running execution": starts the workflow in the background
   * and returns its `runId` immediately; poll `getState()` for
   * progress. */
  async runAsync(definition: WorkflowDefinition, input: unknown, retriedFromRunId?: string): Promise<string> {
    const runId = this.idGenerator.generate();
    const now = this.clock.now();

    const initialState: WorkflowRunState = {
      runId,
      workflowId: definition.id,
      status: RunStatus.RUNNING,
      completedStepIds: [],
      failedStepIds: [],
      retriedFromRunId,
      startedAt: now,
      updatedAt: now,
    };
    await this.checkpointRepository.save(initialState);

    const startedEvent: WorkflowRunStartedEvent = {
      eventId: this.idGenerator.generate(),
      kind: "WorkflowRunStarted",
      occurredAt: now,
      aggregateId: runId,
      runId,
      workflowId: definition.id,
    };
    await this.publish([startedEvent]);

    const cancellationToken = new SimpleCancellationToken();
    this.cancellationTokens.set(runId, cancellationToken);

    const seededIdGenerator = new RunIdSeededIdGenerator(runId, this.idGenerator);
    const engine = new WorkflowEngine(this.handlerRegistry, this.executionRepository, this.clock, seededIdGenerator, this.workflowEventPublisher);

    void engine
      .run(definition, input, cancellationToken)
      .then((execution) => this.finalize(runId, execution))
      .catch((error: unknown) => this.finalizeOnError(runId, error));

    return runId;
  }

  /** "Agents may execute workflows": a synchronous run with no
   * checkpointing overhead, meant to be called from inside an AI-401
   * reasoning step (see `createWorkflowStepFn`). */
  async runSync(definition: WorkflowDefinition, input: unknown, cancellationToken?: WorkflowCancellationToken): Promise<WorkflowExecution> {
    const engine = new WorkflowEngine(this.handlerRegistry, this.executionRepository, this.clock, this.idGenerator, this.workflowEventPublisher);
    return engine.run(definition, input, cancellationToken);
  }

  async getState(runId: string): Promise<WorkflowRunState> {
    const state = await this.checkpointRepository.findById(runId);
    if (!state) {
      throw new RunNotFoundError(runId);
    }
    return state;
  }

  /** "Cancellation": stops the underlying `WorkflowEngine.run()` at
   * its next wave boundary, via the exact `CancellationToken` port AI-
   * 310 already checks — this class never reimplements the check
   * itself. */
  async cancel(runId: string): Promise<void> {
    const token = this.cancellationTokens.get(runId);
    if (!token) {
      throw new RunNotFoundError(runId);
    }
    token.cancel();
  }

  /** "Retry": re-runs the same definition/input as a brand-new run,
   * linked back to the failed one via `retriedFromRunId`. Only a
   * `FAILED` run is retryable. */
  async retry(runId: string, definition: WorkflowDefinition, input: unknown): Promise<string> {
    const state = await this.getState(runId);
    if (state.status !== RunStatus.FAILED) {
      throw new RunNotRetryableError(runId, state.status);
    }

    const newRunId = await this.runAsync(definition, input, runId);

    const event: WorkflowRunRetriedEvent = {
      eventId: this.idGenerator.generate(),
      kind: "WorkflowRunRetried",
      occurredAt: this.clock.now(),
      aggregateId: newRunId,
      originalRunId: runId,
      newRunId,
    };
    await this.publish([event]);

    return newRunId;
  }

  private async handleWorkflowEvent(event: WorkflowDomainEvent): Promise<void> {
    if (event.kind !== "StepSucceeded" && event.kind !== "StepFailed" && event.kind !== "StepTimedOut") {
      return;
    }

    const state = await this.checkpointRepository.findById(event.executionId);
    if (!state) {
      return;
    }

    const updated: WorkflowRunState =
      event.kind === "StepSucceeded"
        ? { ...state, completedStepIds: [...state.completedStepIds, event.stepId], updatedAt: this.clock.now() }
        : { ...state, failedStepIds: [...state.failedStepIds, event.stepId], updatedAt: this.clock.now() };

    await this.checkpointRepository.save(updated);

    const checkpointedEvent: WorkflowCheckpointedEvent = {
      eventId: this.idGenerator.generate(),
      kind: "WorkflowCheckpointed",
      occurredAt: updated.updatedAt,
      aggregateId: updated.runId,
      runId: updated.runId,
      completedStepCount: updated.completedStepIds.length,
      failedStepCount: updated.failedStepIds.length,
    };
    await this.publish([checkpointedEvent]);
  }

  private async finalize(runId: string, execution: WorkflowExecution): Promise<void> {
    const state = await this.checkpointRepository.findById(runId);
    if (!state) {
      return;
    }

    const status =
      execution.status === WorkflowStatus.COMPLETED
        ? RunStatus.COMPLETED
        : execution.status === WorkflowStatus.CANCELLED
          ? RunStatus.CANCELLED
          : RunStatus.FAILED;

    const updated: WorkflowRunState = { ...state, status, updatedAt: this.clock.now() };
    await this.checkpointRepository.save(updated);

    if (status === RunStatus.COMPLETED) {
      const event: WorkflowRunCompletedEvent = {
        eventId: this.idGenerator.generate(),
        kind: "WorkflowRunCompleted",
        occurredAt: updated.updatedAt,
        aggregateId: runId,
        runId,
      };
      await this.publish([event]);
    } else if (status === RunStatus.CANCELLED) {
      const event: WorkflowRunCancelledEvent = {
        eventId: this.idGenerator.generate(),
        kind: "WorkflowRunCancelled",
        occurredAt: updated.updatedAt,
        aggregateId: runId,
        runId,
      };
      await this.publish([event]);
    } else {
      const event: WorkflowRunFailedEvent = {
        eventId: this.idGenerator.generate(),
        kind: "WorkflowRunFailed",
        occurredAt: updated.updatedAt,
        aggregateId: runId,
        runId,
      };
      await this.publish([event]);
    }
  }

  private async finalizeOnError(runId: string, _error: unknown): Promise<void> {
    const state = await this.checkpointRepository.findById(runId);
    if (!state) {
      return;
    }
    const updated: WorkflowRunState = { ...state, status: RunStatus.FAILED, updatedAt: this.clock.now() };
    await this.checkpointRepository.save(updated);

    const event: WorkflowRunFailedEvent = {
      eventId: this.idGenerator.generate(),
      kind: "WorkflowRunFailed",
      occurredAt: updated.updatedAt,
      aggregateId: runId,
      runId,
    };
    await this.publish([event]);
  }

  private async publish(
    events: readonly (
      | WorkflowRunStartedEvent
      | WorkflowCheckpointedEvent
      | WorkflowRunCompletedEvent
      | WorkflowRunFailedEvent
      | WorkflowRunCancelledEvent
      | WorkflowRunRetriedEvent
    )[],
  ): Promise<void> {
    if (this.eventPublisher) {
      await this.eventPublisher.publish(events);
    }
  }
}
