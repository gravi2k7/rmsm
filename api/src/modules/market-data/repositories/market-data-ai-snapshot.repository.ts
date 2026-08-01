import { Injectable } from "@nestjs/common";
import { prisma, DbClient, CandleInterval } from "@rmsm/database";
import { MarketDataAiSnapshotModel } from "../interfaces/models/operational.models";
import { toMarketDataAiSnapshotModel } from "./mappers/operational.mappers";

export interface UpsertMarketDataAiSnapshotInput {
  instrumentId: string;
  interval: CandleInterval;
  eventTime: Date;
  trend?: string;
  volatility?: string;
  liquidity?: string;
  confidence?: number;
  session?: string;
  spread?: number;
  marketRegime?: string;
  anomalyFlags?: string[];
}

/** FIP-001 Domain 12 (AI Readiness) — one snapshot row per (instrument, interval, eventTime), computed by AiReadinessService and read by future AI modules. */
@Injectable()
export class MarketDataAiSnapshotRepository {
  async upsert(data: UpsertMarketDataAiSnapshotInput, client: DbClient = prisma): Promise<MarketDataAiSnapshotModel> {
    const row = await client.marketDataAiSnapshot.upsert({
      where: {
        instrumentId_interval_eventTime: {
          instrumentId: data.instrumentId,
          interval: data.interval,
          eventTime: data.eventTime,
        },
      },
      create: { ...data },
      update: { ...data, computedAt: new Date() },
    });
    return toMarketDataAiSnapshotModel(row);
  }

  async findForBar(
    instrumentId: string,
    interval: CandleInterval,
    eventTime: Date,
    client: DbClient = prisma,
  ): Promise<MarketDataAiSnapshotModel | null> {
    const row = await client.marketDataAiSnapshot.findUnique({
      where: { instrumentId_interval_eventTime: { instrumentId, interval, eventTime } },
    });
    return row ? toMarketDataAiSnapshotModel(row) : null;
  }

  async findLatest(instrumentId: string, interval: CandleInterval, client: DbClient = prisma): Promise<MarketDataAiSnapshotModel | null> {
    const row = await client.marketDataAiSnapshot.findFirst({
      where: { instrumentId, interval },
      orderBy: { eventTime: "desc" },
    });
    return row ? toMarketDataAiSnapshotModel(row) : null;
  }
}
