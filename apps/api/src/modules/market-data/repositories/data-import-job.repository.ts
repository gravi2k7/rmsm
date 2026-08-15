import { Injectable } from "@nestjs/common";
import {
  prisma,
  DbClient,
  ImportJobStatus,
  CandleInterval,
} from "@rmsm/database";
import { DataImportJobModel } from "../interfaces/models/operational.models";
import { toDataImportJobModel } from "./mappers/operational.mappers";

export interface CreateDataImportJobInput {
  providerId: string;
  jobType: string;

  // FIP-001 — optional so all existing Phase-3 callers remain valid.
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

  async recordBatchProgress(
    id: string,
    completedBatches: number,
    resumeCursor: Date,
    recordsProcessedDelta: number,
    recordsFailedDelta: number,
    client: DbClient = prisma,
  ): Promise<DataImportJobModel> {
    const current = await client.dataImportJob.findUnique({
      where: { id },
    });

    const row = await client.dataImportJob.update({
      where: { id },
      data: {
        completedBatches,
        resumeCursor,
        recordsProcessed:
          (current?.recordsProcessed ?? 0) + recordsProcessedDelta,
        recordsFailed:
          (current?.recordsFailed ?? 0) + recordsFailedDelta,
      },
    });

    return toDataImportJobModel(row);
  }

  async findDueForScheduling(
    now: Date,
    take: number,
    client: DbClient = prisma,
  ): Promise<DataImportJobModel[]> {
    const rows = await client.dataImportJob.findMany({
      where: {
        status: "PENDING",
        OR: [
          { scheduledFor: null },
          { scheduledFor: { lte: now } },
        ],
      },
      orderBy: [
        { priority: "asc" },
        { createdAt: "asc" },
      ],
      take,
    });

    return rows.map(toDataImportJobModel);
  }

  async findResumable(
    client: DbClient = prisma,
  ): Promise<DataImportJobModel[]> {
    const rows = await client.dataImportJob.findMany({
      where: {
        status: "RUNNING",
        resumeCursor: { not: null },
      },
      orderBy: { updatedAt: "asc" },
    });

    return rows.map(toDataImportJobModel);
  }

  async findRetryable(
    maxRetries: number,
    client: DbClient = prisma,
  ): Promise<DataImportJobModel[]> {
    const rows = await client.dataImportJob.findMany({
      where: {
        status: "FAILED",
        retryCount: { lt: maxRetries },
      },
      orderBy: { updatedAt: "asc" },
    });

    return rows.map(toDataImportJobModel);
  }

  async createRetryJob(
    parent: DataImportJobModel,
    client: DbClient = prisma,
  ): Promise<DataImportJobModel> {
    const retryRow = await client.dataImportJob.create({
      data: {
        providerId: parent.providerId,
        jobType: parent.jobType,
        instrumentId: parent.instrumentId,
        interval: parent.interval,
        dateRangeStart:
          parent.resumeCursor ?? parent.dateRangeStart,
        dateRangeEnd: parent.dateRangeEnd,
        isIncremental: parent.isIncremental,
        priority: parent.priority,
        parentJobId: parent.id,
        status: "PENDING",
      },
    });

    await client.dataImportJob.update({
      where: { id: parent.id },
      data: {
        retryCount: { increment: 1 },
      },
    });

    return toDataImportJobModel(retryRow);
  }

  async findByProvider(
    providerId: string,
    take: number,
    client: DbClient = prisma,
  ): Promise<DataImportJobModel[]> {
    const rows = await client.dataImportJob.findMany({
      where: { providerId },
      orderBy: { createdAt: "desc" },
      take,
    });

    return rows.map(toDataImportJobModel);
  }

  async countByStatus(
    client: DbClient = prisma,
  ): Promise<Record<string, number>> {
    const groups = await client.dataImportJob.groupBy({
      by: ["status"],
      _count: { _all: true },
    });

    const result: Record<string, number> = {};

    for (const group of groups) {
      result[group.status] = group._count._all;
    }

    return result;
  }

}
