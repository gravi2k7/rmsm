import { describe, it, expect } from "vitest";
import { KeywordTopicClassifier } from "../keyword-topic.classifier";

describe("KeywordTopicClassifier", () => {
  const classifier = new KeywordTopicClassifier({
    animals: ["cat", "dog", "mammal"],
    finance: ["stock", "market", "invest"],
  });

  it("scores and ranks topics by keyword overlap", async () => {
    const result = await classifier.classify("my cat is a mammal that people love");
    expect(result.topics[0]?.name).toBe("animals");
  });

  it("omits topics with zero overlap", async () => {
    const result = await classifier.classify("cats are great pets");
    expect(result.topics.map((t) => t.name)).not.toContain("finance");
  });
});
