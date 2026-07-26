import { describe, expect, it } from "vitest";
import { ReportPeriodService } from "../services/report-period.service";
import { ReportPeriod } from "../../domain/enums/executive-reports.enum";
import { InvalidReportPeriodError } from "../../domain/errors/executive-reports-domain.errors";

describe("ReportPeriodService", () => {
  const service = new ReportPeriodService();

  it("computes a 24-hour window for DAILY", () => {
    const asOf = new Date("2026-01-08T00:00:00.000Z");
    const window = service.windowFor(ReportPeriod.DAILY, asOf);
    expect(window.end).toEqual(asOf);
    expect(asOf.getTime() - window.start.getTime()).toBe(24 * 60 * 60 * 1000);
  });

  it("computes a 7-day window for WEEKLY", () => {
    const asOf = new Date("2026-01-08T00:00:00.000Z");
    const window = service.windowFor(ReportPeriod.WEEKLY, asOf);
    expect(asOf.getTime() - window.start.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it("throws InvalidReportPeriodError for an unsupported period", () => {
    expect(() => service.windowFor("YEARLY" as never, new Date())).toThrow(InvalidReportPeriodError);
  });
});
