/** A single, data-driven "rule engine hook": if `keywords` overlap with
 * the input text, `label` is proposed with `priority` used to break
 * ties between multiple matching rules. Deliberately data (never a
 * function) — kept serializable, storable, and inspectable, the same
 * reason `@rmsm/ai-prompts` templates are plain data rather than code. */
export interface ClassificationRule {
  readonly id: string;
  readonly keywords: readonly string[];
  readonly label: string;
  readonly priority: number;
}

export interface RuleMatch {
  readonly rule: ClassificationRule;
  readonly matchedKeywords: readonly string[];
}
