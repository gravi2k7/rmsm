import { Injectable } from "@nestjs/common";
import { prisma, DbClient, ImportJobStatus, CandleInterval } from "@rmsm/database";
import { DataImportJobModel } from "../interfaces/models/operational.models";
import { toDataImportJobModel } from "./mappers/operational.mappers";

export interface CreateDataImportJobInput {
  providerId: string;
  jobType: string;
  // FIP-001 additions — all optional so the original Phase-3 single-shot
  // call site (HistoricalImportService's original `{providerId, jobType}`
  // call) still compiles and behaves identically.
  instrumentId?: string;
  interval?: CandleInterval;
  dateRangeStart?: Date;
  dateRangeEnd?: Date;
  isIncremental?: boolean;
  priority?: number;
  scheduledFor?: Date;
  parentJobId?: string;
  totalBatches?: number;
}

@Injectable()
export class DataImportJobRepository {
  async create(data: CreateDataImportJobInput, client: DbClient = prisma): Promise<DataImportJobModel> {
    const row = await client.dataImportJob.create({ data: { ...data, status: "PENDING" } });
    return toDataImportJobModel(row);
  }

  async findById(id: string, client: DbClient = prisma): Promise<DataImportJobModel | null> {
    const row = await client.dataImportJob.findUnique({ where: { id } });
    return row ? toDataImportJobModel(row) : null;
  }

  async markRunning(id: string, client: DbClient = prisma): Promise<DataImportJobModel> {
    const row = await client.dataImportJob.update({ where: { id }, data: { status: "RUNNING", startedAt: new Date() } });
    return toDataImportJobModel(row);
  }

  async markCompleted(id: string, recordsProcessed: number, recordsFailed: number, client: DbClient = prisma): Promise<DataImportJobModel> {
    const row = await client.dataImportJob.update({
      where: { id },
      data: {
        status: recordsFailed > 0 ? "PARTIAL" : "COMPLETED",
        completedAt: new Date(),
        recordsProcessed,
        recordsFailed,
      },
    });
    return toDataImportJobModel(row);
  }

  async markFailed(id: string, errorSummary: string, client: DbClient = prisma): Promise<DataImportJobModel> {
    const row = await client.dataImportJob.update({
      where: { id },
      data: { status: "FAILED", completedAt: new Date(), errorSummary },
    });
    return toDataImportJobModel(row);
  }

  async findByStatus(status: ImportJobStatus, client: DbClient = prisma): Promise<DataImportJobModel[]> {
    const rows = await client.dataImportJob.findMany({ where: { status }, orderBy: { createdAt: "desc" } });
    return rows.map(toDataImportJobModel);
  }

  // ── FIP-001 additions: batching / resume / scheduling / retry ──

  /** Accumulates progress after one successful batch, without touching status — the RUNNING job's own progress counters, read by ImportDiagnosticsService's "progress tracking" and by a resumed job to pick up where it left off. */
  async recordBatchProgress(
    id: string,
    completedBatches: number,
    resumeCursor: Date,
    recordsProcessedDelta: number,
    recordsFailedDelta: number,
    client: DbClient = prisma,
  ): Promise<DataImportJobModel> {
    const current = await client.dataImportJob.findUnique({ where: { id } });
    const row = await client.dataImportJob.update({
      where: { id },
      data: {
        completedBatches,
        resumeCursor,
        recordsProcessed: (current?.recordsProcessed ?? 0) + recordsProcessedDelta,
        recordsFailed: (current?.recordsFailed ?? 0) + recordsFailedDelta,
      },
    });
    return toDataImportJobModel(row);
  }

  /** Due-now scheduled/queued jobs, in priority order (lower first), then oldest-created first within the same priority — ImportSchedulerService's own poll query. */
  async findDueForScheduling(now: Date, take: number, client: DbClient = prisma): Promise<DataImportJobModel[]> {
    const rows = await client.dataImportJob.findMany({
      where: { status: "PENDING", OR: [{ scheduledFor: null }, { scheduledFor: { lte: now } }] },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      take,
    });
    return rows.map(toDataImportJobModel);
  }

  /** RUNNING jobs whose resumeCursor proves at least one batch persisted before the interruption — ImportSchedulerService's resume sweep excludes jobs that never got that far (those are just retried from scratch, not resumed). */
  async findResumable(client: DbClient = prisma): Promise<DataImportJobModel[]> {
    const rows = await client.dataImportJob.findMany({
      where: { status: "RUNNING", resumeCursor: { not: null } },
      orderBy: { updatedAt: "asc" },
    });
    return rows.map(toDataImportJobModel);
  }

  /** FAILED jobs under the retry ceiling — the source set for "retry failed batches" (Domain 3). retryCount is incremented by createRetryJob below, not here. */
  async findRetryable(maxRetries: number, client: DbClient = prisma): Promise<DataImportJobModel[]> {
    const rows = await client.dataImportJob.findMany({
      where: { status: "FAILED", retryCount: { lt: maxRetries } },
      orderBy: { updatedAt: "asc" },
    });
    return rows.map(toDataImportJobModel);
  }

  /** Spawns a child job covering [resumeFrom ?? dateRangeStart, dateRangeEnd] linked back to the failed parent via parentJobId, and increments the parent's retryCount so findRetryable eventually excludes it once the ceiling is hit. */
  async createRetryJob(parent: DataImportJobModel, client: DbClient = prisma): Promise<DataImportJobModel> {
    const retryRow = await client.dataImportJob.create({
      data: {
        providerId: parent.providerId,
        jobType: parent.jobType,
        instrumentId: parent.instrumentId,
        interval: parent.interval,
        dateRangeStart: parent.resumeCursor ?? parent.dateRangeStart,
        dateRangeEnd: parent.dateRangeEnd,
        isIncremental: parent.isIncremental,
        priority: parent.priority,
        parentJobId: parent.id,
        status: "PENDING",
      },
    });
    await client.dataImportJob.update({ where: { id: parent.id }, data: { retryCount: { increment: 1 } } });
    return toDataImportJobModel(retryRow);
  }

  /** Import history — every job for one provider, newest first, for ImportDiagnosticsService's "import history" endpoint. */
  async findByProvider(providerId: string, take: number, client: DbClient = prisma): Promise<DataImportJobModel[]> {
    const rows = await client.dataImportJob.findMany({ where: { providerId }, orderBy: { createdAt: "desc" }, take });
    return rows.map(toDataImportJobModel);
  }

  /** Import statistics — counts grouped by status, for ImportDiagnosticsService's "import statistics" endpoint. */
  async countByStatus(client: DbClient = prisma): Promise<Record<string, number>> {
    const groups = await client.dataImportJob.groupBy({ by: ["status"], _count: { _all: true } });
    const result: Record<string, number> = {};
    for (const g of groups as Array<{ status: string; _count: { _all: number } }>) {
      result[g.status] = g._count._all;
    }
    return result;
  }
}
