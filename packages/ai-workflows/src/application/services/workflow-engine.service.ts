import type { IdGenerator, Clock } from "@rmsm/core";
import type { WorkflowDefinition } from "../../domain/entities/workflow-definition.entity";
import type { StepDefinition } from "../../domain/entities/step-definition.entity";
import type { StepResult } from "../../domain/entities/step-result.entity";
import type { WorkflowExecution } from "../../domain/entities/workflow-execution.entity";
import type { WorkflowContext } from "../../domain/entities/workflow-context.entity";
import { StepStatus, WorkflowStatus } from "../../domain/enums/workflow.enum";
import { StepHandlerNotFoundError, CyclicWorkflowError, UnknownStepDependencyError, StepTimeoutError } from "../../domain/errors/workflow-domain.errors";
import type { StepHandlerRegistry } from "../../repositories/step-handler-registry.interface";
import type { WorkflowExecutionRepository } from "../../repositories/workflow-execution-repository.interface";
import type { CancellationToken } from "../../repositories/cancellation-token.interface";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { WorkflowDomainEvent } from "../../events/workflow-domain-events.interface";

/**
 * The core of AI-310: executes a `WorkflowDefinition`'s step DAG.
 *
 * - **Chain execution / AI pipelines**: steps run in dependency order,
 *   computed via topological sort — never array order.
 * - **Parallel execution**: every "wave" (steps whose dependencies are
 *   all already resolved) runs concurrently via `Promise.all`.
 * - **Conditional routing**: a step whose `condition(context)` returns
 *   false is marked `SKIPPED` without running its handler; any step
 *   that transitively depends on a `FAILED`/`SKIPPED`/`TIMED_OUT`/
 *   `CANCELLED` step is skipped too (never runs on incomplete input).
 * - **Retry**: a step with a `retry` policy re-invokes its handler up
 *   to `maxAttempts` times, waiting `backoffMs` between attempts,
 *   publishing `StepRetried` each time.
 * - **Timeout**: `Promise.race` against a timer per step when
 *   `timeoutMs` is set.
 * - **Cancellation**: the injected `CancellationToken` is checked
 *   before every wave; once cancelled, all not-yet-run steps are
 *   marked `CANCELLED` and no further handlers run.
 * - **Execution history**: the full `WorkflowExecution` (every step's
 *   result) is persisted via `WorkflowExecutionRepository` before
 *   `run()` resolves.
 */
export class WorkflowEngine {
  constructor(
    private readonly handlerRegistry: StepHandlerRegistry,
    private readonly executionRepository: WorkflowExecutionRepository,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async run(definition: WorkflowDefinition, input: unknown, cancellationToken?: CancellationToken): Promise<WorkflowExecution> {
    const waves = this.computeWaves(definition);
    const executionId = this.idGenerator.generate();
    const startedAt = this.clock.now();

    await this.publish([
      { eventId: this.idGenerator.generate(), kind: "WorkflowStarted", occurredAt: startedAt, aggregateId: executionId, executionId, workflowId: definition.id },
    ]);

    const resultsByStepId = new Map<string, StepResult>();
    const outputsByStepId: Record<string, unknown> = {};
    let cancelled = false;

    for (const wave of waves) {
      if (cancellationToken?.isCancelled()) {
        cancelled = true;
      }

      if (cancelled) {
        for (const step of wave) {
          resultsByStepId.set(step.id, this.skipResult(step.id, StepStatus.CANCELLED));
        }
        continue;
      }

      const waveResults = await Promise.all(
        wave.map((step) => this.runStep(step, executionId, input, outputsByStepId, resultsByStepId, cancellationToken)),
      );
      for (const result of waveResults) {
        resultsByStepId.set(result.stepId, result);
        if (result.status === StepStatus.SUCCEEDED) {
          outputsByStepId[result.stepId] = result.output;
        }
      }
    }

    const stepResults = definition.steps.map((step) => resultsByStepId.get(step.id)!);
    const failed = stepResults.some((r) => r.status === StepStatus.FAILED);
    const status = cancelled ? WorkflowStatus.CANCELLED : failed ? WorkflowStatus.FAILED : WorkflowStatus.COMPLETED;
    const completedAt = this.clock.now();

    const execution: WorkflowExecution = { id: executionId, workflowId: definition.id, status, stepResults, startedAt, completedAt };
    await this.executionRepository.save(execution);

    await this.publish([this.terminalEvent(status, executionId, completedAt)]);
    return execution;
  }

  private async runStep(
    step: StepDefinition,
    executionId: string,
    input: unknown,
    outputsByStepId: Readonly<Record<string, unknown>>,
    resultsByStepId: ReadonlyMap<string, StepResult>,
    cancellationToken?: CancellationToken,
  ): Promise<StepResult> {
    const upstreamFailed = (step.dependsOn ?? []).some((depId) => {
      const depResult = resultsByStepId.get(depId);
      return depResult && depResult.status !== StepStatus.SUCCEEDED;
    });
    if (upstreamFailed) {
      await this.publish([this.skippedEvent(executionId, step.id, "an upstream dependency did not succeed")]);
      return this.skipResult(step.id, StepStatus.SKIPPED);
    }

    const context: WorkflowContext = { input, results: outputsByStepId };
    if (step.condition && !step.condition(context)) {
      await this.publish([this.skippedEvent(executionId, step.id, "condition returned false")]);
      return this.skipResult(step.id, StepStatus.SKIPPED);
    }

    const handler = this.handlerRegistry.get(step.handlerName);
    if (!handler) {
      throw new StepHandlerNotFoundError(step.handlerName);
    }

    const maxAttempts = step.retry?.maxAttempts ?? 1;
    const startedAt = this.clock.now();
    await this.publish([{ eventId: this.idGenerator.generate(), kind: "StepStarted", occurredAt: startedAt, aggregateId: step.id, executionId, stepId: step.id }]);

    let lastError = "";
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (cancellationToken?.isCancelled()) {
        return this.skipResult(step.id, StepStatus.CANCELLED, startedAt);
      }
      if (attempt > 1) {
        await this.publish([{ eventId: this.idGenerator.generate(), kind: "StepRetried", occurredAt: this.clock.now(), aggregateId: step.id, executionId, stepId: step.id, attempt }]);
        if (step.retry?.backoffMs) {
          await new Promise((resolve) => setTimeout(resolve, step.retry!.backoffMs));
        }
      }

      try {
        const output = await this.withTimeout(handler(input, context), step);
        const completedAt = this.clock.now();
        await this.publish([{ eventId: this.idGenerator.generate(), kind: "StepSucceeded", occurredAt: completedAt, aggregateId: step.id, executionId, stepId: step.id }]);
        return { stepId: step.id, status: StepStatus.SUCCEEDED, output, attempts: attempt, startedAt, completedAt };
      } catch (error) {
        if (error instanceof StepTimeoutError) {
          const completedAt = this.clock.now();
          await this.publish([{ eventId: this.idGenerator.generate(), kind: "StepTimedOut", occurredAt: completedAt, aggregateId: step.id, executionId, stepId: step.id }]);
          return { stepId: step.id, status: StepStatus.TIMED_OUT, error: error.message, attempts: attempt, startedAt, completedAt };
        }
        lastError = error instanceof Error ? error.message : String(error);
      }
    }

    const completedAt = this.clock.now();
    await this.publish([{ eventId: this.idGenerator.generate(), kind: "StepFailed", occurredAt: completedAt, aggregateId: step.id, executionId, stepId: step.id, error: lastError }]);
    return { stepId: step.id, status: StepStatus.FAILED, error: lastError, attempts: maxAttempts, startedAt, completedAt };
  }

  private async withTimeout(promise: Promise<unknown>, step: StepDefinition): Promise<unknown> {
    if (!step.timeoutMs) return promise;
    let timer: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new StepTimeoutError(step.id, step.timeoutMs!)), step.timeoutMs);
    });
    try {
      return await Promise.race([promise, timeout]);
    } finally {
      clearTimeout(timer!);
    }
  }

  private skipResult(stepId: string, status: StepStatus, startedAt: Date | null = null): StepResult {
    return { stepId, status, attempts: 0, startedAt, completedAt: this.clock.now() };
  }

  private skippedEvent(executionId: string, stepId: string, reason: string) {
    return { eventId: this.idGenerator.generate(), kind: "StepSkipped" as const, occurredAt: this.clock.now(), aggregateId: stepId, executionId, stepId, reason };
  }

  private terminalEvent(status: WorkflowStatus, executionId: string, occurredAt: Date): WorkflowDomainEvent {
    const kind = status === WorkflowStatus.CANCELLED ? "WorkflowCancelled" : status === WorkflowStatus.FAILED ? "WorkflowFailed" : "WorkflowCompleted";
    return { eventId: this.idGenerator.generate(), kind, occurredAt, aggregateId: executionId, executionId } as WorkflowDomainEvent;
  }

  private async publish(events: readonly WorkflowDomainEvent[]): Promise<void> {
    if (this.eventPublisher) {
      await this.eventPublisher.publish(events);
    }
  }

  /** Topologically sorts `definition.steps` into "waves" — each wave is
   * every step whose dependencies are all in a prior wave, so a wave's
   * steps can safely run in parallel. Throws `CyclicWorkflowError` if
   * the DAG has a cycle, `UnknownStepDependencyError` if a step
   * declares a `dependsOn` id that isn't defined in the workflow. */
  private computeWaves(definition: WorkflowDefinition): readonly (readonly StepDefinition[])[] {
    const stepsById = new Map(definition.steps.map((step) => [step.id, step]));
    for (const step of definition.steps) {
      for (const depId of step.dependsOn ?? []) {
        if (!stepsById.has(depId)) {
          throw new UnknownStepDependencyError(step.id, depId);
        }
      }
    }

    const remaining = new Set(definition.steps.map((step) => step.id));
    const waves: StepDefinition[][] = [];

    while (remaining.size > 0) {
      const wave = [...remaining]
        .map((id) => stepsById.get(id)!)
        .filter((step) => (step.dependsOn ?? []).every((depId) => !remaining.has(depId)));

      if (wave.length === 0) {
        throw new CyclicWorkflowError(definition.id);
      }

      waves.push(wave);
      for (const step of wave) {
        remaining.delete(step.id);
      }
    }

    return waves;
  }
}
