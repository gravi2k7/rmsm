import type { Operand } from "../value-objects/operand.value-object";
import type { ComparisonOperator } from "../value-objects/comparison-operator.enum";

/**
 * The atomic, leaf-level unit of strategy logic — "RSI(14) < 30," made
 * real. A `Condition` has its own stable identity (`id`) distinct from
 * its POSITION within a `RuleGroup`'s own children array, since a
 * condition can be edited (its operands/operator changed) without
 * that being a different condition, the same "identity vs. attributes"
 * DDD entity distinction every other entity in this domain model
 * follows.
 *
 * `BETWEEN` is the one operator needing a second right-hand operand
 * (`rightOperandUpper`) — modeled as an optional field rather than a
 * separate `BetweenCondition` type, since every other field on this
 * entity is identical regardless of operator; a second, near-identical
 * type would duplicate far more than it would clarify.
 */
export class Condition {
  constructor(
    public readonly id: string,
    public readonly leftOperand: Operand,
    public readonly operator: ComparisonOperator,
    public readonly rightOperand: Operand,
    /** Required if and only if `operator === "BETWEEN"` — validated by `StrategyValidationService` (Phase 2+, not this milestone), not enforced by the type system alone (TypeScript has no clean way to make one field's presence depend on another field's specific value without a much less ergonomic discriminated-union-per-operator shape, which this entity's own comment already explains the cost of). */
    public readonly rightOperandUpper?: Operand,
  ) {}
}
