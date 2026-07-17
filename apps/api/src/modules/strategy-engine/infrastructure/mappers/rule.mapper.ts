import type { RuleWithCondition } from "@rmsm/database";
import { Rule } from "../../domain/entities/rule.entity";
import { toConditionDomain } from "./condition.mapper";

/** A Rule with no persisted Condition yet is a real data-integrity problem the mapper surfaces immediately (throwing) rather than silently returning a Rule with a null/undefined condition the domain's own Rule entity doesn't allow — Condition is a required 1:1 relation on Rule by domain design (`rule.entity.ts`'s own constructor signature). */
export function toRuleDomain(row: RuleWithCondition): Rule {
  if (!row.condition) {
    throw new Error(`Rule ${row.id} has no persisted Condition — a real data-integrity violation; every Rule must own exactly one Condition by domain design.`);
  }
  return new Rule(row.id, row.label, toConditionDomain(row.condition), row.enabled);
}

export function toRulePersistence(rule: Rule, organizationId: string, ruleGroupId: string, sortOrder: number) {
  return {
    id: rule.id,
    organizationId,
    ruleGroupId,
    label: rule.label,
    enabled: rule.enabled,
    sortOrder,
  };
}
