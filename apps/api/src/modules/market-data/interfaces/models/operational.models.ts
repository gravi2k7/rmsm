import type {
  ImportJobStatus,
  DataQualityStatus,
  DataGapStatus,
  CandleInterval,
} from "@rmsm/database";

/** See reference-data.models.ts's header comment for the domain-model / no-Prisma-objects rule these all follow. None of these three models have any Decimal-typed columns, so their mapper (repositories/mappers/operational.mappers.ts) is a structural pass-through, not a value-converting one — noted so its simplicity isn't mistaken for an incomplete mapper. */

export interface DataImportJobModel {
  id: string;
  providerId: string;
  jobType: string;
  status: ImportJobStatus;
  startedAt: Date | null;
  completedAt: Date | null;
  recordsProcessed: number;
  recordsFailed: number;
  errorSummary: string | null;

  // FIP-001 — batching / resume / scheduling / retry.
  instrumentId: string | null;
  interval: CandleInterval | null;
  dateRangeStart: Date | null;
  dateRangeEnd: Date | null;
  isIncremental: boolean;
  priority: number;
  scheduledFor: Date | null;
  resumeCursor: Date | null;
  parentJobId: string | null;
  totalBatches: number | null;
  completedBatches: number;
  retryCount: number;

  createdAt: Date;
  updatedAt: Date;
}

export interface DataQualityIssueModel {
  id: string;
  instrumentId: string | null;
  importJobId: string | null;
  issueType: string;
  status: DataQualityStatus;
  severity: string;
  description: string;
  detectedAt: Date;
  resolvedAt: Date | null;
}

export interface DataGapModel {
  id: string;
  instrumentId: string;
  interval: CandleInterval;
  gapStart: Date;
  gapEnd: Date;
  status: DataGapStatus;
  detectedAt: Date;
  backfilledAt: Date | null;

  // FIP-001 — alternate-provider repair tracking.
  repairedByProviderId: string | null;
  repairAttempts: number;
}
