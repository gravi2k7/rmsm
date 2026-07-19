import { AggregateRoot, Guard } from "@rmsm/core";
import { ExecutionCompletedEvent } from "../events/execution-completed.event";
import { ExecutionFailedEvent } from "../events/execution-failed.event";
import { InvalidExecutionError } from "../errors/execution.errors";

export type ExecutionStatus = "IN_PROGRESS" | "COMPLETED" | "FAILED";

const ALLOWED_TRANSITIONS: Readonly<Record<ExecutionStatus, readonly ExecutionStatus[]>> = {
  IN_PROGRESS: ["COMPLETED", "FAILED"],
  COMPLETED: [],
  FAILED: [],
};

export interface ExecutionProps {
  readonly orderId: string;
  status: ExecutionStatus;
  retryCount: number;
  readonly maxRetries: number;
  readonly startedAt: Date;
  completedAt?: Date;
  failureReason?: string;
}

/**
 * One end-to-end attempt to execute an `Order` — distinct from `Order`
 * itself: `Order` is the broker-facing record (its own lifecycle mirrors
 * what the venue reports back); `Execution` is this platform's own view
 * of "did the attempt to get this order filled succeed," including
 * retry bookkeeping the venue has no concept of. A single `Order` could
 * in principle be resubmitted under a new `Execution` after a failure
 * (a fresh attempt), which is exactly why the two aren't the same
 * aggregate.
 */
export class Execution extends AggregateRoot<string> {
  private props: ExecutionProps;

  private constructor(id: string, props: ExecutionProps) {
    super(id);
    this.props = props;
  }

  static start(id: string, orderId: string, maxRetries: number, startedAt: Date = new Date()): Execution {
    Guard.againstEmptyString(id, "id");
    Guard.againstEmptyString(orderId, "orderId");
    Guard.ensure(maxRetries >= 0, "maxRetries must not be negative.");
    return new Execution(id, { orderId, status: "IN_PROGRESS", retryCount: 0, maxRetries, startedAt });
  }

  get orderId(): string {
    return this.props.orderId;
  }

  get status(): ExecutionStatus {
    return this.props.status;
  }

  get retryCount(): number {
    return this.props.retryCount;
  }

  get maxRetries(): number {
    return this.props.maxRetries;
  }

  get startedAt(): Date {
    return this.props.startedAt;
  }

  get completedAt(): Date | undefined {
    return this.props.completedAt;
  }

  get failureReason(): string | undefined {
    return this.props.failureReason;
  }

  /** Whether another retry attempt is allowed under this execution's own
   * `maxRetries` budget — the retry policy this domain's own required
   * feature list names, expressed as a simple, real check rather than
   * left implicit. */
  canRetry(): boolean {
    return this.props.status === "IN_PROGRESS" && this.props.retryCount < this.props.maxRetries;
  }

  /** Records a retry attempt — throws if the retry budget is already
   * exhausted, rather than silently allowing unlimited retries. */
  recordRetry(): void {
    if (!this.canRetry()) {
      throw new InvalidExecutionError(`no retries remaining (${this.props.retryCount}/${this.props.maxRetries} used).`);
    }
    this.props = { ...this.props, retryCount: this.props.retryCount + 1 };
  }

  private transitionTo(next: ExecutionStatus): void {
    const allowed = ALLOWED_TRANSITIONS[this.props.status];
    if (!allowed.includes(next)) {
      throw new InvalidExecutionError(`cannot transition from "${this.props.status}" to "${next}".`);
    }
    this.props = { ...this.props, status: next };
  }

  complete(occurredAt: Date = new Date()): void {
    this.transitionTo("COMPLETED");
    this.props = { ...this.props, completedAt: occurredAt };
    this.addDomainEvent(new ExecutionCompletedEvent(this.id, occurredAt));
  }

  fail(reason: string, occurredAt: Date = new Date()): void {
    this.transitionTo("FAILED");
    this.props = { ...this.props, completedAt: occurredAt, failureReason: reason };
    this.addDomainEvent(new ExecutionFailedEvent(this.id, reason, occurredAt));
  }
}
