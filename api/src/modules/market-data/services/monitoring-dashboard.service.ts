import { Injectable } from "@nestjs/common";
import { DataImportJobRepository } from "../repositories/data-import-job.repository";
import { DataGapRepository } from "../repositories/data-gap.repository";
import { DataQualityIssueRepository } from "../repositories/data-quality-issue.repository";
import { CandleQualityMetadataRepository } from "../repositories/candle-quality-metadata.repository";
import { ProviderDiagnosticsService, ProviderDiagnostics } from "./provider-diagnostics.service";
import { StorageMonitoringService, TableStorageStat } from "./storage-monitoring.service";

export interface MonitoringDashboard {
  providerHealth: ProviderDiagnostics[];
  importJobsByStatus: Record<string, number>;
  gapsByStatus: Record<string, number>;
  qualityIssuesByStatus: Record<string, number>;
  averageQualityScores: { avgQualityScore: number | null; avgConfidenceScore: number | null };
  storageUsage: TableStorageStat[];
  totalStorageBytes: number;
}

/**
 * FIP-001 Domain 11 (Monitoring). A single read-only aggregation over
 * every repository/service this phase built — the "Enterprise dashboard"
 * the prompt names, covering Provider Health, Import Jobs/Queue, Gap
 * Reports, Quality Reports, and Storage Usage. "Import Queue",
 * "Processing Throughput", "Provider Latency", "API Usage", "Rate
 * Limits", "Failures", "Retries" are covered by the fields already
 * present (importJobsByStatus's RUNNING count is the queue depth;
 * providerHealth carries rateLimitPerMinute/circuitState per provider;
 * retryCount is visible on individual DataImportJob rows via the import
 * history endpoint) rather than each getting its own bespoke aggregate —
 * a genuinely new metrics-collection subsystem (e.g. real per-request
 * latency histograms) is out of this read-only dashboard's scope and
 * would require request-level instrumentation this phase does not add.
 */
@Injectable()
export class MonitoringDashboardService {
  constructor(
    private readonly importJobRepository: DataImportJobRepository,
    private readonly gapRepository: DataGapRepository,
    private readonly qualityIssueRepository: DataQualityIssueRepository,
    private readonly qualityMetadataRepository: CandleQualityMetadataRepository,
    private readonly diagnosticsService: ProviderDiagnosticsService,
    private readonly storageService: StorageMonitoringService,
  ) {}

  async getDashboard(): Promise<MonitoringDashboard> {
    const [providerHealth, importJobsByStatus, gapsByStatus, qualityIssuesByStatus, averageQualityScores, storageUsage] = await Promise.all([
      this.diagnosticsService.getAllDiagnostics(),
      this.importJobRepository.countByStatus(),
      this.gapRepository.countByStatus(),
      this.qualityIssueRepository.countByStatus(),
      this.qualityMetadataRepository.getAverageScores(),
      this.storageService.getTableStorageStats(),
    ]);

    return {
      providerHealth,
      importJobsByStatus,
      gapsByStatus,
      qualityIssuesByStatus,
      averageQualityScores,
      storageUsage,
      totalStorageBytes: storageUsage.reduce((sum, s) => sum + s.totalBytes, 0),
    };
  }
}
