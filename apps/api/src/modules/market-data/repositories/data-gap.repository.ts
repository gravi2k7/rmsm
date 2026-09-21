import { Injectable } from "@nestjs/common";
import { prisma, DbClient, CandleInterval, DataGapStatus } from "@rmsm/database";
import { DataGapModel } from "../interfaces/models/operational.models";
import { toDataGapModel } from "./mappers/operational.mappers";

export interface CreateDataGapInput {
  instrumentId: string;
  interval: CandleInterval;
  gapStart: Date;
  gapEnd: Date;
}

@Injectable()
export class DataGapRepository {
  async create(data: CreateDataGapInput, client: DbClient = prisma): Promise<DataGapModel> {
    const row = await client.dataGap.create({ data });
    return toDataGapModel(row);
  }

  async findById(id: string, client: DbClient = prisma): Promise<DataGapModel | null> {
    const row = await client.dataGap.findUnique({ where: { id } });
    return row ? toDataGapModel(row) : null;
  }

  async findByStatus(status: DataGapStatus, take: number, client: DbClient = prisma): Promise<DataGapModel[]> {
    const rows = await client.dataGap.findMany({ where: { status }, orderBy: { detectedAt: "asc" }, take });
    return rows.map(toDataGapModel);
  }

  async markStatus(id: string, status: DataGapStatus, client: DbClient = prisma): Promise<DataGapModel> {
    const row = await client.dataGap.update({
      where: { id },
      data: {
        status,
        ...(status === "RESOLVED" ? { backfilledAt: new Date() } : {}),
      },
    });
    return toDataGapModel(row);
  }

  async findOverlapping(
    data: {
      instrumentId: string;
      interval: CandleInterval;
      gapStart: Date;
      gapEnd: Date;
      statuses?: DataGapStatus[];
    },
    client: DbClient = prisma,
  ): Promise<DataGapModel[]> {
    const rows = await client.dataGap.findMany({
      where: {
        instrumentId: data.instrumentId,
        interval: data.interval,
        gapStart: { lte: data.gapEnd },
        gapEnd: { gte: data.gapStart },
        ...(data.statuses?.length
          ? { status: { in: data.statuses } }
          : {}),
      },
      orderBy: { gapStart: "asc" },
    });

    return rows.map(toDataGapModel);
  }

  async incrementRepairAttempts(
    id: string,
    client: DbClient = prisma,
  ): Promise<DataGapModel> {
    const row = await client.dataGap.update({
      where: { id },
      data: {
        repairAttempts: {
          increment: 1,
        },
      },
    });

    return toDataGapModel(row);
  }

  async markRepaired(
    id: string,
    providerId: string,
    client: DbClient = prisma,
  ): Promise<DataGapModel> {
    const row = await client.dataGap.update({
      where: { id },
      data: {
        status: DataGapStatus.RESOLVED,
        backfilledAt: new Date(),
        repairedByProviderId: providerId,
      },
    });

    return toDataGapModel(row);
  }
}
