import type { Condition, Operand, RuleGroupNode, RuleNode, RuleTreeNode } from "@/types/strategy";

/**
 * The backend's `RuleGroupDto`/`RuleDto` (see `rest/dto/rule-tree.dto.ts`)
 * have no id field at all — the domain's own `RuleGroup`/`Rule` entities
 * are identified by real database ids assigned on save, and the DTO's own
 * `kind` discriminator is the only thing distinguishing a `RuleDto` from a
 * nested `RuleGroupDto` in JSON.
 *
 * The rule builder UI needs a *stable* per-node id before that save
 * happens — for React keys, drag-and-drop, and "this row has a
 * validation error" targeting. `_id` is that id: generated client-side,
 * never sent to the backend, and stripped by `toRuleGroupWire` below.
 */

export interface WireOperand extends Operand {}

export interface WireCondition {
  leftOperand: WireOperand;
  operator: Condition["operator"];
  rightOperand: WireOperand;
  rightOperandUpper?: WireOperand;
}

export interface WireRule {
  kind: "rule";
  label: string;
  enabled?: boolean;
  condition: WireCondition;
}

export interface WireRuleGroup {
  kind: "group";
  operator: RuleGroupNode["operator"];
  children: (WireRule | WireRuleGroup)[];
}

function genId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `node-${Math.random().toString(36).slice(2)}-${Date.now()}`;
}

export function toRuleGroupWire(node: RuleGroupNode): WireRuleGroup {
  return {
    kind: "group",
    operator: node.operator,
    children: node.children.map(toWireChild),
  };
}

function toWireChild(node: RuleTreeNode): WireRule | WireRuleGroup {
  if (node.kind === "group") return toRuleGroupWire(node);
  return {
    kind: "rule",
    label: node.label,
    enabled: node.enabled,
    condition: node.condition,
  };
}

/**
 * Parses the loosely-typed `entryRules`/`exitRules` field the backend
 * returns (`VersionResponseDto.entryRules: unknown` — see that DTO's own
 * comment: it's genuinely untyped on the wire) into an editable, id-bearing
 * client tree. Throws on a shape that isn't a well-formed rule tree rather
 * than silently coercing something wrong into an editable-looking node.
 */
export function fromWireRuleTree(wire: unknown): RuleGroupNode {
  const node = parseWireNode(wire);
  if (node.kind !== "group") {
    throw new Error("Root of a rule tree must be a group.");
  }
  return node;
}

function parseWireNode(wire: unknown): RuleTreeNode {
  if (typeof wire !== "object" || wire === null || !("kind" in wire)) {
    throw new Error("Malformed rule-tree node: expected an object with a `kind` field.");
  }
  const obj = wire as Record<string, unknown>;
  if (obj.kind === "rule") {
    return {
      kind: "rule",
      _id: genId(),
      label: typeof obj.label === "string" ? obj.label : "",
      enabled: obj.enabled !== false,
      condition: obj.condition as Condition,
    };
  }
  if (obj.kind === "group") {
    const children = Array.isArray(obj.children) ? obj.children : [];
    return {
      kind: "group",
      _id: genId(),
      operator: (obj.operator as RuleGroupNode["operator"]) ?? "AND",
      children: children.map(parseWireNode),
    };
  }
  throw new Error(`Malformed rule-tree node: unknown kind "${String(obj.kind)}".`);
}

// ── Builders for a fresh, empty tree (new strategy version draft) ─────

export function createEmptyOperand(): Operand {
  return { kind: "constant", value: "" };
}

export function createEmptyCondition(): Condition {
  return { leftOperand: createEmptyOperand(), operator: "GREATER_THAN", rightOperand: createEmptyOperand() };
}

export function createEmptyRule(label = "New rule"): RuleNode {
  return { kind: "rule", _id: genId(), label, enabled: true, condition: createEmptyCondition() };
}

export function createEmptyGroup(operator: RuleGroupNode["operator"] = "AND"): RuleGroupNode {
  return { kind: "group", _id: genId(), operator, children: [] };
}

export { genId as generateNodeId };
