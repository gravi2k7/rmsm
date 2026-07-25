import { describe, it, expect } from "vitest";
import { SequentialReasoningStrategy } from "../sequential-reasoning.strategy";

describe("SequentialReasoningStrategy", () => {
  it("runs each step function in order, marking the last isFinal", async () => {
    const strategy = new SequentialReasoningStrategy([
      async () => "first",
      async () => "second",
    ]);
    const context = { agentId: "a1", sessionId: null, goals: [], variables: {} };

    const step1 = await strategy.nextStep(context, []);
    expect(step1).toEqual({ stepIndex: 0, output: "first", isFinal: false });

    const step2 = await strategy.nextStep(context, [step1]);
    expect(step2).toEqual({ stepIndex: 1, output: "second", isFinal: true });
  });

  it("returns a final step reusing the last output when called past the end of its step list", async () => {
    const strategy = new SequentialReasoningStrategy([async () => "only"]);
    const context = { agentId: "a1", sessionId: null, goals: [], variables: {} };
    const step1 = await strategy.nextStep(context, []);
    const step2 = await strategy.nextStep(context, [step1]);
    expect(step2.isFinal).toBe(true);
    expect(step2.output).toBe("only");
  });
});
