import type { Condition } from "./condition.entity";

/**
 * One named, human-readable unit combining exactly one `Condition` with
 * metadata a strategy author actually cares about — a label
 * ("Oversold entry trigger") and whether this rule is currently
 * enabled (a real, common authoring need: temporarily disabling one
 * rule while testing others, without deleting and re-adding it). A
 * `Rule` wraps exactly one `Condition` — combining MULTIPLE conditions
 * is `RuleGroup`'s own job (below), not something `Rule` itself does,
 * keeping each entity's own responsibility singular.
 */
export class Rule {
  constructor(
    public readonly id: string,
    public readonly label: string,
    public readonly condition: Condition,
    public readonly enabled: boolean,
  ) {}
}
