import type { IdGenerator, Clock } from "@rmsm/core";
import type { ToolRegistry } from "../../repositories/tool-registry.interface";
import type { PermissionChecker } from "../../repositories/permission-checker.interface";
import type { ToolInvocation } from "../../domain/entities/tool-invocation.entity";
import type { ToolResult } from "../../domain/entities/tool-result.entity";
import type { RetryPolicy } from "../../domain/entities/retry-policy.entity";
import { ToolResultStatus } from "../../domain/enums/tool.enum";
import { ToolNotFoundError, ToolTimeoutError } from "../../domain/errors/tool-domain.errors";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { ToolDomainEvent } from "../../events/tool-domain-events.interface";

export interface ToolExecutionOptions {
  readonly timeoutMs?: number;
  readonly retry?: RetryPolicy;
}

/**
 * The core of AI-402: resolves an invocation against `ToolRegistry`,
 * runs the "Permission checks" and "Parameter validation" (real zod
 * `safeParse` against `ToolDefinition.parametersSchema`) gates, then
 * executes the handler with "Retry abstraction" and "Timeout
 * abstraction" (the same real retry-loop/`Promise.race` pattern
 * `@rmsm/ai-workflows`' `WorkflowEngine` uses for its own steps — this
 * package doesn't depend on `ai-workflows`, it just doesn't reinvent a
 * worse version of the same well-understood pattern). Every outcome —
 * success, validation failure, permission denial, timeout, or
 * exhausted retries — normalizes into the same `ToolResult` shape
 * ("Result normalization").
 */
export class ToolExecutionService {
  constructor(
    private readonly toolRegistry: ToolRegistry,
    private readonly permissionChecker: PermissionChecker,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async execute(invocation: ToolInvocation, options: ToolExecutionOptions = {}): Promise<ToolResult> {
    const entry = this.toolRegistry.get(invocation.toolName);
    if (!entry) {
      throw new ToolNotFoundError(invocation.toolName);
    }
    const { definition, handler } = entry;

    await this.publish([this.invokedEvent(invocation)]);
    const startedAt = this.clock.now();

    const missingPermissions = this.permissionChecker.checkMissingPermissions(definition.requiredPermissions, invocation.grantedPermissions);
    if (missingPermissions.length > 0) {
      await this.publish([this.permissionDeniedEvent(invocation, missingPermissions)]);
      return this.result(invocation, ToolResultStatus.PERMISSION_DENIED, startedAt, { attempts: 0, error: `missing permissions: ${missingPermissions.join(", ")}` });
    }

    const parsed = definition.parametersSchema.safeParse(invocation.arguments);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
      return this.result(invocation, ToolResultStatus.INVALID_PARAMETERS, startedAt, { attempts: 0, error: issues.join("; ") });
    }

    const retry = options.retry ?? definition.defaultRetry ?? { maxAttempts: 1 };
    const timeoutMs = options.timeoutMs ?? definition.defaultTimeoutMs;

    let lastError = "";
    for (let attempt = 1; attempt <= retry.maxAttempts; attempt++) {
      if (attempt > 1 && retry.backoffMs) {
        await new Promise((resolve) => setTimeout(resolve, retry.backoffMs));
      }
      try {
        const output = await this.withTimeout(handler(parsed.data), invocation.toolName, timeoutMs);
        const durationMs = this.clock.now().getTime() - startedAt.getTime();
        await this.publish([this.succeededEvent(invocation, durationMs)]);
        return this.result(invocation, ToolResultStatus.SUCCEEDED, startedAt, { attempts: attempt, output });
      } catch (error) {
        if (error instanceof ToolTimeoutError) {
          await this.publish([this.timedOutEvent(invocation)]);
          return this.result(invocation, ToolResultStatus.TIMED_OUT, startedAt, { attempts: attempt, error: error.message });
        }
        lastError = error instanceof Error ? error.message : String(error);
      }
    }

    await this.publish([this.failedEvent(invocation, lastError)]);
    return this.result(invocation, ToolResultStatus.FAILED, startedAt, { attempts: retry.maxAttempts, error: lastError });
  }

  private async withTimeout(promise: Promise<unknown>, toolName: string, timeoutMs?: number): Promise<unknown> {
    if (!timeoutMs) return promise;
    let timer: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new ToolTimeoutError(toolName, timeoutMs)), timeoutMs);
    });
    try {
      return await Promise.race([promise, timeout]);
    } finally {
      clearTimeout(timer!);
    }
  }

  private result(
    invocation: ToolInvocation,
    status: ToolResultStatus,
    startedAt: Date,
    extra: { attempts: number; output?: unknown; error?: string },
  ): ToolResult {
    return {
      invocationId: invocation.id,
      toolName: invocation.toolName,
      status,
      output: extra.output,
      error: extra.error,
      attempts: extra.attempts,
      durationMs: this.clock.now().getTime() - startedAt.getTime(),
    };
  }

  private invokedEvent(invocation: ToolInvocation): ToolDomainEvent {
    return { eventId: this.idGenerator.generate(), kind: "ToolInvoked", occurredAt: this.clock.now(), aggregateId: invocation.id, invocationId: invocation.id, toolName: invocation.toolName };
  }

  private succeededEvent(invocation: ToolInvocation, durationMs: number): ToolDomainEvent {
    return { eventId: this.idGenerator.generate(), kind: "ToolSucceeded", occurredAt: this.clock.now(), aggregateId: invocation.id, invocationId: invocation.id, toolName: invocation.toolName, durationMs };
  }

  private failedEvent(invocation: ToolInvocation, error: string): ToolDomainEvent {
    return { eventId: this.idGenerator.generate(), kind: "ToolFailed", occurredAt: this.clock.now(), aggregateId: invocation.id, invocationId: invocation.id, toolName: invocation.toolName, error };
  }

  private permissionDeniedEvent(invocation: ToolInvocation, missingPermissions: readonly string[]): ToolDomainEvent {
    return { eventId: this.idGenerator.generate(), kind: "ToolPermissionDenied", occurredAt: this.clock.now(), aggregateId: invocation.id, invocationId: invocation.id, toolName: invocation.toolName, missingPermissions };
  }

  private timedOutEvent(invocation: ToolInvocation): ToolDomainEvent {
    return { eventId: this.idGenerator.generate(), kind: "ToolTimedOut", occurredAt: this.clock.now(), aggregateId: invocation.id, invocationId: invocation.id, toolName: invocation.toolName };
  }

  private async publish(events: readonly ToolDomainEvent[]): Promise<void> {
    if (this.eventPublisher) {
      await this.eventPublisher.publish(events);
    }
  }
}
