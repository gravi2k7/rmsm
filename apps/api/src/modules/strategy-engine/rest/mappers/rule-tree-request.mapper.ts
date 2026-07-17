import { randomUUID } from "crypto";
import { RuleGroup } from "../../domain/entities/rule-group.entity";
import { Rule } from "../../domain/entities/rule.entity";
import { Condition } from "../../domain/entities/condition.entity";
import type { Operand } from "../../domain/value-objects/operand.value-object";
import type { ComparisonOperator } from "../../domain/value-objects/comparison-operator.enum";
import { RuleGroupDto, RuleDto, OperandDto } from "../dto/rule-tree.dto";

/** REST DTO -> domain, generating real ids for every new node (a client never supplies its own ids for a NEW rule tree — the server owns identity assignment). */
export function toOperandDomain(dto: OperandDto): Operand {
  switch (dto.kind) {
    case "indicator":
      return { kind: "indicator", indicatorIdentifier: dto.indicatorIdentifier ?? "", indicatorVersion: dto.indicatorVersion, parameters: dto.parameters ?? {}, outputSeries: dto.outputSeries ?? "" };
    case "market_field":
      return { kind: "market_field", field: dto.field ?? "close" };
    case "constant":
      return { kind: "constant", value: dto.value ?? "0" };
  }
}

export function toRuleGroupDomain(dto: RuleGroupDto): RuleGroup {
  const children = dto.children.map((child) => (child.kind === "group" ? toRuleGroupDomain(child as RuleGroupDto) : toRuleDomain(child as RuleDto)));
  return new RuleGroup(randomUUID(), dto.operator, children);
}

function toRuleDomain(dto: RuleDto): Rule {
  const condition = new Condition(randomUUID(), toOperandDomain(dto.condition.leftOperand), dto.condition.operator as ComparisonOperator, toOperandDomain(dto.condition.rightOperand), dto.condition.rightOperandUpper ? toOperandDomain(dto.condition.rightOperandUpper) : undefined);
  return new Rule(randomUUID(), dto.label, condition, dto.enabled ?? true);
}
