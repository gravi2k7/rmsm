import { DomainError } from "@rmsm/core";

export class InvalidReportPeriodError extends DomainError {
  constructor(period: string) {
    super(`"${period}" is not a supported report period.`, "INVALID_REPORT_PERIOD");
  }
}
