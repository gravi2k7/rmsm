import { IndicatorRegistryService } from "../indicator-registry.service";
import { RegistryValidatorService } from "../registry-validator.service";
import { NotFoundError } from "@rmsm/shared";
import type { IndicatorDefinition } from "../../contracts/indicator-definition.interface";

function buildDefinition(overrides: Partial<IndicatorDefinition> = {}): IndicatorDefinition {
  return {
    identifier: "test_indicator",
    displayName: "Test Indicator",
    version: "1.0.0",
    description: "A test indicator.",
    category: "TREND",
    inputs: [{ type: "integer", name: "period", required: true, defaultValue: 14, min: 1, max: 100 }],
    outputs: [{ name: "value", kind: "line" }],
    defaultParameters: { period: 14 },
    supportedTimeframes: ["ONE_DAY"],
    minimumLookback: 14,
    dependencies: [],
    tags: ["test"],
    author: "Test Author",
    stabilityLevel: "stable",
    metadata: { calculationType: "windowed", deterministic: true, cacheable: true, incrementalSupport: false },
    ...overrides,
  };
}

describe("IndicatorRegistryService", () => {
  let registry: IndicatorRegistryService;

  beforeEach(() => {
    registry = new IndicatorRegistryService(new RegistryValidatorService());
  });

  describe("registration and lookup", () => {
    it("registers and retrieves a definition by identifier", () => {
      registry.register(buildDefinition());
      expect(registry.get("test_indicator").displayName).toBe("Test Indicator");
    });

    it("get() throws NotFoundError for an unregistered identifier", () => {
      expect(() => registry.get("does_not_exist")).toThrow(NotFoundError);
    });

    it("tryGet() returns null instead of throwing for an unregistered identifier", () => {
      expect(registry.tryGet("does_not_exist")).toBeNull();
    });
  });

  describe("immutability", () => {
    it("freezes a registered definition — mutation attempts have no effect", () => {
      registry.register(buildDefinition());
      const definition = registry.get("test_indicator");
      expect(Object.isFrozen(definition)).toBe(true);
      expect(() => {
        (definition as { displayName: string }).displayName = "Mutated";
      }).toThrow();
    });

    it("freezes nested objects too (deep freeze) — metadata cannot be mutated either", () => {
      registry.register(buildDefinition());
      const definition = registry.get("test_indicator");
      expect(Object.isFrozen(definition.metadata)).toBe(true);
    });
  });

  describe("duplicate detection", () => {
    it("rejects registering the exact same (identifier, version) pair twice", () => {
      registry.register(buildDefinition());
      expect(() => registry.register(buildDefinition())).toThrow(/already registered/);
    });

    it("allows the same identifier at a genuinely new version — not a duplicate (item 7)", () => {
      registry.register(buildDefinition({ version: "1.0.0" }));
      expect(() => registry.register(buildDefinition({ version: "1.1.0" }))).not.toThrow();
    });
  });

  describe("version management", () => {
    it("get() resolves to the latest registered version", () => {
      registry.register(buildDefinition({ version: "1.0.0" }));
      registry.register(buildDefinition({ version: "2.0.0" }));
      registry.register(buildDefinition({ version: "1.5.0" }));
      expect(registry.get("test_indicator").version).toBe("2.0.0");
    });

    it("getVersion() resolves a specific, non-latest version", () => {
      registry.register(buildDefinition({ version: "1.0.0" }));
      registry.register(buildDefinition({ version: "2.0.0" }));
      expect(registry.getVersion("test_indicator", "1.0.0").version).toBe("1.0.0");
    });

    it("getVersion() throws NotFoundError for an unregistered version", () => {
      registry.register(buildDefinition({ version: "1.0.0" }));
      expect(() => registry.getVersion("test_indicator", "9.9.9")).toThrow(NotFoundError);
    });

    it("listVersions() returns every version, oldest first", () => {
      registry.register(buildDefinition({ version: "2.0.0" }));
      registry.register(buildDefinition({ version: "1.0.0" }));
      registry.register(buildDefinition({ version: "1.1.0" }));
      expect(registry.listVersions("test_indicator").map((d) => d.version)).toEqual(["1.0.0", "1.1.0", "2.0.0"]);
    });

    it("compares semver numerically, not lexicographically (10.0.0 > 9.0.0)", () => {
      registry.register(buildDefinition({ version: "9.0.0" }));
      registry.register(buildDefinition({ version: "10.0.0" }));
      expect(registry.get("test_indicator").version).toBe("10.0.0");
    });
  });

  describe("discovery", () => {
    it("listByCategory() filters by category", () => {
      registry.register(buildDefinition({ identifier: "a", category: "TREND" }));
      registry.register(buildDefinition({ identifier: "b", category: "MOMENTUM" }));
      expect(registry.listByCategory("TREND").map((d) => d.identifier)).toEqual(["a"]);
    });

    it("listByTag() filters by tag", () => {
      registry.register(buildDefinition({ identifier: "a", tags: ["proprietary"] }));
      registry.register(buildDefinition({ identifier: "b", tags: ["built-in"] }));
      expect(registry.listByTag("proprietary").map((d) => d.identifier)).toEqual(["a"]);
    });

    it("listAll() returns the latest version only, one entry per identifier", () => {
      registry.register(buildDefinition({ identifier: "a", version: "1.0.0" }));
      registry.register(buildDefinition({ identifier: "a", version: "2.0.0" }));
      registry.register(buildDefinition({ identifier: "b", version: "1.0.0" }));
      const all = registry.listAll();
      expect(all).toHaveLength(2);
      expect(all.find((d) => d.identifier === "a")?.version).toBe("2.0.0");
    });
  });
});
