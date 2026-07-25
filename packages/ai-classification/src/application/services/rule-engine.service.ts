import type { ClassificationRule, RuleMatch } from "../../domain/entities/classification-rule.entity";
import { InvalidRuleDefinitionError } from "../../domain/errors/classification-domain.errors";

function tokenize(text: string): readonly string[] {
  return text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

/**
 * The package's "rule engine hooks" capability: a small, deterministic
 * keyword-matching engine over data-driven `ClassificationRule`s. Rules
 * are registered by a caller (a domain team encoding known intents as
 * keyword lists, for instance) — this class contains no hard-coded
 * business rules of its own.
 */
export class RuleEngine {
  private readonly rules: ClassificationRule[] = [];

  register(rule: ClassificationRule): void {
    if (rule.keywords.length === 0) {
      throw new InvalidRuleDefinitionError(`rule "${rule.id}" must declare at least one keyword`);
    }
    this.rules.push(rule);
  }

  list(): readonly ClassificationRule[] {
    return [...this.rules];
  }

  /** Returns the highest-priority rule whose keywords appear in `text`,
   * or `null` if no rule matches — ties broken by declaration order. */
  match(text: string): RuleMatch | null {
    const tokens = new Set(tokenize(text));
    let best: RuleMatch | null = null;

    for (const rule of this.rules) {
      const matchedKeywords = rule.keywords.filter((keyword) => tokens.has(keyword.toLowerCase()));
      if (matchedKeywords.length === 0) continue;
      if (!best || rule.priority > best.rule.priority) {
        best = { rule, matchedKeywords };
      }
    }

    return best;
  }
}
