import { ok, err, type Result, InvariantViolationError } from "@rmsm/core";
import { randomUUID } from "node:crypto";
import { Decision } from "../entities/decision";
import type { RiskAssessment } from "../entities/risk-assessment";
import type { PositionSize } from "../entities/position-size";
import { InvalidDecisionError, type DecisionDomainError } from "../errors/decision.errors";

export interface RawDecisionInput {
  readonly id?: string;
  readonly opportunityId: string;
  readonly riskAssessment: RiskAssessment;
  readonly positionSize: PositionSize;
  readonly createdAt?: Date;
}

/**
 * Builds a `Decision` from an already-computed `RiskAssessment` and
 * `PositionSize` (both produced by `RiskService`, which needs the async
 * `RiskEngine` port this factory deliberately doesn't depend on —
 * keeping this factory synchronous and side-effect-free, the same
 * "compose already-validated pieces into an aggregate" role
 * `@rmsm/market`'s and `@rmsm/strategy`'s own factories play).
 */
export class DecisionFactory {
  static create(input: RawDecisionInput): Result<Decision, DecisionDomainError> {
    try {
      const decision = Decision.create(input.id ?? randomUUID(), {
        opportunityId: input.opportunityId,
        riskAssessment: input.riskAssessment,
        positionSize: input.positionSize,
        createdAt: input.createdAt ?? new Date(),
      });
      return ok(decision);
    } catch (error) {
      if (error instanceof InvariantViolationError) return err(new InvalidDecisionError(error.message));
      throw error;
    }
  }
}
