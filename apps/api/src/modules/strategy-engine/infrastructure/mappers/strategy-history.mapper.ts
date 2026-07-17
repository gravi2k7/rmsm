import type { StrategyHistory as StrategyHistoryRow, Prisma, StrategyHistoryActionType } from "@rmsm/database";
import { StrategyHistoryEntry } from "../../domain/entities/strategy-history.entity";
import { toPrismaHistoryAction, toDomainHistoryAction } from "./enum-mappers.util";
import { toJsonInput, fromJsonValue } from "./json-value.util";

/** Milestone 2 fix applied — `action` now goes through the exhaustive enum-mappers.util.ts translation instead of a blind `as` cast, and `metadata` (a non-nullable Json column) goes through `toJsonInput`/`fromJsonValue` instead of a bare `as object`. */
export function toStrategyHistoryDomain(row: StrategyHistoryRow): StrategyHistoryEntry {
  return new StrategyHistoryEntry(row.id, row.strategyId, toDomainHistoryAction(row.action), row.actorId, row.occurredAt, fromJsonValue<Record<string, unknown>>(row.metadata));
}

/** Explicit, named return type — fixes TS2742 (see condition.mapper.ts's own `ConditionPersistenceData` comment for the full explanation). */
export interface StrategyHistoryPersistenceData {
  id: string;
  organizationId: string;
  strategyId: string;
  action: StrategyHistoryActionType;
  actorId: string | null;
  occurredAt: Date;
  metadata: Prisma.InputJsonValue;
}

export function toStrategyHistoryPersistence(entry: StrategyHistoryEntry, organizationId: string): StrategyHistoryPersistenceData {
  return {
    id: entry.id,
    organizationId,
    strategyId: entry.strategyId,
    action: toPrismaHistoryAction(entry.action),
    actorId: entry.actorId,
    occurredAt: entry.occurredAt,
    metadata: toJsonInput(entry.metadata),
  };
}
