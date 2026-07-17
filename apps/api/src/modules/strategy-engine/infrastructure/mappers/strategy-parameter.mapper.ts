import type { StrategyParameter as StrategyParameterRow, StrategyParameterType, Prisma } from "@rmsm/database";
import type { StrategyParameterDefinition } from "../../domain/value-objects/strategy-parameter.value-object";
import { toPrismaParameterType } from "./enum-mappers.util";
import { toNullableJsonInput, fromJsonValue } from "./json-value.util";

/**
 * `defaultValueText`/`minText`/`maxText` are stored as text and
 * interpreted per `type` — see this module's own schema comment
 * (`schema.prisma`'s AI-103 section) for why. This mapper is where
 * that interpretation actually happens, in both directions. Milestone
 * 2 fix applied — `type` now goes through the exhaustive
 * `toPrismaParameterType` translation instead of a blind `as
 * StrategyParameterType` cast on a raw string literal, and
 * `allowedValues` (a nullable Json column) goes through
 * `toNullableJsonInput`/`fromJsonValue` instead of a bare `null`/`as`.
 */
export function toStrategyParameterDomain(row: StrategyParameterRow): StrategyParameterDefinition {
  switch (row.type) {
    case "INTEGER":
      return { type: "integer", name: row.name, required: row.required, defaultValue: row.defaultValueText ? Number(row.defaultValueText) : undefined, min: row.minText ? Number(row.minText) : undefined, max: row.maxText ? Number(row.maxText) : undefined };
    case "DECIMAL":
      return { type: "decimal", name: row.name, required: row.required, defaultValue: row.defaultValueText ?? undefined, min: row.minText ?? undefined, max: row.maxText ?? undefined };
    case "BOOLEAN":
      return { type: "boolean", name: row.name, required: row.required, defaultValue: row.defaultValueText ? row.defaultValueText === "true" : undefined };
    case "ENUM":
      return { type: "enum", name: row.name, required: row.required, defaultValue: row.defaultValueText ?? undefined, allowedValues: row.allowedValues !== null ? fromJsonValue<string[]>(row.allowedValues) : [] };
    case "STRING":
      return { type: "string", name: row.name, required: row.required, defaultValue: row.defaultValueText ?? undefined, maxLength: row.maxLength ?? undefined };
    default: {
      const exhaustive: never = row.type;
      throw new Error(`Unhandled Prisma StrategyParameterType: ${String(exhaustive)}`);
    }
  }
}

/** Explicit, named return type — fixes TS2742 (see condition.mapper.ts's own `ConditionPersistenceData` comment for the full explanation). Every branch of the switch below returns this identical shape (fields that don't apply to a given parameter type are `null`, never omitted), so one flat interface covers all 5 variants. */
export interface StrategyParameterPersistenceData {
  organizationId: string;
  strategyVersionId: string;
  name: string;
  required: boolean;
  sortOrder: number;
  type: StrategyParameterType;
  defaultValueText: string | null;
  minText: string | null;
  maxText: string | null;
  allowedValues: Prisma.InputJsonValue | typeof Prisma.JsonNull;
  maxLength: number | null;
}

export function toStrategyParameterPersistence(definition: StrategyParameterDefinition, organizationId: string, strategyVersionId: string, sortOrder: number): StrategyParameterPersistenceData {
  const base = { organizationId, strategyVersionId, name: definition.name, required: definition.required, sortOrder, type: toPrismaParameterType(definition.type) as StrategyParameterType };

  switch (definition.type) {
    case "integer":
      return { ...base, defaultValueText: definition.defaultValue?.toString() ?? null, minText: definition.min?.toString() ?? null, maxText: definition.max?.toString() ?? null, allowedValues: toNullableJsonInput(null), maxLength: null };
    case "decimal":
      return { ...base, defaultValueText: definition.defaultValue ?? null, minText: definition.min ?? null, maxText: definition.max ?? null, allowedValues: toNullableJsonInput(null), maxLength: null };
    case "boolean":
      return { ...base, defaultValueText: definition.defaultValue !== undefined ? String(definition.defaultValue) : null, minText: null, maxText: null, allowedValues: toNullableJsonInput(null), maxLength: null };
    case "enum":
      return { ...base, defaultValueText: definition.defaultValue ?? null, minText: null, maxText: null, allowedValues: toNullableJsonInput(definition.allowedValues), maxLength: null };
    case "string":
      return { ...base, defaultValueText: definition.defaultValue ?? null, minText: null, maxText: null, allowedValues: toNullableJsonInput(null), maxLength: definition.maxLength ?? null };
    default: {
      const exhaustive: never = definition;
      throw new Error(`Unhandled StrategyParameterDefinition variant: ${String(exhaustive)}`);
    }
  }
}
