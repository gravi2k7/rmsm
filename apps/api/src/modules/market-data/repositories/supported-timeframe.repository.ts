import { Injectable } from "@nestjs/common";
import { prisma, DbClient, CandleInterval } from "@rmsm/database";
import { SupportedTimeframeModel } from "../interfaces/models/reference-data.models";
import { toSupportedTimeframeModel } from "./mappers/reference-data.mappers";

export interface CreateSupportedTimeframeInput {
  providerId: string;
  interval: CandleInterval;
}

@Injectable()
export class SupportedTimeframeRepository {
  /**
   * [providerId, interval] has no nullable component — a real `upsert`
   * is safe here, per the Phase 2 plan's carried-forward discipline note
   * (re-verify this specifically if the constraint's shape ever changes;
   * it hasn't).
   */
  async upsert(data: CreateSupportedTimeframeInput, client: DbClient = prisma): Promise<SupportedTimeframeModel> {
    const row = await client.supportedTimeframe.upsert({
      where: { providerId_interval: { providerId: data.providerId, interval: data.interval } },
      update: { isEnabled: true },
      create: { ...data, isEnabled: true },
    });
    return toSupportedTimeframeModel(row);
  }

  async findByProvider(providerId: string, client: DbClient = prisma): Promise<SupportedTimeframeModel[]> {
    const rows = await client.supportedTimeframe.findMany({ where: { providerId, isEnabled: true } });
    return rows.map(toSupportedTimeframeModel);
  }
}
