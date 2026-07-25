import type { AgentGoal } from "@rmsm/ai-agents";
import type { DelegationStatus } from "../enums/orchestration.enum";

/** The "delegation" capability: one unit of work a coordinator handed
 * to a worker. `attempts`/`reassignedFromWorkerId` are how "failure
 * recovery" shows up on the record — a delegation that failed and was
 * handed to a different eligible worker carries both. */
export interface DelegationTask {
  readonly id: string;
  readonly coordinatorId: string;
  readonly workerId: string;
  readonly requiredCapability: string;
  readonly goal: AgentGoal;
  readonly status: DelegationStatus;
  readonly attempts: number;
  readonly reassignedFromWorkerId?: string;
  readonly result?: unknown;
  readonly error?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
