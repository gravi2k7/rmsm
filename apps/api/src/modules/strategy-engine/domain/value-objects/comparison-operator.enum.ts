/**
 * Every operator a `Condition` (below) can express, comparing a left
 * operand against a right operand. `CROSSES_ABOVE`/`CROSSES_BELOW` are
 * genuinely different from `GREATER_THAN`/`LESS_THAN` — a "crosses"
 * operator is inherently STATEFUL (it needs the PRIOR candle's own
 * comparison result to know whether a crossing just happened, not just
 * the current one), a real distinction the Condition Engine (Phase 2+,
 * not built this milestone) will need to account for structurally, not
 * just numerically.
 */
export type ComparisonOperator =
  | "GREATER_THAN"
  | "GREATER_THAN_OR_EQUAL"
  | "LESS_THAN"
  | "LESS_THAN_OR_EQUAL"
  | "EQUAL"
  | "NOT_EQUAL"
  | "CROSSES_ABOVE"
  | "CROSSES_BELOW"
  | "BETWEEN";

/** How a `RuleGroup` (below) combines its own child Rules/RuleGroups — the same 3-operator set every rule-engine convention (SQL WHERE clauses, filter builders) converges on, deliberately not reinvented. */
export type LogicalOperator = "AND" | "OR" | "NOT";
