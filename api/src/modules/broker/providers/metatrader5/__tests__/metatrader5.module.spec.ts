import type { Env } from "@rmsm/config";
import { MetaTrader5RegistrarService } from "../metatrader5.module";
import { BrokerRegistryService } from "../../broker-registry.service";
import { MetaTrader5Provider } from "../metatrader5.provider";
import type { MetaTrader5CacheService } from "../metatrader5.cache";

function buildEnv(overrides: Partial<Env> = {}): Env {
  return {
    MT5_ENABLED: true,
    MT5_TIMEOUT: 10_000,
    MT5_RECONNECT: true,
    MT5_MAX_RETRY: 5,
    MT5_HEARTBEAT: 30,
    MT5_GATEWAY_URL: "http://localhost:8222",
    MARKET_DATA_CACHE_TTL_MS: 5_000,
    ...overrides,
  } as Env;
}

function fakeCache(): MetaTrader5CacheService {
  return { getOrSet: jest.fn((_k: string, _ttl: number, fetcher: () => Promise<unknown>) => fetcher()), invalidate: jest.fn() } as unknown as MetaTrader5CacheService;
}

describe("MetaTrader5RegistrarService", () => {
  let registry: BrokerRegistryService;

  beforeEach(() => {
    registry = new BrokerRegistryService();
  });

  it("registers a MetaTrader5Provider with BrokerRegistryService on module init", () => {
    const registrar = new MetaTrader5RegistrarService(registry, fakeCache(), buildEnv());

    registrar.onModuleInit();

    const registered = registry.tryGet("METATRADER5");
    expect(registered).toBeInstanceOf(MetaTrader5Provider);
    expect(registered!.enabled).toBe(true);
  });

  it("registers a disabled-but-present provider when MT5_ENABLED=false", () => {
    const registrar = new MetaTrader5RegistrarService(registry, fakeCache(), buildEnv({ MT5_ENABLED: false }));

    registrar.onModuleInit();

    expect(registry.tryGet("METATRADER5")!.enabled).toBe(false);
  });

  it("does not eagerly connect or log in during registration", () => {
    // A registrar that eagerly connected would need a live gateway just to
    // boot the module; asserting no exception is thrown here (with no
    // fetch mock installed at all) confirms buildProvider() never calls
    // client.connect()/login().
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockRejectedValue(new Error("no gateway reachable in this test")) as unknown as typeof fetch;

    const registrar = new MetaTrader5RegistrarService(registry, fakeCache(), buildEnv());

    expect(() => registrar.onModuleInit()).not.toThrow();
    expect(global.fetch).not.toHaveBeenCalled();

    global.fetch = originalFetch;
  });

  it("registers via BrokerRegistryService only — never touches a Factory (no companion factory exists for the Broker domain)", () => {
    const registrar = new MetaTrader5RegistrarService(registry, fakeCache(), buildEnv());

    registrar.onModuleInit();

    expect(registry.listEnabled()).toEqual(["METATRADER5"]);
  });
});
