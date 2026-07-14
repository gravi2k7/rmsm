import type { DataImportJob, DataQualityIssue, DataGap } from "@rmsm/database";
import type {
  DataImportJobModel,
  DataQualityIssueModel,
  DataGapModel,
} from "../../interfaces/models/operational.models";

/** No Decimal fields on any of these three — identity mappers, kept for the same "one stable seam per entity" reason as reference-data.mappers.ts's identity cases, not omitted just because there's nothing to convert today. */

export function toDataImportJobModel(row: DataImportJob): DataImportJobModel {
  return { ...row };
}

export function toDataQualityIssueModel(row: DataQualityIssue): DataQualityIssueModel {
  return { ...row };
}

export function toDataGapModel(row: DataGap): DataGapModel {
  return { ...row };
}
