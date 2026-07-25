import type { IntentClassifier } from "../repositories/intent-classifier.interface";
import type { IntentResult } from "../domain/entities/intent-result.entity";
import { RuleEngine } from "../application/services/rule-engine.service";
import { EmptyClassificationInputError } from "../domain/errors/classification-domain.errors";

const FALLBACK_INTENT = "unknown";

/**
 * The real, default `IntentClassifier` — delegates to the package's own
 * `RuleEngine`. Confidence is `matchedKeywords.length / rule.keywords.length`
 * (how much of the rule's keyword set was present), a deterministic,
 * inspectable score — no ML model involved. Falls back to
 * `"unknown"` at zero confidence when no rule matches.
 */
export class RuleBasedIntentClassifier implements IntentClassifier {
  constructor(private readonly ruleEngine: RuleEngine) {}

  async classify(text: string): Promise<IntentResult> {
    if (!text.trim()) {
      throw new EmptyClassificationInputError();
    }

    const match = this.ruleEngine.match(text);
    if (!match) {
      return { intent: FALLBACK_INTENT, confidence: 0, alternatives: [] };
    }

    const confidence = match.matchedKeywords.length / match.rule.keywords.length;
    return { intent: match.rule.label, confidence, alternatives: [] };
  }
}
