import { StructuralValidationService } from "../services/structural-validation.service";
import { StrategyVersion } from "../../domain/aggregates/strategy-version.aggregate";
import { RuleGroup } from "../../domain/entities/rule-group.entity";
import { Rule } from "../../domain/entities/rule.entity";
import { Condition } from "../../domain/entities/condition.entity";
import type { StrategyParameterDefinition } from "../../domain/value-objects/strategy-parameter.value-object";

function buildCondition(operator: Condition["operator"] = "GREATER_THAN", rightOperandUpper?: Condition["rightOperandUpper"]): Condition {
  return new Condition("c1", { kind: "constant", value: "1" }, operator, { kind: "constant", value: "0" }, rightOperandUpper);
}

function buildVersion(entryRules: RuleGroup, exitRules: RuleGroup, parameters: StrategyParameterDefinition[] = []): StrategyVersion {
  return new StrategyVersion("ver1", "strat1", 1, "PENDING_VALIDATION", entryRules, exitRules, parameters, "user1", new Date());
}

describe("StructuralValidationService", () => {
  let service: StructuralValidationService;

  beforeEach(() => {
    service = new StructuralValidationService();
  });

  it("fails a version with an empty entry rule tree", () => {
    const entry = new RuleGroup("entry", "AND", []);
    const exit = new RuleGroup("exit", "AND", [new Rule("r1", "Exit rule", buildCondition(), true)]);
    const result = service.validate(buildVersion(entry, exit));
    expect(result.passed).toBe(false);
    expect(result.findings.some((f) => f.code === "EMPTY_RULE_GROUP" && f.message.includes("entry"))).toBe(true);
  });

  it("fails a version with an empty exit rule tree", () => {
    const entry = new RuleGroup("entry", "AND", [new Rule("r1", "Entry rule", buildCondition(), true)]);
    const exit = new RuleGroup("exit", "AND", []);
    const result = service.validate(buildVersion(entry, exit));
    expect(result.passed).toBe(false);
    expect(result.findings.some((f) => f.code === "EMPTY_RULE_GROUP" && f.message.includes("exit"))).toBe(true);
  });

  it("passes a version with real, non-empty entry and exit rules and no other problems", () => {
    const entry = new RuleGroup("entry", "AND", [new Rule("r1", "Entry rule", buildCondition(), true)]);
    const exit = new RuleGroup("exit", "AND", [new Rule("r2", "Exit rule", buildCondition(), true)]);
    const result = service.validate(buildVersion(entry, exit));
    expect(result.passed).toBe(true);
  });

  it("always includes the AI102_CROSS_CHECK_DEFERRED warning — a real, honest gap, not silently omitted", () => {
    const entry = new RuleGroup("entry", "AND", [new Rule("r1", "Entry rule", buildCondition(), true)]);
    const exit = new RuleGroup("exit", "AND", [new Rule("r2", "Exit rule", buildCondition(), true)]);
    const result = service.validate(buildVersion(entry, exit));
    expect(result.findings.some((f) => f.code === "AI102_CROSS_CHECK_DEFERRED" && f.severity === "WARNING")).toBe(true);
  });

  it("a WARNING-only result (like the deferred cross-check) does not cause passed to be false on its own", () => {
    const entry = new RuleGroup("entry", "AND", [new Rule("r1", "Entry rule", buildCondition(), true)]);
    const exit = new RuleGroup("exit", "AND", [new Rule("r2", "Exit rule", buildCondition(), true)]);
    const result = service.validate(buildVersion(entry, exit));
    expect(result.findings.every((f) => f.severity === "WARNING" || f.code !== "AI102_CROSS_CHECK_DEFERRED")).toBe(true);
    expect(result.passed).toBe(true);
  });

  it("fails when two parameters share the same name", () => {
    const entry = new RuleGroup("entry", "AND", [new Rule("r1", "Entry rule", buildCondition(), true)]);
    const exit = new RuleGroup("exit", "AND", [new Rule("r2", "Exit rule", buildCondition(), true)]);
    const parameters: StrategyParameterDefinition[] = [
      { type: "integer", name: "risk_percent", required: true },
      { type: "decimal", name: "risk_percent", required: false },
    ];
    const result = service.validate(buildVersion(entry, exit, parameters));
    expect(result.passed).toBe(false);
    expect(result.findings.some((f) => f.code === "DUPLICATE_PARAMETER_NAME")).toBe(true);
  });

  it("fails a BETWEEN condition with no upper bound", () => {
    const entry = new RuleGroup("entry", "AND", [new Rule("r1", "Between rule", buildCondition("BETWEEN", undefined), true)]);
    const exit = new RuleGroup("exit", "AND", [new Rule("r2", "Exit rule", buildCondition(), true)]);
    const result = service.validate(buildVersion(entry, exit));
    expect(result.passed).toBe(false);
    expect(result.findings.some((f) => f.code === "MISSING_BETWEEN_UPPER_BOUND")).toBe(true);
  });

  it("passes a BETWEEN condition that DOES have an upper bound", () => {
    const entry = new RuleGroup("entry", "AND", [new Rule("r1", "Between rule", buildCondition("BETWEEN", { kind: "constant", value: "100" }), true)]);
    const exit = new RuleGroup("exit", "AND", [new Rule("r2", "Exit rule", buildCondition(), true)]);
    const result = service.validate(buildVersion(entry, exit));
    expect(result.passed).toBe(true);
  });

  it("checks BETWEEN conditions recursively inside nested rule groups, not just top-level rules", () => {
    const nested = new RuleGroup("nested", "OR", [new Rule("r1", "Nested between", buildCondition("BETWEEN", undefined), true)]);
    const entry = new RuleGroup("entry", "AND", [nested]);
    const exit = new RuleGroup("exit", "AND", [new Rule("r2", "Exit rule", buildCondition(), true)]);
    const result = service.validate(buildVersion(entry, exit));
    expect(result.passed).toBe(false);
    expect(result.findings.some((f) => f.code === "MISSING_BETWEEN_UPPER_BOUND")).toBe(true);
  });
});
