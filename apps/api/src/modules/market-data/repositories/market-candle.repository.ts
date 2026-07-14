import { Injectable } from "@nestjs/common";
import { prisma, DbClient, CandleInterval, MarketDataSource, MarketCandle } from "@rmsm/database";
import { MarketCandleModel } from "../interfaces/models/time-series.models";
import { toMarketCandleModel } from "./mappers/time-series.mappers";

export interface UpsertCandleInput {
  instrumentId: string;
  interval: CandleInterval;
  eventTime: Date;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  providerId: string;
  source: MarketDataSource;
  importJobId?: string;
  sourceTimestamp?: Date;
}

export interface CreateCorrectionInput extends UpsertCandleInput {
  supersedesId: string;
}

export interface CandleRangeQuery {
  instrumentId: string;
  interval: CandleInterval;
  from: Date;
  to: Date;
  limit: number;
}

@Injectable()
export class MarketCandleRepository {
  /**
   * Idempotent ingestion for a STILL-FORMING candle — [instrumentId,
   * interval, eventTime, source] has no nullable component, so a real
   * `upsert` is safe and correct here. This is deliberately distinct from
   * a correction (createCorrection() below): a live 1-minute candle
   * legitimately gets its OHLCV values updated multiple times as trades
   * arrive during that minute — that's not a "historical correction"
   * (ADR-022), it's the candle simply not being closed/final yet.
   * ADR-022's "never overwrite" rule applies to CLOSED historical data;
   * this method is for data that hasn't closed yet.
   */
  async upsert(data: UpsertCandleInput, client: DbClient = prisma): Promise<MarketCandleModel> {
    const row = await client.marketCandle.upsert({
      where: {
        instrumentId_interval_eventTime_source: {
          instrumentId: data.instrumentId,
          interval: data.interval,
          eventTime: data.eventTime,
          source: data.source,
        },
      },
      update: {
        open: data.open,
        high: data.high,
        low: data.low,
        close: data.close,
        volume: data.volume,
        receivedAt: new Date(),
      },
      create: data,
    });
    return toMarketCandleModel(row);
  }

  /**
   * The ADR-022 path: always a NEW row, never an update to the row it
   * replaces. `supersedesId` is `@unique` in the schema, so attempting to
   * supersede the same row twice fails at the database level, not just
   * by convention.
   */
  async createCorrection(data: CreateCorrectionInput, client: DbClient = prisma): Promise<MarketCandleModel> {
    const row = await client.marketCandle.create({ data: { ...data, isCorrection: true } });
    return toMarketCandleModel(row);
  }

  async findById(id: string, client: DbClient = prisma): Promise<MarketCandleModel | null> {
    const row = await client.marketCandle.findUnique({ where: { id } });
    return row ? toMarketCandleModel(row) : null;
  }

  /**
   * The "latest non-superseded value" read path the Phase 2 plan
   * explicitly required as a first-class repository method, not
   * something every caller reconstructs with an ad-hoc filter. A row is
   * superseded if some OTHER row's `supersedesId` points at it — modeled
   * here as "exclude rows that appear as a target of any
   * `supersedesId`," via a `NOT IN` subquery expressed through Prisma's
   * relation filter, not a raw SQL string.
   */
  async findRangeCurrentValues(query: CandleRangeQuery, client: DbClient = prisma): Promise<MarketCandleModel[]> {
    const rows = await client.marketCandle.findMany({
      where: {
        instrumentId: query.instrumentId,
        interval: query.interval,
        eventTime: { gte: query.from, lte: query.to },
        supersededBy: null,
      },
      orderBy: { eventTime: "asc" },
      take: query.limit,
    });
    return rows.map(toMarketCandleModel);
  }

  /** Every row in a correction's history for one logical candle, oldest first — the full audit trail, not just the current value. */
  async findCorrectionChain(candleId: string, client: DbClient = prisma): Promise<MarketCandleModel[]> {
    const chain: MarketCandleModel[] = [];
    let currentId: string | null = candleId;
    // Walk backwards via supersedesId until reaching the original
    // (non-correction) row — bounded by the chain's actual length, no
    // artificial iteration cap needed since supersedesId is @unique
    // (each row supersedes at most one other, so this can't loop).
    while (currentId) {
      const row: MarketCandle | null = await client.marketCandle.findUnique({ where: { id: currentId } });
      if (!row) break;
      chain.unshift(toMarketCandleModel(row));
      currentId = row.supersedesId;
    }
    return chain;
  }
}
