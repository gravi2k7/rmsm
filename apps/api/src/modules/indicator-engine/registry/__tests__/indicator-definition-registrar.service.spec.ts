import { IndicatorDefinitionRegistrarService } from "../indicator-definition-registrar.service";
import { IndicatorRegistryService } from "../indicator-registry.service";
import { RegistryValidatorService } from "../registry-validator.service";
import { TREND_DEFINITIONS } from "../../indicators/built-in/trend.definitions";
import { MOMENTUM_DEFINITIONS } from "../../indicators/built-in/momentum.definitions";
import { VOLATILITY_DEFINITIONS } from "../../indicators/built-in/volatility.definitions";
import { VOLUME_DEFINITIONS } from "../../indicators/built-in/volume.definitions";
import { PROPRIETARY_DEFINITIONS } from "../../indicators/proprietary/proprietary.definitions";

/**
 * A real, end-to-end test — not mocked — proving the dependency
 * ordering `IndicatorDefinitionRegistrarService`'s own comment claims
 * (volatility → trend → momentum → volume → proprietary) is actually
 * correct, not just asserted in a comment. If SuperTrend's "atr"
 * dependency, MACD's "ema" dependency, or any proprietary
 * cross-dependency were registered out of order, this test would fail
 * with a real `InvalidDependencyError` from `RegistryValidatorService`
 * — the exact class of bug a comment alone can't catch.
 */
describe("IndicatorDefinitionRegistrarService", () => {
  it("registers all 19 built-in + 9 proprietary indicators (30 definition objects, counting RDSE's 3 versions) without any dependency-order failure", () => {
    const registry = new IndicatorRegistryService(new RegistryValidatorService());
    const registrar = new IndicatorDefinitionRegistrarService(registry);

    expect(() => registrar.onModuleInit()).not.toThrow();

    // listAll() returns one entry per identifier (latest version) — 19
    // built-in + 9 proprietary unique identifiers = 28, not 30 (RDSE's
    // 3 versions collapse to 1 in this view, which is exactly what
    // listAll()'s own contract promises).
    expect(registry.listAll()).toHaveLength(28);
  });

  it("every built-in and proprietary definition file's own declared count matches what's actually exported", () => {
    expect(TREND_DEFINITIONS).toHaveLength(9);
    expect(MOMENTUM_DEFINITIONS).toHaveLength(4);
    expect(VOLATILITY_DEFINITIONS).toHaveLength(4);
    expect(VOLUME_DEFINITIONS).toHaveLength(2);
    // 9 unique proprietary identifiers, 11 definition objects (RDSE's 3 versions).
    expect(PROPRIETARY_DEFINITIONS).toHaveLength(11);
    expect(new Set(PROPRIETARY_DEFINITIONS.map((d) => d.identifier)).size).toBe(9);
  });

  it("RDSE is registered at all 3 versions this phase's own worked example names (item 7)", () => {
    const registry = new IndicatorRegistryService(new RegistryValidatorService());
    new IndicatorDefinitionRegistrarService(registry).onModuleInit();
    expect(registry.listVersions("rdse").map((d) => d.version)).toEqual(["1.0.0", "1.1.0", "2.0.0"]);
  });

  it("SuperTrend's dependency on ATR resolves correctly (registered before it, per the designed order)", () => {
    const registry = new IndicatorRegistryService(new RegistryValidatorService());
    new IndicatorDefinitionRegistrarService(registry).onModuleInit();
    expect(registry.get("supertrend").dependencies).toContain("atr");
    expect(() => registry.get("atr")).not.toThrow();
  });

  it("MACD's dependency on EMA resolves correctly", () => {
    const registry = new IndicatorRegistryService(new RegistryValidatorService());
    new IndicatorDefinitionRegistrarService(registry).onModuleInit();
    expect(registry.get("macd").dependencies).toContain("ema");
  });

  it("Institutional Structure's 4-way proprietary dependency chain resolves correctly", () => {
    const registry = new IndicatorRegistryService(new RegistryValidatorService());
    new IndicatorDefinitionRegistrarService(registry).onModuleInit();
    const deps = registry.get("institutional_structure").dependencies;
    expect(deps).toEqual(["market_state_engine", "liquidity_detection", "order_blocks", "bos"]);
    for (const dep of deps) {
      expect(() => registry.get(dep)).not.toThrow();
    }
  });
});
