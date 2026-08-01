import { Injectable } from "@nestjs/common";
import { prisma, DbClient, CandleInterval } from "@rmsm/database";
import { toInputJsonValue } from "@rmsm/shared";
import { DerivedIndicatorSnapshotModel } from "../interfaces/models/operational.models";
import { toDerivedIndicatorSnapshotModel } from "./mappers/operational.mappers";

export interface UpsertDerivedIndicatorSnapshotInput {
  instrumentId: string;
  interval: CandleInterval;
  eventTime: Date;
  indicatorKey: string;
  outputs: Record<string, unknown>;
}

/**
 * FIP-001 Domain 10 (Derived Data Pipeline) — persists technical-
 * indicator output for AI consumption. Written by `DerivedDataService`
 * (this phase), which computes ATR/RSI/EMA/SMA/MACD/Bollinger/VWAP/
 * Pivot Points/trend/volatility directly (see that service's own header
 * comment for why it does not delegate to the separate `indicator-
 * engine` module — that module's own `IndicatorFactoryService` has zero
 * registered `calculate()` implementations as of this phase, so it
 * cannot compute anything yet).
 */
@Injectable()
export class DerivedIndicatorSnapshotRepository {
  async upsert(data: UpsertDerivedIndicatorSnapshotInput, client: DbClient = prisma): Promise<DerivedIndicatorSnapshotModel> {
    const row = await client.derivedIndicatorSnapshot.upsert({
      where: {
        instrumentId_interval_eventTime_indicatorKey: {
          instrumentId: data.instrumentId,
          interval: data.interval,
          eventTime: data.eventTime,
          indicatorKey: data.indicatorKey,
        },
      },
      create: { ...data, outputs: toInputJsonValue(data.outputs) },
      update: { outputs: toInputJsonValue(data.outputs), computedAt: new Date() },
    });
    return toDerivedIndicatorSnapshotModel(row);
  }

  async findForBar(
    instrumentId: string,
    interval: CandleInterval,
    eventTime: Date,
    client: DbClient = prisma,
  ): Promise<DerivedIndicatorSnapshotModel[]> {
    const rows = await client.derivedIndicatorSnapshot.findMany({ where: { instrumentId, interval, eventTime } });
    return rows.map(toDerivedIndicatorSnapshotModel);
  }

  async findLatest(
    instrumentId: string,
    interval: CandleInterval,
    indicatorKey: string,
    take: number,
    client: DbClient = prisma,
  ): Promise<DerivedIndicatorSnapshotModel[]> {
    const rows = await client.derivedIndicatorSnapshot.findMany({
      where: { instrumentId, interval, indicatorKey },
      orderBy: { eventTime: "desc" },
      take,
    });
    return rows.map(toDerivedIndicatorSnapshotModel);
  }
}
