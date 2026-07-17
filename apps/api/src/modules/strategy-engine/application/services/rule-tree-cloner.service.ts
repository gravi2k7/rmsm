import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { RuleGroup } from "../../domain/entities/rule-group.entity";
import { Rule } from "../../domain/entities/rule.entity";
import { Condition } from "../../domain/entities/condition.entity";

/**
 * Deep-clones a `RuleGroup` tree with fresh identity at every node —
 * needed by `CloneStrategy` (item, Application Services) to copy a
 * strategy's own latest version without the clone sharing any
 * `Rule`/`Condition`/`RuleGroup` id with the original (two versions
 * with the SAME node ids would violate the domain's own "a
 * StrategyVersion owns its own tree" aggregate boundary the moment
 * both are persisted). Deliberately an APPLICATION-layer utility, not
 * a domain one — cloning is an orchestration concern (a real business
 * decision about what "clone" even means for this use case), not a
 * domain invariant the aggregate itself needs to enforce, so it lives
 * outside `domain/` entirely rather than risk it being read as a
 * domain redesign.
 */
@Injectable()
export class RuleTreeClonerService {
  clone(root: RuleGroup): RuleGroup {
    const clonedChildren = root.children.map((child) => (child instanceof RuleGroup ? this.clone(child) : this.cloneRule(child)));
    return new RuleGroup(randomUUID(), root.operator, clonedChildren);
  }

  private cloneRule(rule: Rule): Rule {
    const clonedCondition = new Condition(randomUUID(), rule.condition.leftOperand, rule.condition.operator, rule.condition.rightOperand, rule.condition.rightOperandUpper);
    return new Rule(randomUUID(), rule.label, clonedCondition, rule.enabled);
  }
}
