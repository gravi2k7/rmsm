import { Injectable } from "@nestjs/common";
import type { StrategyVersion } from "../../domain/aggregates/strategy-version.aggregate";
import { RuleGroup } from "../../domain/entities/rule-group.entity";
import type { ValidationFinding } from "../../domain/entities/strategy-validation.entity";

/**
 * A real, partial implementation of the domain's own `ValidationEngine`
 * contract (`domain/contracts/validation-engine.interface.ts`, Milestone
 * 1) — covers every check achievable WITHOUT AI-102 (structural rule-
 * tree integrity, parameter definition sanity). Cross-module checks
 * (does every `IndicatorOperand.indicatorIdentifier` referenced by a
 * `Condition` actually exist in AI-102's own registry?) are explicitly
 * NOT implemented here — this milestone's own scope excludes the
 * Execution Engine, and a real indicator-existence check needs a live
 * call through AI-102's own `IndicatorEngineService`, which nothing in
 * this module is wired to yet. Named as a real, deferred gap
 * (`AI102_CROSS_CHECK` finding code, below) rather than silently
 * skipped without a trace.
 */
@Injectable()
export class StructuralValidationService {
  validate(version: StrategyVersion): { passed: boolean; findings: ValidationFinding[] } {
    const findings: ValidationFinding[] = [
      ...this.checkNonEmptyTree(version.entryRules, "entry"),
      ...this.checkNonEmptyTree(version.exitRules, "exit"),
      ...this.checkParameterNamesUnique(version),
      ...this.checkBetweenOperandsPresent(version.entryRules),
      ...this.checkBetweenOperandsPresent(version.exitRules),
    ];

    findings.push({
      severity: "WARNING",
      code: "AI102_CROSS_CHECK_DEFERRED",
      message: "Indicator-reference validation against AI-102's own registry is not yet implemented — this milestone excludes the Execution Engine integration. Every IndicatorOperand's own indicatorIdentifier is structurally well-formed but not confirmed to exist.",
    });

    const passed = findings.every((f) => f.severity !== "ERROR");
    return { passed, findings };
  }

  private checkNonEmptyTree(root: RuleGroup, label: "entry" | "exit"): ValidationFinding[] {
    if (root.children.length === 0) {
      return [{ severity: "ERROR", code: "EMPTY_RULE_GROUP", message: `The strategy's own ${label} logic has no rules at all — at least one rule is required.`, nodeId: root.id }];
    }
    return [];
  }

  private checkParameterNamesUnique(version: StrategyVersion): ValidationFinding[] {
    const seen = new Set<string>();
    const findings: ValidationFinding[] = [];
    for (const param of version.parameters) {
      if (seen.has(param.name)) {
        findings.push({ severity: "ERROR", code: "DUPLICATE_PARAMETER_NAME", message: `Parameter "${param.name}" is declared more than once.` });
      }
      seen.add(param.name);
    }
    return findings;
  }

  /** BETWEEN conditions require rightOperandUpper — the domain's own Condition entity doesn't enforce this at the type level (its own comment explains why), so it's a real structural check this validator owns. */
  private checkBetweenOperandsPresent(node: RuleGroup): ValidationFinding[] {
    const findings: ValidationFinding[] = [];
    for (const child of node.children) {
      if (child instanceof RuleGroup) {
        findings.push(...this.checkBetweenOperandsPresent(child));
      } else if (child.condition.operator === "BETWEEN" && child.condition.rightOperandUpper === undefined) {
        findings.push({ severity: "ERROR", code: "MISSING_BETWEEN_UPPER_BOUND", message: `Rule "${child.label}" uses BETWEEN but has no upper bound.`, nodeId: child.condition.id });
      }
    }
    return findings;
  }
}
