import { Injectable } from "@nestjs/common";
import { prisma, DbClient, CandleValidationStatus, MarketDataProviderType } from "@rmsm/database";
import { CandleQualityMetadataModel } from "../interfaces/models/operational.models";
import { toCandleQualityMetadataModel } from "./mappers/operational.mappers";

export interface UpsertCandleQualityMetadataInput {
  candleId: string;
  qualityScore: number;
  confidenceScore: number;
  validationStatus: CandleValidationStatus;
  importVersion?: number;
  sourceProviderType: MarketDataProviderType;
  importTimestamp: Date;
  processingDurationMs: number;
}

/**
 * FIP-001 Domain 6 (Quality Pipeline). One row per MarketCandle
 * (candleId unique) — QualityScoringService upserts rather than always
 * inserting, since a candle can legitimately be rescored (e.g. after a
 * later CandleQualityMetadata.importVersion bump, mirroring
 * MarketCandle.normalizationVersion's own precedent).
 */
@Injectable()
export class CandleQualityMetadataRepository {
  async upsert(data: UpsertCandleQualityMetadataInput, client: DbClient = prisma): Promise<CandleQualityMetadataModel> {
    const row = await client.candleQualityMetadata.upsert({
      where: { candleId: data.candleId },
      create: { ...data, processingTimestamp: new Date() },
      update: { ...data, processingTimestamp: new Date() },
    });
    return toCandleQualityMetadataModel(row);
  }

  async findByCandleId(candleId: string, client: DbClient = prisma): Promise<CandleQualityMetadataModel | null> {
    const row = await client.candleQualityMetadata.findUnique({ where: { candleId } });
    return row ? toCandleQualityMetadataModel(row) : null;
  }

  async findByValidationStatus(
    status: CandleValidationStatus,
    take: number,
    client: DbClient = prisma,
  ): Promise<CandleQualityMetadataModel[]> {
    const rows = await client.candleQualityMetadata.findMany({
      where: { validationStatus: status },
      orderBy: { processingTimestamp: "desc" },
      take,
    });
    return rows.map(toCandleQualityMetadataModel);
  }

  /** Quality Dashboard's own aggregate — average quality/confidence, for MonitoringController's "Quality Reports" tile. Raw aggregate, not per-row, since the dashboard needs one number per metric, not every row. */
  async getAverageScores(client: DbClient = prisma): Promise<{ avgQualityScore: number | null; avgConfidenceScore: number | null }> {
    const result = await client.candleQualityMetadata.aggregate({
      _avg: { qualityScore: true, confidenceScore: true },
    });
    return {
      avgQualityScore: result._avg.qualityScore !== null ? Number(result._avg.qualityScore) : null,
      avgConfidenceScore: result._avg.confidenceScore !== null ? Number(result._avg.confidenceScore) : null,
    };
  }
}
