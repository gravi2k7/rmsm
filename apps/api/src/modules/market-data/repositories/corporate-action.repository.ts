import { Injectable } from "@nestjs/common";
import { prisma, DbClient, CorporateActionType, MarketDataSource } from "@rmsm/database";
import { CorporateActionModel } from "../interfaces/models/time-series.models";
import { toCorporateActionModel } from "./mappers/time-series.mappers";

export interface CreateCorporateActionInput {
  instrumentId: string;
  type: CorporateActionType;
  effectiveDate: Date;
  value: string;
  announcedAt?: Date;
  providerId: string;
  source: MarketDataSource;
}

@Injectable()
export class CorporateActionRepository {
  async create(data: CreateCorporateActionInput, client: DbClient = prisma): Promise<CorporateActionModel> {
    const row = await client.corporateAction.create({ data });
    return toCorporateActionModel(row);
  }

  async findByInstrument(instrumentId: string, client: DbClient = prisma): Promise<CorporateActionModel[]> {
    const rows = await client.corporateAction.findMany({
      where: { instrumentId },
      orderBy: { effectiveDate: "asc" },
    });
    return rows.map(toCorporateActionModel);
  }
}
