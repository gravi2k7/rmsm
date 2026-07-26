import { describe, expect, it } from "vitest";
import { InvalidReportPeriodError } from "../errors/executive-reports-domain.errors";

describe("executive-reports domain errors", () => {
  it("InvalidReportPeriodError carries the INVALID_REPORT_PERIOD code", () => {
    expect(new InvalidReportPeriodError("YEARLY").code).toBe("INVALID_REPORT_PERIOD");
  });
});
