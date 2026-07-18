import { describe, expect, it } from "vitest";
import { createEmptyGroup, createEmptyRule, fromWireRuleTree, toRuleGroupWire } from "../rule-tree-mapper";
import type { RuleGroupNode } from "@/types/strategy";

describe("toRuleGroupWire", () => {
  it("strips client-only _id fields recursively", () => {
    const rule = createEmptyRule("Close above EMA");
    const nested = createEmptyGroup("OR");
    const root: RuleGroupNode = { ...createEmptyGroup("AND"), children: [rule, nested] };

    const wire = toRuleGroupWire(root);

    expect(wire).not.toHaveProperty("_id");
    expect(wire.children[0]).not.toHaveProperty("_id");
    expect(wire.children[1]).not.toHaveProperty("_id");
    expect(wire.kind).toBe("group");
    expect(wire.children[0]).toMatchObject({ kind: "rule", label: "Close above EMA" });
  });

  it("preserves the BETWEEN condition's upper operand", () => {
    const rule = createEmptyRule();
    rule.condition = {
      leftOperand: { kind: "constant", value: "10" },
      operator: "BETWEEN",
      rightOperand: { kind: "constant", value: "20" },
      rightOperandUpper: { kind: "constant", value: "30" },
    };
    const root: RuleGroupNode = { ...createEmptyGroup(), children: [rule] };

    const wire = toRuleGroupWire(root);
    const wireRule = wire.children[0]!;
    expect(wireRule.kind).toBe("rule");
    if (wireRule.kind === "rule") {
      expect(wireRule.condition.rightOperandUpper).toEqual({ kind: "constant", value: "30" });
    }
  });
});

describe("fromWireRuleTree", () => {
  it("parses a well-formed tree and assigns stable client ids", () => {
    const wire = {
      kind: "group",
      operator: "AND",
      children: [
        {
          kind: "rule",
          label: "RSI oversold",
          enabled: true,
          condition: {
            leftOperand: { kind: "indicator", indicatorIdentifier: "rsi", outputSeries: "value" },
            operator: "LESS_THAN",
            rightOperand: { kind: "constant", value: "30" },
          },
        },
      ],
    };

    const parsed = fromWireRuleTree(wire);

    expect(parsed.kind).toBe("group");
    expect(parsed._id).toBeTruthy();
    expect(parsed.children).toHaveLength(1);
    expect(parsed.children[0]!._id).toBeTruthy();
    expect(parsed.children[0]).toMatchObject({ kind: "rule", label: "RSI oversold" });
  });

  it("assigns distinct ids to every node, even structurally identical ones", () => {
    const wire = {
      kind: "group",
      operator: "AND",
      children: [
        { kind: "group", operator: "OR", children: [] },
        { kind: "group", operator: "OR", children: [] },
      ],
    };

    const parsed = fromWireRuleTree(wire);
    const ids = parsed.children.map((c) => c._id);
    expect(new Set(ids).size).toBe(2);
  });

  it("throws on a root that isn't a group", () => {
    expect(() => fromWireRuleTree({ kind: "rule", label: "x", condition: {} })).toThrow(/must be a group/);
  });

  it("throws on a malformed node missing `kind`", () => {
    expect(() => fromWireRuleTree({ children: [] })).toThrow(/Malformed rule-tree node/);
  });

  it("throws on an unknown `kind` value", () => {
    expect(() => fromWireRuleTree({ kind: "group", operator: "AND", children: [{ kind: "mystery" }] })).toThrow(/unknown kind/);
  });
});

describe("round-trip: client -> wire -> client", () => {
  it("preserves label, operator, and condition through a full round trip", () => {
    const original = createEmptyGroup("OR");
    const rule = createEmptyRule("Trend confirmed");
    rule.condition.operator = "CROSSES_ABOVE";
    original.children = [rule];

    const wire = toRuleGroupWire(original);
    const reparsed = fromWireRuleTree(wire);

    expect(reparsed.operator).toBe("OR");
    const reparsedChild = reparsed.children[0]!;
    expect(reparsedChild).toMatchObject({ kind: "rule", label: "Trend confirmed" });
    if (reparsedChild.kind === "rule") {
      expect(reparsedChild.condition.operator).toBe("CROSSES_ABOVE");
    }
    // ids are regenerated on the way back in — not expected to match the originals.
    expect(reparsedChild._id).not.toBe(rule._id);
  });
});
