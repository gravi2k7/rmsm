import { Injectable } from "@nestjs/common";
import { prisma, DbClient, ImportJobStatus } from "@rmsm/database";
import { DataImportJobModel } from "../interfaces/models/operational.models";
import { toDataImportJobModel } from "./mappers/operational.mappers";

export interface CreateDataImportJobInput {
  providerId: string;
  jobType: string;
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
}
