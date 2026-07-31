import { BrokerRegistryService } from "../broker-registry.service";
import type { BrokerProvider } from "../../interfaces/broker-provider.interface";
import type { BrokerMetadata } from "../../interfaces/broker-models";

function buildProvider(overrides: Partial<BrokerProvider> = {}): BrokerProvider {
  const metadata: BrokerMetadata = {
    name: "MetaTrader 5",
    version: "1.0.0",
    brokerType: "METATRADER5",
    supportsStreaming: true,
    supportsOrderExecution: true,
    supportsPositions: true,
    supportsHistory: true,
    supportsRiskManagement: true,
    healthStatus: "unknown",
  };
  return { type: "METATRADER5", enabled: true, metadata, ...overrides } as BrokerProvider;
}

describe("BrokerRegistryService", () => {
  it("register() + get() round-trips a broker by type", () => {
    const registry = new BrokerRegistryService();
    const provider = buildProvider();

    registry.register(provider);

    expect(registry.get("METATRADER5")).toBe(provider);
  });

  it("get() throws when no broker of that type is registered", () => {
    const registry = new BrokerRegistryService();

    expect(() => registry.get("METATRADER5")).toThrow(/No broker registered/);
  });

  it("get() throws when the broker is registered but disabled", () => {
    const registry = new BrokerRegistryService();
    registry.register(buildProvider({ enabled: false }));

    expect(() => registry.get("METATRADER5")).toThrow(/not enabled/);
  });

  it("tryGet() returns null instead of throwing when nothing is registered", () => {
    const registry = new BrokerRegistryService();

    expect(registry.tryGet("METATRADER5")).toBeNull();
  });

  it("tryGet() returns a disabled provider (unlike get())", () => {
    const registry = new BrokerRegistryService();
    const provider = buildProvider({ enabled: false });
    registry.register(provider);

    expect(registry.tryGet("METATRADER5")).toBe(provider);
  });

  it("listEnabled() includes only enabled broker types", () => {
    const registry = new BrokerRegistryService();
    registry.register(buildProvider({ type: "METATRADER5", enabled: true }));
    registry.register(buildProvider({ type: "ANGEL_ONE", enabled: false }));

    expect(registry.listEnabled()).toEqual(["METATRADER5"]);
  });

  it("getMetadata() returns the registered provider's metadata", () => {
    const registry = new BrokerRegistryService();
    const provider = buildProvider();
    registry.register(provider);

    expect(registry.getMetadata("METATRADER5")).toBe(provider.metadata);
  });

  it("register() overwrites a prior registration for the same broker type", () => {
    const registry = new BrokerRegistryService();
    const first = buildProvider({ enabled: false });
    const second = buildProvider({ enabled: true });
    registry.register(first);

    registry.register(second);

    expect(registry.get("METATRADER5")).toBe(second);
  });
});
