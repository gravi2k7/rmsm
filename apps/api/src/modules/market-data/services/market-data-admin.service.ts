import { Injectable } from "@nestjs/common";
import { NotFoundError } from "@rmsm/shared";
import type { ImportJobStatus } from "@rmsm/database";
import { MarketDataProviderConfigRepository } from "../repositories/market-data-provider-config.repository";
import { DataImportJobRepository } from "../repositories/data-import-job.repository";
import { MarketDataMetricsService } from "./market-data-metrics.service";
import type { MarketDataProviderConfigModel } from "../interfaces/models/reference-data.models";
import type { DataImportJobModel } from "../interfaces/models/operational.models";

export interface SynchronizationHealth {
  status: "ok" | "degraded";
  /** All-time count, not a rolling window — DataImportJobRepository.findByStatus() (Phase 2A) has no time-bound query, and Phase 4 forbids repository changes. A genuinely "recent failures" health signal needs that repository capability; flagged as a real, deferred gap rather than mislabeling an all-time count as "recent." */
  totalFailedImportCount: number;
}

/**
 * Admin/operational read surface — provider configuration (read-only,
 * no credential exposure) and synchronization/import status. Same
 * category as `MarketDataService`'s new-this-phase thin methods: the
 * necessary service-layer plumbing "controllers never touch a
 * repository" requires, not new business logic. Split into its own
 * service rather than folded into `MarketDataService` because its
 * audience is different — `MarketDataService` is the read API future
 * AI-10x engines consume; this is operator/admin tooling, the same
 * separation EP-005 drew between `NotificationService` and
 * `AdminNotificationController`'s own supporting logic.
 */
@Injectable()
export class MarketDataAdminService {
  constructor(
    private readonly providerConfigRepository: MarketDataProviderConfigRepository,
    private readonly importJobRepository: DataImportJobRepository,
    private readonly metrics: MarketDataMetricsService,
  ) {}

  listProviderConfigs(): Promise<MarketDataProviderConfigModel[]> {
    return this.providerConfigRepository.listActive();
  }

  async getProviderConfig(id: string): Promise<MarketDataProviderConfigModel> {
    const config = await this.providerConfigRepository.findById(id);
    if (!config) throw new NotFoundError("MarketDataProviderConfig", id);
    return config;
  }

  async getImportJob(id: string): Promise<DataImportJobModel> {
    const job = await this.importJobRepository.findById(id);
    if (!job) throw new NotFoundError("DataImportJob", id);
    return job;
  }

  listImportJobsByStatus(status: ImportJobStatus): Promise<DataImportJobModel[]> {
    return this.importJobRepository.findByStatus(status);
  }

  /**
   * A simple, named-threshold health signal — same judgment-call-not-
   * spec'd-SLA disposition as Module 005's dead-letter health check.
   * Uses an ALL-TIME failed-job count, not a rolling recent window (see
   * SynchronizationHealth's own comment for why) — a real limitation
   * that makes this a coarser signal than "is something wrong right
   * now," worth knowing before treating `degraded` as urgent.
   */
  async getSynchronizationHealth(): Promise<SynchronizationHealth> {
    const failedJobs = await this.importJobRepository.findByStatus("FAILED");
    const degraded = failedJobs.length > 20;
    return { status: degraded ? "degraded" : "ok", totalFailedImportCount: failedJobs.length };
  }

  getMetrics(): Record<string, number> {
    return this.metrics.snapshot();
  }
}
