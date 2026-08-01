import { Injectable } from "@nestjs/common";
import { NotFoundError } from "@rmsm/shared";
import { DataImportJobRepository } from "../repositories/data-import-job.repository";
import { DataQualityIssueRepository } from "../repositories/data-quality-issue.repository";

export interface ValidationReport {
  importJobId: string;
  recordsProcessed: number;
  recordsFailed: number;
  issueCountByType: Record<string, number>;
  issueCountBySeverity: Record<string, number>;
  issues: Array<{ issueType: string; severity: string; description: string; detectedAt: Date }>;
}

/**
 * FIP-001 Domain 5's explicit "Generate validation report" requirement —
 * the one Domain 5 capability the existing normalization/validation
 * layer (candle.validator.ts, quote.validator.ts, tick.validator.ts,
 * duplicate-detector.ts — all pre-existing, real, and left untouched)
 * never had a consumer for: every rejected record is already recorded as
 * a `DataQualityIssue` row (HistoricalImportService's existing
 * `runFetchValidatePersist`), but nothing previously read them back as a
 * structured report. This service is a pure read/aggregate — it detects
 * nothing new itself.
 */
@Injectable()
export class ValidationReportService {
  constructor(
    private readonly importJobRepository: DataImportJobRepository,
    private readonly qualityIssueRepository: DataQualityIssueRepository,
  ) {}

  async generateForImportJob(importJobId: string): Promise<ValidationReport> {
    const job = await this.importJobRepository.findById(importJobId);
    if (!job) throw new NotFoundError("DataImportJob", importJobId);

    const issues = await this.qualityIssueRepository.findByImportJob(importJobId);

    const issueCountByType: Record<string, number> = {};
    const issueCountBySeverity: Record<string, number> = {};
    for (const issue of issues) {
      issueCountByType[issue.issueType] = (issueCountByType[issue.issueType] ?? 0) + 1;
      const severity = issue.severity ?? "unknown";
      issueCountBySeverity[severity] = (issueCountBySeverity[severity] ?? 0) + 1;
    }

    return {
      importJobId,
      recordsProcessed: job.recordsProcessed,
      recordsFailed: job.recordsFailed,
      issueCountByType,
      issueCountBySeverity,
      issues: issues.map((i) => ({ issueType: i.issueType, severity: i.severity ?? "unknown", description: i.description, detectedAt: i.detectedAt })),
    };
  }
}
