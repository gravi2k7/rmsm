import type { StrategyPublication as StrategyPublicationRow } from "@rmsm/database";
import { StrategyPublication } from "../../domain/entities/strategy-publication.entity";

export function toStrategyPublicationDomain(row: StrategyPublicationRow): StrategyPublication {
  return new StrategyPublication(row.id, row.strategyVersionId, row.publishedByUserId, row.publishedAt, row.supersedesVersionId);
}

export function toStrategyPublicationPersistence(publication: StrategyPublication, organizationId: string) {
  return {
    id: publication.id,
    organizationId,
    strategyVersionId: publication.strategyVersionId,
    publishedByUserId: publication.publishedByUserId,
    publishedAt: publication.publishedAt,
    supersedesVersionId: publication.supersedesVersionId,
  };
}
