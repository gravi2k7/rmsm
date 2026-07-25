import { describe, it, expect, beforeEach } from "vitest";
import { RuleBasedIntentClassifier } from "../rule-based-intent.classifier";
import { RuleEngine } from "../../application/services/rule-engine.service";
import { EmptyClassificationInputError } from "../../domain/errors/classification-domain.errors";

describe("RuleBasedIntentClassifier", () => {
  let classifier: RuleBasedIntentClassifier;

  beforeEach(() => {
    const engine = new RuleEngine();
    engine.register({ id: "r1", keywords: ["refund", "money"], label: "refund_request", priority: 1 });
    classifier = new RuleBasedIntentClassifier(engine);
  });

  it("returns the matched rule's label with a proportional confidence", async () => {
    const result = await classifier.classify("I want my money back");
    expect(result.intent).toBe("refund_request");
    expect(result.confidence).toBe(0.5); // 1 of 2 keywords matched
  });

  it("falls back to unknown with zero confidence when no rule matches", async () => {
    const result = await classifier.classify("what time is it");
    expect(result.intent).toBe("unknown");
    expect(result.confidence).toBe(0);
  });

  it("throws EmptyClassificationInputError for empty text", async () => {
    await expect(classifier.classify("   ")).rejects.toThrow(EmptyClassificationInputError);
  });
});
