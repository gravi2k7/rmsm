import { ok, err, type Result } from "@rmsm/core";
import type { Opportunity } from "../entities/opportunity";
import { InvalidOpportunityError } from "../errors/opportunity.errors";

/** A confirmed opportunity in unfavorable market conditions (high
 * volatility + low liquidity, per `MarketContext.isFavorable()`) is a
 * real risk worth blocking at confirmation time, not silently allowed
 * through. */
export function validateFavorableConditions(opportunity: Opportunity): Result<true, InvalidOpportunityError> {
  if (!opportunity.marketContext.isFavorable()) {
    return err(new InvalidOpportunityError("market conditions (high volatility, low liquidity) are unfavorable for acting on this opportunity."));
  }
  return ok(true);
}

/** A confirmed/rejected opportunity that's also past its own expiry is a
 * data inconsistency worth flagging — `OpportunityService` checks this
 * before confirming, not after. */
export function validateNotExpired(opportunity: Opportunity, asOf: Date = new Date()): Result<true, InvalidOpportunityError> {
  if (opportunity.isPastExpiry(asOf)) {
    return err(new InvalidOpportunityError(`opportunity expired at ${opportunity.expiresAt.toISOString()}.`));
  }
  return ok(true);
}
