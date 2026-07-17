import type { Condition as ConditionRow, Prisma, ComparisonOperatorType } from "@rmsm/database";
import { Condition } from "../../domain/entities/condition.entity";
import type { Operand } from "../../domain/value-objects/operand.value-object";
import { toJsonInput, toNullableJsonInput, fromJsonValue } from "./json-value.util";
import { toPrismaComparisonOperator, toDomainComparisonOperator } from "./enum-mappers.util";

/**
 * Milestone 2 fix applied — JSON fields go through the real
 * `toJsonInput`/`toNullableJsonInput`/`fromJsonValue` helpers
 * (`json-value.util.ts`) instead of a bare `as object` cast, and
 * `operator` goes through the exhaustive `enum-mappers.util.ts`
 * translation instead of a blind `as ComparisonOperatorType` cast.
 */
export function toConditionDomain(row: ConditionRow): Condition {
  return new Condition(
    row.id,
    fromJsonValue<Operand>(row.leftOperand),
    toDomainComparisonOperator(row.operator),
    fromJsonValue<Operand>(row.rightOperand),
    row.rightOperandUpper !== null ? fromJsonValue<Operand>(row.rightOperandUpper) : undefined,
  );
}

/**
 * Real, named return type — required to fix TS2742 ("the inferred
 * type ... cannot be named without a reference to
 * .../@prisma/client/runtime/library"). Without an explicit
 * annotation, TypeScript infers this function's own return type from
 * the object literal below, which includes Prisma-generated types
 * (`Prisma.InputJsonValue`, `typeof Prisma.JsonNull`) — and under
 * pnpm's own nested `node_modules` layout, TypeScript sometimes can't
 * produce a portable name for that inferred shape in a `.d.ts` output
 * (a real, well-documented TypeScript+Prisma+pnpm interaction, not a
 * logic bug). An explicit return type sidesteps the problem entirely:
 * nothing needs to be inferred-then-named.
 */
export interface ConditionPersistenceData {
  id: string;
  organizationId: string;
  ruleId: string;
  leftOperand: Prisma.InputJsonValue;
  operator: ComparisonOperatorType;
  rightOperand: Prisma.InputJsonValue;
  rightOperandUpper: Prisma.InputJsonValue | typeof Prisma.JsonNull;
}

export function toConditionPersistence(condition: Condition, organizationId: string, ruleId: string): ConditionPersistenceData {
  return {
    id: condition.id,
    organizationId,
    ruleId,
    leftOperand: toJsonInput(condition.leftOperand),
    operator: toPrismaComparisonOperator(condition.operator),
    rightOperand: toJsonInput(condition.rightOperand),
    rightOperandUpper: toNullableJsonInput(condition.rightOperandUpper),
  };
}
