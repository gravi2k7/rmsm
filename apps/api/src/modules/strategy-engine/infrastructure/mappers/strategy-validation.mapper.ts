import type { StrategyValidation as StrategyValidationRow, Prisma } from "@rmsm/database";
import { StrategyValidation } from "../../domain/entities/strategy-validation.entity";
import type { ValidationFinding } from "../../domain/entities/strategy-validation.entity";
import { toJsonInput, fromJsonValue } from "./json-value.util";

/** Milestone 2 fix applied — `findings` (a non-nullable Json column) goes through `toJsonInput`/`fromJsonValue` instead of a bare `as unknown as object` double-cast. */
export function toStrategyValidationDomain(row: StrategyValidationRow): StrategyValidation {
  return new StrategyValidation(row.id, row.strategyVersionId, row.ranAt, row.passed, fromJsonValue<ValidationFinding[]>(row.findings));
}

/** Explicit, named return type — fixes TS2742 (see condition.mapper.ts's own `ConditionPersistenceData` comment for the full explanation). */
export interface StrategyValidationPersistenceData {
  id: string;
  organizationId: string;
  strategyVersionId: string;
  ranAt: Date;
  passed: boolean;
  findings: Prisma.InputJsonValue;
  createdById: string | null;
}

export function toStrategyValidationPersistence(validation: StrategyValidation, organizationId: string, createdById: string | null): StrategyValidationPersistenceData {
  return {
    id: validation.id,
    organizationId,
    strategyVersionId: validation.strategyVersionId,
    ranAt: validation.ranAt,
    passed: validation.passed,
    findings: toJsonInput(validation.findings),
    createdById,
  };
}
