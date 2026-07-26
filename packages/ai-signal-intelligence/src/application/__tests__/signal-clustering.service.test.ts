import { describe, expect, it } from "vitest";
import { SignalClusteringService } from "../services/signal-clustering.service";
import { buildOpportunity } from "./fakes";

describe("SignalClusteringService", () => {
  const service = new SignalClusteringService();

  it("clusters opportunities by symbol + direction regardless of timing", () => {
    const far = new Date("2026-02-01T00:00:00.000Z");
    const a = buildOpportunity({ id: "a", symbolCode: "EURUSD", direction: "BUY" });
    const b = buildOpportunity({ id: "b", symbolCode: "EURUSD", direction: "BUY", createdAt: far });
    const c = buildOpportunity({ id: "c", symbolCode: "EURUSD", direction: "SELL" });

    const clusters = service.cluster([a, b, c]);
    expect(clusters).toHaveLength(2);
    const buyCluster = clusters.find((cl) => cl.direction === "BUY");
    expect([...(buyCluster?.opportunityIds ?? [])].sort()).toEqual(["a", "b"]);
  });
});
