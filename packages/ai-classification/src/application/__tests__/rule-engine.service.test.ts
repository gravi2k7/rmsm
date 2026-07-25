import { describe, it, expect, beforeEach } from "vitest";
import { RuleEngine } from "../services/rule-engine.service";
import { InvalidRuleDefinitionError } from "../../domain/errors/classification-domain.errors";

describe("RuleEngine", () => {
  let engine: RuleEngine;

  beforeEach(() => {
    engine = new RuleEngine();
    engine.register({ id: "r1", keywords: ["refund", "money back"], label: "refund_request", priority: 1 });
    engine.register({ id: "r2", keywords: ["cancel", "subscription"], label: "cancel_subscription", priority: 2 });
  });

  it("matches the rule whose keywords appear in the text", () => {
    const match = engine.match("I want a refund please");
    expect(match?.rule.id).toBe("r1");
    expect(match?.matchedKeywords).toEqual(["refund"]);
  });

  it("returns the highest-priority match when multiple rules match", () => {
    engine.register({ id: "r3", keywords: ["refund"], label: "low_priority_refund", priority: 0 });
    const match = engine.match("refund");
    expect(match?.rule.id).toBe("r1");
  });

  it("returns null when no rule matches", () => {
    expect(engine.match("what is the weather today")).toBeNull();
  });

  it("throws InvalidRuleDefinitionError for a rule with no keywords", () => {
    expect(() => engine.register({ id: "bad", keywords: [], label: "x", priority: 0 })).toThrow(InvalidRuleDefinitionError);
  });

  it("list() returns every registered rule", () => {
    expect(engine.list()).toHaveLength(2);
  });
});
