import { Injectable } from "@nestjs/common";
import { prisma, DbClient, MarketDataSource } from "@rmsm/database";
import { MarketTickModel } from "../interfaces/models/time-series.models";
import { toMarketTickModel } from "./mappers/time-series.mappers";

export interface CreateTickInput {
  instrumentId: string;
  price: string;
  size: string;
  eventTime: Date;
  providerId: string;
  source: MarketDataSource;
  sourceTimestamp?: Date;
}

@Injectable()
export class MarketTickRepository {
  async create(data: CreateTickInput, client: DbClient = prisma): Promise<MarketTickModel> {
    const row = await client.marketTick.create({ data });
    return toMarketTickModel(row);
  }

  async findRange(instrumentId: string, from: Date, to: Date, limit: number, client: DbClient = prisma): Promise<MarketTickModel[]> {
    const rows = await client.marketTick.findMany({
      where: { instrumentId, eventTime: { gte: from, lte: to } },
      orderBy: { eventTime: "asc" },
      take: limit,
    });
    return rows.map(toMarketTickModel);
  }
}
