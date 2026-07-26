import { DomainError } from "@rmsm/core";

export class NoRecommendationsSuppliedError extends DomainError {
  constructor() {
    super("At least one recommendation source must be supplied to aggregate.", "NO_RECOMMENDATIONS_SUPPLIED");
  }
}
