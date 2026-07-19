import { Entity, Guard } from "@rmsm/core";
import { InvalidExecutionError } from "../errors/execution.errors";

export type ExecutionSessionStatus = "ACTIVE" | "CLOSED";

export interface ExecutionSessionProps {
  status: ExecutionSessionStatus;
  executionIds: string[];
  readonly startedAt: Date;
  endedAt?: Date;
}

/** Groups related `Execution`s over a bounded window (e.g. one trading
 * day, or one strategy's own live-trading run) — purely a grouping/
 * bookkeeping concept for reporting ("how did today's executions go"),
 * with no lifecycle logic of its own beyond open/closed. */
export class ExecutionSession extends Entity<string> {
  private props: ExecutionSessionProps;

  private constructor(id: string, props: ExecutionSessionProps) {
    super(id);
    this.props = props;
  }

  static open(id: string, startedAt: Date = new Date()): ExecutionSession {
    Guard.againstEmptyString(id, "id");
    return new ExecutionSession(id, { status: "ACTIVE", executionIds: [], startedAt });
  }

  get status(): ExecutionSessionStatus {
    return this.props.status;
  }

  get executionIds(): readonly string[] {
    return this.props.executionIds;
  }

  get startedAt(): Date {
    return this.props.startedAt;
  }

  get endedAt(): Date | undefined {
    return this.props.endedAt;
  }

  get executionCount(): number {
    return this.props.executionIds.length;
  }

  addExecution(executionId: string): void {
    Guard.againstEmptyString(executionId, "executionId");
    if (this.props.status === "CLOSED") {
      throw new InvalidExecutionError(`cannot add an execution to closed session ${this.id}.`);
    }
    this.props = { ...this.props, executionIds: [...this.props.executionIds, executionId] };
  }

  close(endedAt: Date = new Date()): void {
    this.props = { ...this.props, status: "CLOSED", endedAt };
  }
}
