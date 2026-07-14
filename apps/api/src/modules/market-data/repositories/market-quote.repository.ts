import { Injectable } from "@nestjs/common";
import { prisma, DbClient, MarketDataSource } from "@rmsm/database";
import { MarketQuoteModel } from "../interfaces/models/time-series.models";
import { toMarketQuoteModel } from "./mappers/time-series.mappers";

export interface CreateQuoteInput {
  instrumentId: string;
  bidPrice?: string;
  askPrice?: string;
  lastPrice?: string;
  bidSize?: string;
  askSize?: string;
  eventTime: Date;
  providerId: string;
  source: MarketDataSource;
  sourceTimestamp?: Date;
}

@Injectable()
export class MarketQuoteRepository {
  /** No idempotency constraint on MarketQuote (unlike MarketCandle) — a quote is a point-in-time snapshot, not an interval that can be "still forming," so every genuine tick is its own row by design. Re-delivery deduplication (if a provider redelivers the exact same quote twice) is a Phase 2C data-quality concern (DuplicateDetector), not this repository's. */
  async create(data: CreateQuoteInput, client: DbClient = prisma): Promise<MarketQuoteModel> {
    const row = await client.marketQuote.create({ data });
    return toMarketQuoteModel(row);
  }

  /** The "quote freshness" read path — latest quote per instrument, backed by the schema's `@@index([instrumentId, eventTime])`. */
  async findLatest(instrumentId: string, client: DbClient = prisma): Promise<MarketQuoteModel | null> {
    const row = await client.marketQuote.findFirst({
      where: { instrumentId },
      orderBy: { eventTime: "desc" },
    });
    return row ? toMarketQuoteModel(row) : null;
  }

  async findLatestForMany(instrumentIds: string[], client: DbClient = prisma): Promise<MarketQuoteModel[]> {
    // One query per instrument rather than a single grouped query — Prisma
    // 5.x has no native "latest per group" primitive without raw SQL, and
    // this project's standing rule (Module 004/005) is Prisma query
    // builder over raw SQL wherever avoidable. Real N+1 for a large
    // instrumentIds list — flagged as a genuine, named performance
    // follow-up for Phase 2C or later if this becomes a real hot path,
    // not silently accepted as fine.
    const results = await Promise.all(instrumentIds.map((id) => this.findLatest(id, client)));
    return results.filter((r): r is MarketQuoteModel => r !== null);
  }
}
