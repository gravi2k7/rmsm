import type { DataImportJob, DataQualityIssue, DataGap, CandleQualityMetadata, DerivedIndicatorSnapshot, MarketDataAiSnapshot } from "@rmsm/database";
import type {
  DataImportJobModel,
  DataQualityIssueModel,
  DataGapModel,
  CandleQualityMetadataModel,
  DerivedIndicatorSnapshotModel,
  MarketDataAiSnapshotModel,
} from "../../interfaces/models/operational.models";

/** No Decimal fields on DataImportJob/DataQualityIssue/DataGap — identity mappers, kept for the same "one stable seam per entity" reason as reference-data.mappers.ts's identity cases, not omitted just because there's nothing to convert today. CandleQualityMetadata/MarketDataAiSnapshot DO have Decimal fields, converted the same way as time-series.mappers.ts. */

export function toDataImportJobModel(row: DataImportJob): DataImportJobModel {
  return { ...row };
}

export function toDataQualityIssueModel(row: DataQualityIssue): DataQualityIssueModel {
  return { ...row };
}

export function toDataGapModel(row: DataGap): DataGapModel {
  return { ...row };
}

export function toCandleQualityMetadataModel(row: CandleQualityMetadata): CandleQualityMetadataModel {
  return {
    ...row,
    qualityScore: row.qualityScore.toString(),
    confidenceScore: row.confidenceScore.toString(),
  };
}

export function toDerivedIndicatorSnapshotModel(row: DerivedIndicatorSnapshot): DerivedIndicatorSnapshotModel {
  return {
    ...row,
    outputs: row.outputs as Record<string, unknown>,
  };
}

export function toMarketDataAiSnapshotModel(row: MarketDataAiSnapshot): MarketDataAiSnapshotModel {
  return {
    ...row,
    confidence: row.confidence !== null ? row.confidence.toString() : null,
    spread: row.spread !== null ? row.spread.toString() : null,
    anomalyFlags: row.anomalyFlags !== null ? (row.anomalyFlags as unknown[]) : null,
  };
}
