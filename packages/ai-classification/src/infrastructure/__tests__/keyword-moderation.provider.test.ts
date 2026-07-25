import { describe, it, expect } from "vitest";
import { KeywordModerationProvider } from "../keyword-moderation.provider";

describe("KeywordModerationProvider", () => {
  const provider = new KeywordModerationProvider({ profanity: ["badword"], violence: ["threat"] });

  it("flags content containing a banned word and reports its category", async () => {
    const result = await provider.moderate("this contains a badword in it");
    expect(result.flagged).toBe(true);
    expect(result.categories).toEqual(["profanity"]);
  });

  it("does not flag clean content", async () => {
    const result = await provider.moderate("this is a perfectly nice message");
    expect(result.flagged).toBe(false);
    expect(result.categories).toEqual([]);
  });
});
