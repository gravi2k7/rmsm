import { describe, expect, it } from "vitest";
import { Opportunity } from "../entities/opportunity";
import { Signal } from "../entities/signal";
import { MarketContext } from "../entities/market-context";
import { Confidence } from "../value-objects/confidence";
import { SignalStrength } from "../value-objects/signal-strength";
import { SymbolCode } from "@rmsm/market";

function symbol() {
  const r = SymbolCode.create("EURUSD");
  if (!r.ok) throw new Error("fixture failed");
  return r.value;
}

function buildSignal() {
  const strength = SignalStrength.fromMagnitude(0.8);
  if (!strength.ok) throw new Error("fixture failed");
  return Signal.generate("sig-1", { symbolCode: symbol(), direction: "BUY", strength: strength.value, sourceId: "strategy-1", generatedAt: new Date() });
}

function buildContext(volatility: "LOW" | "MEDIUM" | "HIGH" = "LOW", liquidity: "LOW" | "MEDIUM" | "HIGH" = "HIGH") {
  return MarketContext.capture("ctx-1", { trend: "UP", volatility, liquidity, capturedAt: new Date() });
}

function buildOpportunity(volatility: "LOW" | "MEDIUM" | "HIGH" = "LOW", liquidity: "LOW" | "MEDIUM" | "HIGH" = "HIGH") {
  const confidence = Confidence.create(80);
  if (!confidence.ok) throw new Error("fixture failed");
  const createdAt = new Date("2026-01-01T00:00:00Z");
  const expiresAt = new Date("2026-01-01T01:00:00Z");
  return Opportunity.create("opp-1", {
    symbolCode: symbol(),
    strategyId: "strategy-1",
    signal: buildSignal(),
    confidence: confidence.value,
    marketContext: buildContext(volatility, liquidity),
    createdAt,
    expiresAt,
  });
}

describe("Signal.generate", () => {
  it("raises SignalGeneratedEvent", () => {
    const signal = buildSignal();
    expect(signal.pullDomainEvents()[0]?.kind).toBe("SignalGenerated");
  });
});

describe("MarketContext.isFavorable", () => {
  it("is unfavorable when volatility is HIGH and liquidity is LOW", () => {
    expect(buildContext("HIGH", "LOW").isFavorable()).toBe(false);
  });
  it("is favorable otherwise", () => {
    expect(buildContext("HIGH", "HIGH").isFavorable()).toBe(true);
    expect(buildContext("LOW", "LOW").isFavorable()).toBe(true);
  });
});

describe("Opportunity.create", () => {
  it("starts PENDING", () => {
    expect(buildOpportunity().status).toBe("PENDING");
  });
  it("raises OpportunityCreatedEvent", () => {
    expect(buildOpportunity().pullDomainEvents()[0]?.kind).toBe("OpportunityCreated");
  });
  it("rejects expiresAt before createdAt", () => {
    const confidence = Confidence.create(80);
    if (!confidence.ok) throw new Error("fixture failed");
    expect(() =>
      Opportunity.create("opp-2", {
        symbolCode: symbol(),
        strategyId: "s1",
        signal: buildSignal(),
        confidence: confidence.value,
        marketContext: buildContext(),
        createdAt: new Date("2026-01-02T00:00:00Z"),
        expiresAt: new Date("2026-01-01T00:00:00Z"),
      }),
    ).toThrow();
  });
});

describe("Opportunity lifecycle", () => {
  it("confirm() transitions to CONFIRMED", () => {
    const opportunity = buildOpportunity();
    opportunity.confirm();
    expect(opportunity.status).toBe("CONFIRMED");
  });

  it("reject() transitions to REJECTED", () => {
    const opportunity = buildOpportunity();
    opportunity.reject();
    expect(opportunity.status).toBe("REJECTED");
  });

  it("expire() transitions to EXPIRED and raises OpportunityExpiredEvent", () => {
    const opportunity = buildOpportunity();
    opportunity.pullDomainEvents();
    opportunity.expire();
    expect(opportunity.status).toBe("EXPIRED");
    expect(opportunity.pullDomainEvents()[0]?.kind).toBe("OpportunityExpired");
  });

  it("rejects any transition once already CONFIRMED (terminal)", () => {
    const opportunity = buildOpportunity();
    opportunity.confirm();
    expect(() => opportunity.reject()).toThrow();
  });

  it("isPastExpiry reflects the given asOf time", () => {
    const opportunity = buildOpportunity();
    expect(opportunity.isPastExpiry(new Date("2026-01-01T00:30:00Z"))).toBe(false);
    expect(opportunity.isPastExpiry(new Date("2026-01-01T02:00:00Z"))).toBe(true);
  });
});
