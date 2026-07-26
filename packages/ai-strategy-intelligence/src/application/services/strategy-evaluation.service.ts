import type { Strategy } from "@rmsm/strategy";
import type { StrategyEvaluation } from "../../domain/entities/strategy-evaluation.entity";
import { StrategyVerdict } from "../../domain/enums/strategy-intelligence.enum";

interface Check {
  readonly weight: number;
  readonly passed: boolean;
  readonly reason: string;
}

/**
 * Structural readiness assessment — reads only what `Strategy` already
 * declares (version presence, rule counts, lifecycle status). Never
 * evaluates a rule's `expression`; that stays behind `StrategyEngine`,
 * entirely outside this package, exactly as `@rmsm/strategy` documents.
 */
export class StrategyEvaluationService {
  evaluate(strategy: Strategy): StrategyEvaluation {
    const version = strategy.currentVersion;
    const reasons: string[] = [];
    const checks: Check[] = [];

    checks.push({ weight: 2, passed: version !== null, reason: version ? "Has a current version." : "No current version." });

    const entryRules = version?.entryRules.filter((r) => r.enabled) ?? [];
    const exitRules = version?.exitRules.filter((r) => r.enabled) ?? [];
    checks.push({ weight: 2, passed: entryRules.length > 0, reason: entryRules.length > 0 ? "Has enabled entry rule(s)." : "No enabled entry rules." });
    checks.push({ weight: 2, passed: exitRules.length > 0, reason: exitRules.length > 0 ? "Has enabled exit rule(s)." : "No enabled exit rules." });
    checks.push({ weight: 1, passed: strategy.supportedSymbols.length > 0, reason: "Supports at least one symbol." });
    checks.push({
      weight: 1,
      passed: strategy.status !== "DRAFT",
      reason: strategy.status === "DRAFT" ? "Still in DRAFT status." : `Lifecycle status is ${strategy.status}.`,
    });

    for (const check of checks) if (!check.passed) reasons.push(check.reason);
    if (reasons.length === 0) reasons.push("All readiness checks passed.");

    const totalWeight = checks.reduce((sum, c) => sum + c.weight, 0);
    const passedWeight = checks.reduce((sum, c) => sum + (c.passed ? c.weight : 0), 0);
    const completenessScore = totalWeight === 0 ? 0 : passedWeight / totalWeight;

    const verdict =
      completenessScore >= 0.8 ? StrategyVerdict.READY : completenessScore >= 0.5 ? StrategyVerdict.NEEDS_REVIEW : StrategyVerdict.NOT_READY;

    return { strategyId: strategy.id.value, verdict, completenessScore, reasons };
  }
}
