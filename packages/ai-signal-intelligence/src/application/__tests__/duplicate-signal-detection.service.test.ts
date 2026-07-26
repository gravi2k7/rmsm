import { describe, expect, it } from "vitest";
import { DuplicateSignalDetectionService } from "../services/duplicate-signal-detection.service";
import { buildOpportunity } from "./fakes";

describe("DuplicateSignalDetectionService", () => {
  const service = new DuplicateSignalDetectionService();

  it("groups same-symbol, same-direction signals generated within the time window", () => {
    const base = new Date("2026-01-01T00:00:00.000Z");
    const a = buildOpportunity({ id: "a", createdAt: base });
    const b = buildOpportunity({ id: "b", createdAt: new Date(base.getTime() + 60_000) });
    const unrelated = buildOpportunity({ id: "c", symbolCode: "GBPUSD", createdAt: base });

    const groups = service.detect([a, b, unrelated], 5 * 60 * 1000);
    expect(groups).toHaveLength(1);
    expect([...(groups[0]?.opportunityIds ?? [])].sort()).toEqual(["a", "b"]);
  });

  it("does not group signals generated outside the time window", () => {
    const base = new Date("2026-01-01T00:00:00.000Z");
    const a = buildOpportunity({ id: "a", createdAt: base });
    const b = buildOpportunity({ id: "b", createdAt: new Date(base.getTime() + 60 * 60 * 1000) });

    expect(service.detect([a, b], 5 * 60 * 1000)).toEqual([]);
  });
});
