import type { IdGenerator, Clock } from "@rmsm/core";
import type { AgentConfig } from "../../domain/entities/agent-config.entity";
import type { AgentContext } from "../../domain/entities/agent-context.entity";
import type { AgentStepResult } from "../../domain/entities/agent-step-result.entity";
import type { AgentExecutionState } from "../../domain/entities/agent-execution-state.entity";
import type { AgentRunResult } from "../../domain/entities/agent-run-result.entity";
import { AgentStatus } from "../../domain/enums/agent.enum";
import {
  AgentNotFoundError,
  ReasoningStrategyNotFoundError,
  MaxStepsExceededError,
  ExecutionNotFoundError,
} from "../../domain/errors/agent-domain.errors";
import type { AgentRegistry } from "../../repositories/agent-registry.interface";
import type { ReasoningStrategyRegistry, ReasoningStrategy } from "../../repositories/reasoning-strategy.interface";
import type { AgentExecutionRepository } from "../../repositories/agent-execution-repository.interface";
import type { CancellationToken } from "../../repositories/cancellation-token.interface";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { AgentDomainEvent } from "../../events/agent-domain-events.interface";

/**
 * The core of AI-401: drives an agent's step loop against its
 * `ReasoningStrategy` until a step reports `isFinal: true` or
 * `maxSteps` is reached, in every mode the spec calls for:
 *
 * - **Synchronous** (`runSync`): awaits the full run, returns `AgentRunResult`.
 * - **Asynchronous / Long-running** (`runAsync`): starts execution in the
 *   background, returns an `executionId` immediately; `getStatus()`
 *   polls `AgentExecutionRepository` for progress.
 * - **Streaming** (`stream`): an async generator yielding each
 *   `AgentStepResult` as it's produced.
 *
 * Every mode persists `AgentExecutionState` after each step (the
 * "Agent lifecycle" / "Agent execution state" capabilities) and
 * publishes `AgentDomainEvent`s throughout — the seam AI-410's
 * analytics and AI-204's observability attach to.
 */
export class AgentRuntime {
  constructor(
    private readonly agentRegistry: AgentRegistry,
    private readonly reasoningStrategyRegistry: ReasoningStrategyRegistry,
    private readonly executionRepository: AgentExecutionRepository,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async runSync(agentId: string, context: AgentContext, cancellationToken?: CancellationToken): Promise<AgentRunResult> {
    const { config, strategy } = this.resolve(agentId);
    return this.execute(this.idGenerator.generate(), config, strategy, context, cancellationToken);
  }

  /** Starts execution without waiting for it to finish — returns the
   * `executionId` immediately; the run continues in the background and
   * updates `AgentExecutionRepository` as it progresses. */
  async runAsync(agentId: string, context: AgentContext, cancellationToken?: CancellationToken): Promise<string> {
    const { config, strategy } = this.resolve(agentId);
    const executionId = this.idGenerator.generate();
    void this.execute(executionId, config, strategy, context, cancellationToken);
    return executionId;
  }

  async getStatus(executionId: string): Promise<AgentExecutionState> {
    const state = await this.executionRepository.findById(executionId);
    if (!state) {
      throw new ExecutionNotFoundError(executionId);
    }
    return state;
  }

  async *stream(agentId: string, context: AgentContext, cancellationToken?: CancellationToken): AsyncGenerator<AgentStepResult> {
    const { config, strategy } = this.resolve(agentId);
    const executionId = this.idGenerator.generate();
    const startedAt = this.clock.now();
    await this.saveState(executionId, config.id, AgentStatus.RUNNING, 0, startedAt);
    await this.publish([this.startedEvent(executionId, config.id, startedAt)]);

    const history: AgentStepResult[] = [];
    try {
      while (history.length < config.maxSteps) {
        if (cancellationToken?.isCancelled()) {
          await this.saveState(executionId, config.id, AgentStatus.CANCELLED, history.length, startedAt, this.clock.now());
          await this.publish([this.cancelledEvent(executionId, config.id)]);
          return;
        }

        const step = await strategy.nextStep(context, history);
        history.push(step);
        yield step;
        await this.saveState(executionId, config.id, AgentStatus.RUNNING, history.length, startedAt);
        await this.publish([this.stepCompletedEvent(executionId, config.id, step.stepIndex)]);

        if (step.isFinal) {
          await this.saveState(executionId, config.id, AgentStatus.COMPLETED, history.length, startedAt, this.clock.now());
          await this.publish([this.completedEvent(executionId, config.id)]);
          return;
        }
      }
      throw new MaxStepsExceededError(config.id, config.maxSteps);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.saveState(executionId, config.id, AgentStatus.FAILED, history.length, startedAt, this.clock.now(), message);
      await this.publish([this.failedEvent(executionId, config.id, message)]);
      throw error;
    }
  }

  private resolve(agentId: string): { config: AgentConfig; strategy: ReasoningStrategy } {
    const config = this.agentRegistry.get(agentId);
    if (!config) {
      throw new AgentNotFoundError(agentId);
    }
    const strategy = this.reasoningStrategyRegistry.get(config.reasoningStrategyName);
    if (!strategy) {
      throw new ReasoningStrategyNotFoundError(config.reasoningStrategyName);
    }
    return { config, strategy };
  }

  private async execute(
    executionId: string,
    config: AgentConfig,
    strategy: ReasoningStrategy,
    context: AgentContext,
    cancellationToken?: CancellationToken,
  ): Promise<AgentRunResult> {
    const startedAt = this.clock.now();
    await this.saveState(executionId, config.id, AgentStatus.RUNNING, 0, startedAt);
    await this.publish([this.startedEvent(executionId, config.id, startedAt)]);

    const history: AgentStepResult[] = [];
    try {
      while (history.length < config.maxSteps) {
        if (cancellationToken?.isCancelled()) {
          const completedAt = this.clock.now();
          await this.saveState(executionId, config.id, AgentStatus.CANCELLED, history.length, startedAt, completedAt);
          await this.publish([this.cancelledEvent(executionId, config.id)]);
          return { executionId, agentId: config.id, status: AgentStatus.CANCELLED, output: undefined, steps: history, startedAt, completedAt };
        }

        const step = await strategy.nextStep(context, history);
        history.push(step);
        await this.saveState(executionId, config.id, AgentStatus.RUNNING, history.length, startedAt);
        await this.publish([this.stepCompletedEvent(executionId, config.id, step.stepIndex)]);

        if (step.isFinal) {
          const completedAt = this.clock.now();
          await this.saveState(executionId, config.id, AgentStatus.COMPLETED, history.length, startedAt, completedAt);
          await this.publish([this.completedEvent(executionId, config.id)]);
          return { executionId, agentId: config.id, status: AgentStatus.COMPLETED, output: step.output, steps: history, startedAt, completedAt };
        }
      }
      throw new MaxStepsExceededError(config.id, config.maxSteps);
    } catch (error) {
      const completedAt = this.clock.now();
      const message = error instanceof Error ? error.message : String(error);
      await this.saveState(executionId, config.id, AgentStatus.FAILED, history.length, startedAt, completedAt, message);
      await this.publish([this.failedEvent(executionId, config.id, message)]);
      throw error;
    }
  }

  private async saveState(
    executionId: string,
    agentId: string,
    status: AgentStatus,
    currentStepIndex: number,
    startedAt: Date,
    completedAt: Date | null = null,
    error?: string,
  ): Promise<void> {
    await this.executionRepository.save({ executionId, agentId, status, currentStepIndex, startedAt, completedAt, error });
  }

  private startedEvent(executionId: string, agentId: string, occurredAt: Date): AgentDomainEvent {
    return { eventId: this.idGenerator.generate(), kind: "AgentStarted", occurredAt, aggregateId: executionId, executionId, agentId };
  }

  private stepCompletedEvent(executionId: string, agentId: string, stepIndex: number): AgentDomainEvent {
    return { eventId: this.idGenerator.generate(), kind: "AgentStepCompleted", occurredAt: this.clock.now(), aggregateId: executionId, executionId, agentId, stepIndex };
  }

  private completedEvent(executionId: string, agentId: string): AgentDomainEvent {
    return { eventId: this.idGenerator.generate(), kind: "AgentCompleted", occurredAt: this.clock.now(), aggregateId: executionId, executionId, agentId };
  }

  private failedEvent(executionId: string, agentId: string, error: string): AgentDomainEvent {
    return { eventId: this.idGenerator.generate(), kind: "AgentFailed", occurredAt: this.clock.now(), aggregateId: executionId, executionId, agentId, error };
  }

  private cancelledEvent(executionId: string, agentId: string): AgentDomainEvent {
    return { eventId: this.idGenerator.generate(), kind: "AgentCancelled", occurredAt: this.clock.now(), aggregateId: executionId, executionId, agentId };
  }

  private async publish(events: readonly AgentDomainEvent[]): Promise<void> {
    if (this.eventPublisher) {
      await this.eventPublisher.publish(events);
    }
  }
}
