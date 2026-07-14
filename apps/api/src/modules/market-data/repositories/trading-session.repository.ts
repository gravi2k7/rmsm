import { Injectable } from "@nestjs/common";
import { prisma, DbClient, TradingSessionType } from "@rmsm/database";
import { TradingSessionModel } from "../interfaces/models/reference-data.models";
import { toTradingSessionModel } from "./mappers/reference-data.mappers";

export interface CreateTradingSessionInput {
  exchangeId: string;
  type: TradingSessionType;
  openTime: string;
  closeTime: string;
  dayOfWeek?: number;
}

@Injectable()
export class TradingSessionRepository {
  async create(data: CreateTradingSessionInput, client: DbClient = prisma): Promise<TradingSessionModel> {
    const row = await client.tradingSession.create({ data });
    return toTradingSessionModel(row);
  }

  /** Every active session row for an exchange — the primitive SessionValidator (Phase 2C's contracts/workflow.contracts.ts) will build its actual validation logic on top of. */
  async findByExchange(exchangeId: string, client: DbClient = prisma): Promise<TradingSessionModel[]> {
    const rows = await client.tradingSession.findMany({ where: { exchangeId, isActive: true } });
    return rows.map(toTradingSessionModel);
  }
}
