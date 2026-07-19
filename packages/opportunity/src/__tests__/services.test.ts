import { describe, expect, it } from "vitest";
import { ScoringService } from "../services/scoring.service";
import { OpportunityService } from "../services/opportunity.service";
import { Confidence } from "../value-objects/confidence";
import { SignalStrength } from "../value-objects/signal-strength";
import { MarketContext } from "../entities/market-context";
import { Opportunity } from "../entities/opportunity";
import { Signal } from "../entities/signal";
import { SymbolCode } from "@rmsm/market";
import type { OpportunityRepository } from "../repositories/opportunity.repository";

function symbol() {
  const r = SymbolCode.create("EURUSD");
  if (!r.ok) throw new Error("fixture failed");
  return r.value;
}

describe("ScoringService.score", () => {
  const scoring = new ScoringService();

  it("blends confidence and strength equally under favorable conditions", () => {
    const confidence = Confidence.create(80);
    const strength = SignalStrength.fromMagnitude(0.6);
    const context = MarketContext.capture("ctx", { trend: "UP", volatility: "LOW", liquidity: "HIGH", capturedAt: new Date() });
    expect(confidence.ok && strength.ok).toBe(true);
    if (confidence.ok && strength.ok) {
      const result = scoring.score(confidence.value, strength.value, context);
      expect(result.value).toBeCloseTo((80 + 60) / 2, 5);
      expect(result.contextMultiplier).toBe(1);
    }
  });

  it("discounts the score under unfavorable conditions", () => {
    const confidence = Confidence.create(80);
    const strength = SignalStrength.fromMagnitude(0.8);
    const context = MarketContext.capture("ctx", { trend: "UP", volatility: "HIGH", liquidity: "LOW", capturedAt: new Date() });
    expect(confidence.ok && strength.ok).toBe(true);
    if (confidence.ok && strength.ok) {
      const result = scoring.score(confidence.value, strength.value, context);
      expect(result.contextMultiplier).toBe(0.5);
      expect(result.value).toBeLessThan(result.confidenceComponent);
    }
  });

  it("never exceeds 100", () => {
    const confidence = Confidence.create(100);
    const strength = SignalStrength.fromMagnitude(1);
    const context = MarketContext.capture("ctx", { trend: "UP", volatility: "LOW", liquidity: "HIGH", capturedAt: new Date() });
    expect(confidence.ok && strength.ok).toBe(true);
    if (confidence.ok && strength.ok) {
      expect(scoring.score(confidence.value, strength.value, context).value).toBeLessThanOrEqual(100);
    }
  });
});

function buildOpportunity(volatility: "LOW" | "HIGH" = "LOW", liquidity: "LOW" | "HIGH" = "HIGH") {
  const confidence = Confidence.create(80);
  const strength = SignalStrength.fromMagnitude(0.8);
  if (!confidence.ok || !strength.ok) throw new Error("fixture failed");
  const signal = Signal.generate("sig-1", { symbolCode: symbol(), direction: "BUY", strength: strength.value, sourceId: "s1", generatedAt: new Date() });
  const context = MarketContext.capture("ctx-1", { trend: "UP", volatility, liquidity, capturedAt: new Date() });
  return Opportunity.create("opp-1", {
    symbolCode: symbol(),
    strategyId: "s1",
    signal,
    confidence: confidence.value,
    marketContext: context,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    expiresAt: new Date("2026-01-01T01:00:00Z"),
  });
}

function fakeRepo(opportunity: Opportunity | null): OpportunityRepository {
  const store = new Map<string, Opportunity>();
  if (opportunity) store.set(opportunity.id, opportunity);
  return {
    findById: async (id) => store.get(id) ?? null,
    findByStatus: async () => [],
    findPendingPastExpiry: async () => Array.from(store.values()).filter((o) => o.status === "PENDING"),
    save: async (o) => {
      store.set(o.id, o);
    },
  };
}

describe("OpportunityService.confirm", () => {
  it("confirms a valid, unexpired, favorable opportunity", async () => {
    const opportunity = buildOpportunity();
    const service = new OpportunityService(fakeRepo(opportunity));
    const result = await service.confirm("opp-1", new Date("2026-01-01T00:30:00Z"));
    expect(result.ok && result.value.status).toBe("CONFIRMED");
  });

  it("rejects confirming an expired opportunity", async () => {
    const opportunity = buildOpportunity();
    const service = new OpportunityService(fakeRepo(opportunity));
    const result = await service.confirm("opp-1", new Date("2026-01-01T02:00:00Z"));
    expect(result.ok).toBe(false);
  });

  it("rejects confirming under unfavorable market conditions", async () => {
    const opportunity = buildOpportunity("HIGH", "LOW");
    const service = new OpportunityService(fakeRepo(opportunity));
    const result = await service.confirm("opp-1", new Date("2026-01-01T00:30:00Z"));
    expect(result.ok).toBe(false);
  });

  it("returns UnknownOpportunityError when not found", async () => {
    const service = new OpportunityService(fakeRepo(null));
    const result = await service.confirm("missing");
    expect(result.ok).toBe(false);
  });
});

describe("OpportunityService.expirePastDue", () => {
  it("expires every pending opportunity past its own expiry", async () => {
    const opportunity = buildOpportunity();
    const service = new OpportunityService(fakeRepo(opportunity));
    const expired = await service.expirePastDue(new Date("2026-01-01T02:00:00Z"));
    expect(expired).toHaveLength(1);
    expect(opportunity.status).toBe("EXPIRED");
  });
});
