import { describe, expect, it } from "vitest";
import { Strategy } from "../entities/strategy";
import { StrategyId } from "../value-objects/strategy-id";
import { RiskProfile } from "../value-objects/risk-profile";
import { Timeframe, SymbolCode } from "@rmsm/market";

function id() {
  const r = StrategyId.create("123e4567-e89b-12d3-a456-426614174000");
  if (!r.ok) throw new Error("fixture failed");
  return r.value;
}

function symbol(code: string) {
  const r = SymbolCode.create(code);
  if (!r.ok) throw new Error("fixture failed");
  return r.value;
}

function buildStrategy() {
  return Strategy.create(id(), {
    name: "MA Crossover",
    description: "Moving average crossover strategy",
    riskProfile: RiskProfile.conservative(),
    timeframe: Timeframe.H1,
    supportedSymbols: [symbol("EURUSD")],
  });
}

describe("Strategy.create", () => {
  it("starts in DRAFT status, disabled, no versions", () => {
    const strategy = buildStrategy();
    expect(strategy.status).toBe("DRAFT");
    expect(strategy.enabled).toBe(false);
    expect(strategy.versions).toHaveLength(0);
    expect(strategy.currentVersion).toBeNull();
  });

  it("raises StrategyCreatedEvent", () => {
    const strategy = buildStrategy();
    const events = strategy.pullDomainEvents();
    expect(events[0]?.kind).toBe("StrategyCreated");
  });

  it("rejects an empty supportedSymbols array", () => {
    expect(() =>
      Strategy.create(id(), {
        name: "x",
        description: "x",
        riskProfile: RiskProfile.conservative(),
        timeframe: Timeframe.H1,
        supportedSymbols: [],
      }),
    ).toThrow();
  });
});

describe("Strategy.equals", () => {
  it("two instances with the same StrategyId value are equal", () => {
    const a = buildStrategy();
    const b = buildStrategy();
    expect(a.equals(b)).toBe(true);
  });
});

describe("Strategy.transitionTo", () => {
  it("allows DRAFT -> TESTING", () => {
    const strategy = buildStrategy();
    strategy.transitionTo("TESTING");
    expect(strategy.status).toBe("TESTING");
  });

  it("allows the full forward lifecycle", () => {
    const strategy = buildStrategy();
    strategy.transitionTo("TESTING");
    strategy.transitionTo("PAPER_TRADING");
    strategy.transitionTo("PRODUCTION");
    strategy.transitionTo("ARCHIVED");
    expect(strategy.status).toBe("ARCHIVED");
  });

  it("rejects DRAFT -> PRODUCTION directly", () => {
    const strategy = buildStrategy();
    expect(() => strategy.transitionTo("PRODUCTION")).toThrow();
  });

  it("rejects any transition out of ARCHIVED", () => {
    const strategy = buildStrategy();
    strategy.transitionTo("TESTING");
    strategy.transitionTo("PAPER_TRADING");
    strategy.transitionTo("PRODUCTION");
    strategy.transitionTo("ARCHIVED");
    expect(() => strategy.transitionTo("DRAFT")).toThrow();
  });

  it("allows backward TESTING -> DRAFT", () => {
    const strategy = buildStrategy();
    strategy.transitionTo("TESTING");
    strategy.transitionTo("DRAFT");
    expect(strategy.status).toBe("DRAFT");
  });

  it("raises StrategyUpdatedEvent on a successful transition", () => {
    const strategy = buildStrategy();
    strategy.pullDomainEvents();
    strategy.transitionTo("TESTING");
    expect(strategy.pullDomainEvents()[0]?.kind).toBe("StrategyUpdated");
  });
});

describe("Strategy.enable/disable", () => {
  it("enable() raises StrategyEnabledEvent", () => {
    const strategy = buildStrategy();
    strategy.pullDomainEvents();
    strategy.enable();
    expect(strategy.enabled).toBe(true);
    expect(strategy.pullDomainEvents()[0]?.kind).toBe("StrategyEnabled");
  });

  it("enable() on an already-enabled strategy is a no-op", () => {
    const strategy = buildStrategy();
    strategy.enable();
    strategy.pullDomainEvents();
    strategy.enable();
    expect(strategy.pullDomainEvents()).toHaveLength(0);
  });

  it("disable() raises StrategyDisabledEvent", () => {
    const strategy = buildStrategy();
    strategy.enable();
    strategy.pullDomainEvents();
    strategy.disable();
    expect(strategy.pullDomainEvents()[0]?.kind).toBe("StrategyDisabled");
  });
});

describe("Strategy.supportsSymbol", () => {
  it("returns true for a supported symbol", () => {
    const strategy = buildStrategy();
    expect(strategy.supportsSymbol(symbol("EURUSD"))).toBe(true);
  });
  it("returns false for an unsupported symbol", () => {
    const strategy = buildStrategy();
    expect(strategy.supportsSymbol(symbol("GBPUSD"))).toBe(false);
  });
});
