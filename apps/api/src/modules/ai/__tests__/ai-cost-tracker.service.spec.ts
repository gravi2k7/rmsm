import { AiCostTrackerService } from "../gateway/ai-cost-tracker.service";

describe("AiCostTrackerService", () => {
  let tracker: AiCostTrackerService;

  beforeEach(() => {
    tracker = new AiCostTrackerService();
  });

  it("computes a real cost for a known-priced model based on real prompt/completion token counts", () => {
    tracker.record("gpt-4o-mini", { promptTokens: 1000, completionTokens: 1000, totalTokens: 2000 });
    const snapshot = tracker.snapshot();
    // gpt-4o-mini: $0.00015/1K prompt + $0.0006/1K completion = 0.00015 + 0.0006 = 0.00075
    expect(snapshot.totalCostUsd).toBeCloseTo(0.00075, 6);
  });

  it("records $0.00 for a model with no published pricing (e.g. a local Ollama model) — genuinely free, not 'unknown'", () => {
    tracker.record("llama3", { promptTokens: 1000, completionTokens: 1000, totalTokens: 2000 });
    expect(tracker.snapshot().totalCostUsd).toBe(0);
  });

  it("accumulates real totals across multiple calls, and tracks per-model breakdowns separately", () => {
    tracker.record("gpt-4o-mini", { promptTokens: 500, completionTokens: 500, totalTokens: 1000 });
    tracker.record("gpt-4o-mini", { promptTokens: 500, completionTokens: 500, totalTokens: 1000 });
    tracker.record("gpt-4o", { promptTokens: 1000, completionTokens: 0, totalTokens: 1000 });

    const snapshot = tracker.snapshot();
    expect(snapshot.totalRequests).toBe(3);
    expect(snapshot.totalTokens).toBe(3000);
    expect(snapshot.byModel["gpt-4o-mini"]?.requests).toBe(2);
    expect(snapshot.byModel["gpt-4o"]?.requests).toBe(1);
  });

  it("starts with a real, empty snapshot — not undefined", () => {
    const snapshot = tracker.snapshot();
    expect(snapshot.totalRequests).toBe(0);
    expect(snapshot.totalCostUsd).toBe(0);
    expect(snapshot.byModel).toEqual({});
  });
});
