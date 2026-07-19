import { ok, err, type Result } from "@rmsm/core";
import type { OpportunityRepository } from "../repositories/opportunity.repository";
import type { Opportunity } from "../entities/opportunity";
import { UnknownOpportunityError, InvalidOpportunityTransitionError, InvalidOpportunityError } from "../errors/opportunity.errors";
import { validateFavorableConditions, validateNotExpired } from "../validators/opportunity.validator";

/** Orchestrates opportunity lifecycle operations — depends on
 * `OpportunityRepository` (an interface, constructor-injected), never on
 * any concrete persistence technology. */
export class OpportunityService {
  constructor(private readonly opportunityRepository: OpportunityRepository) {}

  async getById(id: string): Promise<Result<Opportunity, UnknownOpportunityError>> {
    const opportunity = await this.opportunityRepository.findById(id);
    if (!opportunity) return err(new UnknownOpportunityError(id));
    return ok(opportunity);
  }

  /** Confirms an opportunity — validates it isn't expired and that
   * market conditions are favorable before doing so, per this domain's
   * own validators. */
  async confirm(
    id: string,
    asOf: Date = new Date(),
  ): Promise<Result<Opportunity, UnknownOpportunityError | InvalidOpportunityError | InvalidOpportunityTransitionError>> {
    const opportunityResult = await this.getById(id);
    if (!opportunityResult.ok) return opportunityResult;
    const opportunity = opportunityResult.value;

    const notExpired = validateNotExpired(opportunity, asOf);
    if (!notExpired.ok) return notExpired;

    const favorable = validateFavorableConditions(opportunity);
    if (!favorable.ok) return favorable;

    try {
      opportunity.confirm();
    } catch (error) {
      if (error instanceof InvalidOpportunityTransitionError) return err(error);
      throw error;
    }
    await this.opportunityRepository.save(opportunity);
    return ok(opportunity);
  }

  async reject(id: string): Promise<Result<Opportunity, UnknownOpportunityError | InvalidOpportunityTransitionError>> {
    const opportunityResult = await this.getById(id);
    if (!opportunityResult.ok) return opportunityResult;

    const opportunity = opportunityResult.value;
    try {
      opportunity.reject();
    } catch (error) {
      if (error instanceof InvalidOpportunityTransitionError) return err(error);
      throw error;
    }
    await this.opportunityRepository.save(opportunity);
    return ok(opportunity);
  }

  /** Sweeps every still-`PENDING` opportunity past its own expiry and
   * expires it — the intended periodic-job entry point (a caller
   * schedules this, this domain has no scheduler of its own). Returns
   * every opportunity actually expired by this call. */
  async expirePastDue(asOf: Date = new Date()): Promise<Opportunity[]> {
    const candidates = await this.opportunityRepository.findPendingPastExpiry(asOf);
    for (const opportunity of candidates) {
      opportunity.expire(asOf);
      await this.opportunityRepository.save(opportunity);
    }
    return candidates;
  }
}
