import { describe, expect, it } from "vitest";
import { StrategyValidatorService } from "../services/strategy-validator.service";
import { StrategyService } from "../services/strategy.service";
import { StrategyVersion } from "../entities/strategy-version";
import { StrategyRule } from "../entities/strategy-rule";
import { Strategy } from "../entities/strategy";
import { StrategyId } from "../value-objects/strategy-id";
import { RiskProfile } from "../value-objects/risk-profile";
import { Timeframe, SymbolCode } from "@rmsm/market";
import type { StrategyRepository } from "../repositories/strategy.repository";

function strategyId() {
  const r = StrategyId.create("123e4567-e89b-12d3-a456-426614174000");
  if (!r.ok) throw new Error("fixture failed");
  return r.value;
}

function symbol() {
  const r = SymbolCode.create("EURUSD");
  if (!r.ok) throw new Error("fixture failed");
  return r.value;
}

function buildStrategy() {
  return Strategy.create(strategyId(), {
    name: "x",
    description: "x",
    riskProfile: RiskProfile.conservative(),
    timeframe: Timeframe.H1,
    supportedSymbols: [symbol()],
  });
}

describe("StrategyValidatorService.validateVersion", () => {
  const validator = new StrategyValidatorService();

  it("passes for a version with an entry rule and unique order", () => {
    const entry = StrategyRule.create("r1", { kind: "ENTRY", description: "x", expression: "x", order: 1 });
    const version = StrategyVersion.create("v1", { versionNumber: 1, rules: [entry], parameters: [], createdAt: new Date() });
    expect(validator.validateVersion(version).ok).toBe(true);
  });

  it("fails with no entry rules", () => {
    const exit = StrategyRule.create("r1", { kind: "EXIT", description: "x", expression: "x", order: 1 });
    const version = StrategyVersion.create("v1", { versionNumber: 1, rules: [exit], parameters: [], createdAt: new Date() });
    const result = validator.validateVersion(version);
    expect(result.ok).toBe(false);
  });

  it("fails with duplicate rule order and reports both reasons in one error", () => {
    const r1 = StrategyRule.create("r1", { kind: "EXIT", description: "x", expression: "x", order: 1 });
    const r2 = StrategyRule.create("r2", { kind: "EXIT", description: "y", expression: "y", order: 1 });
    const version = StrategyVersion.create("v1", { versionNumber: 1, rules: [r1, r2], parameters: [], createdAt: new Date() });
    const result = validator.validateVersion(version);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.reasons.length).toBe(2); // no entry rule + duplicate order
    }
  });
});

function fakeRepo(strategy: Strategy | null): StrategyRepository {
  const store = new Map<string, Strategy>();
  if (strategy) store.set(strategy.id.value, strategy);
  return {
    findById: async (id) => store.get(id.value) ?? null,
    findByStatus: async () => [],
    findEnabled: async () => [],
    save: async (s) => {
      store.set(s.id.value, s);
    },
  };
}

describe("StrategyService", () => {
  const validator = new StrategyValidatorService();

  it("getById returns UnknownStrategyError when not found", async () => {
    const service = new StrategyService(fakeRepo(null), validator);
    const result = await service.getById(strategyId());
    expect(result.ok).toBe(false);
  });

  it("transitionStatus persists a valid transition", async () => {
    const strategy = buildStrategy();
    const service = new StrategyService(fakeRepo(strategy), validator);
    const result = await service.transitionStatus(strategyId(), "TESTING");
    expect(result.ok && result.value.status).toBe("TESTING");
  });

  it("transitionStatus returns an error for an invalid transition, without persisting it", async () => {
    const strategy = buildStrategy();
    const service = new StrategyService(fakeRepo(strategy), validator);
    const result = await service.transitionStatus(strategyId(), "PRODUCTION");
    expect(result.ok).toBe(false);
    expect(strategy.status).toBe("DRAFT"); // unchanged
  });

  it("addVersion rejects an invalid version without persisting it", async () => {
    const strategy = buildStrategy();
    const service = new StrategyService(fakeRepo(strategy), validator);
    const exitOnly = StrategyRule.create("r1", { kind: "EXIT", description: "x", expression: "x", order: 1 });
    const version = StrategyVersion.create("v1", { versionNumber: 1, rules: [exitOnly], parameters: [], createdAt: new Date() });

    const result = await service.addVersion(strategyId(), version);
    expect(result.ok).toBe(false);
    expect(strategy.versions).toHaveLength(0);
  });

  it("addVersion accepts a valid version and makes it current", async () => {
    const strategy = buildStrategy();
    const service = new StrategyService(fakeRepo(strategy), validator);
    const entry = StrategyRule.create("r1", { kind: "ENTRY", description: "x", expression: "x", order: 1 });
    const version = StrategyVersion.create("v1", { versionNumber: 1, rules: [entry], parameters: [], createdAt: new Date() });

    const result = await service.addVersion(strategyId(), version);
    expect(result.ok).toBe(true);
    expect(strategy.currentVersion?.id).toBe("v1");
  });

  it("setEnabled toggles the strategy's own enabled flag", async () => {
    const strategy = buildStrategy();
    const service = new StrategyService(fakeRepo(strategy), validator);
    await service.setEnabled(strategyId(), true);
    expect(strategy.enabled).toBe(true);
    await service.setEnabled(strategyId(), false);
    expect(strategy.enabled).toBe(false);
  });
});
