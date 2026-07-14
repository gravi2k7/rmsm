import { Injectable } from "@nestjs/common";
import { prisma, DbClient, DataQualityStatus } from "@rmsm/database";
import { DataQualityIssueModel } from "../interfaces/models/operational.models";
import { toDataQualityIssueModel } from "./mappers/operational.mappers";

export interface CreateDataQualityIssueInput {
  instrumentId?: string;
  importJobId?: string;
  issueType: string;
  severity?: string;
  description: string;
}

@Injectable()
export class DataQualityIssueRepository {
  async create(data: CreateDataQualityIssueInput, client: DbClient = prisma): Promise<DataQualityIssueModel> {
    const row = await client.dataQualityIssue.create({ data });
    return toDataQualityIssueModel(row);
  }

  async findByStatus(status: DataQualityStatus, take: number, client: DbClient = prisma): Promise<DataQualityIssueModel[]> {
    const rows = await client.dataQualityIssue.findMany({
      where: { status },
      orderBy: { detectedAt: "desc" },
      take,
    });
    return rows.map(toDataQualityIssueModel);
  }

  async findByInstrument(instrumentId: string, client: DbClient = prisma): Promise<DataQualityIssueModel[]> {
    const rows = await client.dataQualityIssue.findMany({ where: { instrumentId }, orderBy: { detectedAt: "desc" } });
    return rows.map(toDataQualityIssueModel);
  }

  async updateStatus(id: string, status: DataQualityStatus, client: DbClient = prisma): Promise<DataQualityIssueModel> {
    const row = await client.dataQualityIssue.update({
      where: { id },
      data: { status, ...(status === "CORRECTED" || status === "IGNORED" ? { resolvedAt: new Date() } : {}) },
    });
    return toDataQualityIssueModel(row);
  }
}
