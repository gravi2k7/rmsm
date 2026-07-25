import { describe, expect, it } from "vitest";
import { MajorityConsensusStrategy } from "../majority-consensus.strategy";

describe("MajorityConsensusStrategy", () => {
  const strategy = new MajorityConsensusStrategy();

  it("approves when strictly more voters vote for than against", () => {
    const result = strategy.evaluate({ id: "p1", proposerId: "coordinator-1", description: "ship it", votes: { a: true, b: true, c: false } });
    expect(result.approved).toBe(true);
    expect(result.forCount).toBe(2);
    expect(result.againstCount).toBe(1);
  });

  it("does not approve a tie", () => {
    const result = strategy.evaluate({ id: "p2", proposerId: "coordinator-1", description: "ship it", votes: { a: true, b: false } });
    expect(result.approved).toBe(false);
  });
});
