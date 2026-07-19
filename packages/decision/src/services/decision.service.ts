import { ok, err, type Result, InvariantViolationError } from "@rmsm/core";
import type { DecisionRepository } from "../repositories/decision.repository";
import type { Decision } from "../entities/decision";
import { UnknownDecisionError, InvalidDecisionError, InvalidDecisionTransitionError } from "../errors/decision.errors";
import { validateRiskAssessmentPassed } from "../validators/decision.validator";

/** Orchestrates decision approval workflow — depends on
 * `DecisionRepository` (an interface, constructor-injected), never on
 * any concrete persistence technology. The one rule this service
 * enforces before ever calling `Decision.approve()`: the decision's own
 * risk assessment must have actually passed. */
export class DecisionService {
  constructor(private readonly decisionRepository: DecisionRepository) {}

  async getById(id: string): Promise<Result<Decision, UnknownDecisionError>> {
    const decision = await this.decisionRepository.findById(id);
    if (!decision) return err(new UnknownDecisionError(id));
    return ok(decision);
  }

  async approve(
    id: string,
    decidedBy: string,
    comments?: string,
  ): Promise<Result<Decision, UnknownDecisionError | InvalidDecisionError | InvalidDecisionTransitionError>> {
    const decisionResult = await this.getById(id);
    if (!decisionResult.ok) return decisionResult;
    const decision = decisionResult.value;

    const riskPassed = validateRiskAssessmentPassed(decision);
    if (!riskPassed.ok) return riskPassed;

    try {
      decision.approve(decidedBy, comments);
    } catch (error) {
      if (error instanceof InvalidDecisionTransitionError) return err(error);
      // Decision.approve() also delegates to Approval.approve(), which
      // uses @rmsm/core's Guard.againstEmptyString() for its own
      // decidedBy invariant — that throws Guard's InvariantViolationError,
      // not this package's own error type. Converted here rather than
      // leaking @rmsm/core's error type through this domain's own
      // Result-based public API.
      if (error instanceof InvariantViolationError) return err(new InvalidDecisionError(error.message));
      throw error;
    }
    await this.decisionRepository.save(decision);
    return ok(decision);
  }

  async reject(
    id: string,
    decidedBy: string,
    comments?: string,
  ): Promise<Result<Decision, UnknownDecisionError | InvalidDecisionTransitionError | InvalidDecisionError>> {
    const decisionResult = await this.getById(id);
    if (!decisionResult.ok) return decisionResult;

    const decision = decisionResult.value;
    try {
      decision.reject(decidedBy, comments);
    } catch (error) {
      if (error instanceof InvalidDecisionTransitionError) return err(error);
      if (error instanceof InvariantViolationError) return err(new InvalidDecisionError(error.message));
      throw error;
    }
    await this.decisionRepository.save(decision);
    return ok(decision);
  }

  async flagForManualReview(
    id: string,
    comments?: string,
  ): Promise<Result<Decision, UnknownDecisionError | InvalidDecisionTransitionError>> {
    const decisionResult = await this.getById(id);
    if (!decisionResult.ok) return decisionResult;

    const decision = decisionResult.value;
    try {
      decision.flagForManualReview(comments);
    } catch (error) {
      if (error instanceof InvalidDecisionTransitionError) return err(error);
      throw error;
    }
    await this.decisionRepository.save(decision);
    return ok(decision);
  }
}
