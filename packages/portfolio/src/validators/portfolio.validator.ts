import { ok, err, type Result } from "@rmsm/core";
import type { Portfolio } from "../entities/portfolio";
import { InvalidPortfolioError } from "../errors/portfolio.errors";

/** A portfolio must have enough buying power to cover a proposed
 * margin requirement — the same check `Portfolio.openPosition()` itself
 * enforces (throwing), exposed here as a standalone, non-throwing check
 * for a caller (e.g. `PortfolioService`) that wants to validate before
 * committing to opening a position. */
export function validateSufficientBuyingPower(portfolio: Portfolio, marginRequired: number): Result<true, InvalidPortfolioError> {
  if (marginRequired > portfolio.buyingPower) {
    return err(new InvalidPortfolioError(`margin required (${marginRequired}) exceeds available buying power (${portfolio.buyingPower}).`));
  }
  return ok(true);
}

/** An `Exposure` must not exceed its own configured limit — the generic
 * check `RiskMonitorService` runs for every exposure scope (symbol,
 * sector, portfolio-wide) it computes, rather than three separate,
 * near-identical validators. */
export function validateExposureWithinLimit(exposurePercentage: number, limitPercentage: number): Result<true, InvalidPortfolioError> {
  if (exposurePercentage > limitPercentage) {
    return err(new InvalidPortfolioError(`exposure ${exposurePercentage.toFixed(2)}% exceeds the configured limit of ${limitPercentage.toFixed(2)}%.`));
  }
  return ok(true);
}
