import type { ExecutionProfile as ExecutionProfileRow, Prisma } from "@rmsm/database";
import { ExecutionProfile } from "../../domain/entities/execution-profile.entity";
import type { StrategyParameterValue } from "../../domain/value-objects/strategy-parameter.value-object";
import { toJsonInput, fromJsonValue } from "./json-value.util";

/** Milestone 2 fix applied — `parameters` (a non-nullable Json column) goes through `toJsonInput`/`fromJsonValue` instead of a bare `as object` cast. */
export function toExecutionProfileDomain(row: ExecutionProfileRow): ExecutionProfile {
  return new ExecutionProfile(row.id, row.strategyVersionId, row.name, fromJsonValue<Record<string, StrategyParameterValue>>(row.parameters));
}

/** Explicit, named return type — fixes TS2742 (see condition.mapper.ts's own `ConditionPersistenceData` comment for the full explanation). */
export interface ExecutionProfilePersistenceData {
  id: string;
  organizationId: string;
  strategyVersionId: string;
  name: string;
  parameters: Prisma.InputJsonValue;
}

export function toExecutionProfilePersistence(profile: ExecutionProfile, organizationId: string): ExecutionProfilePersistenceData {
  return {
    id: profile.id,
    organizationId,
    strategyVersionId: profile.strategyVersionId,
    name: profile.name,
    parameters: toJsonInput(profile.parameters),
  };
}
