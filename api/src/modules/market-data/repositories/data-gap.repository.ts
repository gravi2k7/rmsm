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

  async findByInstrument(instrumentId: string, client: DbClient = prisma): Promise<DataGapModel[]> {
    const rows = await client.dataGap.findMany({ where: { instrumentId }, orderBy: { detectedAt: "desc" } });
    return rows.map(toDataGapModel);
  }

  /** Existing open gaps overlapping [start, end] for one instrument/interval — GapDetectionService's own dedup check, so a scan re-run doesn't create a second DataGap row for the same missing window. */
  async findOverlapping(
    instrumentId: string,
    interval: CandleInterval,
    start: Date,
    end: Date,
    client: DbClient = prisma,
  ): Promise<DataGapModel[]> {
    const rows = await client.dataGap.findMany({
      where: {
        instrumentId,
        interval,
        status: { in: ["DETECTED", "BACKFILLING"] },
        gapStart: { lt: end },
        gapEnd: { gt: start },
      },
    });
    return rows.map(toDataGapModel);
  }

  async markStatus(id: string, status: DataGapStatus, client: DbClient = prisma): Promise<DataGapModel> {
    const row = await client.dataGap.update({
      where: { id },
      data: { status, ...(status === "RESOLVED" ? { backfilledAt: new Date() } : {}) },
    });
    return toDataGapModel(row);
  }

  /** GapRepairService's own record of "an alternate provider's data resolved this gap" — distinct from markStatus(RESOLVED) alone, since Domain 7's "automatic gap repair using alternate providers" explicitly needs to know which provider did it, for audit and for gap reports. */
  async markRepaired(id: string, repairedByProviderId: string, client: DbClient = prisma): Promise<DataGapModel> {
    const row = await client.dataGap.update({
      where: { id },
      data: { status: "RESOLVED", backfilledAt: new Date(), repairedByProviderId },
    });
    return toDataGapModel(row);
  }

  async incrementRepairAttempts(id: string, client: DbClient = prisma): Promise<DataGapModel> {
    const row = await client.dataGap.update({ where: { id }, data: { repairAttempts: { increment: 1 } } });
    return toDataGapModel(row);
  }

  /** Gap statistics/report — counts grouped by status, for MonitoringController's "Gap Reports" dashboard tile. */
  async countByStatus(client: DbClient = prisma): Promise<Record<string, number>> {
    const groups = await client.dataGap.groupBy({ by: ["status"], _count: { _all: true } });
    const result: Record<string, number> = {};
    for (const g of groups as Array<{ status: string; _count: { _all: number } }>) {
      result[g.status] = g._count._all;
    }
    return result;
  }
}
