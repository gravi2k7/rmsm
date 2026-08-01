import { ValidationReportService } from "../validation-report.service";
import type { DataImportJobRepository } from "../../repositories/data-import-job.repository";
import type { DataQualityIssueRepository } from "../../repositories/data-quality-issue.repository";
import { NotFoundError } from "@rmsm/shared";

function buildService(job: unknown, issues: unknown[]) {
  const importJobRepository = { findById: jest.fn().mockResolvedValue(job) } as unknown as DataImportJobRepository;
  const qualityIssueRepository = { findByImportJob: jest.fn().mockResolvedValue(issues) } as unknown as DataQualityIssueRepository;
  return { service: new ValidationReportService(importJobRepository, qualityIssueRepository) };
}

describe("ValidationReportService", () => {
  it("throws NotFoundError when the import job does not exist", async () => {
    const { service } = buildService(null, []);
    await expect(service.generateForImportJob("missing")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("aggregates issue counts by type and severity", async () => {
    const job = { id: "job1", recordsProcessed: 100, recordsFailed: 3 };
    const issues = [
      { issueType: "invalid_candle", severity: "high", description: "bad ohlc", detectedAt: new Date() },
      { issueType: "invalid_candle", severity: "high", description: "bad ohlc 2", detectedAt: new Date() },
      { issueType: "duplicate_candle", severity: "medium", description: "dup", detectedAt: new Date() },
    ];
    const { service } = buildService(job, issues);

    const report = await service.generateForImportJob("job1");

    expect(report.importJobId).toBe("job1");
    expect(report.recordsProcessed).toBe(100);
    expect(report.recordsFailed).toBe(3);
    expect(report.issueCountByType).toEqual({ invalid_candle: 2, duplicate_candle: 1 });
    expect(report.issueCountBySeverity).toEqual({ high: 2, medium: 1 });
    expect(report.issues).toHaveLength(3);
  });

  it("returns empty counts when there are no issues", async () => {
    const job = { id: "job2", recordsProcessed: 50, recordsFailed: 0 };
    const { service } = buildService(job, []);

    const report = await service.generateForImportJob("job2");

    expect(report.issueCountByType).toEqual({});
    expect(report.issueCountBySeverity).toEqual({});
    expect(report.issues).toEqual([]);
  });
});
